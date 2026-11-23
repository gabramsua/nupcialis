import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { montarConLlamadas, puertaDePrueba, type LlamadaRegistrada } from '../llamadas.testing';
import { leerCola } from './cola-correos';
import { PantallaColaCorreos } from './cola-correos-pantalla';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const COLA = {
  total: 3,
  porEstado: { 'en-cola': 2, enviando: 0, enviado: 1, error: 0 },
  correos: [
    {
      id: 'm1',
      para: ['ana@ejemplo.com'],
      asunto: 'Ya tenéis vuestra web',
      plantilla: 'parejaAcceso',
      weddingId: 'w1',
      estado: 'en-cola',
      error: '',
      creadoMs: 1_700_000_000_000,
    },
    {
      id: 'm2',
      para: ['leo@ejemplo.com'],
      asunto: 'Elige una contraseña nueva',
      plantilla: 'parejaRestablecer',
      weddingId: 'w1',
      estado: 'en-cola',
      error: '',
      creadoMs: 1_700_000_100_000,
    },
  ],
};

describe('la cola de correos', () => {
  it('dice cuántos correos hay y cuáles son, y avisa de que no salen solos', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaColaCorreos,
      puertaDePrueba({ listMailQueue: () => COLA }),
    );

    expect(p.texto()).toContain('3 correos en la cola en total');
    expect(p.texto()).toContain('ana@ejemplo.com');
    expect(p.texto()).toContain('Elige una contraseña nueva');
    expect(p.texto()).toContain('Bienvenida a los novios');
    expect(p.texto()).toContain('Hay correos sin enviar');
  });

  it('descartar un correo lo manda al servidor y vuelve a leer la cola', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      PantallaColaCorreos,
      puertaDePrueba(
        { listMailQueue: () => COLA, discardMailItem: () => ({ ok: true }) },
        registro,
      ),
    );

    await p.pulsar(p.boton('Descartar'));

    expect(registro.find((r) => r.nombre === 'discardMailItem')?.datos).toEqual({ id: 'm1' });
    expect(registro.filter((r) => r.nombre === 'listMailQueue')).toHaveLength(2);
  });

  it('una cola vacía lo dice', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaColaCorreos,
      puertaDePrueba({
        listMailQueue: () => ({ total: 0, porEstado: {}, correos: [] }),
      }),
    );
    expect(p.texto()).toContain('La cola está vacía.');
  });
});

describe('leerCola', () => {
  it('descarta lo que no cuadra y no se fía de estados raros', () => {
    const c = leerCola({
      total: 1,
      correos: [{ id: '' }, { id: 'x', estado: 'rarísimo', para: ['a@b.c', 5] }],
    });
    expect(c?.correos).toHaveLength(1);
    expect(c?.correos[0]).toMatchObject({ estado: 'en-cola', para: ['a@b.c'] });
    expect(leerCola('basura')).toBeNull();
  });
});
