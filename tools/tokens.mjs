#!/usr/bin/env node
/**
 * Genera las variables CSS a partir de palette.json y verifica el contraste.
 *
 * `node tools/tokens.mjs`          genera y verifica
 * `node tools/tokens.mjs --check`  solo verifica, sin escribir (para CI)
 *
 * El contraste no es un adorno: la web la abren invitados mayores, a menudo al
 * sol y desde el móvil. Y como el color siempre va acompañado de icono y texto
 * (§9.1), el texto tiene que leerse de verdad.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(raiz, 'src/app/design-system/tokens/palette.json');
const DESTINO = join(raiz, 'src/app/design-system/tokens/_palette.generated.scss');
const DESTINO_TS = join(raiz, 'src/app/design-system/tokens/semantic.generated.ts');

/** WCAG 2.1: 4.5:1 en texto normal, 3:1 en elementos de interfaz. */
const MIN_TEXTO = 4.5;
const MIN_INTERFAZ = 3;

const HEX = /^#[0-9a-f]{6}$/;

function aRgb(hex) {
  if (!HEX.test(hex)) throw new Error(`Color inválido: ${JSON.stringify(hex)}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminancia(hex) {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const paleta = JSON.parse(readFileSync(ORIGEN, 'utf8'));
const fallos = [];
const comprobaciones = [];

function comprobar(descripcion, color, fondo, minimo) {
  const ratio = contraste(color, fondo);
  const ok = ratio >= minimo;
  comprobaciones.push({ descripcion, ratio, minimo, ok });
  if (!ok) {
    fallos.push(`${descripcion}: ${ratio.toFixed(2)}:1, hace falta ${minimo}:1 (${color} sobre ${fondo})`);
  }
}

for (const modo of ['light', 'dark']) {
  const sup = paleta.surface[modo];

  comprobar(`[${modo}] texto sobre superficie`, sup.text, sup.surface, MIN_TEXTO);
  comprobar(`[${modo}] texto sobre lienzo`, sup.text, sup.canvas, MIN_TEXTO);
  comprobar(`[${modo}] texto atenuado sobre superficie`, sup.textMuted, sup.surface, MIN_TEXTO);
  comprobar(`[${modo}] borde sobre superficie`, sup.border, sup.surface, 1.2);

  for (const [nombre, def] of Object.entries(paleta.semantic)) {
    if (nombre.startsWith('_')) continue;
    const c = def[modo];
    // El caso real de un chip de estado: texto de color sobre su fondo tintado.
    comprobar(`[${modo}] ${nombre}: texto sobre su fondo`, c.fg, c.bg, MIN_TEXTO);
    comprobar(`[${modo}] ${nombre}: texto sobre superficie`, c.fg, sup.surface, MIN_TEXTO);
    comprobar(`[${modo}] ${nombre}: sólido sobre superficie`, c.solid, sup.surface, MIN_INTERFAZ);
    comprobar(`[${modo}] ${nombre}: borde sobre su fondo`, c.border, c.bg, 1.2);
  }

  for (const cat of paleta.categorical.colores) {
    comprobar(`[${modo}] categórico ${cat.id} sobre superficie`, cat[modo], sup.surface, MIN_INTERFAZ);
  }
}

// Los colores categóricos tienen que distinguirse ENTRE SÍ, no solo del fondo:
// si dos grupos de invitados se ven casi iguales, el color deja de informar.
//
// Se mide distancia perceptual en CIELAB (ΔE76), no diferencia de luminancia.
// La luminancia es un solo eje: con catorce colores es imposible separarlos
// todos ahí y mantener a la vez el contraste sobre el fondo. Lo que se les pide
// es que se distingan como colores. Que además funcionen para alguien que no
// percibe bien el color lo garantiza la regla de §9.1, no la paleta: el color
// nunca viaja solo, siempre lleva icono y etiqueta.
const MIN_DELTA_E = 18;

function aLab(hex) {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a, b) {
  const [l1, a1, b1] = aLab(a);
  const [l2, a2, b2] = aLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

let peorPar = null;
for (const modo of ['light', 'dark']) {
  const cols = paleta.categorical.colores;
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const d = deltaE(cols[i][modo], cols[j][modo]);
      if (!peorPar || d < peorPar.d) peorPar = { d, modo, a: cols[i].id, b: cols[j].id };
      if (d < MIN_DELTA_E) {
        fallos.push(
          `[${modo}] categóricos ${cols[i].id} y ${cols[j].id}: ΔE ${d.toFixed(1)}, hace falta ${MIN_DELTA_E}`,
        );
      }
    }
  }
}

function scss() {
  const linea = (k, v) => `  --np-${k}: ${v};`;
  const bloque = (modo) => {
    const sup = paleta.surface[modo];
    const out = [
      ...Object.entries(sup).map(([k, v]) => linea(`surface-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`, v)),
    ];
    for (const [nombre, def] of Object.entries(paleta.semantic)) {
      if (nombre.startsWith('_')) continue;
      for (const [papel, valor] of Object.entries(def[modo])) {
        out.push(linea(`${nombre}-${papel}`, valor));
      }
    }
    for (const cat of paleta.categorical.colores) {
      out.push(linea(`cat-${cat.id}`, cat[modo]));
    }
    return out.join('\n');
  };

  return `// GENERADO por tools/tokens.mjs — no editar a mano.
// La fuente de verdad es src/app/design-system/tokens/palette.json.
// Regenerar con: npm run tokens

:root {
${bloque('light')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-np-theme='light']) {
${bloque('dark')
  .split('\n')
  .map((l) => '  ' + l)
  .join('\n')}
  }
}

:root[data-np-theme='dark'] {
${bloque('dark')}
}
`;
}

/**
 * El mapa de estado a icono sale del MISMO palette.json que los colores.
 * Si estuviera escrito a mano en el componente, alguien acabaría poniendo un
 * icono distinto para 'confirmado' en algún módulo y la consistencia entre
 * pantallas —que es justo lo que se prometió en §9.1— se rompería sin que
 * nadie lo notara.
 */
/** Comillas simples, como el resto del proyecto. JSON.stringify pone dobles. */
function comillas(texto) {
  return `'${texto.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function semanticTs() {
  const entradas = Object.entries(paleta.semantic).filter(([k]) => !k.startsWith('_'));
  return `// GENERADO por tools/tokens.mjs — no editar a mano.
// La fuente de verdad es src/app/design-system/tokens/palette.json.

import type { NpIconName } from '../icons/icon-name.generated';

/** Los cinco estados del vocabulario semántico. Ver docs/REQUISITOS.md §9.1. */
export type NpStatus =
${entradas.map(([k]) => `  | '${k}'`).join('\n')};

/** Icono de cada estado. El color nunca viaja solo: esto es la otra mitad. */
export const NP_STATUS_ICON: Record<NpStatus, NpIconName> = {
${entradas.map(([k, v]) => `  ${k}: '${v.icon}',`).join('\n')}
};

/** Para qué sirve cada estado, por si alguien duda al elegir. */
export const NP_STATUS_MEANING: Record<NpStatus, string> = {
${entradas.map(([k, v]) => `  ${k}: ${comillas(v.significado)},`).join('\n')}
};
`;
}

const soloVerificar = process.argv.includes('--check');

if (fallos.length) {
  console.error(`\nContraste insuficiente en ${fallos.length} combinación(es):\n`);
  for (const f of fallos) console.error(`  ✗ ${f}`);
  console.error(`\n${comprobaciones.length} comprobaciones, ${fallos.length} fallidas.\n`);
  process.exit(1);
}

if (!soloVerificar) {
  writeFileSync(DESTINO, scss(), 'utf8');
  writeFileSync(DESTINO_TS, semanticTs(), 'utf8');
  console.log(`Escrito ${DESTINO.replace(raiz + '/', '')}`);
  console.log(`Escrito ${DESTINO_TS.replace(raiz + '/', '')}`);
}

const peor = comprobaciones.reduce((a, b) => (a.ratio / a.minimo < b.ratio / b.minimo ? a : b));
console.log(
  `${comprobaciones.length} comprobaciones de contraste OK. La más justa: ${peor.descripcion} (${peor.ratio.toFixed(2)}:1 sobre ${peor.minimo}:1).`,
);
console.log(
  `Par categórico más parecido: ${peorPar.a} y ${peorPar.b} en ${peorPar.modo} (ΔE ${peorPar.d.toFixed(1)}, mínimo ${MIN_DELTA_E}).`,
);
