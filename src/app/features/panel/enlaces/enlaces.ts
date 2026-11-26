/**
 * Los enlaces entre módulos de la pareja (F4.1c), sin red ni Angular.
 *
 * Una tarea cuelga de un proveedor y/o de una partida del presupuesto; una
 * partida cuelga de un proveedor. El enlace es **solo un identificador**: el
 * importe, el estado y el nombre siguen viviendo donde nacieron y aquí solo se
 * resuelven al pintar. Así no hay dos sitios que mantener al día.
 *
 * Un enlace roto —el proveedor se borró— no es un error: se ve como «sin
 * enlace» y, si la pareja guarda la ficha, se limpia solo.
 */

import type { TareaDelPanel } from '../checklist/tareas';
import type { PartidaDelPanel } from '../presupuesto/presupuesto';
import type { ProveedorDelPanel } from '../proveedores/proveedores';

/** El elemento al que apunta un id, o `null` si ya no existe (o no hay id). */
export function resolver<T extends { readonly id: string }>(
  lista: readonly T[],
  id: string | null | undefined,
): T | null {
  if (!id) return null;
  return lista.find((e) => e.id === id) ?? null;
}

/** El id si aún existe en la lista; `''` si no. Es lo que lleva un `<select>`. */
export function idVigente(lista: readonly { readonly id: string }[], id: string | null): string {
  return resolver(lista, id)?.id ?? '';
}

export type ClaveDeEnlace = 'vendorId' | 'budgetItemId';

/** Las tareas colgadas de un proveedor o de una partida: primero las abiertas, por fecha. */
export function tareasEnlazadas(
  tareas: readonly TareaDelPanel[],
  clave: ClaveDeEnlace,
  id: string,
): readonly TareaDelPanel[] {
  return tareas
    .filter((t) => t[clave] === id)
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) ||
        a.title.localeCompare(b.title, 'es'),
    );
}

/** Las tareas que aún no cuelgan de nada por esa clave: lo que se puede enlazar. */
export function tareasLibres(
  tareas: readonly TareaDelPanel[],
  clave: ClaveDeEnlace,
): readonly TareaDelPanel[] {
  return tareas
    .filter((t) => t[clave] === null && !t.done)
    .sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

/** Las partidas del presupuesto que corresponden a un proveedor. */
export function partidasDeProveedor(
  partidas: readonly PartidaDelPanel[],
  vendorId: string,
): readonly PartidaDelPanel[] {
  return partidas.filter((p) => p.vendorId === vendorId);
}

/** Las partidas sin proveedor: lo que se puede enlazar desde la ficha de uno. */
export function partidasLibres(partidas: readonly PartidaDelPanel[]): readonly PartidaDelPanel[] {
  return partidas
    .filter((p) => p.vendorId === null)
    .sort((a, b) => a.concept.localeCompare(b.concept, 'es'));
}

export interface PropuestaDeImportes {
  /** Lo presupuestado por el proveedor, o `null` si no lo hay. */
  readonly estimadoCents: number | null;
  /** El precio acordado, o `null` si todavía no hay. */
  readonly realCents: number | null;
}

/**
 * Lo que la partida puede tomar del proveedor **si la pareja quiere**: nunca se
 * aplica solo. Un 0 en el proveedor es «sin dato», no «cuesta cero».
 */
export function proponerImportes(
  proveedor: Pick<ProveedorDelPanel, 'quotedCents' | 'agreedCents'>,
): PropuestaDeImportes {
  return {
    estimadoCents: proveedor.quotedCents > 0 ? proveedor.quotedCents : null,
    realCents: proveedor.agreedCents > 0 ? proveedor.agreedCents : null,
  };
}
