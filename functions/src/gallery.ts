/**
 * La galería: subir, listar y borrar fotos (§8.5).
 *
 * **Todo pasa por aquí.** `photos` está cerrada a lectura y escritura desde el
 * cliente (regla de oro 2) y los ficheros de Storage no se leen directamente:
 * quién ve qué lo decide esta función y nadie más. Hoy todas las fotos son
 * públicas para los invitados de la boda; cuando lleguen las audiencias por
 * grupo, el cambio es **aquí dentro** y no en las reglas, que ya dicen que no
 * a todo.
 *
 * **La foto llega en base64 por la invocable, no se sube a Storage desde el
 * navegador.** Dos razones, y la segunda es la que manda:
 *
 * 1. El SDK de Storage en el navegador son decenas de kilobytes que la web
 *    pública no se puede permitir (hay 200 kB de presupuesto, §11), y la
 *    galería la abre cualquiera desde el móvil.
 * 2. El navegador **ya tiene que abrir la foto** para reducirla a 1600 px
 *    antes de mandarla —si no, una foto de cámara son ocho megas por la red de
 *    una finca—, así que a estas alturas la imagen ya está en memoria y
 *    mandarla por la invocable no cuesta nada más.
 *
 * El móvil manda además la **miniatura** ya hecha, en la misma llamada. Es lo
 * que permite que la rejilla cargue sin pedirle al servidor que redimensione,
 * y por tanto que las funciones no necesiten ninguna librería de imagen.
 */

import { randomUUID } from 'node:crypto';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  MAX_BYTES,
  POR_PAGINA,
  bytesDeBase64,
  esTipoPermitido,
  extensionDe,
  puedeBorrar,
  sanearPie,
  type FotoPublica,
} from './dominio/galeria';
import { topeDeFotos } from './dominio/limites';
import { EXIGIR_APP_CHECK, REGION, bucket, db } from './firebase';
import { exigirInvitado, exigirPareja, exigirVerificado } from './infra/permisos';
import { modoDeAcceso } from './infra/boda';

interface EntradaSubir {
  readonly contenidoBase64?: unknown;
  readonly miniaturaBase64?: unknown;
  readonly contentType?: unknown;
  readonly pie?: unknown;
}

/**
 * Sube una foto.
 *
 * Exige **nivel verificado** (regla de oro 3): quien solo ha abierto un enlace
 * reenviado por un tercero no sube fotos a la boda de otro.
 */
export const uploadPhoto = onCall<EntradaSubir>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK, memory: '512MiB' },
  async (peticion): Promise<{ id: string; url: string }> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));

    const datos = peticion.data ?? {};
    const contentType = datos.contentType;
    const contenido = datos.contenidoBase64;
    const miniatura = datos.miniaturaBase64;

    if (!esTipoPermitido(contentType)) {
      throw new HttpsError('invalid-argument', 'Ese formato de imagen no vale.');
    }
    if (typeof contenido !== 'string' || contenido === '') {
      throw new HttpsError('invalid-argument', 'No ha llegado ninguna imagen.');
    }
    // Se mira la longitud de la cadena antes de convertirla: así una de cien
    // megas se rechaza sin reservar cien megas de memoria en la función.
    if (bytesDeBase64(contenido) > MAX_BYTES) {
      throw new HttpsError('invalid-argument', 'La imagen pesa demasiado.');
    }

    const base = db();

    // El techo se mira antes de guardar nada en Storage: una galería llena no
    // debe gastar ni un byte más. Es un tope blando —dos subidas a la vez en la
    // foto 499 pueden pasarse en una—, y eso no cambia la factura.
    const [boda, subidas] = await Promise.all([
      base.doc(`weddings/${invitado.weddingId}`).get(),
      base.collection(`weddings/${invitado.weddingId}/photos`).count().get(),
    ]);
    if (subidas.data().count >= topeDeFotos(boda.data())) {
      throw new HttpsError('resource-exhausted', 'La galería de esta boda está llena.', {
        motivo: 'galeria-llena',
      });
    }

    const ref = base.collection(`weddings/${invitado.weddingId}/photos`).doc();
    const extension = extensionDe(contentType);
    const carpeta = `weddings/${invitado.weddingId}/gallery/${ref.id}`;

    const grande = await guardar(`${carpeta}/original.${extension}`, contenido, contentType);
    const pequena =
      typeof miniatura === 'string' && miniatura !== ''
        ? await guardar(`${carpeta}/thumb.${extension}`, miniatura, contentType)
        : grande;

    const quien = await base.doc(`weddings/${invitado.weddingId}/guests/${invitado.guestId}`).get();
    const g = quien.data() ?? {};
    const autor =
      (typeof g['nickname'] === 'string' && g['nickname'] !== ''
        ? g['nickname']
        : typeof g['fullName'] === 'string'
          ? g['fullName']
          : '') || 'Un invitado';

    await ref.set({
      storagePath: grande.ruta,
      thumbPath: pequena.ruta,
      url: grande.url,
      thumbUrl: pequena.url,
      uploadedBy: { guestId: invitado.guestId, displayName: autor },
      // Las audiencias por grupo llegan con el módulo de grupos. Hasta
      // entonces toda foto es de la boda entera, y `null` es exactamente eso.
      audienceGroupId: null,
      caption: sanearPie(datos.pie),
      status: 'approved',
      createdAt: FieldValue.serverTimestamp(),
    });

    return { id: ref.id, url: grande.url };
  },
);

interface EntradaListar {
  readonly cursor?: unknown;
}

/**
 * Las fotos, de la última a la primera, por páginas.
 *
 * El cursor es la fecha de la última que se llevó, en ISO: no se guarda estado
 * en el servidor y dos páginas seguidas no repiten nada aunque entre medias
 * alguien suba otra.
 */
export const listPhotos = onCall<EntradaListar>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (
    peticion,
  ): Promise<{
    fotos: readonly FotoPublica[];
    cursor: string | null;
    /** Quién pregunta, para que su navegador sepa cuáles son sus fotos. */
    miGuestId: string | null;
  }> => {
    const quien = await quienMira(peticion);

    const cursor = typeof peticion.data?.cursor === 'string' ? peticion.data.cursor : null;

    const coleccion = db().collection(`weddings/${quien.weddingId}/photos`);

    // La pareja ve la galería entera, sin filtrar por estado: es su boda y es
    // quien responde de lo que hay colgado. El invitado ve lo aprobado.
    let consulta = (quien.esPareja ? coleccion : coleccion.where('status', '==', 'approved'))
      .orderBy('createdAt', 'desc')
      .limit(POR_PAGINA);

    if (cursor) {
      const desde = new Date(cursor);
      if (!Number.isNaN(desde.getTime())) {
        consulta = consulta.startAfter(Timestamp.fromDate(desde));
      }
    }

    const snap = await consulta.get();
    const fotos = snap.docs.map((d) => aFotoPublica(d.id, d.data()));
    const ultima = fotos.at(-1);

    return {
      fotos,
      // Solo hay siguiente página si esta vino llena. Con menos, se acabó.
      cursor: fotos.length === POR_PAGINA && ultima ? ultima.creadoEn : null,
      miGuestId: quien.guestId,
    };
  },
);

/**
 * Borra una foto: la suya, o cualquiera si quien borra es la pareja.
 *
 * Se borra **también el fichero**. Una galería que deja las fotos en Storage
 * al borrarlas del listado es una promesa incumplida al invitado que se
 * arrepintió, y además se paga todos los meses.
 */
export const deletePhoto = onCall<{ photoId?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ ok: true }> => {
    const quien = await quienBorra(peticion);
    const photoId = typeof peticion.data?.photoId === 'string' ? peticion.data.photoId : '';
    if (photoId === '') throw new HttpsError('invalid-argument', 'Falta la foto.');

    const ref = db().doc(`weddings/${quien.weddingId}/photos/${photoId}`);
    const snap = await ref.get();
    if (!snap.exists) return { ok: true };

    const datos = snap.data() ?? {};
    const subidaPor = (datos['uploadedBy'] ?? {}) as Record<string, unknown>;
    const guestId = typeof subidaPor['guestId'] === 'string' ? subidaPor['guestId'] : '';

    if (!puedeBorrar({ guestId }, { guestId: quien.guestId, esPareja: quien.esPareja })) {
      throw new HttpsError('permission-denied', 'Esa foto no es tuya.');
    }

    await borrarFicheros([datos['storagePath'], datos['thumbPath']]);
    await ref.delete();

    return { ok: true };
  },
);

/** Vacía la galería entera. Solo la pareja, y con su confirmación delante. */
export const clearGallery = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ borradas: number }> => {
    const { weddingId } = exigirPareja(peticion);
    const base = db();

    const snap = await base.collection(`weddings/${weddingId}/photos`).get();
    if (snap.empty) return { borradas: 0 };

    await borrarFicheros(
      snap.docs.flatMap((d) => [d.data()['storagePath'], d.data()['thumbPath']]),
    );

    let lote = base.batch();
    let enElLote = 0;
    for (const documento of snap.docs) {
      lote.delete(documento.ref);
      enElLote += 1;
      if (enElLote >= 400) {
        await lote.commit();
        lote = base.batch();
        enElLote = 0;
      }
    }
    if (enElLote > 0) await lote.commit();

    return { borradas: snap.size };
  },
);

/**
 * Guarda un fichero y devuelve su URL con **token de descarga**.
 *
 * No se usa `makePublic()`, que es lo fácil: deja el objeto accesible para
 * siempre y no hay forma de revocarlo. Con el token, quitar el acceso a una
 * foto es cambiarle el token, y eso es lo que van a necesitar las audiencias
 * por grupo cuando lleguen. Las reglas de Storage siguen diciendo que no a
 * todo el mundo; el token es lo único que abre la puerta.
 */
async function guardar(
  ruta: string,
  base64: string,
  contentType: string,
): Promise<{ ruta: string; url: string }> {
  const token = randomUUID();
  const fichero = bucket().file(ruta);

  await fichero.save(Buffer.from(base64, 'base64'), {
    contentType,
    resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });

  const nombre = encodeURIComponent(ruta);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket().name}/o/${nombre}?alt=media&token=${token}`;

  return { ruta, url };
}

async function borrarFicheros(rutas: readonly unknown[]): Promise<void> {
  const reales = rutas.filter((ruta): ruta is string => typeof ruta === 'string' && ruta !== '');

  await Promise.all(
    reales.map(async (ruta) => {
      try {
        await bucket().file(ruta).delete({ ignoreNotFound: true });
      } catch (error) {
        // Que falle un borrado de Storage no puede dejar la foto en el
        // listado: lo que ve el invitado es Firestore. Se registra y se sigue.
        console.error('No se ha podido borrar el fichero', ruta, error);
      }
    }),
  );
}

/**
 * Quien mira puede ser un invitado o la pareja desde su panel.
 *
 * Son la misma consulta con dos filtros distintos, y por eso es una sola
 * invocable: duplicarla sería duplicar también el día que lleguen las
 * audiencias por grupo, que es justo donde no se puede tener dos versiones.
 */
async function quienMira(
  peticion: Parameters<typeof exigirInvitado>[0],
): Promise<{ weddingId: string; esPareja: boolean; guestId: string | null }> {
  if (peticion.auth?.token?.['role'] === 'owner') {
    return { weddingId: exigirPareja(peticion).weddingId, esPareja: true, guestId: null };
  }

  const invitado = exigirInvitado(peticion);
  exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));
  return { weddingId: invitado.weddingId, esPareja: false, guestId: invitado.guestId };
}

/** Quien borra puede ser el invitado dueño de la foto o la pareja. */
async function quienBorra(
  peticion: Parameters<typeof exigirInvitado>[0],
): Promise<{ weddingId: string; guestId: string | null; esPareja: boolean }> {
  const rol = peticion.auth?.token?.['role'];

  if (rol === 'owner') {
    const pareja = exigirPareja(peticion);
    return { weddingId: pareja.weddingId, guestId: null, esPareja: true };
  }

  const invitado = exigirInvitado(peticion);
  exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));
  return { weddingId: invitado.weddingId, guestId: invitado.guestId, esPareja: false };
}

function aFotoPublica(id: string, datos: Record<string, unknown>): FotoPublica {
  const subidaPor = (datos['uploadedBy'] ?? {}) as Record<string, unknown>;
  const creado = datos['createdAt'];

  return {
    id,
    url: typeof datos['url'] === 'string' ? datos['url'] : '',
    urlMiniatura: typeof datos['thumbUrl'] === 'string' ? datos['thumbUrl'] : '',
    guestId: typeof subidaPor['guestId'] === 'string' ? subidaPor['guestId'] : '',
    autor: typeof subidaPor['displayName'] === 'string' ? subidaPor['displayName'] : '',
    pie: typeof datos['caption'] === 'string' ? datos['caption'] : '',
    creadoEn: creado instanceof Timestamp ? creado.toDate().toISOString() : '',
  };
}
