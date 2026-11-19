import { Routes } from '@angular/router';
import { provideAuth } from '../../core/auth/auth.providers';
import { provideGrupos } from '../../core/invitados/grupos.providers';
import { provideAccesos } from '../../core/invitados/accesos.providers';
import { provideFaqs } from '../../core/faqs/faqs.providers';
import { provideCronologia } from '../../core/cronologia/cronologia.providers';
import { provideAlojamientos } from '../../core/alojamientos/alojamientos.providers';
import { provideEnlaces } from '../../core/invitados/enlaces.providers';
import { provideInvitados } from '../../core/invitados/invitados.providers';
import { guardaPanel } from '../../core/auth/guards';
import { provideFirebaseAuth } from '../../core/firebase/auth.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideAppCheck } from '../../core/firebase/appcheck.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';
import { provideFirebaseStorage } from '../../core/firebase/storage.providers';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { BodaStore } from './boda.store';
import { GruposStore } from './invitados/grupos.store';
import { providePreguntas } from '../../core/rsvp/preguntas.providers';
import { provideRespuestas } from '../../core/rsvp/respuestas.providers';
import { PreguntasStore } from './rsvp/preguntas.store';
import { FaqsStore } from './faqs/faqs.store';
import { CronologiaStore } from './cronologia/cronologia.store';
import { AlojamientosStore } from './alojamientos/alojamientos.store';
import { provideQuizDelPanel } from '../../core/quiz/quiz-admin.providers';
import { provideMesas } from '../../core/mesas/mesas.providers';
import { MesasStore } from './mesas/mesas.store';
import { PreguntasQuizStore } from './quiz/preguntas-quiz.store';
import { RankingQuizStore } from './quiz/ranking-quiz.store';

export const panelRoutes: Routes = [
  {
    path: '',
    providers: [
      provideIconSprite('panel'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      provideFirebaseAuth(),
      provideFirebaseStorage(),
      provideAuth(),
      provideInvitados(),
      provideGrupos(),
      provideEnlaces(),
      provideAccesos(),
      provideFaqs(),
      provideCronologia(),
      provideAlojamientos(),
      provideQuizDelPanel(),
      provideMesas(),
      providePreguntas(),
      provideRespuestas(),
      BodaStore,
      GruposStore,
    ],
    children: [
      {
        path: 'acceso',
        loadComponent: () => import('./login/login').then((m) => m.Login),
      },
      {
        path: 'otra-boda',
        loadComponent: () => import('./login/otra-boda').then((m) => m.OtraBoda),
      },
      {
        path: '',
        canActivate: [guardaPanel],
        loadComponent: () =>
          import('../../layouts/panel-shell/panel-shell').then((m) => m.PanelShell),
        children: [
          {
            // La ruta se llama como el módulo: el menú del panel enlaza a
            // `/panel/<modulo>` y lo dibujan los módulos activos de la boda.
            path: 'guests',
            loadComponent: () => import('./invitados/invitados').then((m) => m.Invitados),
          },
          {
            path: 'guests/grupos',
            loadComponent: () => import('./invitados/grupos').then((m) => m.Grupos),
          },
          {
            // Cuelga de `guests` porque es la lista de invitados vista por el
            // otro lado: quién de ellos ha abierto ya la invitación.
            path: 'guests/accesos',
            loadComponent: () => import('./invitados/accesos').then((m) => m.Accesos),
          },
          {
            // Cuelga de `guests` porque es lo mismo visto de otra forma, y
            // porque así el menú sigue marcando «Invitados» mientras se
            // importa.
            path: 'guests/importar',
            loadComponent: () => import('./invitados/importar').then((m) => m.ImportarInvitados),
          },
          {
            // La ruta se llama como el módulo: el menú del panel enlaza a
            // `/panel/rsvp` en cuanto la boda lo tiene activo.
            path: 'rsvp',
            providers: [PreguntasStore],
            loadComponent: () => import('./rsvp/preguntas').then((m) => m.PreguntasRsvp),
          },
          {
            // Cuelga de `rsvp` porque es el mismo módulo del otro lado: ahí
            // están las preguntas y aquí lo que ha contestado la gente. Así el
            // menú sigue marcando «Confirmaciones» mientras se leen.
            path: 'rsvp/respuestas',
            loadComponent: () => import('./rsvp/respuestas').then((m) => m.RespuestasRsvp),
          },
          {
            // El nombre de la ruta es el del módulo, como los demás: el menú
            // del panel enlaza a `/panel/<modulo>`.
            path: 'faqs',
            providers: [FaqsStore],
            loadComponent: () => import('./faqs/faqs').then((m) => m.PanelFaqs),
          },
          {
            // El nombre del módulo es `timeline`, y la ruta se llama como él:
            // el menú del panel enlaza a `/panel/<modulo>`.
            path: 'timeline',
            providers: [CronologiaStore],
            loadComponent: () => import('./cronologia/cronologia').then((m) => m.PanelCronologia),
          },
          {
            // El módulo se llama `accommodation`, y la ruta como él: el menú
            // del panel enlaza a `/panel/<modulo>`.
            path: 'accommodation',
            providers: [AlojamientosStore],
            loadComponent: () =>
              import('./alojamientos/alojamientos').then((m) => m.PanelAlojamientos),
          },
          {
            // El módulo es `dressCode` y la ruta se llama como él, en minúsculas
            // con guion: el menú enlaza a lo que diga `RUTA_MODULO`.
            path: 'dress-code',
            loadComponent: () => import('./dress-code/dress-code').then((m) => m.PanelDressCode),
          },
          {
            // El módulo se llama `quiz` y la ruta como él: el menú del panel
            // enlaza a `/panel/<modulo>`.
            path: 'quiz',
            providers: [PreguntasQuizStore],
            loadComponent: () => import('./quiz/preguntas-quiz').then((m) => m.PanelPreguntasQuiz),
          },
          {
            // Cuelga de `quiz` porque es el mismo módulo visto por el otro
            // lado: ahí están las preguntas y aquí quién ha jugado.
            path: 'quiz/ranking',
            providers: [RankingQuizStore],
            loadComponent: () => import('./quiz/ranking-quiz').then((m) => m.PanelRankingQuiz),
          },
          {
            // El módulo se llama `tables` y la ruta como él.
            path: 'tables',
            providers: [MesasStore],
            loadComponent: () => import('./mesas/mesas-pantalla').then((m) => m.PanelMesas),
          },
          {
            path: 'datos',
            loadComponent: () => import('./datos/datos-boda').then((m) => m.DatosBoda),
          },
          {
            path: 'web',
            // La vista previa pinta las cuatro listas de contenido con sus
            // datos de verdad, así que necesita sus almacenes aquí.
            providers: [FaqsStore, CronologiaStore, AlojamientosStore],
            loadComponent: () => import('./web/editor-secciones').then((m) => m.EditorSecciones),
          },
          {
            path: 'diseno',
            loadComponent: () => import('./diseno/diseno').then((m) => m.Diseno),
          },
          {
            path: '',
            loadComponent: () => import('./resumen/resumen').then((m) => m.PanelResumen),
          },
        ],
      },
    ],
  },
];
