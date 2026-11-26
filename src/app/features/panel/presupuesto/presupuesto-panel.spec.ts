import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_PRESUPUESTO,
  type PuertaPresupuesto,
} from '../../../core/presupuesto/presupuesto-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { traducirPresupuesto } from '../../../core/firebase/presupuesto-gateway.firestore';
import { abrirDialogosEnPruebas } from '../boda.testing';
import { doblesDeEnlaces } from '../enlaces/dobles-enlaces.testing';
import { PanelPresupuesto } from './presupuesto-panel';
import type { DatosDePartida, PartidaDelPanel } from './presupuesto';
import { PresupuestoStore } from './presupuesto.store';

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const partida = (parcial: Partial<PartidaDelPanel> & { id: string }): PartidaDelPanel => ({
  category: 'Lugar',
  concept: 'Finca',
  estimatedCents: 500000,
  actualCents: 0,
  paid: false,
  dueOn: null,
  notes: '',
  vendorId: null,
  order: 1,
  ...parcial,
});

function montar(partidas: readonly PartidaDelPanel[], falloAlMarcar = false) {
  const guardadas: { id: string | null; datos: DatosDePartida; orden: number }[] = [];
  const marcadas: { id: string; pagada: boolean }[] = [];
  const borradas: string[] = [];

  const puerta: PuertaPresupuesto = {
    async listar() {
      return { ok: true, partidas };
    },
    async guardar(_w, id, datos, orden) {
      guardadas.push({ id, datos, orden });
      return { ok: true };
    },
    async marcarPagada(_w, id, pagada) {
      if (falloAlMarcar) return { ok: false, fallo: { tipo: 'red' } };
      marcadas.push({ id, pagada });
      return { ok: true };
    },
    async enlazarProveedor() {
      return { ok: true };
    },
    async borrar(_w, id) {
      borradas.push(id);
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
      { provide: PUERTA_PRESUPUESTO, useValue: puerta },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      PresupuestoStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelPresupuesto);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, guardadas, marcadas, borradas };
}

async function asentar(fixture: ReturnType<typeof montar>['fixture']): Promise<void> {
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();
}

const texto = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ') ?? '';

function boton(el: HTMLElement, txt: string): HTMLButtonElement {
  const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find((x) =>
    (x.textContent ?? '').includes(txt),
  );
  if (!b) throw new Error(`No hay botón «${txt}»`);
  return b;
}

function escribir(el: HTMLElement, control: string, valor: string): void {
  const campo = el.querySelector<HTMLInputElement>(`[formControlName="${control}"]`);
  if (!campo) throw new Error(`No hay ${control}`);
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

describe('el presupuesto de la pareja', () => {
  it('pinta los totales y las partidas por categoría', async () => {
    const { fixture, el } = montar([
      partida({ id: 'a', estimatedCents: 500000, actualCents: 520000, paid: true }),
      partida({ id: 'b', category: 'Comida', concept: 'Catering', estimatedCents: 300000 }),
    ]);
    await asentar(fixture);

    const t = texto(el);
    expect(t).toContain('Lugar');
    expect(t).toContain('Comida');
    expect(t).toContain('Catering');
    expect(t).toMatch(/Estimado\s*8\.?000,00/);
    expect(t).toMatch(/Gasto real\s*5\.?200,00/);
    expect(t).toMatch(/Pagado\s*5\.?200,00/);
    // Pagada: texto, no solo color.
    expect(t).toContain('Pagada');
    expect(t).toContain('Sin pagar');
  });

  it('avisa cuando se va por encima de lo estimado', async () => {
    const { fixture, el } = montar([
      partida({ id: 'a', estimatedCents: 100000, actualCents: 130000 }),
    ]);
    await asentar(fixture);
    expect(texto(el)).toContain('300,00');
    expect(texto(el)).toContain('por encima');
  });

  it('vacío, lo dice y deja añadir', async () => {
    const { fixture, el } = montar([]);
    await asentar(fixture);
    expect(texto(el)).toContain('Todavía no hay partidas');
    expect(boton(el, 'Añadir partida').disabled).toBe(false);
  });

  it('marcar pagada se confirma en el servidor', async () => {
    const { fixture, el, marcadas } = montar([partida({ id: 'a' })]);
    await asentar(fixture);

    const casilla = el.querySelector<HTMLInputElement>('.pr__pagada input');
    casilla?.click();
    await asentar(fixture);

    expect(marcadas).toEqual([{ id: 'a', pagada: true }]);
  });

  it('si falla al marcar, se deshace y se dice', async () => {
    const { fixture, el } = montar([partida({ id: 'a' })], true);
    await asentar(fixture);

    el.querySelector<HTMLInputElement>('.pr__pagada input')?.click();
    await asentar(fixture);

    expect(el.querySelector<HTMLInputElement>('.pr__pagada input')?.checked).toBe(false);
    expect(texto(el)).toContain('Sin conexión');
  });

  it('añade una partida con importes en céntimos y la manda al final', async () => {
    const { fixture, el, guardadas } = montar([partida({ id: 'a', order: 4 })]);
    await asentar(fixture);

    boton(el, 'Añadir partida').click();
    fixture.detectChanges();
    escribir(el, 'concept', 'Tarta');
    escribir(el, 'category', 'Comida');
    escribir(el, 'estimado', '350,50');
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas).toEqual([
      {
        id: null,
        orden: 5,
        datos: expect.objectContaining({
          concept: 'Tarta',
          category: 'Comida',
          estimatedCents: 35050,
          actualCents: 0,
          paid: false,
        }),
      },
    ]);
  });

  it('un importe ilegible no sale y se explica', async () => {
    const { fixture, el, guardadas } = montar([]);
    await asentar(fixture);

    boton(el, 'Añadir partida').click();
    fixture.detectChanges();
    escribir(el, 'concept', 'Tarta');
    escribir(el, 'estimado', 'mucho');
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas).toHaveLength(0);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('importe estimado');
  });

  it('edita con el id y borra con confirmación', async () => {
    const { fixture, el, guardadas, borradas } = montar([partida({ id: 'a' })]);
    await asentar(fixture);

    boton(el, 'Editar').click();
    fixture.detectChanges();
    escribir(el, 'real', '4.900');
    boton(el, 'Guardar').click();
    await asentar(fixture);
    expect(guardadas[0]).toMatchObject({ id: 'a', datos: { actualCents: 490000 } });

    boton(el, 'Eliminar').click();
    fixture.detectChanges();
    expect(texto(el)).toContain('Se borrará «Finca»');
    expect(borradas).toHaveLength(0);

    const confirmar = [...el.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')].find(
      (b) => (b.textContent ?? '').includes('Eliminar'),
    );
    confirmar?.click();
    await asentar(fixture);
    expect(borradas).toEqual(['a']);
  });
});

describe('traducirPresupuesto', () => {
  it('distingue red, permisos y el resto', () => {
    expect(traducirPresupuesto({ code: 'unavailable' })).toEqual({ tipo: 'red' });
    expect(traducirPresupuesto({ code: 'permission-denied' })).toEqual({ tipo: 'sin-permiso' });
    expect(traducirPresupuesto({ message: 'x' })).toEqual({ tipo: 'error', mensaje: 'x' });
    expect(traducirPresupuesto(undefined)).toMatchObject({ tipo: 'error' });
  });
});
