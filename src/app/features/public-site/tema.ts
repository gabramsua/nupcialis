import { DestroyRef, DOCUMENT, computed, effect, inject, type Signal } from '@angular/core';

import { variablesDeMarca } from '../../core/tenant/marca';
import type { ResultadoTenant } from '../../core/tenant/tenant-loader';
import { plantillaDe, type Plantilla } from './plantillas/catalogo';
import { Fuentes } from './plantillas/fuentes';

/**
 * El tema de una boda para las páginas sueltas (D-55): quiz, galería, regalos,
 * playlist, historia, mapa y confirmación.
 *
 * Hasta ahora solo la portada se pintaba con la plantilla y la paleta de la
 * pareja; el resto salía con los colores del sistema, así que el invitado
 * tocaba «Jugar» y caía en otra web. Aquí vive **una sola** manera de pintar:
 *
 * - Los colores de la plantilla elegida, y encima los de la paleta si la pareja
 *   escogió una (`--np-marca-*`, los mismos nombres que usan las plantillas).
 * - La tipografía de la plantilla (`--np-marca-titulos`, `--np-marca-fuente`),
 *   que además se carga.
 * - El fondo y el color de texto, puestos en el `body` mientras la página está
 *   abierta: la columna del juego es estrecha y, si solo se pintara ella, a los
 *   lados quedaría el blanco del sistema.
 */

/** Las variables CSS de la boda: la plantilla de base y la paleta por encima. */
export function estiloDeLaBoda(
  t: ResultadoTenant | null | undefined,
): Readonly<Record<string, string>> {
  if (t?.tipo !== 'ok') return {};

  const plantilla = plantillaDe(t.sitio.theme.templateId);
  return {
    '--np-marca-background': plantilla.colores.fondo,
    '--np-marca-text': plantilla.colores.texto,
    '--np-marca-accent': plantilla.colores.acento,
    '--np-marca-surface': plantilla.colores.superficie,
    '--np-marca-titulos': plantilla.tipografia.titulos,
    '--np-marca-fuente': plantilla.tipografia.texto,
    ...variablesDeMarca(t.sitio.theme.palette),
  };
}

/** ¿Esta boda tiene la web de varias páginas, con cabecera de navegación? */
export function conCabecera(t: ResultadoTenant | null | undefined): boolean {
  return t?.tipo === 'ok' && t.sitio.layout === 'multipage';
}

export function plantillaDeLaBoda(t: ResultadoTenant | null | undefined): Plantilla | null {
  return t?.tipo === 'ok' ? plantillaDe(t.sitio.theme.templateId) : null;
}

/**
 * Pinta la página con el tema de la boda. Se llama desde el constructor (o un
 * inicializador de campo) de la página, que lo enlaza con `host: { '[style]': 'tema()' }`.
 *
 * Devuelve el estilo del host. Además carga la tipografía y pone fondo, color y
 * letra en el `body` mientras la página exista, y los deja como estaban al irse.
 */
export function usarTemaDeLaBoda(
  tenant: Signal<ResultadoTenant | null | undefined>,
): Signal<Readonly<Record<string, string>>> {
  const fuentes = inject(Fuentes);
  const documento = inject(DOCUMENT);
  const destruir = inject(DestroyRef);

  const estilo = computed(() => estiloDeLaBoda(tenant()));

  const cuerpo = documento.body;
  const previo = cuerpo
    ? { fondo: cuerpo.style.background, color: cuerpo.style.color, fuente: cuerpo.style.fontFamily }
    : null;

  effect(() => {
    const plantilla = plantillaDeLaBoda(tenant());
    if (!plantilla || !cuerpo) return;

    fuentes.cargar(plantilla);
    const e = estilo();
    cuerpo.style.background = e['--np-marca-background'] ?? '';
    cuerpo.style.color = e['--np-marca-text'] ?? '';
    cuerpo.style.fontFamily = e['--np-marca-fuente'] ?? '';
  });

  destruir.onDestroy(() => {
    if (!cuerpo || !previo) return;
    cuerpo.style.background = previo.fondo;
    cuerpo.style.color = previo.color;
    cuerpo.style.fontFamily = previo.fuente;
  });

  return estilo;
}
