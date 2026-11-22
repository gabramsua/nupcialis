import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { PUERTA_INVITADOS, type PuertaInvitados } from '../../../core/invitados/invitados-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import type { BodaDelPanel } from '../boda';
import { BODA_DE_PRUEBA } from '../boda.testing';
import { BodaStore } from '../boda.store';
import type { DatosBasicosParaGuardar } from '../boda.firestore';
import { DatosBoda } from './datos-boda';

/**
 * «Datos de la boda»: lo que la pareja puede corregir de lo que se dio de alta.
 *
 * Se vigila que lo que se enseña sea lo guardado (también en las bodas antiguas
 * sin tipo de ceremonia) y que no se guarde un nombre vacío ni una fecha rota.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar(boda: BodaDelPanel) {
  const guardadas: DatosBasicosParaGuardar[] = [];
  const store = {
    boda: signal<BodaDelPanel | null>(boda),
    error: () => '',
    async guardarDatos(datos: DatosBasicosParaGuardar) {
      guardadas.push(datos);
      return true;
    },
    async guardarModoAcceso() {
      return true;
    },
    async guardarAcompanantes() {
      return true;
    },
  };
  const invitados = {
    async listar() {
      return { ok: true as const, invitados: [] };
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
      provideRouter([]),
      { provide: BodaStore, useValue: store },
      { provide: PUERTA_INVITADOS, useValue: invitados },
    ],
  });

  const fixture = TestBed.createComponent(DatosBoda);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, guardadas };
}

function escribir(el: HTMLElement, nombre: string, valor: string): void {
  const campo = el.querySelector<HTMLInputElement>(`[formControlName="${nombre}"]`);
  if (!campo) throw new Error(`No hay campo ${nombre}`);
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

async function enviar(fixture: ReturnType<typeof montar>['fixture']): Promise<void> {
  (fixture.nativeElement as HTMLElement)
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { cancelable: true }));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('Datos de la boda', () => {
  it('enseña los datos guardados, con el tipo de ceremonia marcado', () => {
    const { el } = montar({ ...BODA_DE_PRUEBA, ceremonyType: 'religious' });

    expect(el.querySelector<HTMLInputElement>('[formControlName="partnerA"]')?.value).toBe('María');
    expect(el.querySelector<HTMLInputElement>('[formControlName="fecha"]')?.value).toBe(
      '2027-06-12',
    );
    const marcado = el.querySelector<HTMLInputElement>(
      'input[type="radio"][formControlName]:checked',
    );
    expect(marcado?.value).toBe('religious');
  });

  it('una boda antigua sin tipo lo dice en vez de inventarlo', () => {
    const { el } = montar({ ...BODA_DE_PRUEBA, ceremonyType: null });

    expect(el.querySelector('input[type="radio"][formControlName]:checked')).toBeNull();
    expect(el.textContent).toContain(
      (ES['panel'] as { datos: { ceremoniaSinIndicar: string } }).datos.ceremoniaSinIndicar,
    );
  });

  it('guarda los cambios de una vez, con el día como medianoche UTC', async () => {
    const { fixture, el, guardadas } = montar(BODA_DE_PRUEBA);

    escribir(el, 'partnerA', '  Marta ');
    escribir(el, 'fecha', '2027-09-04');
    escribir(el, 'hora', '12:30');
    await enviar(fixture);

    expect(guardadas).toEqual([
      {
        partnerA: 'Marta',
        partnerB: 'Gabriel',
        weddingDate: new Date('2027-09-04T00:00:00.000Z'),
        ceremonyType: 'civil',
        weddingTime: '12:30',
      },
    ]);
  });

  it('no guarda con un nombre vacío ni con la fecha borrada', async () => {
    const { fixture, el, guardadas } = montar(BODA_DE_PRUEBA);
    const guardar = vi.spyOn(TestBed.inject(BodaStore), 'guardarDatos');

    escribir(el, 'partnerB', '   ');
    await enviar(fixture);
    expect(guardar).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();

    escribir(el, 'partnerB', 'Gabriel');
    escribir(el, 'fecha', '');
    await enviar(fixture);
    expect(guardadas).toHaveLength(0);
  });

  it('sin hora guarda null, que es «quítala»', async () => {
    const { fixture, el, guardadas } = montar(BODA_DE_PRUEBA);

    escribir(el, 'hora', '');
    await enviar(fixture);

    expect(guardadas[0]?.weddingTime).toBeNull();
  });

  it('enlaza con el mapa para los lugares', () => {
    const { el } = montar(BODA_DE_PRUEBA);
    expect(el.querySelector('a[href="/panel/map"]')).not.toBeNull();
  });
});
