import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_RESPUESTAS,
  type PuertaRespuestas,
  type RespuestaDeLaPareja,
  type ResultadoGuardarRespuesta,
} from '../../../core/rsvp/respuestas-gateway';
import type { Pregunta, Respuestas } from '../../../core/rsvp/rsvp-gateway';
import { abrirDialogosEnPruebas } from '../boda.testing';
import { NpRespuestaDeInvitado } from './respuesta-de-invitado';

/**
 * La pareja contesta por un invitado (D-45).
 *
 * Lo que se vigila:
 *
 * 1. **Solo el estado, solo el estado.** Quien marca «no viene» tras una llamada
 *    no puede mandar de rebote las respuestas de antes: el servidor las
 *    reemplazaría y se perdería lo que escribió a los novios.
 * 2. **El menú depende de la asistencia**, como en el formulario del invitado:
 *    al marcar «no viene» deja de ofrecerse.
 * 3. **Un fallo sale en su pregunta**, no como un aviso genérico.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const ASISTENCIA: Pregunta = {
  id: 'asistencia',
  label: '¿Vendrás?',
  helpText: '',
  type: 'boolean',
  options: [],
  required: true,
  visibleIf: null,
  order: 1,
  target: 'both',
  mapsTo: 'rsvpStatus',
  enabled: true,
};

const MENU: Pregunta = {
  id: 'menu',
  label: 'Menú',
  helpText: '',
  type: 'select',
  options: [
    { value: 'normal', label: 'Normal' },
    { value: 'vegano', label: 'Vegano' },
  ],
  required: true,
  visibleIf: { questionId: 'asistencia', equals: true },
  order: 2,
  target: 'both',
  mapsTo: 'menu',
  enabled: true,
};

const SOLO_TITULAR: Pregunta = {
  id: 'coche',
  label: '¿Venís en coche?',
  helpText: '',
  type: 'text',
  options: [],
  required: false,
  visibleIf: null,
  order: 3,
  target: 'guest',
  mapsTo: null,
  enabled: true,
};

async function montar(
  opciones: {
    estado?: 'pending' | 'confirmed' | 'declined';
    respuestas?: Respuestas;
    esAcompanante?: boolean;
    alGuardar?: () => ResultadoGuardarRespuesta;
  } = {},
) {
  const guardados: { id: string; respuesta: RespuestaDeLaPareja }[] = [];

  const doble: PuertaRespuestas = {
    async leer() {
      return {
        ok: true as const,
        datos: {
          preguntas: [ASISTENCIA, MENU, SOLO_TITULAR],
          invitados: [
            {
              guestId: 'g1',
              nombre: 'Abuela Carmen',
              mote: 'Yaya',
              estado: opciones.estado ?? 'pending',
              cuando: null,
              respuestas: opciones.respuestas ?? {},
            },
          ],
        },
      };
    },
    async guardarEnLote() {
      return { ok: true as const, cambiados: 0, omitidos: 0 };
    },
    async guardar(id, respuesta) {
      guardados.push({ id, respuesta });
      return opciones.alGuardar?.() ?? { ok: true as const, estado: respuesta.estado ?? 'pending' };
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('panel'), { provide: PUERTA_RESPUESTAS, useValue: doble }],
  });

  const fixture = TestBed.createComponent(NpRespuestaDeInvitado);
  fixture.componentRef.setInput('guestId', 'g1');
  fixture.componentRef.setInput('nombre', 'Yaya');
  fixture.componentRef.setInput('esAcompanante', opciones.esAcompanante ?? false);
  const avisos: string[] = [];
  fixture.componentInstance.guardado.subscribe((e) => avisos.push(e));

  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  const estado = (valor: string) =>
    raiz.querySelector<HTMLButtonElement>(`[data-estado="${valor}"]`)!;

  async function pulsar(boton: HTMLElement) {
    boton.click();
    fixture.detectChanges();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  }

  const guardar = () =>
    [...raiz.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')].find((b) =>
      b.textContent?.includes('Guardar'),
    )!;

  return {
    fixture,
    raiz,
    guardados,
    avisos,
    estado,
    pulsar,
    guardar,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
  };
}

describe('la pareja contesta por un invitado', () => {
  beforeAll(abrirDialogosEnPruebas);

  it('parte del estado que ya tiene el invitado', async () => {
    const v = await montar({ estado: 'declined' });
    expect(v.estado('declined').getAttribute('aria-pressed')).toBe('true');
    expect(v.estado('confirmed').getAttribute('aria-pressed')).toBe('false');
  });

  it('los tres estados llevan texto además de color', async () => {
    const v = await montar();
    expect(v.texto()).toContain('Viene');
    expect(v.texto()).toContain('No viene');
    expect(v.texto()).toContain('Sin contestar');
  });

  it('si solo marca «viene», solo se manda el estado', async () => {
    const v = await montar({ respuestas: { mensaje: 'Os quiero' } });

    await v.pulsar(v.estado('confirmed'));
    await v.pulsar(v.guardar());

    expect(v.guardados).toEqual([{ id: 'g1', respuesta: { estado: 'confirmed' } }]);
    expect(v.avisos).toEqual(['confirmed']);
  });

  it('al marcar «viene» aparece el menú, y al marcar «no viene» desaparece', async () => {
    const v = await montar();
    expect(v.texto()).not.toContain('Menú');

    await v.pulsar(v.estado('confirmed'));
    expect(v.texto()).toContain('Menú');

    await v.pulsar(v.estado('declined'));
    expect(v.texto()).not.toContain('Menú');
  });

  it('si toca una pregunta, se mandan el estado y las respuestas', async () => {
    const v = await montar();
    await v.pulsar(v.estado('confirmed'));

    const menu = v.raiz.querySelector<HTMLSelectElement>('#rpi-menu')!;
    menu.value = 'vegano';
    menu.dispatchEvent(new Event('change'));
    v.fixture.detectChanges();

    await v.pulsar(v.guardar());

    expect(v.guardados[0]?.respuesta.estado).toBe('confirmed');
    expect(v.guardados[0]?.respuesta.respuestas).toMatchObject({
      asistencia: true,
      menu: 'vegano',
    });
  });

  it('no ofrece a un acompañante lo que es del titular', async () => {
    const titular = await montar();
    expect(titular.texto()).toContain('¿Venís en coche?');
    TestBed.resetTestingModule();

    const acompanante = await montar({ esAcompanante: true });
    expect(acompanante.texto()).not.toContain('¿Venís en coche?');
  });

  it('un fallo del servidor sale pegado a su pregunta', async () => {
    const v = await montar({
      estado: 'confirmed',
      respuestas: { asistencia: true },
      alGuardar: () => ({
        ok: false,
        fallo: { tipo: 'no-valen', fallos: [{ questionId: 'menu', motivo: 'opcion' }] },
      }),
    });

    const menu = v.raiz.querySelector<HTMLSelectElement>('#rpi-menu')!;
    menu.value = 'vegano';
    menu.dispatchEvent(new Event('change'));
    v.fixture.detectChanges();
    await v.pulsar(v.guardar());

    expect(v.texto()).toContain('Esa opción no está entre las que ofrece el formulario');
    expect(v.avisos).toEqual([]);
  });

  it('un error de red no enseña el código del SDK', async () => {
    const v = await montar({ alGuardar: () => ({ ok: false, fallo: { tipo: 'red' } }) });
    await v.pulsar(v.estado('confirmed'));
    await v.pulsar(v.guardar());

    expect(v.texto()).toContain('no hay conexión');
    expect(v.texto()).not.toContain('functions/');
  });
});
