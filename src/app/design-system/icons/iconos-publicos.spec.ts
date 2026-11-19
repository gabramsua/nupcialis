import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ICONOS_FAQ } from '../../features/public-site/faqs/faqs';
import { ICONOS_HITO } from '../../features/public-site/cronologia/cronologia';

/**
 * Que ningún icono de la web pública falte en el sprite público.
 *
 * Esto existe por un fallo real: `link-simple` se usaba en la ficha de un
 * alojamiento —el enlace «Ver la web»— y estaba marcado **solo para el
 * panel**. El resultado no era un error en consola ni un test en rojo: era un
 * hueco en blanco donde tenía que haber un icono, en la web que abren los
 * invitados, y se descubrió mirando una captura.
 *
 * Los dos sprites existen porque el de la web pública se descarga con datos
 * móviles y no tiene por qué llevar los 107 iconos del panel. El precio de esa
 * decisión es este fichero.
 */

const ICONOS = JSON.parse(readFileSync('src/app/design-system/icons/icons.json', 'utf8')) as Record<
  string,
  Record<string, { iconos: { id: string; surfaces: string[] }[] }>
>;

/** Los que están en el sprite que descarga el invitado. */
const EN_PUBLICO = new Set(
  Object.values(ICONOS['categorias'] ?? {})
    .flatMap((categoria) => categoria.iconos)
    .filter((icono) => icono.surfaces.includes('public'))
    .map((icono) => icono.id),
);

/** Lo que se descarga al abrir el enlace de una boda. */
const CARPETAS_PUBLICAS = ['src/app/features/public-site', 'src/app/layouts/public-shell'];

function ficheros(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts') ? [ruta] : [];
  });
}

/** `<np-icon name="bus" />`, que es como se escriben los fijos. */
function iconosLiterales(ruta: string): string[] {
  const texto = readFileSync(ruta, 'utf8');
  return [...texto.matchAll(/<np-icon[^>]*\sname="([a-z0-9-]+)"/g)].map((m) => m[1] ?? '');
}

describe('los iconos de la web pública están en su sprite', () => {
  const usados = new Map<string, string[]>();

  for (const carpeta of CARPETAS_PUBLICAS) {
    for (const ruta of ficheros(carpeta)) {
      for (const icono of iconosLiterales(ruta)) {
        usados.set(icono, [...(usados.get(icono) ?? []), ruta]);
      }
    }
  }

  it('encuentra iconos que revisar (si no, el escáner está roto)', () => {
    expect(usados.size).toBeGreaterThan(5);
  });

  it('todos los que se escriben en la plantilla están en el sprite público', () => {
    const faltan = [...usados.entries()]
      .filter(([icono]) => !EN_PUBLICO.has(icono))
      .map(([icono, donde]) => `${icono} (${donde.join(', ')})`);

    expect(faltan, 'iconos usados en la web pública que no están en su sprite').toEqual([]);
  });

  /**
   * Los que no se escriben en la plantilla sino que vienen del dominio: los de
   * una pregunta frecuente y los de un hito de la cronología, que elige la
   * pareja de una lista cerrada.
   */
  it('los catálogos que elige la pareja también están enteros', () => {
    expect([...ICONOS_FAQ].filter((icono) => !EN_PUBLICO.has(icono))).toEqual([]);
    expect([...ICONOS_HITO].filter((icono) => !EN_PUBLICO.has(icono))).toEqual([]);
  });
});
