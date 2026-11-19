import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_MESAS,
  PUERTA_SENTAR,
  type DatosMesa,
  type Mesa,
  type PuertaMesas,
  type PuertaSentar,
} from '../../../core/mesas/mesas-gateway';
import {
  PUERTA_INVITADOS,
  type Invitado,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PanelMesas } from './mesas-pantalla';
import { MesasStore } from './mesas.store';

/**
 * El reparto de mesas.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que se pueda sentar tocando**, no solo arrastrando. El panel se diseña
 *    primero para móvil, y arrastrar a través de una lista con scroll en un
 *    móvil es una pelea.
 * 2. **Que avise y no impida** (§8.4): una mesa pasada de gente se marca y se
 *    deja, porque el día de la boda se añade una silla.
 * 3. **Que borrar una mesa no pierda a los que estaban sentados**, que es la
 *    forma más silenciosa de perder a doce personas.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function invitado(parcial: Partial<Invitado> & { id: string }): Invitado {
  return {
    fullName: `Invitado ${parcial.id}`,
    nickname: '',
    phone: null,
    email: null,
    side: 'a',
    ageGroup: 'adult',
    groupIds: [],
    rsvpStatus: 'confirmed',
    isCompanion: false,
    invitedById: null,
    maxCompanions: 0,
    loginCount: 0,
    notes: '',
    menu: '',
    allergies: '',
    tableId: null,
    apuntadoPorInvitado: false,
    altaEn: null,
    ...parcial,
  } as Invitado;
}

function mesa(parcial: Partial<Mesa> & { id: string }): Mesa {
  return {
    name: '',
    shape: 'round',
    minSeats: 8,
    maxSeats: 12,
    order: 1,
    notes: '',
    ...parcial,
  };
}

function montar(mesas: readonly Mesa[], invitados: readonly Invitado[]) {
  const sentados: { ids: readonly string[]; mesa: string | null }[] = [];
  const guardadas: DatosMesa[] = [];
  const borradas: string[] = [];
  let lista = [...invitados];

  const puertaMesas: PuertaMesas = {
    async listar() {
      return { ok: true, mesas };
    },
    async guardar(_weddingId, datos) {
      guardadas.push(datos);
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      borradas.push(id);
      return { ok: true };
    },
  };

  const puertaSentar: PuertaSentar = {
    async sentar(guestIds, tableId) {
      sentados.push({ ids: [...guestIds], mesa: tableId });
      lista = lista.map((i) => (guestIds.includes(i.id) ? { ...i, tableId } : i));
      return { ok: true, sentados: guestIds.length };
    },
  };

  const puertaInvitados = {
    async listar() {
      return { ok: true as const, invitados: lista };
    },
  } as unknown as PuertaInvitados;

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      { provide: PUERTA_MESAS, useValue: puertaMesas },
      { provide: PUERTA_SENTAR, useValue: puertaSentar },
      { provide: PUERTA_INVITADOS, useValue: puertaInvitados },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      MesasStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelMesas);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  const asentar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };

  return {
    fixture,
    raiz,
    sentados,
    guardadas,
    borradas,
    asentar,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    fichas: () => [...raiz.querySelectorAll<HTMLButtonElement>('.ms__ficha')],
    ficha(nombre: string) {
      return [...raiz.querySelectorAll<HTMLButtonElement>('.ms__ficha')].find((f) =>
        f.textContent?.includes(nombre),
      )!;
    },
    mesa(n: number) {
      return [...raiz.querySelectorAll<HTMLButtonElement>('.ms__soltar')][n]!;
    },
    boton(texto: string) {
      return [...raiz.querySelectorAll('button')].find((b) =>
        b.textContent?.includes(texto),
      ) as HTMLButtonElement;
    },
    /** Un toque: puntero abajo y arriba sin moverse. */
    async tocar(elemento: HTMLElement) {
      elemento.dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, clientX: 10, clientY: 10, bubbles: true }),
      );
      elemento.dispatchEvent(
        new PointerEvent('pointerup', { button: 0, clientX: 10, clientY: 10, bubbles: true }),
      );
      await asentar();
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await asentar();
    },
  };
}

describe('el reparto de mesas', () => {
  it('enseña quién falta por sentar', async () => {
    const p = montar([mesa({ id: 'm1' })], [invitado({ id: 'a', fullName: 'Ana Ruiz' })]);
    await p.asentar();

    expect(p.texto()).toContain('Faltan por sentar (1)');
    expect(p.texto()).toContain('Ana Ruiz');
  });

  /** Lo que de verdad hace usable la pantalla en un móvil. */
  it('tocando a alguien y luego la mesa, lo sienta', async () => {
    const p = montar([mesa({ id: 'm1' })], [invitado({ id: 'a', fullName: 'Ana Ruiz' })]);
    await p.asentar();

    await p.tocar(p.ficha('Ana Ruiz'));
    expect(p.texto()).toContain('Tienes a Ana Ruiz');

    await p.pulsar(p.mesa(0));
    expect(p.sentados).toEqual([{ ids: ['a'], mesa: 'm1' }]);
  });

  it('volver a tocar a quien ya tenías lo suelta', async () => {
    const p = montar([mesa({ id: 'm1' })], [invitado({ id: 'a', fullName: 'Ana Ruiz' })]);
    await p.asentar();

    await p.tocar(p.ficha('Ana Ruiz'));
    await p.tocar(p.ficha('Ana Ruiz'));

    expect(p.texto()).not.toContain('Tienes a Ana Ruiz');
  });

  it('a quien está sentado se le puede levantar', async () => {
    const p = montar(
      [mesa({ id: 'm1', minSeats: 1 })],
      [invitado({ id: 'a', fullName: 'Ana Ruiz', tableId: 'm1' })],
    );
    await p.asentar();

    await p.tocar(p.ficha('Ana Ruiz'));
    await p.pulsar(p.boton('Levantar de la mesa'));

    expect(p.sentados).toEqual([{ ids: ['a'], mesa: null }]);
  });

  /** §8.4: avisos, no bloqueos. */
  it('deja pasarse del máximo y lo dice', async () => {
    const invitados = Array.from({ length: 3 }, (_, n) => invitado({ id: `i${n}`, tableId: 'm1' }));
    const p = montar([mesa({ id: 'm1', minSeats: 1, maxSeats: 2 })], invitados);
    await p.asentar();

    expect(p.texto()).toContain('1 más de los que caben');
    expect(p.texto()).toContain('tiene 1 más de los que caben');
  });

  it('marca la mesa que se queda corta', async () => {
    const p = montar([mesa({ id: 'm1', minSeats: 8 })], [invitado({ id: 'a', tableId: 'm1' })]);
    await p.asentar();

    expect(p.texto()).toContain('Faltan 7 para llenarla');
  });

  it('señala al acompañante separado de quien lo apuntó', async () => {
    const p = montar(
      [mesa({ id: 'm1', minSeats: 1 }), mesa({ id: 'm2', minSeats: 1, order: 2 })],
      [
        invitado({ id: 'titular', fullName: 'Ana Ruiz', tableId: 'm1' }),
        invitado({
          id: 'mas-uno',
          fullName: 'Luis Mas',
          tableId: 'm2',
          isCompanion: true,
          invitedById: 'titular',
        }),
      ],
    );
    await p.asentar();

    expect(p.texto()).toContain('Luis Mas está lejos de Ana Ruiz');
    expect(p.raiz.querySelectorAll('.ms__ficha--separado')).toHaveLength(1);
  });

  it('vaciar una mesa levanta a todos los que estaban', async () => {
    const p = montar(
      [mesa({ id: 'm1', minSeats: 1 })],
      [invitado({ id: 'a', tableId: 'm1' }), invitado({ id: 'b', tableId: 'm1' })],
    );
    await p.asentar();
    await p.pulsar(p.boton('Vaciar'));

    expect(p.sentados).toEqual([{ ids: ['a', 'b'], mesa: null }]);
  });

  /** Perder a doce personas sin que lo diga nadie es lo peor que puede pasar. */
  it('borrar una mesa devuelve a los sentados a la lista de pendientes', async () => {
    const p = montar(
      [mesa({ id: 'm1', minSeats: 1 })],
      [invitado({ id: 'a', fullName: 'Ana Ruiz', tableId: 'm1' })],
    );
    await p.asentar();

    await p.pulsar(p.boton('Eliminar'));
    expect(p.texto()).toContain('vuelven a la lista');

    // El de dentro del modal, no el de la tarjeta, que se llama igual.
    const confirmar = [...p.raiz.querySelectorAll<HTMLButtonElement>('dialog button')].find((b) =>
      b.textContent?.includes('Eliminar'),
    )!;
    await p.pulsar(confirmar);
    expect(p.sentados).toEqual([{ ids: ['a'], mesa: null }]);
    expect(p.borradas).toEqual(['m1']);
  });

  describe('la mesa nueva', () => {
    it('nace con los topes de su forma y la pareja los cambia', async () => {
      const p = montar([], []);
      await p.asentar();
      await p.pulsar(p.boton('Añadir una mesa'));

      const minimo = p.raiz.querySelector<HTMLInputElement>('input[formcontrolname="minSeats"]')!;
      const maximo = p.raiz.querySelector<HTMLInputElement>('input[formcontrolname="maxSeats"]')!;
      expect(minimo.value).toBe('8');
      expect(maximo.value).toBe('12');

      const forma = p.raiz.querySelector<HTMLSelectElement>('select[formcontrolname="shape"]')!;
      forma.value = 'rect';
      forma.dispatchEvent(new Event('change'));
      p.fixture.detectChanges();

      expect(minimo.value).toBe('12');
      expect(maximo.value).toBe('50');
    });

    it('se guarda con lo que haya puesto la pareja', async () => {
      const p = montar([], []);
      await p.asentar();
      await p.pulsar(p.boton('Añadir una mesa'));

      const nombre = p.raiz.querySelector<HTMLInputElement>('input[formcontrolname="name"]')!;
      nombre.value = 'Los de la uni';
      nombre.dispatchEvent(new Event('input'));

      await p.pulsar(p.boton('Guardar'));

      expect(p.guardadas[0]).toEqual(
        expect.objectContaining({ name: 'Los de la uni', shape: 'round', maxSeats: 12 }),
      );
    });
  });

  /**
   * Nadie trae a su pareja a una boda para dejarla en otra mesa, pero el caso
   * contrario existe —un amigo en la mesa de la uni y su pareja al lado— así
   * que se pregunta en vez de decidirlo sola.
   */
  describe('al sentar a alguien que viene acompañado', () => {
    const conAcompanante = [
      invitado({ id: 'titular', fullName: 'Ana Ruiz' }),
      invitado({
        id: 'mas-uno',
        fullName: 'Luis Mas',
        isCompanion: true,
        invitedById: 'titular',
      }),
    ];

    it('pregunta si sienta también a los suyos', async () => {
      const p = montar([mesa({ id: 'm1', minSeats: 1, maxSeats: 8 })], conAcompanante);
      await p.asentar();

      await p.tocar(p.ficha('Ana Ruiz'));
      await p.pulsar(p.mesa(0));

      expect(p.texto()).toContain('Ana Ruiz viene con Luis Mas');
      // El titular se sienta ya, sin esperar la respuesta.
      expect(p.sentados).toEqual([{ ids: ['titular'], mesa: 'm1' }]);
    });

    it('si dice que sí, los sienta en la misma mesa', async () => {
      const p = montar([mesa({ id: 'm1', minSeats: 1, maxSeats: 8 })], conAcompanante);
      await p.asentar();

      await p.tocar(p.ficha('Ana Ruiz'));
      await p.pulsar(p.mesa(0));
      await p.pulsar(p.boton('Sí, sentadlos juntos'));

      expect(p.sentados).toEqual([
        { ids: ['titular'], mesa: 'm1' },
        { ids: ['mas-uno'], mesa: 'm1' },
      ]);
    });

    it('si dice que no, se queda solo el titular', async () => {
      const p = montar([mesa({ id: 'm1', minSeats: 1, maxSeats: 8 })], conAcompanante);
      await p.asentar();

      await p.tocar(p.ficha('Ana Ruiz'));
      await p.pulsar(p.mesa(0));
      await p.pulsar(p.boton('No, solo a él'));

      expect(p.sentados).toEqual([{ ids: ['titular'], mesa: 'm1' }]);
    });

    /** El máximo es un aviso: la salida es ampliar, no prohibir. */
    it('si no caben, ofrece ampliar la mesa', async () => {
      const p = montar([mesa({ id: 'm1', minSeats: 1, maxSeats: 1 })], conAcompanante);
      await p.asentar();

      await p.tocar(p.ficha('Ana Ruiz'));
      await p.pulsar(p.mesa(0));

      expect(p.texto()).toContain('No caben todos');

      await p.pulsar(p.boton('Ampliar a 2 y sentarlos'));

      expect(p.guardadas).toEqual([expect.objectContaining({ id: 'm1', maxSeats: 2 })]);
      expect(p.sentados).toEqual([
        { ids: ['titular'], mesa: 'm1' },
        { ids: ['mas-uno'], mesa: 'm1' },
      ]);
    });

    it('a quien no trae a nadie no le pregunta nada', async () => {
      const p = montar([mesa({ id: 'm1', minSeats: 1 })], [invitado({ id: 'solo' })]);
      await p.asentar();

      await p.tocar(p.ficha('Invitado solo'));
      await p.pulsar(p.mesa(0));

      expect(p.texto()).not.toContain('viene con');
    });
  });
});
