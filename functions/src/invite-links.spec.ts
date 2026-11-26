import { describe, expect, it } from 'vitest';

import { nuevoToken } from './invite-links';
import { pareceToken } from './dominio/acceso';

/**
 * El token del enlace.
 *
 * Lo único que hay que demostrar de un generador de azar es que **no se
 * deriva de nada**: si saliera del `guestId` —que viaja en cualquier captura
 * de pantalla del panel— conocer un id daría el enlace de esa persona.
 */
describe('nuevoToken', () => {
  it('tiene la forma que la puerta reconoce', () => {
    expect(pareceToken(nuevoToken())).not.toBeNull();
  });

  it('cabe en una URL sin escapar nada', () => {
    const token = nuevoToken();

    expect(encodeURIComponent(token)).toBe(token);
  });

  it('no se repite: mil tokens son mil tokens distintos', () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => nuevoToken()));

    expect(tokens.size).toBe(1000);
  });

  it('192 bits en 32 caracteres', () => {
    expect(nuevoToken()).toHaveLength(32);
  });
});
