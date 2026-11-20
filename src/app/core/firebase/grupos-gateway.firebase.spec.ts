import { describe, expect, it } from 'vitest';

import { aGrupo, traducirGrupo } from './grupos-gateway.firebase';

/**
 * Se prueba la traducción directamente, no a través de una pantalla: desde una
 * pantalla la puerta viene doblada y esto no se ejecuta. Ya pasó una vez con
 * la de invitados, y el 401 llegó crudo a la pareja.
 */
describe('traducirGrupo', () => {
  it('el conflicto al restringir dice a cuántos afecta', () => {
    expect(
      traducirGrupo({ code: 'functions/failed-precondition', details: { conflictos: 3 } }),
    ).toEqual({ tipo: 'con-conflictos', cuantos: 3 });
  });

  it('borrar el grupo de todos se cuenta como tal, no como un conflicto', () => {
    expect(
      traducirGrupo({ code: 'functions/failed-precondition', details: { motivo: 'por-defecto' } }),
    ).toEqual({ tipo: 'por-defecto' });
  });

  it('los datos inválidos traen cada campo con su motivo', () => {
    expect(
      traducirGrupo({
        code: 'functions/invalid-argument',
        details: { motivos: [{ campo: 'name', motivo: 'repetido' }, 'basura'] },
      }),
    ).toEqual({ tipo: 'datos-invalidos', campos: [{ campo: 'name', motivo: 'repetido' }] });
  });

  it('el permiso denegado de Firestore, que llega sin prefijo, también se entiende', () => {
    expect(traducirGrupo({ code: 'permission-denied' })).toEqual({ tipo: 'sin-permiso' });
  });

  it('un 401 es App Check, no un «Unauthenticated» a secas', () => {
    expect(traducirGrupo({ code: 'functions/unauthenticated' })).toEqual({
      tipo: 'sin-verificar',
    });
  });

  it('lo desconocido conserva el mensaje, que al menos informa', () => {
    expect(traducirGrupo({ code: 'functions/internal', message: 'Se cayó' })).toEqual({
      tipo: 'error',
      mensaje: 'Se cayó',
    });
  });
});

describe('aGrupo', () => {
  it('un color que no está en la paleta no llega a la pantalla', () => {
    // Pintaría `var(--np-cat-#ff0000)`, que no existe: el grupo saldría sin color.
    expect(aGrupo('g', { name: 'X', color: '#ff0000' }).color).toBe('rosa');
  });

  it('una audiencia desconocida se lee como pública, nunca como restringida', () => {
    expect(aGrupo('g', { photoAudience: 'loquesea' }).photoAudience).toBe('public');
  });
});
