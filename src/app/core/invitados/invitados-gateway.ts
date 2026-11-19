import { InjectionToken } from '@angular/core';

/**
 * Puerto de la lista de invitados.
 *
 * Del otro lado hay tres funciones invocables, y no hay atajo posible: la
 * colección `guests` está cerrada a lectura directa en las reglas (regla 2).
 * Dentro están los teléfonos y las alergias de cientos de personas.
 *
 * De este lado, una interfaz que se puede doblar en un test sin red, que es lo
 * que permite probar la pantalla —la parte que de verdad se equivoca— sin
 * levantar medio Firebase.
 */

export type Lado = 'A' | 'B' | 'both';
export type Edad = 'adult' | 'child' | 'baby';
export type EstadoRsvp = 'pending' | 'confirmed' | 'declined';

export interface Invitado {
  readonly id: string;
  readonly fullName: string;
  readonly nickname: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly side: Lado;
  readonly ageGroup: Edad;
  readonly groupIds: readonly string[];
  readonly rsvpStatus: EstadoRsvp;
  readonly isCompanion: boolean;
  readonly invitedById: string | null;
  readonly maxCompanions: number;
  /** Cuántas veces ha entrado en la web. Lo mueve el servidor. */
  readonly loginCount: number;
  readonly notes: string;
  /** Lo contesta el invitado en el RSVP; es lo que se exporta al catering. */
  readonly menu: string;
  readonly allergies: string;
  readonly tableId: string | null;
  /** Lo apuntó un invitado desde la web, no la pareja desde el panel. */
  readonly apuntadoPorInvitado: boolean;
  /** Cuándo se dio de alta, en ISO, o `null` si el documento es anterior. */
  readonly altaEn: string | null;
}

/** Lo que la pareja puede escribir. El resto lo lleva el servidor (regla 6). */
export interface DatosInvitado {
  readonly id?: string;
  readonly fullName: string;
  readonly nickname?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly side?: Lado;
  readonly ageGroup?: Edad;
  readonly groupIds?: readonly string[];
  /**
   * Solo al importar: los grupos llegan **por nombre**, como están en la hoja.
   * El servidor los resuelve y crea los que falten.
   */
  readonly groupNames?: readonly string[];
  readonly maxCompanions?: number;
  readonly notes?: string;
}

export interface CampoInvalido {
  readonly campo: string;
  readonly motivo: string;
}

/** Por qué no se pudo guardar. Cada caso tiene su mensaje en pantalla. */
export type FalloInvitado =
  | { readonly tipo: 'datos-invalidos'; readonly campos: readonly CampoInvalido[] }
  /**
   * Se parece a uno que ya está.
   *
   * No es un error del todo: dos primos con el mismo nombre son un caso real.
   * Por eso trae a quién se parece y por qué, y la pantalla ofrece crearlo
   * igualmente en vez de negarse en redondo.
   */
  | { readonly tipo: 'duplicado'; readonly id: string; readonly motivo: 'telefono' | 'nombre' }
  | { readonly tipo: 'con-acompanantes'; readonly cuantos: number }
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoGuardado =
  | { readonly ok: true; readonly id: string; readonly creado: boolean }
  | { readonly ok: false; readonly fallo: FalloInvitado };

/**
 * El cupo de acompañantes puesto a varios de una vez (F1.5b).
 *
 * `omitidos` son los que no lo recibieron: acompañantes —que no pueden tener
 * cupo, o se encadenaría— y, si acaso, alguno borrado entre que se pintó la
 * lista y se pulsó el botón.
 */
export type ResultadoCupo =
  | { readonly ok: true; readonly cambiados: number; readonly omitidos: number }
  | { readonly ok: false; readonly fallo: FalloInvitado };

export type ResultadoBorrado =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloInvitado };

/**
 * Listar también puede fallar, y su fallo merece el mismo trato.
 *
 * Devolver la lista a secas y dejar que lance obligaba a la pantalla a enseñar
 * el mensaje crudo del SDK —«Unauthenticated [401]»— justo en el caso más
 * común de todos, que es App Check sin configurar. Un error que no dice qué
 * hacer cuesta el mismo rato que no tener mensaje.
 */
export type ResultadoListado =
  | { readonly ok: true; readonly invitados: readonly Invitado[] }
  | { readonly ok: false; readonly fallo: FalloInvitado };

/** Cada fila del fichero, tal como la ve el servidor. */
export type EstadoFila = 'nuevo' | 'duplicado' | 'invalido' | 'sin-sitio';

export interface FilaImportada {
  readonly fila: number;
  readonly nombre: string;
  readonly estado: EstadoFila;
  readonly motivos: readonly CampoInvalido[];
  readonly duplicadoDe: string;
  readonly motivoDuplicado: 'telefono' | 'nombre' | null;
}

export interface ResumenImportacion {
  readonly nuevos: number;
  readonly duplicados: number;
  readonly invalidos: number;
  readonly sinSitio: number;
}

export interface Importacion {
  readonly filas: readonly FilaImportada[];
  readonly resumen: ResumenImportacion;
  /** Grupos que no existían y se crean (o se crearían) al importar. */
  readonly gruposNuevos: readonly string[];
  readonly importados: number;
  readonly previsualizacion: boolean;
}

export type ResultadoImportacion =
  | { readonly ok: true; readonly importacion: Importacion }
  | { readonly ok: false; readonly fallo: FalloInvitado };

export interface PuertaInvitados {
  listar(): Promise<ResultadoListado>;
  /**
   * Importa una lista, o solo mira qué pasaría.
   *
   * Es **la misma llamada** con una bandera, no dos caminos: lo que se enseña
   * antes de confirmar tiene que ser exactamente lo que va a ocurrir.
   */
  importar(
    filas: readonly DatosInvitado[],
    opciones: { soloPrevisualizar: boolean; forzarDuplicados?: boolean },
  ): Promise<ResultadoImportacion>;
  guardar(datos: DatosInvitado, forzar?: boolean): Promise<ResultadoGuardado>;
  borrar(id: string): Promise<ResultadoBorrado>;
  /** Pone el mismo cupo de acompañantes a todos los de la lista. */
  cupoEnLote(guestIds: readonly string[], maxCompanions: number): Promise<ResultadoCupo>;
}

export const PUERTA_INVITADOS = new InjectionToken<PuertaInvitados>('PUERTA_INVITADOS');

/** Orden por defecto: por nombre, con las reglas del español. */
export function ordenarPorNombre(invitados: readonly Invitado[]): readonly Invitado[] {
  const colador = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
  return [...invitados].sort((a, b) => colador.compare(a.fullName, b.fullName));
}

export interface ResumenInvitados {
  readonly total: number;
  readonly confirmados: number;
  readonly declinados: number;
  readonly pendientes: number;
  /** Cuántos no han entrado nunca. Es a quién hay que reenviar el enlace (§8.3). */
  readonly sinEntrar: number;
  /** Cuántos los han apuntado los propios invitados. */
  readonly apuntados: number;
}

export function resumirInvitados(invitados: readonly Invitado[]): ResumenInvitados {
  return {
    total: invitados.length,
    confirmados: invitados.filter((i) => i.rsvpStatus === 'confirmed').length,
    declinados: invitados.filter((i) => i.rsvpStatus === 'declined').length,
    pendientes: invitados.filter((i) => i.rsvpStatus === 'pending').length,
    sinEntrar: invitados.filter((i) => i.loginCount === 0).length,
    apuntados: invitados.filter((i) => i.apuntadoPorInvitado === true).length,
  };
}

/**
 * Lo que la pareja puede pedir ver.
 *
 * `sin-entrar` no es un estado del RSVP: es «a quién hay que reenviarle el
 * enlace», que es la pregunta que de verdad se hace cuando faltan dos semanas.
 */
export type Vista =
  | 'todos'
  | 'confirmed'
  | 'declined'
  | 'pending'
  | 'sin-entrar'
  /** Los que han apuntado los propios invitados (§5.5). */
  | 'apuntados';

export function porVista(invitados: readonly Invitado[], vista: Vista): readonly Invitado[] {
  if (vista === 'todos') return invitados;
  if (vista === 'sin-entrar') return invitados.filter((i) => i.loginCount === 0);
  if (vista === 'apuntados') return invitados.filter((i) => i.apuntadoPorInvitado === true);
  return invitados.filter((i) => i.rsvpStatus === vista);
}

/**
 * Los que han apuntado los invitados **en los últimos días** (F1.5c).
 *
 * Es el aviso que faltaba: la pareja se enteraba de que alguien había
 * apuntado a su pareja mirando la lista con atención, o no se enteraba.
 *
 * Una semana, y no «desde la última vez que entraste»: guardar esa marca
 * obliga a escribir por cada visita al panel, y con dos novios es una marca
 * que pisa la del otro. «Esta semana» se entiende sin explicar nada.
 */
export const DIAS_DE_NOVEDAD = 7;

export function apuntadosHacePoco(
  invitados: readonly Invitado[],
  ahora: Date = new Date(),
  dias: number = DIAS_DE_NOVEDAD,
): readonly Invitado[] {
  const desde = ahora.getTime() - dias * 24 * 60 * 60 * 1000;

  return invitados.filter((invitado) => {
    if (invitado.apuntadoPorInvitado !== true) return false;
    if (typeof invitado.altaEn !== 'string') return false;

    const cuando = new Date(invitado.altaEn).getTime();
    return Number.isFinite(cuando) && cuando >= desde;
  });
}

/**
 * Filtra por grupo. `null` es «todos», que no es lo mismo que «ninguno».
 *
 * Se cruza con las demás vistas en vez de sustituirlas: «pendientes» y
 * «Primos» a la vez es exactamente la pregunta que se hace la pareja cuando va
 * a llamar por teléfono a los que faltan de una rama de la familia.
 */
export function porGrupo(
  invitados: readonly Invitado[],
  groupId: string | null,
): readonly Invitado[] {
  if (groupId === null) return invitados;
  return invitados.filter((invitado) => invitado.groupIds.includes(groupId));
}

/**
 * Filtra por lo que la pareja escribe en el buscador.
 *
 * Busca en nombre, mote y teléfono a la vez, y **ignorando acentos**: quien
 * busca a Begoña escribe «begona» la mitad de las veces, y una búsqueda que no
 * lo encuentra parece que ha perdido al invitado.
 */
export function filtrarInvitados(
  invitados: readonly Invitado[],
  texto: string,
): readonly Invitado[] {
  const aguja = sinAcentos(texto);
  if (aguja === '') return invitados;

  return invitados.filter((invitado) => {
    const pajar = sinAcentos(`${invitado.fullName} ${invitado.nickname} ${invitado.phone ?? ''}`);
    return pajar.includes(aguja);
  });
}

function sinAcentos(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
