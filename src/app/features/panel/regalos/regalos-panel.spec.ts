import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { signal } from '@angular/core';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_REGALOS_PANEL,
  ordenarRegalos,
  type PuertaRegalosPanel,
  type RegaloDelPanel,
} from '../../../core/regalos/regalos-panel-gateway';
import { sanearAportacion } from '../../public-site/regalos/regalos';
import { BODA_DE_PRUEBA, abrirDialogosEnPruebas } from '../boda.testing';
import { BodaStore } from '../boda.store';
import { PanelRegalos } from './regalos-panel';
import { RegalosStore } from './regalos.store';

/**
 * Los regalos en el panel (§8.8).
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que el IBAN mal se avise al escribirlo.** Un dígito cambiado en un
 *    número de cuenta publicado es dinero rebotado, o en la cuenta de otro.
 * 2. **Que aquí no salga quién ha cogido qué.** La reserva es anónima, y esta
 *    pantalla tampoco es sitio para empezar a enseñarlo.
 * 3. **Que se diga en pantalla que el número no sale en la web abierta**, que
 *    es la duda que tendría cualquiera al teclearlo.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function regalo(parcial: Partial<RegaloDelPanel> & { id: string }): RegaloDelPanel {
  return {
    titulo: `Regalo ${parcial.id}`,
    descripcion: '',
    precio: null,
    enlace: null,
    imagen: null,
    reservado: false,
    order: 0,
    enabled: true,
    ...parcial,
  };
}

function montar(iniciales: readonly RegaloDelPanel[], aportacion = {}) {
  let datos = [...iniciales];
  const guardados: unknown[] = [];

  const doble: PuertaRegalosPanel = {
    async listar() {
      return { ok: true, regalos: ordenarRegalos(datos) };
    },
    async guardar(_weddingId, regalo) {
      guardados.push(regalo);
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      datos = datos.filter((r) => r.id !== id);
      return { ok: true };
    },
  };

  const boda = signal({ ...BODA_DE_PRUEBA, aportacion: sanearAportacion(aportacion) });

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
      { provide: PUERTA_REGALOS_PANEL, useValue: doble },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      {
        provide: BodaStore,
        useValue: { boda, error: () => null, guardarAportacion: async () => true },
      },
      RegalosStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelRegalos);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;

  const asentar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };

  return {
    raiz,
    guardados,
    asentar,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    async escribir(etiqueta: string, valor: string) {
      const campo = [...raiz.querySelectorAll('np-field')].find((f) =>
        f.querySelector('label')?.textContent?.includes(etiqueta),
      );
      const control = campo?.querySelector('input, textarea') as HTMLInputElement;
      control.value = valor;
      control.dispatchEvent(new Event('input'));
      await asentar();
    },
  };
}

describe('los regalos en el panel', () => {
  /** El que importa. */
  it('avisa de un IBAN con un dígito cambiado', async () => {
    const p = montar([]);
    await p.asentar();

    await p.escribir('Número de cuenta', 'ES91 2100 0418 4502 0005 1333');

    expect(p.texto()).toContain('Ese IBAN no cuadra');
  });

  it('con el IBAN bueno, lo devuelve en grupos de cuatro y sin queja', async () => {
    const p = montar([]);
    await p.asentar();

    await p.escribir('Número de cuenta', 'es9121000418450200051332');

    expect(p.texto()).not.toContain('Ese IBAN no cuadra');
    expect(p.texto()).toContain('ES91 2100 0418 4502 0005 1332');
  });

  it('en blanco no es un error: es que no lo han puesto', async () => {
    const p = montar([]);
    await p.asentar();

    expect(p.texto()).not.toContain('Ese IBAN no cuadra');
    expect(p.texto()).not.toContain('Eso no es un móvil');
  });

  it('avisa de un Bizum que no es un móvil', async () => {
    const p = montar([]);
    await p.asentar();

    await p.escribir('Bizum', '954112233');

    expect(p.texto()).toContain('Eso no es un móvil');
  });

  /** La duda de cualquiera al teclear su número de cuenta en una web. */
  it('dice en pantalla que el número no sale en la web abierta', async () => {
    const p = montar([]);
    await p.asentar();

    expect(p.texto()).toContain('Ni la cuenta ni el Bizum salen en la web abierta');
  });

  it('marca lo que ha cogido alguien, sin decir quién', async () => {
    const p = montar([regalo({ id: 'cafetera', titulo: 'Una cafetera', reservado: true })]);
    await p.asentar();

    expect(p.texto()).toContain('Lo ha cogido alguien');
    expect(p.texto()).toContain('Una cafetera');
  });

  it('señala lo apagado, que si no parece que falta', async () => {
    const p = montar([regalo({ id: 'viaje', titulo: 'Un viaje', enabled: false })]);
    await p.asentar();

    expect(p.texto()).toContain('Apagado');
  });

  it('sin lista, lo dice y explica que dejarla vacía vale', async () => {
    const p = montar([]);
    await p.asentar();

    expect(p.texto()).toContain('Todavía no hay lista');
  });
});
