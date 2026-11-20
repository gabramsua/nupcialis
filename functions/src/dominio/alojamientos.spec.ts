import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DIAS_DE_AVISO,
  MAX_ALOJAMIENTOS,
  plazoDeReserva,
  sanearAlojamientos,
  telefonoValido,
  webValida,
} from './alojamientos';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de los alojamientos', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./alojamientos.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/alojamientos/alojamientos.ts'),
    );
  });
});

function alojamiento(parcial: Record<string, unknown> = {}) {
  return {
    id: 'central',
    name: 'Hotel Central',
    category: 'hotel',
    description: 'En el centro del pueblo.',
    pricePerNight: 85,
    distanceKm: 4.5,
    phone: '+34 954 11 22 33',
    website: 'hotelcentral.com',
    discountCode: 'Di que vas a la boda de María y Gabriel',
    blockedRooms: 12,
    bookingDeadline: '2027-05-01',
    recommended: true,
    enabled: true,
    order: 1,
    ...parcial,
  };
}

describe('webValida', () => {
  it('a una web sin esquema le pone https', () => {
    expect(webValida('hotelcentral.com')).toBe('https://hotelcentral.com/');
  });

  it('respeta http y https', () => {
    expect(webValida('http://hotel.example')).toBe('http://hotel.example/');
    expect(webValida('https://hotel.example/reservas')).toBe('https://hotel.example/reservas');
  });

  /** Lo que no puede pasar: un `javascript:` donde la web pinta un enlace. */
  it('nada que no sea web', () => {
    for (const malo of ['javascript:alert(1)', 'tel:+34600', 'file:///etc/passwd', '', '   ', 42]) {
      expect(webValida(malo)).toBeNull();
    }
  });
});

describe('telefonoValido', () => {
  it('se queda con los dígitos y el más', () => {
    expect(telefonoValido('+34 954 11 22 33')).toBe('+34954112233');
    expect(telefonoValido('954-11-22-33')).toBe('954112233');
  });

  it('lo que no es un teléfono no se publica', () => {
    expect(telefonoValido('pregunta en recepción')).toBeNull();
    expect(telefonoValido('123')).toBeNull();
    expect(telefonoValido(null)).toBeNull();
  });
});

describe('sanearAlojamientos', () => {
  it('deja pasar una ficha completa, con la web y el teléfono normalizados', () => {
    const salida = sanearAlojamientos([alojamiento()]);

    expect(salida).toHaveLength(1);
    expect(salida[0]).toMatchObject({
      id: 'central',
      name: 'Hotel Central',
      category: 'hotel',
      pricePerNight: 85,
      distanceKm: 4.5,
      phone: '+34954112233',
      website: 'https://hotelcentral.com/',
      blockedRooms: 12,
      bookingDeadline: '2027-05-01',
      recommended: true,
    });
  });

  /** La pareja apunta el hotel con lo que sabe y completa después. */
  it('casi todo es opcional: con el nombre basta', () => {
    const salida = sanearAlojamientos([
      {
        id: 'rural',
        name: 'Casa del Olivar',
      },
    ]);

    expect(salida[0]).toMatchObject({
      name: 'Casa del Olivar',
      category: 'otro',
      pricePerNight: null,
      distanceKm: null,
      phone: null,
      website: null,
      bookingDeadline: null,
    });
  });

  it('sin nombre no es una ficha', () => {
    expect(sanearAlojamientos([alojamiento({ name: '' })])).toEqual([]);
  });

  it('las apagadas no se publican', () => {
    expect(sanearAlojamientos([alojamiento({ enabled: false })])).toEqual([]);
  });

  /** El orden **es** la recomendación: el de fuera reserva el primero que cuadra. */
  it('los recomendados van primero', () => {
    const salida = sanearAlojamientos([
      alojamiento({ id: 'otro', recommended: false, order: 1 }),
      alojamiento({ id: 'bueno', recommended: true, order: 9 }),
    ]);

    expect(salida.map((a) => a.id)).toEqual(['bueno', 'otro']);
  });

  it('un precio imposible no se publica como número', () => {
    expect(sanearAlojamientos([alojamiento({ pricePerNight: -10 })])[0]?.pricePerNight).toBeNull();
    expect(
      sanearAlojamientos([alojamiento({ pricePerNight: 'sobre 80' })])[0]?.pricePerNight,
    ).toBeNull();
  });

  it('un tipo que no existe cae en «otro»', () => {
    expect(sanearAlojamientos([alojamiento({ category: 'yurta' })])[0]?.category).toBe('otro');
  });

  it('no publica más de las que caben', () => {
    const muchos = Array.from({ length: MAX_ALOJAMIENTOS + 5 }, (_, i) =>
      alojamiento({ id: `a${i}` }),
    );

    expect(sanearAlojamientos(muchos)).toHaveLength(MAX_ALOJAMIENTOS);
  });

  it('lo que no es una lista no revienta', () => {
    expect(sanearAlojamientos(null)).toEqual([]);
    expect(sanearAlojamientos([null, 'hola', 7])).toEqual([]);
  });
});

/**
 * El plazo de las habitaciones bloqueadas es **lo que de verdad angustia al
 * invitado de fuera** (§8.10), así que se cuenta bien y se dice entero.
 */
describe('plazoDeReserva', () => {
  const hoy = new Date('2027-04-20T10:00:00.000Z');

  it('cuenta los días que quedan', () => {
    expect(plazoDeReserva('2027-05-01', hoy)).toEqual({ estado: 'abierto', dias: 11 });
  });

  it('una semana o menos es urgente', () => {
    expect(plazoDeReserva('2027-04-25', hoy)).toEqual({ estado: 'ultimos', dias: 5 });
    expect(DIAS_DE_AVISO).toBe(7);
  });

  /** El día cuenta entero: «hasta el 20» incluye el 20. */
  it('el último día sigue siendo hoy, no ayer', () => {
    expect(plazoDeReserva('2027-04-20', hoy)).toEqual({ estado: 'hoy' });
  });

  /** Un plazo vencido se dice: el que mira la web el día 2 necesita saberlo. */
  it('vencido se dice, no se esconde', () => {
    expect(plazoDeReserva('2027-04-19', hoy)).toEqual({ estado: 'cerrado' });
  });

  it('sin plazo, nada que contar', () => {
    expect(plazoDeReserva(null, hoy)).toEqual({ estado: 'sin-plazo' });
    expect(plazoDeReserva('no es una fecha', hoy)).toEqual({ estado: 'sin-plazo' });
  });
});
