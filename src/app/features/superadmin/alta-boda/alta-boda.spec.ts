import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  PUERTA_ALTA,
  type DatosDeAlta,
  type PuertaAlta,
  type ResultadoAlta,
} from '../../../core/alta/alta-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { AltaBoda } from './alta-boda';

/**
 * El alta pide ahora si la boda es civil o religiosa y dónde son la ceremonia y
 * la celebración. Los lugares son opcionales: sin escribir nada viajan `null`.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar() {
  const enviadas: DatosDeAlta[] = [];
  const puerta: PuertaAlta = {
    async crearBoda(datos): Promise<ResultadoAlta> {
      enviadas.push(datos);
      return {
        ok: true,
        alta: { weddingId: 'w', slug: datos.slug, siteUrl: '', cuentas: [], avisos: [] },
      };
    },
    async autorizarDominio() {
      return { ok: true, mensaje: '' };
    },
    async cambiarEstado() {
      return { ok: true, status: 'draft', cambiado: false };
    },
    async completarBodas() {
      return { ok: true, revisadas: 0, actualizadas: 0, modulosAnadidos: 0, seccionesAnadidas: 0 };
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('panel'), { provide: PUERTA_ALTA, useValue: puerta }],
  });

  const fixture = TestBed.createComponent(AltaBoda);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, enviadas };
}

function escribir(el: HTMLElement, selector: string, valor: string): void {
  const campo = el.querySelector<HTMLInputElement>(selector);
  if (!campo) throw new Error(`No hay ${selector}`);
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

function rellenarBasico(el: HTMLElement): void {
  escribir(el, '[formControlName="partnerA"]', 'María');
  escribir(el, '[formControlName="partnerB"]', 'Gabriel');
  escribir(el, '[formControlName="slug"]', 'maria-y-gabriel');
  escribir(el, '[formControlName="weddingDate"]', '2999-06-12');
  escribir(el, '[formControlName="emailA"]', 'maria@example.com');
}

async function enviar(fixture: ReturnType<typeof montar>['fixture']): Promise<void> {
  (fixture.nativeElement as HTMLElement)
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { cancelable: true }));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('Alta de boda: ceremonia y lugares', () => {
  it('pide civil o religiosa, con civil marcada de entrada', () => {
    const { el } = montar();
    const radios = el.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect([...radios].map((r) => r.value)).toEqual(['civil', 'religious']);
    expect(el.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value).toBe('civil');
  });

  it('sin lugares escritos viajan null: la pareja los pone después', async () => {
    const { fixture, el, enviadas } = montar();
    rellenarBasico(el);
    await enviar(fixture);

    expect(enviadas).toHaveLength(1);
    expect(enviadas[0]).toMatchObject({
      ceremonyType: 'civil',
      ceremonyPlace: null,
      receptionPlace: null,
    });
  });

  it('manda la ceremonia elegida y un lugar con el pin de un enlace de Google Maps', async () => {
    const { fixture, el, enviadas } = montar();
    rellenarBasico(el);

    const religiosa = el.querySelector<HTMLInputElement>('input[type="radio"][value="religious"]');
    religiosa?.click();

    escribir(el, 'input[name="nombre-ceremonia"]', 'Iglesia de San Juan');
    escribir(
      el,
      'input[name="buscar-ceremonia"]',
      'https://www.google.com/maps/place/X/@40.41680,-3.70380,17z',
    );
    el.querySelectorAll<HTMLButtonElement>('np-lugar-de-alta button[type="button"]')[0]?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.lda__resultados button')?.click();
    fixture.detectChanges();

    escribir(el, 'input[name="nombre-celebracion"]', 'Finca Los Olivos');
    await enviar(fixture);

    expect(enviadas[0]).toMatchObject({
      ceremonyType: 'religious',
      ceremonyPlace: { name: 'Iglesia de San Juan', lat: 40.4168, lng: -3.7038 },
      receptionPlace: { name: 'Finca Los Olivos', lat: null, lng: null },
    });
  });

  it('la casilla «mismo sitio» solo existe con ceremonia civil', () => {
    const { fixture, el } = montar();
    expect(el.querySelector('input[type="checkbox"][formControlName="mismoSitio"]')).not.toBeNull();

    el.querySelector<HTMLInputElement>('input[type="radio"][value="religious"]')?.click();
    fixture.detectChanges();
    expect(el.querySelector('input[type="checkbox"][formControlName="mismoSitio"]')).toBeNull();
  });

  it('con «mismo sitio» marcado se pide un solo lugar y viaja a las dos fichas', async () => {
    const { fixture, el, enviadas } = montar();
    rellenarBasico(el);

    el.querySelector<HTMLInputElement>(
      'input[type="checkbox"][formControlName="mismoSitio"]',
    )?.click();
    fixture.detectChanges();
    expect(el.querySelector('input[name="nombre-celebracion"]')).toBeNull();

    escribir(el, 'input[name="nombre-ceremonia"]', 'Ayuntamiento');
    await enviar(fixture);

    expect(enviadas[0]?.ceremonyPlace).toMatchObject({ name: 'Ayuntamiento' });
    expect(enviadas[0]?.receptionPlace).toEqual(enviadas[0]?.ceremonyPlace);
  });

  it('si luego elige religiosa, el «mismo sitio» marcado antes deja de valer', async () => {
    const { fixture, el, enviadas } = montar();
    rellenarBasico(el);
    el.querySelector<HTMLInputElement>(
      'input[type="checkbox"][formControlName="mismoSitio"]',
    )?.click();
    fixture.detectChanges();
    el.querySelector<HTMLInputElement>('input[type="radio"][value="religious"]')?.click();
    fixture.detectChanges();

    escribir(el, 'input[name="nombre-ceremonia"]', 'Iglesia');
    escribir(el, 'input[name="nombre-celebracion"]', 'Finca');
    await enviar(fixture);

    expect(enviadas[0]?.receptionPlace).toMatchObject({ name: 'Finca' });
  });
});
