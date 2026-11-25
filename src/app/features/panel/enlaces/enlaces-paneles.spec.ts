import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { PUERTA_INVITADOS } from '../../../core/invitados/invitados-gateway';
import {
  ALMACEN_FOTOS_PERSONAS,
  PUERTA_PERSONAS,
  type PuertaPersonas,
} from '../../../core/personas/personas-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { abrirDialogosEnPruebas } from '../boda.testing';
import { PanelChecklist } from '../checklist/checklist-panel';
import type { TareaDelPanel } from '../checklist/tareas';
import { INVITADO_DE_PRUEBA } from '../invitados/dobles.testing';
import { PanelPersonas } from '../personas/personas-panel';
import type { DatosDePersona, PersonaDelPanel } from '../personas/personas';
import { PersonasStore } from '../personas/personas.store';
import { PanelPresupuesto } from '../presupuesto/presupuesto-panel';
import type { PartidaDelPanel } from '../presupuesto/presupuesto';
import { PanelProveedores } from '../proveedores/proveedores-panel';
import type { ProveedorDelPanel } from '../proveedores/proveedores';
import { doblesDeEnlaces, type OpcionesDeEnlaces } from './dobles-enlaces.testing';

/**
 * Los enlaces entre módulos (F4.1c), vistos desde cada pantalla.
 *
 * Lo que se vigila:
 *
 * 1. **Los selectores solo existen si la boda tiene el módulo** (el plan básico
 *    no ve proveedores ni presupuesto) y, aun así, **guardar no borra** un
 *    enlace que ya estaba.
 * 2. **Un enlace roto** —se borró el proveedor— se ve «sin enlace» y se limpia
 *    al guardar.
 * 3. **Los importes del proveedor son una propuesta**: no se aplican solos.
 * 4. **Si la lista de invitados no carga, guardar una persona no pierde su enlace.**
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const tarea = (p: Partial<TareaDelPanel> & { id: string }): TareaDelPanel => ({
  title: `Tarea ${p.id}`,
  description: '',
  category: 'Proveedores',
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
  ...p,
});

const proveedor = (p: Partial<ProveedorDelPanel> & { id: string }): ProveedorDelPanel => ({
  name: 'Foto Luz',
  category: 'Fotografía',
  contactName: '',
  phone: null,
  email: null,
  website: null,
  quotedCents: 0,
  agreedCents: 0,
  status: 'candidate',
  payments: [],
  contractPaths: [],
  rating: null,
  notes: '',
  order: 1,
  ...p,
});

const partida = (p: Partial<PartidaDelPanel> & { id: string }): PartidaDelPanel => ({
  category: 'Fotografía',
  concept: 'Reportaje',
  estimatedCents: 0,
  actualCents: 0,
  paid: false,
  dueOn: null,
  notes: '',
  vendorId: null,
  order: 1,
  ...p,
});

const persona = (p: Partial<PersonaDelPanel> & { id: string }): PersonaDelPanel => ({
  name: 'Carmen Ruiz',
  role: 'Madrina',
  side: 'A',
  bio: '',
  phone: null,
  photoPath: null,
  photoUrl: null,
  photoConsent: false,
  visible: true,
  guestId: null,
  order: 1,
  ...p,
});

function montar<T>(Pantalla: Type<T>, opciones: OpcionesDeEnlaces, extra: unknown[] = []) {
  const { providers, registro } = doblesDeEnlaces(opciones);
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('panel'), ...providers, ...(extra as never[])],
  });
  const fixture = TestBed.createComponent(Pantalla);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, registro };
}

async function asentar(f: { detectChanges(): void }): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await new Promise((listo) => setTimeout(listo, 0));
    f.detectChanges();
  }
}

const texto = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ') ?? '';

function boton(el: ParentNode, txt: string): HTMLButtonElement {
  const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find((x) =>
    (x.textContent ?? '').includes(txt),
  );
  if (!b) throw new Error(`No hay botón «${txt}»`);
  return b;
}

/** El botón de editar de las tareas solo lleva icono: se busca por su etiqueta accesible. */
function editarTarea(el: ParentNode): void {
  el.querySelector<HTMLButtonElement>('[aria-label^="Editar:"]')!.click();
}

/** El botón cuyo texto accesible empieza por... (los de «Quitar enlace» son varios). */
function porEtiqueta(el: ParentNode, etiqueta: string): HTMLButtonElement {
  return el.querySelector<HTMLButtonElement>(`[aria-label="${etiqueta}"]`)!;
}

function elegir(el: ParentNode, selector: string, valor: string): void {
  const s = el.querySelector<HTMLSelectElement>(selector);
  if (!s) throw new Error(`No hay ${selector}`);
  s.value = valor;
  s.dispatchEvent(new Event('change'));
}

function escribir(el: ParentNode, selector: string, valor: string): void {
  const c = el.querySelector<HTMLInputElement>(selector);
  if (!c) throw new Error(`No hay ${selector}`);
  c.value = valor;
  c.dispatchEvent(new Event('input'));
}

describe('tareas ↔ proveedor y partida', () => {
  const MODULOS = ['vendors', 'budget', 'checklist'] as const;

  it('la tarea enseña de qué proveedor y partida cuelga, y un enlace roto no se pinta', async () => {
    const { fixture, el } = montar(PanelChecklist, {
      modulos: MODULOS,
      proveedores: [proveedor({ id: 'v1', name: 'Foto Luz' })],
      partidas: [partida({ id: 'p1', concept: 'Reportaje' })],
      tareas: [
        tarea({ id: 'a', title: 'Pagar la señal', vendorId: 'v1', budgetItemId: 'p1' }),
        tarea({ id: 'b', title: 'Tarea rota', vendorId: 'borrado' }),
      ],
    });
    await asentar(fixture);

    const t = texto(el);
    expect(t).toContain('Foto Luz');
    expect(t).toContain('Reportaje');
    expect(el.querySelectorAll('.tk__enlace')).toHaveLength(2);
  });

  it('el formulario ofrece los dos selectores y guarda lo elegido', async () => {
    const { fixture, el, registro } = montar(PanelChecklist, {
      modulos: MODULOS,
      proveedores: [proveedor({ id: 'v1', name: 'Foto Luz' })],
      partidas: [partida({ id: 'p1', concept: 'Reportaje' })],
    });
    await asentar(fixture);

    boton(el, 'Añadir tarea').click();
    fixture.detectChanges();
    escribir(el, '[formControlName="title"]', 'Pedir presupuesto');
    elegir(el, '[formControlName="vendorId"]', 'v1');
    elegir(el, '[formControlName="budgetItemId"]', 'p1');
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(registro.tareasGuardadas).toHaveLength(1);
    expect(registro.tareasGuardadas[0]).toMatchObject({
      title: 'Pedir presupuesto',
      vendorId: 'v1',
      budgetItemId: 'p1',
    });
  });

  it('sin los módulos (plan básico) no hay selectores', async () => {
    const { fixture, el } = montar(PanelChecklist, { modulos: ['checklist'] });
    await asentar(fixture);

    boton(el, 'Añadir tarea').click();
    fixture.detectChanges();
    expect(el.querySelector('[formControlName="vendorId"]')).toBeNull();
    expect(el.querySelector('[formControlName="budgetItemId"]')).toBeNull();
  });

  it('editar una tarea sin esos módulos conserva sus enlaces en vez de borrarlos', async () => {
    const { fixture, el, registro } = montar(PanelChecklist, {
      modulos: ['checklist'],
      tareas: [tarea({ id: 'a', title: 'Enlazada', vendorId: 'v1', budgetItemId: 'p1' })],
    });
    await asentar(fixture);

    editarTarea(el);
    fixture.detectChanges();
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(registro.tareasGuardadas[0]).toMatchObject({ vendorId: 'v1', budgetItemId: 'p1' });
  });

  it('un enlace roto se limpia al guardar la tarea', async () => {
    const { fixture, el, registro } = montar(PanelChecklist, {
      modulos: MODULOS,
      proveedores: [proveedor({ id: 'v1' })],
      tareas: [tarea({ id: 'a', title: 'Rota', vendorId: 'borrado' })],
    });
    await asentar(fixture);

    editarTarea(el);
    fixture.detectChanges();
    expect(el.querySelector<HTMLSelectElement>('[formControlName="vendorId"]')?.value).toBe('');
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(registro.tareasGuardadas[0]?.vendorId).toBeNull();
  });
});

describe('la ficha del proveedor', () => {
  const MODULOS = ['vendors', 'budget', 'checklist'] as const;
  const FICHA = proveedor({ id: 'v1', name: 'Foto Luz' });

  async function abrir(opciones: OpcionesDeEnlaces) {
    const m = montar(PanelProveedores, { modulos: MODULOS, proveedores: [FICHA], ...opciones });
    await asentar(m.fixture);
    boton(m.el, 'Editar').click();
    m.fixture.detectChanges();
    return m;
  }

  it('lista sus tareas abiertas y sus partidas, y lo dice en la tarjeta', async () => {
    const m = await abrir({
      tareas: [
        tarea({ id: 'a', title: 'Pagar la señal', vendorId: 'v1' }),
        tarea({ id: 'b', title: 'De otro', vendorId: 'v2' }),
      ],
      partidas: [partida({ id: 'p1', concept: 'Reportaje', vendorId: 'v1', actualCents: 120000 })],
    });
    const t = texto(m.el);
    expect(t).toContain('Pagar la señal');
    expect(t).not.toContain('De otro');
    expect(t).toContain('Reportaje');
    expect(t).toContain('1 tareas abiertas');
  });

  it('enlaza una tarea que ya existe y quita el enlace de otra', async () => {
    const m = await abrir({
      tareas: [
        tarea({ id: 'libre', title: 'Libre' }),
        tarea({ id: 'suya', title: 'Suya', vendorId: 'v1' }),
      ],
    });

    elegir(m.el, 'np-tareas-enlazadas select', 'libre');
    m.fixture.detectChanges();
    boton(m.el, 'Enlazar').click();
    await asentar(m.fixture);
    porEtiqueta(m.el, 'Quitar el enlace de la tarea «Suya»').click();
    await asentar(m.fixture);

    expect(m.registro.tareasEnlazadas).toEqual([
      { id: 'libre', vendorId: 'v1' },
      { id: 'suya', vendorId: null },
    ]);
  });

  it('crea una tarea nueva ya enlazada, en «Proveedores»', async () => {
    const m = await abrir({});
    escribir(m.el, 'np-tareas-enlazadas input', 'Pedir la prueba de color');
    m.fixture.detectChanges();
    boton(m.el.querySelector('np-tareas-enlazadas')!, 'Añadir').click();
    await asentar(m.fixture);

    expect(m.registro.tareasGuardadas).toHaveLength(1);
    expect(m.registro.tareasGuardadas[0]).toMatchObject({
      title: 'Pedir la prueba de color',
      category: 'Proveedores',
      vendorId: 'v1',
      budgetItemId: null,
      assignedTo: 'both',
    });
  });

  it('enlaza y desenlaza partidas del presupuesto', async () => {
    const m = await abrir({
      partidas: [
        partida({ id: 'libre', concept: 'Álbum' }),
        partida({ id: 'suya', concept: 'Reportaje', vendorId: 'v1' }),
      ],
    });

    elegir(m.el, 'fieldset select', 'libre');
    m.fixture.detectChanges();
    boton(m.el, 'Enlazar').click();
    await asentar(m.fixture);
    porEtiqueta(m.el, 'Quitar el enlace de la partida «Reportaje»').click();
    await asentar(m.fixture);

    expect(m.registro.partidasEnlazadas).toEqual([
      { id: 'libre', vendorId: 'v1' },
      { id: 'suya', vendorId: null },
    ]);
  });

  it('sin el módulo de checklist ni el de presupuesto, esos bloques no existen', async () => {
    const m = montar(PanelProveedores, { modulos: ['vendors'], proveedores: [FICHA] });
    await asentar(m.fixture);
    boton(m.el, 'Editar').click();
    m.fixture.detectChanges();
    expect(m.el.querySelector('np-tareas-enlazadas')).toBeNull();
    expect(texto(m.el)).not.toContain('Partidas del presupuesto');
  });
});

describe('la partida del presupuesto', () => {
  const MODULOS = ['vendors', 'budget', 'checklist'] as const;

  async function abrir(opciones: OpcionesDeEnlaces) {
    const m = montar(PanelPresupuesto, { modulos: MODULOS, ...opciones });
    await asentar(m.fixture);
    boton(m.el, 'Editar').click();
    m.fixture.detectChanges();
    return m;
  }

  it('enseña su proveedor y sus tareas abiertas en la lista', async () => {
    const m = montar(PanelPresupuesto, {
      modulos: MODULOS,
      proveedores: [proveedor({ id: 'v1', name: 'Foto Luz' })],
      partidas: [partida({ id: 'p1', vendorId: 'v1' })],
      tareas: [tarea({ id: 'a', budgetItemId: 'p1' })],
    });
    await asentar(m.fixture);
    const t = texto(m.el);
    expect(t).toContain('Foto Luz');
    expect(t).toContain('1 tareas abiertas');
  });

  it('el proveedor ofrece importes, pero no se aplican hasta que se pulsa', async () => {
    const m = await abrir({
      proveedores: [proveedor({ id: 'v1', quotedCents: 150000, agreedCents: 140000 })],
      partidas: [partida({ id: 'p1', estimatedCents: 99900, vendorId: null })],
    });

    elegir(m.el, '[formControlName="vendorId"]', 'v1');
    m.fixture.detectChanges();

    const estimado = () =>
      m.el.querySelector<HTMLInputElement>('[formControlName="estimado"]')!.value;
    const real = () => m.el.querySelector<HTMLInputElement>('[formControlName="real"]')!.value;

    // La propuesta aparece, pero los campos siguen como estaban.
    expect(texto(m.el)).toContain('Usar su presupuesto como estimado');
    expect(estimado()).toContain('999');
    expect(real()).toBe('');

    boton(m.el, 'Usar el precio acordado como real').click();
    m.fixture.detectChanges();
    expect(real()).toContain('1400');
    expect(estimado()).toContain('999');

    boton(m.el, 'Usar su presupuesto como estimado').click();
    m.fixture.detectChanges();
    expect(estimado()).toContain('1500');
  });

  it('un proveedor sin importes no ofrece botones vacíos', async () => {
    const m = await abrir({
      proveedores: [proveedor({ id: 'v1', quotedCents: 0, agreedCents: 0 })],
      partidas: [partida({ id: 'p1' })],
    });
    elegir(m.el, '[formControlName="vendorId"]', 'v1');
    m.fixture.detectChanges();
    expect(texto(m.el)).not.toContain('Usar su presupuesto');
    expect(texto(m.el)).not.toContain('Usar el precio acordado');
  });

  it('una tarea nueva desde la partida nace enlazada a ella y a su proveedor', async () => {
    const m = await abrir({
      proveedores: [proveedor({ id: 'v1' })],
      partidas: [partida({ id: 'p1', vendorId: 'v1' })],
    });
    escribir(m.el, 'np-tareas-enlazadas input', 'Pagar el resto');
    m.fixture.detectChanges();
    boton(m.el.querySelector('np-tareas-enlazadas')!, 'Añadir').click();
    await asentar(m.fixture);

    expect(m.registro.tareasGuardadas[0]).toMatchObject({
      title: 'Pagar el resto',
      budgetItemId: 'p1',
      vendorId: 'v1',
    });
  });

  it('sin el módulo de proveedores no hay selector', async () => {
    const m = montar(PanelPresupuesto, { modulos: ['budget'], partidas: [partida({ id: 'p1' })] });
    await asentar(m.fixture);
    boton(m.el, 'Editar').click();
    m.fixture.detectChanges();
    expect(m.el.querySelector('[formControlName="vendorId"]')).toBeNull();
  });
});

describe('persona ↔ invitado', () => {
  const MARIA = { ...INVITADO_DE_PRUEBA, id: 'g1', fullName: 'María José Pérez' };

  function montarPersonas(
    personas: readonly PersonaDelPanel[],
    opciones: OpcionesDeEnlaces,
    invitadosFalla = false,
  ) {
    const guardadas: { datos: DatosDePersona }[] = [];
    const puerta: PuertaPersonas = {
      async listar() {
        return { ok: true, personas };
      },
      async guardar(_w, _id, datos) {
        guardadas.push({ datos });
        return { ok: true };
      },
      async borrar() {
        return { ok: true };
      },
      async reordenar() {
        return { ok: true };
      },
    };
    const extra: unknown[] = [
      { provide: PUERTA_PERSONAS, useValue: puerta },
      {
        provide: ALMACEN_FOTOS_PERSONAS,
        useValue: {
          async subir() {
            return { path: '', url: '' };
          },
          async borrar() {
            return undefined;
          },
        },
      },
      PersonasStore,
    ];
    if (invitadosFalla) {
      extra.push({
        provide: PUERTA_INVITADOS,
        useValue: {
          async listar() {
            return { ok: false, fallo: { tipo: 'red' } };
          },
        },
      });
    }
    return { ...montar(PanelPersonas, opciones, extra), guardadas };
  }

  it('enseña con quién está enlazada y si ya confirmó', async () => {
    const m = montarPersonas([persona({ id: 'a', guestId: 'g1' })], {
      modulos: ['guests', 'weddingParty'],
      invitados: [{ ...MARIA, rsvpStatus: 'confirmed' }],
    });
    await asentar(m.fixture);
    const t = texto(m.el);
    expect(t).toContain('María José Pérez');
    expect(t).toContain('Confirmado');
  });

  it('si el invitado ya no está en la lista, lo dice', async () => {
    const m = montarPersonas([persona({ id: 'a', guestId: 'borrado' })], {
      modulos: ['guests', 'weddingParty'],
      invitados: [MARIA],
    });
    await asentar(m.fixture);
    expect(texto(m.el)).toContain('ya no está en la lista');
  });

  it('el selector enlaza al invitado elegido y no publica nada de su ficha', async () => {
    const m = montarPersonas([persona({ id: 'a', name: 'Carmen Ruiz' })], {
      modulos: ['guests', 'weddingParty'],
      invitados: [MARIA],
    });
    await asentar(m.fixture);
    boton(m.el, 'Editar').click();
    m.fixture.detectChanges();
    elegir(m.el, '[formControlName="guestId"]', 'g1');
    boton(m.el, 'Guardar').click();
    await asentar(m.fixture);

    expect(m.guardadas[0]?.datos).toMatchObject({ name: 'Carmen Ruiz', guestId: 'g1' });
  });

  it('un enlace roto se limpia al guardar', async () => {
    const m = montarPersonas([persona({ id: 'a', guestId: 'borrado' })], {
      modulos: ['guests', 'weddingParty'],
      invitados: [MARIA],
    });
    await asentar(m.fixture);
    boton(m.el, 'Editar').click();
    m.fixture.detectChanges();
    boton(m.el, 'Guardar').click();
    await asentar(m.fixture);
    expect(m.guardadas[0]?.datos.guestId).toBeNull();
  });

  it('si la lista de invitados no carga, guardar NO pierde el enlace', async () => {
    const m = montarPersonas(
      [persona({ id: 'a', guestId: 'g1' })],
      { modulos: ['guests', 'weddingParty'] },
      true,
    );
    await asentar(m.fixture);
    // Sin lista no hay selector ni aviso de «ya no está».
    boton(m.el, 'Editar').click();
    m.fixture.detectChanges();
    expect(m.el.querySelector('[formControlName="guestId"]')).toBeNull();
    expect(texto(m.el)).not.toContain('ya no está en la lista');

    boton(m.el, 'Guardar').click();
    await asentar(m.fixture);
    expect(m.guardadas[0]?.datos.guestId).toBe('g1');
  });

  it('sin el módulo de invitados no hay selector y el enlace se conserva', async () => {
    const m = montarPersonas([persona({ id: 'a', guestId: 'g1' })], {
      modulos: ['weddingParty'],
    });
    await asentar(m.fixture);
    boton(m.el, 'Editar').click();
    m.fixture.detectChanges();
    expect(m.el.querySelector('[formControlName="guestId"]')).toBeNull();
    boton(m.el, 'Guardar').click();
    await asentar(m.fixture);
    expect(m.guardadas[0]?.datos.guestId).toBe('g1');
  });
});
