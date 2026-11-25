import { describe, expect, it } from 'vitest';

import {
  intercambiar,
  leerPersona,
  rutaDeFotoValida,
  tendraFoto,
  validarPersona,
  type BorradorDePersona,
  type EstadoDeFoto,
  type PersonaDelPanel,
} from './personas';

const persona = (parcial: Partial<PersonaDelPanel> & { id: string }): PersonaDelPanel => ({
  name: 'Carmen Ruiz',
  role: 'Madrina',
  side: 'A',
  bio: '',
  phone: null,
  photoPath: null,
  photoUrl: null,
  photoConsent: false,
  visible: true,
  guestId: null,
  order: 1,
  ...parcial,
});

const BORRADOR: BorradorDePersona = {
  name: 'Carmen Ruiz',
  role: 'Madrina',
  side: 'A',
  bio: 'La tía que lo organiza todo.',
  phone: '600 11 22 33',
  visible: true,
  guestId: '',
  consentimiento: false,
};

const SIN_FOTO: EstadoDeFoto = { actual: null, nueva: false, quitada: false };
const CON_FOTO: EstadoDeFoto = {
  actual: { path: 'weddings/w1/party/1.jpg', url: 'https://x.test/1.jpg' },
  nueva: false,
  quitada: false,
};

describe('leerPersona', () => {
  it('lee una ficha completa', () => {
    expect(
      leerPersona(
        'p1',
        {
          displayName: ' Carmen Ruiz ',
          role: 'Madrina',
          side: 'B',
          bio: 'La tía',
          phone: '600112233',
          photoPath: 'weddings/w1/party/1.jpg',
          photoUrl: 'https://x.test/1.jpg',
          photoConsent: true,
          visibleToGuests: true,
          guestId: 'g7',
          order: 3,
        },
        'w1',
      ),
    ).toEqual({
      id: 'p1',
      name: 'Carmen Ruiz',
      role: 'Madrina',
      side: 'B',
      bio: 'La tía',
      phone: '600112233',
      photoPath: 'weddings/w1/party/1.jpg',
      photoUrl: 'https://x.test/1.jpg',
      photoConsent: true,
      visible: true,
      guestId: 'g7',
      order: 3,
    });
  });

  it('un guestId vacío o que no es texto es «sin enlace»', () => {
    const lee = (guestId: unknown) =>
      leerPersona('p', { displayName: 'Ana', guestId }, 'w1')?.guestId;
    expect(lee('')).toBeNull();
    expect(lee(42)).toBeNull();
    expect(lee(undefined)).toBeNull();
    expect(lee('g1')).toBe('g1');
  });

  it('sin nombre no hay ficha', () => {
    expect(leerPersona('p1', { displayName: ' ' }, 'w1')).toBeNull();
    expect(leerPersona('p1', null, 'w1')).toBeNull();
  });

  it('una foto de otra boda o sin https se descarta, y con ella el consentimiento', () => {
    for (const cambio of [
      { photoPath: 'weddings/OTRA/party/1.jpg' },
      { photoUrl: 'http://x.test/1.jpg' },
      { photoUrl: null },
    ]) {
      const leida = leerPersona(
        'p1',
        {
          displayName: 'X',
          photoPath: 'weddings/w1/party/1.jpg',
          photoUrl: 'https://x.test/1.jpg',
          photoConsent: true,
          ...cambio,
        },
        'w1',
      );
      expect(leida).toMatchObject({ photoPath: null, photoUrl: null, photoConsent: false });
    }
  });

  it('un consentimiento que no es literalmente true no cuenta', () => {
    const leida = leerPersona(
      'p1',
      {
        displayName: 'X',
        photoPath: 'weddings/w1/party/1.jpg',
        photoUrl: 'https://x.test/1.jpg',
        photoConsent: 'true',
      },
      'w1',
    );
    expect(leida?.photoConsent).toBe(false);
  });

  it('sin visibleToGuests === true, la persona está oculta; un lado raro es «los dos»', () => {
    expect(leerPersona('p', { displayName: 'X', visibleToGuests: 'sí' }, 'w1')).toMatchObject({
      visible: false,
      side: 'both',
    });
  });

  it('el teléfono no válido se descarta', () => {
    expect(leerPersona('p', { displayName: 'X', phone: 'llámame' }, 'w1')?.phone).toBeNull();
  });
});

describe('rutaDeFotoValida', () => {
  it('solo las de esta boda', () => {
    expect(rutaDeFotoValida('weddings/w1/party/1.jpg', 'w1')).toBe(true);
    expect(rutaDeFotoValida('weddings/w2/party/1.jpg', 'w1')).toBe(false);
    expect(rutaDeFotoValida('weddings/w1/hero/1.jpg', 'w1')).toBe(false);
    expect(rutaDeFotoValida(42, 'w1')).toBe(false);
  });
});

describe('validarPersona', () => {
  it('el enlace con un invitado pasa tal cual, y vacío es null', () => {
    const r = validarPersona({ ...BORRADOR, guestId: ' g3 ' }, SIN_FOTO);
    expect(r.ok && r.datos.guestId).toBe('g3');
    const sin = validarPersona({ ...BORRADOR, guestId: '' }, SIN_FOTO);
    expect(sin.ok && sin.datos.guestId).toBeNull();
  });

  it('acepta el borrador sin foto, sin pedir consentimiento', () => {
    const r = validarPersona(BORRADOR, SIN_FOTO);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos).toMatchObject({ phone: '600112233', side: 'A', visible: true });
  });

  it.each([
    [{ name: ' ' }, 'nombre'],
    [{ name: 'x'.repeat(61) }, 'nombre'],
    [{ role: '' }, 'papel'],
    [{ role: 'x'.repeat(61) }, 'papel'],
    [{ bio: 'x'.repeat(301) }, 'bio'],
    [{ phone: 'llámame' }, 'telefono'],
  ] as const)('rechaza %j por %s', (cambio, motivo) => {
    expect(validarPersona({ ...BORRADOR, ...cambio }, SIN_FOTO)).toEqual({ ok: false, motivo });
  });

  describe('el consentimiento de la foto (D-61)', () => {
    it('con una foto nueva y sin marcar la casilla, NO se guarda', () => {
      expect(validarPersona(BORRADOR, { actual: null, nueva: true, quitada: false })).toEqual({
        ok: false,
        motivo: 'consentimiento',
      });
    });

    it('con una foto que ya tenía y sin la casilla, NO se guarda', () => {
      expect(validarPersona(BORRADOR, CON_FOTO)).toEqual({
        ok: false,
        motivo: 'consentimiento',
      });
    });

    it('con la casilla marcada, sí', () => {
      expect(validarPersona({ ...BORRADOR, consentimiento: true }, CON_FOTO).ok).toBe(true);
      expect(
        validarPersona(
          { ...BORRADOR, consentimiento: true },
          { actual: null, nueva: true, quitada: false },
        ).ok,
      ).toBe(true);
    });

    it('si la foto se quita, ya no hace falta consentimiento', () => {
      expect(validarPersona(BORRADOR, { ...CON_FOTO, quitada: true }).ok).toBe(true);
    });

    it('cambiar una foto quitada por una nueva vuelve a pedirlo', () => {
      expect(validarPersona(BORRADOR, { ...CON_FOTO, quitada: true, nueva: true })).toEqual({
        ok: false,
        motivo: 'consentimiento',
      });
    });
  });
});

describe('tendraFoto', () => {
  it('según lo que quede al guardar', () => {
    expect(tendraFoto(SIN_FOTO)).toBe(false);
    expect(tendraFoto(CON_FOTO)).toBe(true);
    expect(tendraFoto({ ...CON_FOTO, quitada: true })).toBe(false);
    expect(tendraFoto({ ...SIN_FOTO, nueva: true })).toBe(true);
  });
});

describe('intercambiar', () => {
  const lista = [
    persona({ id: 'a', order: 1 }),
    persona({ id: 'b', order: 2 }),
    persona({ id: 'c', order: 3 }),
  ];

  it('baja y sube, devolviendo solo las dos que cambian (en su nueva posición)', () => {
    expect(intercambiar(lista, 'a', 1)).toEqual([
      { id: 'b', order: 1 },
      { id: 'a', order: 2 },
    ]);
    expect(intercambiar(lista, 'c', -1)).toEqual([
      { id: 'c', order: 2 },
      { id: 'b', order: 3 },
    ]);
  });

  it('en el borde no hace nada', () => {
    expect(intercambiar(lista, 'a', -1)).toBeNull();
    expect(intercambiar(lista, 'c', 1)).toBeNull();
    expect(intercambiar(lista, 'z', 1)).toBeNull();
  });

  it('con dos que comparten orden, mover sí las cambia de sitio', () => {
    const empatadas = [persona({ id: 'a', order: 1 }), persona({ id: 'b', order: 1 })];
    // `a` pasa detrás de `b`: `b` conserva el 1 y `a` recibe el 2.
    expect(intercambiar(empatadas, 'a', 1)).toEqual([{ id: 'a', order: 2 }]);
  });
});
