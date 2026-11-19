import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { PUERTA_RESPUESTAS } from '../../../core/rsvp/respuestas-gateway';
import {
  PUERTA_INVITADOS,
  type FalloInvitado,
  type Invitado,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import { BodaStore } from '../boda.store';
import { INVITADO_DE_PRUEBA, bodaStoreFalso, gruposStoreFalso } from './dobles.testing';
import { GruposStore } from './grupos.store';
import { Invitados } from './invitados';

/**
 * Lo que un 401 le tiene que contar a la pareja.
 *
 * Este fichero nace de un fallo concreto: la pantalla enseñaba
 * «Unauthenticated [401]» tal cual, porque el listado era el único camino que
 * no traducía el error del SDK. Un mensaje así cuesta lo mismo que no tener
 * mensaje, y App Check sin configurar es **el** fallo más habitual mientras se
 * desarrolla contra el proyecto real.
 */
const PUERTA_RESPUESTAS_FALSA = {
  async leer() {
    return { ok: true as const, datos: { preguntas: [], invitados: [] } };
  },
};

function puertaQueFalla(fallo: FalloInvitado): PuertaInvitados {
  return {
    async listar() {
      return { ok: false, fallo };
    },
    async importar() {
      return { ok: false, fallo };
    },
    async guardar() {
      return { ok: false, fallo };
    },
    async cupoEnLote() {
      return { ok: true as const, cambiados: 0, omitidos: 0 };
    },
    async borrar() {
      return { ok: false, fallo };
    },
  };
}

const TEXTOS = {
  panel: {
    invitados: {
      errorCargar: 'No se ha podido cargar la lista',
      sinPermiso: 'Tu sesión no tiene permiso sobre esta boda.',
    },
  },
  superadmin: {
    alta: { sinVerificar: 'Falta App Check. Revisa el token de depuración.' },
  },
};

async function montar(fallo: FalloInvitado) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: TEXTOS },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      provideRouter([]),
      { provide: PUERTA_RESPUESTAS, useValue: PUERTA_RESPUESTAS_FALSA },
      { provide: PUERTA_INVITADOS, useValue: puertaQueFalla(fallo) },
      { provide: BodaStore, useValue: bodaStoreFalso() },
      { provide: GruposStore, useValue: gruposStoreFalso() },
    ],
  });

  const fixture = TestBed.createComponent(Invitados);
  fixture.detectChanges();
  // El listado se pide en el constructor: hay que dejar resolver la promesa.
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture.nativeElement.textContent ?? '';
}

describe('cuando el listado falla', () => {
  it('un 401 se cuenta como lo que es: falta App Check', async () => {
    const texto = await montar({ tipo: 'sin-verificar' });

    expect(texto).toContain('App Check');
    // Lo que no puede volver a pasar: el código crudo del SDK en pantalla.
    expect(texto).not.toContain('401');
    expect(texto).not.toContain('Unauthenticated');
  });

  it('un permiso denegado dice qué cuenta hace falta', async () => {
    const texto = await montar({ tipo: 'sin-permiso' });
    expect(texto).toContain('permiso');
  });

  it('un error de verdad enseña el mensaje del servidor, que sí informa', async () => {
    const texto = await montar({ tipo: 'error', mensaje: 'La base de datos no responde' });
    expect(texto).toContain('La base de datos no responde');
  });
});

/**
 * Quién trae a quién.
 *
 * La pareja necesita el nombre, no «es acompañante» a secas: es lo que usa para
 * sentarlos juntos y para saber a quién preguntar si alguien no contesta.
 */
describe('acompañantes en la lista', () => {
  const MARIA: Invitado = { ...INVITADO_DE_PRUEBA, maxCompanions: 2 };

  const ANA: Invitado = {
    ...MARIA,
    id: 'g2',
    fullName: 'Ana Ruiz',
    nickname: '',
    isCompanion: true,
    invitedById: 'g1',
    maxCompanions: 0,
  };

  async function conLista(invitados: readonly Invitado[]) {
    const puerta: PuertaInvitados = {
      async listar() {
        return { ok: true, invitados };
      },
      async importar() {
        throw new Error('no se usa');
      },
      async guardar() {
        throw new Error('no se usa');
      },
      async cupoEnLote() {
        return { ok: true as const, cambiados: 0, omitidos: 0 };
      },
      async borrar() {
        throw new Error('no se usa');
      },
    };

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            es: {
              panel: {
                invitados: {
                  loTrae: 'Lo trae {{nombre}}',
                  trae: 'Trae a {{n}}',
                  esAcompanante: 'Es acompañante',
                },
              },
            },
          },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideIconSprite('panel'),
        provideRouter([]),
        { provide: PUERTA_RESPUESTAS, useValue: PUERTA_RESPUESTAS_FALSA },
        { provide: PUERTA_INVITADOS, useValue: puerta },
        { provide: BodaStore, useValue: bodaStoreFalso() },
        { provide: GruposStore, useValue: gruposStoreFalso() },
      ],
    });

    const fixture = TestBed.createComponent(Invitados);
    fixture.detectChanges();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();

    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('al acompañante se le pone el nombre de quien lo trae, con su mote', async () => {
    expect(await conLista([MARIA, ANA])).toContain('Lo trae Majo');
  });

  it('y al titular, a cuántos trae', async () => {
    expect(await conLista([MARIA, ANA])).toContain('Trae a 1');
  });

  /** Puede pasar: la pareja borra al titular y deja al acompañante. */
  it('si quien lo traía ya no está, se dice que es acompañante y nada más', async () => {
    const texto = await conLista([ANA]);

    expect(texto).toContain('Es acompañante');
    expect(texto).not.toContain('Lo trae');
  });

  it('a quien no trae a nadie no se le pinta un cero', async () => {
    expect(await conLista([MARIA])).not.toContain('Trae a');
  });
});

/**
 * Las cifras de la cabecera son los filtros.
 *
 * La pareja mira «pendientes: 84» y lo siguiente que quiere es ver esos 84. Con
 * el número como texto muerto tenía que buscarlos a mano, uno a uno.
 */
describe('filtrar por la cifra de la cabecera', () => {
  const VIENE: Invitado = {
    ...INVITADO_DE_PRUEBA,
    id: 'a',
    fullName: 'Ana Viene',
    rsvpStatus: 'confirmed',
    loginCount: 2,
  };
  const FALTA: Invitado = { ...INVITADO_DE_PRUEBA, id: 'b', fullName: 'Borja Falta' };

  async function montarCon(invitados: readonly Invitado[]) {
    const puerta: PuertaInvitados = {
      async listar() {
        return { ok: true, invitados };
      },
      async importar() {
        throw new Error('no se usa');
      },
      async guardar() {
        throw new Error('no se usa');
      },
      async cupoEnLote() {
        return { ok: true as const, cambiados: 0, omitidos: 0 };
      },
      async borrar() {
        throw new Error('no se usa');
      },
    };

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideIconSprite('panel'),
        provideRouter([]),
        { provide: PUERTA_RESPUESTAS, useValue: PUERTA_RESPUESTAS_FALSA },
        { provide: PUERTA_INVITADOS, useValue: puerta },
        { provide: BodaStore, useValue: bodaStoreFalso() },
        { provide: GruposStore, useValue: gruposStoreFalso() },
      ],
    });

    const fixture = TestBed.createComponent(Invitados);
    fixture.detectChanges();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;

    return {
      nombres: () => [...raiz.querySelectorAll('.inv__nombre')].map((n) => n.textContent?.trim()),
      pulsar(indice: number) {
        [...raiz.querySelectorAll<HTMLButtonElement>('.inv__cifra')][indice]!.click();
        fixture.detectChanges();
      },
    };
  }

  it('de entrada se ven todos', async () => {
    const p = await montarCon([VIENE, FALTA]);

    expect(p.nombres()).toEqual(['Ana Viene', 'Borja Falta']);
  });

  it('pulsando «confirmados» se ven solo los que vienen', async () => {
    const p = await montarCon([VIENE, FALTA]);
    p.pulsar(1);

    expect(p.nombres()).toEqual(['Ana Viene']);
  });

  it('pulsando «sin entrar» se ve a quién reenviar el enlace', async () => {
    const p = await montarCon([VIENE, FALTA]);
    p.pulsar(3);

    expect(p.nombres()).toEqual(['Borja Falta']);
  });

  /** Volver atrás sin tener que buscar un botón de «quitar filtro». */
  it('pulsando otra vez la misma cifra se vuelve a la lista entera', async () => {
    const p = await montarCon([VIENE, FALTA]);
    p.pulsar(1);
    p.pulsar(1);

    expect(p.nombres()).toEqual(['Ana Viene', 'Borja Falta']);
  });
});
