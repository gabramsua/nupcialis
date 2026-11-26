import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import type { Recordatorio } from './gestion';
import { crearMontaje } from './gestion.testing';
import { PantallaRecordatorios } from './recordatorios-pantalla';

const montar = crearMontaje(
  JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>,
);

/**
 * Los recordatorios de después de la boda.
 *
 * 1. **Los vencidos van primero**, agrupados y con su situación en texto.
 * 2. **El texto sale con los nombres y la dirección de esa boda.**
 * 3. **Marcar manda la boda y la clave**, y vuelve a leer del servidor.
 * 4. Nada de esto envía un correo: solo copia y marca.
 */

function aviso(parcial: Partial<Recordatorio> = {}): Recordatorio {
  return {
    weddingId: 'w1',
    key: 'encuesta',
    destino: 'pareja',
    dueOn: '2026-11-10',
    situacion: 'vencido',
    slug: 'maria-y-gabriel',
    couple: { partnerA: 'María', partnerB: 'Gabriel' },
    weddingDay: '2026-09-11',
    ...parcial,
  };
}

describe('los recordatorios', () => {
  it('agrupa por situación y la dice con palabras', async () => {
    const p = await montar(PantallaRecordatorios, {
      recordatorios: async () => ({
        ok: true,
        datos: [
          aviso(),
          aviso({ key: 'agradecimiento', situacion: 'proximo', dueOn: '2026-11-25' }),
          aviso({ key: 'cierre-pareja', situacion: 'enviado' }),
        ],
      }),
    });
    const t = p.texto();
    expect(t).toContain('Vencidos');
    expect(t).toContain('Próximos');
    expect(t).toContain('Enviados');
    expect(t).toContain('Toca ya');
    expect(t.indexOf('Vencidos')).toBeLessThan(t.indexOf('Próximos'));
    expect(t.indexOf('Próximos')).toBeLessThan(t.indexOf('Enviados'));
  });

  it('distingue lo que es para la pareja de lo que es tarea tuya', async () => {
    const p = await montar(PantallaRecordatorios, {
      recordatorios: async () => ({
        ok: true,
        datos: [aviso(), aviso({ key: 'cierre-superadmin', destino: 'superadmin' })],
      }),
    });
    expect(p.texto()).toContain('Para la pareja');
    expect(p.texto()).toContain('Para ti');
  });

  it('el texto sale con los nombres y la dirección de esa boda', async () => {
    const p = await montar(PantallaRecordatorios, {
      recordatorios: async () => ({
        ok: true,
        datos: [aviso({ key: 'cierre-pareja' })],
      }),
    });
    await p.pulsar(p.boton('Ver texto'));
    const pre = p.raiz.querySelector('pre')?.textContent ?? '';
    expect(pre).toContain('María y Gabriel');
    expect(pre).toContain('https://maria-y-gabriel.nupcialis.com');
  });

  it('copiar manda el texto al portapapeles', async () => {
    const escribir = vi.fn<(texto: string) => Promise<void>>(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText: escribir } });

    const p = await montar(PantallaRecordatorios, {
      recordatorios: async () => ({ ok: true, datos: [aviso()] }),
    });
    await p.pulsar(p.boton('Copiar'));

    expect(escribir).toHaveBeenCalledOnce();
    expect(String(escribir.mock.calls[0]?.[0])).toContain('María y Gabriel');
    vi.unstubAllGlobals();
  });

  it('marcar manda la boda y la clave, y vuelve a leer', async () => {
    const marcas: [string, string, boolean][] = [];
    let lecturas = 0;
    const p = await montar(PantallaRecordatorios, {
      recordatorios: async () => {
        lecturas += 1;
        return {
          ok: true,
          datos: [aviso({ situacion: lecturas > 1 ? 'enviado' : 'vencido' })],
        };
      },
      marcarRecordatorio: async (weddingId, key, enviado) => {
        marcas.push([weddingId, key, enviado]);
        return { ok: true, datos: null };
      },
    });

    await p.pulsar(p.boton('Marcar como enviado'));

    expect(marcas).toEqual([['w1', 'encuesta', true]]);
    expect(lecturas).toBe(2);
    expect(p.boton('Desmarcar')).toBeTruthy();
  });

  it('si marcar falla, lo dice y no pierde la lista', async () => {
    const p = await montar(PantallaRecordatorios, {
      recordatorios: async () => ({ ok: true, datos: [aviso()] }),
      marcarRecordatorio: async () => ({ ok: false, fallo: { tipo: 'red' } }),
    });
    await p.pulsar(p.boton('Marcar como enviado'));
    expect(p.texto()).toContain('No se ha podido cambiar la marca');
    expect(p.texto()).toContain('Encuesta de satisfacción');
  });

  it('sin avisos, lo dice', async () => {
    const p = await montar(PantallaRecordatorios, {
      recordatorios: async () => ({ ok: true, datos: [] }),
    });
    expect(p.texto()).toContain('No hay nada pendiente');
  });

  it('un fallo de lectura deja reintentar', async () => {
    const p = await montar(PantallaRecordatorios, {
      recordatorios: async () => ({ ok: false, fallo: { tipo: 'red' } }),
    });
    expect(p.texto()).toContain('No se han podido cargar los recordatorios');
    expect(p.texto()).toContain('Reintentar');
  });
});
