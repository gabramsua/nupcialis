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
      async cupoEnLote() {
        return { ok: true as const, cambiados: 0, omitidos: 0 };
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
    leer(texto: string): void;
    paso(): string;
    cabeceras(): readonly string[];
    mapeo(): readonly (string | null)[];
    cuantasFilas(): number;
    tieneNombre(): boolean;
    avisoAcentos(): boolean;
    problemaLocal(): string | null;
    comprobar(): Promise<void>;
    importar(): Promise<void>;
    cambiarMapeo(indice: number, evento: Event): void;
    empezarDeCero(): void;
  };
}

/** Un `change` de un `<select>` sin montar un `<select>` de verdad. */
function eligiendo(valor: string): Event {
  return { target: { value: valor } } as unknown as Event;
}

const PEGADO_DE_EXCEL = [
  'Nombre y apellidos\tTeléfono\tAcompañantes',
  'María José Pérez\t666123456\t1',
  'Íñigo Muñoz\t+34677000111\t0',
].join('\n');

describe('al leer lo que la pareja pega', () => {
  it('reconoce las columnas y deja fuera la cabecera', () => {
    const componente = montar(espiar());
    componente.leer(PEGADO_DE_EXCEL);

    expect(componente.paso()).toBe('mapeo');
    expect(componente.mapeo()).toEqual(['fullName', 'phone', 'maxCompanions']);
    // Dos invitados, no tres: la cabecera no es un invitado.
    expect(componente.cuantasFilas()).toBe(2);
  });

  it('sin cabecera reconocible, no se inventa que la primera fila sobra', () => {
    const componente = montar(espiar());
    componente.leer('María José Pérez;666123456\nÍñigo Muñoz;+34677000111');

    expect(componente.cuantasFilas()).toBe(2);
  });

  it('un pegado vacío lo dice en vez de quedarse quieto', () => {
    const componente = montar(espiar());
    componente.leer('   ');

    expect(componente.problemaLocal()).toBe('vacio');
    expect(componente.paso()).toBe('origen');
  });

  it('avisa cuando el fichero llega con los acentos rotos', () => {
    const componente = montar(espiar());
    componente.leer('Nombre\nMarÃ­a JosÃ© PÃ©rez');

    expect(componente.avisoAcentos()).toBe(true);
  });
});

describe('al mandar las filas', () => {
  it('manda los campos con nombre, no las celdas', async () => {
    const espia = espiar();
    const componente = montar(espia);

    componente.leer(PEGADO_DE_EXCEL);
    await componente.comprobar();

    expect(espia.llamadas[0].soloPrevisualizar).toBe(true);
    expect(espia.llamadas[0].filas).toEqual([
      { fullName: 'María José Pérez', phone: '666123456', maxCompanions: 1 },
      { fullName: 'Íñigo Muñoz', phone: '+34677000111', maxCompanions: 0 },
    ]);
  });

  it('el acompañante llega como número; «uno» escrito a mano no rompe nada', async () => {
    const espia = espiar();
    const componente = montar(espia);

    componente.leer('Nombre\tAcompañantes\nAna\tdos');
    await componente.comprobar();

    expect(espia.llamadas[0].filas[0].maxCompanions).toBe(0);
  });

  it('entiende «niño» y «bebé» escritos como los escribe la gente', async () => {
    const espia = espiar();
    const componente = montar(espia);

    componente.leer('Nombre\tEdad\nAna\tNiño\nLeo\tbebe\nSara\tadulto');
    await componente.comprobar();

    expect(espia.llamadas[0].filas.map((f) => f.ageGroup)).toEqual(['child', 'baby', 'adult']);
  });

  it('la previsualización y la importación son la misma llamada con la bandera cambiada', async () => {
    const espia = espiar();
    const componente = montar(espia);

    componente.leer(PEGADO_DE_EXCEL);
    await componente.comprobar();
    await componente.importar();

    expect(espia.llamadas).toHaveLength(2);
    expect(espia.llamadas[0].filas).toEqual(espia.llamadas[1].filas);
    expect(espia.llamadas[1].soloPrevisualizar).toBe(false);
  });
});

describe('al cambiar el mapeo a mano', () => {
  it('soltar una columna deja de mandar ese campo', async () => {
    const espia = espiar();
    const componente = montar(espia);

    componente.leer(PEGADO_DE_EXCEL);
    componente.cambiarMapeo(1, eligiendo(''));
    await componente.comprobar();

    expect(espia.llamadas[0].filas[0]).toEqual({
      fullName: 'María José Pérez',
      maxCompanions: 1,
    });
  });

  it('asignar una columna que ya estaba puesta la suelta de donde estaba', () => {
    const componente = montar(espiar());

    componente.leer(PEGADO_DE_EXCEL);
    componente.cambiarMapeo(2, eligiendo('phone'));

    // Nunca dos veces el mismo campo: el segundo pisaría al primero en silencio.
    expect(componente.mapeo()).toEqual(['fullName', null, 'phone']);
  });

  it('sin nombre no se deja continuar: es lo único imprescindible', () => {
    const componente = montar(espiar());

    componente.leer(PEGADO_DE_EXCEL);
    expect(componente.tieneNombre()).toBe(true);

    componente.cambiarMapeo(0, eligiendo(''));
    expect(componente.tieneNombre()).toBe(false);
  });
});
