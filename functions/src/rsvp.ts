/**
 * El formulario de confirmación: leerlo y contestarlo.
 *
 * Dos funciones, las dos para el invitado con sesión:
 *
 * - `getRsvpForm` le da las preguntas que le toca contestar y lo que contestó
 *   la última vez, para que pueda cambiarlo.
 * - `submitRsvp` lo guarda, **validando otra vez en el servidor**. Lo que valida
 *   el navegador es cortesía; lo que cuenta es esto (REQUISITOS §8.2).
 *
 * Las dos sacan la boda y el invitado del token y de ningún otro sitio
 * (regla 1): el `guestId` como parámetro convertiría «cambiar un número en la
 * petición» en «elegirle el menú al primo».
 *
 * `formQuestions` no se lee desde el cliente. Podría —son preguntas, no datos
 * de nadie—, pero entonces la web pública tendría que cargar Firestore para
 * pintar el formulario, y el presupuesto de 200 kB del bundle público no da
 * para eso. Pasa por aquí y llega ya filtrado y ordenado.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { esModoAcceso, type ModoAcceso } from './dominio/acceso';
import { exigeTelefono, puedeAnadir, type Titular } from './dominio/acompanantes';
import {
  camposDelInvitado,
  estadoTrasEnviar,
  plazoAbierto,
  preguntasPara,
  respuestasGuardadas,
  texto,
  validarRespuestas,
  type Pregunta,
  type Respuestas,
} from './dominio/formulario';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { limiteDe } from './infra/boda';
import { leerPreguntas } from './infra/formulario';
import { exigirInvitado, exigirVerificado } from './infra/permisos';
import { grupoGeneral } from './groups';
import { proponerDesdeRsvp } from './playlist';

interface Contexto {
  readonly weddingId: string;
  readonly guestId: string;
  readonly preguntas: readonly Pregunta[];
  readonly esAcompanante: boolean;
  readonly limite: Date | null;
  readonly invitado: Record<string, unknown>;
  /** `allowGuestAddedCompanions`: lo enciende la pareja (§8.3). */
  readonly modulo: boolean;
  readonly modo: ModoAcceso;
}

/**
 * Lo que las dos funciones necesitan antes de hacer nada.
 *
 * Una boda que no está publicada no tiene formulario, aunque el invitado tenga
 * una sesión válida de cuando lo estaba: el token dura 24 h y la boda puede
 * archivarse en ese rato.
 */
async function contexto(weddingId: string, guestId: string): Promise<Contexto> {
  const base = db();
  const [bodaSnap, invitadoSnap] = await Promise.all([
    base.doc(`weddings/${weddingId}`).get(),
    base.doc(`weddings/${weddingId}/guests/${guestId}`).get(),
  ]);

  const boda = bodaSnap.data();
  if (!bodaSnap.exists || boda?.['status'] !== 'active') {
    throw new HttpsError('not-found', 'Esta boda no está disponible.');
  }

  const invitado = invitadoSnap.data();
  // Invitado borrado o desactivado con la sesión abierta. No se distingue de
  // «no existe»: quien ya no está en la lista no necesita saber cuál de las dos.
  if (!invitadoSnap.exists || !invitado || invitado['active'] === false) {
    throw new HttpsError('not-found', 'No estás en la lista de esta boda.');
  }

  const modo = boda['guestAccessMode'];

  return {
    weddingId,
    guestId,
    preguntas: await leerPreguntas(weddingId),
    esAcompanante: invitado['isCompanion'] === true,
    limite: limiteDe(boda),
    invitado,
    modulo: boda['allowGuestAddedCompanions'] === true,
    modo: esModoAcceso(modo) ? modo : 'open',
  };
}

/** Un acompañante, como lo ve quien lo añadió. */
export interface AcompananteDelInvitado {
  readonly id: string;
  readonly fullName: string;
  readonly ageGroup: string;
  /** Si ya ha entrado en la web, el titular ya no puede quitarlo. */
  readonly yaEntro: boolean;
}

export interface FormularioRsvp {
  readonly preguntas: readonly Pregunta[];
  readonly respuestas: Respuestas;
  readonly estado: string;
  readonly nombre: string;
  readonly limite: string | null;
  readonly abierto: boolean;
  readonly yaContestado: boolean;
  /** A quién trae ya, y si puede traer a alguien más (§8.3). */
  readonly acompanantes: readonly AcompananteDelInvitado[];
  readonly puedeAnadirAcompanantes: boolean;
  readonly quedanAcompanantes: number;
  /** Si hay que pedirle el teléfono del acompañante para que pueda entrar. */
  readonly exigeTelefonoDelAcompanante: boolean;
}

/**
 * Los acompañantes que ya ha añadido.
 *
 * Se leen aquí y no en otra llamada: el formulario y la lista de acompañantes se
 * ven en la misma pantalla, y son dos consultas que caben en una sola espera.
 */
async function acompanantesDe(
  weddingId: string,
  guestId: string,
): Promise<readonly AcompananteDelInvitado[]> {
  const snap = await db()
    .collection(`weddings/${weddingId}/guests`)
    .where('invitedById', '==', guestId)
    .limit(20)
    .get();

  return snap.docs
    .map((d) => {
      const g = d.data();
      return {
        id: d.id,
        fullName: texto(g['fullName']),
        ageGroup: texto(g['ageGroup']) || 'adult',
        yaEntro: typeof g['loginCount'] === 'number' && g['loginCount'] > 0,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
}

function titularDe(guestId: string, invitado: Record<string, unknown>): Titular {
  const grupos = invitado['groupIds'];

  return {
    id: guestId,
    isCompanion: invitado['isCompanion'] === true,
    maxCompanions:
      typeof invitado['maxCompanions'] === 'number' ? Math.floor(invitado['maxCompanions']) : 0,
    groupIds: Array.isArray(grupos) ? grupos.filter((g): g is string => typeof g === 'string') : [],
    active: invitado['active'] !== false,
  };
}

export const getRsvpForm = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<FormularioRsvp> => {
    const invitado = exigirInvitado(peticion);
    const { weddingId, guestId } = invitado;
    const ctx = await contexto(weddingId, guestId);

    // Leer el formulario también exige haberse identificado (D-34): dentro
    // están sus alergias, su menú y lo que escribió a los novios. Un enlace
    // reenviado al grupo de la familia no lo enseña.
    exigirVerificado(invitado, ctx.modo);

    const acompanantes = await acompanantesDe(weddingId, guestId);
    const cupo = puedeAnadir(
      ctx.modulo,
      titularDe(guestId, ctx.invitado),
      // Los que ya ha añadido, contados con lo que hay escrito. Nunca con lo
      // que diga el navegador.
      acompanantes.length,
    );

    return {
      preguntas: preguntasPara(ctx.preguntas, ctx.esAcompanante),
      respuestas: respuestasGuardadas(ctx.invitado['rsvpAnswers']),
      estado: texto(ctx.invitado['rsvpStatus']) || 'pending',
      // Para saludarle por su nombre sin que la web tenga que leer nada más.
      nombre: texto(ctx.invitado['nickname']) || texto(ctx.invitado['fullName']),
      limite: ctx.limite ? ctx.limite.toISOString().slice(0, 10) : null,
      abierto: plazoAbierto(ctx.limite, new Date()),
      yaContestado: ctx.invitado['rsvpAt'] != null,
      acompanantes,
      puedeAnadirAcompanantes: cupo.puede,
      quedanAcompanantes: cupo.puede ? cupo.quedan : 0,
      exigeTelefonoDelAcompanante: exigeTelefono(ctx.modo),
    };
  },
);

export interface EntradaRsvp {
  readonly respuestas?: unknown;
}

export const submitRsvp = onCall<EntradaRsvp>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const invitado = exigirInvitado(peticion);
    const { weddingId, guestId } = invitado;
    const ctx = await contexto(weddingId, guestId);

    exigirVerificado(invitado, ctx.modo);

    if (!plazoAbierto(ctx.limite, new Date())) {
      // Con detalle a propósito: «no se puede» sin decir por qué, delante de un
      // formulario que se acaba de rellenar, es lo que hace que la gente lo
      // vuelva a enviar cinco veces.
      throw new HttpsError('failed-precondition', 'El plazo para confirmar ya ha terminado.', {
        limite: ctx.limite?.toISOString().slice(0, 10) ?? null,
      });
    }

    const enviadas = respuestasGuardadas(peticion.data?.respuestas);
    const validacion = validarRespuestas(ctx.preguntas, enviadas, ctx.esAcompanante);

    if (!validacion.ok) {
      // Los fallos van por pregunta, para que la pantalla pueda señalar la que
      // falta en vez de poner un aviso genérico arriba.
      throw new HttpsError('invalid-argument', 'Hay respuestas que faltan o no valen.', {
        fallos: validacion.fallos,
      });
    }

    const suyas = preguntasPara(ctx.preguntas, ctx.esAcompanante);
    const campos = camposDelInvitado(suyas, validacion.respuestas);

    const estado = estadoTrasEnviar(campos);
    // Quien confirma está en el grupo de todos (D-47). Normalmente ya lo está;
    // esto cubre a los invitados anteriores a la regla.
    const general = estado === 'confirmed' ? await grupoGeneral(db(), weddingId) : null;

    await db()
      .doc(`weddings/${weddingId}/guests/${guestId}`)
      .update({
        ...(general ? { groupIds: FieldValue.arrayUnion(general) } : {}),
        // Las respuestas se **reemplazan**, no se mezclan: si ahora dice que no
        // viene, su menú de la vez anterior no puede quedarse ahí.
        rsvpAnswers: validacion.respuestas,
        ...campos,
        rsvpStatus: estado,
        rsvpAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    // La canción que no puede faltar entra sola en la playlist (§8.14). Va
    // después de guardar la respuesta y sin dejar que falle la confirmación:
    // quien envió bien su formulario no debe ver un error por la lista de música.
    if (typeof validacion.respuestas['cancion'] === 'string') {
      try {
        await proponerDesdeRsvp(weddingId, guestId, validacion.respuestas['cancion']);
      } catch (error) {
        logger.warn('No se pudo añadir la canción del RSVP a la playlist', { weddingId, error });
      }
    }

    return { ok: true as const, estado };
  },
);
