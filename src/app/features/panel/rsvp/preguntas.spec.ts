import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { PUERTA_RESPUESTAS, type PuertaRespuestas } from '../../../core/rsvp/respuestas-gateway';
import {
  PUERTA_PREGUNTAS,
  type DatosPregunta,
  type PreguntaDelPanel,
  type PuertaPreguntas,
} from '../../../core/rsvp/preguntas-gateway';
import { BodaStore } from '../boda.store';
import { BODA_DE_PRUEBA } from '../boda.testing';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PreguntasRsvp, opcionesDesdeTexto } from './preguntas';
import { PreguntasStore } from './preguntas.store';
import { SessionStore } from '../../../core/auth/session.store';

/**
 * El editor del formulario, como lo usa la pareja.
 *
 * Lo que se vigila:
 *
 * 1. **Que se vea qué está apagado y qué no se puede borrar.** Sin eso, la
 *    pareja no entiende por qué su formulario tiene cinco preguntas y aquí hay
 *    ocho, y se pelea con un botón de borrar que las reglas van a rechazar.
 * 2. **Que reordenar mande el orden completo**, no un índice suelto.
 * 3. **Que apagar una pregunta no le cambie nada más.** Es un toque y se hace
 *    mucho; si de paso le borrara la aclaración o las opciones, nadie lo
 *    relacionaría.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

/** Por defecto, nadie ha contestado: el aviso de cambio de tipo no salta. */
let respuestasFalsas: PuertaRespuestas = {
  async guardarEnLote() {
    return { ok: true as const, cambiados: 0, omitidos: 0 };
  },
  async guardar() {
    return { ok: true as const, estado: 'confirmed' as const };
  },
  async leer() {
    return { ok: true as const, datos: { preguntas: [], invitados: [] } };
  },
};

function pregunta(parcial: Partial<PreguntaDelPanel> & { id: string }): PreguntaDelPanel {
  return {
    label: parcial.id,
    helpText: '',
    type: 'text',
    options: [],
    required: false,
    target: 'both',
    mapsTo: null,
    visibleIf: null,
    order: 1,
    enabled: true,
    isSystem: false,
    ...parcial,
  };
}

const ASISTENCIA = pregunta({
  id: 'asistencia',
  label: '¿Vendrás a la boda?',
  type: 'boolean',
  required: true,
  mapsTo: 'rsvpStatus',
  isSystem: true,
  order: 1,
});

const MENU = pregunta({
  id: 'menu',
  label: 'Menú',
  type: 'select',
  options: [{ value: 'normal', label: 'Normal' }],
  mapsTo: 'menu',
  isSystem: true,
  visibleIf: { questionId: 'asistencia', equals: true },
  helpText: 'Elige uno',
  order: 2,
});

const CANCION = pregunta({ id: 'cancion', label: 'Canción', enabled: false, order: 3 });

function puertaFalsa(preguntas: readonly PreguntaDelPanel[]) {
  const guardados: DatosPregunta[] = [];
  const borrados: string[] = [];
  const ordenes: readonly string[][] = [];
  const reordenes: string[][] = [];

  const doble: PuertaPreguntas = {
    async listar() {
      return { ok: true, preguntas };
    },
    async guardar(_weddingId, datos) {
      guardados.push(datos);
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      borrados.push(id);
      return { ok: true };
    },
    async reordenar(_weddingId, ids) {
      reordenes.push([...ids]);
      return { ok: true };
    },
  };

  return { guardados, borrados, reordenes, ordenes, doble };
}

function vaciarCola(): Promise<void> {
  return new Promise((listo) => setTimeout(listo, 0));
}

async function montar(
  preguntas: readonly PreguntaDelPanel[] = [ASISTENCIA, MENU, CANCION],
  bodaExtra: Partial<typeof BODA_DE_PRUEBA> = {},
) {
  const puerta = puertaFalsa(preguntas);
  const limites: (Date | null)[] = [];

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      // La pantalla enlaza a las respuestas: sin router, `routerLink` no se
      // puede construir.
      provideRouter([]),
      { provide: PUERTA_PREGUNTAS, useValue: puerta.doble },
      // Cambiar el tipo de una pregunta ya contestada pregunta por las
      // respuestas antes de guardar (F1.8f).
      { provide: PUERTA_RESPUESTAS, useValue: respuestasFalsas },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      {
        provide: BodaStore,
        useValue: {
          boda: () => ({ ...BODA_DE_PRUEBA, ...bodaExtra }),
          async guardarFechaLimite(limite: Date | null) {
            limites.push(limite);
            return true;
          },
        },
      },
      PreguntasStore,
    ],
  });

  const fixture = TestBed.createComponent(PreguntasRsvp);
  fixture.detectChanges();
  await vaciarCola();
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    puerta,
    limites,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    fichas: () => [...raiz.querySelectorAll('.pr__ficha')],
    /** Los botones de una ficha, por el texto que llevan. */
    boton(ficha: Element, texto: string) {
      return [...ficha.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await vaciarCola();
      fixture.detectChanges();
    },
  };
}

describe('el editor del formulario', () => {
  it('enseña las preguntas en su orden', async () => {
    const p = await montar();

    expect(p.fichas().map((f) => f.querySelector('.pr__etiqueta')?.textContent?.trim())).toEqual([
      '¿Vendrás a la boda?',
      'Menú',
      'Canción',
    ]);
  });

  it('marca la que está apagada y las que no se pueden borrar', async () => {
    const p = await montar();
    const fichas = p.fichas();

    expect(fichas[2]!.textContent).toContain('Apagada');
    expect(fichas[0]!.textContent).toContain('No se puede borrar');
    // Y a esas no se les ofrece el botón de borrar, en vez de dejar que
    // choquen contra las reglas.
    expect(p.boton(fichas[0]!, 'Eliminar')).toBeUndefined();
    expect(p.boton(fichas[2]!, 'Eliminar')).toBeDefined();
  });

  it('dice cómo se contesta cada una y a quién se le pregunta', async () => {
    const p = await montar([pregunta({ id: 'bus', type: 'boolean', target: 'guest' })]);

    expect(p.texto()).toContain('Sí o no');
    expect(p.texto()).toContain('Solo al invitado principal');
  });

  it('señala la que solo se pregunta a quien viene', async () => {
    const p = await montar([ASISTENCIA, MENU]);

    expect(p.fichas()[1]!.textContent).toContain('Solo a quien venga');
  });

  /** Un toque, y nada más que eso: apagar no puede cambiarle otra cosa. */
  it('apagar una pregunta conserva todo lo demás', async () => {
    const p = await montar();
    await p.pulsar(p.boton(p.fichas()[1]!, 'Desactivar'));

    expect(p.puerta.guardados).toEqual([
      {
        id: 'menu',
        label: 'Menú',
        helpText: 'Elige uno',
        type: 'select',
        options: [{ value: 'normal', label: 'Normal' }],
        required: false,
        target: 'both',
        soloSiViene: true,
        enabled: false,
        order: 2,
      },
    ]);
  });

  /**
   * F1.8f: cambiar el tipo de una pregunta ya contestada no borra nada, pero
   * deja respuestas con la forma anterior. Lo que no puede pasar es que la
   * pareja se entere después.
   */
  it('avisa de cuántas respuestas hay antes de cambiar el tipo', async () => {
    respuestasFalsas = {
      async guardarEnLote() {
        return { ok: true as const, cambiados: 0, omitidos: 0 };
      },
      async guardar() {
        return { ok: true as const, estado: 'confirmed' as const };
      },
      async leer() {
        return {
          ok: true as const,
          datos: {
            preguntas: [],
            invitados: [
              {
                guestId: 'g1',
                nombre: 'Ana',
                mote: '',
                estado: 'confirmed' as const,
                cuando: '2027-01-10T10:00:00.000Z',
                respuestas: { menu: 'normal' },
              },
              {
                guestId: 'g2',
                nombre: 'Borja',
                mote: '',
                estado: 'confirmed' as const,
                cuando: '2027-01-10T10:00:00.000Z',
                respuestas: { menu: 'normal' },
              },
            ],
          },
        };
      },
    };

    const p = await montar();
    await p.pulsar(p.boton(p.fichas()[1]!, 'Editar'));

    const tipo = p.raiz.querySelector<HTMLSelectElement>('np-modal select')!;
    tipo.value = 'text';
    tipo.dispatchEvent(new Event('change'));
    await vaciarCola();
    p.fixture.detectChanges();

    const guardar = [...p.raiz.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')].at(
      -1,
    )!;
    await p.pulsar(guardar);

    // Primer clic: avisa y **no** guarda.
    expect(p.raiz.querySelector('np-modal')?.textContent).toContain(
      '2 invitados la han contestado',
    );
    expect(p.puerta.guardados).toEqual([]);

    // Segundo clic: ya es la confirmación.
    await p.pulsar(
      [...p.raiz.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')].at(-1)!,
    );

    expect(p.puerta.guardados.at(-1)?.type).toBe('text');

    respuestasFalsas = {
      async guardarEnLote() {
        return { ok: true as const, cambiados: 0, omitidos: 0 };
      },
      async guardar() {
        return { ok: true as const, estado: 'confirmed' as const };
      },
      async leer() {
        return { ok: true as const, datos: { preguntas: [], invitados: [] } };
      },
    };
  });

  it('reordenar manda la lista entera, no un índice', async () => {
    const p = await montar();
    // El de subir de la última: la deja en medio.
    await p.pulsar(p.fichas()[2]!.querySelectorAll<HTMLButtonElement>('button')[0]!);

    expect(p.puerta.reordenes).toEqual([['asistencia', 'cancion', 'menu']]);
  });

  it('la primera no se puede subir y la última no se puede bajar', async () => {
    const p = await montar();
    const primera = p.fichas()[0]!.querySelectorAll('button');
    const ultima = p.fichas()[2]!.querySelectorAll('button');

    expect(primera[0]!.disabled).toBe(true);
    expect(ultima[1]!.disabled).toBe(true);
  });

  it('borra la que sí se puede borrar, después de confirmar', async () => {
    const p = await montar();
    await p.pulsar(p.boton(p.fichas()[2]!, 'Eliminar'));
    const modal = p.raiz.querySelector('np-modal')!;
    expect(modal.textContent).toContain('¿Borrar «Canción»?');

    // El de dentro del modal, que es el que confirma.
    const confirmar = [...modal.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')];
    await p.pulsar(confirmar.find((b) => b.textContent?.includes('Eliminar'))!);

    expect(p.puerta.borrados).toEqual(['cancion']);
  });

  it('guarda el plazo que se elige y lo sabe quitar', async () => {
    const p = await montar();
    const campo = p.raiz.querySelector<HTMLInputElement>('.pr__plazo input')!;

    campo.value = '2027-06-01';
    campo.dispatchEvent(new Event('change'));
    await vaciarCola();

    expect(p.limites[0]?.toISOString()).toBe('2027-06-01T00:00:00.000Z');
  });

  it('sin plazo, dice que se cierra una semana antes de la boda y cuándo (D-66)', async () => {
    const p = await montar();
    // La boda de prueba es el 12 de junio de 2027.
    expect(p.raiz.querySelector('.pr__plazo small')?.textContent).toContain(
      'una semana antes de la boda: el 5 de junio de 2027',
    );
    // Sin plazo propio no hay nada que «volver a poner por defecto».
    expect(p.raiz.querySelector('.pr__plazo button')).toBeNull();
  });

  it('el botón de volver al plazo por defecto va en la misma fila que el campo', async () => {
    const p = await montar(undefined, { rsvpDeadline: new Date('2027-06-01T00:00:00.000Z') });
    const fila = p.raiz.querySelector('.pr__plazo-fila')!;
    expect(fila.querySelector('input')).not.toBeNull();
    expect(fila.querySelector('button')?.textContent).toContain('plazo por defecto');
  });
});

describe('las opciones, una por línea', () => {
  it('convierte el texto en opciones con valor estable', () => {
    expect(opcionesDesdeTexto('Normal\nSin gluten\n  Vegano  ')).toEqual([
      { value: 'normal', label: 'Normal' },
      { value: 'sin-gluten', label: 'Sin gluten' },
      { value: 'vegano', label: 'Vegano' },
    ]);
  });

  it('se salta las líneas vacías', () => {
    expect(opcionesDesdeTexto('A\n\n\nB')).toHaveLength(2);
  });

  it('quita los valores repetidos: dos opciones con el mismo valor mezclarían respuestas', () => {
    expect(opcionesDesdeTexto('Vegano\nVEGANO')).toEqual([{ value: 'vegano', label: 'Vegano' }]);
  });

  it('una etiqueta sin letras ni números no se queda sin valor', () => {
    expect(opcionesDesdeTexto('¿?¡!')).toEqual([{ value: 'opcion', label: '¿?¡!' }]);
  });
});
