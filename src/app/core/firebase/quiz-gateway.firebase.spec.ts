import { describe, expect, it } from 'vitest';

import { traducirQuiz } from './quiz-gateway.firebase';

describe('traducirQuiz', () => {
  it('sin sesión de invitado no es un error genérico: dice que falta entrar', () => {
    expect(traducirQuiz({ code: 'functions/unauthenticated', message: 'x' })).toEqual({
      tipo: 'sin-sesion',
    });
    expect(traducirQuiz({ code: 'functions/permission-denied', message: 'x' })).toEqual({
      tipo: 'sin-sesion',
    });
  });

  it('faltarle los cuatro dígitos sigue siendo «sin verificar»', () => {
    expect(
      traducirQuiz({ code: 'functions/permission-denied', details: { motivo: 'sin-verificar' } }),
    ).toEqual({ tipo: 'sin-verificar' });
  });

  it('una boda sin preguntas no es un error del invitado', () => {
    expect(
      traducirQuiz({ code: 'functions/failed-precondition', message: 'Esta boda todavía no...' }),
    ).toEqual({ tipo: 'sin-preguntas' });
  });
});
