import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { montarConLlamadas, puertaDePrueba, type LlamadaRegistrada } from '../llamadas.testing';
import { PantallaConsejos } from './consejos-pantalla';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const CONSEJOS = {
  max: 800,
  consejos: [
    { modulo: 'rsvp', texto: 'Poned una fecha límite.', personalizado: false },
    { modulo: 'guests', texto: 'Empezad por la lista larga.', personalizado: true },
  ],
};

describe('los consejos de los módulos', () => {
  it('muestra cada consejo con el nombre de su módulo', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaConsejos,
      puertaDePrueba({ listTips: () => CONSEJOS }),
    );
    expect(p.texto()).toContain('Confirmaciones de asistencia');
    expect(p.raiz.querySelector<HTMLTextAreaElement>('#consejo-rsvp')?.value).toBe(
      'Poned una fecha límite.',
    );
  });

  it('guardar manda el módulo y el texto editado', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      PantallaConsejos,
      puertaDePrueba({ listTips: () => CONSEJOS, saveTip: () => ({ ok: true }) }, registro),
    );

    const area = p.raiz.querySelector<HTMLTextAreaElement>('#consejo-rsvp')!;
    area.value = 'Otro consejo';
    area.dispatchEvent(new Event('input'));
    await p.esperar();
    await p.pulsar(p.boton('Guardar'));

    expect(registro.find((r) => r.nombre === 'saveTip')?.datos).toEqual({
      modulo: 'rsvp',
      texto: 'Otro consejo',
    });
  });

  it('vaciar un consejo avisa de que el módulo no mostrará nada', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaConsejos,
      puertaDePrueba({ listTips: () => CONSEJOS }),
    );
    const area = p.raiz.querySelector<HTMLTextAreaElement>('#consejo-rsvp')!;
    area.value = '';
    area.dispatchEvent(new Event('input'));
    await p.esperar();
    expect(p.texto()).toContain('Sin consejo');
  });

  it('«Volver al original» solo en los editados', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      PantallaConsejos,
      puertaDePrueba({ listTips: () => CONSEJOS, resetTip: () => ({ ok: true }) }, registro),
    );
    const botones = [...p.raiz.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('Volver al original'),
    );
    expect(botones).toHaveLength(1);
    await p.pulsar(botones[0]);
    expect(registro.find((r) => r.nombre === 'resetTip')?.datos).toEqual({ modulo: 'guests' });
  });
});
