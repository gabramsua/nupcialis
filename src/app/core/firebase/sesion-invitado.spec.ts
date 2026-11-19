import { describe, expect, it } from 'vitest';

import { traducirAcceso } from './sesion-invitado';

/**
 * La traducción del error, probada sola.
 *
 * Tiene que ser así y no desde la pantalla: desde un test de pantalla la sesión
 * viene doblada y esto no se ejecuta nunca. Lo comprobé con una mutación —hacer
 * que un «no identificado» devolviera «ese nombre no está en la lista»— y las
 * 325 pruebas siguieron en verde. Es el mismo agujero por el que se coló el
 * «Unauthenticated [401]» en la lista de invitados.
 */
describe('traducirAcceso', () => {
  /**
   * **La propiedad que sostiene la regla 3.** El servidor manda un único
   * `permission-denied` para «esa boda no existe», «ese invitado no está» y
   * «los dígitos no coinciden». Si aquí se abriera en varios casos, la pantalla
   * acabaría diciendo cuál, y eso convierte la web en un buscador de invitados.
   */
  it('un permiso denegado es «no identificado», sin motivo ni mensaje', () => {
    const fallo = traducirAcceso({
      code: 'functions/permission-denied',
      message: 'No hemos podido identificarte.',
      details: { motivo: 'no-existe' },
    });

    expect(fallo).toEqual({ tipo: 'no-identificado' });
    expect(Object.keys(fallo)).toEqual(['tipo']);
  });

  it('lo que no reconocemos también es «no identificado», nunca algo más hablador', () => {
    expect(traducirAcceso({ code: 'functions/not-found', message: 'Ese slug no existe' })).toEqual({
      tipo: 'no-identificado',
    });
    expect(traducirAcceso(null)).toEqual({ tipo: 'no-identificado' });
    expect(traducirAcceso(new Error('vaya'))).toEqual({ tipo: 'no-identificado' });
  });

  it('el límite de intentos trae la espera, que no dice nada de quién está invitado', () => {
    expect(
      traducirAcceso({ code: 'functions/resource-exhausted', details: { esperaMs: 300000 } }),
    ).toEqual({ tipo: 'demasiados-intentos', esperaMs: 300000 });
  });

  it('sin espera en el detalle, un minuto: mejor pasarse que decir cero', () => {
    const fallo = traducirAcceso({ code: 'functions/resource-exhausted' });
    expect(fallo).toEqual({ tipo: 'demasiados-intentos', esperaMs: 60_000 });
  });

  it('un 401 es App Check, y se cuenta aparte porque no lo arregla el invitado', () => {
    expect(traducirAcceso({ code: 'functions/unauthenticated' })).toEqual({
      tipo: 'sin-verificar',
    });
  });

  it('una caída nuestra sí se cuenta como lo que es', () => {
    expect(traducirAcceso({ code: 'functions/unavailable', message: 'se cayó' })).toEqual({
      tipo: 'error',
      mensaje: 'se cayó',
    });
  });
});
