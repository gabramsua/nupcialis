import { describe, expect, it } from 'vitest';
import { accesoAlPanel, accesoAlSuperadmin, accesoDeInvitado } from './acceso';
import { SESION_ANONIMA, Sesion } from './session';

const owner = (weddingId: string): Sesion => ({
  uid: 'u',
  email: 'a@b.c',
  rol: 'owner',
  weddingId,
  guestId: null,
});
const invitado = (weddingId: string): Sesion => ({
  uid: 'u',
  email: null,
  rol: 'guest',
  weddingId,
  guestId: 'g1',
});
const superadmin: Sesion = {
  uid: 'u',
  email: 'gabriel@nupcialis.com',
  rol: 'superadmin',
  weddingId: null,
  guestId: null,
};

describe('accesoAlPanel', () => {
  it('la pareja entra a su panel', () => {
    expect(accesoAlPanel(owner('w1'), 'w1')).toBe('ok');
  });

  it('la pareja NO entra al panel de otra boda', () => {
    // Pasa de verdad: dos bodas abiertas en el mismo navegador.
    expect(accesoAlPanel(owner('w1'), 'w2')).toBe('otra-boda');
  });

  it('un invitado no entra al panel', () => {
    expect(accesoAlPanel(invitado('w1'), 'w1')).toBe('sin-permiso');
  });

  it('sin sesión, al acceso', () => {
    expect(accesoAlPanel(null, 'w1')).toBe('sin-sesion');
    expect(accesoAlPanel(SESION_ANONIMA, 'w1')).toBe('sin-sesion');
  });

  it('el superadmin entra a cualquier panel', () => {
    expect(accesoAlPanel(superadmin, 'w1')).toBe('ok');
    expect(accesoAlPanel(superadmin, 'w2')).toBe('ok');
  });

  it('sin boda en el host no hay panel al que entrar', () => {
    expect(accesoAlPanel(owner('w1'), null)).toBe('sin-permiso');
  });
});

describe('accesoAlSuperadmin', () => {
  it('solo el superadmin', () => {
    expect(accesoAlSuperadmin(superadmin)).toBe('ok');
    expect(accesoAlSuperadmin(owner('w1'))).toBe('sin-permiso');
    expect(accesoAlSuperadmin(invitado('w1'))).toBe('sin-permiso');
    expect(accesoAlSuperadmin(null)).toBe('sin-sesion');
  });
});

describe('accesoDeInvitado', () => {
  it('un invitado entra a los módulos de su boda', () => {
    expect(accesoDeInvitado(invitado('w1'), 'w1')).toBe('ok');
  });

  it('la pareja también: sube fotos y juega al quiz en su propia boda', () => {
    expect(accesoDeInvitado(owner('w1'), 'w1')).toBe('ok');
  });

  it('un invitado de otra boda, no', () => {
    expect(accesoDeInvitado(invitado('w1'), 'w2')).toBe('otra-boda');
  });

  it('el superadmin no es invitado de nadie', () => {
    // No tiene weddingId, así que no puede subir fotos a una boda ajena
    // haciéndose pasar por invitado.
    expect(accesoDeInvitado(superadmin, 'w1')).toBe('otra-boda');
  });
});
