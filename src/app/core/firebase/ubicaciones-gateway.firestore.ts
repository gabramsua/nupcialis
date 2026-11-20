/**
 * Las ubicaciones del mapa, escritas por la pareja desde su panel.
 *
 * Por Firestore directamente, como los alojamientos: lo que se publica lo
 * decide el trigger de la proyección, que filtra lo interno y lo que no tiene
 * coordenadas de verdad.
 *
 * Frontera de confianza (D-19): lo que vuelve de Firestore se comprueba antes
 * de salir de aquí.
 */

import { inject } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import {
  ordenarUbicaciones,
  type DatosUbicacion,
  type FalloUbicaciones,
  type PuertaUbicaciones,
  type ResultadoEscrituraUbicacion,
  type ResultadoUbicaciones,
  type UbicacionDelPanel,
} from '../mapa/ubicaciones-gateway';
import {
  coordenadasValidas,
  esTipoUbicacion,
  horaDelSitio,
} from '../../features/public-site/mapa/ubicaciones';
import { FIRESTORE } from './firestore.providers';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function aUbicacion(id: string, datos: Record<string, unknown>): UbicacionDelPanel {
  const coords = (datos['coords'] ?? {}) as Record<string, unknown>;
  const conPin = coordenadasValidas(coords['lat'], coords['lng']);

  return {
    id,
    type: esTipoUbicacion(datos['type']) ? datos['type'] : 'otro',
    name: texto(datos['name']),
    address: texto(datos['address']),
    lat: conPin ? (coords['lat'] as number) : null,
    lng: conPin ? (coords['lng'] as number) : null,
    description: texto(datos['description']),
    time: horaDelSitio(datos['time']),
    order:
      typeof datos['order'] === 'number' && Number.isFinite(datos['order']) ? datos['order'] : 0,
    // Ausente es visible, igual que en el servidor.
    visibleToGuests: datos['visibleToGuests'] !== false,
  };
}

/** El id de documento de una ficha nueva, legible y derivado del nombre. */
export function idDeUbicacion(name: string, usados: readonly string[]): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'sitio';

  if (!usados.includes(base)) return base;

  for (let n = 2; n < 100; n++) {
    const probando = `${base}-${n}`;
    if (!usados.includes(probando)) return probando;
  }

  return `${base}-${Date.now()}`;
}

export function crearPuertaUbicacionesFirestore(): PuertaUbicaciones {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'locations');

  return {
    async listar(weddingId: string): Promise<ResultadoUbicaciones> {
      try {
        const snap = await getDocs(ruta(weddingId));
        return {
          ok: true,
          ubicaciones: ordenarUbicaciones(snap.docs.map((d) => aUbicacion(d.id, d.data()))),
        };
      } catch (error) {
        return { ok: false, fallo: traducirUbicacion(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosUbicacion): Promise<ResultadoEscrituraUbicacion> {
      try {
        const campos = {
          type: datos.type,
          name: datos.name,
          address: datos.address,
          // Sin pin, `coords` se escribe vacío: el servidor lo trata como «sin
          // colocar» y no lo publica.
          coords:
            datos.lat !== null && datos.lng !== null ? { lat: datos.lat, lng: datos.lng } : null,
          description: datos.description,
          time: datos.time,
          order: datos.order,
          visibleToGuests: datos.visibleToGuests,
          icon: '',
        };

        if (datos.id) {
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          const snap = await getDocs(ruta(weddingId));
          const id = idDeUbicacion(
            datos.name,
            snap.docs.map((d) => d.id),
          );
          await setDoc(doc(ruta(weddingId), id), campos);
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirUbicacion(error) };
      }
    },

    async borrar(weddingId: string, id: string): Promise<ResultadoEscrituraUbicacion> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirUbicacion(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirUbicacion(error: unknown): FalloUbicaciones {
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
