import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CAMPOS_POR_TIPO,
  MAX_SECCIONES,
  MODULO_DE_SECCION,
  SECCIONES_INICIALES,
  conModulosActivos,
  sanearSecciones,
} from './secciones';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de las secciones', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./secciones.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/secciones/secciones.ts'),
    );
  });
});

describe('sanearSecciones', () => {
  it('deja pasar una lista correcta y renumera el orden', () => {
    const salida = sanearSecciones([
      { id: 'portada', type: 'portada', enabled: true, order: 0, fields: {} },
      {
        id: 'historia',
        type: 'texto',
        enabled: true,
        order: 7,
        fields: { titulo: 'Hola', texto: 'Qué tal' },
      },
    ]);

    expect(salida).toHaveLength(2);
    expect(salida[1]).toEqual({
      id: 'historia',
      type: 'texto',
      enabled: true,
      order: 1,
      fields: { titulo: 'Hola', texto: 'Qué tal' },
    });
  });

  /**
   * El test que justifica el fichero entero. `content` lo escribe la pareja y
   * la proyección la lee un anónimo: sin lista blanca, lo que se cuele aquí se
   * publica tal cual.
   */
  it('tira los campos que nadie ha declarado', () => {
    const salida = sanearSecciones([
      {
        id: 'historia',
        type: 'texto',
        enabled: true,
        order: 0,
        fields: { titulo: 'Hola', script: '<script>alert(1)</script>', telefonoInterno: '600' },
      },
    ]);

    expect(Object.keys(salida[0].fields).sort()).toEqual(['texto', 'titulo']);
    expect(JSON.stringify(salida)).not.toContain('600');
  });

  it('recorta los campos larguísimos', () => {
    const largo = 'a'.repeat(5000);
    const salida = sanearSecciones([
      {
        id: 'historia',
        type: 'texto',
        enabled: true,
        order: 0,
        fields: { titulo: largo, texto: largo },
      },
    ]);

    expect(salida[0].fields['titulo']).toHaveLength(CAMPOS_POR_TIPO.texto['titulo']);
    expect(salida[0].fields['texto']).toHaveLength(CAMPOS_POR_TIPO.texto['texto']);
  });

  it('descarta tipos e ids inventados', () => {
    const salida = sanearSecciones([
      { id: 'buena', type: 'texto', enabled: true, order: 0, fields: {} },
      { id: 'mala', type: 'iframe', enabled: true, order: 1, fields: {} },
      { id: '../../etc/passwd', type: 'texto', enabled: true, order: 2, fields: {} },
      { id: 'CON MAYÚSCULAS Y ESPACIOS', type: 'texto', enabled: true, order: 3, fields: {} },
      'ni siquiera es un objeto',
      null,
    ]);

    expect(salida.map((s) => s.id)).toEqual(['buena']);
  });

  it('no admite dos secciones con el mismo id', () => {
    const salida = sanearSecciones([
      { id: 'historia', type: 'texto', enabled: true, order: 0, fields: { titulo: 'Primera' } },
      { id: 'historia', type: 'texto', enabled: true, order: 1, fields: { titulo: 'Segunda' } },
    ]);

    expect(salida).toHaveLength(1);
    expect(salida[0].fields['titulo']).toBe('Primera');
  });

  it('pone un tope al número de secciones', () => {
    const muchas = Array.from({ length: 100 }, (_, n) => ({
      id: `s${n}`,
      type: 'texto',
      enabled: true,
      order: n,
      fields: {},
    }));

    expect(sanearSecciones(muchas)).toHaveLength(MAX_SECCIONES);
  });

  it('la portada no se puede apagar ni bajar del primer puesto', () => {
    const salida = sanearSecciones([
      { id: 'historia', type: 'texto', enabled: true, order: 0, fields: {} },
      { id: 'portada', type: 'portada', enabled: false, order: 99, fields: {} },
    ]);

    expect(salida[0].type).toBe('portada');
    expect(salida[0].enabled).toBe(true);
  });

  it('ante basura devuelve las secciones iniciales, no una página en blanco', () => {
    for (const basura of [null, undefined, 'texto', 42, {}, [], [null, 'x']]) {
      expect(sanearSecciones(basura)).toEqual(SECCIONES_INICIALES);
    }
  });

  it('las secciones iniciales sobreviven a su propio saneado', () => {
    // Si esto falla, una boda nace con secciones que la proyección tira.
    expect(sanearSecciones(SECCIONES_INICIALES)).toEqual(SECCIONES_INICIALES);
  });

  it('una boda nueva solo enseña la portada', () => {
    const encendidas = SECCIONES_INICIALES.filter((s) => s.enabled);
    expect(encendidas.map((s) => s.id)).toEqual(['portada']);
  });
});

describe('MODULO_DE_SECCION', () => {
  it('apunta a módulos que existen', async () => {
    const { MODULOS } = await import('./planes');
    for (const [tipo, modulo] of Object.entries(MODULO_DE_SECCION)) {
      expect(MODULOS as readonly string[], tipo).toContain(modulo);
    }
  });

  it('cada sección sembrada con módulo propio se va con él', () => {
    const sin = conModulosActivos(SECCIONES_INICIALES, () => false).map((s) => s.type);
    expect(sin.sort()).toEqual(['portada', 'texto']);
  });
});
