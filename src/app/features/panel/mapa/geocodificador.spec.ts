import { describe, expect, it } from 'vitest';

import { buscarDireccion, leerResultados, urlDeBusqueda } from './geocodificador';

describe('el buscador de direcciones', () => {
  it('pide a Nominatim un máximo de cinco resultados en español', () => {
    const url = new URL(urlDeBusqueda('  Plaza Mayor, Segovia '));

    expect(url.hostname).toBe('nominatim.openstreetmap.org');
    expect(url.searchParams.get('q')).toBe('Plaza Mayor, Segovia');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('accept-language')).toBe('es');
  });

  /** Nominatim manda las coordenadas como texto. */
  it('convierte las coordenadas de texto a número', () => {
    expect(leerResultados([{ display_name: 'Segovia', lat: '40.9429', lon: '-4.1088' }])).toEqual([
      { nombre: 'Segovia', lat: 40.9429, lng: -4.1088 },
    ]);
  });

  /** Lo que viene de fuera no se fía: un resultado roto no puede colocar un pin. */
  it('descarta lo que no tiene nombre o coordenadas que existan', () => {
    expect(
      leerResultados([
        { display_name: '', lat: '40', lon: '-4' },
        { display_name: 'En el mar', lat: '0', lon: '0' },
        { display_name: 'Fuera del mundo', lat: '99', lon: '10' },
        { display_name: 'Sin lon', lat: '40' },
        null,
        'basura',
        { display_name: 'Bueno', lat: '40.5', lon: '-3.5' },
      ]).map((r) => r.nombre),
    ).toEqual(['Bueno']);
  });

  it('una respuesta que no es una lista no da resultados', () => {
    expect(leerResultados({ error: 'x' })).toEqual([]);
    expect(leerResultados(undefined)).toEqual([]);
  });

  it('no busca con menos de tres letras: ni una petición', async () => {
    let llamadas = 0;
    const pedir = (async () => {
      llamadas++;
      return new Response('[]');
    }) as typeof fetch;

    expect(await buscarDireccion('ab', pedir)).toEqual({ ok: false, motivo: 'vacia' });
    expect(llamadas).toBe(0);
  });

  it('devuelve los resultados de una búsqueda que sale bien', async () => {
    const pedir = (async () =>
      new Response(
        JSON.stringify([{ display_name: 'Segovia', lat: '40.9', lon: '-4.1' }]),
      )) as typeof fetch;

    expect(await buscarDireccion('Segovia', pedir)).toEqual({
      ok: true,
      resultados: [{ nombre: 'Segovia', lat: 40.9, lng: -4.1 }],
    });
  });

  it('si la red falla, lo dice en vez de lanzar', async () => {
    const sinRed = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    const caido = (async () => new Response('x', { status: 429 })) as typeof fetch;

    expect(await buscarDireccion('Segovia', sinRed)).toEqual({ ok: false, motivo: 'red' });
    expect(await buscarDireccion('Segovia', caido)).toEqual({ ok: false, motivo: 'red' });
  });
});
