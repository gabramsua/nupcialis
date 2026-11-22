/**
 * La cronología del día, escrita por la pareja desde su panel.
 *
 * Por Firestore directamente, no por función: las reglas dejan a la pareja
 * escribir en `timelineEvents` de su boda y no hay ninguna invariante que
 * necesite mirar otra colección. Lo que se publica lo decide el trigger de la
 * proyección, que se queda solo con lo visible para invitados.
 *
 * Frontera de confianza (D-19): lo que vuelve de Firestore se comprueba antes
 * de salir de aquí.
 */

import { inject } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import {
  type DatosHito,
  type FalloCronologia,
  type HitoDelPanel,
  type PuertaCronologia,
  type ResultadoCronologia,
  type ResultadoEscrituraHito,
} from '../cronologia/cronologia-gateway';
import {
  esColorHito,
  esIconoHito,
  minutosDelDia,
} from '../../features/public-site/cronologia/cronologia';
import { FIRESTORE } from './firestore.providers';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function hora(valor: unknown): string | null {
  return minutosDelDia(valor) === null ? null : (valor as string).trim();
}

function idDeUbicacion(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}

function aHito(id: string, datos: Record<string, unknown>): HitoDelPanel {
  const icono = datos['icon'];
  const color = datos['color'];

  return {
    id,
    time: hora(datos['time']) ?? '',
    endTime: hora(datos['endTime']),
    title: texto(datos['title']),
    description: texto(datos['description']),
    icon: esIconoHito(icono) ? icono : 'clock',
    color: esColorHito(color) ? color : 'rosa',
    locationId: idDeUbicacion(datos['locationId']),
    order: typeof datos['order'] === 'number' ? datos['order'] : 0,
    // Ausente es visible, igual que en el servidor: lo interno se marca.
    visibleToGuests: datos['visibleToGuests'] !== false,
  };
}

/**
 * El orden es la hora, y los que no la tienen van al final.
 *
 * Un hito sin hora válida no se publica, pero en el panel sí se ve: es el que
 * la pareja está escribiendo, y esconderlo sería perderlo.
 */
export function ordenarHitos(hitos: readonly HitoDelPanel[]): readonly HitoDelPanel[] {
  return hitos.slice().sort((a, b) => {
    const minutosA = minutosDelDia(a.time);
    const minutosB = minutosDelDia(b.time);
    if (minutosA === null) return minutosB === null ? a.id.localeCompare(b.id) : 1;
    if (minutosB === null) return -1;
    return minutosA - minutosB || a.id.localeCompare(b.id);
  });
}

/** El id de documento de un hito nuevo, legible y derivado del título. */
export function idDeHito(title: string, usados: readonly string[]): string {
  const base =
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'hito';

  if (!usados.includes(base)) return base;

  for (let n = 2; n < 100; n++) {
    const probando = `${base}-${n}`;
    if (!usados.includes(probando)) return probando;
  }

  return `${base}-${Date.now()}`;
}

export function crearPuertaCronologiaFirestore(): PuertaCronologia {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'timelineEvents');

  return {
    async listar(weddingId: string): Promise<ResultadoCronologia> {
      try {
        const snap = await getDocs(ruta(weddingId));
        return { ok: true, hitos: ordenarHitos(snap.docs.map((d) => aHito(d.id, d.data()))) };
      } catch (error) {
        return { ok: false, fallo: traducirHito(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosHito): Promise<ResultadoEscrituraHito> {
      try {
        const campos = {
          time: datos.time,
          endTime: datos.endTime,
          title: datos.title,
          description: datos.description,
          icon: datos.icon,
          color: datos.color,
          order: datos.order,
          visibleToGuests: datos.visibleToGuests,
          // La ubicación del mapa donde es (§8.6), o `null`.
          locationId: datos.locationId,
        };

        if (datos.id) {
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          const snap = await getDocs(ruta(weddingId));
          const id = idDeHito(
            datos.title,
            snap.docs.map((d) => d.id),
          );
          await setDoc(doc(ruta(weddingId), id), campos);
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirHito(error) };
      }
    },

    async borrar(weddingId: string, id: string): Promise<ResultadoEscrituraHito> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirHito(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirHito(error: unknown): FalloCronologia {
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
