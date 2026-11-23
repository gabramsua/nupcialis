/**
 * Los correos de Nupcialis, desde el panel del superadmin (D-53).
 *
 * - `listEmailTemplates` / `saveEmailTemplate` / `resetEmailTemplate`: ver y
 *   editar los textos. Se guardan en `emailTemplates/{id}`; sin documento vale
 *   la plantilla de fábrica.
 * - `previewEmail`: cómo quedaría el correo con datos de ejemplo.
 * - `sendCoupleAccessEmail`: manda (o reenvía) a una cuenta de la pareja el
 *   correo con el enlace para elegir contraseña. Sustituye al correo genérico y
 *   feo de Firebase, que nunca se llega a mandar.
 *
 * Solo el superadmin. El envío real lo hace la extensión «Trigger Email» a
 * partir de la colección `mail` (`infra/correo.ts`).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  ID_PLANTILLAS,
  PLANTILLAS_DE_FABRICA,
  esIdPlantilla,
  estadoDeCorreo,
  montarCorreo,
  plantillaEfectiva,
  validarPlantilla,
  type IdPlantilla,
} from './dominio/correos';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { generarAccesoDePareja } from './infra/acceso-pareja';
import { auditar } from './infra/auditoria';
import { encolarCorreo, leerPlantilla } from './infra/correo';
import { exigirSuperadmin } from './infra/permisos';

function idDe(valor: unknown): IdPlantilla {
  if (!esIdPlantilla(valor)) throw new HttpsError('invalid-argument', 'Esa plantilla no existe.');
  return valor;
}

/** Datos de ejemplo para la vista previa: se ve el correo sin mandarlo. */
const EJEMPLO = {
  novios: 'Ana y Leo',
  nombre: 'María',
  fecha: ' el 12 de junio de 2027',
  enlace: 'https://ana-y-leo.nupcialis.com/panel/acceso?ejemplo=1',
  web: 'https://ana-y-leo.nupcialis.com',
  correo: 'ana@ejemplo.com',
} as const;

export const listEmailTemplates = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);

    const docs = await db().collection('emailTemplates').get();
    const guardadas = new Map(docs.docs.map((d) => [d.id, d.data()]));

    return {
      plantillas: ID_PLANTILLAS.map((id) => {
        const guardada = guardadas.get(id);
        const efectiva = plantillaEfectiva(id, guardada);
        const fabrica = PLANTILLAS_DE_FABRICA[id];

        return {
          id,
          destinatario: efectiva.destinatario,
          asunto: efectiva.asunto,
          cuerpo: efectiva.cuerpo,
          marcadores: efectiva.marcadores,
          boton: efectiva.boton,
          personalizada: efectiva.asunto !== fabrica.asunto || efectiva.cuerpo !== fabrica.cuerpo,
        };
      }),
    };
  },
);

export const saveEmailTemplate = onCall<{ id?: unknown; plantilla?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const id = idDe(peticion.data?.id);

    const valida = validarPlantilla(peticion.data?.plantilla);
    if (!valida.ok) {
      throw new HttpsError('invalid-argument', 'La plantilla no es válida.', {
        motivo: valida.motivo,
      });
    }

    await db()
      .doc(`emailTemplates/${id}`)
      .set({ ...valida.datos, updatedAt: FieldValue.serverTimestamp() });

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'saveEmailTemplate',
      weddingId: null,
      payload: { id },
    });

    return { ok: true as const };
  },
);

/** Vuelve a la de fábrica: borra la guardada. */
export const resetEmailTemplate = onCall<{ id?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const id = idDe(peticion.data?.id);

    await db().doc(`emailTemplates/${id}`).delete();

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'resetEmailTemplate',
      weddingId: null,
      payload: { id },
    });

    return { ok: true as const };
  },
);

/** El correo montado con datos de ejemplo. Admite un borrador sin guardar. */
export const previewEmail = onCall<{ id?: unknown; plantilla?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);
    const id = idDe(peticion.data?.id);

    let asuntoYCuerpo;
    if (peticion.data?.plantilla !== undefined) {
      const valida = validarPlantilla(peticion.data.plantilla);
      if (!valida.ok) {
        throw new HttpsError('invalid-argument', 'La plantilla no es válida.', {
          motivo: valida.motivo,
        });
      }
      asuntoYCuerpo = valida.datos;
    } else {
      asuntoYCuerpo = await leerPlantilla(id);
    }

    const correo = montarCorreo(asuntoYCuerpo, PLANTILLAS_DE_FABRICA[id].boton, EJEMPLO);
    return { asunto: correo.asunto, html: correo.html, texto: correo.texto };
  },
);

/**
 * Manda a una cuenta de la pareja el correo de acceso (o de restablecer).
 *
 * Devuelve también el enlace: el superadmin lo puede **copiar** además de que
 * se mande (si el correo no llega, es lo que le queda).
 */
export const sendCoupleAccessEmail = onCall<{
  weddingId?: unknown;
  uid?: unknown;
  plantilla?: unknown;
}>({ region: REGION, enforceAppCheck: EXIGIR_APP_CHECK }, async (peticion) => {
  const superadmin = exigirSuperadmin(peticion);
  const weddingId = typeof peticion.data?.weddingId === 'string' ? peticion.data.weddingId : '';
  const uid = typeof peticion.data?.uid === 'string' ? peticion.data.uid : '';
  if (weddingId === '' || weddingId.includes('/') || uid === '') {
    throw new HttpsError('invalid-argument', 'Faltan datos.');
  }

  const plantilla: IdPlantilla =
    peticion.data?.plantilla === 'parejaRestablecer' ? 'parejaRestablecer' : 'parejaAcceso';

  const acceso = await generarAccesoDePareja(weddingId, uid);
  const enviado = await encolarCorreo({
    para: acceso.email,
    plantilla,
    datos: acceso.datos,
    weddingId,
  });

  await auditar({
    actorUid: superadmin.uid,
    actorRole: 'superadmin',
    action: 'sendCoupleAccessEmail',
    weddingId,
    payload: { paraUid: uid, plantilla, encolado: enviado },
  });

  return { email: acceso.email, enlace: acceso.enlace, enviado };
});

/** Cuántos correos de la cola se enseñan: los más recientes. */
const MAX_COLA = 100;

/**
 * La cola de correos (colección `mail`): cuántos hay y cuáles son.
 *
 * Sin el cuerpo: lleva el enlace de acceso a la cuenta de la pareja y el
 * superadmin no lo necesita para saber qué hay pendiente.
 */
export const listMailQueue = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);

    const coleccion = db().collection('mail');
    const [total, recientes] = await Promise.all([
      coleccion.count().get(),
      coleccion.orderBy('meta.createdAt', 'desc').limit(MAX_COLA).get(),
    ]);

    const correos = recientes.docs.map((d) => {
      const datos = d.data();
      const para = Array.isArray(datos['to']) ? datos['to'] : [];
      const mensaje = (datos['message'] ?? {}) as Record<string, unknown>;
      const meta = (datos['meta'] ?? {}) as Record<string, unknown>;
      const creado = meta['createdAt'];
      const delivery = datos['delivery'] as Record<string, unknown> | undefined;

      return {
        id: d.id,
        para: para.filter((x): x is string => typeof x === 'string'),
        asunto: typeof mensaje['subject'] === 'string' ? mensaje['subject'] : '',
        plantilla: typeof meta['plantilla'] === 'string' ? meta['plantilla'] : '',
        weddingId: typeof meta['weddingId'] === 'string' ? meta['weddingId'] : '',
        estado: estadoDeCorreo(delivery),
        error: typeof delivery?.['error'] === 'string' ? delivery['error'] : '',
        creadoMs:
          creado !== null && typeof creado === 'object' && 'toMillis' in creado
            ? (creado as { toMillis(): number }).toMillis()
            : 0,
      };
    });

    return {
      total: total.data().count,
      porEstado: {
        'en-cola': correos.filter((c) => c.estado === 'en-cola').length,
        enviando: correos.filter((c) => c.estado === 'enviando').length,
        enviado: correos.filter((c) => c.estado === 'enviado').length,
        error: correos.filter((c) => c.estado === 'error').length,
      },
      correos,
    };
  },
);

/** Quita un correo de la cola: no saldrá (o, si ya salió, se borra el rastro). */
export const discardMailItem = onCall<{ id?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const id = typeof peticion.data?.id === 'string' ? peticion.data.id : '';
    if (id === '' || id.includes('/')) throw new HttpsError('invalid-argument', 'Falta el correo.');

    await db().collection('mail').doc(id).delete();
    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'discardMailItem',
      weddingId: null,
      payload: { id },
    });
    return { ok: true };
  },
);
