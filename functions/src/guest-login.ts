/**
 * `guestLogin`: la puerta de entrada del invitado a la web de su boda.
 *
 * Es, junto a `createWeddingRequest`, **la única función pública del sistema**:
 * cualquiera con la URL del proyecto puede llamarla, sin sesión. De ahí todo lo
 * que lleva encima (regla 3 y REQUISITOS §3.3):
 *
 * - **App Check**, para que llamarla desde fuera del navegador cueste.
 * - **Límite de intentos por boda y por IP**, con espera creciente, para que no
 *   se pueda enumerar la lista de invitados a base de probar nombres.
 * - **Una sola respuesta de fallo**, idéntica para «esa boda no existe», «ese
 *   invitado no está» y «los dígitos no coinciden».
 *
 * Desde D-34 hay **tres puertas**, y las tres acaban en un token de Firebase:
 *
 * - `guestLogin`: nombre y cuatro dígitos, o teléfono. Da nivel `verificado`.
 * - `guestLinkLogin`: el token que lleva el enlace que mandó la pareja. Da
 *   nivel `enlace`, que **solo sirve para ver la web**.
 * - `verifyGuest`: desde una sesión de enlace, los cuatro dígitos. Sube a
 *   `verificado`.
 *
 * La boda llega por **slug**, no por `weddingId`. Aquí todavía no hay token del
 * que sacarlo (regla 1 no aplica: no hay sesión que lo traiga), y el slug es
 * público de todas formas —está en la URL—, así que se resuelve contra
 * `slugs/{slug}` igual que hace la web. Aceptar un `weddingId` a pelo sería
 * dar por bueno un identificador interno escrito por el cliente.
 */

import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';

import {
  SIN_INTENTOS,
  esModoAcceso,
  pareceToken,
  puedeIntentar,
  trasAcertar,
  trasFallar,
  verificar,
  type Credenciales,
  type InvitadoIdentificable,
  type ModoAcceso,
  type NivelSesion,
  type RegistroIntentos,
} from './dominio/acceso';
import { normalizarNombre, normalizarTelefono, ultimos4 } from './dominio/invitados';
import { EXIGIR_APP_CHECK, REGION, auth, db } from './firebase';

export interface EntradaAcceso extends Credenciales {
  readonly slug?: unknown;
}

/**
 * El fallo. **Uno solo, siempre el mismo.**
 *
 * Se construye cada vez en vez de ser una constante exportada para que nadie
 * caiga en la tentación de añadirle `details` en una rama concreta: el día que
 * una de las ramas diga algo distinto, la enumeración vuelve a ser posible.
 */
function noEntra(): HttpsError {
  return new HttpsError('permission-denied', 'No hemos podido identificarte.');
}

/**
 * De quién viene la petición.
 *
 * Detrás del balanceador de Google, `req.ip` es el del balanceador; el de
 * verdad va el primero en `x-forwarded-for`. Sin IP se usa una clave fija: así
 * el límite sigue contando —de forma más brusca, todos juntos— en vez de
 * quedarse abierto de par en par.
 */
function ipDe(peticion: CallableRequest<unknown>): string {
  const cabecera = peticion.rawRequest?.headers?.['x-forwarded-for'];
  const crudo = Array.isArray(cabecera) ? cabecera[0] : cabecera;
  const primera = typeof crudo === 'string' ? crudo.split(',')[0]?.trim() : '';
  return primera || peticion.rawRequest?.ip || 'desconocida';
}

/**
 * La clave del contador de intentos.
 *
 * Es un hash y no la IP tal cual por dos motivos: una IPv6 lleva caracteres que
 * en un id de documento se leen fatal, y un listado de documentos no tiene por
 * qué ser un listado de direcciones de los invitados. La IP sin disfrazar sí
 * queda en `guestAccessLog`, que solo ve la pareja.
 */
function claveIntentos(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function aRegistro(datos: Record<string, unknown> | undefined): RegistroIntentos {
  if (!datos) return SIN_INTENTOS;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    intentos: n(datos['intentos']),
    desde: n(datos['desde']),
    bloqueos: n(datos['bloqueos']),
    bloqueadoHasta: n(datos['bloqueadoHasta']),
  };
}

/**
 * Los invitados que **podrían** ser quien dice ser.
 *
 * Se consulta por índice en vez de leer la lista entera: con mil invitados,
 * cada intento fallido costaría mil lecturas, y eso convierte el propio límite
 * de intentos en el único freno a una factura. Quien decide sigue siendo
 * `verificar`; esto solo acota a quién mirar.
 */
async function candidatos(
  weddingId: string,
  modo: ModoAcceso,
  credenciales: Credenciales,
): Promise<InvitadoIdentificable[]> {
  const coleccion = db().collection(`weddings/${weddingId}/guests`);

  const consulta =
    modo === 'phone'
      ? coleccion.where('phone', '==', normalizarTelefono(credenciales.telefono))
      : coleccion
          .where('normalizedName', '==', normalizarNombre(credenciales.nombre))
          .where('phoneLast4', '==', ultimos4(String(credenciales.digitos ?? '')));

  const snap = await consulta.limit(10).get();

  return snap.docs.map((d) => {
    const g = d.data();
    return {
      id: d.id,
      normalizedName: typeof g['normalizedName'] === 'string' ? g['normalizedName'] : '',
      phone: typeof g['phone'] === 'string' ? g['phone'] : null,
      phoneLast4: typeof g['phoneLast4'] === 'string' ? g['phoneLast4'] : null,
      // Ausente es activo: los invitados anteriores a este campo lo están.
      active: g['active'] !== false,
    };
  });
}

/**
 * El token de Firebase con el que el invitado habla con todo lo demás.
 *
 * El uid se deriva de la boda y del invitado: el mismo invitado es siempre el
 * mismo usuario, y eso es lo que permite que `auditLog` y las reglas hablen de
 * él. El `nivel` es la mitad de D-34 que de verdad protege algo, y por eso va
 * en el claim y no en ningún sitio que el navegador pueda tocar.
 */
async function tokenDeInvitado(
  weddingId: string,
  guestId: string,
  nivel: NivelSesion,
  nombre = '',
): Promise<string> {
  return auth().createCustomToken(`guest:${weddingId}:${guestId}`, {
    weddingId,
    guestId,
    role: 'guest',
    nivel,
    // Su propio nombre, para que la web pueda decirle «estás viendo esto como
    // María» después de recargar. Es suyo y no se lo enseña a nadie más; sin
    // esto, al recuperar la sesión no hay forma de saludarle ni de ofrecerle el
    // «¿no eres tú?» con un nombre delante.
    nombre,
  });
}

/**
 * Apunta la entrada: contadores del invitado y registro de accesos.
 *
 * `loginCount` es campo de sistema (regla 6): lo mueve el servidor y nadie
 * más. `firstLoginAt` solo la primera vez, que es lo que convierte la vista de
 * «no han entrado nunca» en algo en lo que se puede confiar.
 */
async function apuntarEntrada(
  weddingId: string,
  guestId: string,
  modo: string,
  peticion: CallableRequest<unknown>,
): Promise<string> {
  const base = db();
  const refInvitado = base.doc(`weddings/${weddingId}/guests/${guestId}`);

  const invitado = (await refInvitado.get()).data();
  const yaEntro = invitado?.['firstLoginAt'] != null;
  await refInvitado.update({
    loginCount: FieldValue.increment(1),
    lastLoginAt: FieldValue.serverTimestamp(),
    ...(yaEntro ? {} : { firstLoginAt: FieldValue.serverTimestamp() }),
  });

  await base.collection(`weddings/${weddingId}/guestAccessLog`).add({
    guestId,
    mode: modo,
    ip: ipDe(peticion),
    userAgent: String(peticion.rawRequest?.headers?.['user-agent'] ?? '').slice(0, 300),
    createdAt: FieldValue.serverTimestamp(),
  });

  return nombreDe(invitado);
}

/** El mote si lo tiene, y si no el nombre. Es como la pareja lo llama. */
function nombreDe(invitado: Record<string, unknown> | undefined): string {
  const mote = invitado?.['nickname'];
  if (typeof mote === 'string' && mote !== '') return mote;

  const nombre = invitado?.['fullName'];
  return typeof nombre === 'string' ? nombre : '';
}

/** La boda publicada que hay detrás de un slug, o nada que se pueda contar. */
async function bodaDelSlug(slug: string): Promise<{ weddingId: string; modo: ModoAcceso }> {
  const base = db();
  const slugSnap = await base.doc(`slugs/${slug}`).get();
  const entrada = slugSnap.data();

  // Una boda en cuarentena se comporta como inexistente, igual que en la web.
  // Si dijera «archivada», estaría confirmando a un desconocido que existió.
  if (!slugSnap.exists || entrada?.['status'] !== 'active') throw noEntra();

  const weddingId = typeof entrada['weddingId'] === 'string' ? entrada['weddingId'] : '';
  if (weddingId === '') throw noEntra();

  const bodaSnap = await base.doc(`weddings/${weddingId}`).get();
  const boda = bodaSnap.data();
  const modo = boda?.['guestAccessMode'];

  if (!bodaSnap.exists || boda?.['status'] !== 'active' || !esModoAcceso(modo)) throw noEntra();

  return { weddingId, modo };
}

export const guestLogin = onCall<EntradaAcceso>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const datos = peticion.data ?? {};
    const slug = typeof datos.slug === 'string' ? datos.slug.trim().toLowerCase() : '';
    if (slug === '') throw noEntra();

    const { weddingId, modo } = await bodaDelSlug(slug);

    // En una boda abierta no hay nada que verificar.
    if (modo === 'open') throw noEntra();

    const ahora = Date.now();
    const refIntentos = db().doc(
      `weddings/${weddingId}/loginAttempts/${claveIntentos(ipDe(peticion))}`,
    );

    const registro = aRegistro((await refIntentos.get()).data());
    const decision = puedeIntentar(registro, ahora);
    if (!decision.permitido) {
      // Este sí lleva detalle, y no filtra nada: habla de esta IP, no de quién
      // está invitado. Sin él, la pantalla solo puede decir «prueba otra vez».
      throw new HttpsError('resource-exhausted', 'Demasiados intentos.', {
        esperaMs: decision.esperaMs,
      });
    }

    const resultado = verificar(modo, datos, await candidatos(weddingId, modo, datos));

    if (!resultado.ok) {
      await refIntentos.set(
        { ...trasFallar(registro, ahora), actualizadoEn: FieldValue.serverTimestamp() },
        { merge: true },
      );
      throw noEntra();
    }

    await refIntentos.set(
      { ...trasAcertar(), actualizadoEn: FieldValue.serverTimestamp() },
      { merge: true },
    );

    const { guestId } = resultado;
    const nombre = await apuntarEntrada(weddingId, guestId, modo, peticion);

    return {
      token: await tokenDeInvitado(weddingId, guestId, 'verificado', nombre),
      guestId,
      nombre,
    };
  },
);

export interface EntradaEnlace {
  readonly slug?: unknown;
  readonly k?: unknown;
}

/**
 * `guestLinkLogin`: el enlace que mandó la pareja (D-34, opción 3).
 *
 * Da nivel `enlace`, y eso es todo lo que da: ver la web. El enlace se
 * reenvía —el primo lo pasa al grupo de la familia «por si alguien no lo
 * tiene»— y lo que vale la mitad de un grupo de WhatsApp no puede confirmar por
 * nadie, ni elegirle el menú, ni apuntarle acompañantes.
 *
 * Igual de pública que `guestLogin`, así que lleva lo mismo: App Check, límite
 * de intentos por IP y **una sola respuesta de fallo**. Un token que no existe y
 * uno de un invitado dado de baja contestan lo mismo.
 */
export const guestLinkLogin = onCall<EntradaEnlace>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const datos = peticion.data ?? {};
    const slug = typeof datos.slug === 'string' ? datos.slug.trim().toLowerCase() : '';
    const token = pareceToken(datos.k);

    // Lo que no tiene la forma de un token nuestro no se busca: una consulta
    // menos por intento, y el fallo es el mismo de todas formas.
    if (slug === '' || token === null) throw noEntra();

    const { weddingId, modo } = await bodaDelSlug(slug);

    // En una boda abierta estos enlaces no existen: no hay puerta que abrir.
    if (modo === 'open') throw noEntra();

    const ahora = Date.now();
    const refIntentos = db().doc(
      `weddings/${weddingId}/loginAttempts/${claveIntentos(ipDe(peticion))}`,
    );
    const registro = aRegistro((await refIntentos.get()).data());
    const decision = puedeIntentar(registro, ahora);
    if (!decision.permitido) {
      throw new HttpsError('resource-exhausted', 'Demasiados intentos.', {
        esperaMs: decision.esperaMs,
      });
    }

    const encontrados = await db()
      .collection(`weddings/${weddingId}/guests`)
      .where('inviteToken', '==', token)
      .limit(2)
      .get();

    const doc = encontrados.docs[0];
    const invitado = doc?.data();

    // Dos invitados con el mismo token no debería poder pasar; si pasa, no se
    // adivina a cuál de los dos. Y un invitado inactivo no entra, sin decir que
    // existe.
    if (encontrados.size !== 1 || !doc || !invitado || invitado['active'] === false) {
      await refIntentos.set(
        { ...trasFallar(registro, ahora), actualizadoEn: FieldValue.serverTimestamp() },
        { merge: true },
      );
      throw noEntra();
    }

    await refIntentos.set(
      { ...trasAcertar(), actualizadoEn: FieldValue.serverTimestamp() },
      { merge: true },
    );

    const nombre = await apuntarEntrada(weddingId, doc.id, 'enlace', peticion);

    return {
      token: await tokenDeInvitado(weddingId, doc.id, 'enlace', nombre),
      guestId: doc.id,
      // Para saludarle por su nombre sin una llamada más.
      nombre,
    };
  },
);

export interface EntradaVerificacion extends Credenciales {
  readonly slug?: unknown;
}

/**
 * `verifyGuest`: de nivel `enlace` a nivel `verificado`.
 *
 * El invitado ya está dentro por el enlace; esto comprueba que es él. El
 * `guestId` sale **del token** y no de la petición (regla 1): si viniera en el
 * cuerpo, cualquiera con un enlace podría probar los cuatro dígitos de otro.
 *
 * Y por eso mismo esto es más estrecho que `guestLogin`: ahí se busca entre
 * todos los invitados, aquí se comprueban los dígitos **de uno**. El límite de
 * intentos sigue haciendo falta —cuatro dígitos son diez mil combinaciones— y
 * es el mismo contador por IP.
 */
export const verifyGuest = onCall<EntradaVerificacion>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const sesion = peticion.auth;
    const weddingId = sesion?.token['weddingId'];
    const guestId = sesion?.token['guestId'];

    if (
      !sesion ||
      sesion.token['role'] !== 'guest' ||
      typeof weddingId !== 'string' ||
      weddingId === '' ||
      typeof guestId !== 'string' ||
      guestId === ''
    ) {
      throw noEntra();
    }

    const base = db();
    const bodaSnap = await base.doc(`weddings/${weddingId}`).get();
    const boda = bodaSnap.data();
    const modo = boda?.['guestAccessMode'];

    if (!bodaSnap.exists || boda?.['status'] !== 'active' || !esModoAcceso(modo)) throw noEntra();
    if (modo === 'open') throw noEntra();

    const ahora = Date.now();
    const refIntentos = base.doc(
      `weddings/${weddingId}/loginAttempts/${claveIntentos(ipDe(peticion))}`,
    );
    const registro = aRegistro((await refIntentos.get()).data());
    const decision = puedeIntentar(registro, ahora);
    if (!decision.permitido) {
      throw new HttpsError('resource-exhausted', 'Demasiados intentos.', {
        esperaMs: decision.esperaMs,
      });
    }

    const invitadoSnap = await base.doc(`weddings/${weddingId}/guests/${guestId}`).get();
    const g = invitadoSnap.data();
    if (!invitadoSnap.exists || !g) throw noEntra();

    const resultado = verificar(modo, peticion.data ?? {}, [
      {
        id: guestId,
        normalizedName: typeof g['normalizedName'] === 'string' ? g['normalizedName'] : '',
        phone: typeof g['phone'] === 'string' ? g['phone'] : null,
        phoneLast4: typeof g['phoneLast4'] === 'string' ? g['phoneLast4'] : null,
        active: g['active'] !== false,
      },
    ]);

    if (!resultado.ok) {
      await refIntentos.set(
        { ...trasFallar(registro, ahora), actualizadoEn: FieldValue.serverTimestamp() },
        { merge: true },
      );
      throw noEntra();
    }

    await refIntentos.set(
      { ...trasAcertar(), actualizadoEn: FieldValue.serverTimestamp() },
      { merge: true },
    );

    return {
      token: await tokenDeInvitado(weddingId, guestId, 'verificado', nombreDe(g)),
      guestId,
      nombre: nombreDe(g),
    };
  },
);
