/**
 * Alta de una boda.
 *
 * Es la operación más delicada del producto: toca Firestore, Auth y la
 * configuración del proyecto, y cualquiera de las tres puede fallar por su
 * cuenta. El orden de los pasos está elegido para que un fallo a mitad deje el
 * sistema en un estado que se pueda arreglar reintentando, nunca en uno que
 * parezca correcto y no lo sea.
 *
 * Orden y por qué:
 *
 * 1. **Validar.** Todo lo que llega es sospechoso. Ver `dominio/alta.ts`.
 * 2. **Cuentas de Auth**, antes de escribir nada en Firestore. Son idempotentes
 *    por email, y si el alta se cae después, lo que queda es una cuenta sin
 *    claims, que no da acceso a nada.
 * 3. **Transacción de Firestore**: slug, boda, proyección pública y todas las
 *    semillas de golpe. O existe la boda entera o no existe: no hay boda a
 *    medio sembrar.
 * 4. **Claims.** Solo cuando la boda existe de verdad. Al revés daría acceso a
 *    un `weddingId` que no llegó a crearse.
 * 5. **Autorizar el subdominio en Auth** (regla 8 de CLAUDE.md). Si esto falla,
 *    la boda queda marcada `setup.authDomain: 'pending'` y la respuesta lo dice
 *    en voz alta, porque es el fallo que si no se ve, no se descubre hasta que
 *    la pareja intenta entrar con Google.
 * 6. **Auditoría.** Nunca lanza.
 */

import { randomUUID } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Transaction,
} from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { validarAlta, sugerirSlugs, type DatosAlta, type EntradaAlta } from './dominio/alta';
import { claimsDeBoda } from './dominio/claims';
import { dominioDeBoda } from './dominio/dominios';
import { layoutDePlan, modulosIniciales, type Modulo } from './dominio/planes';
import { proyeccionPublica, type BodaParaProyectar } from './dominio/proyeccion';
import { SECCIONES_INICIALES } from './dominio/secciones';
import { CONTADORES_VACIOS } from './dominio/contadores';
import {
  FAQS_FABRICA,
  GRUPO_POR_DEFECTO,
  PREGUNTAS_RSVP_FABRICA,
  fechaLimiteTarea,
  tareasAplicables,
} from './dominio/semillas';
import { DOMINIO_BASE, EXIGIR_APP_CHECK, REGION, auth, db } from './firebase';
import { auditar } from './infra/auditoria';
import { plantillasParaAlta } from './catalogo';
import { fechaParaCorreo } from './infra/acceso-pareja';
import { encolarCorreo } from './infra/correo';
import { leerModulosDePlanGuardados } from './planes';
import { autorizarDominio } from './infra/identity-toolkit';
import { exigirSuperadmin } from './infra/permisos';

export interface CuentaCreada {
  readonly email: string;
  readonly uid: string;
  readonly nueva: boolean;
  /**
   * Enlace para que la persona ponga su contraseña.
   *
   * Se **manda por correo** con la plantilla `parejaAcceso` (D-53) y además se
   * devuelve aquí para que el superadmin pueda copiarlo si el correo no llega.
   * Da acceso al panel: solo lo ve quien ha podido llamar aquí.
   */
  readonly enlaceAcceso: string | null;
  /** Si el correo de acceso quedó en la cola de envío. */
  readonly correoEnviado: boolean;
}

export interface RespuestaAlta {
  readonly weddingId: string;
  readonly slug: string;
  readonly siteUrl: string;
  readonly cuentas: readonly CuentaCreada[];
  /** Lo que hay que mirar antes de dar el alta por buena. Vacío es lo normal. */
  readonly avisos: readonly string[];
}

type Plantillas = Awaited<ReturnType<typeof plantillasParaAlta>>;

export const provisionWedding = onCall<Partial<EntradaAlta>, Promise<RespuestaAlta>>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const hoy = new Date();

    const validacion = validarAlta(peticion.data, hoy);
    if (!validacion.ok) {
      throw new HttpsError('invalid-argument', 'Los datos del alta no son válidos.', {
        motivos: validacion.motivos,
      });
    }
    const datos = validacion.datos;

    const cuentas = await cuentasDeLaPareja(datos.emails);
    const weddingId = db().collection('weddings').doc().id;
    // Se leen **antes** de la transacción: dentro solo se escribe.
    const plantillas = await plantillasParaAlta();
    // Los módulos con los que nace son los que el superadmin ha fijado para ese plan.
    const modulos = await leerModulosDePlanGuardados(datos.plan);

    await crearBoda(
      weddingId,
      datos,
      cuentas.map((c) => c.uid),
      plantillas,
      modulos,
    );

    // Los claims van después de la transacción a propósito: un claim que apunta
    // a una boda inexistente es un acceso concedido a la nada, y las reglas lo
    // aceptarían tan campante.
    for (const cuenta of cuentas) {
      // Conserva el superadmin si el correo de la pareja es el suyo (boda de pruebas).
      const actuales = (await auth().getUser(cuenta.uid)).customClaims;
      await auth().setCustomUserClaims(cuenta.uid, claimsDeBoda(actuales, weddingId));
    }

    const avisos: string[] = [];
    const dominio = dominioDeBoda(datos.slug, DOMINIO_BASE);
    const autorizado = await intentarAutorizar(weddingId, dominio);
    if (!autorizado.ok) {
      avisos.push(
        `No se ha podido autorizar ${dominio} en Firebase Auth. La boda está creada, ` +
          'pero el acceso con Google fallará hasta que se reintente desde el panel.',
      );
    }
    if (autorizado.aviso) avisos.push(autorizado.aviso);

    const conEnlaces = await conEnlacesDeAcceso(cuentas, datos, weddingId);
    if (conEnlaces.some((c) => c.enlaceAcceso === null)) {
      avisos.push(
        'No se han podido generar todos los enlaces de acceso. Reintenta desde el panel.',
      );
    } else if (conEnlaces.some((c) => !c.correoEnviado)) {
      avisos.push('No se ha podido encolar algún correo de acceso. Reenvíalo desde la ficha.');
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'provisionWedding',
      weddingId,
      payload: { slug: datos.slug, plan: datos.plan, emails: datos.emails, avisos },
    });

    return {
      weddingId,
      slug: datos.slug,
      siteUrl: `https://${dominio}`,
      cuentas: conEnlaces,
      avisos,
    };
  },
);

/**
 * Localiza o crea las cuentas de Auth de la pareja.
 *
 * Buscar por email antes de crear no es un detalle: una pareja puede tener ya
 * cuenta —de una boda anterior que organizaron, de una prueba— y crear otra
 * dejaría dos identidades para la misma persona, de las cuales solo una tendría
 * los claims.
 */
async function cuentasDeLaPareja(
  emails: readonly string[],
): Promise<readonly { email: string; uid: string; nueva: boolean }[]> {
  const cuentas: { email: string; uid: string; nueva: boolean }[] = [];

  for (const email of emails) {
    try {
      const usuario = await auth().getUserByEmail(email);
      cuentas.push({ email, uid: usuario.uid, nueva: false });
    } catch (error) {
      if (!esUsuarioNoEncontrado(error)) throw error;
      const usuario = await auth().createUser({
        email,
        emailVerified: false,
        // Nadie conoce esta contraseña, ni nosotros: la cuenta se abre con el
        // enlace de "establecer contraseña" que se manda después. Crear la
        // cuenta sin contraseña impediría justamente ese enlace.
        password: `${randomUUID()}${randomUUID()}`,
      });
      cuentas.push({ email, uid: usuario.uid, nueva: true });
    }
  }

  return cuentas;
}

function esUsuarioNoEncontrado(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'auth/user-not-found'
  );
}

/**
 * Crea la boda entera en una transacción.
 *
 * El slug es el recurso en disputa: dos altas simultáneas con el mismo slug
 * tienen que resolverse en que una gana y la otra recibe alternativas. Por eso
 * la lectura del documento de slug y su escritura van en la misma transacción,
 * y por eso las semillas van dentro: una boda con slug pero sin checklist es
 * una boda rota que nadie sabría detectar.
 */
async function crearBoda(
  weddingId: string,
  datos: DatosAlta,
  ownerUids: readonly string[],
  plantillas: Plantillas,
  modulos: readonly Modulo[],
): Promise<void> {
  const firestore = db();
  const slugRef = firestore.collection('slugs').doc(datos.slug);
  const bodaRef = firestore.collection('weddings').doc(weddingId);

  const anio = datos.weddingDate.getFullYear();
  const candidatos = sugerirSlugs(datos.slug, new Set(), anio);

  await firestore.runTransaction(async (t: Transaction) => {
    // Todas las lecturas primero: una transacción de Firestore no admite leer
    // después de escribir.
    const refs = [slugRef, ...candidatos.map((c) => firestore.collection('slugs').doc(c))];
    const documentos = await t.getAll(...refs);

    if (documentos[0]?.exists) {
      const libres = candidatos.filter((_, i) => documentos[i + 1]?.exists === false);
      throw new HttpsError('already-exists', 'Esa dirección ya está ocupada.', {
        slug: datos.slug,
        alternativas: libres,
      });
    }

    t.create(slugRef, { weddingId, status: 'active', createdAt: FieldValue.serverTimestamp() });
    t.create(bodaRef, documentoDeBoda(datos, ownerUids, modulos));
    sembrar(t, bodaRef, datos, plantillas, modulos);
  });
}

function documentoDeBoda(
  datos: DatosAlta,
  ownerUids: readonly string[],
  modulos: readonly Modulo[],
) {
  return {
    slug: datos.slug,
    // Nace en borrador aunque la pareja haya pagado: la web no se publica hasta
    // que ellos la dan por buena. Ver PENDIENTES D-22.
    status: 'draft' as const,
    plan: datos.plan,
    layout: layoutDePlan(datos.plan),
    couple: { partnerA: datos.partnerA, partnerB: datos.partnerB },
    weddingDate: Timestamp.fromDate(datos.weddingDate),
    // La hora la fija **la pareja** desde su panel, no el superadmin al
    // contratar: quien vende el servicio no tiene por qué saber a qué hora es
    // la ceremonia, y a menudo aún no está decidida.
    weddingTime: null,
    // Civil o religiosa. Por ahora solo se guarda y se enseña; qué cambia según
    // el tipo (p. ej. tareas del cursillo prematrimonial) está en D-49.
    ceremonyType: datos.ceremonyType,
    contactPhone: datos.contactPhone,
    timezone: datos.timezone,
    locale: datos.locale,
    ownerUids: [...ownerUids],
    guestAccessMode: 'open' as const,
    allowGuestAddedCompanions: false,
    theme: {
      templateId: 'clasica',
      palette: null,
      fonts: null,
      heroImagePath: null,
      heroImageUrl: null,
    },
    modules: modulosIniciales(datos.plan, modulos),
    counters: { ...CONTADORES_VACIOS, photosPending: 0 },
    // Lo que queda por cuadrar fuera de Firestore. El panel de superadmin lo
    // pinta en rojo mientras no esté en 'ok'.
    setup: { authDomain: 'pending' as const },
    content: { sections: SECCIONES_INICIALES },
    // Nadie sale en Google sin decirlo. Ver REQUISITOS §8.1.
    indexable: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/** Las semillas. Todas dentro de la transacción que crea la boda. */
function sembrar(
  t: Transaction,
  bodaRef: DocumentReference,
  datos: DatosAlta,
  plantillas: Plantillas,
  modulos: readonly Modulo[],
): void {
  const boda: BodaParaProyectar = {
    ...documentoDeBoda(datos, [], modulos),
    weddingDate: Timestamp.fromDate(datos.weddingDate),
  };

  t.create(bodaRef.collection('public').doc('site'), {
    ...proyeccionPublica(boda),
    updatedAt: FieldValue.serverTimestamp(),
  });

  t.create(bodaRef.collection('guestGroups').doc(), {
    ...GRUPO_POR_DEFECTO,
    createdAt: FieldValue.serverTimestamp(),
  });

  for (const pregunta of PREGUNTAS_RSVP_FABRICA) {
    const { key, ...resto } = pregunta;
    // La clave es el id del documento: así `visibleIf.questionId` apunta a algo
    // real desde el primer segundo, sin una segunda pasada de resolución.
    t.create(bodaRef.collection('formQuestions').doc(key), {
      ...resto,
      options: [...resto.options],
    });
  }

  for (const faq of FAQS_FABRICA) {
    t.create(bodaRef.collection('faqs').doc(), { ...faq });
  }

  sembrarUbicaciones(t, bodaRef, datos);

  const hoy = new Date();
  const tareas = tareasAplicables(datos.weddingDate, hoy, plantillas.tareas);
  tareas.forEach((tarea, indice) => {
    t.create(bodaRef.collection('checklistItems').doc(), {
      title: tarea.title,
      description: '',
      category: tarea.category,
      dueDate: Timestamp.fromDate(fechaLimiteTarea(datos.weddingDate, tarea.mesesAntes, hoy)),
      done: false,
      doneAt: null,
      assignedTo: 'both',
      vendorId: null,
      budgetItemId: null,
      priority: tarea.priority,
      icon: tarea.icon,
      color: null,
      order: indice + 1,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  // Las partidas del presupuesto: copia de las originales del superadmin. La
  // pareja las edita, añade o borra sin que eso toque el catálogo.
  plantillas.partidas.forEach((partida, indice) => {
    t.create(bodaRef.collection('budgetItems').doc(), {
      category: partida.category,
      concept: partida.concept,
      estimatedCents: partida.estimatedCents,
      actualCents: 0,
      paid: false,
      dueDate: null,
      vendorId: null,
      icon: '',
      color: null,
      notes: '',
      order: indice + 1,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Los dos sitios que pide el alta, como fichas del mapa.
 *
 * Con id fijo (`ceremonia`, `banquete`) para que la pareja los encuentre y los
 * edite en su sitio en lugar de duplicarlos. Sin pin, `coords` queda a `null` y
 * la proyección no los publica hasta que se coloque (ver ubicaciones).
 */
function sembrarUbicaciones(t: Transaction, bodaRef: DocumentReference, datos: DatosAlta): void {
  const sitios = [
    { id: 'ceremonia', type: 'ceremonia', lugar: datos.ceremonyPlace },
    { id: 'banquete', type: 'banquete', lugar: datos.receptionPlace },
  ] as const;

  sitios.forEach(({ id, type, lugar }, indice) => {
    if (lugar === null) return;
    t.create(bodaRef.collection('locations').doc(id), {
      type,
      name: lugar.name,
      address: lugar.address,
      coords: lugar.lat !== null && lugar.lng !== null ? { lat: lugar.lat, lng: lugar.lng } : null,
      description: '',
      time: null,
      order: indice + 1,
      visibleToGuests: true,
      icon: '',
    });
  });
}

/**
 * Autoriza el subdominio y deja constancia del resultado en la boda.
 *
 * No lanza: la boda ya existe y tumbar aquí la dejaría creada con una excepción
 * por respuesta, que es la peor de las combinaciones. Se marca y se avisa.
 */
async function intentarAutorizar(
  weddingId: string,
  dominio: string,
): Promise<{ ok: boolean; aviso: string | null }> {
  try {
    const resultado = await autorizarDominio(dominio);
    await db().collection('weddings').doc(weddingId).update({ 'setup.authDomain': 'ok' });
    return { ok: true, aviso: resultado.aviso };
  } catch (error) {
    console.error('No se pudo autorizar el dominio', dominio, error);
    return { ok: false, aviso: null };
  }
}

/**
 * Enlace para establecer la contraseña de cada cuenta.
 *
 * Falla con elegancia: si el proveedor de contraseña no está activo o Auth da
 * un error, se devuelve `null` y el alta sigue siendo válida. La pareja siempre
 * puede entrar por "he olvidado mi contraseña".
 */
async function conEnlacesDeAcceso(
  cuentas: readonly { email: string; uid: string; nueva: boolean }[],
  alta: DatosAlta,
  weddingId: string,
): Promise<readonly CuentaCreada[]> {
  // Al login del panel, no a `/panel`: quien acaba de poner su contraseña no
  // tiene sesión todavía, y `/panel` sin sesión depende de que el router lo
  // redirija. Yendo directos al acceso no hay nada que pueda desviarlo.
  const web = `https://${dominioDeBoda(alta.slug, DOMINIO_BASE)}`;
  const url = `${web}/panel/acceso`;

  return Promise.all(
    cuentas.map(async (cuenta) => {
      let enlaceAcceso: string;
      try {
        enlaceAcceso = await auth().generatePasswordResetLink(cuenta.email, { url });
      } catch (error) {
        console.error('No se pudo generar el enlace de acceso', cuenta.email, error);
        return { ...cuenta, enlaceAcceso: null, correoEnviado: false };
      }

      // El correo sale con la plantilla editable. `encolarCorreo` no lanza: un
      // correo que falla no deshace un alta que ya está hecha.
      const correoEnviado = await encolarCorreo({
        para: cuenta.email,
        plantilla: 'parejaAcceso',
        weddingId,
        datos: {
          novios: `${alta.partnerA} y ${alta.partnerB}`,
          fecha: fechaParaCorreo(alta.weddingDate),
          web,
          enlace: enlaceAcceso,
          correo: cuenta.email,
        },
      });
      return { ...cuenta, enlaceAcceso, correoEnviado };
    }),
  );
}
