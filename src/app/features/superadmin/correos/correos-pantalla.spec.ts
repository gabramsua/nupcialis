import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { montarConLlamadas, puertaDePrueba, type LlamadaRegistrada } from '../llamadas.testing';
import { PantallaCorreos } from './correos-pantalla';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const PLANTILLAS = {
  plantillas: [
    {
      id: 'parejaAcceso',
      destinatario: 'novios',
      asunto: 'Bienvenidos',
      cuerpo: 'Hola {novios}',
      marcadores: ['novios', 'enlace'],
      boton: 'Elegir mi contraseña',
      personalizada: false,
    },
    {
      id: 'parejaRestablecer',
      destinatario: 'novios',
      asunto: 'Nueva contraseña',
      cuerpo: 'Hola {novios}',
      marcadores: ['novios', 'enlace'],
      boton: 'Elegir una contraseña nueva',
      personalizada: true,
    },
  ],
};

describe('los correos', () => {
  it('lista las plantillas y carga la primera para editarla', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaCorreos,
      puertaDePrueba({ listEmailTemplates: () => PLANTILLAS }),
    );
    expect(p.texto()).toContain('Bienvenida a los novios');
    expect(p.texto()).toContain('editada');
    expect(p.raiz.querySelector<HTMLInputElement>('input[name="asunto"]')?.value).toBe(
      'Bienvenidos',
    );
    expect(p.texto()).toContain('{novios}');
  });

  it('guarda lo escrito con el id de la plantilla', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      PantallaCorreos,
      puertaDePrueba(
        { listEmailTemplates: () => PLANTILLAS, saveEmailTemplate: () => ({ ok: true }) },
        registro,
      ),
    );

    const asunto = p.raiz.querySelector<HTMLInputElement>('input[name="asunto"]')!;
    asunto.value = 'Nuevo asunto';
    asunto.dispatchEvent(new Event('input'));
    await p.esperar();
    await p.pulsar(p.boton('Guardar'));

    expect(registro.find((r) => r.nombre === 'saveEmailTemplate')?.datos).toMatchObject({
      id: 'parejaAcceso',
      plantilla: { asunto: 'Nuevo asunto', cuerpo: 'Hola {novios}' },
    });
    expect(p.texto()).toContain('Guardado');
  });

  it('la vista previa se enseña dentro de un marco sin permisos', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaCorreos,
      puertaDePrueba({
        listEmailTemplates: () => PLANTILLAS,
        previewEmail: () => ({ asunto: 'Asunto de prueba', html: '<p>Hola Ana</p>', texto: '' }),
      }),
    );
    await p.pulsar(p.boton('Vista previa'));

    expect(p.texto()).toContain('Asunto de prueba');
    const marco = p.raiz.querySelector('iframe');
    expect(marco?.getAttribute('sandbox')).toBe('');
  });

  it('«Volver al original» solo sale en las plantillas editadas', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaCorreos,
      puertaDePrueba({ listEmailTemplates: () => PLANTILLAS }),
    );
    expect(p.boton('Volver al original')).toBeUndefined();

    await p.pulsar(
      [...p.raiz.querySelectorAll<HTMLButtonElement>('.co__item')].find((b) =>
        b.textContent?.includes('reestablecer'),
      ),
    );
    expect(p.boton('Volver al original')).toBeTruthy();
  });
});
