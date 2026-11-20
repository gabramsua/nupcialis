import { describe, expect, it } from 'vitest';

import { ordenarUbicaciones, type UbicacionDelPanel } from '../mapa/ubicaciones-gateway';
import { idDeUbicacion, traducirUbicacion } from './ubicaciones-gateway.firestore';

function u(parcial: Partial<UbicacionDelPanel> & { id: string }): UbicacionDelPanel {
  return {
    type: 'otro',
    name: parcial.id,
    address: '',
    lat: 40,
    lng: -4,
    description: '',
    time: null,
    order: 0,
    visibleToGuests: true,
    ...parcial,
  };
}

describe('las ubicaciones del panel', () => {
  it('el id sale del nombre, sin tildes ni signos', () => {
    expect(idDeUbicacion('Iglesia de San Miguel', [])).toBe('iglesia-de-san-miguel');
    expect(idDeUbicacion('  ¡Finca «El Encinar»! ', [])).toBe('finca-el-encinar');
  });

  it('si el id ya existe, se numera en vez de pisar la ficha', () => {
    expect(idDeUbicacion('Parking', ['parking'])).toBe('parking-2');
    expect(idDeUbicacion('Parking', ['parking', 'parking-2'])).toBe('parking-3');
  });

  it('un nombre sin letras no deja un id vacío', () => {
    expect(idDeUbicacion('***', [])).toBe('sitio');
  });

  it('ordena por el orden de la pareja y, a igualdad, por hora', () => {
    const lista = ordenarUbicaciones([
      u({ id: 'c', order: 2 }),
      u({ id: 'b', order: 1, time: '20:00' }),
      u({ id: 'a', order: 1, time: '17:30' }),
      u({ id: 'z', order: 1, time: null }),
    ]);

    expect(lista.map((x) => x.id)).toEqual(['a', 'b', 'z', 'c']);
  });

  it('traduce los fallos de Firestore a los que entiende la pantalla', () => {
    expect(traducirUbicacion({ code: 'permission-denied' })).toEqual({ tipo: 'sin-permiso' });
    expect(traducirUbicacion({ code: 'unavailable' })).toEqual({ tipo: 'red' });
    expect(traducirUbicacion({ code: 'raro', message: 'x' })).toEqual({
      tipo: 'error',
      mensaje: 'x',
    });
  });
});
