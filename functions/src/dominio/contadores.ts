/**
 * Los contadores de la boda.
 *
 * Existen porque el panel enseña "87 confirmados de 120" en la primera pantalla
 * y eso no puede costar una lectura por invitado cada vez que la pareja abre la
 * app. Los mantiene un trigger de servidor; el cliente solo los lee, y las
 * reglas le impiden escribirlos (`noSystemFields`).
 *
 * El recuento es puro y se hace sobre la lista completa, no por incrementos.
 * Un contador incremental se desincroniza a la primera importación masiva o al
 * primer reintento de un trigger, y una vez desincronizado no se arregla solo.
 */

export type EstadoRsvp = 'pending' | 'confirmed' | 'declined';

export interface InvitadoParaContar {
  readonly rsvpStatus?: unknown;
  readonly tableId?: unknown;
  readonly active?: unknown;
  readonly loginCount?: unknown;
  readonly quizPlayCount?: unknown;
}

export interface Contadores {
  readonly guestsTotal: number;
  readonly guestsConfirmed: number;
  readonly guestsDeclined: number;
  readonly guestsPending: number;
  readonly seatsAssigned: number;
  readonly quizPlays: number;
  readonly uniqueLogins: number;
}

export const CONTADORES_VACIOS: Contadores = {
  guestsTotal: 0,
  guestsConfirmed: 0,
  guestsDeclined: 0,
  guestsPending: 0,
  seatsAssigned: 0,
  quizPlays: 0,
  uniqueLogins: 0,
};

function estadoRsvp(valor: unknown): EstadoRsvp {
  return valor === 'confirmed' || valor === 'declined' ? valor : 'pending';
}

function entero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
}

/**
 * Recuenta a partir de la lista de invitados.
 *
 * Un invitado dado de baja (`active: false`) no cuenta para nada. Es el caso de
 * la pareja que borra a un acompañante que otro invitado había añadido: si
 * siguiera contando, el número que se le da al catering vendría inflado.
 */
export function recontar(invitados: readonly InvitadoParaContar[]): Contadores {
  const vivos = invitados.filter((i) => i.active !== false);

  let guestsConfirmed = 0;
  let guestsDeclined = 0;
  let guestsPending = 0;
  let seatsAssigned = 0;
  let quizPlays = 0;
  let uniqueLogins = 0;

  for (const invitado of vivos) {
    switch (estadoRsvp(invitado.rsvpStatus)) {
      case 'confirmed':
        guestsConfirmed += 1;
        break;
      case 'declined':
        guestsDeclined += 1;
        break;
      default:
        guestsPending += 1;
    }

    if (typeof invitado.tableId === 'string' && invitado.tableId !== '') seatsAssigned += 1;
    quizPlays += entero(invitado.quizPlayCount);
    // "Únicos" es cuántos invitados han entrado alguna vez, no cuántas veces se
    // ha entrado: es el número que le dice a la pareja si la web está llegando.
    if (entero(invitado.loginCount) > 0) uniqueLogins += 1;
  }

  return {
    guestsTotal: vivos.length,
    guestsConfirmed,
    guestsDeclined,
    guestsPending,
    seatsAssigned,
    quizPlays,
    uniqueLogins,
  };
}

/** Si nada ha cambiado, no se escribe: cada escritura dispara otra vez el trigger. */
export function contadoresIguales(a: Partial<Contadores> | undefined, b: Contadores): boolean {
  if (!a) return false;
  return (Object.keys(b) as (keyof Contadores)[]).every((clave) => a[clave] === b[clave]);
}
