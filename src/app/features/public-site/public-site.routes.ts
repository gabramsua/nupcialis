import { Routes } from '@angular/router';
import { tenantResolver } from '../../core/tenant/tenant.resolver';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideAppCheck } from '../../core/firebase/appcheck.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';
import { SesionInvitado } from '../../core/firebase/sesion-invitado';
import { PUERTA_RSVP } from '../../core/rsvp/rsvp-gateway';
import { crearPuertaRsvpFirebase } from '../../core/firebase/rsvp-gateway.firebase';
import { provideQuiz } from '../../core/quiz/quiz.providers';

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
];
