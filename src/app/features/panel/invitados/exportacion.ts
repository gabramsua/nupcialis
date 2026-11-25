import type { Grupo } from '../../../core/invitados/grupos-gateway';
import type { Invitado } from '../../../core/invitados/invitados-gateway';
import type { RespuestasDeInvitado } from '../../../core/rsvp/respuestas-gateway';
import type { Pregunta } from '../../../core/rsvp/rsvp-gateway';
import { telefonoVisible } from '../../../shared/telefono';

/**
 * La lista de invitados, en filas de hoja de cálculo.
 *
 * Dos hojas, y las dos hacen falta:
 *
 * - **«Invitados»** es la lista entera de la pareja: todo lo que tiene, para
 *   repasarla, mandársela a la finca o guardarla.
 * - **«Para el catering»** son solo los que vienen, con lo que el catering
 *   necesita y **sin teléfonos ni notas**. No es decoración: ese fichero sale
 *   por correo a una empresa de fuera, y la lista de teléfonos de trescientas
 *   personas no tiene por qué ir dentro (§9.4).
 *
 * Aquí no se escribe ningún fichero: esto son datos. Quien monta el `.xlsx` es
 * `exportar-xlsx.ts`, que carga la librería solo al pulsar el botón.
 */

export const HOJA_INVITADOS = 'Invitados';
export const HOJA_CATERING = 'Para el catering';
export const HOJA_RESPUESTAS = 'Respuestas';

/** Lo que una celda puede llevar. La librería acepta estos tipos. */
export type Celda = string | number | null;

export interface Columna {
  readonly titulo: string;
  readonly ancho: number;
}

export interface Hoja {
  readonly nombre: string;
  readonly columnas: readonly Columna[];
  readonly filas: readonly (readonly Celda[])[];
}

/** Cómo se llaman los estados y los demás códigos en la hoja. */
export interface Etiquetas {
  readonly estado: Readonly<Record<string, string>>;
  readonly edad: Readonly<Record<string, string>>;
  readonly lado: Readonly<Record<string, string>>;
  readonly si: string;
  readonly no: string;
}

export interface DatosExportacion {
  readonly invitados: readonly Invitado[];
  readonly grupos: readonly Grupo[];
  readonly etiquetas: Etiquetas;
  /**
   * El nombre de la mesa de cada invitado.
   *
   * `tableId` es un identificador de Firestore y en una hoja que lee el catering
   * no dice nada. Es opcional porque las mesas se piden al pulsar exportar y
   * pueden no llegar: sin ellas la columna sale vacía, que es mejor que un
   * identificador ilegible.
   */
  readonly mesaDe?: (tableId: string | null) => string;
  /**
   * Lo que han escrito en el formulario, si se ha podido leer.
   *
   * Es opcional a propósito: la exportación no puede quedarse sin salir porque
   * falle la llamada que trae las respuestas. Sin esto son dos hojas, como
   * siempre.
   */
  readonly formulario?: RespuestasDelFormulario;
}

export interface RespuestasDelFormulario {
  readonly preguntas: readonly Pregunta[];
  readonly invitados: readonly RespuestasDeInvitado[];
}

function porNombre(a: Invitado, b: Invitado): number {
  return a.fullName.localeCompare(b.fullName, 'es');
}

/** Los grupos de un invitado, por nombre y en el orden en que están. */
function gruposDe(invitado: Invitado, grupos: readonly Grupo[]): string {
  return grupos
    .filter((g) => invitado.groupIds.includes(g.id))
    .map((g) => g.name)
    .join(', ');
}

function quienLoTrae(invitado: Invitado, porId: Map<string, string>): string {
  if (invitado.invitedById === null) return '';
  return porId.get(invitado.invitedById) ?? '';
}

/**
 * La hoja completa, tal y como la ve la pareja.
 *
 * El orden es alfabético y no por fecha de alta: una lista de trescientas
 * personas se repasa buscando un nombre.
 */
export function hojaDeInvitados(datos: DatosExportacion): Hoja {
  const { invitados, grupos, etiquetas } = datos;
  const mesaDe = datos.mesaDe ?? (() => '');
  const porId = new Map(invitados.map((i) => [i.id, i.fullName]));

  const filas = invitados
    .slice()
    .sort(porNombre)
    .map((i): readonly Celda[] => [
      i.fullName,
      i.nickname,
      etiquetas.estado[i.rsvpStatus] ?? i.rsvpStatus,
      i.menu,
      i.allergies,
      etiquetas.edad[i.ageGroup] ?? i.ageGroup,
      etiquetas.lado[i.side] ?? i.side,
      gruposDe(i, grupos),
      mesaDe(i.tableId),
      telefonoVisible(i.phone),
      quienLoTrae(i, porId),
      i.loginCount,
      i.notes,
    ]);

  return {
    nombre: HOJA_INVITADOS,
    columnas: [
      { titulo: 'Nombre', ancho: 28 },
      { titulo: 'Mote', ancho: 14 },
      { titulo: 'Confirmación', ancho: 14 },
      { titulo: 'Menú', ancho: 14 },
      { titulo: 'Alergias', ancho: 30 },
      { titulo: 'Edad', ancho: 10 },
      { titulo: 'De quién', ancho: 12 },
      { titulo: 'Grupos', ancho: 24 },
      { titulo: 'Mesa', ancho: 10 },
      { titulo: 'Teléfono', ancho: 16 },
      { titulo: 'Lo trae', ancho: 20 },
      { titulo: 'Entradas a la web', ancho: 16 },
      { titulo: 'Notas', ancho: 30 },
    ],
    filas,
  };
}

/**
 * La hoja que se le manda al catering.
 *
 * **Solo quien viene**, y sin teléfonos, correos ni notas: ese fichero sale a
 * una empresa de fuera. Las notas son privadas de la pareja (§5.5) y los
 * teléfonos no le hacen falta a quien cocina.
 */
export function hojaParaCatering(datos: DatosExportacion): Hoja {
  const { invitados, etiquetas } = datos;
  const mesaDe = datos.mesaDe ?? (() => '');

  const filas = invitados
    .filter((i) => i.rsvpStatus === 'confirmed')
    .sort(porNombre)
    .map((i): readonly Celda[] => [
      i.fullName,
      etiquetas.edad[i.ageGroup] ?? i.ageGroup,
      i.menu,
      i.allergies,
      mesaDe(i.tableId),
    ]);

  return {
    nombre: HOJA_CATERING,
    columnas: [
      { titulo: 'Nombre', ancho: 28 },
      { titulo: 'Edad', ancho: 10 },
      { titulo: 'Menú', ancho: 14 },
      { titulo: 'Alergias', ancho: 34 },
      { titulo: 'Mesa', ancho: 10 },
    ],
    filas,
  };
}

/**
 * Las preguntas que se escriben a mano. Las de opciones ya tienen su columna.
 *
 * El menú y las alergias viajan en las dos hojas porque `mapsTo` los copia al
 * invitado; lo que no tiene columna propia es lo escrito: la canción que
 * pidieron, el mensaje para los novios, la alergia que no cabía en su casilla.
 */
const ESCRITAS = ['text', 'textarea'] as const;

function esEscrita(pregunta: Pregunta): boolean {
  return (ESCRITAS as readonly string[]).includes(pregunta.type);
}

/**
 * Lo que han escrito, una fila por invitado y una columna por pregunta.
 *
 * Va en la hoja de la pareja y **no** en la del catering: a quien cocina no le
 * hacen falta los mensajes a los novios. Solo salen los que han escrito algo;
 * trescientas filas en blanco no son información.
 */
export function hojaDeRespuestas(formulario: RespuestasDelFormulario): Hoja | null {
  const preguntas = formulario.preguntas.filter(esEscrita);
  if (preguntas.length === 0) return null;

  const filas = formulario.invitados
    .map((invitado) => ({
      nombre: invitado.nombre,
      celdas: preguntas.map((p) => texto(invitado.respuestas[p.id])),
    }))
    .filter((fila) => fila.celdas.some((celda) => celda !== ''))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((fila): readonly Celda[] => [fila.nombre, ...fila.celdas]);

  if (filas.length === 0) return null;

  return {
    nombre: HOJA_RESPUESTAS,
    columnas: [
      { titulo: 'Nombre', ancho: 28 },
      ...preguntas.map((p) => ({ titulo: p.label, ancho: 40 })),
    ],
    filas,
  };
}

function texto(valor: unknown): string {
  if (valor === undefined || valor === null) return '';
  if (Array.isArray(valor)) return valor.map((v) => String(v)).join(', ');
  return String(valor).trim();
}

export function hojas(datos: DatosExportacion): readonly Hoja[] {
  const respuestas = datos.formulario ? hojaDeRespuestas(datos.formulario) : null;

  return [hojaDeInvitados(datos), hojaParaCatering(datos), ...(respuestas ? [respuestas] : [])];
}

/**
 * El nombre del fichero.
 *
 * Con el slug de la boda y la fecha de hoy: en la carpeta de descargas van a
 * acabar cinco, y «invitados.xlsx» a secas no dice cuál es el bueno.
 */
export function nombreDelFichero(slug: string, hoy: Date): string {
  const limpio = slug.replace(/[^a-z0-9-]/gi, '') || 'boda';
  return `invitados-${limpio}-${hoy.toISOString().slice(0, 10)}.xlsx`;
}

/** Cuántos vienen y de qué menú: lo primero que pregunta el catering. */
export function resumenDeMenus(invitados: readonly Invitado[]): readonly {
  readonly menu: string;
  readonly cuantos: number;
}[] {
  const cuenta = new Map<string, number>();

  for (const invitado of invitados) {
    if (invitado.rsvpStatus !== 'confirmed') continue;
    const menu = invitado.menu.trim();
    cuenta.set(menu, (cuenta.get(menu) ?? 0) + 1);
  }

  return [...cuenta.entries()]
    .map(([menu, cuantos]) => ({ menu, cuantos }))
    .sort((a, b) => b.cuantos - a.cuantos || a.menu.localeCompare(b.menu, 'es'));
}
