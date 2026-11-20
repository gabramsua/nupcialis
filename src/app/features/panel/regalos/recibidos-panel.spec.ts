import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_RECIBIDOS,
  type DatosRecibido,
  type PuertaRecibidos,
} from '../../../core/regalos/recibidos-gateway';
import { PUERTA_INVITADOS, type Invitado } from '../../../core/invitados/invitados-gateway';
import { abrirDialogosEnPruebas } from '../boda.testing';
import { PanelRecibidos } from './recibidos-panel';
import { sanearRecibidos } from './recibidos';
import { RecibidosStore } from './recibidos.store';

/**
 * El cuaderno de lo recibido (§8.8).
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que agradecer sea un toque** y quede marcado. Es el trabajo que este
 *    módulo resuelve y el gesto que se repite cincuenta veces.
 * 2. **Que el total no se invente nada**: lo que no es dinero no suma.
 * 3. **Que el cruce no sea un reproche**: sale quién hay que repasar, sin
 *    importes al lado.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function invitado(parcial: Partial<Invitado> & { id: string; fullName: string }): Invitado {
  return {
    nickname: '',
    phone: null,
    side: 'both',
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
  };
}

function montar(crudos: readonly Record<string, unknown>[], invitados: readonly Invitado[] = []) {
  let datos = crudos.map((c) => ({ ...c }));
  const guardados: DatosRecibido[] = [];

  const doble: PuertaRecibidos = {
    async listar() {
      return {
        ok: true,
        recibidos: sanearRecibidos(datos),
      };
    },
    async guardar(_weddingId, recibido) {
      guardados.push(recibido);
      if (recibido.id) {
        datos = datos.map((d) => (d['id'] === recibido.id ? { ...d, ...recibido } : d));
      } else {
        datos = [...datos, { ...recibido, id: `nuevo-${datos.length}` }];
      }
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      datos = datos.filter((d) => d['id'] !== id);
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
      provideRouter([]),
      { provide: PUERTA_RECIBIDOS, useValue: doble },
      {
        provide: PUERTA_INVITADOS,
        useValue: {
          async listar() {
            return { ok: true, invitados };
          },
        },
      },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      RecibidosStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelRecibidos);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;

  const asentar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };

  return {
    raiz,
    guardados,
    asentar,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    marcas: () => [...raiz.querySelectorAll('.rc__marca')] as HTMLButtonElement[],
    filas: () => [...raiz.querySelectorAll('.rc__fila')],
    boton(texto: string) {
      return [...raiz.querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as
        HTMLButtonElement | undefined;
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await asentar();
    },
  };
}

const APUNTE = {
  id: 'r1',
  guestId: 'g1',
  fromLabel: 'Ana Ruiz',
  amount: 200,
  method: 'bizum',
  receivedAt: '2027-06-13',
  thanked: false,
};

describe('el cuaderno de lo recibido', () => {
  it('firma cada anotación con el nombre del invitado vinculado', async () => {
    const p = montar([APUNTE], [invitado({ id: 'g1', fullName: 'Ana Ruiz Gómez' })]);
    await p.asentar();

    expect(p.texto()).toContain('Ana Ruiz Gómez');
  });

  /** El que importa: es el gesto que se repite la semana siguiente. */
  it('agradecer es un toque, y se guarda con su fecha', async () => {
    const p = montar([APUNTE]);
    await p.asentar();

    await p.pulsar(p.marcas()[0]);

    expect(p.guardados).toHaveLength(1);
    expect(p.guardados[0].thanked).toBe(true);
    expect(p.guardados[0].thankedAt).not.toBeNull();
  });

  it('y se puede desmarcar, que también se toca sin querer', async () => {
    const p = montar([{ ...APUNTE, thanked: true, thankedAt: '2027-06-14' }]);
    await p.asentar();

    await p.pulsar(p.marcas()[0]);

    expect(p.guardados[0].thanked).toBe(false);
    expect(p.guardados[0].thankedAt).toBeNull();
  });

  /** Ponerle precio a la vajilla sería el principio de un ranking (§8.8). */
  it('el total suma solo el dinero, y lo demás lo cuenta aparte', async () => {
    const p = montar([
      APUNTE,
      { id: 'r2', fromLabel: 'Los vecinos', method: 'gift', giftDescription: 'La vajilla' },
    ]);
    await p.asentar();

    expect(p.texto()).toContain('200 €');
    expect(p.texto()).toContain('en 2 anotaciones');
    expect(p.texto()).toContain('1 regalo que no es dinero');
  });

  it('el filtro de sin agradecer enseña solo eso', async () => {
    const p = montar([APUNTE, { ...APUNTE, id: 'r2', thanked: true }]);
    await p.asentar();
    expect(p.filas()).toHaveLength(2);

    await p.pulsar(p.boton('Sin agradecer')!);

    expect(p.filas()).toHaveLength(1);
  });

  /** Información, nunca reproche: sin importes al lado. */
  it('dice quién vino y no tiene nada apuntado', async () => {
    const p = montar(
      [APUNTE],
      [
        invitado({ id: 'g1', fullName: 'Ana Ruiz' }),
        invitado({ id: 'g2', fullName: 'Pepe García' }),
      ],
    );
    await p.asentar();

    expect(p.texto()).toContain('Vinieron y no tenéis nada apuntado');
    expect(p.texto()).toContain('Pepe García');
  });

  it('y saca a quien no pudo venir y mandó algo igual', async () => {
    const p = montar(
      [{ ...APUNTE, guestId: 'g3' }],
      [invitado({ id: 'g3', fullName: 'Marta Olmo', rsvpStatus: 'declined' })],
    );
    await p.asentar();

    expect(p.texto()).toContain('No pudieron venir y os mandaron algo');
    expect(p.texto()).toContain('Marta Olmo');
  });

  it('sin nada apuntado, explica para qué sirve en vez de quedarse en blanco', async () => {
    const p = montar([]);
    await p.asentar();

    expect(p.texto()).toContain('Todavía no hay nada apuntado');
    expect(p.texto()).toContain('cincuenta sobres');
  });

  it('dice en pantalla que esto no lo ve nadie más', async () => {
    const p = montar([]);
    await p.asentar();

    expect(p.texto()).toContain('no lo ve nadie más que vosotros');
  });
});
