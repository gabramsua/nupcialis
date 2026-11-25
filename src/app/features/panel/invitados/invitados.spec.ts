import { type ComponentFixture, TestBed } from '@angular/core/testing';
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
import { abrirDialogosEnPruebas } from '../boda.testing';
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
  const MARIA: Invitado = { ...INVITADO_DE_PRUEBA };

  const ANA: Invitado = {
    ...MARIA,
    id: 'g2',
    fullName: 'Ana Ruiz',
    nickname: '',
    isCompanion: true,
    invitedById: 'g1',
  };

  async function conLista(invitados: readonly Invitado[], abrirTodas = false) {
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
                  familia: { ver: 'Ver acompañantes' },
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

    if (abrirTodas) {
      (fixture.nativeElement as HTMLElement)
        .querySelectorAll<HTMLButtonElement>('.lst__cabecera')
        .forEach((b) => b.click());
      fixture.detectChanges();
    }

    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('al acompañante se le pone el nombre de quien lo trae, con su mote', async () => {
    expect(await conLista([MARIA, ANA])).toContain('Lo trae Majo');
  });

  it('y al titular, un enlace para ver a sus acompañantes', async () => {
    expect(await conLista([MARIA, ANA], true)).toContain('Ver acompañantes');
  });

  /** Puede pasar: la pareja borra al titular y deja al acompañante. */
  it('si quien lo traía ya no está, se dice que es acompañante y nada más', async () => {
    const texto = await conLista([ANA]);

    expect(texto).toContain('Es acompañante');
    expect(texto).not.toContain('Lo trae');
  });

  it('a quien no trae a nadie no se le pinta un cero', async () => {
    expect(await conLista([MARIA], true)).not.toContain('Ver acompañantes');
  });
});

/**
 * Navegar de un titular a sus acompañantes y al revés.
 *
 * Es lo que la pareja usa para sentarlos juntos: de «Ver acompañantes» a ver quiénes
 * son, sin buscarlos a mano entre trescientos.
 */
describe('la familia de un invitado', () => {
  const MARIA: Invitado = { ...INVITADO_DE_PRUEBA, id: 'g1', fullName: 'María', nickname: '' };
  const ANA: Invitado = {
    ...MARIA,
    id: 'g2',
    fullName: 'Ana',
    isCompanion: true,
    invitedById: 'g1',
  };
  const LUIS: Invitado = { ...MARIA, id: 'g3', fullName: 'Luis' };

  const guardados: unknown[] = [];

  async function montarLista() {
    guardados.length = 0;
    const puerta: PuertaInvitados = {
      async listar() {
        return { ok: true, invitados: [MARIA, ANA, LUIS] };
      },
      async importar() {
        throw new Error('no se usa');
      },
      async guardar(datos) {
        guardados.push(datos);
        return { ok: true as const, id: 'nuevo', creado: true };
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
                  anadirAcompanante: 'Añadir acompañante',
                  familia: {
                    titulo: 'Mirando una familia',
                    verTodos: 'Ver toda la lista',
                    ver: 'Ver acompañantes',
                  },
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
    abrirDialogosEnPruebas();

    const fixture = TestBed.createComponent(Invitados);
    fixture.detectChanges();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
    return fixture;
  }

  const texto = (f: ComponentFixture<Invitados>) =>
    ((f.nativeElement as HTMLElement).querySelector('.lst')?.textContent ?? '').replace(
      /\s+/g,
      ' ',
    );

  /** Abre la fila de un invitado: los datos y las acciones están en el acordeón. */
  function abrir(f: ComponentFixture<Invitados>, nombre: string) {
    const fila = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.lst__fila')).find(
      (t) => t.querySelector('.lst__nombre')?.textContent?.trim() === nombre,
    );
    expect(fila, nombre).toBeTruthy();
    fila!.querySelector<HTMLButtonElement>('.lst__cabecera')!.click();
    f.detectChanges();
  }

  function pulsar(f: ComponentFixture<Invitados>, contiene: string) {
    const boton = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.includes(contiene),
    );
    expect(boton, contiene).toBeTruthy();
    boton!.click();
    f.detectChanges();
  }

  it('«Ver acompañantes» deja al titular y a los suyos, y «Ver toda la lista» lo devuelve todo', async () => {
    const f = await montarLista();
    expect(texto(f)).toContain('Luis');

    abrir(f, 'María');
    pulsar(f, 'Ver acompañantes');
    expect(texto(f)).toContain('María');
    expect(texto(f)).toContain('Ana');
    expect(texto(f)).not.toContain('Luis');
    expect((f.nativeElement as HTMLElement).textContent).toContain('Mirando una familia');

    pulsar(f, 'Ver toda la lista');
    expect(texto(f)).toContain('Luis');
  });

  it('desde el acompañante se llega a la misma familia', async () => {
    const f = await montarLista();

    abrir(f, 'Ana');
    pulsar(f, 'Ver acompañantes');
    expect(texto(f)).toContain('Ana');
    expect(texto(f)).not.toContain('Luis');
  });

  it('«Añadir acompañante» solo se ofrece a los titulares', async () => {
    const f = await montarLista();
    (f.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.lst__cabecera')
      .forEach((b) => b.click());
    f.detectChanges();
    const botones = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.lst__fila'))
      .filter((t) => t.textContent?.includes('Añadir acompañante'))
      .map((t) => t.querySelector('.lst__nombre')?.textContent?.trim());

    expect(botones).toEqual(['Luis', 'María']);
  });

  it('el alta desde un titular nace como su acompañante y se queda mirando la familia', async () => {
    const f = await montarLista();
    abrir(f, 'Luis');
    const tarjeta = Array.from(
      (f.nativeElement as HTMLElement).querySelectorAll('.lst__fila'),
    ).find((t) => t.querySelector('.lst__nombre')?.textContent?.trim() === 'Luis')!;
    const boton = Array.from(tarjeta.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Añadir acompañante'),
    )!;
    boton.click();
    f.detectChanges();

    const clase = f.componentInstance as unknown as {
      formulario: { patchValue(v: object): void };
      guardar(): Promise<void>;
    };
    clase.formulario.patchValue({ fullName: 'Marta' });
    await clase.guardar();
    f.detectChanges();

    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({ fullName: 'Marta', invitedById: 'g3' });
    expect((f.nativeElement as HTMLElement).textContent).toContain('Mirando una familia');
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
      nombres: () => [...raiz.querySelectorAll('.lst__nombre')].map((n) => n.textContent?.trim()),
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

/**
 * La lista en acordeón: una línea numerada por invitado, los datos y las
 * acciones al abrirla, y la posibilidad de ordenarla.
 */
describe('la lista, en acordeón y ordenable', () => {
  const ANA: Invitado = {
    ...INVITADO_DE_PRUEBA,
    id: 'a',
    fullName: 'Ana Viene',
    phone: '+34600111222',
    rsvpStatus: 'declined',
  };
  const BORJA: Invitado = {
    ...INVITADO_DE_PRUEBA,
    id: 'b',
    fullName: 'Borja Falta',
    phone: null,
    rsvpStatus: 'confirmed',
    notes: 'Alérgico a las nueces',
  };
  const CARLA: Invitado = {
    ...INVITADO_DE_PRUEBA,
    id: 'c',
    fullName: 'Carla Duda',
    phone: null,
    rsvpStatus: 'pending',
  };

  async function montar(
    invitados: readonly Invitado[] = [CARLA, ANA, BORJA],
    grupos?: Parameters<typeof gruposStoreFalso>[0],
  ) {
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
        { provide: GruposStore, useValue: gruposStoreFalso(grupos) },
      ],
    });
    const fixture = TestBed.createComponent(Invitados);
    fixture.detectChanges();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return {
      raiz,
      nombres: () => [...raiz.querySelectorAll('.lst__nombre')].map((n) => n.textContent?.trim()),
      numeros: () => [...raiz.querySelectorAll('.lst__num')].map((n) => n.textContent?.trim()),
      cabecera: (indice: number) =>
        raiz.querySelectorAll<HTMLButtonElement>('.lst__cabecera')[indice]!,
      cambiar: () => fixture.detectChanges(),
      ordenarPor(campo: string) {
        const select = raiz.querySelector<HTMLSelectElement>('.inv__orden select')!;
        select.value = campo;
        select.dispatchEvent(new Event('change'));
        fixture.detectChanges();
      },
      cambiarSentido() {
        raiz.querySelector<HTMLButtonElement>('.inv__orden button')!.click();
        fixture.detectChanges();
      },
    };
  }

  it('numera a los invitados según salen en la lista, de 1 a N', async () => {
    const p = await montar();
    expect(p.numeros()).toEqual(['1', '2', '3']);
    expect(p.nombres()).toEqual(['Ana Viene', 'Borja Falta', 'Carla Duda']);
  });

  it('cerrada, la fila no enseña datos ni acciones; abierta sí, y se vuelve a cerrar', async () => {
    const p = await montar();
    const cabecera = p.cabecera(0);

    expect(cabecera.getAttribute('aria-expanded')).toBe('false');
    expect(p.raiz.querySelector('.lst__detalle')).toBeNull();
    expect(p.raiz.textContent).not.toContain('600111222');

    cabecera.click();
    p.cambiar();
    expect(cabecera.getAttribute('aria-expanded')).toBe('true');
    const detalle = p.raiz.querySelector('.lst__detalle');
    expect(detalle?.textContent).toContain('600111222');
    expect(detalle?.querySelectorAll('.lst__acciones button').length).toBeGreaterThanOrEqual(4);
    expect(cabecera.getAttribute('aria-controls')).toBe(detalle?.id);

    cabecera.click();
    p.cambiar();
    expect(cabecera.getAttribute('aria-expanded')).toBe('false');
    expect(p.raiz.querySelector('.lst__detalle')).toBeNull();
  });

  it('se pueden tener abiertas varias a la vez, y «plegar todos» las cierra', async () => {
    const p = await montar();
    p.cabecera(0).click();
    p.cabecera(1).click();
    p.cambiar();
    expect(p.raiz.querySelectorAll('.lst__detalle')).toHaveLength(2);

    const plegar = [...p.raiz.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('plegarTodo'),
    )!;
    plegar.click();
    p.cambiar();
    expect(p.raiz.querySelectorAll('.lst__detalle')).toHaveLength(0);
  });

  it('ordena por respuesta, cambia el sentido y renumera sobre lo que se ve', async () => {
    const p = await montar();

    p.ordenarPor('estado');
    expect(p.nombres()).toEqual(['Borja Falta', 'Carla Duda', 'Ana Viene']);
    expect(p.numeros()).toEqual(['1', '2', '3']);

    p.cambiarSentido();
    expect(p.nombres()).toEqual(['Ana Viene', 'Carla Duda', 'Borja Falta']);
    expect(p.numeros()).toEqual(['1', '2', '3']);
  });

  it('al cambiar de criterio se vuelve al sentido ascendente', async () => {
    const p = await montar();
    p.cambiarSentido();
    expect(p.nombres()).toEqual(['Carla Duda', 'Borja Falta', 'Ana Viene']);

    p.ordenarPor('nombre');
    expect(p.nombres()).toEqual(['Ana Viene', 'Borja Falta', 'Carla Duda']);
  });

  it('ordena por grupo aunque todos estén también en el grupo general (oculto)', async () => {
    const general = {
      id: 'general',
      name: 'Invitados',
      photoAudience: 'public' as const,
      color: 'gris',
      order: 0,
      porDefecto: true,
    };
    const grupos = [
      general,
      { ...general, id: 'uni', name: 'Universidad', order: 1, porDefecto: false },
      { ...general, id: 'padel', name: 'Pádel', order: 2, porDefecto: false },
    ] as Parameters<typeof gruposStoreFalso>[0];

    // Alfabéticamente irían Ana, Borja, Carla; por grupo: Universidad, Pádel, ninguno.
    const p = await montar(
      [
        { ...CARLA, groupIds: ['general', 'uni'] },
        { ...ANA, groupIds: ['general'] },
        { ...BORJA, groupIds: ['general', 'padel'] },
      ],
      grupos,
    );
    p.ordenarPor('grupo');

    expect(p.nombres()).toEqual(['Carla Duda', 'Borja Falta', 'Ana Viene']);
  });
});
