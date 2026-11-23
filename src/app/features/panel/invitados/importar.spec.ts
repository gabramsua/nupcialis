import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_INVITADOS,
  type DatosInvitado,
  type Importacion,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import { BodaStore } from '../boda.store';
import { bodaStoreFalso, gruposStoreFalso } from './dobles.testing';
import { GruposStore } from './grupos.store';
import { ImportarInvitados } from './importar';

/**
 * Lo que de verdad se puede equivocar en esta pantalla es **el mapeo**.
 *
 * El resto lo decide el servidor: qué entra, qué está repetido y qué está mal.
 * Aquí lo único que se hace es convertir celdas sueltas en campos con nombre, y
 * si esa conversión se equivoca el teléfono acaba en las notas de doscientos
 * invitados sin que ningún test de dominio se entere.
 *
 * Por eso estas pruebas miran lo que sale por la puerta, no lo que se pinta.
 */

const VACIA: Importacion = {
  filas: [],
  resumen: { nuevos: 0, duplicados: 0, invalidos: 0, sinSitio: 0 },
  gruposNuevos: [],
  importados: 0,
  previsualizacion: true,
};

interface Espia {
  readonly puerta: PuertaInvitados;
  readonly llamadas: { filas: readonly DatosInvitado[]; soloPrevisualizar: boolean }[];
}

function espiar(respuesta: Importacion = VACIA): Espia {
  const llamadas: Espia['llamadas'] = [];

  return {
    llamadas,
    puerta: {
      async listar() {
        return { ok: true, invitados: [] };
      },
      async importar(filas, opciones) {
        llamadas.push({ filas, soloPrevisualizar: opciones.soloPrevisualizar });
        return {
          ok: true,
          importacion: { ...respuesta, previsualizacion: opciones.soloPrevisualizar },
        };
      },
      async guardar() {
        return { ok: true, id: 'i1', creado: true };
      },
      async borrar() {
        return { ok: true };
      },
    },
  };
}

function montar(espia: Espia) {
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
      { provide: PUERTA_INVITADOS, useValue: espia.puerta },
      { provide: BodaStore, useValue: bodaStoreFalso() },
      { provide: GruposStore, useValue: gruposStoreFalso() },
    ],
  });

  const fixture = TestBed.createComponent(ImportarInvitados);
  fixture.detectChanges();
  // `protected` es una promesa del compilador, no del runtime: desde el test el
  // componente es un objeto normal. Se toca así para no exportar API de más.
  return fixture.componentInstance as unknown as {
    leerFilas(filas: readonly (readonly string[])[]): void;
    paso(): string;
    cabeceras(): readonly string[];
    mapeo(): readonly (string | null)[];
    cuantasFilas(): number;
    problemaLocal(): string | null;
    comprobar(): Promise<void>;
    importar(): Promise<void>;
    empezarDeCero(): void;
  };
}

/** Las filas tal y como las deja la lectura del Excel. */
const EXCEL = [
  ['Nombre y apellidos', 'Teléfono', 'Edad'],
  ['María José Pérez', '666123456', 'adulto'],
  ['Íñigo Muñoz', '+34677000111', 'niño'],
];

describe('al leer el Excel de la plantilla', () => {
  it('reconoce las columnas y deja fuera la cabecera', () => {
    const componente = montar(espiar());
    componente.leerFilas(EXCEL);

    expect(componente.paso()).toBe('mapeo');
    expect(componente.mapeo()).toEqual(['fullName', 'phone', 'ageGroup']);
    // Dos invitados, no tres: la cabecera no es un invitado.
    expect(componente.cuantasFilas()).toBe(2);
  });

  /** Sin cabeceras no hay forma de saber qué es cada columna, y adivinar daba errores. */
  it('sin la fila de cabeceras no es la plantilla y se rechaza', () => {
    const componente = montar(espiar());
    componente.leerFilas([
      ['María José Pérez', '666123456'],
      ['Íñigo Muñoz', '+34677000111'],
    ]);

    expect(componente.problemaLocal()).toBe('plantilla');
    expect(componente.paso()).toBe('origen');
  });

  it('con cabeceras pero sin la del nombre, tampoco', () => {
    const componente = montar(espiar());
    componente.leerFilas([['Teléfono'], ['666123456']]);

    expect(componente.problemaLocal()).toBe('plantilla');
  });

  it('un Excel vacío lo dice en vez de quedarse quieto', () => {
    const componente = montar(espiar());
    componente.leerFilas([]);

    expect(componente.problemaLocal()).toBe('vacio');
    expect(componente.paso()).toBe('origen');
  });
});

describe('al mandar las filas', () => {
  it('manda los campos con nombre, no las celdas, y ya sin cupo de acompañantes', async () => {
    const espia = espiar();
    const componente = montar(espia);

    componente.leerFilas(EXCEL);
    await componente.comprobar();

    expect(espia.llamadas[0].soloPrevisualizar).toBe(true);
    expect(espia.llamadas[0].filas).toEqual([
      { fullName: 'María José Pérez', phone: '666123456', ageGroup: 'adult' },
      { fullName: 'Íñigo Muñoz', phone: '+34677000111', ageGroup: 'child' },
    ]);
  });

  it('entiende «niño» y «bebé» escritos como los escribe la gente', async () => {
    const espia = espiar();
    const componente = montar(espia);

    componente.leerFilas([
      ['Nombre', 'Edad'],
      ['Ana', 'Niño'],
      ['Leo', 'bebe'],
      ['Sara', 'adulto'],
    ]);
    await componente.comprobar();

    expect(espia.llamadas[0].filas.map((f) => f.ageGroup)).toEqual(['child', 'baby', 'adult']);
  });

  it('la previsualización y la importación son la misma llamada con la bandera cambiada', async () => {
    const espia = espiar();
    const componente = montar(espia);

    componente.leerFilas(EXCEL);
    await componente.comprobar();
    await componente.importar();

    expect(espia.llamadas).toHaveLength(2);
    expect(espia.llamadas[0].filas).toEqual(espia.llamadas[1].filas);
    expect(espia.llamadas[1].soloPrevisualizar).toBe(false);
  });
});
