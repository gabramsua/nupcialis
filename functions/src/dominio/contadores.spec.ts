import { describe, expect, it } from 'vitest';

import {
  CONTADORES_VACIOS,
  contadoresIguales,
  recontar,
  type InvitadoParaContar,
} from './contadores';

describe('recontar', () => {
  it('una boda sin invitados no cuenta nada', () => {
    expect(recontar([])).toEqual(CONTADORES_VACIOS);
  });

  it('reparte los invitados entre confirmados, rechazados y pendientes', () => {
    const invitados: InvitadoParaContar[] = [
      { rsvpStatus: 'confirmed' },
      { rsvpStatus: 'confirmed' },
      { rsvpStatus: 'declined' },
      { rsvpStatus: 'pending' },
      {},
    ];
    const contadores = recontar(invitados);
    expect(contadores.guestsTotal).toBe(5);
    expect(contadores.guestsConfirmed).toBe(2);
    expect(contadores.guestsDeclined).toBe(1);
    expect(contadores.guestsPending).toBe(2);
  });

  // Invariante: los tres estados suman siempre el total. Si no, el panel enseña
  // "87 de 120" con 30 invitados desaparecidos y nadie sabe dónde están.
  it('los tres estados suman siempre el total', () => {
    const invitados: InvitadoParaContar[] = [
      { rsvpStatus: 'confirmed' },
      { rsvpStatus: 'quizá' },
      { rsvpStatus: null },
      { rsvpStatus: 'declined' },
    ];
    const c = recontar(invitados);
    expect(c.guestsConfirmed + c.guestsDeclined + c.guestsPending).toBe(c.guestsTotal);
  });

  it('un estado desconocido cuenta como pendiente', () => {
    expect(recontar([{ rsvpStatus: 'tal vez' }]).guestsPending).toBe(1);
  });

  // El acompañante que la pareja da de baja no puede seguir contando: ese número
  // es el que se le pasa al catering.
  it('los invitados dados de baja no cuentan', () => {
    const contadores = recontar([
      { rsvpStatus: 'confirmed', active: true },
      { rsvpStatus: 'confirmed', active: false },
    ]);
    expect(contadores.guestsTotal).toBe(1);
    expect(contadores.guestsConfirmed).toBe(1);
  });

  it('cuenta las sillas asignadas, no las mesas', () => {
    const contadores = recontar([
      { tableId: 'mesa-1' },
      { tableId: 'mesa-1' },
      { tableId: null },
      { tableId: '' },
    ]);
    expect(contadores.seatsAssigned).toBe(2);
  });

  it('suma las partidas al quiz y cuenta una sola vez a quien entra muchas veces', () => {
    const contadores = recontar([
      { loginCount: 12, quizPlayCount: 4 },
      { loginCount: 1, quizPlayCount: 1 },
      { loginCount: 0, quizPlayCount: 0 },
    ]);
    expect(contadores.quizPlays).toBe(5);
    expect(contadores.uniqueLogins).toBe(2);
  });

  it('ignora números imposibles en lugar de propagarlos', () => {
    const contadores = recontar([
      { loginCount: -3, quizPlayCount: Number.NaN },
      { quizPlayCount: 2.7 },
    ]);
    expect(contadores.uniqueLogins).toBe(0);
    expect(contadores.quizPlays).toBe(2);
  });
});

describe('contadoresIguales', () => {
  it('detecta que no hay nada que escribir', () => {
    expect(contadoresIguales({ ...CONTADORES_VACIOS }, CONTADORES_VACIOS)).toBe(true);
  });

  it('una boda sin contadores todavía nunca está igual', () => {
    expect(contadoresIguales(undefined, CONTADORES_VACIOS)).toBe(false);
  });

  it('detecta el cambio de un solo campo', () => {
    expect(contadoresIguales({ ...CONTADORES_VACIOS, quizPlays: 1 }, CONTADORES_VACIOS)).toBe(
      false,
    );
  });
});
