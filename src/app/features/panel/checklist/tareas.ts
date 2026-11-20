/**
 * Las tareas de la pareja (§8.17), sin red ni Angular.
 *
 * Aquí se decide lo que la pantalla enseña con color: **en qué estado está cada
 * tarea** y cómo se agrupan. El estado no se guarda —en el documento solo hay
 * `done` y una fecha—, se calcula contra «hoy». Guardarlo sería tener que
 * actualizarlo cada medianoche, y una tarea que ayer era «esta semana» y hoy
 * «vencida» no es un cambio que nadie haya hecho.
 */

import { NP_ICON_LABELS } from '../../../design-system/icons/icon-name.generated';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';

export const MAX_TITULO_TAREA = 120;
export const MAX_DESCRIPCION_TAREA = 500;
export const MAX_CATEGORIA_TAREA = 40;
/** Un tope de cordura: una lista de trescientas tareas ya no la mira nadie. */
export const MAX_TAREAS = 300;

/** Las categorías de la plantilla. La pareja puede escribir otras. */
export const CATEGORIAS_BASE = ['Lugar', 'Proveedores', 'Novios', 'Invitados', 'El día'] as const;

export const ICONO_POR_DEFECTO: NpIconName = 'list-checks';

/** `A` y `B` son los dos de la pareja, como en el resto del panel. */
export type Responsable = 'A' | 'B' | 'both';
export const RESPONSABLES: readonly Responsable[] = ['A', 'B', 'both'];

export type Prioridad = 'low' | 'normal' | 'high';
export const PRIORIDADES: readonly Prioridad[] = ['low', 'normal', 'high'];

export interface TareaDelPanel {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  /** Día límite, o `null` si no lo tiene. Siempre medianoche UTC del día. */
  readonly dueDate: Date | null;
  readonly done: boolean;
  readonly doneAt: Date | null;
  /** Quién la marcó como hecha (uid y correo de su sesión). `null` si no está hecha o es anterior a D-47. */
  readonly doneByUid: string | null;
  readonly doneByEmail: string | null;
  readonly assignedTo: Responsable;
  /** Enlaces a proveedores y presupuesto (F4): hoy solo se conservan. */
  readonly vendorId: string | null;
  readonly budgetItemId: string | null;
  readonly priority: Prioridad;
  readonly icon: NpIconName;
  readonly order: number;
}

export type EstadoDeTarea = 'hecha' | 'vencida' | 'esta-semana' | 'proxima' | 'sin-fecha';

/** El orden en que se leen: lo que quema, primero; lo ya hecho, al final. */
export const ORDEN_DE_ESTADOS: readonly EstadoDeTarea[] = [
  'vencida',
  'esta-semana',
  'proxima',
  'sin-fecha',
  'hecha',
];

/** Los días que cuentan como «esta semana»: hoy y los siete siguientes. */
export const DIAS_DE_AVISO = 7;

const MS_DIA = 86_400_000;

/** El día de hoy como medianoche UTC, que es como se guardan las fechas. */
export function diaDeHoy(ahora: Date): number {
  return Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

/** Días hasta el límite: negativos si ya pasó, `null` si no hay fecha. */
export function diasHasta(tarea: Pick<TareaDelPanel, 'dueDate'>, ahora: Date): number | null {
  if (tarea.dueDate === null) return null;
  const limite = Date.UTC(
    tarea.dueDate.getUTCFullYear(),
    tarea.dueDate.getUTCMonth(),
    tarea.dueDate.getUTCDate(),
  );
  return Math.round((limite - diaDeHoy(ahora)) / MS_DIA);
}

export function estadoDeTarea(
  tarea: Pick<TareaDelPanel, 'done' | 'dueDate'>,
  ahora: Date,
): EstadoDeTarea {
  if (tarea.done) return 'hecha';
  const dias = diasHasta(tarea, ahora);
  if (dias === null) return 'sin-fecha';
  if (dias < 0) return 'vencida';
  return dias <= DIAS_DE_AVISO ? 'esta-semana' : 'proxima';
}

const PESO_PRIORIDAD: Record<Prioridad, number> = { high: 0, normal: 1, low: 2 };

/** Dentro de un grupo: lo más próximo antes, y a igual fecha lo más importante. */
export function compararTareas(a: TareaDelPanel, b: TareaDelPanel): number {
  const fa = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const fb = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
  return (
    fa - fb ||
    PESO_PRIORIDAD[a.priority] - PESO_PRIORIDAD[b.priority] ||
    a.order - b.order ||
    a.id.localeCompare(b.id)
  );
}

export type FiltroDeResponsable = 'todas' | 'A' | 'B';

/**
 * Las tareas de una persona son **las suyas y las de los dos**: a quien le toca
 * «contratar el catering» entre los dos la tiene que ver cuando mira «lo mío».
 */
export function esDe(tarea: Pick<TareaDelPanel, 'assignedTo'>, filtro: FiltroDeResponsable) {
  return filtro === 'todas' || tarea.assignedTo === filtro || tarea.assignedTo === 'both';
}

export type FiltroDeEstado = 'todas' | 'pendientes' | 'vencidas' | 'hechas';
export const FILTROS_DE_ESTADO: readonly FiltroDeEstado[] = [
  'todas',
  'pendientes',
  'vencidas',
  'hechas',
];

export interface FiltrosDeTareas {
  readonly estado: FiltroDeEstado;
  /** Una categoría exacta, o `''` para todas. */
  readonly categoria: string;
  /** Texto libre: título, descripción y categoría, sin acentos ni mayúsculas. */
  readonly texto: string;
}

export const SIN_FILTROS: FiltrosDeTareas = { estado: 'todas', categoria: '', texto: '' };

function sinAcentos(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Filtra por estado, categoría y texto. El filtro por responsable es aparte
 * (`esDe`) porque también acota el resumen de arriba; estos tres solo deciden
 * qué filas se enseñan.
 */
export function filtrarTareas(
  tareas: readonly TareaDelPanel[],
  filtros: FiltrosDeTareas,
  ahora: Date,
): readonly TareaDelPanel[] {
  const busca = sinAcentos(filtros.texto.trim());

  return tareas.filter((t) => {
    if (filtros.categoria !== '' && t.category !== filtros.categoria) return false;

    if (filtros.estado !== 'todas') {
      const estado = estadoDeTarea(t, ahora);
      if (filtros.estado === 'hechas' && estado !== 'hecha') return false;
      if (filtros.estado === 'pendientes' && estado === 'hecha') return false;
      if (filtros.estado === 'vencidas' && estado !== 'vencida') return false;
    }

    if (busca === '') return true;
    return sinAcentos(`${t.title} ${t.description} ${t.category}`).includes(busca);
  });
}

export interface GrupoDeTareas {
  readonly estado: EstadoDeTarea;
  readonly tareas: readonly TareaDelPanel[];
}

/** Las tareas, ya filtradas, en sus grupos por estado. Los grupos vacíos no salen. */
export function agruparTareas(
  tareas: readonly TareaDelPanel[],
  ahora: Date,
  filtro: FiltroDeResponsable = 'todas',
): readonly GrupoDeTareas[] {
  const visibles = tareas.filter((t) => esDe(t, filtro));
  return ORDEN_DE_ESTADOS.map((estado) => ({
    estado,
    tareas: visibles.filter((t) => estadoDeTarea(t, ahora) === estado).sort(compararTareas),
  })).filter((g) => g.tareas.length > 0);
}

export interface ResumenDeTareas {
  readonly total: number;
  readonly hechas: number;
  readonly vencidas: number;
  readonly estaSemana: number;
  readonly proximas: number;
  readonly sinFecha: number;
  /** 0–100, redondeado. Sin tareas, 0: no hay nada que enseñar como logrado. */
  readonly porcentaje: number;
}

export function resumirTareas(
  tareas: readonly TareaDelPanel[],
  ahora: Date,
  filtro: FiltroDeResponsable = 'todas',
): ResumenDeTareas {
  const lista = tareas.filter((t) => esDe(t, filtro));
  const cuenta = (estado: EstadoDeTarea) =>
    lista.filter((t) => estadoDeTarea(t, ahora) === estado).length;
  const hechas = cuenta('hecha');

  return {
    total: lista.length,
    hechas,
    vencidas: cuenta('vencida'),
    estaSemana: cuenta('esta-semana'),
    proximas: cuenta('proxima'),
    sinFecha: cuenta('sin-fecha'),
    porcentaje: lista.length === 0 ? 0 : Math.round((hechas / lista.length) * 100),
  };
}

/** Las que no están hechas y ya han vencido o vencen pronto, para el inicio. */
export function tareasUrgentes(
  tareas: readonly TareaDelPanel[],
  ahora: Date,
  max: number,
): readonly TareaDelPanel[] {
  return tareas
    .filter((t) => {
      const estado = estadoDeTarea(t, ahora);
      return estado === 'vencida' || estado === 'esta-semana';
    })
    .sort(compararTareas)
    .slice(0, max);
}

export type ErrorDeTarea = 'titulo' | 'descripcion' | 'categoria' | 'fecha';

export interface BorradorDeTarea {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  /** `'2027-03-12'` del `<input type="date">`, o `''` sin fecha. */
  readonly dueDate: string;
}

export function erroresDeTarea(borrador: BorradorDeTarea): readonly ErrorDeTarea[] {
  const errores: ErrorDeTarea[] = [];
  const titulo = borrador.title.trim();
  if (titulo === '' || titulo.length > MAX_TITULO_TAREA) errores.push('titulo');
  if (borrador.description.length > MAX_DESCRIPCION_TAREA) errores.push('descripcion');
  if (borrador.category.trim().length > MAX_CATEGORIA_TAREA) errores.push('categoria');
  if (borrador.dueDate !== '' && fechaDeCampo(borrador.dueDate) === null) errores.push('fecha');
  return errores;
}

/** `'2027-03-12'` → medianoche UTC de ese día. `null` si no es una fecha. */
export function fechaDeCampo(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor ? null : fecha;
}

/** Medianoche UTC → el valor de un `<input type="date">`. */
export function campoDeFecha(fecha: Date | null): string {
  return fecha === null ? '' : fecha.toISOString().slice(0, 10);
}

export function esResponsable(valor: unknown): valor is Responsable {
  return valor === 'A' || valor === 'B' || valor === 'both';
}

export function esPrioridad(valor: unknown): valor is Prioridad {
  return valor === 'low' || valor === 'normal' || valor === 'high';
}

/** Un icono guardado que ya no está en el set (o nunca estuvo) se cambia por el de siempre. */
export function iconoDeTarea(valor: unknown): NpIconName {
  return typeof valor === 'string' && valor in NP_ICON_LABELS
    ? (valor as NpIconName)
    : ICONO_POR_DEFECTO;
}

export interface PlazoDeTarea {
  /** La clave de `panel.checklist.<clave>`: el texto vive en las traducciones. */
  readonly clave: 'sinFecha' | 'hechaEl' | 'vencio' | 'esHoy' | 'vence';
  readonly fecha: Date | null;
  /** Los días, en positivo, de lo que falta o de lo que lleva vencida. */
  readonly n: number;
}

/**
 * Cómo se dice el plazo de una tarea: la fecha escrita y cuánto falta.
 *
 * El color de una tarea nunca va solo; esta es la mitad de texto. La usan la
 * pantalla de tareas y el aviso del inicio, para que las dos digan lo mismo.
 */
export function plazoDeTarea(tarea: TareaDelPanel, ahora: Date): PlazoDeTarea {
  if (tarea.dueDate === null) return { clave: 'sinFecha', fecha: null, n: 0 };
  if (tarea.done) return { clave: 'hechaEl', fecha: tarea.dueDate, n: 0 };

  const dias = diasHasta(tarea, ahora) ?? 0;
  if (dias < 0) return { clave: 'vencio', fecha: tarea.dueDate, n: -dias };
  if (dias === 0) return { clave: 'esHoy', fecha: tarea.dueDate, n: 0 };
  return { clave: 'vence', fecha: tarea.dueDate, n: dias };
}
