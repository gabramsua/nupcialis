import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Todo lo que se define como función tiene que estar exportado en `index.ts`.
 *
 * Firebase despliega **solo lo que `index.ts` exporta**. Una función escrita y
 * no exportada compila, pasa las pruebas y no existe en producción: es lo que
 * pasó con `syncPublicAccommodations`, que se escribió, se probó entera y nunca
 * se desplegó, así que los alojamientos de una boda no se publicaban hasta que
 * se tocaba el documento de la boda.
 *
 * Se mira **cada fichero** de `src/`, no una lista: la lista sería lo siguiente
 * que se olvida actualizar.
 */

const CARPETA = new URL('./', import.meta.url);

function leer(nombre: string): string {
  return readFileSync(new URL(nombre, CARPETA), 'utf8');
}

const palabrasDelIndex = new Set(leer('index.ts').match(/\b[a-zA-Z][a-zA-Z0-9]*\b/g) ?? []);

const definidas = readdirSync(CARPETA)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'index.ts')
  .flatMap((fichero) =>
    [
      ...leer(fichero).matchAll(
        /export const (\w+)\s*=\s*on(?:DocumentWritten|DocumentCreated|DocumentUpdated|DocumentDeleted|Call|Request|Schedule)\b/g,
      ),
    ].map((m) => ({ fichero, nombre: m[1]! })),
  );

describe('las funciones definidas están exportadas', () => {
  it('hay funciones que mirar', () => {
    expect(definidas.length).toBeGreaterThan(20);
  });

  it.each(definidas.map((d) => [d.nombre, d.fichero]))('%s (%s) sale por index.ts', (nombre) => {
    expect(palabrasDelIndex.has(nombre as string)).toBe(true);
  });
});
