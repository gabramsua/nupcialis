import { describe, expect, it } from 'vitest';
import { MENSAJES_AUTH } from './auth-gateway';
import { traducirErrorAuth } from '../firebase/auth-gateway.firebase';

describe('traducirErrorAuth', () => {
  it.each([
    ['auth/invalid-credential', 'credenciales-invalidas'],
    ['auth/wrong-password', 'credenciales-invalidas'],
    ['auth/user-not-found', 'credenciales-invalidas'],
    ['auth/invalid-email', 'credenciales-invalidas'],
    ['auth/user-disabled', 'usuario-desactivado'],
    ['auth/too-many-requests', 'demasiados-intentos'],
    ['auth/popup-closed-by-user', 'ventana-cerrada'],
    ['auth/network-request-failed', 'sin-conexion'],
    ['auth/algo-que-no-conocemos', 'desconocido'],
    [undefined, 'desconocido'],
    [42, 'desconocido'],
  ])('%s -> %s', (codigo, esperado) => {
    expect(traducirErrorAuth(codigo)).toBe(esperado);
  });

  it('no distingue usuario inexistente de contraseña incorrecta', () => {
    // Distinguirlos permitiría averiguar qué correos están dados de alta en la
    // plataforma probando uno a uno.
    expect(traducirErrorAuth('auth/user-not-found')).toBe(traducirErrorAuth('auth/wrong-password'));
  });

  it('todos los motivos tienen mensaje', () => {
    for (const motivo of Object.keys(MENSAJES_AUTH)) {
      expect(MENSAJES_AUTH[motivo as keyof typeof MENSAJES_AUTH]).toBeTruthy();
    }
  });
});
