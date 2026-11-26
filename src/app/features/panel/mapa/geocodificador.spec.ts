import { describe, expect, it, vi } from 'vitest';

import {
  buscarDireccion,
  coordenadasDeEnlace,
  leerResultados,
  urlDeBusqueda,
} from './geocodificador';

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

describe('los enlaces de Google Maps pegados', () => {
  it('lee las coordenadas de las formas largas', () => {
    const esperado = { lat: 40.4168, lng: -3.7038 };
    expect(
      coordenadasDeEnlace('https://www.google.com/maps/place/Madrid/@40.4168,-3.7038,12z/data=x'),
    ).toEqual(esperado);
    expect(
      coordenadasDeEnlace('https://www.google.com/maps/place/X/data=!3d40.4168!4d-3.7038'),
    ).toEqual(esperado);
    expect(coordenadasDeEnlace('https://maps.google.com/?q=40.4168,-3.7038')).toEqual(esperado);
    expect(coordenadasDeEnlace('https://maps.google.com/?ll=40.4168%2C-3.7038')).toEqual(esperado);
  });

  it('no inventa nada con lo que no es un enlace o no trae coordenadas', () => {
    expect(coordenadasDeEnlace('Plaza Mayor, Segovia')).toBeNull();
    expect(coordenadasDeEnlace('https://maps.app.goo.gl/abc123')).toBeNull();
    expect(coordenadasDeEnlace('https://www.google.com/maps/@0,0,12z')).toBeNull();
    expect(coordenadasDeEnlace('https://www.google.com/maps/@95.1,10.2,12z')).toBeNull();
  });

  it('buscarDireccion resuelve un enlace sin llamar a la red', async () => {
    const pedir = vi.fn();
    const r = await buscarDireccion('https://www.google.com/maps/@40.5,-3.5,15z', pedir);
    expect(pedir).not.toHaveBeenCalled();
    expect(r).toEqual({
      ok: true,
      resultados: [{ nombre: '40.50000, -3.50000', lat: 40.5, lng: -3.5 }],
    });
  });
});
