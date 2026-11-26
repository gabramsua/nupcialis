import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PUERTA_CATALOGOS,
  type PuertaCatalogos,
  type ResultadoCatalogo,
} from '../../../core/superadmin/catalogos-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { abrirDialogosEnPruebas } from '../../panel/boda.testing';
import {
  leerPartida,
  leerPregunta,
  leerTarea,
  porOrden,
  siguienteOrden,
  type PartidaDeCatalogo,
  type PreguntaDeCatalogo,
  type TareaDeCatalogo,
  type TipoCatalogo,
} from './catalogos';
import { PantallaCatalogos } from './catalogos-pantalla';

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const TAREA: TareaDeCatalogo = {
  id: 't1',
  title: 'Reservar la finca',
  category: 'Lugar',
  mesesAntes: 12,
  icon: 'tent',
  priority: 'high',
  order: 1,
  enabled: true,
};

function montar(
  opciones: {
    tareas?: readonly TareaDeCatalogo[];
    partidas?: readonly PartidaDeCatalogo[];
    preguntas?: readonly PreguntaDeCatalogo[];
    falloAlGuardar?: boolean;
  } = {},
) {
  const guardadas: { tipo: TipoCatalogo; id: string | null; elemento: Record<string, unknown> }[] =
    [];
  const borradas: string[] = [];
  const fabrica: TipoCatalogo[] = [];
  const ok = <T>(datos: T): ResultadoCatalogo<T> => ({ ok: true, datos });

  const puerta: PuertaCatalogos = {
    async tareas() {
      return ok(opciones.tareas ?? []);
    },
    async partidas() {
      return ok(opciones.partidas ?? []);
    },
    async preguntas() {
      return ok(opciones.preguntas ?? []);
    },
    async guardar(tipo, id, elemento) {
      if (opciones.falloAlGuardar) {
        return { ok: false, fallo: { tipo: 'invalido', motivo: 'titulo' } };
      }
      guardadas.push({ tipo, id, elemento });
      return ok(null);
    },
    async borrar(_tipo, id) {
      borradas.push(id);
      return ok(null);
    },
    async cargarDeFabrica(tipo) {
      fabrica.push(tipo);
      return ok({ creados: 3 });
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      provideRouter([]),
      { provide: PUERTA_CATALOGOS, useValue: puerta },
    ],
  });

  const fixture = TestBed.createComponent(PantallaCatalogos);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, guardadas, borradas, fabrica };
}

async function asentar(fixture: ReturnType<typeof montar>['fixture']): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function botonPorTexto(el: HTMLElement, texto: string): HTMLButtonElement {
  const boton = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
    (b.textContent ?? '').includes(texto),
  );
  if (!boton) throw new Error(`No hay botón «${texto}»`);
  return boton;
}

function escribir(el: HTMLElement, control: string, valor: string): void {
  const campo = el.querySelector<HTMLInputElement>(
    `[formControlName="${control}"], [data-control="${control}"]`,
  );
  if (!campo) throw new Error(`No hay ${control}`);
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

describe('lectores de catálogo', () => {
  it('descartan lo que no cuadra', () => {
    expect(leerTarea('x', { title: '', category: 'a' })).toBeNull();
    expect(leerTarea('x', null)).toBeNull();
    // La categoría es opcional (D-53): sin ella la tarea sigue viéndose.
    expect(leerTarea('x', { title: 'Sin categoría' })?.category).toBe('');
    expect(leerPartida('x', { category: 'a' })).toBeNull();
    expect(
      leerPregunta('x', { text: 'a', correctAnswer: 'b', wrongAnswers: ['1', '2'] }),
    ).toBeNull();
  });

  it('rellenan lo que falta con valores seguros', () => {
    const t = leerTarea('x', { title: 'A', category: 'B', priority: 'urgente', mesesAntes: -3 });
    expect(t).toMatchObject({ priority: 'normal', mesesAntes: 0, enabled: true });
    const p = leerPartida('x', { category: 'A', concept: 'B', estimatedCents: 12.5 });
    expect(p?.estimatedCents).toBe(0);
  });

  it('ordenan y proponen el siguiente número', () => {
    const lista = [
      { id: 'b', order: 2 },
      { id: 'a', order: 2 },
      { id: 'c', order: 1 },
    ];
    expect(porOrden(lista).map((i) => i.id)).toEqual(['c', 'a', 'b']);
    expect(siguienteOrden(lista)).toBe(3);
    expect(siguienteOrden([])).toBe(1);
  });
});

describe('pantalla de catálogos', () => {
  it('lista las tareas del catálogo', async () => {
    const { fixture, el } = montar({ tareas: [TAREA] });
    await asentar(fixture);

    expect(el.textContent).toContain('Reservar la finca');
    expect(el.textContent).toContain('12 meses antes');
  });

  it('con el catálogo vacío ofrece cargar los de fábrica', async () => {
    const { fixture, el, fabrica } = montar();
    await asentar(fixture);

    botonPorTexto(el, 'Cargar los de fábrica').click();
    await asentar(fixture);

    expect(fabrica).toEqual(['tasks']);
  });

  it('crea una tarea con los meses en coma española y el orden siguiente', async () => {
    const { fixture, el, guardadas } = montar({ tareas: [TAREA] });
    await asentar(fixture);

    botonPorTexto(el, 'Añadir').click();
    fixture.detectChanges();
    escribir(el, 'title', 'Dar el número final');
    escribir(el, 'meses', '0,5');
    botonPorTexto(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas).toEqual([
      {
        tipo: 'tasks',
        id: null,
        elemento: expect.objectContaining({
          title: 'Dar el número final',
          // Sin categoría ni interruptor: se crea activa y sin categoría (D-53).
          category: '',
          mesesAntes: 0.5,
          order: 2,
        }),
      },
    ]);
  });

  it('el formulario de tarea deja elegir icono y lo manda al guardar', async () => {
    const { fixture, el, guardadas } = montar({ tareas: [TAREA] });
    await asentar(fixture);

    botonPorTexto(el, 'Añadir').click();
    fixture.detectChanges();
    escribir(el, 'title', 'Contratar fotógrafo');
    escribir(el, 'meses', '6');
    const radio = el.querySelector<HTMLInputElement>('np-icon-picker input[value="camera"]');
    expect(radio).not.toBeNull();
    radio!.click();
    radio!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    botonPorTexto(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas[0].elemento).toMatchObject({ icon: 'camera' });
  });

  it('edita con el id del elemento y borra con confirmación', async () => {
    const { fixture, el, guardadas, borradas } = montar({ tareas: [TAREA] });
    await asentar(fixture);

    botonPorTexto(el, 'Editar').click();
    fixture.detectChanges();
    escribir(el, 'title', 'Reservar la finca YA');
    botonPorTexto(el, 'Guardar').click();
    await asentar(fixture);
    expect(guardadas[0]).toMatchObject({ tipo: 'tasks', id: 't1' });

    // Borrar pide confirmar.
    const borrar = [...el.querySelectorAll<HTMLButtonElement>('table button')].find((b) =>
      (b.textContent ?? '').includes('Eliminar'),
    );
    borrar?.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Las bodas que ya lo recibieron lo conservan');
    expect(borradas).toHaveLength(0);

    const confirmar = [...el.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')].find(
      (b) => (b.textContent ?? '').includes('Eliminar'),
    );
    confirmar?.click();
    await asentar(fixture);
    expect(borradas).toEqual(['t1']);
  });

  it('el presupuesto manda el importe en céntimos', async () => {
    const { fixture, el, guardadas } = montar();
    await asentar(fixture);

    botonPorTexto(el, 'Presupuesto').click();
    await asentar(fixture);
    botonPorTexto(el, 'Añadir').click();
    fixture.detectChanges();
    escribir(el, 'category', 'Lugar');
    escribir(el, 'concept', 'Finca');
    escribir(el, 'importe', '1.200,50');
    botonPorTexto(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas[0]).toMatchObject({
      tipo: 'budget',
      elemento: { category: 'Lugar', concept: 'Finca', estimatedCents: 120050 },
    });
  });

  it('un importe ilegible no sale hacia el servidor', async () => {
    const { fixture, el, guardadas } = montar();
    await asentar(fixture);

    botonPorTexto(el, 'Presupuesto').click();
    await asentar(fixture);
    botonPorTexto(el, 'Añadir').click();
    fixture.detectChanges();
    escribir(el, 'importe', 'mucho');
    botonPorTexto(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas).toHaveLength(0);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('importe válido');
  });

  it('la pregunta del quiz manda las tres falsas', async () => {
    const { fixture, el, guardadas } = montar();
    await asentar(fixture);

    botonPorTexto(el, 'Preguntas del Trivial').click();
    await asentar(fixture);
    botonPorTexto(el, 'Añadir').click();
    fixture.detectChanges();
    escribir(el, 'text', '¿Dónde nos conocimos?');
    escribir(el, 'correctAnswer', 'Madrid');
    escribir(el, 'falsa1', 'Sevilla');
    escribir(el, 'falsa2', 'Bilbao');
    escribir(el, 'falsa3', 'Cádiz');
    botonPorTexto(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas[0]).toMatchObject({
      tipo: 'quiz',
      elemento: { wrongAnswers: ['Sevilla', 'Bilbao', 'Cádiz'], difficulty: 1 },
    });
  });

  it('enseña el motivo cuando el servidor rechaza el elemento', async () => {
    const { fixture, el } = montar({ falloAlGuardar: true });
    await asentar(fixture);

    botonPorTexto(el, 'Añadir').click();
    fixture.detectChanges();
    botonPorTexto(el, 'Guardar').click();
    await asentar(fixture);

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Escribe el título');
  });
});
