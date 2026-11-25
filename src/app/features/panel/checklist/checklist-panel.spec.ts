import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_TAREAS,
  type DatosTarea,
  type PuertaTareas,
} from '../../../core/checklist/tareas-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { BODA_DE_PRUEBA, abrirDialogosEnPruebas } from '../boda.testing';
import { doblesDeEnlaces } from '../enlaces/dobles-enlaces.testing';

import { BodaStore } from '../boda.store';
import { PanelChecklist } from './checklist-panel';
import type { TareaDelPanel } from './tareas';
import { TareasStore } from './tareas.store';

/**
 * La lista de tareas, vista como la ve la pareja.
 *
 * Lo que se vigila:
 *
 * 1. **Que lo urgente salga primero y se diga con palabras**, no solo con color.
 * 2. **Que el filtro por persona enseñe lo suyo y lo de los dos.**
 * 3. **Que marcar una tarea sea un toque** y la mande a «Hechas».
 * 4. **Que una tarea sin título no se guarde**, y que borrar pida segundo toque.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const hoy = new Date();
const en = (dias: number) =>
  new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));

function t(parcial: Partial<TareaDelPanel> & { id: string }): TareaDelPanel {
  return {
    title: `Tarea ${parcial.id}`,
    description: '',
    category: 'Invitados',
    dueDate: null,
    done: false,
    doneAt: null,
    doneByUid: null,
    doneByEmail: null,
    assignedTo: 'both',
    vendorId: null,
    budgetItemId: null,
    priority: 'normal',
    icon: 'list-checks',
    order: 1,
    ...parcial,
  };
}

async function montar(inicial: readonly TareaDelPanel[]) {
  const guardadas: DatosTarea[] = [];
  const marcadas: { id: string; hecha: boolean; por: { uid: string; email: string | null } }[] = [];
  const borradas: string[] = [];
  let lista = [...inicial];

  const doble: PuertaTareas = {
    async listar() {
      return { ok: true, tareas: lista };
    },
    async guardar(_w, datos) {
      guardadas.push(datos);
      return { ok: true };
    },
    async marcar(_w, id, hecha, por) {
      marcadas.push({ id, hecha, por });
      return { ok: true };
    },
    async enlazar() {
      return { ok: true };
    },
    async borrar(_w, id) {
      borradas.push(id);
      lista = lista.filter((x) => x.id !== id);
      return { ok: true };
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
      ...doblesDeEnlaces().providers,
      { provide: PUERTA_TAREAS, useValue: doble },
      {
        provide: SessionStore,
        useValue: {
          weddingId: () => 'w1',
          sesion: () => ({ uid: 'u1', email: 'maria@ejemplo.com' }),
        },
      },
      { provide: BodaStore, useValue: { boda: () => BODA_DE_PRUEBA } },
      TareasStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelChecklist);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  const esperar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };

  return {
    fixture,
    raiz,
    guardadas,
    marcadas,
    borradas,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    titulos: () =>
      [...raiz.querySelectorAll('.tk__tarea strong')].map((e) => e.textContent?.trim()),
    grupos: () => [...raiz.querySelectorAll('.tk__grupo h3')].map((e) => e.textContent?.trim()),
    async pulsar(elemento: Element) {
      (elemento as HTMLElement).click();
      await esperar();
    },
    boton(donde: ParentNode, texto: string) {
      return [...donde.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;
    },
    escribir(selector: string, valor: string) {
      const campo = raiz.querySelector(selector) as HTMLInputElement;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    },
  };
}

const EJEMPLO = [
  t({ id: 'hecha', title: 'Ya hecha', done: true, dueDate: en(-20) }),
  t({ id: 'lejos', title: 'Más adelante', dueDate: en(90), assignedTo: 'B' }),
  t({ id: 'vencida', title: 'Vencida', dueDate: en(-3), assignedTo: 'A', priority: 'high' }),
  t({ id: 'pronto', title: 'Para esta semana', dueDate: en(4) }),
  t({ id: 'sin', title: 'Sin fecha' }),
];

describe('las tareas en el panel', () => {
  it('agrupa por urgencia y deja lo hecho escondido', async () => {
    const p = await montar(EJEMPLO);

    expect(p.grupos().map((g) => g?.replace(/\d+$/, '').trim())).toEqual([
      'Vencidas',
      'Esta semana',
      'Próximas',
      'Sin fecha',
    ]);
    expect(p.titulos()).not.toContain('Ya hecha');
    expect(p.texto()).toContain('Ver las hechas (1)');
  });

  it('dice el plazo con palabras y marca lo prioritario', async () => {
    const p = await montar(EJEMPLO);
    const t = p.texto();

    expect(t).toContain('vencida hace 3 días');
    expect(t).toContain('faltan 4 días');
    expect(t).toContain('Prioritaria');
  });

  it('cuenta lo hecho y lo que quema arriba', async () => {
    const p = await montar(EJEMPLO);
    const t = p.texto();

    expect(t).toContain('1 de 5 hechas');
    expect(t).toContain('Vencidas 1');
    expect(t).toContain('Esta semana 1');
  });

  it('el filtro de una persona enseña lo suyo y lo de los dos, con su nombre', async () => {
    const p = await montar(EJEMPLO);
    const filtros = [...p.raiz.querySelectorAll('.tk__filtro')];
    expect(filtros.map((f) => f.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Todas 5',
      'María 4',
      'Gabriel 4',
    ]);

    await p.pulsar(filtros[1]!);
    expect(p.titulos()).toEqual(['Vencida', 'Para esta semana', 'Sin fecha']);

    await p.pulsar(filtros[2]!);
    expect(p.titulos()).toEqual(['Para esta semana', 'Más adelante', 'Sin fecha']);
  });

  it('filtra por estado, categoría y texto, y se pueden quitar', async () => {
    const p = await montar([
      t({ id: 'a', title: 'Contratar fotógrafo', category: 'Proveedores', dueDate: en(-3) }),
      t({ id: 'b', title: 'Lista de invitados', category: 'Invitados', dueDate: en(20) }),
      t({ id: 'c', title: 'Reservar la finca', category: 'Lugar', done: true }),
    ]);
    const cambiar = async (selector: string, valor: string, evento: string) => {
      const campo = p.raiz.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
      campo.value = valor;
      campo.dispatchEvent(new Event(evento));
      await p.pulsar(p.raiz.querySelector('.tk__buscar')!);
    };

    await cambiar('.tk__buscar input[type="search"]', 'FOTOGRAFO', 'input');
    expect(p.titulos()).toEqual(['Contratar fotógrafo']);

    await p.pulsar(p.boton(p.raiz, 'Quitar filtros'));
    expect(p.titulos()).toEqual(['Contratar fotógrafo', 'Lista de invitados']);

    await cambiar('.tk__buscar select:nth-of-type(1)', 'vencidas', 'change');
    expect(p.titulos()).toEqual(['Contratar fotógrafo']);

    await p.pulsar(p.boton(p.raiz, 'Quitar filtros'));
    await cambiar('.tk__buscar select:nth-of-type(1)', 'hechas', 'change');
    // Filtrar por «hechas» las enseña sin tener que abrir el desplegable.
    expect(p.titulos()).toEqual(['Reservar la finca']);

    await p.pulsar(p.boton(p.raiz, 'Quitar filtros'));
    const categoria = [...p.raiz.querySelectorAll('.tk__buscar select')][1] as HTMLSelectElement;
    categoria.value = 'Invitados';
    categoria.dispatchEvent(new Event('change'));
    await p.pulsar(p.raiz.querySelector('.tk__buscar')!);
    expect(p.titulos()).toEqual(['Lista de invitados']);

    await cambiar('.tk__buscar input[type="search"]', 'zzz', 'input');
    expect(p.texto()).toContain('Ninguna tarea coincide');
  });

  it('una tarea hecha dice cuándo y quién la completó', async () => {
    const p = await montar([
      t({
        id: 'h',
        title: 'Hecha por Gabriel',
        done: true,
        doneAt: new Date('2027-03-03T10:00:00Z'),
        doneByUid: 'u2',
        doneByEmail: 'gabriel@ejemplo.com',
      }),
      t({ id: 'v', title: 'Hecha antes', done: true, doneAt: new Date('2027-03-01T10:00:00Z') }),
    ]);
    await p.pulsar(p.boton(p.raiz, 'Ver las hechas'));

    expect(p.texto()).toContain('Completada el 3 de marzo de 2027 por gabriel@ejemplo.com');
    // Las anteriores a D-47 no tienen autor: solo la fecha, sin inventarlo.
    expect(p.texto()).toContain('Completada el 1 de marzo de 2027');
  });

  it('marcar una tarea la manda a hechas y lo guarda', async () => {
    const p = await montar(EJEMPLO);
    const marca = p.raiz.querySelector('.tk__marca') as HTMLButtonElement;
    expect(marca.getAttribute('aria-label')).toContain('Marcar como hecha');

    await p.pulsar(marca);

    expect(p.marcadas).toEqual([
      { id: 'vencida', hecha: true, por: { uid: 'u1', email: 'maria@ejemplo.com' } },
    ]);
    expect(p.titulos()).not.toContain('Vencida');
    expect(p.texto()).toContain('Ver las hechas (2)');
  });

  it('ver las hechas las enseña tachadas y se pueden volver a abrir', async () => {
    const p = await montar(EJEMPLO);
    await p.pulsar(p.boton(p.raiz, 'Ver las hechas'));

    expect(p.titulos()).toContain('Ya hecha');
    const hecha = p.raiz.querySelector('.tk__hecha');
    expect(hecha?.textContent).toContain('Ya hecha');

    const marcaHecha = [...p.raiz.querySelectorAll('.tk__marca')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )!;
    expect(marcaHecha.getAttribute('aria-label')).toContain('Volver a pendiente');
    await p.pulsar(marcaHecha);
    expect(p.marcadas).toEqual([
      { id: 'hecha', hecha: false, por: { uid: 'u1', email: 'maria@ejemplo.com' } },
    ]);
  });

  it('una tarea nueva se guarda con su responsable y su fecha', async () => {
    const p = await montar(EJEMPLO);
    await p.pulsar(p.boton(p.raiz, 'Añadir tarea'));

    p.escribir('dialog input[formcontrolname="title"]', '  Probar el menú  ');
    p.escribir('dialog input[type="date"]', '2027-04-01');
    // Los tres primeros radios son el responsable: María, Gabriel, los dos.
    await p.pulsar(p.raiz.querySelectorAll('dialog input[type="radio"]')[1]!);
    await p.pulsar(p.boton(p.raiz.querySelector('dialog')!, 'Guardar'));

    expect(p.guardadas).toHaveLength(1);
    expect(p.guardadas[0]).toMatchObject({
      title: '  Probar el menú  ',
      assignedTo: 'B',
      priority: 'normal',
    });
    expect(p.guardadas[0]?.dueDate?.toISOString()).toBe('2027-04-01T00:00:00.000Z');
    expect(p.guardadas[0]?.id).toBeUndefined();
  });

  it('una tarea sin título no se guarda y lo dice', async () => {
    const p = await montar(EJEMPLO);
    await p.pulsar(p.boton(p.raiz, 'Añadir tarea'));
    await p.pulsar(p.boton(p.raiz.querySelector('dialog')!, 'Guardar'));

    expect(p.guardadas).toEqual([]);
    expect(p.raiz.querySelector('dialog')?.textContent).toContain('Escribe qué hay que hacer');
  });

  it('editar abre la tarea con sus datos y guarda con su id', async () => {
    const p = await montar(EJEMPLO);
    const editar = p.raiz.querySelector('button[aria-label^="Editar"]') as HTMLButtonElement;
    await p.pulsar(editar);

    const titulo = p.raiz.querySelector(
      'dialog input[formcontrolname="title"]',
    ) as HTMLInputElement;
    expect(titulo.value).toBe('Vencida');

    await p.pulsar(p.boton(p.raiz.querySelector('dialog')!, 'Guardar'));
    expect(p.guardadas[0]?.id).toBe('vencida');
  });

  it('borrar pide un segundo toque', async () => {
    const p = await montar(EJEMPLO);
    await p.pulsar(p.raiz.querySelector('button[aria-label^="Editar"]')!);

    const dialogo = p.raiz.querySelector('dialog')!;
    await p.pulsar(p.boton(dialogo, 'Borrar tarea'));
    expect(p.borradas).toEqual([]);
    expect(dialogo.textContent).toContain('Seguro, borrar');

    await p.pulsar(p.boton(dialogo, 'Seguro, borrar'));
    expect(p.borradas).toEqual(['vencida']);
  });

  it('sin tareas lo dice en vez de dejar un hueco', async () => {
    const p = await montar([]);
    expect(p.texto()).toContain('Todavía no hay tareas');
  });
});
