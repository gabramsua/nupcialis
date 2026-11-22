import { ChangeDetectionStrategy, Component } from '@angular/core';

import type { ResultadoTenant } from '../../core/tenant/tenant-loader';
import { DRESS_CODE_VACIO } from '../public-site/dress-code/dress-code';
import { NpMapaPublica } from '../public-site/mapa/mapa-publica';
import { sanearUbicaciones } from '../public-site/mapa/ubicaciones';

/**
 * El mapa del invitado con sitios de muestra. **Solo en desarrollo.**
 *
 * La página real recibe la boda de la ruta; aquí se le da una de mentira para
 * poder mirarla —sobre todo a 360 px— sin Firebase ni subdominio.
 */
const TENANT: ResultadoTenant = {
  tipo: 'ok',
  weddingId: 'muestra',
  slug: 'muestra',
  sitio: {
    status: 'active',
    coupleNames: { partnerA: 'María', partnerB: 'Gabriel' },
    theme: { templateId: 'clasica', palette: null, heroImagePath: null, heroImageUrl: null },
    weddingDate: new Date('2027-06-12'),
    weddingTime: '17:00',
    timezone: 'Europe/Madrid',
    locale: 'es',
    indexable: false,
    guestAccessMode: 'open',
    secciones: [],
    faqs: [],
    cronologia: [],
    alojamientos: [],
    dressCode: DRESS_CODE_VACIO,
    historia: [],
    modulos: {},
    ubicaciones: sanearUbicaciones([
      {
        id: 'ceremonia',
        type: 'ceremonia',
        name: 'Iglesia de San Miguel',
        address: 'Plaza de la Iglesia, 1, Segovia',
        coords: { lat: 40.9481, lng: -4.1184 },
        description: 'Aparcad en la plaza de abajo: la calle de la iglesia es muy estrecha.',
        time: '17:30',
        order: 1,
      },
      {
        id: 'banquete',
        type: 'banquete',
        name: 'Finca El Encinar',
        address: 'Camino del Encinar, km 3',
        coords: { lat: 40.9302, lng: -4.0951 },
        description: '',
        time: '20:00',
        order: 2,
      },
      {
        id: 'parking',
        type: 'parking',
        name: 'Aparcamiento de la finca',
        address: '',
        coords: { lat: 40.9298, lng: -4.0933 },
        description: 'Gratuito, con vigilancia. Hay autobús de vuelta a las 04:00.',
        time: null,
        order: 3,
      },
    ]),
  },
};

@Component({
  selector: 'np-previa-mapa',
  imports: [NpMapaPublica],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<np-mapa-publica [tenant]="tenant" />`,
})
export class PreviaMapa {
  protected readonly tenant = TENANT;
}
