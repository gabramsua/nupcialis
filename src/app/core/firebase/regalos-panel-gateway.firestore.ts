/**
 * La lista de regalos, escrita por la pareja desde su panel.
 *
 * Por Firestore directamente, como los alojamientos: la colección es suya y
 * las reglas la cierran a todo el que no sea la pareja. Lo que **no** se
 * escribe nunca desde aquí es `reservedBy`: eso lo lleva `reserveGift` en
 * transacción, y pisarlo con un `updateDoc` sería soltarle a alguien el
 * regalo que tenía cogido sin que se entere.
 *
 * Frontera de confianza (D-19): lo que vuelve se comprueba antes de salir.
 */

import { inject } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import {
  ordenarRegalos,
  type DatosRegalo,
  type FalloRegalosPanel,
  type PuertaRegalosPanel,
  type RegaloDelPanel,
  type ResultadoEscrituraRegalo,
  type ResultadoRegalosPanel,
} from '../regalos/regalos-panel-gateway';
import { FIRESTORE } from './firestore.providers';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function aRegalo(id: string, datos: Record<string, unknown>): RegaloDelPanel {
  const cogido = datos['reservedBy'];

  return {
    id,
    titulo: texto(datos['titulo']),
    descripcion: texto(datos['descripcion']),
    precio: numero(datos['precio']),
    enlace: typeof datos['enlace'] === 'string' ? datos['enlace'] : null,
    imagen: typeof datos['imagen'] === 'string' ? datos['imagen'] : null,
    // Solo si lo han cogido, nunca quién: la pareja no necesita el id para
    // nada y esta pantalla no es el sitio donde empezar a guardarlo.
    reservado: typeof cogido === 'string' && cogido !== '',
    order: numero(datos['order']) ?? 0,
    enabled: datos['enabled'] !== false,
  };
}

/** El id de documento de un regalo nuevo, legible y derivado del título. */
export function idDeRegalo(titulo: string, usados: readonly string[]): string {
  const base =
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'regalo';

  if (!usados.includes(base)) return base;

  for (let n = 2; n < 100; n++) {
    const probando = `${base}-${n}`;
    if (!usados.includes(probando)) return probando;
  }

  return `${base}-${Date.now()}`;
}

export function crearPuertaRegalosPanelFirestore(): PuertaRegalosPanel {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'gifts');

  return {
    async listar(weddingId: string): Promise<ResultadoRegalosPanel> {
      try {
        const snap = await getDocs(ruta(weddingId));
        return { ok: true, regalos: ordenarRegalos(snap.docs.map((d) => aRegalo(d.id, d.data()))) };
      } catch (error) {
        return { ok: false, fallo: traducirRegaloPanel(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosRegalo): Promise<ResultadoEscrituraRegalo> {
      try {
        const campos = {
          titulo: datos.titulo,
          descripcion: datos.descripcion,
          precio: datos.precio,
          enlace: datos.enlace,
          imagen: datos.imagen,
          order: datos.order,
          enabled: datos.enabled,
        };

        if (datos.id) {
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          const snap = await getDocs(ruta(weddingId));
          const id = idDeRegalo(
            datos.titulo,
            snap.docs.map((d) => d.id),
          );
          // En alta sí se escribe `reservedBy`, a `null`: un regalo nuevo no
          // lo tiene cogido nadie y así el documento nace con todos sus campos.
          await setDoc(doc(ruta(weddingId), id), { ...campos, reservedBy: null, reservedAt: null });
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirRegaloPanel(error) };
      }
    },

    async borrar(weddingId: string, id: string): Promise<ResultadoEscrituraRegalo> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirRegaloPanel(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirRegaloPanel(error: unknown): FalloRegalosPanel {
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
