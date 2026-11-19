/**
 * Los alojamientos, escritos por la pareja desde su panel.
 *
 * Por Firestore directamente, como las preguntas frecuentes y la cronología: lo
 * que se publica lo decide el trigger de la proyección, que sanea y filtra.
 *
 * Frontera de confianza (D-19): lo que vuelve de Firestore se comprueba antes
 * de salir de aquí.
 */

import { inject } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import {
  ordenarAlojamientos,
  type AlojamientoDelPanel,
  type DatosAlojamiento,
  type FalloAlojamientos,
  type PuertaAlojamientos,
  type ResultadoAlojamientos,
  type ResultadoEscrituraAlojamiento,
} from '../alojamientos/alojamientos-gateway';
import {
  esTipoAlojamiento,
  fechaLimiteValida,
} from '../../features/public-site/alojamientos/alojamientos';
import { FIRESTORE } from './firestore.providers';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function aAlojamiento(id: string, datos: Record<string, unknown>): AlojamientoDelPanel {
  const tipo = datos['category'];

  return {
    id,
    name: texto(datos['name']),
    category: esTipoAlojamiento(tipo) ? tipo : 'otro',
    description: texto(datos['description']),
    pricePerNight: numero(datos['pricePerNight']),
    distanceKm: numero(datos['distanceKm']),
    phone: typeof datos['phone'] === 'string' ? datos['phone'] : null,
    website: typeof datos['website'] === 'string' ? datos['website'] : null,
    discountCode: texto(datos['discountCode']),
    blockedRooms: numero(datos['blockedRooms']),
    bookingDeadline: fechaLimiteValida(datos['bookingDeadline']),
    recommended: datos['recommended'] === true,
    order: numero(datos['order']) ?? 0,
    // Ausente es activo, igual que en el servidor.
    enabled: datos['enabled'] !== false,
  };
}

/** El id de documento de una ficha nueva, legible y derivado del nombre. */
export function idDeAlojamiento(name: string, usados: readonly string[]): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'alojamiento';

  if (!usados.includes(base)) return base;

  for (let n = 2; n < 100; n++) {
    const probando = `${base}-${n}`;
    if (!usados.includes(probando)) return probando;
  }

  return `${base}-${Date.now()}`;
}

export function crearPuertaAlojamientosFirestore(): PuertaAlojamientos {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'accommodations');

  return {
    async listar(weddingId: string): Promise<ResultadoAlojamientos> {
      try {
        const snap = await getDocs(ruta(weddingId));
        return {
          ok: true,
          alojamientos: ordenarAlojamientos(snap.docs.map((d) => aAlojamiento(d.id, d.data()))),
        };
      } catch (error) {
        return { ok: false, fallo: traducirAlojamiento(error) };
      }
    },

    async guardar(
      weddingId: string,
      datos: DatosAlojamiento,
    ): Promise<ResultadoEscrituraAlojamiento> {
      try {
        const campos = {
          name: datos.name,
          category: datos.category,
          description: datos.description,
          pricePerNight: datos.pricePerNight,
          distanceKm: datos.distanceKm,
          phone: datos.phone,
          website: datos.website,
          discountCode: datos.discountCode,
          blockedRooms: datos.blockedRooms,
          bookingDeadline: datos.bookingDeadline,
          recommended: datos.recommended,
          order: datos.order,
          enabled: datos.enabled,
          // Para enlazar con el mapa (§8.6), que todavía no existe.
          locationId: null,
        };

        if (datos.id) {
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          const snap = await getDocs(ruta(weddingId));
          const id = idDeAlojamiento(
            datos.name,
            snap.docs.map((d) => d.id),
          );
          await setDoc(doc(ruta(weddingId), id), campos);
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirAlojamiento(error) };
      }
    },

    async borrar(weddingId: string, id: string): Promise<ResultadoEscrituraAlojamiento> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirAlojamiento(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirAlojamiento(error: unknown): FalloAlojamientos {
  const fallo = (error ?? {}) as { code?: string; message?: string };

  switch (fallo.code) {
    case 'unavailable':
    case 'deadline-exceeded':
      return { tipo: 'red' };

    case 'permission-denied':
    case 'unauthenticated':
      return { tipo: 'sin-permiso' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
