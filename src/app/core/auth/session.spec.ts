import { describe, expect, it } from 'vitest';
import { SESION_ANONIMA, sesionDesdeClaims } from './session';

const UID = 'uid-1';
const MAIL = 'maria@example.com';

describe('sesionDesdeClaims', () => {
  it('construye la sesión de un miembro de la pareja', () => {
    expect(sesionDesdeClaims(UID, MAIL, { weddingId: 'w1', role: 'owner' })).toEqual({
      uid: UID,
      email: MAIL,
      rol: 'owner',
      weddingId: 'w1',
      guestId: null,
    });
  });

  it('construye la sesión de un invitado', () => {
    expect(sesionDesdeClaims(UID, null, { weddingId: 'w1', role: 'guest', guestId: 'g7' })).toEqual(
      { uid: UID, email: null, rol: 'guest', weddingId: 'w1', guestId: 'g7' },
    );
  });

  it('el claim de superadmin manda sobre cualquier otro', () => {
    const s = sesionDesdeClaims(UID, MAIL, {
      superadmin: true,
      weddingId: 'w1',
      role: 'guest',
    });
    expect(s.rol).toBe('superadmin');
    expect(s.weddingId).toBeNull();
  });

  it('sin uid no hay sesión', () => {
    expect(sesionDesdeClaims('', MAIL, { weddingId: 'w1', role: 'owner' })).toEqual(SESION_ANONIMA);
  });

  describe('desconfía de los claims a medias', () => {
    it('un rol sin boda no significa nada', () => {
      expect(sesionDesdeClaims(UID, MAIL, { role: 'owner' }).rol).toBe('anonimo');
    });

    it('una boda sin rol tampoco', () => {
      expect(sesionDesdeClaims(UID, MAIL, { weddingId: 'w1' }).rol).toBe('anonimo');
    });

    it('un invitado sin guestId es un token roto, no un invitado', () => {
      // Sin guestId no puede ni leer su propio documento ni responder al
      // formulario: darle rol de invitado solo llevaría a errores más adentro.
      const s = sesionDesdeClaims(UID, null, { weddingId: 'w1', role: 'guest' });
      expect(s.rol).toBe('anonimo');
      expect(s.weddingId).toBeNull();
    });

    it.each([
      ['un rol inventado', { weddingId: 'w1', role: 'admin' }],
      ['superadmin como cadena, no booleano', { superadmin: 'true' }],
      ['weddingId numérico', { weddingId: 42, role: 'owner' }],
      ['claims vacíos', {}],
    ])('%s acaba en anónimo', (_caso, claims) => {
      expect(sesionDesdeClaims(UID, MAIL, claims).rol).toBe('anonimo');
    });
  });
});
