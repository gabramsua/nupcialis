import { describe, expect, it } from 'vitest';

import {
  MENSAJE_POR_DEFECTO,
  enlaceDeInvitado,
  nombreDelEnlace,
  enlaceWhatsApp,
  mensajeDeInvitacion,
  puedeEntrar,
} from './invitacion';

const MARIA = { fullName: 'María José Pérez', phone: '+34666123456' };
const TOKEN = 'abcdEFGH1234_-abcdEFGH1234_-abcd';
const SIN_MOVIL = { fullName: 'Sin Móvil', phone: null };

describe('enlaceDeInvitado', () => {
  it('lleva el token que ha generado el servidor (D-34)', () => {
    expect(enlaceDeInvitado('https://mms.nupcialis.com', TOKEN, 'name_phone4')).toBe(
      `https://mms.nupcialis.com/?k=${TOKEN}`,
    );
  });

  /**
   * **Lo que no puede llevar nunca.** El enlace abre la web; los cuatro dígitos
   * siguen siendo lo que autoriza y no viajan. Tampoco el nombre: desde D-34 no
   * hace falta, porque el servidor sabe de quién es el token.
   */
  it('no lleva el teléfono, ni los dígitos, ni el nombre, ni el identificador', () => {
    const enlace = enlaceDeInvitado('https://mms.nupcialis.com', TOKEN, 'name_phone4');

    for (const dato of ['666123456', '3456', 'Mar', 'guestId']) {
      expect(enlace).not.toContain(dato);
    }
  });

  it('en modo teléfono también entra por el enlace', () => {
    expect(enlaceDeInvitado('https://mms.nupcialis.com', TOKEN, 'phone')).toBe(
      `https://mms.nupcialis.com/?k=${TOKEN}`,
    );
  });

  /** Una boda abierta no tiene puerta, así que tampoco enlaces por invitado. */
  it('en una boda abierta es el enlace de la boda y ya', () => {
    expect(enlaceDeInvitado('https://mms.nupcialis.com', TOKEN, 'open')).toBe(
      'https://mms.nupcialis.com/',
    );
  });

  it('aguanta un origen con barra al final, que es como lo da el navegador a veces', () => {
    expect(enlaceDeInvitado('https://mms.nupcialis.com/', null, 'open')).toBe(
      'https://mms.nupcialis.com/',
    );
  });

  it('sin token no inventa un parámetro vacío', () => {
    expect(enlaceDeInvitado('https://mms.nupcialis.com', null, 'name_phone4')).toBe(
      'https://mms.nupcialis.com/',
    );
    expect(enlaceDeInvitado('https://mms.nupcialis.com', '', 'name_phone4')).toBe(
      'https://mms.nupcialis.com/',
    );
  });
});

describe('mensajeDeInvitacion', () => {
  const DATOS = {
    nombre: 'María José',
    novios: 'María y Gabriel',
    fecha: '12 de junio de 2027',
    enlace: 'https://mms.nupcialis.com/?n=Mar%C3%ADa',
  };

  it('sustituye los marcadores del mensaje de fábrica', () => {
    const mensaje = mensajeDeInvitacion(MENSAJE_POR_DEFECTO, DATOS);

    expect(mensaje).toContain('¡Hola María José!');
    expect(mensaje).toContain(DATOS.enlace);
    expect(mensaje).toContain('María y Gabriel');
    expect(mensaje).not.toContain('{');
  });

  /**
   * Borrarlo en silencio dejaría a la pareja mandando doscientos mensajes con
   * un hueco. Dejándolo tal cual, lo ve en la vista previa y lo corrige.
   */
  it('lo que no reconoce se queda escrito, para que se vea el error', () => {
    expect(mensajeDeInvitacion('Hola {nombres}, soy {novios}', DATOS)).toBe(
      'Hola {nombres}, soy María y Gabriel',
    );
  });

  it('repite el mismo marcador tantas veces como aparezca', () => {
    expect(mensajeDeInvitacion('{nombre}, {nombre}', DATOS)).toBe('María José, María José');
  });

  it('una plantilla sin marcadores se manda tal cual', () => {
    expect(mensajeDeInvitacion('Te esperamos', DATOS)).toBe('Te esperamos');
  });
});

describe('enlaceWhatsApp', () => {
  it('lleva el número sin el más y sin espacios, que es lo que wa.me entiende', () => {
    expect(enlaceWhatsApp('hola', '+34 666 12 34 56')).toBe('https://wa.me/34666123456?text=hola');
  });

  it('sin teléfono deja que WhatsApp pregunte a quién', () => {
    expect(enlaceWhatsApp('hola', null)).toBe('https://wa.me/?text=hola');
  });

  it('escapa el mensaje entero, saltos de línea incluidos', () => {
    const enlace = enlaceWhatsApp('Hola María\n¿vienes?', null);

    expect(enlace).toContain('%0A');
    expect(enlace).not.toContain('\n');
    expect(decodeURIComponent(enlace.split('text=')[1]!)).toBe('Hola María\n¿vienes?');
  });
});

describe('puedeEntrar', () => {
  it('sin teléfono no podrá entrar en los modos que lo piden', () => {
    expect(puedeEntrar(SIN_MOVIL, 'name_phone4')).toBe(false);
    expect(puedeEntrar(SIN_MOVIL, 'phone')).toBe(false);
  });

  it('en una boda abierta entra cualquiera', () => {
    expect(puedeEntrar(SIN_MOVIL, 'open')).toBe(true);
  });

  it('con teléfono, sí', () => {
    expect(puedeEntrar(MARIA, 'name_phone4')).toBe(true);
  });
});

/**
 * `?n=` es de los enlaces anteriores a D-34 y sigue leyéndose.
 *
 * Una pareja pudo mandar doscientos; no se le van a romper por un cambio
 * nuestro. Los nuevos llevan `?k=` y no necesitan el nombre.
 */
describe('nombreDelEnlace', () => {
  it('sigue leyendo el nombre de un enlace de los de antes, acentos incluidos', () => {
    expect(nombreDelEnlace('?n=Mar%C3%ADa%20Jos%C3%A9%20P%C3%A9rez')).toBe('María José Pérez');
  });

  it('un enlace nuevo no trae nombre, y eso no es un problema', () => {
    expect(nombreDelEnlace(`?k=${TOKEN}`)).toBe('');
  });

  it('sin parámetro no devuelve nada', () => {
    expect(nombreDelEnlace('')).toBe('');
    expect(nombreDelEnlace('?otra=cosa')).toBe('');
  });

  it('un parámetro vacío o en blanco es como no traerlo', () => {
    expect(nombreDelEnlace('?n=')).toBe('');
    expect(nombreDelEnlace('?n=%20%20')).toBe('');
  });
});
