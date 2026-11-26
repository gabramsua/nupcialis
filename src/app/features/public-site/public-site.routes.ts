import { Routes } from '@angular/router';
import { tenantResolver } from '../../core/tenant/tenant.resolver';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideAppCheck } from '../../core/firebase/appcheck.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';
import { SesionInvitado, exigirSesionDeInvitado } from '../../core/firebase/sesion-invitado';
import { PUERTA_RSVP } from '../../core/rsvp/rsvp-gateway';
import { crearPuertaRsvpFirebase } from '../../core/firebase/rsvp-gateway.firebase';
import { provideQuiz } from '../../core/quiz/quiz.providers';
import { provideGaleria } from '../../core/galeria/galeria.providers';
import { provideRegalos } from '../../core/regalos/regalos.providers';
import { PUERTA_REGALOS_ABIERTOS } from '../../core/regalos/regalos-abiertos-gateway';
import { crearPuertaRegalosAbiertosFirebase } from '../../core/firebase/regalos-abiertos-gateway.firebase';
import { PUERTA_HOME_PUBLICA, PUERTA_SOLICITUDES } from '../../core/home/home-gateway';
import { crearPuertaHomePublicaFirebase } from '../../core/firebase/home-gateway.firebase';
import { crearPuertaSolicitudesFirebase } from '../../core/firebase/solicitudes-gateway.firebase';
import { provideLibro } from '../../core/libro/libro.providers';
import { providePlaylist } from '../../core/playlist/playlist.providers';

/**
 * La web pública solo necesita Firestore, para resolver el tenant y leer la
 * proyección pública, y Functions, para el acceso del invitado. Ni Auth ni
 * Storage entran aquí.
 */
export const publicSiteRoutes: Routes = [
  {
    path: '',
    providers: [
      provideIconSprite('public'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      // Aquí y no en la raíz: inyecta tokens de Firebase, que se proveen por
      // ruta. En la raíz no los encuentra y la web se queda en blanco.
      SesionInvitado,
      { provide: PUERTA_RSVP, useFactory: crearPuertaRsvpFirebase },
      // Los regalos del plan básico, sin identificarse (D-66).
      { provide: PUERTA_REGALOS_ABIERTOS, useFactory: crearPuertaRegalosAbiertosFirebase },
      // La HOME de nupcialis.com: solo lectura del documento público.
      { provide: PUERTA_HOME_PUBLICA, useFactory: crearPuertaHomePublicaFirebase },
      // Y su formulario de contacto: una llamada pública a `createWeddingRequest`.
      { provide: PUERTA_SOLICITUDES, useFactory: crearPuertaSolicitudesFirebase },
    ],
    resolve: { tenant: tenantResolver },
    loadComponent: () =>
      import('../../layouts/public-shell/public-shell').then((m) => m.PublicShell),
  },
  {
    // El formulario de confirmación, con URL propia para poder mandarla.
    //
    // Resuelve el tenant otra vez a propósito: lo necesita para pintar con los
    // colores de la pareja, y el resolver guarda lo que ya ha leído, así que no
    // es una segunda lectura. Los `providers` se repiten porque son de ruta
    // (D-18) y esta es hermana, no hija: así el formulario carga Firebase en su
    // propio trozo y la web pública no se lo descarga por si acaso.
    path: 'confirmar',
    providers: [
      provideIconSprite('public'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      SesionInvitado,
      { provide: PUERTA_RSVP, useFactory: crearPuertaRsvpFirebase },
    ],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./rsvp/confirmar').then((m) => m.Confirmar),
  },
  {
    // El quiz, con URL propia: se comparte en el grupo de WhatsApp durante el
    // banquete («a ver quién me gana»), y eso solo funciona si se puede mandar
    // un enlace que lleve directamente al juego.
    //
    // Mismos `providers` que arriba por lo mismo (D-18): es una ruta hermana y
    // así el juego cae en su propio trozo, que la mayoría de invitados no
    // llegará a descargar.
    path: 'quiz',
    canActivate: [exigirSesionDeInvitado('quiz')],
    providers: [
      provideIconSprite('public'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      SesionInvitado,
      provideQuiz(),
    ],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./quiz/quiz-publico').then((m) => m.NpQuizPublico),
  },
  {
    // La galería, con URL propia: es la página a la que se vuelve al día
    // siguiente de la boda, y la que se pasa por el grupo de WhatsApp.
    path: 'galeria',
    canActivate: [exigirSesionDeInvitado('galeria')],
    providers: [
      provideIconSprite('public'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      SesionInvitado,
      provideGaleria(),
    ],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./galeria/galeria-publica').then((m) => m.NpGaleriaPublica),
  },
  {
    // Los regalos, con URL propia y por el mismo motivo que la galería: no se
    // pintan dentro de la web. Y por uno más, que es el que manda: el número
    // de cuenta de la pareja no puede viajar en la proyección pública.
    path: 'regalos',
    canActivate: [exigirSesionDeInvitado('regalos')],
    providers: [
      provideIconSprite('public'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      SesionInvitado,
      provideRegalos(),
    ],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./regalos/regalos-publica').then((m) => m.NpRegalosPublica),
  },
  {
    // La playlist, con URL propia: quién ha votado qué no es público, así que
    // la lista llega por invocable y solo a quien está identificado.
    path: 'playlist',
    canActivate: [exigirSesionDeInvitado('playlist')],
    providers: [
      provideIconSprite('public'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      SesionInvitado,
      providePlaylist(),
    ],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./playlist/playlist-publica').then((m) => m.NpPlaylistPublica),
  },
  {
    // El libro de firmas (§8.15): cada firma lleva el nombre de su autor, así
    // que llega por invocable y solo a quien está identificado.
    path: 'libro',
    canActivate: [exigirSesionDeInvitado('libro')],
    providers: [
      provideIconSprite('public'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      SesionInvitado,
      provideLibro(),
    ],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./libro/libro-publica').then((m) => m.NpLibroPublica),
  },
  {
    // La puerta de los módulos que necesitan saber quién es el invitado (D-56):
    // el quiz, la galería, los regalos y la playlist mandan aquí a quien no se
    // ha identificado, y vuelven a su página cuando lo hace. En una boda abierta
    // la portada no pide nada; esto solo aparece al entrar a uno de esos módulos.
    path: 'entrar',
    providers: [
      provideIconSprite('public'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      SesionInvitado,
    ],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./acceso/entrar-modulo').then((m) => m.EntrarModulo),
  },
  {
    // El mapa, con URL propia por lo que pesa Leaflet: se descarga solo aquí.
    // Sin Functions ni sesión de invitado: lo que enseña viene en la
    // proyección pública, que ya está leída.
    path: 'mapa',
    providers: [provideIconSprite('public'), provideFirestore(), provideAppCheck()],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./mapa/mapa-publica').then((m) => m.NpMapaPublica),
  },
  {
    // Nuestra historia, con URL propia: son cinco apartados con fotos y no
    // tienen por qué viajar con la portada. Lo que enseña viene en la
    // proyección pública, así que no hace falta Functions ni sesión.
    path: 'historia',
    providers: [provideIconSprite('public'), provideFirestore(), provideAppCheck()],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('./historia/historia-publica').then((m) => m.NpHistoriaPublica),
  },
];
