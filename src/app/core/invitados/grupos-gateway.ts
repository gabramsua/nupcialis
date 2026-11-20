import { InjectionToken } from '@angular/core';

import type { NpCategoria } from '../../design-system/tokens/semantic.generated';
import type { CampoInvalido } from './invitados-gateway';

/**
 * Puerto de los grupos de invitados.
 *
 * Asimétrico a propósito: **se leen directamente** de Firestore —no hay datos
 * personales en «Universidad»— y **se escriben por función**. Las reglas
 * cierran la escritura porque un grupo restringido parte la audiencia de la
 * galería, y cambiarlo o borrarlo sin mirar a sus miembros deja estados que no
 * se pueden resolver (§8.5). Ver `functions/src/dominio/grupos.ts`.
 */

export type Audiencia = 'public' | 'restricted';

export interface Grupo {
  readonly id: string;
  readonly name: string;
  /**
   * `restricted`: lo que suben sus miembros solo lo ven ellos y la pareja.
   * Es lo que convierte un grupo en algo más que una etiqueta.
   */
  readonly photoAudience: Audiencia;
  /** En un grupo restringido, ¿puede un miembro publicar una foto para todos? */
  /** Id de la paleta categórica, nunca un hexadecimal. */
  readonly color: NpCategoria;
  readonly order: number;
  /**
   * El grupo en el que entra todo invitado nuevo (D-31). No se borra ni se le
   * pone candado: el servidor lo rechazaría, y la pantalla ni lo ofrece.
   */
  readonly porDefecto: boolean;
}

export interface DatosGrupo {
  readonly id?: string;
  readonly name: string;
  readonly photoAudience?: Audiencia;
  readonly color?: NpCategoria;
}

export type FalloGrupo =
  | { readonly tipo: 'datos-invalidos'; readonly campos: readonly CampoInvalido[] }
  /**
   * Pasarlo a restringido dejaría a `cuantos` invitados en dos grupos
   * restringidos. Se dice cuántos para que la pareja sepa qué tiene que tocar.
   */
  | { readonly tipo: 'con-conflictos'; readonly cuantos: number }
  /** Se ha intentado borrar el grupo de todos. */
  | { readonly tipo: 'por-defecto' }
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoGrupos =
  | { readonly ok: true; readonly grupos: readonly Grupo[] }
  | { readonly ok: false; readonly fallo: FalloGrupo };

export type ResultadoGuardadoGrupo =
  | { readonly ok: true; readonly id: string; readonly creado: boolean }
  | { readonly ok: false; readonly fallo: FalloGrupo };

export type ResultadoBorradoGrupo =
  | { readonly ok: true; readonly miembros: number }
  | { readonly ok: false; readonly fallo: FalloGrupo };

export type ResultadoOrdenGrupos =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloGrupo };

export interface PuertaGrupos {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoGrupos>;
  guardar(datos: DatosGrupo): Promise<ResultadoGuardadoGrupo>;
  borrar(id: string): Promise<ResultadoBorradoGrupo>;
  /** El orden entero, de una vez: mover uno cambia el sitio de los demás. */
  reordenar(ids: readonly string[]): Promise<ResultadoOrdenGrupos>;
}

export const PUERTA_GRUPOS = new InjectionToken<PuertaGrupos>('PUERTA_GRUPOS');

/** El orden en que los puso la pareja; a igualdad, por nombre. */
export function ordenarGrupos(grupos: readonly Grupo[]): readonly Grupo[] {
  const colador = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
  return [...grupos].sort((a, b) => a.order - b.order || colador.compare(a.name, b.name));
}

/**
 * Marca el grupo de todos en bodas anteriores a `isDefault`.
 *
 * Las dadas de alta antes de D-31 tienen su «Invitados» sin la marca. El
 * servidor aplica la misma regla (`idGrupoPorDefecto`), y la pantalla tiene que
 * coincidir con él: si no, ofrecería borrar un grupo que la función rechaza.
 */
export function marcarPorDefecto(grupos: readonly Grupo[]): readonly Grupo[] {
  if (grupos.some((g) => g.porDefecto)) return grupos;
  const nombre = (g: Grupo) =>
    g.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const elDeTodos = grupos.find((g) => nombre(g) === 'invitados');
  return grupos.map((g) => (g === elDeTodos ? { ...g, porDefecto: true } : g));
}

/**
 * Cuántos invitados hay en cada grupo.
 *
 * Solo titulares y acompañantes que ya están en la lista: es lo que la pareja
 * cuenta cuando piensa «cuántos de la universidad vienen».
 */
export function miembrosPorGrupo(
  invitados: readonly { readonly groupIds: readonly string[] }[],
): ReadonlyMap<string, number> {
  const cuenta = new Map<string, number>();
  for (const invitado of invitados) {
    for (const id of invitado.groupIds) cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
  }
  return cuenta;
}

/**
 * ¿Esta selección mete al invitado en dos grupos restringidos?
 *
 * La decide el servidor; esto es solo para avisar **antes** de guardar, en el
 * formulario, en vez de dejar que la pareja se entere por el error.
 */
export function dosRestringidos(ids: readonly string[], grupos: readonly Grupo[]): boolean {
  return grupos.filter((g) => ids.includes(g.id) && g.photoAudience === 'restricted').length > 1;
}

/**
 * Sube o baja un grupo. Devuelve la lista nueva con los `order` al día.
 *
 * Botones y no arrastrar: se usa desde el móvil con el pulgar y un lector de
 * pantalla puede manejarlo. Arrastrar es PL.7c y es otra discusión (D-29).
 */
export function moverGrupo(
  grupos: readonly Grupo[],
  id: string,
  direccion: -1 | 1,
): readonly Grupo[] {
  const desde = grupos.findIndex((g) => g.id === id);
  if (desde < 0) return grupos;

  const hasta = desde + direccion;
  if (hasta < 0 || hasta >= grupos.length) return grupos;

  const copia = [...grupos];
  [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
  return copia.map((grupo, indice) => ({ ...grupo, order: indice }));
}
