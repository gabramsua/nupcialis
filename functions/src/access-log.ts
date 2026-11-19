/**
 * `listAccessLog`: quién ha entrado en la web de la boda, y desde dónde.
 *
 * Los datos ya se escribían desde el primer día —`guestAccessLog` lo llena
 * cada entrada concedida—, pero no se veían en ninguna parte. La pareja
 * necesita dos cosas de aquí:
 *
 * 1. **Saber si han abierto la invitación.** «¿Le habrá llegado a mi tía?» se
 *    contesta mirando esto, no llamándola.
 * 2. **Enterarse de que un enlace se ha reenviado.** Desde D-34 el enlace
 *    entra solo, así que el primo que lo pasa al grupo de la familia convierte
 *    a doce personas en el mismo invitado. Eso se nota aquí: la misma
 *    invitación abriéndose desde un iPhone, un Android y un Windows.
 *
 * Qué **no** sale de aquí:
 *
 * - **La IP.** Se guarda, porque es lo que sostiene el límite de intentos, pero
 *   no sube a ninguna pantalla: no le dice nada a la pareja y es un dato más
 *   del invitado del que responder (§9.4).
 * - **El `user-agent` entero.** Baja a «Android · Chrome» en el servidor. Ver
 *   `dominio/dispositivo.ts`.
 *
 * Solo la pareja, y solo de su boda: el `weddingId` sale del claim (regla 1).
 * Y los nombres se resuelven **aquí**, porque `guests` está cerrada a lectura
 * directa (regla 2) y el log solo guarda el `guestId`.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';

import { dispositivoDe } from './dominio/dispositivo';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { exigirPareja } from './infra/permisos';

/**
 * Cuántas entradas se devuelven.
 *
 * Una boda de trescientos invitados que entran cuatro veces cada uno son mil
 * doscientas líneas. Ni caben en una pantalla ni hay quien las lea: lo que la
 * pareja mira es lo último que ha pasado. El resto sigue en Firestore.
 */
export const MAXIMO = 300;

export interface EntradaDeAcceso {
  readonly id: string;
  readonly guestId: string;
  /** Vacío si el invitado ya no existe: se borró después de entrar. */
  readonly nombre: string;
  readonly mote: string;
  /** Cómo entró: `enlace`, `name_phone4`, `phone`… */
  readonly modo: string;
  /** «Android · Chrome», o vacío si el navegador no se dejó reconocer. */
  readonly dispositivo: string;
  /** Cuándo, en ISO. Nunca `null`: una entrada sin fecha no se devuelve. */
  readonly cuando: string;
}

export const listAccessLog = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId } = exigirPareja(peticion);
    const base = db();

    const registro = await base
      .collection(`weddings/${weddingId}/guestAccessLog`)
      .orderBy('createdAt', 'desc')
      .limit(MAXIMO)
      .get();

    const crudas = registro.docs.flatMap((d) => {
      const e = d.data();
      const cuando = e['createdAt'];
      const guestId = e['guestId'];

      // Sin fecha no hay nada que ordenar ni que enseñar, y sin invitado no se
      // sabe de quién es. Las dos cosas solo pasan si algo escribió mal ahí.
      if (!(cuando instanceof Timestamp) || typeof guestId !== 'string' || guestId === '') {
        return [];
      }

      return [
        {
          id: d.id,
          guestId,
          modo: typeof e['mode'] === 'string' ? e['mode'] : '',
          dispositivo: dispositivoDe(e['userAgent']),
          cuando: cuando.toDate().toISOString(),
        },
      ];
    });

    const nombres = await nombresDe(weddingId, [...new Set(crudas.map((e) => e.guestId))]);

    const entradas: EntradaDeAcceso[] = crudas.map((e) => ({
      ...e,
      nombre: nombres.get(e.guestId)?.nombre ?? '',
      mote: nombres.get(e.guestId)?.mote ?? '',
    }));

    return { entradas, tope: MAXIMO };
  },
);

interface NombreDeInvitado {
  readonly nombre: string;
  readonly mote: string;
}

/**
 * Los nombres de los invitados que salen en el registro, de una tacada.
 *
 * `getAll` en vez de una lectura por línea: trescientas entradas de cincuenta
 * invitados son cincuenta lecturas, no trescientas.
 */
async function nombresDe(
  weddingId: string,
  guestIds: readonly string[],
): Promise<Map<string, NombreDeInvitado>> {
  const nombres = new Map<string, NombreDeInvitado>();
  if (guestIds.length === 0) return nombres;

  const base = db();
  const refs = guestIds.map((id) => base.doc(`weddings/${weddingId}/guests/${id}`));
  const documentos = await base.getAll(...refs);

  for (const documento of documentos) {
    const g = documento.data();
    if (!g) continue;

    nombres.set(documento.id, {
      nombre: typeof g['fullName'] === 'string' ? g['fullName'] : '',
      mote: typeof g['nickname'] === 'string' ? g['nickname'] : '',
    });
  }

  return nombres;
}
