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
