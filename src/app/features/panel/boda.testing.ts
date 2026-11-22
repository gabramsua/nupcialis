/**
 * Una boda entera, para montar pantallas del panel.
 *
 * Vive aquí para que no haya dos: cuando `BodaDelPanel` gana un campo, el
 * compilador señala este sitio y no cinco ficheros de pruebas a medias. Ya pasó
 * con `rsvpDeadline`.
 */

import { MENSAJE_POR_DEFECTO } from './invitados/invitacion';
import { SECCIONES_INICIALES } from '../public-site/secciones/secciones';
import { DRESS_CODE_VACIO } from '../public-site/dress-code/dress-code';
import { sanearAportacion } from '../public-site/regalos/regalos';
import type { BodaDelPanel } from './boda';

export const BODA_DE_PRUEBA: BodaDelPanel = {
  weddingId: 'w1',
  slug: 'mms',
  pareja: { partnerA: 'María', partnerB: 'Gabriel' },
  status: 'active',
  plan: 'basic',
  weddingDate: new Date('2027-06-12T00:00:00.000Z'),
  weddingTime: '17:00',
  timezone: 'Europe/Madrid',
  ceremonyType: 'civil',
  guestAccessMode: 'open',
  inviteMessage: MENSAJE_POR_DEFECTO,
  rsvpDeadline: null,
  allowGuestAddedCompanions: false,
  templateId: 'clasica',
  indexable: false,
  palette: null,
  heroImagePath: null,
  heroImageUrl: null,
  secciones: SECCIONES_INICIALES,
  modulos: { publicSite: { enabled: true, visibility: 'visible' } },
  dressCode: DRESS_CODE_VACIO,
  aportacion: sanearAportacion({}),
};

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
