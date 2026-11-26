import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import type {
  CredencialesInvitado,
  ModoAcceso,
  ResultadoAcceso,
} from '../../../core/acceso/acceso';
import { SesionInvitado } from '../../../core/firebase/sesion-invitado';
import { NpVerificar } from './verificar';

/**
 * «Confirma que eres tú»: de sesión de enlace a verificada (D-34).
 *
 * Lo que se vigila:
 *
 * 1. **Que se le diga por qué.** Pedir datos sin explicarlo parece un trámite
 *    inventado, y el invitado está de pie en la cocina con el móvil.
 * 2. **Que no se le vuelva a pedir el nombre**: ya sabemos quién dice ser.
 * 3. **Que en modo C se pida el teléfono** y no cuatro dígitos que ahí no
 *    significan nada.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar(modo: ModoAcceso, respuesta: ResultadoAcceso = { ok: true, guestId: 'g1' }) {
  const intentos: CredencialesInvitado[] = [];
  let verificados = 0;

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('public'),
      {
        provide: SesionInvitado,
        useValue: {
          async verificar(credenciales: CredencialesInvitado) {
            intentos.push(credenciales);
            return respuesta;
          },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(NpVerificar);
  fixture.componentRef.setInput('modo', modo);
  fixture.componentInstance.verificado.subscribe(() => verificados++);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    intentos,
    cuantosVerificados: () => verificados,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    campos: () => [...raiz.querySelectorAll('input')].map((i) => i.getAttribute('formcontrolname')),
    escribir(valores: Record<string, string>) {
      const grupo = (
        fixture.componentInstance as unknown as {
          formulario: { patchValue(v: Record<string, string>): void };
        }
      ).formulario;
      grupo.patchValue(valores);
      fixture.detectChanges();
    },
    async enviar() {
      raiz
        .querySelector<HTMLFormElement>('form')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
  };
}

describe('confirmar que eres tú', () => {
  it('explica por qué se le pide', () => {
    expect(montar('name_phone4').texto()).toContain('Estos enlaces se reenvían');
  });

  /** Ya sabemos quién dice ser: el nombre no se vuelve a pedir. */
  it('en modo nombre y dígitos solo pide los dígitos', () => {
    expect(montar('name_phone4').campos()).toEqual(['digitos']);
  });

  it('en modo teléfono pide el teléfono', () => {
    expect(montar('phone').campos()).toEqual(['telefono']);
  });

  it('manda lo que corresponde al modo', async () => {
    const p = montar('name_phone4');
    p.escribir({ digitos: '3456' });
    await p.enviar();

    expect(p.intentos).toEqual([{ digitos: '3456' }]);
    expect(p.cuantosVerificados()).toBe(1);
  });

  it('en modo teléfono manda el teléfono', async () => {
    const p = montar('phone');
    p.escribir({ telefono: '600111222' });
    await p.enviar();

    expect(p.intentos).toEqual([{ telefono: '600111222' }]);
  });

  it('sin los cuatro dígitos no deja enviar', async () => {
    const p = montar('name_phone4');
    p.escribir({ digitos: '34' });
    await p.enviar();

    expect(p.intentos).toEqual([]);
    expect(p.raiz.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });

  it('si no coincide lo dice, sin decir si el invitado existe', async () => {
    const p = montar('name_phone4', { ok: false, fallo: { tipo: 'no-identificado' } });
    p.escribir({ digitos: '0000' });
    await p.enviar();

    expect(p.texto()).toContain('Eso no coincide');
    expect(p.cuantosVerificados()).toBe(0);
  });

  it('con demasiados intentos dice cuánto esperar', async () => {
    const p = montar('name_phone4', {
      ok: false,
      fallo: { tipo: 'demasiados-intentos', esperaMs: 5 * 60 * 1000 },
    });
    p.escribir({ digitos: '0000' });
    await p.enviar();

    expect(p.texto()).toContain('5 minuto(s)');
  });

  /** Lo que ha fallado son los dígitos: se borran para volver a escribirlos. */
  it('tras fallar, los dígitos se vacían', async () => {
    const p = montar('name_phone4', { ok: false, fallo: { tipo: 'no-identificado' } });
    p.escribir({ digitos: '0000' });
    await p.enviar();

    expect(p.raiz.querySelector<HTMLInputElement>('[formcontrolname="digitos"]')!.value).toBe('');
  });
});
