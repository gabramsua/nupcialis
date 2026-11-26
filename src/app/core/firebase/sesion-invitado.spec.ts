import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, type UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import {
  SesionInvitado,
  esPaginaConIdentidad,
  exigirSesionDeInvitado,
  traducirAcceso,
} from './sesion-invitado';

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

describe('exigirSesionDeInvitado (D-56)', () => {
  function guarda(pagina: 'quiz' | 'galeria', identificado: boolean) {
    const recuperar = vi.fn(async () => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SesionInvitado, useValue: { recuperar, identificado: () => identificado } },
      ],
    });
    const resultado = TestBed.runInInjectionContext(() =>
      exigirSesionDeInvitado(pagina)({} as never, {} as never),
    );
    return { recuperar, resultado: Promise.resolve(resultado) };
  }

  it('con sesión, deja pasar (tras esperar a que Auth la recupere)', async () => {
    const { recuperar, resultado } = guarda('quiz', true);
    expect(await resultado).toBe(true);
    expect(recuperar).toHaveBeenCalled();
  });

  it('sin sesión, manda a /entrar con el nombre de la página para volver', async () => {
    const { resultado } = guarda('galeria', false);
    const destino = (await resultado) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(destino)).toBe('/entrar?volver=galeria');
  });
});

describe('esPaginaConIdentidad', () => {
  it('solo las cuatro páginas conocidas', () => {
    expect(esPaginaConIdentidad('quiz')).toBe(true);
    expect(esPaginaConIdentidad('regalos')).toBe(true);
    expect(esPaginaConIdentidad('/admin')).toBe(false);
    expect(esPaginaConIdentidad(undefined)).toBe(false);
  });
});
