// GENERADO por tools/tokens.mjs — no editar a mano.
// La fuente de verdad es src/app/design-system/tokens/palette.json.

import type { NpIconName } from '../icons/icon-name.generated';

/** Los cinco estados del vocabulario semántico. Ver docs/REQUISITOS.md §9.1. */
export type NpStatus =
  | 'confirmed'
  | 'pending'
  | 'declined'
  | 'attention'
  | 'info';

/** Icono de cada estado. El color nunca viaja solo: esto es la otra mitad. */
export const NP_STATUS_ICON: Record<NpStatus, NpIconName> = {
  confirmed: 'check-circle',
  pending: 'clock-countdown',
  declined: 'x-circle',
  attention: 'warning',
  info: 'info',
};

/** Para qué sirve cada estado, por si alguien duda al elegir. */
export const NP_STATUS_MEANING: Record<NpStatus, string> = {
  confirmed: 'Confirmado, hecho, pagado, agradecido',
  pending: 'Pendiente, sin respuesta, sin agradecer',
  declined: 'No asiste, descartado, vencido',
  attention: 'Requiere revisión: aforo fuera de rango, presupuesto desviado, cola de moderación',
  info: 'Informativo, neutro, desactivado',
};

/**
 * Colores de categoría: grupos de invitados, categorías de gasto, hitos.
 *
 * Se guarda el **id**, nunca el hexadecimal: el color real sale de la variable
 * `--np-cat-<id>`, que cambia sola entre modo claro y oscuro. Un hexadecimal
 * guardado en el documento se vería igual en los dos, y en uno de ellos mal.
 */
export type NpCategoria =
  | 'rosa'
  | 'coral'
  | 'teja'
  | 'mostaza'
  | 'oliva'
  | 'verde'
  | 'esmeralda'
  | 'turquesa'
  | 'cian'
  | 'celeste'
  | 'azul'
  | 'indigo'
  | 'ciruela';

/** En el orden de la paleta, que es el del círculo cromático. */
export const NP_CATEGORIAS: readonly { readonly id: NpCategoria; readonly nombre: string }[] = [
  { id: 'rosa', nombre: 'Rosa' },
  { id: 'coral', nombre: 'Coral' },
  { id: 'teja', nombre: 'Teja' },
  { id: 'mostaza', nombre: 'Mostaza' },
  { id: 'oliva', nombre: 'Oliva' },
  { id: 'verde', nombre: 'Verde' },
  { id: 'esmeralda', nombre: 'Esmeralda' },
  { id: 'turquesa', nombre: 'Turquesa' },
  { id: 'cian', nombre: 'Cian' },
  { id: 'celeste', nombre: 'Celeste' },
  { id: 'azul', nombre: 'Azul' },
  { id: 'indigo', nombre: 'Índigo' },
  { id: 'ciruela', nombre: 'Ciruela' },
];
