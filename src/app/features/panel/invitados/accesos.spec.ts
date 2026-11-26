import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_ACCESOS,
  type EntradaDeAcceso,
  type PuertaAccesos,
  type ResultadoAccesos,
} from '../../../core/invitados/accesos-gateway';
import { Accesos } from './accesos';

/**
 * El registro de accesos, como lo lee la pareja.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que el aviso de «varios aparatos» salga cuando toca y calle cuando no.**
 *    Es lo único de esta pantalla que puede hacer que la pareja llame a
 *    alguien a preguntarle si ha reenviado su invitación.
 * 2. **Que se vea quién entró y cuándo**, que es a lo que viene.
 * 3. **Que un error no salga como un código del SDK**, que ya pasó una vez.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

let contador = 0;

function entrada(parcial: Partial<EntradaDeAcceso> = {}): EntradaDeAcceso {
  contador += 1;
  return {
    id: `e${contador}`,
    guestId: 'g1',
    nombre: 'María José Pérez',
    mote: '',
    modo: 'enlace',
    dispositivo: 'Android · Chrome',
    // En hora local: es la que ve quien mira la pantalla.
    cuando: new Date(2026, 10, 13, 10, 30).toISOString(),
    ...parcial,
  };
}

function conEntradas(entradas: readonly EntradaDeAcceso[], tope = 300): ResultadoAccesos {
  return { ok: true, datos: { entradas, tope } };
}

async function montar(resultado: ResultadoAccesos) {
  const doble: PuertaAccesos = {
    async leer() {
      return resultado;
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
      { provide: PUERTA_ACCESOS, useValue: doble },
    ],
  });

  const fixture = TestBed.createComponent(Accesos);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return { fixture, raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

describe('quién ha entrado', () => {
  it('dice cuántas entradas y de cuántos invitados', async () => {
    const p = await montar(
      conEntradas([
        entrada({ guestId: 'g1' }),
        entrada({ guestId: 'g1' }),
        entrada({ guestId: 'g2' }),
      ]),
    );

    expect(p.texto()).toContain('3 entradas de 2 invitados');
  });

  it('enseña a quién, a qué hora y desde qué aparato', async () => {
    const p = await montar(
      conEntradas([
        entrada({ mote: 'Marijose', cuando: new Date(2026, 10, 13, 9, 5).toISOString() }),
      ]),
    );

    expect(p.texto()).toContain('Marijose');
    expect(p.texto()).toContain('09:05');
    expect(p.texto()).toContain('Android · Chrome');
  });

  it('distingue quien entró por el enlace de quien puso sus datos', async () => {
    const p = await montar(
      conEntradas([entrada({ modo: 'enlace' }), entrada({ modo: 'name_phone4' })]),
    );

    expect(p.texto()).toContain('Por el enlace');
    expect(p.texto()).toContain('Con sus datos');
  });

  /** Un modo que no conocemos no puede dejar la línea a medias. */
  it('un modo desconocido se enseña igual, sin romper nada', async () => {
    const p = await montar(conEntradas([entrada({ modo: 'lo-que-sea' })]));

    expect(p.texto()).toContain('Entrada');
    expect(p.texto()).toContain('María José Pérez');
  });

  it('un invitado borrado después de entrar deja su línea, dicho claro', async () => {
    const p = await montar(conEntradas([entrada({ nombre: '', mote: '' })]));

    expect(p.texto()).toContain('Invitado borrado');
  });

  it('un aparato sin reconocer se dice, no se deja en blanco', async () => {
    const p = await montar(conEntradas([entrada({ dispositivo: '' })]));

    expect(p.texto()).toContain('Aparato sin reconocer');
  });
});

describe('el aviso de invitaciones que circulan (D-34)', () => {
  const TRES_APARATOS = [
    entrada({ guestId: 'g1', dispositivo: 'iPhone · Safari' }),
    entrada({ guestId: 'g1', dispositivo: 'Android · Chrome' }),
    entrada({ guestId: 'g1', dispositivo: 'Windows · Edge' }),
  ];

  it('avisa, con el nombre y los aparatos', async () => {
    const p = await montar(conEntradas(TRES_APARATOS));

    expect(p.texto()).toContain('se están abriendo desde varios aparatos');
    expect(p.texto()).toContain('María José Pérez');
    expect(p.texto()).toContain('Windows · Edge');
  });

  /**
   * Lo que no puede pasar: que el aviso salte con el móvil y el ordenador de
   * casa. Un aviso que salta siempre no lo lee nadie, y este acusa a alguien.
   */
  it('con dos aparatos no dice nada', async () => {
    const p = await montar(
      conEntradas([
        entrada({ dispositivo: 'iPhone · Safari' }),
        entrada({ dispositivo: 'Windows · Edge' }),
      ]),
    );

    expect(p.texto()).not.toContain('se están abriendo desde varios aparatos');
  });
});

describe('los estados que no son una lista', () => {
  it('sin entradas lo dice y explica cuándo saldrá algo', async () => {
    const p = await montar(conEntradas([]));

    expect(p.texto()).toContain('Todavía no ha entrado nadie');
  });

  /**
   * Si vienen justo las del tope, hay más detrás. Callarlo haría creer que la
   * boda empezó el día de la entrada más antigua que se ve.
   */
  it('dice que solo se ven las últimas cuando el servidor ha recortado', async () => {
    const tres = [entrada(), entrada(), entrada()];

    expect((await montar(conEntradas(tres, 3))).texto()).toContain('últimas 3 entradas');
  });

  it('y no lo dice cuando cabe todo, que es lo normal', async () => {
    const tres = [entrada(), entrada(), entrada()];

    expect((await montar(conEntradas(tres, 300))).texto()).not.toContain('Solo se guardan');
  });

  it('un error sale en castellano, nunca como un código del SDK', async () => {
    const p = await montar({
      ok: false,
      fallo: { tipo: 'error', mensaje: 'Unauthenticated [401]' },
    });

    expect(p.texto()).toContain('No se ha podido cargar el registro');
    expect(p.texto()).not.toContain('401');
    expect(p.texto()).not.toContain('Unauthenticated');
  });

  it('sin conexión lo dice como lo diría una persona', async () => {
    const p = await montar({ ok: false, fallo: { tipo: 'red' } });

    expect(p.texto()).toContain('No hay conexión');
  });
});
