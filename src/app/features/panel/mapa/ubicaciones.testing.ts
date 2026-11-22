import type { Provider } from '@angular/core';

import {
  PUERTA_UBICACIONES,
  type PuertaUbicaciones,
  type UbicacionDelPanel,
} from '../../../core/mapa/ubicaciones-gateway';
import { UbicacionesStore } from './ubicaciones.store';

/**
 * Dos ubicaciones de mentira para las pantallas que enlazan con el mapa
 * (cronología y alojamientos): una publicada, una oculta a los invitados y una
 * sin pin, que es lo que el selector tiene que distinguir.
 */
export const UBICACIONES_DE_PRUEBA: readonly UbicacionDelPanel[] = [
  {
    id: 'iglesia',
    type: 'ceremonia',
    name: 'Iglesia de San Pedro',
    address: 'Plaza Mayor, 1',
    lat: 40.9481,
    lng: -4.1184,
    description: '',
    time: '17:00',
    order: 1,
    visibleToGuests: true,
  },
  {
    id: 'proveedores',
    type: 'otro',
    name: 'Entrada de proveedores',
    address: '',
    lat: 40.95,
    lng: -4.12,
    description: '',
    time: null,
    order: 2,
    visibleToGuests: false,
  },
  {
    id: 'pendiente',
    type: 'banquete',
    name: 'Finca sin colocar',
    address: '',
    lat: null,
    lng: null,
    description: '',
    time: null,
    order: 3,
    visibleToGuests: true,
  },
];

export function proveerUbicacionesDePrueba(
  ubicaciones: readonly UbicacionDelPanel[] = UBICACIONES_DE_PRUEBA,
): Provider[] {
  const doble: PuertaUbicaciones = {
    async listar() {
      return { ok: true, ubicaciones };
    },
    async guardar() {
      return { ok: true };
    },
    async borrar() {
      return { ok: true };
    },
  };

  return [{ provide: PUERTA_UBICACIONES, useValue: doble }, UbicacionesStore];
}
