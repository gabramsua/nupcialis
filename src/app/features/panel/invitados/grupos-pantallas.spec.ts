import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PUERTA_INVITADOS,
  type DatosInvitado,
  type Importacion,
  type Invitado,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { PUERTA_RESPUESTAS } from '../../../core/rsvp/respuestas-gateway';
import { BodaStore } from '../boda.store';
import {
  GRUPOS_DE_PRUEBA,
  INVITADO_DE_PRUEBA,
  abrirDialogosEnPruebas,
  bodaStoreFalso,
  gruposStoreFalso,
} from './dobles.testing';
import { Grupos } from './grupos';
import { GruposStore } from './grupos.store';
import { ImportarInvitados } from './importar';
import { Invitados } from './invitados';

/**
 * Los grupos, mirados como los ve la pareja: en el DOM y con el diccionario de
 * verdad.
 *
 * La lección de la importación fue que un modelo correcto no garantiza una
 * pantalla correcta —los desplegables enseñaban otra cosa que la señal—, así
 * que aquí se lee lo que está marcado en los `<input>`, no el estado interno.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const ANA: Invitado = {
  ...INVITADO_DE_PRUEBA,
  id: 'ana',
  fullName: 'Ana Ruiz',
  nickname: 'Anita',
  side: 'B',
  ageGroup: 'child',
  groupIds: ['uni', 'familia'],
};

const PUERTA_RESPUESTAS_FALSA = {
  async leer() {
    return { ok: true as const, datos: { preguntas: [], invitados: [] } };
  },
};

function puerta(invitados: readonly Invitado[] = [ANA]) {
  const guardados: DatosInvitado[] = [];
  const importados: { filas: readonly DatosInvitado[]; solo: boolean }[] = [];
  let respuestaImportar: Importacion = {
    filas: [],
    resumen: { nuevos: 1, duplicados: 0, invalidos: 0, sinSitio: 0 },
    gruposNuevos: ['Primos'],
    importados: 0,
    previsualizacion: true,
  };

  const p: PuertaInvitados = {
    async listar() {
      return { ok: true, invitados };
    },
    async importar(filas, opciones) {
      importados.push({ filas, solo: opciones.soloPrevisualizar });
      return {
        ok: true,
        importacion: {
          ...respuestaImportar,
          previsualizacion: opciones.soloPrevisualizar,
          importados: opciones.soloPrevisualizar ? 0 : 1,
        },
      };
    },
    async guardar(datos) {
      guardados.push(datos);
      return { ok: true, id: 'ana', creado: false };
    },
    async cupoEnLote() {
      return { ok: true as const, cambiados: 0, omitidos: 0 };
    },
    async borrar() {
      return { ok: true };
    },
  };

  return {
    p,
    guardados,
    importados,
    sinGruposNuevos() {
      respuestaImportar = { ...respuestaImportar, gruposNuevos: [] };
    },
  };
}

function configurar(p: PuertaInvitados, grupos = gruposStoreFalso()) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      provideRouter([]),
      { provide: PUERTA_RESPUESTAS, useValue: PUERTA_RESPUESTAS_FALSA },
      { provide: PUERTA_INVITADOS, useValue: p },
      { provide: BodaStore, useValue: bodaStoreFalso() },
      { provide: GruposStore, useValue: grupos },
    ],
  });
  return grupos;
}

async function asentar(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Los `<input>` marcados dentro del modal, por el texto de su etiqueta. */
function marcados(raiz: HTMLElement): string[] {
  return [...raiz.querySelectorAll<HTMLInputElement>('np-modal input:checked')].map(
    (i) => i.closest('label')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
}

describe('ordenar los grupos (F1.3c)', () => {
  /**
   * Por orden de creación, «Familia» acababa la sexta aunque sea la que más
   * se usa, y esa lista se mira cada vez que se da de alta a alguien.
   */
  it('bajar un grupo lo mueve y guarda el orden entero', async () => {
    const { p } = puerta();
    const grupos = configurar(p);
    const fixture = TestBed.createComponent(Grupos);
    await asentar(fixture);
    const raiz = fixture.nativeElement as HTMLElement;

    const bajarElPrimero = raiz.querySelector<HTMLButtonElement>(
      'button[aria-label="Bajar Universidad"]',
    )!;
    bajarElPrimero.click();
    await asentar(fixture);

    expect(grupos.ordenes).toEqual([['padel', 'uni', 'familia']]);
  });

  /** Subir al primero no lleva a ninguna parte: el botón está apagado. */
  it('el primero no se puede subir ni el último bajar', async () => {
    const { p } = puerta();
    configurar(p);
    const fixture = TestBed.createComponent(Grupos);
    await asentar(fixture);
    const raiz = fixture.nativeElement as HTMLElement;

    expect(
      raiz.querySelector<HTMLButtonElement>('button[aria-label="Subir Universidad"]')?.disabled,
    ).toBe(true);
    expect(
      raiz.querySelector<HTMLButtonElement>('button[aria-label="Bajar Familia"]')?.disabled,
    ).toBe(true);
  });
});

describe('la lista de invitados, con grupos', () => {
  it('cada tarjeta enseña sus grupos por nombre', async () => {
    const { p } = puerta();
    configurar(p);
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);

    // Solo la tarjeta: los nombres de todos los grupos salen además arriba,
    // en la fila que filtra por grupo.
    const tarjeta =
      (fixture.nativeElement as HTMLElement).querySelector('.inv__tarjeta')?.textContent ?? '';
    expect(tarjeta).toContain('Universidad');
    expect(tarjeta).toContain('Familia');
    // Pádel existe pero Ana no está en él.
    expect(tarjeta).not.toContain('Pádel');
  });

  /**
   * Filtrar por grupo (F1.3b).
   *
   * Con doscientos invitados, la lista entera no sirve para nada concreto: lo
   * que se mira es «los primos», «los del trabajo». Y se cruza con la cifra de
   * arriba a propósito: «pendientes» + «Primos» es la lista con la que la
   * pareja se pone a llamar por teléfono.
   */
  it('al pulsar un grupo, la lista se queda con los suyos', async () => {
    const BORJA: Invitado = {
      ...INVITADO_DE_PRUEBA,
      id: 'borja',
      fullName: 'Borja Gil',
      groupIds: ['padel'],
    };
    const { p } = puerta([ANA, BORJA]);
    configurar(p);
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);
    const raiz = fixture.nativeElement as HTMLElement;

    const nombres = () =>
      [...raiz.querySelectorAll('.inv__nombre')].map((n) => n.textContent?.trim() ?? '');

    expect(nombres()).toEqual(['Ana Ruiz', 'Borja Gil']);

    const padel = [...raiz.querySelectorAll<HTMLButtonElement>('.filtro button')].find((b) =>
      b.textContent?.includes('Pádel'),
    )!;
    padel.click();
    await asentar(fixture);

    expect(nombres()).toEqual(['Borja Gil']);
    expect(padel.getAttribute('aria-pressed')).toBe('true');

    // Pulsarlo otra vez lo quita, igual que las cifras de arriba.
    padel.click();
    await asentar(fixture);

    expect(nombres()).toEqual(['Ana Ruiz', 'Borja Gil']);
  });

  /**
   * El número del chip cuenta **dentro de lo que ya está filtrado arriba**. Si
   * no, con «pendientes» puesto se vería «Pádel 40» y al pulsarlo saldrían
   * seis, y no habría forma de saber cuál de los dos números miente.
   */
  it('el número de cada grupo respeta la cifra que esté puesta', async () => {
    const CONFIRMADO: Invitado = {
      ...INVITADO_DE_PRUEBA,
      id: 'borja',
      fullName: 'Borja Gil',
      groupIds: ['padel'],
      rsvpStatus: 'confirmed',
    };
    const PENDIENTE: Invitado = {
      ...INVITADO_DE_PRUEBA,
      id: 'carmen',
      fullName: 'Carmen Díaz',
      groupIds: ['padel'],
      rsvpStatus: 'pending',
    };
    const { p } = puerta([CONFIRMADO, PENDIENTE]);
    configurar(p);
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);
    const raiz = fixture.nativeElement as HTMLElement;

    const cuantosEnPadel = () =>
      [...raiz.querySelectorAll<HTMLButtonElement>('.filtro button')]
        .find((b) => b.textContent?.includes('Pádel'))
        ?.querySelector('.filtro__cuantos')?.textContent;

    expect(cuantosEnPadel()).toBe('2');

    const pendientes = [...raiz.querySelectorAll<HTMLButtonElement>('.inv__cifra')].find((b) =>
      b.textContent?.includes('Sin contestar'),
    )!;
    pendientes.click();
    await asentar(fixture);

    expect(cuantosEnPadel()).toBe('1');
  });

  /**
   * El aviso de que alguien ha apuntado a alguien (F1.5c).
   *
   * Antes esto solo se veía mirando la lista con atención: un acompañante
   * nuevo no se distingue de los doscientos que ya estaban.
   */
  it('avisa de los acompañantes que han apuntado los invitados esta semana', async () => {
    const AYER = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const NUEVA: Invitado = {
      ...INVITADO_DE_PRUEBA,
      id: 'eva',
      fullName: 'Eva Mora',
      isCompanion: true,
      invitedById: 'ana',
      apuntadoPorInvitado: true,
      altaEn: AYER,
    };
    const { p } = puerta([ANA, NUEVA]);
    configurar(p);
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);
    const raiz = fixture.nativeElement as HTMLElement;
    const texto = () => raiz.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(texto()).toContain('han apuntado a alguien esta semana');
    expect(texto()).toContain('Eva Mora');

    // Y el botón del aviso deja la lista con ellos.
    const verlos = [...raiz.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('Ver quiénes son'),
    )!;
    verlos.click();
    await asentar(fixture);

    expect([...raiz.querySelectorAll('.inv__nombre')].map((n) => n.textContent?.trim())).toEqual([
      'Eva Mora',
    ]);
  });

  /** Un acompañante de hace dos meses no es una novedad. */
  it('no avisa de los de hace tiempo', async () => {
    const HACE_UN_MES = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const VIEJA: Invitado = {
      ...INVITADO_DE_PRUEBA,
      id: 'eva',
      fullName: 'Eva Mora',
      isCompanion: true,
      apuntadoPorInvitado: true,
      altaEn: HACE_UN_MES,
    };
    const { p } = puerta([ANA, VIEJA]);
    configurar(p);
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'han apuntado a alguien esta semana',
    );
    // Pero la cifra sigue estando, para poder verlos cuando se quiera.
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Los han apuntado');
  });

  /**
   * El cupo en lote (F1.5b), que es lo que hace útil al filtro por grupo:
   * «los amigos, uno cada uno» son dos clics en vez de cuarenta fichas.
   */
  it('pone el cupo solo a los que se están viendo, y no a los acompañantes', async () => {
    const AMIGO: Invitado = {
      ...INVITADO_DE_PRUEBA,
      id: 'borja',
      fullName: 'Borja Gil',
      groupIds: ['padel'],
    };
    const SU_PAREJA: Invitado = {
      ...INVITADO_DE_PRUEBA,
      id: 'eva',
      fullName: 'Eva Mora',
      groupIds: ['padel'],
      isCompanion: true,
      invitedById: 'borja',
    };
    const { p } = puerta([ANA, AMIGO, SU_PAREJA]);
    const lotes: { ids: readonly string[]; cupo: number }[] = [];
    const conCupo = {
      ...p,
      async cupoEnLote(guestIds: readonly string[], maxCompanions: number) {
        lotes.push({ ids: guestIds, cupo: maxCompanions });
        return { ok: true as const, cambiados: guestIds.length, omitidos: 0 };
      },
    };
    configurar(conCupo);
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);
    const raiz = fixture.nativeElement as HTMLElement;

    // Filtrar por «Pádel»: Ana se queda fuera, y Eva es acompañante.
    const padel = [...raiz.querySelectorAll<HTMLButtonElement>('.filtro button')].find((b) =>
      b.textContent?.includes('Pádel'),
    )!;
    padel.click();
    await asentar(fixture);

    const aplicar = [...raiz.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('Poner cupo'),
    )!;
    // Dice a cuántos va a afectar antes de pulsarlo: ese es el aviso.
    expect(aplicar.textContent).toContain('1 invitados');

    aplicar.click();
    await asentar(fixture);

    expect(lotes).toEqual([{ ids: ['borja'], cupo: 1 }]);
  });

  /**
   * El fallo que se encontró al hacer esto: el formulario no llevaba el mote,
   * la edad ni los grupos, y `upsertGuest` sobrescribe lo que valida. Editar
   * el teléfono de una niña importada la convertía en adulta, le quitaba el
   * mote y la sacaba de sus grupos.
   */
  it('editar sin tocar nada guarda lo mismo que había: mote, edad, lado y grupos', async () => {
    const { p, guardados } = puerta();
    configurar(p);
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);

    const c = fixture.componentInstance as unknown as {
      editar(i: Invitado): void;
      guardar(): Promise<void>;
    };
    c.editar(ANA);
    fixture.detectChanges();

    // Lo que ve la pareja en el formulario, no lo que hay en la señal.
    const raiz = fixture.nativeElement as HTMLElement;
    expect(marcados(raiz)).toEqual(['De Gabriel', 'Niño', 'Universidad', 'Familia']);

    await c.guardar();

    expect(guardados[0]).toMatchObject({
      id: 'ana',
      nickname: 'Anita',
      side: 'B',
      ageGroup: 'child',
      groupIds: ['uni', 'familia'],
    });
  });

  it('marcar dos grupos con candado avisa y no deja guardar', async () => {
    const { p } = puerta();
    configurar(p);
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);

    const c = fixture.componentInstance as unknown as {
      editar(i: Invitado): void;
      alternarGrupo(id: string): void;
    };
    c.editar(ANA);
    c.alternarGrupo('padel');
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Solo puede estar en un grupo con candado');

    const guardar = [...raiz.querySelectorAll<HTMLButtonElement>('np-modal button')].find((b) =>
      b.textContent?.includes('Guardar'),
    );
    expect(guardar?.hasAttribute('disabled')).toBe(true);
  });
});

describe('la pantalla de grupos', () => {
  it('cada grupo con su número de invitados y, si lo tiene, su candado explicado', async () => {
    const { p } = puerta();
    configurar(p);
    const fixture = TestBed.createComponent(Grupos);
    await asentar(fixture);

    const tarjetas = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.gru__tarjeta'),
    ].map((t) => t.textContent?.replace(/\s+/g, ' ') ?? '');

    expect(tarjetas[0]).toContain('Universidad');
    // En singular, y con su espacio: se leía «1invitados».
    expect(tarjetas[0]).toContain('1 invitado ');
    expect(tarjetas[0]).toContain('Sus fotos solo las ve el grupo');
    // El grupo ya no tiene lado (D-47): no se enseña de quién es.
    expect(tarjetas[0]).not.toContain('De María');

    expect(tarjetas[1]).toContain('0 invitados');

    // Familia es pública: ni candado ni texto de candado.
    expect(tarjetas[2]).not.toContain('Sus fotos solo las ve el grupo');
    expect(tarjetas[2]).not.toContain('De los dos');
  });

  it('al editar, el formulario enseña marcado lo que el grupo tiene', async () => {
    const { p } = puerta();
    const grupos = configurar(p);
    const fixture = TestBed.createComponent(Grupos);
    await asentar(fixture);

    const c = fixture.componentInstance as unknown as { editar(g: unknown): void };
    c.editar(grupos.grupos()[1]);
    fixture.detectChanges();

    expect(marcados(fixture.nativeElement as HTMLElement)).toEqual([
      'Azul',
      expect.stringContaining('Solo para el grupo'),
    ]);
  });

  it('un grupo nuevo empieza en un color que no usa nadie', async () => {
    const { p } = puerta();
    configurar(p);
    const fixture = TestBed.createComponent(Grupos);
    await asentar(fixture);

    const c = fixture.componentInstance as unknown as { nuevo(): void };
    c.nuevo();
    fixture.detectChanges();

    // Rosa, azul y verde están cogidos.
    expect(marcados(fixture.nativeElement as HTMLElement)[0]).toBe('Coral');
  });
});

describe('importar con grupos y lado', () => {
  async function importando(texto: string, opciones: { sinGruposNuevos?: boolean } = {}) {
    const doble = puerta();
    if (opciones.sinGruposNuevos) doble.sinGruposNuevos();
    const grupos = configurar(doble.p);
    const fixture = TestBed.createComponent(ImportarInvitados);
    fixture.detectChanges();

    const c = fixture.componentInstance as unknown as {
      leer(t: string): void;
      comprobar(): Promise<void>;
      importar(): Promise<void>;
    };
    c.leer(texto);
    await c.comprobar();
    fixture.detectChanges();

    return { ...doble, grupos, fixture, c };
  }

  it('los grupos viajan por nombre y el lado con el nombre de la pareja ya resuelto', async () => {
    const { importados } = await importando(
      'Nombre;Grupos;De quién\nAna;Universidad, Primos;Gabriel\nLeo;;',
    );

    expect(importados[0].filas).toEqual([
      { fullName: 'Ana', groupNames: ['Universidad', 'Primos'], side: 'B' },
      // Sin lado escrito no se manda: el servidor pone el suyo.
      { fullName: 'Leo', groupNames: [] },
    ]);
  });

  it('antes de importar, anuncia con sus nombres los grupos que se van a crear', async () => {
    const { fixture } = await importando('Nombre;Grupos\nAna;Primos');

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Se crearán 1 grupo(s) nuevo(s)');
    expect(texto).toContain('Primos');
  });

  it('después de importar recarga los grupos, para que el resto del panel los vea', async () => {
    const { grupos, c } = await importando('Nombre;Grupos\nAna;Primos');
    const antes = grupos.cargas.veces;

    await c.importar();

    expect(grupos.cargas.veces).toBe(antes + 1);
  });

  it('si no se ha creado ningún grupo, no recarga por nada', async () => {
    const { grupos, c } = await importando('Nombre\nAna', { sinGruposNuevos: true });
    const antes = grupos.cargas.veces;

    await c.importar();

    expect(grupos.cargas.veces).toBe(antes);
  });
});

describe('el grupo de todos (D-31)', () => {
  const TODOS = {
    id: 'todos',
    name: 'Invitados',
    photoAudience: 'public' as const,
    color: 'rosa' as const,
    order: -1,
    porDefecto: true,
  };
  const CON_TODOS = [TODOS, ...GRUPOS_DE_PRUEBA];

  it('no ofrece borrarlo, y dice para qué está', async () => {
    const { p } = puerta();
    configurar(p, gruposStoreFalso(CON_TODOS));
    const fixture = TestBed.createComponent(Grupos);
    await asentar(fixture);

    const [todos, uni] = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.gru__tarjeta'),
    ].map((t) => t.textContent?.replace(/\s+/g, ' ') ?? '');

    expect(todos).toContain('Todos los invitados nuevos entran aquí');
    expect(todos).not.toContain('Eliminar');
    // Los demás sí se pueden borrar.
    expect(uni).toContain('Eliminar');
  });

  it('al editarlo no ofrece ponerle candado', async () => {
    const { p } = puerta();
    configurar(p, gruposStoreFalso(CON_TODOS));
    const fixture = TestBed.createComponent(Grupos);
    await asentar(fixture);

    const c = fixture.componentInstance as unknown as { editar(g: unknown): void };
    c.editar(TODOS);
    fixture.detectChanges();

    const modal = (fixture.nativeElement as HTMLElement).querySelector('np-modal');
    expect(modal?.querySelector('input[value="restricted"]')).toBeNull();
    expect(modal?.textContent).toContain('No puede llevar candado');
  });

  it('un invitado nuevo sale ya marcado en él', async () => {
    const { p } = puerta();
    configurar(p, gruposStoreFalso(CON_TODOS));
    const fixture = TestBed.createComponent(Invitados);
    await asentar(fixture);

    (fixture.componentInstance as unknown as { nuevo(): void }).nuevo();
    fixture.detectChanges();

    expect(marcados(fixture.nativeElement as HTMLElement)).toContain('Invitados');
  });
});
