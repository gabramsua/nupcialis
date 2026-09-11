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
import { dominioDeBoda } from './dominio/dominios';
import { layoutDePlan, modulosIniciales } from './dominio/planes';
import { proyeccionPublica, type BodaParaProyectar } from './dominio/proyeccion';
import { CONTADORES_VACIOS } from './dominio/contadores';
import {
  CHECKLIST_PLANTILLA,
  FAQS_FABRICA,
  GRUPO_POR_DEFECTO,
  PREGUNTAS_QUIZ_FABRICA,
  PREGUNTAS_RSVP_FABRICA,
  fechaLimiteTarea,
  tareasAplicables,
} from './dominio/semillas';
import { DOMINIO_BASE, REGION, auth, db } from './firebase';
import { auditar } from './infra/auditoria';
import { autorizarDominio } from './infra/identity-toolkit';
import { exigirSuperadmin } from './infra/permisos';

export interface CuentaCreada {
  readonly email: string;
  readonly uid: string;
  readonly nueva: boolean;
  /**
   * Enlace para que la persona ponga su contraseña.
   *
   * Fase 1: lo reparte el superadmin a mano. En fase 5, cuando haya proveedor
   * de correo, lo enviará la propia función y este campo desaparecerá de la
   * respuesta. Da acceso al panel: solo lo ve quien ha podido llamar aquí.
   */
  readonly enlaceAcceso: string | null;
}

export interface RespuestaAlta {
  readonly weddingId: string;
  readonly slug: string;
  readonly siteUrl: string;
  readonly cuentas: readonly CuentaCreada[];
  /** Lo que hay que mirar antes de dar el alta por buena. Vacío es lo normal. */
  readonly avisos: readonly string[];
}

export const provisionWedding = onCall<Partial<EntradaAlta>, Promise<RespuestaAlta>>(
  { region: REGION, enforceAppCheck: true },
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

    await crearBoda(
      weddingId,
      datos,
      cuentas.map((c) => c.uid),
    );

    // Los claims van después de la transacción a propósito: un claim que apunta
    // a una boda inexistente es un acceso concedido a la nada, y las reglas lo
    // aceptarían tan campante.
    for (const cuenta of cuentas) {
      await auth().setCustomUserClaims(cuenta.uid, { weddingId, role: 'owner' });
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

    const conEnlaces = await conEnlacesDeAcceso(cuentas, datos.slug);
    if (conEnlaces.some((c) => c.enlaceAcceso === null)) {
      avisos.push(
        'No se han podido generar todos los enlaces de acceso. Reintenta desde el panel.',
      );
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
    t.create(bodaRef, documentoDeBoda(datos, ownerUids));
    sembrar(t, bodaRef, datos);
  });
}

function documentoDeBoda(datos: DatosAlta, ownerUids: readonly string[]) {
  return {
    slug: datos.slug,
    // Nace en borrador aunque la pareja haya pagado: la web no se publica hasta
    // que ellos la dan por buena. Ver PENDIENTES D-22.
    status: 'draft' as const,
    plan: datos.plan,
    layout: layoutDePlan(datos.plan),
    couple: { partnerA: datos.partnerA, partnerB: datos.partnerB },
    weddingDate: Timestamp.fromDate(datos.weddingDate),
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
    },
    modules: modulosIniciales(datos.plan),
    counters: { ...CONTADORES_VACIOS, photosPending: 0 },
    // Lo que queda por cuadrar fuera de Firestore. El panel de superadmin lo
    // pinta en rojo mientras no esté en 'ok'.
    setup: { authDomain: 'pending' as const },
    content: { sections: [] },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/** Las semillas. Todas dentro de la transacción que crea la boda. */
function sembrar(t: Transaction, bodaRef: DocumentReference, datos: DatosAlta): void {
  const boda: BodaParaProyectar = {
    ...documentoDeBoda(datos, []),
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

  for (const pregunta of PREGUNTAS_QUIZ_FABRICA) {
    t.create(bodaRef.collection('quizQuestions').doc(), {
      ...pregunta,
      wrongAnswers: [...pregunta.wrongAnswers],
    });
  }

  const hoy = new Date();
  const tareas = tareasAplicables(datos.weddingDate, hoy, CHECKLIST_PLANTILLA);
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
  slug: string,
): Promise<readonly CuentaCreada[]> {
  const url = `https://${dominioDeBoda(slug, DOMINIO_BASE)}/panel`;

  return Promise.all(
    cuentas.map(async (cuenta) => {
      try {
        const enlaceAcceso = await auth().generatePasswordResetLink(cuenta.email, { url });
        return { ...cuenta, enlaceAcceso };
      } catch (error) {
        console.error('No se pudo generar el enlace de acceso', cuenta.email, error);
        return { ...cuenta, enlaceAcceso: null };
      }
    }),
  );
}
