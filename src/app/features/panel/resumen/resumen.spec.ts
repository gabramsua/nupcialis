import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_INVITADOS,
  type Invitado,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import { BODA_DE_PRUEBA } from '../boda.testing';
import type { BodaDelPanel } from '../boda';
import { menuDeModulos } from '../boda';
import { INVITADO_DE_PRUEBA } from '../invitados/dobles.testing';
import { BodaStore } from '../boda.store';
import { PUERTA_TAREAS } from '../../../core/checklist/tareas-gateway';
import type { TareaDelPanel } from '../checklist/tareas';
import { PanelResumen } from './resumen';

/**
 * La primera pantalla del panel, vista como la ve la pareja.
 *
 * Lo que se vigila:
 *
 * 1. **Las dos cifras que vienen a mirar**: cuántos han dicho que vienen y
 *    cuántos han abierto la web.
 * 2. **Que lo que falta se vea y lleve a donde se arregla.**
 * 3. **Que un módulo encendido sin pantalla no se enlace**, que es como se
 *    llegaba a una página en blanco desde el menú.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function invitado(parcial: Partial<Invitado>): Invitado {
  return { ...INVITADO_DE_PRUEBA, ...parcial };
}

function puertaCon(invitados: readonly Invitado[]): PuertaInvitados {
  return {
    async listar() {
      return { ok: true, invitados };
    },
    async importar() {
      throw new Error('no se usa');
    },
    async guardar() {
      throw new Error('no se usa');
    },
    async borrar() {
      throw new Error('no se usa');
    },
  };
}

async function montar(
  boda: BodaDelPanel,
  invitados: readonly Invitado[] = [],
  tareas: readonly TareaDelPanel[] | null = null,
) {
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
      { provide: PUERTA_INVITADOS, useValue: puertaCon(invitados) },
      ...(tareas === null
        ? []
        : [
            {
              provide: PUERTA_TAREAS,
              useValue: {
                async listar() {
                  return { ok: true as const, tareas };
                },
              },
            },
          ]),
      {
        provide: BodaStore,
        useValue: { boda: () => boda, menu: () => menuDeModulos(boda) },
      },
    ],
  });

  const fixture = TestBed.createComponent(PanelResumen);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  return { fixture, raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

const MONTADA: BodaDelPanel = { ...BODA_DE_PRUEBA, heroImageUrl: 'https://ejemplo/portada.jpg' };

describe('el resumen del panel', () => {
  it('saluda y dice cuánto queda', async () => {
    const p = await montar(MONTADA);

    expect(p.texto()).toContain('María y Gabriel');
    expect(p.texto()).toContain('Faltan');
  });

  it('enseña cuántos vienen y cuántos han abierto la web', async () => {
    const p = await montar(MONTADA, [
      invitado({ id: '1', rsvpStatus: 'confirmed', loginCount: 2 }),
      invitado({ id: '2', rsvpStatus: 'pending', loginCount: 1 }),
      invitado({ id: '3', rsvpStatus: 'pending', loginCount: 0 }),
    ]);

    const cifras = [...p.raiz.querySelectorAll('.re__cifra')].map((c) =>
      c.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(cifras[0]).toContain('1/3');
    expect(cifras[1]).toContain('2/3');
  });

  it('lo que falta lleva a la pantalla donde se arregla', async () => {
    const p = await montar({ ...MONTADA, weddingDate: null }, []);

    expect(p.texto()).toContain('Poned la fecha de la boda');
    const enlaces = [...p.raiz.querySelectorAll('.re__pendientes a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(enlaces).toContain('/panel/datos');
  });

  /** Una boda hecha del todo no tiene por qué inventarse deberes. */
  it('cuando no falta nada lo dice, en vez de dejar un hueco', async () => {
    const p = await montar(MONTADA, [invitado({ rsvpStatus: 'confirmed', loginCount: 1 })]);

    expect(p.texto()).toContain('No os falta nada');
  });

  it('lleva a las respuestas del formulario y a los invitados', async () => {
    const p = await montar(MONTADA);
    const enlaces = [...p.raiz.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(enlaces).toContain('/panel/rsvp/respuestas');
    expect(enlaces).toContain('/panel/guests');
  });

  /**
   * El fallo que esto evita: la galería estaba encendida, el menú la enlazaba
   * y llevaba a una página en blanco. Se enseña, pero sin enlace y diciendo lo
   * que es.
   *
   * El ejemplo es el **libro de visitas**, que aún no tiene pantalla. El día
   * que la tenga, hay que mover esta prueba al siguiente módulo sin pantalla,
   * no borrarla: lo que vigila no es ese módulo, es el menú.
   */
  it('un módulo encendido que aún no tiene pantalla se enseña sin enlace', async () => {
    const conLibro: BodaDelPanel = {
      ...MONTADA,
      modulos: {
        ...MONTADA.modulos,
        guestbook: { enabled: true, visibility: 'visible' },
      },
    };

    const p = await montar(conLibro);
    const enlaces = [...p.raiz.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(p.texto()).toContain('En camino');
    expect(enlaces).not.toContain('/panel/guestbook');
  });

  /** Y la galería, que ya la tiene, sí se enlaza. */
  it('la galería encendida se enlaza a su pantalla', async () => {
    const conGaleria: BodaDelPanel = {
      ...MONTADA,
      modulos: {
        ...MONTADA.modulos,
        gallery: { enabled: true, visibility: 'visible' },
      },
    };

    const p = await montar(conGaleria);
    const enlaces = [...p.raiz.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(enlaces).toContain('/panel/gallery');
  });
});

describe('las tareas en el resumen', () => {
  const hoy = new Date();
  const en = (dias: number) =>
    new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));

  function tarea(parcial: Partial<TareaDelPanel> & { id: string }): TareaDelPanel {
    return {
      title: `Tarea ${parcial.id}`,
      description: '',
      category: '',
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

  const CON_TAREAS: BodaDelPanel = {
    ...MONTADA,
    modulos: { checklist: { enabled: true, visibility: 'hidden' } },
  };

  it('enseña las vencidas y las de esta semana, con su plazo escrito', async () => {
    const p = await montar(
      CON_TAREAS,
      [],
      [
        tarea({ id: 'vencida', title: 'Pagar la señal', dueDate: en(-3) }),
        tarea({ id: 'pronto', title: 'Enviar invitaciones', dueDate: en(4) }),
        tarea({ id: 'lejos', title: 'Cosa lejana', dueDate: en(100) }),
      ],
    );

    const t = p.texto();
    expect(t).toContain('Pagar la señal');
    expect(t).toContain('vencida hace 3 días');
    expect(t).toContain('Enviar invitaciones');
    expect(t).toContain('faltan 4 días');
    expect(t).not.toContain('Cosa lejana');
    expect(p.raiz.querySelector('.re__tareas a')?.getAttribute('href')).toBe('/panel/checklist');
  });

  it('con todo al día lo dice y cuenta lo hecho', async () => {
    const p = await montar(
      CON_TAREAS,
      [],
      [tarea({ id: 'a', done: true }), tarea({ id: 'b', dueDate: en(200) })],
    );
    expect(p.texto()).toContain('Vais al día: 1 de 2 tareas hechas');
  });

  it('solo enseña tres y cuenta las que quedan', async () => {
    const p = await montar(
      CON_TAREAS,
      [],
      [1, 2, 3, 4, 5].map((n) => tarea({ id: `t${n}`, dueDate: en(-n) })),
    );
    expect(p.raiz.querySelectorAll('.re__tareas li')).toHaveLength(3);
    expect(p.texto()).toContain('Y 2 más');
  });

  it('sin el módulo encendido no sale nada', async () => {
    const p = await montar(MONTADA, [], [tarea({ id: 'a', dueDate: en(-3) })]);
    expect(p.raiz.querySelector('.re__tareas')).toBeNull();
  });

  describe('el aviso de la primera vez', () => {
    const CON_CHECKLIST: BodaDelPanel = {
      ...MONTADA,
      modulos: { checklist: { enabled: true, visibility: 'hidden' } },
    };

    it('invita a repasar las tareas y desaparece al descartarlo', async () => {
      localStorage.removeItem('np.panel.avisoTareas');
      const p = await montar(CON_CHECKLIST);
      const aviso = p.raiz.querySelector('[data-aviso="tareas"]');
      expect(aviso).not.toBeNull();
      expect(aviso?.querySelector('a')?.getAttribute('href')).toBe('/panel/checklist');

      aviso?.querySelector<HTMLButtonElement>('button')?.click();
      p.fixture.detectChanges();

      expect(p.raiz.querySelector('[data-aviso="tareas"]')).toBeNull();
      expect(localStorage.getItem('np.panel.avisoTareas')).toBe('1');
      localStorage.removeItem('np.panel.avisoTareas');
    });

    it('no sale si ya se descartó', async () => {
      localStorage.setItem('np.panel.avisoTareas', '1');
      const p = await montar(CON_CHECKLIST);
      expect(p.raiz.querySelector('[data-aviso="tareas"]')).toBeNull();
      localStorage.removeItem('np.panel.avisoTareas');
    });

    it('no sale si el módulo de tareas está apagado', async () => {
      localStorage.removeItem('np.panel.avisoTareas');
      const p = await montar(MONTADA);
      expect(p.raiz.querySelector('[data-aviso="tareas"]')).toBeNull();
    });
  });
});
