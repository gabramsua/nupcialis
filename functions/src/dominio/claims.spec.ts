import { describe, expect, it } from 'vitest';

import { claimsDeBoda, claimsSinBoda, esSuperadmin } from './claims';

describe('claims al cambiar de boda', () => {
  it('una cuenta normal pasa a ser dueña de la boda', () => {
    expect(claimsDeBoda(undefined, 'w1')).toEqual({ weddingId: 'w1', role: 'owner' });
  });

  it('una cuenta que ya era de otra boda cambia de boda', () => {
    expect(claimsDeBoda({ weddingId: 'w0', role: 'owner' }, 'w1')).toEqual({
      weddingId: 'w1',
      role: 'owner',
    });
  });

  // El fallo real: el superadmin usado como correo de una boda de pruebas.
  it('el superadmin conserva el claim al dar de alta una boda con su correo', () => {
    const claims = claimsDeBoda({ superadmin: true }, 'w1');
    expect(claims).toEqual({ superadmin: true, weddingId: 'w1', role: 'owner' });
  });

  it('al borrar la boda, el superadmin sigue siéndolo', () => {
    expect(claimsSinBoda({ superadmin: true, weddingId: 'w1', role: 'owner' })).toEqual({
      superadmin: true,
    });
  });

  it('al borrar la boda, una cuenta normal se queda sin claims', () => {
    expect(claimsSinBoda({ weddingId: 'w1', role: 'owner' })).toBeNull();
    expect(claimsSinBoda(undefined)).toBeNull();
  });

  it('solo cuenta `superadmin: true`, no cualquier valor', () => {
    expect(esSuperadmin({ superadmin: 'true' })).toBe(false);
    expect(esSuperadmin({ superadmin: 1 })).toBe(false);
    expect(esSuperadmin({ superadmin: true })).toBe(true);
  });
});
