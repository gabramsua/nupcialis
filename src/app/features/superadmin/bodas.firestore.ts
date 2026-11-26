/**
 * Lectura del listado de bodas para el superadmin.
 *
 * Frontera de confianza (D-19): lo que llega de Firestore es `unknown` hasta que
 * se comprueba aquí. Un `as BodaEnListado` es cómodo hasta el día en que una
 * boda antigua no tiene `setup` y la pantalla entera se cae por un campo.
 *
 * Las reglas ya restringen esta colección a `isSuperadmin()`; esto no es la
 * seguridad, es la forma.
 */

import { inject } from '@angular/core';
import { Timestamp, collection, getDocs, query } from 'firebase/firestore';

import { FIRESTORE } from '../../core/firebase/firestore.providers';
import type { BodaEnListado, EstadoBoda, EstadoDominio, NombresPareja, Plan } from './bodas';

export interface FuenteBodas {
  listar(): Promise<readonly BodaEnListado[]>;
}

export function crearFuenteBodasFirestore(): FuenteBodas {
  const db = inject(FIRESTORE);

  return {
    async listar(): Promise<readonly BodaEnListado[]> {
      const snap = await getDocs(query(collection(db, 'weddings')));
      return snap.docs.map((doc) => desdeDocumento(doc.id, doc.data()));
    },
  };
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function entero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0, Math.floor(valor)) : 0;
}

function estado(valor: unknown): EstadoBoda {
  // Ante un estado que no reconocemos, borrador: es el que menos promete.
  return valor === 'active' || valor === 'archived' ? valor : 'draft';
}

function plan(valor: unknown): Plan {
  return valor === 'extended' ? 'extended' : 'basic';
}

/**
 * Un `setup` ausente cuenta como pendiente, no como correcto.
 *
 * Es deliberado: las bodas dadas de alta antes de que existiera este campo no
 * pasaron por el alta del subdominio, así que no podemos afirmar que esté
 * hecho. Fallar hacia "revísalo" cuesta una comprobación; fallar hacia "todo
 * bien" cuesta una pareja que no puede entrar en su boda.
 */
function dominio(valor: unknown): EstadoDominio {
  if (valor === null || typeof valor !== 'object') return 'pending';
  return (valor as Record<string, unknown>)['authDomain'] === 'ok' ? 'ok' : 'pending';
}

function fecha(valor: unknown): Date | null {
  return valor instanceof Timestamp ? valor.toDate() : null;
}

function nombres(valor: unknown): NombresPareja {
  const pareja =
    valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
  return { partnerA: texto(pareja['partnerA']), partnerB: texto(pareja['partnerB']) };
}

function desdeDocumento(weddingId: string, datos: Record<string, unknown>): BodaEnListado {
  const counters =
    datos['counters'] !== null && typeof datos['counters'] === 'object'
      ? (datos['counters'] as Record<string, unknown>)
      : {};

  return {
    weddingId,
    slug: texto(datos['slug']),
    status: estado(datos['status']),
    plan: plan(datos['plan']),
    pareja: nombres(datos['couple']),
    weddingDate: fecha(datos['weddingDate']),
    invitados: entero(counters['guestsTotal']),
    confirmados: entero(counters['guestsConfirmed']),
    authDomain: dominio(datos['setup']),
  };
}
