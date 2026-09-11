import { describe, expect, it } from 'vitest';

import { AVISO_DOMINIOS, avisoDeCupo, conDominio, dominioDeBoda, sinDominio } from './dominios';

describe('dominioDeBoda', () => {
  it('compone el subdominio de la boda', () => {
    expect(dominioDeBoda('maria-y-gabriel', 'nupcialis.com')).toBe('maria-y-gabriel.nupcialis.com');
  });
});

describe('conDominio', () => {
  it('añade el dominio que falta', () => {
    expect(conDominio(['localhost', 'nupcialis.com'], 'boda.nupcialis.com')).toEqual({
      cambia: true,
      dominios: ['localhost', 'nupcialis.com', 'boda.nupcialis.com'],
    });
  });

  // El reintento es lo normal aquí: un alta que falló después de este paso se
  // vuelve a lanzar entera. Si añadiera el dominio dos veces, la lista crecería
  // sin fin y acabaría chocando con el límite del API.
  it('no cambia nada si el dominio ya está', () => {
    const actuales = ['localhost', 'boda.nupcialis.com'];
    expect(conDominio(actuales, 'boda.nupcialis.com')).toEqual({
      cambia: false,
      dominios: actuales,
    });
  });

  it('trata mayúsculas y espacios como el mismo dominio', () => {
    expect(conDominio(['Boda.Nupcialis.com'], '  boda.nupcialis.com ').cambia).toBe(false);
  });

  // Escribir la lista entera es la única operación que ofrece el API. Perder un
  // dominio ajeno en el camino dejaría sin acceso a otra boda ya en marcha.
  it('conserva los dominios que ya estaban', () => {
    const actuales = ['localhost', 'nupcialis.com', 'otra-boda.nupcialis.com'];
    const resultado = conDominio(actuales, 'boda.nupcialis.com');
    for (const previo of actuales) {
      expect(resultado.dominios, previo).toContain(previo);
    }
  });

  it('no añade un dominio vacío', () => {
    expect(conDominio(['localhost'], '   ')).toEqual({ cambia: false, dominios: ['localhost'] });
  });
});

describe('sinDominio', () => {
  it('quita el dominio de una boda archivada', () => {
    expect(sinDominio(['localhost', 'boda.nupcialis.com'], 'boda.nupcialis.com')).toEqual({
      cambia: true,
      dominios: ['localhost'],
    });
  });

  it('no escribe si el dominio ya no estaba', () => {
    expect(sinDominio(['localhost'], 'boda.nupcialis.com').cambia).toBe(false);
  });
});

describe('avisoDeCupo', () => {
  it('calla mientras sobra sitio', () => {
    expect(avisoDeCupo(0)).toBeNull();
    expect(avisoDeCupo(AVISO_DOMINIOS - 1)).toBeNull();
  });

  // El límite real de esta lista no está documentado en ningún sitio. Avisar
  // pronto es lo único que evita descubrirlo el día que un alta falle.
  it('avisa al llegar al umbral', () => {
    expect(avisoDeCupo(AVISO_DOMINIOS)).toContain(String(AVISO_DOMINIOS));
    expect(avisoDeCupo(AVISO_DOMINIOS + 120)).not.toBeNull();
  });
});
