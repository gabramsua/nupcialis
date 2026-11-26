import { describe, expect, it } from 'vitest';

import {
  MAX_FIRMAS,
  MAX_MENSAJE,
  MAX_POR_INVITADO,
  decidirFirma,
  firmasParaInvitado,
  leerFirma,
  limpiarMensaje,
  nombreDeFirma,
  type FirmaGuardada,
} from './libro';

function firma(parcial: Partial<FirmaGuardada> & { id: string }): FirmaGuardada {
  return {
    guestId: 'g1',
    authorName: 'Ana',
    message: 'Enhorabuena',
    status: 'visible',
    creada: 1000,
    ...parcial,
  };
}

describe('limpiarMensaje', () => {
  it('recorta, normaliza los saltos y quita caracteres de control', () => {
    expect(limpiarMensaje('  Hola\r\n\r\n\r\n\r\nque tal \u0007 ')).toBe('Hola\n\nque tal');
  });

  it('respeta el tope y lo que no es texto es vacío', () => {
    expect(limpiarMensaje('a'.repeat(MAX_MENSAJE + 50))).toHaveLength(MAX_MENSAJE);
    expect(limpiarMensaje(42)).toBe('');
    expect(limpiarMensaje(undefined)).toBe('');
  });

  it('no toca el HTML: se pinta escapado', () => {
    expect(limpiarMensaje('<b>hola</b>')).toBe('<b>hola</b>');
  });
});

describe('nombreDeFirma', () => {
  it('prefiere el mote y, si no hay, solo el nombre de pila', () => {
    expect(nombreDeFirma({ nickname: 'Tito', fullName: 'Ricardo Gómez' })).toBe('Tito');
    expect(nombreDeFirma({ nickname: '', fullName: 'Ricardo Gómez' })).toBe('Ricardo');
    expect(nombreDeFirma({ fullName: '  Ana   López Ruiz ' })).toBe('Ana');
    expect(nombreDeFirma({})).toBe('');
  });
});

describe('leerFirma', () => {
  it('descarta lo que no tiene autor interno o mensaje', () => {
    expect(leerFirma('a', { message: 'x' })).toBeNull();
    expect(leerFirma('a', { guestId: 'g' })).toBeNull();
  });

  it('lo desconocido cuenta como visible', () => {
    expect(leerFirma('a', { guestId: 'g', message: 'x' })?.status).toBe('visible');
    expect(leerFirma('a', { guestId: 'g', message: 'x', status: 'hidden' })?.status).toBe('hidden');
  });
});

describe('decidirFirma', () => {
  it('crea, salvo vacía o topes', () => {
    expect(decidirFirma([], 'g1', 'Hola')).toBe('crear');
    expect(decidirFirma([], 'g1', '')).toBe('vacia');

    const suyas = Array.from({ length: MAX_POR_INVITADO }, (_, i) => firma({ id: `s${i}` }));
    expect(decidirFirma(suyas, 'g1', 'Otra')).toBe('tope-invitado');
    expect(decidirFirma(suyas, 'g2', 'Otra')).toBe('crear');

    const lleno = Array.from({ length: MAX_FIRMAS }, (_, i) =>
      firma({ id: `f${i}`, guestId: `x${i}` }),
    );
    expect(decidirFirma(lleno, 'g9', 'Hola')).toBe('tope-libro');
  });

  it('las ocultas siguen contando para el tope: ocultar no da más firmas', () => {
    const suyas = Array.from({ length: MAX_POR_INVITADO }, (_, i) =>
      firma({ id: `s${i}`, status: 'hidden' }),
    );
    expect(decidirFirma(suyas, 'g1', 'Otra')).toBe('tope-invitado');
  });
});

describe('firmasParaInvitado', () => {
  const lista = [
    firma({ id: 'vieja', creada: 1000 }),
    firma({ id: 'nueva', creada: 3000, guestId: 'g2', authorName: 'Leo' }),
    firma({ id: 'oculta', creada: 2000, status: 'hidden' }),
  ];

  it('solo las visibles, la más reciente primero', () => {
    expect(firmasParaInvitado(lista, 'g1').map((f) => f.id)).toEqual(['nueva', 'vieja']);
  });

  it('marca las suyas y nunca expone un guestId', () => {
    const r = firmasParaInvitado(lista, 'g1');
    expect(r.find((f) => f.id === 'vieja')?.mia).toBe(true);
    expect(r.find((f) => f.id === 'nueva')?.mia).toBe(false);
    expect(JSON.stringify(r)).not.toContain('guestId');
    expect(JSON.stringify(r)).not.toContain('g2');
  });
});
