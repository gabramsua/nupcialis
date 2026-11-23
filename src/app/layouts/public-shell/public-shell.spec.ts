import { signal, computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { SesionInvitado } from '../../core/firebase/sesion-invitado';
import type { ResultadoTenant } from '../../core/tenant/tenant-loader';
import type { ModoAcceso } from '../../core/acceso/acceso';
import { PublicShell } from './public-shell';
import { DRESS_CODE_VACIO } from '../../features/public-site/dress-code/dress-code';

/**
 * La envoltura de la web pública, vista como la ve el invitado.
 *
 * Lo que se vigila aquí, por orden de lo que costaría si se rompe:
 *
 * 1. **Que diga de quién cree que es la sesión.** Desde D-34 el enlace entra
 *    solo: quien recibe uno reenviado está dentro como otra persona sin haber
 *    hecho nada, y sin este aviso no hay forma de que lo sepa.
 * 2. **Que «¿No eres tú?» devuelva la puerta**, ahí mismo y sin recargar.
 * 3. **Que el token del enlace no pise una sesión ya verificada.** Volver a
 *    abrir el WhatsApp es lo que hace todo el mundo, y bajar de nivel a quien
 *    ya escribió sus cuatro dígitos le obligaría a escribirlos otra vez.
 * 4. **Que el token salga de la barra de direcciones** en cuanto se usa.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const TOKEN = 'abcdEFGH1234_-abcdEFGH1234_-abcd';

/**
 * Deja que la pantalla se asiente.
 *
 * Montar esto encadena varias promesas: recuperar la sesión, entrar con el
 * enlace si lo hay y cargar el módulo de la plantilla, que la primera vez
 * tarda lo que tarde en compilarse. Esperar un número fijo de vueltas haría
 * que el test pasara o no según lo rápida que sea la máquina, así que se
 * espera a que haya algo pintado.
 */
async function asentar(fixture: { detectChanges(): void; nativeElement: HTMLElement }) {
  for (let vuelta = 0; vuelta < 100; vuelta += 1) {
    await new Promise((listo) => setTimeout(listo, 5));
    fixture.detectChanges();
    if ((fixture.nativeElement.textContent ?? '').trim() !== '') return;
  }
}

/**
 * Una sesión de mentira con las mismas señales que la de verdad.
 *
 * Es un doble escrito a mano y no un espía: lo que se comprueba es lo que ve
 * el invitado en la pantalla, y para eso hace falta que cambiar el estado de
 * la sesión repinte, cosa que un objeto plano no hace.
 */
class SesionFalsa {
  readonly entradas: { slug: string; token: string }[] = [];
  salidas = 0;

  private readonly _guestId = signal<string | null>(null);
  private readonly _nivel = signal<'enlace' | 'verificado'>('enlace');
  private readonly _nombre = signal('');
  private readonly _resuelta = signal(false);

  readonly nombre = this._nombre.asReadonly();
  readonly resuelta = this._resuelta.asReadonly();
  readonly identificado = computed(() => this._guestId() !== null);
  readonly verificado = computed(() => this.identificado() && this._nivel() === 'verificado');

  /** Lo que habría recuperado Firebase: sesión previa, o ninguna. */
  previa: { guestId: string; nivel: 'enlace' | 'verificado'; nombre: string } | null = null;

  async recuperar(): Promise<void> {
    if (this.previa) {
      this._guestId.set(this.previa.guestId);
      this._nivel.set(this.previa.nivel);
      this._nombre.set(this.previa.nombre);
    }
    this._resuelta.set(true);
  }

  async entrarConEnlace(slug: string, token: string): Promise<void> {
    this.entradas.push({ slug, token });
    this._guestId.set('g-enlace');
    this._nivel.set('enlace');
    this._nombre.set('María');
    this._resuelta.set(true);
  }

  async salir(): Promise<void> {
    this.salidas += 1;
    this._guestId.set(null);
    this._nivel.set('enlace');
    this._nombre.set('');
    this._resuelta.set(true);
  }
}

function bodaOk(modo: ModoAcceso, layout: 'onepage' | 'multipage' = 'onepage'): ResultadoTenant {
  return {
    tipo: 'ok',
    weddingId: 'w1',
    slug: 'mms',
    sitio: {
      status: 'active',
      coupleNames: { partnerA: 'María', partnerB: 'Gabriel' },
      weddingDate: null,
      weddingTime: null,
      timezone: 'Europe/Madrid',
      indexable: false,
      guestAccessMode: modo,
      secciones: [],
      faqs: [],
      cronologia: [],
      alojamientos: [],
      ubicaciones: [],
      dressCode: DRESS_CODE_VACIO,
      historia: [],
      modulos: { rsvp: 'visible' },
      layout,
      locale: 'es',
      theme: { templateId: 'clasica', palette: null, heroImagePath: null, heroImageUrl: null },
    },
  };
}

async function montar(
  modo: ModoAcceso,
  sesion: SesionFalsa,
  layout: 'onepage' | 'multipage' = 'onepage',
) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideRouter([]),
      provideIconSprite('public'),
      { provide: SesionInvitado, useValue: sesion },
    ],
  });

  const fixture = TestBed.createComponent(PublicShell);
  fixture.componentRef.setInput('tenant', bodaOk(modo, layout));
  fixture.detectChanges();
  await asentar(fixture);

  return fixture;
}

function texto(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

describe('PublicShell: quién cree la web que eres', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('dice el nombre del invitado que ha entrado', async () => {
    const sesion = new SesionFalsa();
    sesion.previa = { guestId: 'g1', nivel: 'verificado', nombre: 'María José' };

    const fixture = await montar('name_phone4', sesion);

    expect(texto(fixture)).toContain('Estás viendo esto como María José');
    expect(texto(fixture)).toContain('¿No eres tú?');
  });

  /**
   * Sin nombre no se deja el hueco en blanco: un «Estás viendo esto como » a
   * medias parece un fallo, y el invitado no sabría si está dentro o no.
   */
  it('sin nombre dice que estás como invitado, pero lo dice', async () => {
    const sesion = new SesionFalsa();
    sesion.previa = { guestId: 'g1', nivel: 'verificado', nombre: '' };

    const fixture = await montar('name_phone4', sesion);

    expect(texto(fixture)).toContain('Estás viendo esto como invitado');
  });

  it('en una boda abierta no hay sesión que enseñar y la barra no sale', async () => {
    const fixture = await montar('open', new SesionFalsa());

    expect(texto(fixture)).not.toContain('¿No eres tú?');
  });

  it('«¿No eres tú?» cierra la sesión y devuelve la puerta, sin recargar', async () => {
    const sesion = new SesionFalsa();
    sesion.previa = { guestId: 'g1', nivel: 'verificado', nombre: 'María José' };
    const fixture = await montar('name_phone4', sesion);

    const boton = fixture.nativeElement.querySelector('.np-quien button') as HTMLButtonElement;
    boton.click();
    await asentar(fixture);

    expect(sesion.salidas).toBe(1);
    expect(texto(fixture)).not.toContain('Estás viendo esto como María José');
    // La puerta vuelve sola: el bloque diferido se resuelve al quedarse sin sesión.
    expect(texto(fixture)).not.toContain('¿No eres tú?');
  });
});

describe('PublicShell: el enlace de la pareja (D-34)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('entra con el token que trae el enlace', async () => {
    window.history.replaceState({}, '', `/?k=${TOKEN}`);
    const sesion = new SesionFalsa();

    const fixture = await montar('name_phone4', sesion);

    expect(sesion.entradas).toEqual([{ slug: 'mms', token: TOKEN }]);
    expect(texto(fixture)).toContain('Estás viendo esto como María');
  });

  /** Queda en el historial del móvil y en lo que se comparta desde el navegador. */
  it('borra el token de la barra de direcciones en cuanto lo usa', async () => {
    window.history.replaceState({}, '', `/?k=${TOKEN}&otra=cosa`);

    await montar('name_phone4', new SesionFalsa());

    expect(window.location.search).not.toContain(TOKEN);
    expect(window.location.search).toContain('otra=cosa');
  });

  /**
   * Lo que no puede pasar: que volver a abrir el WhatsApp baje de `verificado`
   * a `enlace` a quien ya escribió sus cuatro dígitos.
   */
  it('no pisa una sesión ya verificada', async () => {
    window.history.replaceState({}, '', `/?k=${TOKEN}`);
    const sesion = new SesionFalsa();
    sesion.previa = { guestId: 'g1', nivel: 'verificado', nombre: 'María José' };

    const fixture = await montar('name_phone4', sesion);

    expect(sesion.entradas).toEqual([]);
    expect(texto(fixture)).toContain('Estás viendo esto como María José');
    // Y aun así el token sale de la URL: ya no hace falta para nada.
    expect(window.location.search).toBe('');
  });
});

describe('PublicShell: la cabecera de navegación', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('la web de varias páginas lleva cabecera y deja el botón de confirmar en ella', async () => {
    const sesion = new SesionFalsa();
    sesion.previa = { guestId: 'g1', nivel: 'verificado', nombre: 'María José' };

    const fixture = await montar('name_phone4', sesion, 'multipage');
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('np-cabecera-boda')).not.toBeNull();
    // El flotante de la web de una página se sustituye por el de la cabecera.
    expect(el.querySelector('.np-confirmar')).toBeNull();
    expect(el.querySelector('np-cabecera-boda .cb__confirmar')).not.toBeNull();
  });

  it('la web de una página sigue como estaba: sin cabecera y con el botón flotante', async () => {
    const sesion = new SesionFalsa();
    sesion.previa = { guestId: 'g1', nivel: 'verificado', nombre: 'María José' };

    const fixture = await montar('name_phone4', sesion, 'onepage');
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('np-cabecera-boda')).toBeNull();
    expect(el.querySelector('.np-confirmar')).not.toBeNull();
  });
});
