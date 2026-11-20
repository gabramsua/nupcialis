import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Que la web pública no arrastre código del panel (F0.7.6).
 *
 * El invitado abre el enlace desde WhatsApp, con datos móviles y a veces con
 * una barra de cobertura. El presupuesto son 200 kB de JavaScript comprimido
 * y el arranque ya se lleva casi 100. Un `import` inocente desde una pantalla
 * pública a una utilidad que vive en el panel mete en ese chunk todo lo que
 * esa utilidad arrastre detrás.
 *
 * Esto no sustituye al presupuesto del `angular.json` —que mide bytes de
 * verdad—: lo que vigila es la **forma**, que es donde empieza el problema y
 * donde se ve de un vistazo qué import sobra. Y lo hace sin construir nada,
 * leyendo los `import` de los ficheros alcanzables desde la raíz pública.
 */

const PUERTAS_PUBLICAS = [
  'src/app/app.routes.ts',
  'src/app/features/public-site/public-site.routes.ts',
  'src/app/layouts/public-shell/public-shell.ts',
];

/** Lo que no puede alcanzarse desde la web pública. */
const PROHIBIDO = [
  'src/app/features/panel/',
  'src/app/features/superadmin/',
  'src/app/layouts/panel-shell/',
  'src/app/layouts/admin-shell/',
];

/**
 * Las rutas diferidas **no** se siguen.
 *
 * `app.routes.ts` nombra el panel y el superadmin en un `loadChildren`: eso es
 * precisamente lo que los separa en otro chunk, así que seguir ese hilo haría
 * saltar el test por el motivo contrario al que existe.
 */
const DIFERIDAS = /import\(/;

function importaciones(fichero: string): string[] {
  const codigo = readFileSync(fichero, 'utf8');
  const destinos: string[] = [];

  for (const linea of codigo.split('\n')) {
    if (DIFERIDAS.test(linea)) continue;
    const encontrado = /from\s+'(\.[^']+)'/.exec(linea);
    if (encontrado) destinos.push(encontrado[1]);
  }

  return destinos;
}

function resolver(desde: string, destino: string): string | null {
  const base = resolve(dirname(desde), destino);

  for (const candidato of [`${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidato) && statSync(candidato).isFile()) return candidato;
  }

  return null;
}

/** Todo lo que se descarga al abrir la web de una boda, por el camino corto. */
function alcanzables(): Map<string, string> {
  const vistos = new Map<string, string>();
  const cola = PUERTAS_PUBLICAS.map((p) => ({ fichero: resolve(p), desde: 'la raíz' }));

  while (cola.length > 0) {
    const { fichero, desde } = cola.pop()!;
    if (vistos.has(fichero)) continue;
    vistos.set(fichero, desde);

    for (const destino of importaciones(fichero)) {
      const resuelto = resolver(fichero, destino);
      if (resuelto && !vistos.has(resuelto)) {
        cola.push({ fichero: resuelto, desde: relative(process.cwd(), fichero) });
      }
    }
  }

  return vistos;
}

describe('el arranque de la web pública', () => {
  it('no alcanza ni un fichero del panel ni del superadmin', () => {
    const culpables = [...alcanzables().entries()]
      .map(([fichero, desde]) => ({ fichero: relative(process.cwd(), fichero), desde }))
      .filter((f) =>
        PROHIBIDO.some((prefijo) => f.fichero.replaceAll('\\', '/').startsWith(prefijo)),
      );

    expect(culpables).toEqual([]);
  });

  /** Si esto deja de encontrar ficheros, el que no sirve es el test. */
  it('recorre de verdad el árbol de la web pública', () => {
    const vistos = [...alcanzables().keys()];

    expect(vistos.length).toBeGreaterThan(15);
    expect(vistos.some((f) => f.includes('plantillas'))).toBe(true);
  });
});
