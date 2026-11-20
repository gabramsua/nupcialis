import type { Invitado } from '../../../core/invitados/invitados-gateway';
import type { Celda, Hoja } from '../invitados/exportacion';
import { nombreDeMesa, sentadosEn, type InvitadoSentado, type Mesa } from './mesas';

/**
 * El reparto de mesas, en filas de hoja de cálculo.
 *
 * Es **la hoja que se le manda al catering**, y por eso lleva lo que cocina
 * necesita y nada más: ni teléfonos, ni correos, ni notas (§9.4). La lista de
 * trescientos teléfonos no tiene por qué salir en un correo a una empresa.
 *
 * Tres hojas:
 *
 * - **«Resumen»**: una fila por mesa con cuántos se sientan, si está corta o
 *   pasada y **cuántos de cada menú**. Es lo que mira quien monta la sala y
 *   quien reparte los platos, y lo que no se ve en una lista de nombres.
 * - **«Por mesa»**: quién se sienta dónde, con su menú y sus alergias, que es lo
 *   que lleva el camarero en la mano.
 * - **«Sin mesa»**: los confirmados que aún no tienen sitio. Solo sale si los
 *   hay: un fichero que se manda «terminado» y lleva a gente sin sentar es el
 *   error que más conviene que se vea.
 *
 * Aquí no se escribe ningún fichero. Quien lo monta es `exportar-xlsx.ts`, que
 * carga la librería solo al pulsar el botón.
 */

export const HOJA_RESUMEN = 'Resumen';
export const HOJA_POR_MESA = 'Por mesa';
export const HOJA_SIN_MESA = 'Sin mesa';

export interface EtiquetasDeMesas {
  readonly edad: Readonly<Record<string, string>>;
  readonly forma: Readonly<Record<string, string>>;
  readonly estado: {
    readonly bien: string;
    readonly corta: string;
    readonly pasada: string;
    readonly vacia: string;
  };
  readonly sinMenu: string;
  readonly total: string;
}

export interface DatosDeMesas {
  readonly mesas: readonly Mesa[];
  readonly invitados: readonly Invitado[];
  readonly etiquetas: EtiquetasDeMesas;
}

function porNombre(a: Invitado, b: Invitado): number {
  return a.fullName.localeCompare(b.fullName, 'es');
}

/** Lo que el dominio del reparto necesita de un invitado, y nada más. */
function sentado(invitado: Invitado): InvitadoSentado {
  return {
    id: invitado.id,
    fullName: invitado.fullName,
    rsvpStatus: invitado.rsvpStatus,
    tableId: invitado.tableId,
    isCompanion: invitado.isCompanion,
    invitedById: invitado.invitedById,
    groupIds: invitado.groupIds,
  };
}

/** El nombre que sale en la hoja: el que la pareja puso o «Mesa 3». */
function nombres(mesas: readonly Mesa[]): Map<string, string> {
  return new Map(mesas.map((mesa, i) => [mesa.id, nombreDeMesa(mesa, i + 1)]));
}

/**
 * La mesa de cada invitado, por nombre. Para las otras hojas de exportación:
 * un `tableId` suelto es un identificador de Firestore y a quien lee el fichero
 * no le dice nada.
 */
export function nombreDeMesaPorId(mesas: readonly Mesa[]): (id: string | null) => string {
  const porId = nombres(mesas);
  return (id) => (id === null ? '' : (porId.get(id) ?? ''));
}

/** El menú tal y como se cuenta: sin menú es una categoría, no un hueco. */
function menuDe(invitado: Invitado, etiquetas: EtiquetasDeMesas): string {
  const menu = invitado.menu.trim();
  return menu === '' ? etiquetas.sinMenu : menu;
}

/** Los menús que hay entre los sentados, de más a menos y después por nombre. */
function menusEntre(sentados: readonly Invitado[], etiquetas: EtiquetasDeMesas): string[] {
  const cuenta = new Map<string, number>();
  for (const i of sentados) {
    const menu = menuDe(i, etiquetas);
    cuenta.set(menu, (cuenta.get(menu) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([menu]) => menu);
}

function conAlergias(invitado: Invitado): boolean {
  return invitado.allergies.trim() !== '';
}

function estadoDe(mesa: Mesa, cuantos: number, etiquetas: EtiquetasDeMesas): string {
  if (cuantos === 0) return etiquetas.estado.vacia;
  if (cuantos > mesa.maxSeats) return etiquetas.estado.pasada;
  if (cuantos < mesa.minSeats) return etiquetas.estado.corta;
  return etiquetas.estado.bien;
}

export function hojaResumen(datos: DatosDeMesas): Hoja {
  const { mesas, invitados, etiquetas } = datos;
  const todos = invitados.map(sentado);
  const delReparto = invitados.filter(
    (i) =>
      i.rsvpStatus === 'confirmed' && i.tableId !== null && mesas.some((m) => m.id === i.tableId),
  );
  const menus = menusEntre(delReparto, etiquetas);
  const nombrePorId = nombres(mesas);

  const filas = mesas.map((mesa): readonly Celda[] => {
    const ids = new Set(sentadosEn(mesa.id, todos).map((s) => s.id));
    const suyos = invitados.filter((i) => ids.has(i.id));

    return [
      nombrePorId.get(mesa.id) ?? mesa.name,
      etiquetas.forma[mesa.shape] ?? mesa.shape,
      mesa.minSeats,
      mesa.maxSeats,
      suyos.length,
      estadoDe(mesa, suyos.length, etiquetas),
      ...menus.map((menu) => suyos.filter((i) => menuDe(i, etiquetas) === menu).length),
      suyos.filter(conAlergias).length,
    ];
  });

  // La fila de abajo: lo que se le dice al catering de un vistazo.
  const suma = (columna: number): number =>
    filas.reduce(
      (total, fila) => total + (typeof fila[columna] === 'number' ? (fila[columna] as number) : 0),
      0,
    );

  const primeraDeMenu = 6;
  const totales: readonly Celda[] = [
    etiquetas.total,
    '',
    '',
    '',
    suma(4),
    '',
    ...menus.map((_, i) => suma(primeraDeMenu + i)),
    suma(primeraDeMenu + menus.length),
  ];

  return {
    nombre: HOJA_RESUMEN,
    columnas: [
      { titulo: 'Mesa', ancho: 24 },
      { titulo: 'Forma', ancho: 12 },
      { titulo: 'Mínimo', ancho: 9 },
      { titulo: 'Máximo', ancho: 9 },
      { titulo: 'Sentados', ancho: 10 },
      { titulo: 'Estado', ancho: 12 },
      ...menus.map((menu) => ({ titulo: menu, ancho: 14 })),
      { titulo: 'Con alergias', ancho: 14 },
    ],
    filas: mesas.length > 0 ? [...filas, totales] : filas,
  };
}

export function hojaPorMesa(datos: DatosDeMesas): Hoja {
  const { mesas, invitados, etiquetas } = datos;
  const nombrePorId = nombres(mesas);
  const porId = new Map(invitados.map((i) => [i.id, i]));
  const todos = invitados.map(sentado);

  const filas: (readonly Celda[])[] = [];

  for (const mesa of mesas) {
    const ids = new Set(sentadosEn(mesa.id, todos).map((s) => s.id));
    const suyos = invitados.filter((i) => ids.has(i.id)).sort(porNombre);

    for (const i of suyos) {
      const titular =
        i.isCompanion && i.invitedById !== null ? porId.get(i.invitedById) : undefined;
      filas.push([
        nombrePorId.get(mesa.id) ?? mesa.name,
        i.fullName,
        etiquetas.edad[i.ageGroup] ?? i.ageGroup,
        menuDe(i, etiquetas),
        i.allergies,
        titular ? titular.fullName : '',
      ]);
    }
  }

  return {
    nombre: HOJA_POR_MESA,
    columnas: [
      { titulo: 'Mesa', ancho: 24 },
      { titulo: 'Nombre', ancho: 28 },
      { titulo: 'Edad', ancho: 10 },
      { titulo: 'Menú', ancho: 14 },
      { titulo: 'Alergias', ancho: 34 },
      { titulo: 'Viene con', ancho: 24 },
    ],
    filas,
  };
}

/** Los confirmados sin mesa, o `null` si no queda ninguno. */
export function hojaSinMesa(datos: DatosDeMesas): Hoja | null {
  const { mesas, invitados, etiquetas } = datos;
  const conMesa = new Set(mesas.map((m) => m.id));

  const filas = invitados
    .filter((i) => i.rsvpStatus === 'confirmed' && (i.tableId === null || !conMesa.has(i.tableId)))
    .sort(porNombre)
    .map((i): readonly Celda[] => [
      i.fullName,
      etiquetas.edad[i.ageGroup] ?? i.ageGroup,
      menuDe(i, etiquetas),
      i.allergies,
    ]);

  if (filas.length === 0) return null;

  return {
    nombre: HOJA_SIN_MESA,
    columnas: [
      { titulo: 'Nombre', ancho: 28 },
      { titulo: 'Edad', ancho: 10 },
      { titulo: 'Menú', ancho: 14 },
      { titulo: 'Alergias', ancho: 34 },
    ],
    filas,
  };
}

export function hojasDeMesas(datos: DatosDeMesas): readonly Hoja[] {
  const sin = hojaSinMesa(datos);
  return [hojaResumen(datos), hojaPorMesa(datos), ...(sin ? [sin] : [])];
}

/** Con el slug y la fecha: en Descargas van a acabar varios. */
export function nombreDelFicheroDeMesas(slug: string, hoy: Date): string {
  const limpio = slug.replace(/[^a-z0-9-]/gi, '') || 'boda';
  return `mesas-${limpio}-${hoy.toISOString().slice(0, 10)}.xlsx`;
}
