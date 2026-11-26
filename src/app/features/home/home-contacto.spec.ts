import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import {
  PUERTA_SOLICITUDES,
  type PuertaSolicitudes,
  type SolicitudHome,
} from '../../core/home/home-gateway';
import { NP_ICON_SPRITE } from '../../design-system/icons/icon-sprite.providers';
import { HOME_DE_FABRICA, type ContactoHome } from './home';
import { NpHomeContacto } from './home-contacto';

function montar(
  puerta: PuertaSolicitudes | null,
  contacto: ContactoHome = HOME_DE_FABRICA.contacto,
) {
  TestBed.configureTestingModule({
    providers: [
      { provide: NP_ICON_SPRITE, useValue: '/icons/home.svg' },
      ...(puerta ? [{ provide: PUERTA_SOLICITUDES, useValue: puerta }] : []),
    ],
  });
  const fixture = TestBed.createComponent(NpHomeContacto);
  fixture.componentRef.setInput('contacto', contacto);
  fixture.componentRef.setInput('correoDeContacto', 'hola@nupcialis.com');
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;

  const campo = (nombre: string) =>
    raiz.querySelector(`[name=${nombre}]`) as HTMLInputElement & HTMLSelectElement;
  const escribir = (nombre: string, valor: string) => {
    const c = campo(nombre);
    c.value = valor;
    c.dispatchEvent(new Event('input'));
    c.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const aceptar = () => {
    const c = campo('consent');
    c.checked = true;
    c.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const enviar = async () => {
    raiz.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, raiz, campo, escribir, aceptar, enviar, texto: () => raiz.textContent ?? '' };
}

function puertaQueGuarda(
  enviadas: SolicitudHome[],
  resultado: Awaited<ReturnType<PuertaSolicitudes['enviar']>> = { ok: true },
): PuertaSolicitudes {
  return {
    async enviar(s) {
      enviadas.push(s);
      return resultado;
    },
  };
}

describe('el formulario de contacto de la HOME', () => {
  it('manda lo escrito, recortado, y enseña el mensaje de recibido', async () => {
    const enviadas: SolicitudHome[] = [];
    const f = montar(puertaQueGuarda(enviadas));
    f.escribir('names', '  Ana y Leo ');
    f.escribir('email', 'ana@ejemplo.com');
    f.escribir('phone', '600 00 00 00');
    f.escribir('plan', 'extended');
    f.aceptar();
    await f.enviar();

    expect(enviadas).toEqual([
      {
        names: 'Ana y Leo',
        email: 'ana@ejemplo.com',
        phone: '600 00 00 00',
        weddingDate: '',
        plan: 'extended',
        message: '',
        consent: true,
      },
    ]);
    expect(f.texto()).toContain(HOME_DE_FABRICA.contacto.successTitle);
    expect(f.raiz.querySelector('form')).toBeNull();
  });

  it('no envía sin nombres, con un correo roto o sin aceptar, y dice qué falta', async () => {
    const enviadas: SolicitudHome[] = [];
    const f = montar(puertaQueGuarda(enviadas));
    f.escribir('email', 'ana@');
    await f.enviar();

    expect(enviadas).toHaveLength(0);
    expect(f.texto()).toContain('Decidnos cómo os llamáis.');
    expect(f.texto()).toContain('Ese correo no parece válido.');
    expect(f.texto()).toContain('Necesitamos que lo aceptéis');
  });

  it('los campos opcionales apagados no se piden ni se mandan', async () => {
    const enviadas: SolicitudHome[] = [];
    const f = montar(puertaQueGuarda(enviadas), {
      ...HOME_DE_FABRICA.contacto,
      askPhone: false,
      askDate: false,
      askPlan: false,
      askMessage: false,
    });
    expect(f.campo('phone')).toBeNull();
    expect(f.campo('weddingDate')).toBeNull();
    expect(f.campo('plan')).toBeNull();
    expect(f.campo('message')).toBeNull();

    f.escribir('names', 'Ana y Leo');
    f.escribir('email', 'ana@ejemplo.com');
    f.aceptar();
    await f.enviar();
    expect(enviadas[0]).toMatchObject({
      phone: '',
      weddingDate: '',
      plan: 'undecided',
      message: '',
    });
  });

  it('un bot que rellena el campo trampa recibe el éxito y no se envía nada', async () => {
    const enviadas: SolicitudHome[] = [];
    const f = montar(puertaQueGuarda(enviadas));
    f.escribir('names', 'Bot Bot');
    f.escribir('email', 'bot@ejemplo.com');
    f.escribir('web', 'http://spam.example.com');
    f.aceptar();
    await f.enviar();

    expect(enviadas).toHaveLength(0);
    expect(f.texto()).toContain(HOME_DE_FABRICA.contacto.successTitle);
  });

  it('si el servidor frena por límite, lo dice y deja el formulario para reintentar', async () => {
    const f = montar(puertaQueGuarda([], { ok: false, fallo: { tipo: 'limite' } }));
    f.escribir('names', 'Ana y Leo');
    f.escribir('email', 'ana@ejemplo.com');
    f.aceptar();
    await f.enviar();

    expect(f.texto()).toContain('varias solicitudes seguidas');
    expect(f.raiz.querySelector('form')).not.toBeNull();
    expect(f.raiz.querySelector('[role=alert]')).not.toBeNull();
  });

  it('si falla la red, ofrece el correo de contacto como salida', async () => {
    const f = montar(puertaQueGuarda([], { ok: false, fallo: { tipo: 'red' } }));
    f.escribir('names', 'Ana y Leo');
    f.escribir('email', 'ana@ejemplo.com');
    f.aceptar();
    await f.enviar();
    expect(f.texto()).toContain('hola@nupcialis.com');
  });

  it('sin puerto (vista previa del editor) no finge que envía', async () => {
    const f = montar(null);
    f.escribir('names', 'Ana y Leo');
    f.escribir('email', 'ana@ejemplo.com');
    f.aceptar();
    await f.enviar();
    expect(f.texto()).toContain('no está conectado en esta vista previa');
    expect(f.texto()).not.toContain(HOME_DE_FABRICA.contacto.successTitle);
  });
});
