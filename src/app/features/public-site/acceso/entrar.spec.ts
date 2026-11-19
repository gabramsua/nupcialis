import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { CredencialesInvitado, ResultadoAcceso } from '../../../core/acceso/acceso';
import { SesionInvitado } from '../../../core/firebase/sesion-invitado';
import { Entrar } from './entrar';

/**
 * La puerta, vista como la ve un invitado.
 *
 * Lo que de verdad se puede romper aquí no es el formulario: es **lo que sale
 * cuando falla**. El servidor manda una sola respuesta para «no estás en la
 * lista» y para «esos dígitos no son» (regla 3), y basta con que la pantalla
 * invente dos mensajes distintos para que esto se convierta en un buscador de
 * invitados. Por eso se lee el texto renderizado con el diccionario de verdad.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function sesionFalsa(respuesta: ResultadoAcceso) {
  const llamadas: { slug: string; credenciales: CredencialesInvitado }[] = [];
  return {
    llamadas,
    doble: {
      async entrar(slug: string, credenciales: CredencialesInvitado) {
        llamadas.push({ slug, credenciales });
        return respuesta;
      },
    },
  };
}

function montar(modo: 'name_phone4' | 'phone', respuesta: ResultadoAcceso, previo = '') {
  const sesion = sesionFalsa(respuesta);

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [{ provide: SesionInvitado, useValue: sesion.doble }],
  });

  const fixture = TestBed.createComponent(Entrar);
  fixture.componentRef.setInput('modo', modo);
  fixture.componentRef.setInput('slug', 'mms');
  fixture.componentRef.setInput('nombres', 'María & Gabriel');
  fixture.componentRef.setInput('nombrePrevio', previo);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    sesion,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    campos: () => [...raiz.querySelectorAll('input')].map((i) => i.getAttribute('formcontrolname')),
    valor: (campo: string) =>
      raiz.querySelector<HTMLInputElement>(`input[formcontrolname="${campo}"]`)?.value ?? null,
    escribir(valores: Record<string, string>) {
      const c = (
        fixture.componentInstance as unknown as {
          formulario: { patchValue(v: Record<string, string>): void };
        }
      ).formulario;
      c.patchValue(valores);
      fixture.detectChanges();
    },
    async enviar() {
      await (fixture.componentInstance as unknown as { entrar(): Promise<void> }).entrar();
      fixture.detectChanges();
    },
  };
}

const BIEN: ResultadoAcceso = { ok: true, guestId: 'g1' };

describe('la puerta en modo nombre y cuatro dígitos', () => {
  it('pide las dos cosas y dice de qué boda es', async () => {
    const p = montar('name_phone4', BIEN);

    expect(p.campos()).toEqual(['nombre', 'digitos']);
    expect(p.texto()).toContain('María & Gabriel');
    expect(p.texto()).toContain('Últimos 4 números de tu móvil');
  });

  /**
   * El teclado numérico en el móvil no es un detalle: con el de letras, teclear
   * cuatro dígitos en un enlace de WhatsApp es pelearse con el teléfono.
   */
  it('los dígitos salen con teclado numérico y tope de cuatro', () => {
    const digitos = (montar('name_phone4', BIEN).raiz.querySelector(
      '[formcontrolname="digitos"]',
    ) as HTMLInputElement)!;

    expect(digitos.getAttribute('inputmode')).toBe('numeric');
    expect(digitos.getAttribute('maxlength')).toBe('4');
  });

  it('manda el slug y lo escrito, sin el teléfono que aquí no se pide', async () => {
    const p = montar('name_phone4', BIEN);
    p.escribir({ nombre: 'María José Pérez', digitos: '3456' });
    await p.enviar();

    expect(p.sesion.llamadas).toEqual([
      { slug: 'mms', credenciales: { nombre: 'María José Pérez', digitos: '3456' } },
    ]);
  });

  it('sin los cuatro dígitos no deja enviar', async () => {
    const p = montar('name_phone4', BIEN);
    p.escribir({ nombre: 'María José Pérez', digitos: '34' });
    await p.enviar();

    expect(p.sesion.llamadas).toEqual([]);
  });
});

describe('la puerta en modo teléfono', () => {
  it('pide solo el móvil', () => {
    expect(montar('phone', BIEN).campos()).toEqual(['telefono']);
  });

  it('manda solo el móvil', async () => {
    const p = montar('phone', BIEN);
    p.escribir({ telefono: '666123456' });
    await p.enviar();

    expect(p.sesion.llamadas[0]!.credenciales).toEqual({ telefono: '666123456' });
  });
});

describe('cuando no entra', () => {
  /**
   * **Lo que no puede pasar nunca.** Si el mensaje cambiara según el motivo,
   * cualquiera averiguaría quién está invitado probando nombres.
   */
  it('el mensaje no dice si falla el nombre o los dígitos', async () => {
    const p = montar('name_phone4', { ok: false, fallo: { tipo: 'no-identificado' } });
    p.escribir({ nombre: 'Nadie De Nada', digitos: '0000' });
    await p.enviar();

    const texto = p.texto();
    expect(texto).toContain('No te encontramos con esos datos');
    for (const soplo of ['no está en la lista', 'no existe', 'no coincide', 'incorrecto']) {
      expect(texto).not.toContain(soplo);
    }
  });

  it('el aviso se anuncia a un lector de pantalla', async () => {
    const p = montar('name_phone4', { ok: false, fallo: { tipo: 'no-identificado' } });
    p.escribir({ nombre: 'Nadie', digitos: '0000' });
    await p.enviar();

    expect(p.raiz.querySelector('[role="alert"]')?.textContent).toContain('No te encontramos');
  });

  it('borra los dígitos y conserva el nombre, que casi nunca es lo que falla', async () => {
    const p = montar('name_phone4', { ok: false, fallo: { tipo: 'no-identificado' } });
    p.escribir({ nombre: 'María José Pérez', digitos: '0000' });
    await p.enviar();

    const campos = p.raiz.querySelectorAll<HTMLInputElement>('input');
    expect(campos[0]!.value).toBe('María José Pérez');
    expect(campos[1]!.value).toBe('');
  });

  it('con demasiados intentos dice cuánto hay que esperar, en minutos', async () => {
    const p = montar('phone', {
      ok: false,
      fallo: { tipo: 'demasiados-intentos', esperaMs: 5 * 60 * 1000 },
    });
    p.escribir({ telefono: '600000000' });
    await p.enviar();

    expect(p.texto()).toContain('dentro de 5 minuto(s)');
  });

  it('una espera de segundos se cuenta como un minuto, no como cero', async () => {
    const p = montar('phone', {
      ok: false,
      fallo: { tipo: 'demasiados-intentos', esperaMs: 12_000 },
    });
    p.escribir({ telefono: '600000000' });
    await p.enviar();

    expect(p.texto()).toContain('dentro de 1 minuto(s)');
  });

  it('un fallo de App Check se cuenta aparte: no se arregla reescribiendo el nombre', async () => {
    const p = montar('phone', { ok: false, fallo: { tipo: 'sin-verificar' } });
    p.escribir({ telefono: '600000000' });
    await p.enviar();

    expect(p.texto()).toContain('Recarga la página');
  });

  /**
   * F1.6: el enlace que manda la pareja trae el nombre en `?n=`. Es comodidad
   * pura —lo que identifica son los cuatro dígitos, que no viajan—, pero si no
   * llegase a rellenarse, el enlace no ahorraría nada y el invitado tendría que
   * teclear su nombre en el móvil.
   */
  describe('el nombre que trae el enlace', () => {
    it('aparece ya escrito en el campo', () => {
      const p = montar(
        'name_phone4',
        { ok: false, fallo: { tipo: 'no-identificado' } },
        'María José Pérez',
      );

      expect(p.valor('nombre')).toBe('María José Pérez');
    });

    it('deja los dígitos vacíos: el secreto no viene en el enlace', () => {
      const p = montar(
        'name_phone4',
        { ok: false, fallo: { tipo: 'no-identificado' } },
        'María José Pérez',
      );

      expect(p.valor('digitos')).toBe('');
      expect(p.raiz.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    });

    it('se puede corregir, porque la pareja pudo escribirlo mal en la lista', async () => {
      const p = montar('name_phone4', { ok: true, guestId: 'g1' }, 'Maria Jose');
      p.escribir({ nombre: 'María José Pérez', digitos: '3456' });
      await p.enviar();

      expect(p.sesion.llamadas[0]?.credenciales).toEqual({
        nombre: 'María José Pérez',
        digitos: '3456',
      });
    });

    it('sin enlace con nombre, el campo empieza vacío', () => {
      const p = montar('name_phone4', { ok: false, fallo: { tipo: 'no-identificado' } });

      expect(p.valor('nombre')).toBe('');
    });
  });
});
