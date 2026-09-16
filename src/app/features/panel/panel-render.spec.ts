import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { FIREBASE_STORAGE } from '../../core/firebase/storage.providers';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { SECCIONES_INICIALES } from '../public-site/secciones/secciones';
import type { BodaDelPanel } from './boda';
import { BodaStore } from './boda.store';
import { DatosBoda } from './datos/datos-boda';
import { Diseno } from './diseno/diseno';
import { SelectorPaleta } from './diseno/selector-paleta';
import { SelectorPortada } from './diseno/selector-portada';
import { SelectorPlantilla } from './diseno/selector-plantilla';
import { PanelResumen } from './resumen/resumen';
import { EditorSecciones } from './web/editor-secciones';

/**
 * Humo del panel de la pareja: que cada pantalla se monte sin lanzar.
 *
 * Este fichero existe por un fallo concreto. `guardaPanel` inyectaba después de
 * un `await`, lo que lanza `NG0203`, y **el panel de la pareja no llegó a
 * abrirse nunca desde que se escribió**. Nadie se enteró porque no había una
 * sola prueba que montara ninguna de estas pantallas: todas las que había eran
 * de funciones puras, y las funciones puras estaban bien.
 *
 * No comprueba qué se ve, comprueba que se ve algo. Es poco, y es exactamente
 * lo que faltaba: montar un componente destapa inyecciones que no existen,
 * plantillas que no compilan y `computed` que revientan con datos vacíos.
 */

const BODA: BodaDelPanel = {
  weddingId: 'w1',
  slug: 'mms',
  status: 'active',
  plan: 'basic',
  weddingDate: new Date('2027-06-12T00:00:00.000Z'),
  weddingTime: '17:00',
  timezone: 'Europe/Madrid',
  templateId: 'clasica',
  indexable: false,
  palette: null,
  heroImagePath: null,
  heroImageUrl: null,
  secciones: SECCIONES_INICIALES,
  modulos: { publicSite: { enabled: true, visibility: 'visible' } },
};

/** Un store de mentira: estas pruebas no tocan Firestore ni sesión. */
type Estado = 'cargando' | 'lista' | 'sin-boda' | 'error';

class BodaStoreFalso {
  readonly boda: () => BodaDelPanel | null = () => BODA;
  readonly estado: () => Estado = () => 'lista';
  readonly error = () => '';
  readonly menu = () => [];
  readonly sinPublicar = () => 0;
  async cargar(): Promise<void> {
    // El store real lee de Firestore al construirse. Aquí no hay nada que leer.
    return;
  }
  async cambiarPlantilla(): Promise<boolean> {
    return true;
  }
  async guardarPaleta(): Promise<boolean> {
    return true;
  }
  async guardarPortada(): Promise<boolean> {
    return true;
  }
  async guardarSecciones(): Promise<boolean> {
    return true;
  }
  async guardarHora(): Promise<boolean> {
    return true;
  }
}

function montar(componente: Type<unknown>) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: {} },
        // Diccionario vacío a propósito: aquí se prueba que la pantalla se
        // monta, no qué pone. Transloco devuelve la clave y con eso basta.
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      { provide: BodaStore, useClass: BodaStoreFalso },
      // `SelectorPortada` crea su almacén en un inicializador de campo, así que
      // el token tiene que existir aunque no se use.
      { provide: FIREBASE_STORAGE, useValue: {} },
    ],
  });

  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  return fixture;
}

const PANTALLAS: readonly [string, Type<unknown>][] = [
  ['resumen', PanelResumen],
  ['datos de la boda', DatosBoda],
  ['diseño', Diseno],
  ['selector de plantilla', SelectorPlantilla],
  ['selector de paleta', SelectorPaleta],
  ['selector de portada', SelectorPortada],
  ['editor de secciones', EditorSecciones],
];

describe.each(PANTALLAS)('la pantalla de %s', (_nombre, Pantalla) => {
  it('se monta sin lanzar', () => {
    expect(() => montar(Pantalla)).not.toThrow();
  });

  it('pinta algo', () => {
    const fixture = montar(Pantalla);
    expect(fixture.nativeElement.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});

/**
 * El caso que de verdad rompe: una boda a medio cargar.
 *
 * Es el estado real al entrar —el store arranca en `cargando` con la boda a
 * `null`— y es donde un `computed` que da por hecho que hay datos se cae.
 */
describe('con la boda todavía sin cargar', () => {
  class StoreVacio extends BodaStoreFalso {
    override readonly boda: () => BodaDelPanel | null = () => null;
    override readonly estado: () => Estado = () => 'cargando';
  }

  it.each(PANTALLAS)('%s aguanta sin datos', (_nombre, Pantalla) => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideIconSprite('panel'),
        { provide: BodaStore, useClass: StoreVacio },
        { provide: FIREBASE_STORAGE, useValue: {} },
      ],
    });

    expect(() => {
      const fixture = TestBed.createComponent(Pantalla);
      fixture.detectChanges();
    }).not.toThrow();
  });
});
