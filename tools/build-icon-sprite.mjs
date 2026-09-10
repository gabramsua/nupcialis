#!/usr/bin/env node
/**
 * Compila el set curado de iconos en sprites SVG y genera los tipos.
 *
 * Dos sprites, no uno: la misma disciplina que con los chunks de JavaScript.
 * Un invitado que abre la web desde el móvil no debe descargarse los iconos del
 * panel de presupuesto.
 *
 * Dos pesos por icono: `regular` para inactivo y `fill` para activo o
 * seleccionado. Es el mecanismo de estado que justificó elegir Phosphor (D-12).
 *
 * Genera también una unión de tipos con los nombres, para que un icono mal
 * escrito falle al compilar y no en la pantalla de un invitado.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN_ICONOS = join(raiz, 'src/app/design-system/icons/icons.json');
const PHOSPHOR = join(raiz, 'node_modules/@phosphor-icons/core/assets');
const SALIDA_SPRITES = join(raiz, 'public/icons');
const SALIDA_TIPOS = join(raiz, 'src/app/design-system/icons/icon-name.generated.ts');

const PESOS = ['regular', 'fill'];

const catalogo = JSON.parse(readFileSync(ORIGEN_ICONOS, 'utf8'));
const iconos = Object.entries(catalogo.categorias).flatMap(([clave, cat]) =>
  cat.iconos.map((i) => ({ ...i, categoria: clave })),
);

/** Extrae el contenido de un SVG de Phosphor, sin su etiqueta <svg> externa. */
function cuerpo(peso, id) {
  const ruta = join(PHOSPHOR, peso, peso === 'regular' ? `${id}.svg` : `${id}-${peso}.svg`);
  const svg = readFileSync(ruta, 'utf8');
  const dentro = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return (
    dentro
      // El relleno lo pone el CSS con currentColor: así el icono hereda el
      // color del texto que lo acompaña y nunca se desincroniza de él.
      .replace(/\s(fill|stroke)="(?!none)[^"]*"/g, '')
      .replace(/<rect[^>]*width="256"[^>]*height="256"[^>]*\/>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function sprite(superficie) {
  const propios = iconos.filter((i) => i.surfaces.includes(superficie));
  const simbolos = propios.flatMap((i) =>
    PESOS.map(
      (p) =>
        `<symbol id="${i.id}-${p}" viewBox="0 0 256 256" fill="currentColor">${cuerpo(p, i.id)}</symbol>`,
    ),
  );
  return {
    contenido: `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${simbolos.join('')}</svg>`,
    total: propios.length,
  };
}

mkdirSync(SALIDA_SPRITES, { recursive: true });

for (const superficie of ['public', 'panel']) {
  const { contenido, total } = sprite(superficie);
  const destino = join(SALIDA_SPRITES, `${superficie}.svg`);
  writeFileSync(destino, contenido, 'utf8');
  const kb = (Buffer.byteLength(contenido) / 1024).toFixed(1);
  console.log(`${superficie}.svg: ${total} iconos × ${PESOS.length} pesos, ${kb} kB en bruto`);
}

const nombres = [...new Set(iconos.map((i) => i.id))].sort();
const etiquetas = iconos
  .map((i) => `  '${i.id}': ${JSON.stringify(i.etiqueta)},`)
  .join('\n');

writeFileSync(
  SALIDA_TIPOS,
  `// GENERADO por tools/build-icon-sprite.mjs — no editar a mano.
// La fuente de verdad es icons.json. Regenerar con: npm run icons

/** Nombres del set curado. Un icono fuera de esta lista no compila. */
export type NpIconName =
${nombres.map((n) => `  | '${n}'`).join('\n')};

/** Peso como mecanismo de estado: regular inactivo, fill activo. */
export type NpIconWeight = 'regular' | 'fill';

/** Etiqueta por defecto de cada icono, para lectores de pantalla y selectores. */
export const NP_ICON_LABELS: Record<NpIconName, string> = {
${etiquetas}
};
`,
  'utf8',
);

console.log(`icon-name.generated.ts: ${nombres.length} nombres tipados`);
