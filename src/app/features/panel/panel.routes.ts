import { Routes } from '@angular/router';
import { provideAuth } from '../../core/auth/auth.providers';
import { provideGrupos } from '../../core/invitados/grupos.providers';
import { provideAccesos } from '../../core/invitados/accesos.providers';
import { provideFaqs } from '../../core/faqs/faqs.providers';
import { provideCronologia } from '../../core/cronologia/cronologia.providers';
import { provideAlojamientos } from '../../core/alojamientos/alojamientos.providers';
import { provideEnlaces } from '../../core/invitados/enlaces.providers';
import { provideInvitados } from '../../core/invitados/invitados.providers';
import { guardaHijosDelPanel, guardaPanel } from '../../core/auth/guards';
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
import { UbicacionesStore } from './mapa/ubicaciones.store';
import { TareasStore } from './checklist/tareas.store';
import { HistoriaStore } from './historia/historia.store';
import { provideHistoria } from '../../core/historia/historia.providers';
import { PresupuestoStore } from './presupuesto/presupuesto.store';
import { PlaylistStore } from './playlist/playlist.store';
import { LibroStore } from './libro/libro.store';
import { provideLibroDelPanel } from '../../core/libro/libro-panel.providers';
import { providePlaylistDelPanel } from '../../core/playlist/playlist-panel.providers';
import { providePresupuesto } from '../../core/presupuesto/presupuesto.providers';
import { provideProveedores } from '../../core/proveedores/proveedores.providers';
import { providePersonas } from '../../core/personas/personas.providers';
import { PersonasStore } from './personas/personas.store';
import { ProveedoresStore } from './proveedores/proveedores.store';
import { provideTareas } from '../../core/checklist/tareas.providers';
import { provideUbicaciones } from '../../core/mapa/ubicaciones.providers';
import { ConsejosDelPanel } from './consejo/consejos-panel';
import { provideLlamadas } from '../../core/llamadas/llamadas.providers';
import { provideCatalogos } from '../../core/superadmin/catalogos.providers';
import { provideQuizDelPanel } from '../../core/quiz/quiz-admin.providers';
import { provideMesas } from '../../core/mesas/mesas.providers';
import { provideGaleriaDelPanel } from '../../core/galeria/galeria-panel.providers';
import { provideRegalosDelPanel } from '../../core/regalos/regalos-panel.providers';
import { provideRecibidos } from '../../core/regalos/recibidos.providers';
import { MesasStore } from './mesas/mesas.store';
import { PreguntasQuizStore } from './quiz/preguntas-quiz.store';
import { RankingQuizStore } from './quiz/ranking-quiz.store';
import { GaleriaPanelStore } from './galeria/galeria.store';
import { RegalosStore } from './regalos/regalos.store';
import { RecibidosStore } from './regalos/recibidos.store';

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
      provideUbicaciones(),
      provideTareas(),
      providePresupuesto(),
      provideProveedores(),
      providePersonas(),
      provideHistoria(),
      providePlaylistDelPanel(),
      provideLibroDelPanel(),
      provideQuizDelPanel(),
      provideCatalogos(),
      provideLlamadas(),
      ConsejosDelPanel,
      provideMesas(),
      provideGaleriaDelPanel(),
      provideRegalosDelPanel(),
      provideRecibidos(),
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
        canActivateChild: [guardaHijosDelPanel],
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
            providers: [CronologiaStore, UbicacionesStore],
            loadComponent: () => import('./cronologia/cronologia').then((m) => m.PanelCronologia),
          },
          {
            // El módulo se llama `accommodation`, y la ruta como él: el menú
            // del panel enlaza a `/panel/<modulo>`.
            path: 'accommodation',
            providers: [AlojamientosStore, UbicacionesStore],
            loadComponent: () =>
              import('./alojamientos/alojamientos').then((m) => m.PanelAlojamientos),
          },
          {
            // El módulo se llama `map` y la ruta como él: el menú del panel
            // enlaza a `/panel/<modulo>`.
            path: 'map',
            providers: [UbicacionesStore],
            loadComponent: () => import('./mapa/mapa-panel').then((m) => m.PanelMapa),
          },
          {
            // El módulo se llama `story` y la ruta como él.
            path: 'story',
            providers: [HistoriaStore],
            loadComponent: () => import('./historia/historia-panel').then((m) => m.PanelHistoria),
          },
          {
            // El módulo se llama `budget` y la ruta como él.
            path: 'budget',
            providers: [PresupuestoStore, ProveedoresStore, TareasStore],
            loadComponent: () =>
              import('./presupuesto/presupuesto-panel').then((m) => m.PanelPresupuesto),
          },
          {
            // El módulo es `weddingParty`; la ruta es más corta: `/panel/party`.
            path: 'party',
            providers: [PersonasStore],
            loadComponent: () => import('./personas/personas-panel').then((m) => m.PanelPersonas),
          },
          {
            // El módulo se llama `vendors` y la ruta como él.
            path: 'vendors',
            providers: [ProveedoresStore, TareasStore, PresupuestoStore],
            loadComponent: () =>
              import('./proveedores/proveedores-panel').then((m) => m.PanelProveedores),
          },
          {
            // El módulo se llama `checklist` y la ruta como él.
            path: 'checklist',
            providers: [TareasStore, ProveedoresStore, PresupuestoStore],
            loadComponent: () =>
              import('./checklist/checklist-panel').then((m) => m.PanelChecklist),
          },
          {
            // El módulo se llama `playlist` y la ruta como él.
            path: 'playlist',
            providers: [PlaylistStore],
            loadComponent: () => import('./playlist/playlist-panel').then((m) => m.PanelPlaylist),
          },
          {
            // El módulo se llama `guestbook` y la ruta como él.
            path: 'guestbook',
            providers: [LibroStore],
            loadComponent: () => import('./libro/libro-panel').then((m) => m.PanelLibro),
          },
          {
            // El módulo se llama `buses` y la ruta como él (D-63).
            path: 'buses',
            loadComponent: () => import('./autobuses/autobuses').then((m) => m.PanelAutobuses),
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
            // El módulo se llama `gallery` y la ruta como él: el menú del
            // panel enlaza a `/panel/<modulo>`.
            path: 'gallery',
            providers: [GaleriaPanelStore],
            loadComponent: () => import('./galeria/galeria-panel').then((m) => m.PanelGaleria),
          },
          {
            // El módulo se llama `gifts` y la ruta como él.
            path: 'gifts',
            providers: [RegalosStore],
            loadComponent: () => import('./regalos/regalos-panel').then((m) => m.PanelRegalos),
          },
          {
            // Cuelga de `gifts` porque es el mismo módulo por el otro lado: ahí
            // está lo que se pide y aquí lo que ha llegado. Así el menú sigue
            // marcando «Regalos» mientras se apunta.
            path: 'gifts/recibidos',
            providers: [RecibidosStore],
            loadComponent: () => import('./regalos/recibidos-panel').then((m) => m.PanelRecibidos),
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
            providers: [
              FaqsStore,
              CronologiaStore,
              AlojamientosStore,
              PersonasStore,
              UbicacionesStore,
            ],
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
