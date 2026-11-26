import { describe, expect, it } from 'vitest';

import {
  MAX_MENSAJE,
  MAX_SOLICITUDES_POR_VENTANA,
  VENTANA_MS,
  correoDeAviso,
  esEstadoDeSolicitud,
  lineasDeAviso,
  registrarSolicitud,
  validarSolicitud,
} from './solicitudes';

const BUENA = { names: 'Ana y Leo', email: 'Ana@Ejemplo.com', consent: true };

describe('validarSolicitud', () => {
  it('acepta lo mínimo: nombres, correo y consentimiento', () => {
    const r = validarSolicitud(BUENA);
    expect(r).toEqual({
      ok: true,
      solicitud: {
        names: 'Ana y Leo',
        email: 'ana@ejemplo.com',
        phone: '',
        weddingDate: '',
        plan: 'undecided',
        message: '',
      },
    });
  });

  it('sin consentimiento expreso no hay solicitud', () => {
    expect(validarSolicitud({ ...BUENA, consent: false })).toEqual({
      ok: false,
      motivo: 'consentimiento',
    });
    expect(validarSolicitud({ ...BUENA, consent: 'true' })).toEqual({
      ok: false,
      motivo: 'consentimiento',
    });
  });

  it('rechaza nombres vacíos, correo roto, teléfono raro y plan inventado', () => {
    expect(validarSolicitud({ ...BUENA, names: ' a ' })).toEqual({ ok: false, motivo: 'nombres' });
    expect(validarSolicitud({ ...BUENA, email: 'ana@' })).toEqual({ ok: false, motivo: 'correo' });
    expect(validarSolicitud({ ...BUENA, phone: 'llamadme' })).toEqual({
      ok: false,
      motivo: 'telefono',
    });
    expect(validarSolicitud({ ...BUENA, plan: 'gratis' })).toEqual({ ok: false, motivo: 'plan' });
  });

  it('acepta un teléfono con prefijo y espacios', () => {
    const r = validarSolicitud({ ...BUENA, phone: '+34 600 00 00 00', plan: 'extended' });
    expect(r.ok && r.solicitud.phone).toBe('+34 600 00 00 00');
    expect(r.ok && r.solicitud.plan).toBe('extended');
  });

  it('recorta el mensaje y quita los caracteres de control', () => {
    const r = validarSolicitud({ ...BUENA, message: 'Hola\u0000' + 'x'.repeat(MAX_MENSAJE * 2) });
    expect(r.ok && r.solicitud.message.length).toBe(MAX_MENSAJE);
    expect(r.ok && r.solicitud.message.includes('\u0000')).toBe(false);
  });

  it('no se cae con basura', () => {
    for (const x of [null, undefined, 3, 'texto', [], { consent: true }]) {
      expect(validarSolicitud(x).ok).toBe(false);
    }
  });
});

describe('registrarSolicitud', () => {
  it('la primera siempre pasa y abre la ventana', () => {
    expect(registrarSolicitud(null, 1000)).toEqual({
      permitido: true,
      contador: { desde: 1000, n: 1 },
    });
  });

  it('frena la siguiente a la quinta dentro de la hora', () => {
    let c = registrarSolicitud(null, 0);
    for (let i = 1; i < MAX_SOLICITUDES_POR_VENTANA; i++) {
      expect(c.permitido).toBe(true);
      c = registrarSolicitud(c.permitido ? c.contador : null, i * 1000);
    }
    expect(c.permitido).toBe(true);
    expect(registrarSolicitud(c.permitido ? c.contador : null, 10_000).permitido).toBe(false);
  });

  it('pasada la hora vuelve a dejar', () => {
    const lleno = { desde: 0, n: MAX_SOLICITUDES_POR_VENTANA };
    expect(registrarSolicitud(lleno, VENTANA_MS).permitido).toBe(true);
  });
});

describe('estados y aviso', () => {
  it('conoce sus cuatro estados', () => {
    for (const e of ['new', 'contacted', 'converted', 'discarded']) {
      expect(esEstadoDeSolicitud(e)).toBe(true);
    }
    expect(esEstadoDeSolicitud('borrada')).toBe(false);
  });

  it('el aviso lleva lo que el formulario recogió y omite lo vacío', () => {
    const r = validarSolicitud({ ...BUENA, phone: '600000000', plan: 'basic' });
    if (!r.ok) throw new Error('debería valer');
    const lineas = lineasDeAviso(r.solicitud);
    expect(lineas).toContain('Teléfono: 600000000');
    expect(lineas).toContain('Plan: Básico');
    expect(lineas.some((l) => l.startsWith('Fecha'))).toBe(false);
  });

  it('el correo de aviso guardado solo vale si es un correo', () => {
    expect(correoDeAviso('gabriel@ejemplo.com')).toBe('gabriel@ejemplo.com');
    expect(correoDeAviso('no es un correo')).toBe('');
    expect(correoDeAviso(undefined)).toBe('');
  });
});
