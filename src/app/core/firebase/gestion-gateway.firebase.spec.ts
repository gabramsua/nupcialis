import { describe, expect, it } from 'vitest';

import { traducirGestion } from './gestion-gateway.firebase';

describe('traducirGestion', () => {
  it.each([
    ['functions/permission-denied', { tipo: 'sin-permiso' }],
    ['functions/unauthenticated', { tipo: 'sin-verificar' }],
    ['functions/unavailable', { tipo: 'red' }],
    ['functions/deadline-exceeded', { tipo: 'red' }],
    ['functions/not-found', { tipo: 'no-existe' }],
  ])('%s', (code, esperado) => {
    expect(traducirGestion({ code })).toEqual(esperado);
  });

  it('distingue una cuenta sin correo de otra precondición', () => {
    expect(
      traducirGestion({ code: 'functions/failed-precondition', details: { motivo: 'sin-correo' } }),
    ).toEqual({ tipo: 'sin-correo' });
    expect(traducirGestion({ code: 'functions/failed-precondition', message: 'x' })).toEqual({
      tipo: 'error',
      mensaje: 'x',
    });
  });

  it('pasa el motivo de un cobro rechazado', () => {
    expect(
      traducirGestion({ code: 'functions/invalid-argument', details: { motivo: 'importe' } }),
    ).toEqual({ tipo: 'invalido', motivo: 'importe' });
  });

  it('un error desconocido no lanza', () => {
    expect(traducirGestion(undefined)).toEqual({ tipo: 'error', mensaje: 'Error desconocido' });
  });
});
