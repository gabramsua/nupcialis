import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { FIREBASE_STORAGE } from '../../core/firebase/storage.providers';
import { PUERTA_CATALOGOS, type PuertaCatalogos } from '../../core/superadmin/catalogos-gateway';
import { PUERTA_INVITADOS, type PuertaInvitados } from '../../core/invitados/invitados-gateway';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { BodaStore } from './boda.store';
import { DatosBoda } from './datos/datos-boda';
import { Diseno } from './diseno/diseno';
import { SelectorPaleta } from './diseno/selector-paleta';
import { SelectorPortada } from './diseno/selector-portada';
import { SelectorPlantilla } from './diseno/selector-plantilla';
import type { BodaDelPanel } from './boda';
import { BODA_DE_PRUEBA as BODA, gruposStoreFalso } from './invitados/dobles.testing';
import { Grupos } from './invitados/grupos';
import { GruposStore } from './invitados/grupos.store';
import { PUERTA_PREGUNTAS, type PuertaPreguntas } from '../../core/rsvp/preguntas-gateway';
import { PreguntasRsvp } from './rsvp/preguntas';
import { RespuestasRsvp } from './rsvp/respuestas';
import { Accesos } from './invitados/accesos';
import { PanelFaqs } from './faqs/faqs';
import { PanelCronologia } from './cronologia/cronologia';
import { PanelAlojamientos } from './alojamientos/alojamientos';
import { PanelDressCode } from './dress-code/dress-code';
import { PanelPreguntasQuiz } from './quiz/preguntas-quiz';
import { PanelRankingQuiz } from './quiz/ranking-quiz';
import { PanelMesas } from './mesas/mesas-pantalla';
import { MesasStore } from './mesas/mesas.store';
import {
  PUERTA_MESAS,
  PUERTA_SENTAR,
  type PuertaMesas,
  type PuertaSentar,
} from '../../core/mesas/mesas-gateway';
import { PreguntasQuizStore } from './quiz/preguntas-quiz.store';
import { RankingQuizStore } from './quiz/ranking-quiz.store';
import {
  PUERTA_PREGUNTAS_QUIZ,
  PUERTA_RANKING_QUIZ,
  type PuertaPreguntasQuiz,
  type PuertaRankingQuiz,
} from '../../core/quiz/quiz-admin-gateway';
import { AlojamientosStore } from './alojamientos/alojamientos.store';
import { PersonasStore } from './personas/personas.store';
import { proveerUbicacionesDePrueba } from './mapa/ubicaciones.testing';
import { doblesDeEnlaces } from './enlaces/dobles-enlaces.testing';
import {
  ALMACEN_FOTOS_PERSONAS,
  PUERTA_PERSONAS,
  type AlmacenFotosPersonas,
  type PuertaPersonas,
} from '../../core/personas/personas-gateway';
import {
  PUERTA_ALOJAMIENTOS,
  type PuertaAlojamientos,
} from '../../core/alojamientos/alojamientos-gateway';
import { CronologiaStore } from './cronologia/cronologia.store';
import { PUERTA_CRONOLOGIA, type PuertaCronologia } from '../../core/cronologia/cronologia-gateway';
import { FaqsStore } from './faqs/faqs.store';
import { PUERTA_FAQS, type PuertaFaqs } from '../../core/faqs/faqs-gateway';
import { PUERTA_RESPUESTAS, type PuertaRespuestas } from '../../core/rsvp/respuestas-gateway';
import { PUERTA_ACCESOS, type PuertaAccesos } from '../../core/invitados/accesos-gateway';
import { PreguntasStore } from './rsvp/preguntas.store';
import { SessionStore } from '../../core/auth/session.store';
import { ImportarInvitados } from './invitados/importar';
import { Invitados } from './invitados/invitados';
import { PanelResumen } from './resumen/resumen';
import { EditorSecciones } from './web/editor-secciones';

/**
 * Humo del panel de la pareja: que cada pantalla se monte sin lanzar.
 *
 * Este fichero existe por un fallo concreto. `guardaPanel` inyectaba después de
 * un `await`, lo que lanza `NG0203`, y **el panel de la pareja no llegó a
 * abrirse nunca desde que se escribió**. Nadie se enteró porque no había una
 * sola prueba que montara ninguna de estas pantallas: todas las que había eran
 * de funciones puras, y las funciones puras estaban bien.
 *
 * No comprueba qué se ve, comprueba que se ve algo. Es poco, y es exactamente
 * lo que faltaba: montar un componente destapa inyecciones que no existen,
 * plantillas que no compilan y `computed` que revientan con datos vacíos.
 */

/** Una puerta de invitados que no llama a ninguna función. */
const PUERTA_FALSA: PuertaInvitados = {
  async listar() {
    return { ok: true as const, invitados: [] };
  },
  async importar() {
    return {
      ok: true as const,
      importacion: {
        filas: [],
        resumen: { nuevos: 0, duplicados: 0, invalidos: 0, sinSitio: 0 },
        gruposNuevos: [],
        importados: 0,
        previsualizacion: true,
      },
    };
  },
  async guardar() {
    return { ok: true, id: 'i1', creado: true };
  },
  async borrar() {
    return { ok: true };
  },
};

/** Un store de mentira: estas pruebas no tocan Firestore ni sesión. */
type Estado = 'cargando' | 'lista' | 'sin-boda' | 'error';

class BodaStoreFalso {
  readonly boda: () => BodaDelPanel | null = () => BODA;
  readonly estado: () => Estado = () => 'lista';
  readonly error = () => '';
  readonly menu = () => [];
  readonly sinPublicar = () => 0;
  async cargar(): Promise<void> {
    // El store real lee de Firestore al construirse. Aquí no hay nada que leer.
    return;
  }
  async cambiarPlantilla(): Promise<boolean> {
    return true;
  }
  async guardarPaleta(): Promise<boolean> {
    return true;
  }
  async guardarPortada(): Promise<boolean> {
    return true;
  }
  async guardarSecciones(): Promise<boolean> {
    return true;
  }
  async guardarDatos(): Promise<boolean> {
    return true;
  }
  async guardarHora(): Promise<boolean> {
    return true;
  }
}

function montar(componente: Type<unknown>) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: {} },
        // Diccionario vacío a propósito: aquí se prueba que la pantalla se
        // monta, no qué pone. Transloco devuelve la clave y con eso basta.
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      ...doblesDeEnlaces().providers,
      // Las pantallas con `routerLink` no se montan sin router.
      provideRouter([]),
      { provide: BodaStore, useClass: BodaStoreFalso },
      // `SelectorPortada` crea su almacén en un inicializador de campo, así que
      // el token tiene que existir aunque no se use.
      { provide: FIREBASE_STORAGE, useValue: {} },
      { provide: PUERTA_INVITADOS, useValue: PUERTA_FALSA },
      { provide: GruposStore, useValue: gruposStoreFalso() },
      { provide: PUERTA_PREGUNTAS, useValue: PUERTA_PREGUNTAS_FALSA },
      { provide: PUERTA_RESPUESTAS, useValue: PUERTA_RESPUESTAS_FALSA },
      { provide: PUERTA_ACCESOS, useValue: PUERTA_ACCESOS_FALSA },
      { provide: PUERTA_FAQS, useValue: PUERTA_FAQS_FALSA },
      FaqsStore,
      { provide: PUERTA_CRONOLOGIA, useValue: PUERTA_CRONOLOGIA_FALSA },
      CronologiaStore,
      { provide: PUERTA_ALOJAMIENTOS, useValue: PUERTA_ALOJAMIENTOS_FALSA },
      { provide: PUERTA_PERSONAS, useValue: PUERTA_PERSONAS_FALSA },
      { provide: ALMACEN_FOTOS_PERSONAS, useValue: ALMACEN_FOTOS_FALSO },
      PersonasStore,
      AlojamientosStore,
      ...proveerUbicacionesDePrueba(),
      { provide: PUERTA_PREGUNTAS_QUIZ, useValue: PUERTA_PREGUNTAS_QUIZ_FALSA },
      { provide: PUERTA_CATALOGOS, useValue: PUERTA_CATALOGOS_FALSA },
      PreguntasQuizStore,
      { provide: PUERTA_RANKING_QUIZ, useValue: PUERTA_RANKING_QUIZ_FALSA },
      RankingQuizStore,
      { provide: PUERTA_MESAS, useValue: PUERTA_MESAS_FALSA },
      { provide: PUERTA_SENTAR, useValue: PUERTA_SENTAR_FALSA },
      MesasStore,
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      PreguntasStore,
    ],
  });

  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  return fixture;
}

/** Preguntas del formulario que no llaman a Firestore. */
const PUERTA_PREGUNTAS_FALSA: PuertaPreguntas = {
  async listar() {
    return { ok: true as const, preguntas: [] };
  },
  async guardar() {
    return { ok: true as const };
  },
  async borrar() {
    return { ok: true as const };
  },
  async reordenar() {
    return { ok: true as const };
  },
};

/** Respuestas del formulario que no llaman a ninguna función. */
const PUERTA_CRONOLOGIA_FALSA: PuertaCronologia = {
  async listar() {
    return { ok: true as const, hitos: [] };
  },
  async guardar() {
    return { ok: true as const };
  },
  async borrar() {
    return { ok: true as const };
  },
};

const PUERTA_FAQS_FALSA: PuertaFaqs = {
  async listar() {
    return { ok: true as const, faqs: [] };
  },
  async guardar() {
    return { ok: true as const };
  },
  async borrar() {
    return { ok: true as const };
  },
  async reordenar() {
    return { ok: true as const };
  },
};

const PUERTA_MESAS_FALSA: PuertaMesas = {
  async listar() {
    return { ok: true as const, mesas: [] };
  },
  async guardar() {
    return { ok: true as const };
  },
  async borrar() {
    return { ok: true as const };
  },
};

const PUERTA_SENTAR_FALSA: PuertaSentar = {
  async sentar() {
    return { ok: true as const, sentados: 0 };
  },
};

const PUERTA_CATALOGOS_FALSA: PuertaCatalogos = {
  async tareas() {
    return { ok: true, datos: [] };
  },
  async partidas() {
    return { ok: true, datos: [] };
  },
  async preguntas() {
    return { ok: true, datos: [] };
  },
  async guardar() {
    return { ok: true, datos: null };
  },
  async borrar() {
    return { ok: true, datos: null };
  },
  async cargarDeFabrica() {
    return { ok: true, datos: { creados: 0 } };
  },
};

const PUERTA_PREGUNTAS_QUIZ_FALSA: PuertaPreguntasQuiz = {
  async listar() {
    return { ok: true as const, preguntas: [] };
  },
  async guardar() {
    return { ok: true as const };
  },
  async borrar() {
    return { ok: true as const };
  },
};

const PUERTA_RANKING_QUIZ_FALSA: PuertaRankingQuiz = {
  async jugadores() {
    return { ok: true as const, jugadores: [] };
  },
  async vaciar() {
    return { ok: true as const, borradas: 0 };
  },
};

const PUERTA_PERSONAS_FALSA: PuertaPersonas = {
  async listar() {
    return { ok: true, personas: [] };
  },
  async guardar() {
    return { ok: true };
  },
  async borrar() {
    return { ok: true };
  },
  async reordenar() {
    return { ok: true };
  },
};

const ALMACEN_FOTOS_FALSO: AlmacenFotosPersonas = {
  async subir() {
    return { path: 'weddings/w1/party/1.jpg', url: 'https://x.test/1.jpg' };
  },
  async borrar() {
    return undefined;
  },
};

const PUERTA_ALOJAMIENTOS_FALSA: PuertaAlojamientos = {
  async listar() {
    return { ok: true as const, alojamientos: [] };
  },
  async guardar() {
    return { ok: true as const };
  },
  async borrar() {
    return { ok: true as const };
  },
};

const PUERTA_ACCESOS_FALSA: PuertaAccesos = {
  async leer() {
    return { ok: true as const, datos: { entradas: [], tope: 300 } };
  },
};

const PUERTA_RESPUESTAS_FALSA: PuertaRespuestas = {
  async guardarEnLote() {
    return { ok: true as const, cambiados: 0, omitidos: 0 };
  },
  async guardar() {
    return { ok: true as const, estado: 'confirmed' as const };
  },
  async leer() {
    return { ok: true as const, datos: { preguntas: [], invitados: [] } };
  },
};

const PANTALLAS: readonly [string, Type<unknown>][] = [
  ['resumen', PanelResumen],
  ['datos de la boda', DatosBoda],
  ['diseño', Diseno],
  ['selector de plantilla', SelectorPlantilla],
  ['selector de paleta', SelectorPaleta],
  ['selector de portada', SelectorPortada],
  ['editor de secciones', EditorSecciones],
  ['invitados', Invitados],
  ['importar invitados', ImportarInvitados],
  ['grupos', Grupos],
  ['preguntas del formulario', PreguntasRsvp],
  ['respuestas del formulario', RespuestasRsvp],
  ['registro de accesos', Accesos],
  ['preguntas frecuentes', PanelFaqs],
  ['cronología del día', PanelCronologia],
  ['alojamientos', PanelAlojamientos],
  ['dress code', PanelDressCode],
  ['preguntas del quiz', PanelPreguntasQuiz],
  ['ranking del quiz', PanelRankingQuiz],
  ['reparto de mesas', PanelMesas],
];

describe.each(PANTALLAS)('la pantalla de %s', (_nombre, Pantalla) => {
  it('se monta sin lanzar', () => {
    expect(() => montar(Pantalla)).not.toThrow();
  });

  it('pinta algo', () => {
    const fixture = montar(Pantalla);
    expect(fixture.nativeElement.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});

/** El autoguardado se dice arriba, pegado a la ayuda, y no al pie de la rejilla. */
describe.each([
  ['plantilla', SelectorPlantilla],
  ['paleta', SelectorPaleta],
  ['portada', SelectorPortada],
] as const)('el selector de %s', (nombre, Selector) => {
  it('avisa del autoguardado justo debajo de la ayuda', () => {
    const raiz = montar(Selector).nativeElement as HTMLElement;
    const intro = raiz.querySelector('header');

    expect(intro?.textContent).toContain(`panel.diseno.${nombre}.autoguardado`);
    expect(intro?.textContent).toContain(`panel.diseno.${nombre}.nota`);
  });
});

/**
 * El caso que de verdad rompe: una boda a medio cargar.
 *
 * Es el estado real al entrar —el store arranca en `cargando` con la boda a
 * `null`— y es donde un `computed` que da por hecho que hay datos se cae.
 */
describe('con la boda todavía sin cargar', () => {
  class StoreVacio extends BodaStoreFalso {
    override readonly boda: () => BodaDelPanel | null = () => null;
    override readonly estado: () => Estado = () => 'cargando';
  }

  it.each(PANTALLAS)('%s aguanta sin datos', (_nombre, Pantalla) => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideIconSprite('panel'),
        ...doblesDeEnlaces().providers,
        // Las pantallas con `routerLink` no se montan sin router.
        provideRouter([]),
        { provide: BodaStore, useClass: StoreVacio },
        { provide: FIREBASE_STORAGE, useValue: {} },
        { provide: PUERTA_INVITADOS, useValue: PUERTA_FALSA },
        { provide: GruposStore, useValue: gruposStoreFalso() },
        { provide: PUERTA_PREGUNTAS, useValue: PUERTA_PREGUNTAS_FALSA },
        { provide: PUERTA_RESPUESTAS, useValue: PUERTA_RESPUESTAS_FALSA },
        { provide: PUERTA_ACCESOS, useValue: PUERTA_ACCESOS_FALSA },
        { provide: PUERTA_FAQS, useValue: PUERTA_FAQS_FALSA },
        FaqsStore,
        { provide: PUERTA_CRONOLOGIA, useValue: PUERTA_CRONOLOGIA_FALSA },
        CronologiaStore,
        { provide: PUERTA_ALOJAMIENTOS, useValue: PUERTA_ALOJAMIENTOS_FALSA },
        { provide: PUERTA_PERSONAS, useValue: PUERTA_PERSONAS_FALSA },
        { provide: ALMACEN_FOTOS_PERSONAS, useValue: ALMACEN_FOTOS_FALSO },
        PersonasStore,
        AlojamientosStore,
        ...proveerUbicacionesDePrueba(),
        { provide: PUERTA_PREGUNTAS_QUIZ, useValue: PUERTA_PREGUNTAS_QUIZ_FALSA },
        { provide: PUERTA_CATALOGOS, useValue: PUERTA_CATALOGOS_FALSA },
        { provide: PUERTA_CATALOGOS, useValue: PUERTA_CATALOGOS_FALSA },
        PreguntasQuizStore,
        { provide: PUERTA_RANKING_QUIZ, useValue: PUERTA_RANKING_QUIZ_FALSA },
        RankingQuizStore,
        { provide: PUERTA_MESAS, useValue: PUERTA_MESAS_FALSA },
        { provide: PUERTA_SENTAR, useValue: PUERTA_SENTAR_FALSA },
        MesasStore,
        { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
        PreguntasStore,
      ],
    });

    expect(() => {
      const fixture = TestBed.createComponent(Pantalla);
      fixture.detectChanges();
    }).not.toThrow();
  });
});
