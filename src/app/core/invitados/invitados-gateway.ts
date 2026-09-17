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

export interface PuertaInvitados {
  listar(): Promise<ResultadoListado>;
  guardar(datos: DatosInvitado, forzar?: boolean): Promise<ResultadoGuardado>;
  borrar(id: string): Promise<ResultadoBorrado>;
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
}

export function resumirInvitados(invitados: readonly Invitado[]): ResumenInvitados {
  return {
    total: invitados.length,
    confirmados: invitados.filter((i) => i.rsvpStatus === 'confirmed').length,
    declinados: invitados.filter((i) => i.rsvpStatus === 'declined').length,
    pendientes: invitados.filter((i) => i.rsvpStatus === 'pending').length,
    sinEntrar: invitados.filter((i) => i.loginCount === 0).length,
  };
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
