/**
 * Las estadísticas del superadmin (§8.18).
 *
 * **COPIA LITERAL** de `src/app/features/superadmin/estadisticas/estadisticas.ts`.
 * Si tocas una, toca la otra: lo vigila su `.spec.ts`.
 *
 * Lo que se decide sin red: cómo se suman las bodas, cuándo una galería está
 * «cerca» de su tope y qué es un tope válido.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

/** Cuántas bodas se miden de una vez: cada una son tres conteos en Firestore. */
export const MAX_BODAS_EN_ESTADISTICAS = 200;

/**
 * Lo que pesa una foto, grande y miniatura, de media (D-39: 500 fotos son unos
 * 150 MB). Es una **estimación**: las fotos no guardan su peso, y la pantalla
 * lo dice así. Si algún día hace falta el dato exacto, se guarda al subir.
 */
export const MEGAS_POR_FOTO = 0.3;

/** El rango en el que el superadmin puede fijar el tope de fotos de una boda. */
export const MIN_TOPE_FOTOS = 1;
export const MAX_TOPE_FOTOS = 5000;

export type EstadoDeBoda = 'draft' | 'active' | 'archived';

/** Una boda en las estadísticas. */
export interface FilaDeBoda {
  readonly weddingId: string;
  readonly slug: string;
  readonly status: EstadoDeBoda;
  readonly plan: string;
  readonly invitados: number;
  readonly confirmados: number;
  readonly fotos: number;
  /** El tope que rige: el suyo, o el de por defecto. */
  readonly tope: number;
  /** `true` si el tope lo ha puesto el superadmin, `false` si es el de por defecto. */
  readonly topeEsPropio: boolean;
  readonly partidasQuiz: number;
  readonly accesos: number;
  /** Cuándo se dio de alta, en ISO, o `null` si la boda es anterior al campo. */
  readonly creadaEn: string | null;
}

export interface Resumen {
  readonly bodasActivas: number;
  readonly bodasBorrador: number;
  readonly bodasArchivadas: number;
  readonly altasDelMes: number;
  readonly invitados: number;
  readonly fotos: number;
  readonly almacenamientoMB: number;
  readonly partidasQuiz: number;
  readonly accesosInvitados: number;
}

export interface Estadisticas {
  readonly resumen: Resumen;
  readonly bodas: readonly FilaDeBoda[];
  /** `true` si hay más bodas que `MAX_BODAS_EN_ESTADISTICAS` y se han medido solo las primeras. */
  readonly recortado: boolean;
}

/**
 * Los totales a partir de las filas.
 *
 * «Alta del mes» es el mes natural **en UTC**: es la cuenta que se puede
 * reproducir con una consulta; una boda dada de alta a las 00:30 del día uno en
 * Madrid cuenta en el mes anterior, y a efectos de métricas no importa.
 */
export function resumir(filas: readonly FilaDeBoda[], ahora: Date): Resumen {
  const mes = ahora.toISOString().slice(0, 7);
  const suma = (campo: 'invitados' | 'fotos' | 'partidasQuiz' | 'accesos') =>
    filas.reduce((total, fila) => total + fila[campo], 0);
  const fotos = suma('fotos');

  return {
    bodasActivas: filas.filter((f) => f.status === 'active').length,
    bodasBorrador: filas.filter((f) => f.status === 'draft').length,
    bodasArchivadas: filas.filter((f) => f.status === 'archived').length,
    altasDelMes: filas.filter((f) => f.creadaEn !== null && f.creadaEn.slice(0, 7) === mes).length,
    invitados: suma('invitados'),
    fotos,
    almacenamientoMB: Math.round(fotos * MEGAS_POR_FOTO * 10) / 10,
    partidasQuiz: suma('partidasQuiz'),
    accesosInvitados: suma('accesos'),
  };
}

export type NivelDeUso = 'ok' | 'cerca' | 'llena';

/**
 * Cuánto de su tope ha gastado una boda, para pintarlo con color **y** texto.
 *
 * «Cerca» desde el 80 %: es cuando todavía se puede subir el tope antes de que
 * un invitado se encuentre con «la galería está llena» el día de la boda.
 */
export function usoDeFotos(
  fotos: number,
  tope: number,
): { readonly porcentaje: number; readonly nivel: NivelDeUso } {
  const porcentaje = tope > 0 ? Math.min(100, Math.round((fotos / tope) * 100)) : 100;
  const nivel: NivelDeUso = fotos >= tope ? 'llena' : porcentaje >= 80 ? 'cerca' : 'ok';
  return { porcentaje, nivel };
}

export type TopeValido =
  /** `valor: null` es «volver al tope por defecto». */
  { readonly ok: true; readonly valor: number | null } | { readonly ok: false };

/** Lo que el superadmin escribe como tope: un entero en rango, o `null` para el de por defecto. */
export function validarTopeDeFotos(valor: unknown): TopeValido {
  if (valor === null) return { ok: true, valor: null };
  if (typeof valor !== 'number' || !Number.isInteger(valor)) return { ok: false };
  if (valor < MIN_TOPE_FOTOS || valor > MAX_TOPE_FOTOS) return { ok: false };
  return { ok: true, valor };
}

function entero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0, Math.floor(valor)) : 0;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function estadoDeBoda(valor: unknown): EstadoDeBoda {
  // Ante un estado desconocido, borrador: es el que menos promete.
  return valor === 'active' || valor === 'archived' ? valor : 'draft';
}

/** Lo que vuelve del servidor, comprobado antes de pintarlo (D-19). */
export function leerEstadisticas(valor: unknown): Estadisticas | null {
  if (valor === null || typeof valor !== 'object') return null;
  const v = valor as Record<string, unknown>;
  if (!Array.isArray(v['bodas'])) return null;

  const bodas: FilaDeBoda[] = [];
  const vistas = new Set<string>();

  for (const crudo of v['bodas']) {
    if (crudo === null || typeof crudo !== 'object') continue;
    const f = crudo as Record<string, unknown>;

    const weddingId = texto(f['weddingId']);
    if (weddingId === '' || vistas.has(weddingId)) continue;
    vistas.add(weddingId);

    const tope = entero(f['tope']);
    bodas.push({
      weddingId,
      slug: texto(f['slug']),
      status: estadoDeBoda(f['status']),
      plan: texto(f['plan']),
      invitados: entero(f['invitados']),
      confirmados: entero(f['confirmados']),
      fotos: entero(f['fotos']),
      tope: tope > 0 ? tope : 1,
      topeEsPropio: f['topeEsPropio'] === true,
      partidasQuiz: entero(f['partidasQuiz']),
      accesos: entero(f['accesos']),
      creadaEn: typeof f['creadaEn'] === 'string' ? f['creadaEn'] : null,
    });
  }

  // El resumen se recalcula con las filas ya saneadas: lo que se pinta arriba
  // y lo que se pinta en la tabla no pueden discrepar.
  return { resumen: resumir(bodas, new Date()), bodas, recortado: v['recortado'] === true };
}
