import { describe, expect, it } from 'vitest';

import { traducirEstadisticas } from './estadisticas-gateway.firebase';

describe('traducirEstadisticas', () => {
  it('distingue permiso, verificación y red', () => {
    expect(traducirEstadisticas({ code: 'functions/permission-denied' }).tipo).toBe('sin-permiso');
    expect(traducirEstadisticas({ code: 'functions/unauthenticated' }).tipo).toBe('sin-verificar');
    expect(traducirEstadisticas({ code: 'functions/unavailable' }).tipo).toBe('red');
    expect(traducirEstadisticas({ code: 'functions/deadline-exceeded' }).tipo).toBe('red');
  });

  it('un tope fuera de rango es un fallo propio', () => {
    expect(
      traducirEstadisticas({
        code: 'functions/invalid-argument',
        details: { motivo: 'tope-invalido' },
      }).tipo,
    ).toBe('tope-invalido');
  });

  it('un argumento inválido sin motivo es un error con su mensaje', () => {
    expect(
      traducirEstadisticas({ code: 'functions/invalid-argument', message: 'Falta la boda.' }),
    ).toEqual({ tipo: 'error', mensaje: 'Falta la boda.' });
  });

  it('lo desconocido no revienta', () => {
    expect(traducirEstadisticas(undefined).tipo).toBe('error');
  });
});
