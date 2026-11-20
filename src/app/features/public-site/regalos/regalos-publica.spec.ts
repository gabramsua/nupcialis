import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_REGALOS,
  type PuertaRegalos,
  type ResultadoRegalos,
} from '../../../core/regalos/regalos-gateway';
import { sanearAportacion, sanearRegalos } from './regalos';
import { NpRegalosPublica } from './regalos-publica';

/**
 * Los regalos, como los ve el invitado (§8.8).
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que no se diga nunca quién ha cogido qué.** Es lo único de este módulo
 *    que, mal hecho, se nota en la comida de después.
 * 2. **Que el IBAN se lea**, en grupos de cuatro, porque alguien lo va a
 *    teclear en la aplicación de su banco mirando esta pantalla.
 * 3. **Que soltar solo salga en lo suyo.**
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const APORTACION = {
  iban: 'ES91 2100 0418 4502 0005 1332',
  titular: 'María Pérez',
  bizum: '666112233',
  mensaje: 'Si os apetece regalarnos algo.',
};

function montar(crudos: readonly Record<string, unknown>[], aportacion = APORTACION) {
  let lista = [...crudos];
  const llamadas: string[] = [];

  const servir = (): ResultadoRegalos => ({
    ok: true,
    aportacion: sanearAportacion(aportacion),
    regalos: sanearRegalos(lista, 'yo'),
  });

  const doble: PuertaRegalos = {
    async listar() {
      llamadas.push('listar');
      return servir();
    },
    async reservar(giftId: string) {
      llamadas.push(`reservar:${giftId}`);
      lista = lista.map((r) => (r['id'] === giftId ? { ...r, reservedBy: 'yo' } : r));
      return servir();
    },
    async soltar(giftId: string) {
      llamadas.push(`soltar:${giftId}`);
      lista = lista.map((r) => (r['id'] === giftId ? { ...r, reservedBy: null } : r));
      return servir();
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
      provideIconSprite('public'),
      provideRouter([]),
      { provide: PUERTA_REGALOS, useValue: doble },
    ],
  });

  const fixture = TestBed.createComponent(NpRegalosPublica);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;

  const asentar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };

  return {
    raiz,
    llamadas,
    asentar,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
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

const CAFETERA = { id: 'cafetera', titulo: 'Una cafetera decente', precio: 120, order: 0 };

describe('los regalos del invitado', () => {
  it('enseña el IBAN en grupos de cuatro, que es como se teclea', async () => {
    const p = montar([]);
    await p.asentar();

    expect(p.texto()).toContain('ES91 2100 0418 4502 0005 1332');
    expect(p.texto()).toContain('666112233');
    expect(p.texto()).toContain('María Pérez');
  });

  /** El que importa: la reserva es anónima para el resto (§8.8). */
  it('dice que algo está cogido, nunca por quién', async () => {
    const p = montar([{ ...CAFETERA, reservedBy: 'pepe' }]);
    await p.asentar();

    expect(p.texto()).toContain('Ya lo ha cogido alguien');
    expect(p.texto()).not.toContain('pepe');
    expect(p.boton('Lo cojo yo')).toBeUndefined();
  });

  it('lo libre se puede coger, y al cogerlo pasa a ser mío', async () => {
    const p = montar([CAFETERA]);
    await p.asentar();

    await p.pulsar(p.boton('Lo cojo yo')!);

    expect(p.llamadas).toContain('reservar:cafetera');
    expect(p.texto()).toContain('Lo tienes tú');
  });

  it('solo lo mío se puede soltar', async () => {
    const p = montar([
      { ...CAFETERA, reservedBy: 'yo' },
      { id: 'manta', titulo: 'La manta', order: 1, reservedBy: 'pepe' },
    ]);
    await p.asentar();

    const soltar = [...p.raiz.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('Soltarlo'),
    );
    expect(soltar).toHaveLength(1);

    await p.pulsar(soltar[0] as HTMLButtonElement);
    expect(p.llamadas).toContain('soltar:cafetera');
  });

  it('cuenta cuántos quedan por coger', async () => {
    const p = montar([CAFETERA, { id: 'manta', titulo: 'La manta', order: 1, reservedBy: 'pepe' }]);
    await p.asentar();

    expect(p.texto()).toContain('1 por coger');
  });

  it('sin nada que enseñar, lo dice en vez de dejar la página en blanco', async () => {
    const p = montar([], { iban: '', titular: '', bizum: '', mensaje: '' });
    await p.asentar();

    expect(p.texto()).toContain('Todavía no han puesto nada por aquí');
  });

  it('si no está verificado, lo dice con lo que tiene que hacer', async () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: ES },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideIconSprite('public'),
        provideRouter([]),
        {
          provide: PUERTA_REGALOS,
          useValue: {
            async listar() {
              return { ok: false, fallo: { tipo: 'sin-verificar' } };
            },
            async reservar() {
              return { ok: false, fallo: { tipo: 'sin-verificar' } };
            },
            async soltar() {
              return { ok: false, fallo: { tipo: 'sin-verificar' } };
            },
          } satisfies PuertaRegalos,
        },
      ],
    });

    const fixture = TestBed.createComponent(NpRegalosPublica);
    fixture.detectChanges();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('cuatro últimos dígitos');
  });
});
