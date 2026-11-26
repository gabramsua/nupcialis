import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_INVITADOS,
  type Importacion,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import { BodaStore } from '../boda.store';
import { bodaStoreFalso, gruposStoreFalso } from './dobles.testing';
import { GruposStore } from './grupos.store';
import { ImportarInvitados } from './importar';

/**
 * Los tres pasos, con el diccionario de verdad, mirando lo que se lee.
 *
 * El humo del panel monta con un diccionario vacío: comprueba que la pantalla
 * no revienta, no que diga algo. Aquí se carga el **mismo `es.json` que sirve
 * la aplicación** y se recorren los tres pasos leyendo el texto renderizado,
 * que es lo que va a ver la pareja.
 *
 * Que no falte ninguna clave lo comprueba `src/app/i18n.spec.ts`, en frío y
 * para todas las pantallas. Aquí se mira otra cosa: que los pasos avanzan, que
 * los números entran en su hueco y que cada estado se cuenta con palabras.
 */
const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const IMPORTACION: Importacion = {
  filas: [
    {
      fila: 2,
      nombre: 'Íñigo Muñoz',
      estado: 'duplicado',
      motivos: [],
      duplicadoDe: 'g1',
      motivoDuplicado: 'telefono',
    },
    {
      fila: 3,
      nombre: 'Sin teléfono',
      estado: 'invalido',
      motivos: [{ campo: 'phone', motivo: 'no-es-telefono' }],
      duplicadoDe: '',
      motivoDuplicado: null,
    },
    {
      fila: 4,
      nombre: '',
      estado: 'sin-sitio',
      motivos: [],
      duplicadoDe: '',
      motivoDuplicado: null,
    },
  ],
  resumen: { nuevos: 1, duplicados: 1, invalidos: 1, sinSitio: 1 },
  gruposNuevos: [],
  importados: 0,
  previsualizacion: true,
};

const PUERTA: PuertaInvitados = {
  async listar() {
    return { ok: true, invitados: [] };
  },
  async importar(_filas, opciones) {
    return {
      ok: true,
      importacion: {
        ...IMPORTACION,
        previsualizacion: opciones.soloPrevisualizar,
        importados: opciones.soloPrevisualizar ? 0 : 1,
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

function montar() {
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
      { provide: PUERTA_INVITADOS, useValue: PUERTA },
      { provide: BodaStore, useValue: bodaStoreFalso() },
      { provide: GruposStore, useValue: gruposStoreFalso() },
    ],
  });

  const fixture = TestBed.createComponent(ImportarInvitados);
  fixture.detectChanges();

  return {
    fixture,
    componente: fixture.componentInstance as unknown as {
      leerFilas(filas: readonly (readonly string[])[]): void;
      comprobar(): Promise<void>;
      importar(): Promise<void>;
    },
    texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '',
  };
}

/** «A\tB\nC\tD» → filas de celdas, como las dejaría la lectura del Excel. */
function filas(texto: string): string[][] {
  return texto.split('\n').map((fila) => fila.split('\t'));
}

describe('los textos de la pantalla de importar', () => {
  it('el primer paso explica los tres pasos y solo habla de Excel', () => {
    const { texto } = montar();

    expect(texto()).toContain('Descargar plantilla');
    expect(texto()).toContain('Elegir el Excel');
    // Ya no hay otros caminos: ni CSV que subir ni celdas que pegar.
    expect(texto()).not.toContain('pegar');
    expect(texto()).not.toContain('Continuar');
  });

  it('el paso de columnas enseña qué se ha entendido de cada una', () => {
    const { componente, fixture } = montar();

    componente.leerFilas(
      filas('Nombre y apellidos\tTeléfono\tLo que sea\nMaría José Pérez\t666123456\tx'),
    );
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Nombre y apellidos');
    expect(texto).toContain('Teléfono');
    // La que no encaja se dice, no se importa a ciegas.
    expect(texto).toContain('Se ignora');
    expect((fixture.nativeElement as HTMLElement).querySelector('select')).toBeNull();
  });

  it('el paso de columnas dice cuántas filas se han leído', () => {
    const { componente, fixture, texto } = montar();

    componente.leerFilas(filas('Nombre y apellidos\tTeléfono\nMaría José Pérez\t666123456'));
    fixture.detectChanges();

    // La interpolación del contador tiene que haber entrado: si la clave
    // llegara cruda, aquí se leería «{{n}} filas leídas».
    expect(texto()).toContain('1 filas leídas');
    expect(texto()).not.toContain('{{');
  });

  it('el resultado nombra cada estado con palabras, no con el código', async () => {
    const { componente, fixture, texto } = montar();

    componente.leerFilas(filas('Nombre y apellidos\tTeléfono\nMaría José Pérez\t666123456'));
    await componente.comprobar();
    fixture.detectChanges();

    // Que se vea que todavía no se ha escrito nada es media pantalla: sin
    // esto, la pareja cree que ya está importado y se va.
    expect(texto()).toContain('Todavía no se ha guardado nada');

    // Cada fila problemática, con su estado en palabras y su nombre, para
    // poder buscarla en la hoja.
    expect(texto()).toContain('Ya está en la lista');
    expect(texto()).toContain('Íñigo Muñoz');
    expect(texto()).toContain('Tiene errores');
    // Y el motivo concreto, no un «error» genérico.
    expect(texto()).toContain('Ese teléfono no se entiende');
    // La fila sin nombre se señala igual: es la única forma de encontrarla.
    expect(texto()).toContain('Fila 4');
    expect(texto()).toContain('Sin nombre');
  });

  it('al importar de verdad dice cuántos han entrado', async () => {
    const { componente, fixture, texto } = montar();

    componente.leerFilas(filas('Nombre y apellidos\tTeléfono\nMaría José Pérez\t666123456'));
    await componente.comprobar();
    await componente.importar();
    fixture.detectChanges();

    expect(texto()).toContain('Se han añadido 1 invitados');
  });

  it('un Excel que no es la plantilla se rechaza y dice qué hacer', () => {
    const { componente, fixture, texto } = montar();

    componente.leerFilas(filas('María José Pérez\t666123456\nÍñigo Muñoz\t+34677000111'));
    fixture.detectChanges();

    expect(texto()).toContain('no es nuestra plantilla');
    expect(texto()).toContain('Descargad la plantilla');
  });

  it('un fichero de más de mil filas se para antes de mandarlo', () => {
    const { componente, fixture, texto } = montar();

    const muchas = [
      'Nombre y apellidos',
      ...Array.from({ length: 1001 }, (_, i) => `Invitado ${i}`),
    ];
    componente.leerFilas(filas(muchas.join('\n')));
    fixture.detectChanges();

    expect(texto()).toContain('1002');
    expect(texto()).toContain('1000');
  });
});
