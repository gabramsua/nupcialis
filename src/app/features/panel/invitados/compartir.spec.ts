import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import type { Invitado } from '../../../core/invitados/invitados-gateway';
import type { BodaDelPanel } from '../boda';
import { BodaStore } from '../boda.store';
import {
  PUERTA_ENLACES,
  type PuertaEnlaces,
  type ResultadoEnlace,
} from '../../../core/invitados/enlaces-gateway';
import { NpCompartirInvitado } from './compartir';
import { BODA_DE_PRUEBA, INVITADO_DE_PRUEBA, abrirDialogosEnPruebas } from './dobles.testing';

/**
 * La pantalla de mandar la invitación.
 *
 * Lo que se vigila aquí es **lo que acaba en el enlace**: esta pantalla es la
 * única que lo construye, y un enlace con los cuatro dígitos dentro convertiría
 * cualquier reenvío al grupo de la familia en doce personas siendo el mismo
 * invitado. Lo demás —el aviso de quien no tiene móvil, la plantilla que se
 * edita viendo el resultado— es lo que evita mandar doscientos mensajes malos.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const MARIA: Invitado = { ...INVITADO_DE_PRUEBA, phone: '+34666123456' };

/** La boda de pruebas, pero con puerta: es donde el enlace lleva el nombre. */
function boda(parcial: Partial<BodaDelPanel> = {}): BodaDelPanel {
  return { ...BODA_DE_PRUEBA, guestAccessMode: 'name_phone4', ...parcial };
}

const TOKEN = 'abcdEFGH1234_-abcdEFGH1234_-abcd';

async function montar(
  invitado: Invitado,
  datos = boda(),
  enlace: ResultadoEnlace = { ok: true, token: TOKEN, rotado: false },
) {
  const guardados: string[] = [];
  const pedidos: { guestId: string; rotar: boolean }[] = [];

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      {
        provide: PUERTA_ENLACES,
        useValue: {
          async obtener(guestId: string, rotar = false) {
            pedidos.push({ guestId, rotar });
            return enlace;
          },
        } satisfies PuertaEnlaces,
      },
      {
        provide: BodaStore,
        useValue: {
          boda: () => datos,
          async guardarMensajeInvitacion(mensaje: string) {
            guardados.push(mensaje);
          },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(NpCompartirInvitado);
  fixture.componentRef.setInput('invitado', invitado);
  fixture.detectChanges();
  // El token lo da el servidor (D-34): hay que dejar llegar la llamada.
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    guardados,
    pedidos,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    mensaje: () => raiz.querySelector<HTMLTextAreaElement>('.cmp > label textarea')!.value,
    whatsapp: () => raiz.querySelector<HTMLAnchorElement>('a[href^="https://wa.me"]')!.href,
    escribirPlantilla(texto: string) {
      const area = raiz.querySelectorAll<HTMLTextAreaElement>('textarea')[1]!;
      area.value = texto;
      area.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    },
  };
}

describe('mandar la invitación', async () => {
  it('escribe el mensaje de fábrica con los datos de la boda', async () => {
    const p = await montar(MARIA);

    // El mote, no el nombre completo: en un WhatsApp se lee mejor.
    expect(p.mensaje()).toContain('¡Hola Majo!');
    expect(p.mensaje()).toContain('María y Gabriel');
    expect(p.mensaje()).not.toContain('{');
  });

  /**
   * **La prueba que importa.** El enlace abre la web; lo que autoriza son los
   * cuatro dígitos, y no viajan (D-34, opción 3).
   */
  it('el enlace lleva el token y nada más: ni teléfono, ni dígitos, ni nombre', async () => {
    const p = await montar(MARIA);

    for (const dato of ['666123456', '3456', 'Pérez', 'P%C3%A9rez']) {
      expect(p.mensaje()).not.toContain(dato);
    }
    expect(p.mensaje()).toContain(`?k=${TOKEN}`);
  });

  it('el token lo pide al servidor, para este invitado', async () => {
    const p = await montar(MARIA);

    expect(p.pedidos).toEqual([{ guestId: 'g1', rotar: false }]);
  });

  it('si el enlace no se puede preparar, se cuenta con palabras', async () => {
    const p = await montar(MARIA, boda(), { ok: false, fallo: { tipo: 'no-existe' } });

    expect(p.texto()).toContain('ya no está en la lista');
  });

  /** La única forma de invalidar un enlace que se fue donde no debía. */
  it('cambiar el enlace lo pide otra vez, rotando', async () => {
    const p = await montar(MARIA);
    const boton = [...p.raiz.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('Cambiar el enlace'),
    )!;
    boton.click();
    await new Promise((listo) => setTimeout(listo, 0));

    expect(p.pedidos[1]).toEqual({ guestId: 'g1', rotar: true });
  });

  it('el botón de WhatsApp apunta al móvil del invitado, sin el más', async () => {
    const p = await montar(MARIA);

    expect(p.whatsapp()).toContain('wa.me/34666123456?text=');
  });

  it('a quien no tiene móvil se le avisa antes de mandarle un enlace que no puede abrir', async () => {
    const p = await montar({ ...MARIA, phone: null });

    expect(p.texto()).toContain('No va a poder entrar');
  });

  it('en una boda abierta no avisa de nada: ahí entra cualquiera', async () => {
    const p = await montar({ ...MARIA, phone: null }, boda({ guestAccessMode: 'open' }));

    expect(p.texto()).not.toContain('No va a poder entrar');
  });

  it('parte de la plantilla que la pareja ya guardó', async () => {
    const p = await montar(MARIA, boda({ inviteMessage: 'Oye {nombre}, que nos casamos' }));

    expect(p.mensaje()).toBe('Oye Majo, que nos casamos');
  });

  /**
   * La plantilla se edita viendo el resultado: es donde se nota que falta un
   * salto de línea o que el marcador está mal escrito.
   */
  it('al cambiar la plantilla, el mensaje de este invitado se rehace', async () => {
    const p = await montar(MARIA);
    p.escribirPlantilla('{nombre}, el {fecha}');

    expect(p.mensaje()).toBe('Majo, el sábado, 12 de junio de 2027');
  });

  it('guardar la plantilla la manda tal cual a la boda, no el mensaje montado', async () => {
    const p = await montar(MARIA);
    p.escribirPlantilla('Hola {nombre}');
    p.raiz.querySelector<HTMLButtonElement>('details button')!.click();
    await Promise.resolve();

    expect(p.guardados).toEqual(['Hola {nombre}']);
  });
});

/**
 * Mientras el servidor no da el token no hay enlace que mandar.
 *
 * Enseñar el mensaje con un hueco donde va la URL es peor que decir que se
 * está preparando: la pareja lo copia y manda un WhatsApp sin enlace.
 */
describe('mientras llega el enlace', () => {
  it('lo dice, y no ofrece el botón de WhatsApp', () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: ES },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideIconSprite('panel'),
        {
          provide: PUERTA_ENLACES,
          // No contesta nunca: así se ve el estado intermedio.
          useValue: {
            obtener: () =>
              new Promise<never>(() => {
                // A propósito: nunca contesta.
              }),
          } satisfies PuertaEnlaces,
        },
        {
          provide: BodaStore,
          useValue: {
            boda: () => boda(),
            async guardarMensajeInvitacion() {
              return true;
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(NpCompartirInvitado);
    fixture.componentRef.setInput('invitado', MARIA);
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Preparando el enlace');
    expect(raiz.querySelector('.cmp__sinEnlace')).not.toBeNull();
  });
});
