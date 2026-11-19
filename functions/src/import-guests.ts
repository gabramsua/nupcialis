/**
 * Importar una lista de invitados de una vez.
 *
 * **La previsualización y la importación son la misma llamada**, con una
 * bandera. No es ahorro de código: es que lo que la pareja ve antes de
 * confirmar tiene que ser exactamente lo que va a pasar. Dos caminos distintos
 * se separan en cuanto alguien toca uno, y entonces la previsualización empieza
 * a mentir sin que nadie se entere hasta que faltan invitados.
 *
 * El cliente manda las filas ya mapeadas a campos —él sabe qué columna del
 * Excel era el teléfono—, pero **no valida nada**: quien decide qué entra es
 * esta función, con el mismo `validarInvitado` que el alta de uno en uno.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { colorLibre } from './dominio/grupos';
import { MAX_FILAS, planificarImportacion, type EntradaImportada } from './dominio/importacion';
import { normalizarNombre, type Existente } from './dominio/invitados';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { leerGrupos } from './groups';
import { exigirPareja } from './infra/permisos';

/** Tope de escrituras por lote en Firestore. */
const POR_LOTE = 400;

export interface EntradaImportacion {
  readonly filas?: unknown;
  readonly soloPrevisualizar?: unknown;
  readonly forzarDuplicados?: unknown;
}

export const importGuests = onCall<EntradaImportacion>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId, uid } = exigirPareja(peticion);

    const crudas = peticion.data?.filas;
    if (!Array.isArray(crudas)) {
      throw new HttpsError('invalid-argument', 'Falta la lista de invitados.');
    }
    if (crudas.length > MAX_FILAS) {
      throw new HttpsError('invalid-argument', `El máximo por fichero son ${MAX_FILAS} filas.`);
    }

    const filas = crudas.filter((f): f is EntradaImportada => f !== null && typeof f === 'object');

    const coleccion = db().collection(`weddings/${weddingId}/guests`);
    const yaEstanSnap = await coleccion.get();

    const yaEstan: Existente[] = yaEstanSnap.docs.map((d) => {
      const datos = d.data();
      return {
        id: d.id,
        phone: typeof datos['phone'] === 'string' ? datos['phone'] : null,
        normalizedName: typeof datos['normalizedName'] === 'string' ? datos['normalizedName'] : '',
      };
    });

    const grupos = await leerGrupos(db(), weddingId);

    const plan = planificarImportacion(filas, yaEstan, {
      forzarDuplicados: peticion.data?.forzarDuplicados === true,
      grupos,
    });

    const soloMirar = peticion.data?.soloPrevisualizar === true;
    const entran = plan.filas.filter((f) => f.estado === 'nuevo' && f.datos !== null);

    if (!soloMirar && entran.length > 0) {
      // Primero los grupos nuevos, y con su id real sustituyendo al provisional
      // en las filas. Al revés, un fallo entre medias deja invitados apuntando
      // a grupos que no existen.
      const idReal = new Map<string, string>();
      if (plan.gruposNuevos.length > 0) {
        const lote = db().batch();
        const gruposCol = db().collection(`weddings/${weddingId}/guestGroups`);
        let orden = grupos.reduce((max, g) => Math.max(max, g.order), -1);
        const usados: (string | undefined)[] = grupos.map((g) => g.color);

        for (const nuevo of plan.gruposNuevos) {
          const ref = gruposCol.doc();
          const color = colorLibre(usados);
          usados.push(color);
          idReal.set(nuevo.id, ref.id);

          lote.create(ref, {
            name: nuevo.name,
            normalizedName: normalizarNombre(nuevo.name),
            side: 'both',
            // Públicos siempre: restringir decide quién ve qué fotos, y eso no
            // se decide con una celda de un Excel.
            photoAudience: 'public',
            allowPublicOptIn: false,
            color,
            order: ++orden,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        await lote.commit();
      }

      // Por lotes: Firestore no admite escrituras ilimitadas en uno solo, y una
      // importación de mil invitados son mil escrituras.
      for (let desde = 0; desde < entran.length; desde += POR_LOTE) {
        const lote = db().batch();

        for (const fila of entran.slice(desde, desde + POR_LOTE)) {
          lote.create(coleccion.doc(), {
            ...fila.datos,
            groupIds: (fila.datos?.groupIds ?? []).map((id) => idReal.get(id) ?? id),
            isCompanion: false,
            invitedById: null,
            addedBy: 'owner',
            rsvpStatus: 'pending',
            rsvpAt: null,
            rsvpAnswers: {},
            menu: '',
            allergies: '',
            tableId: null,
            active: true,
            loginCount: 0,
            firstLoginAt: null,
            lastLoginAt: null,
            quizPlayCount: 0,
            quizBestPoints: null,
            isOwnerGuest: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        await lote.commit();
      }

      // Cuántos, no quiénes: el log lo lee el superadmin y no tiene por qué
      // llevarse los nombres de los invitados de cada boda.
      await auditar({
        actorUid: uid,
        actorRole: 'owner',
        action: 'importGuests',
        weddingId,
        payload: {
          importados: entran.length,
          gruposCreados: plan.gruposNuevos.length,
          ...plan.resumen,
        },
      });
    }

    return {
      // Sin `datos`: la pantalla necesita saber qué pasa con cada fila, no el
      // documento entero que se va a escribir. Con mil filas, mandarlo
      // multiplicaría por cinco lo que viaja para pintar una tabla.
      filas: plan.filas.map((fila) => sinDatos(fila)),
      resumen: plan.resumen,
      // Solo los nombres: el id provisional no le dice nada a la pantalla.
      gruposNuevos: plan.gruposNuevos.map((g) => g.name),
      importados: soloMirar ? 0 : entran.length,
      previsualizacion: soloMirar,
    };
  },
);

/**
 * Una fila sin el documento que se va a escribir.
 *
 * La pantalla necesita saber qué pasa con cada fila, no el documento entero.
 * Con mil filas, mandarlo multiplicaría por cinco lo que viaja para pintar una
 * tabla.
 */
function sinDatos<T extends { datos?: unknown }>(fila: T): Omit<T, 'datos'> {
  const copia = { ...fila };
  delete copia.datos;
  return copia;
}
