import { describe, expect, it } from 'vitest';

import { traducir } from './invitados-gateway.firebase';

/**
 * La traducción de los errores de las invocables.
 *
 * Se prueba aquí y no desde la pantalla porque en la pantalla la puerta viene
 * doblada y esta función no llega a ejecutarse — que es exactamente cómo se
 * coló el «Unauthenticated [401]» que vio la pareja.
 */
function error(code: string, details?: unknown, message = 'mensaje del SDK') {
  return { code, message, details };
}

describe('traducir', () => {
  it('un 401 es App Check, no un error genérico', () => {
    // El caso más común de todos mientras se desarrolla contra el proyecto
    // real. Si esto deja de ser `sin-verificar`, la pantalla vuelve a enseñar
    // el código crudo y nadie sabe qué tocar.
    expect(traducir(error('functions/unauthenticated'))).toEqual({ tipo: 'sin-verificar' });
  });

  it('un permiso denegado es un permiso denegado', () => {
    expect(traducir(error('functions/permission-denied'))).toEqual({ tipo: 'sin-permiso' });
  });

  it('los campos inválidos llegan con su motivo, para poder explicarlos uno a uno', () => {
    const fallo = traducir(
      error('functions/invalid-argument', {
        motivos: [
          { campo: 'fullName', motivo: 'ausente' },
          { campo: 'phone', motivo: 'no-es-telefono' },
        ],
      }),
    );

    expect(fallo).toEqual({
      tipo: 'datos-invalidos',
      campos: [
        { campo: 'fullName', motivo: 'ausente' },
        { campo: 'phone', motivo: 'no-es-telefono' },
      ],
    });
  });

  it('un duplicado trae a quién se parece y por qué', () => {
    expect(
      traducir(error('functions/already-exists', { duplicadoDe: 'g7', motivo: 'telefono' })),
    ).toEqual({ tipo: 'duplicado', id: 'g7', motivo: 'telefono' });
  });

  it('un titular con acompañantes dice cuántos son', () => {
    expect(traducir(error('functions/failed-precondition', { acompanantes: 3 }))).toEqual({
      tipo: 'con-acompanantes',
      cuantos: 3,
    });
  });

  it('un código que no conocemos conserva el mensaje del servidor', () => {
    // El mensaje de la función suele traer el motivo real; uno genérico nuestro
    // solo lo taparía.
    expect(traducir(error('functions/internal', undefined, 'Firestore no responde'))).toEqual({
      tipo: 'error',
      mensaje: 'Firestore no responde',
    });
  });

  it('aguanta un error sin forma sin lanzar', () => {
    for (const basura of [null, undefined, 'vaya', 42, {}]) {
      expect(() => traducir(basura)).not.toThrow();
      expect(traducir(basura).tipo).toBe('error');
    }
  });

  it('unos detalles corruptos no se cuelan tal cual', () => {
    const fallo = traducir(error('functions/invalid-argument', { motivos: 'no es una lista' }));
    expect(fallo).toEqual({ tipo: 'datos-invalidos', campos: [] });
  });
});
