import { computed, signal } from '@angular/core';

import type { Grupo } from '../../../core/invitados/grupos-gateway';
import type { Invitado } from '../../../core/invitados/invitados-gateway';
import type { BodaDelPanel } from '../boda';

export { BODA_DE_PRUEBA } from '../boda.testing';

/**
 * Dobles para las pruebas de las pantallas de invitados.
 *
 * Aquí y no repetidos en cada `.spec.ts`: son tres pantallas las que dependen
 * de los grupos, y el día que el store gane un método, se toca en un sitio.
 * No importa nada de Vitest para poder vivir fuera de un `.spec.ts`.
 */

export const GRUPOS_DE_PRUEBA: readonly Grupo[] = [
  {
    id: 'uni',
    name: 'Universidad',
    photoAudience: 'restricted',
    color: 'rosa',
    order: 0,
    porDefecto: false,
  },
  {
    id: 'padel',
    name: 'Pádel',
    photoAudience: 'restricted',
    color: 'azul',
    order: 1,
    porDefecto: false,
  },
  {
    id: 'familia',
    name: 'Familia',
    photoAudience: 'public',
    color: 'verde',
    order: 2,
    porDefecto: false,
  },
];

export function gruposStoreFalso(grupos: readonly Grupo[] = GRUPOS_DE_PRUEBA) {
  const _grupos = signal(grupos);
  const cargas = { veces: 0 };
  /** Los órdenes que ha pedido la pantalla, para poder comprobarlos. */
  const ordenes: string[][] = [];

  return {
    cargas,
    ordenes,
    grupos: _grupos.asReadonly(),
    estado: () => 'lista' as const,
    fallo: () => null,
    porId: computed(() => new Map(_grupos().map((g) => [g.id, g]))),
    async cargar() {
      cargas.veces++;
    },
    async guardar() {
      return { ok: true as const, id: 'nuevo', creado: true };
    },
    async borrar() {
      return { ok: true as const, miembros: 0 };
    },
    async reordenar(nuevos: readonly Grupo[]) {
      ordenes.push(nuevos.map((g) => g.id));
      _grupos.set([...nuevos]);
      return { ok: true as const };
    },
  };
}

export function bodaStoreFalso(
  pareja: BodaDelPanel['pareja'] = { partnerA: 'María', partnerB: 'Gabriel' },
) {
  return {
    boda: () => ({ pareja }) as BodaDelPanel,
  };
}

/**
 * El `<dialog>` de jsdom no sabe abrirse.
 *
 * En el navegador sí; en las pruebas basta con que el modal exista en el DOM y
 * lleve el atributo, que es lo que se consulta. Se llama desde un `beforeAll`.
 */
export function abrirDialogosEnPruebas(): void {
  const dialogo = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  dialogo['showModal'] ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  dialogo['close'] ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

/**
 * Un invitado completo, para construir los de cada prueba encima.
 *
 * En un sitio y no copiado en cada `.spec.ts`: cuando `Invitado` gana un campo,
 * el compilador señala aquí. Ya ha pasado dos veces —con los grupos y con el
 * menú y las alergias— y cada vez eran cuatro ficheros a medias.
 */
export const INVITADO_DE_PRUEBA: Invitado = {
  id: 'g1',
  fullName: 'María José Pérez',
  nickname: 'Majo',
  phone: '+34600111222',
  side: 'A',
  ageGroup: 'adult',
  groupIds: [],
  rsvpStatus: 'pending',
  isCompanion: false,
  invitedById: null,
  loginCount: 0,
  notes: '',
  menu: '',
  allergies: '',
  tableId: null,
  apuntadoPorInvitado: false,
  altaEn: null,
};
