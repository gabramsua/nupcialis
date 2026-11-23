import type { Seccion, TipoSeccion } from '../secciones/secciones';

/**
 * Lo que lleva el menú de la web de varias páginas.
 *
 * El menú **no se configura**: sale de las secciones que la pareja tiene
 * encendidas, en el orden en que las puso. Apagar el quiz lo quita del menú, y
 * activar la galería lo añade, sin que nadie tenga que tocar nada más.
 *
 * Es una función pura y sin Angular a propósito: qué entra, en qué grupo y qué
 * cabe en la barra se prueba sin montar ninguna pantalla.
 */

/** En qué grupo se enseña: el cajón del móvil los separa con un título. */
export type GrupoMenu = 'boda' | 'participa';

export interface ElementoMenu {
  /** Quién es: sirve de clave de traducción (`publico.menu.<clave>`). */
  readonly clave: string;
  /**
   * El título que escribió la pareja, para las secciones de texto libre. `null`
   * en el resto: se usa el nombre corto de siempre, porque un título largo
   * («Todo lo que tienes que saber sobre el sábado») no cabe en una barra.
   */
  readonly titulo: string | null;
  /** Dónde está: la portada (`/`) con ancla, o la página propia del módulo. */
  readonly ruta: string;
  readonly fragmento: string | null;
  readonly grupo: GrupoMenu;
  /** Las páginas que piden nombre y cuatro dígitos (D-56). */
  readonly conIdentidad: boolean;
}

/** El id del elemento de la portada al que lleva el ancla de una sección. */
export function idDeAncla(seccionId: string): string {
  return `s-${seccionId}`;
}

interface Regla {
  readonly grupo: GrupoMenu;
  /** La página propia del módulo, o `null` si vive en la portada. */
  readonly ruta: string | null;
  readonly conIdentidad?: boolean;
}

/** Qué hace el menú con cada tipo de sección. La portada no entra. */
const REGLAS: Partial<Record<TipoSeccion, Regla>> = {
  texto: { grupo: 'boda', ruta: null },
  evento: { grupo: 'boda', ruta: null },
  cronologia: { grupo: 'boda', ruta: null },
  alojamientos: { grupo: 'boda', ruta: null },
  dressCode: { grupo: 'boda', ruta: null },
  preguntas: { grupo: 'boda', ruta: null },
  historia: { grupo: 'boda', ruta: '/historia' },
  mapa: { grupo: 'boda', ruta: '/mapa' },
  quiz: { grupo: 'participa', ruta: '/quiz', conIdentidad: true },
  galeria: { grupo: 'participa', ruta: '/galeria', conIdentidad: true },
  playlist: { grupo: 'participa', ruta: '/playlist', conIdentidad: true },
  regalos: { grupo: 'participa', ruta: '/regalos', conIdentidad: true },
};

/** Las claves de traducción de los tipos que tienen nombre corto propio. */
const CLAVE: Partial<Record<TipoSeccion, string>> = {
  texto: 'texto',
  evento: 'evento',
  cronologia: 'programa',
  alojamientos: 'alojamiento',
  dressCode: 'dressCode',
  preguntas: 'preguntas',
  historia: 'historia',
  mapa: 'mapa',
  quiz: 'quiz',
  galeria: 'galeria',
  playlist: 'playlist',
  regalos: 'regalos',
};

/** Los elementos del menú: el grupo de la boda primero y luego el de participar. */
export function elementosDeMenu(secciones: readonly Seccion[]): readonly ElementoMenu[] {
  const salida: ElementoMenu[] = [];

  for (const seccion of [...secciones].sort((a, b) => a.order - b.order)) {
    if (!seccion.enabled) continue;
    const regla = REGLAS[seccion.type];
    const clave = CLAVE[seccion.type];
    if (!regla || !clave) continue;

    const titulo = (seccion.fields['titulo'] ?? '').trim();
    const librePorTitulo = seccion.type === 'texto' || seccion.type === 'evento';
    // Un bloque de texto sin título no tiene nombre con el que ir al menú.
    if (seccion.type === 'texto' && titulo === '') continue;
    // Un tipo con página propia solo cuenta una vez, aunque haya dos secciones.
    if (regla.ruta && salida.some((e) => e.ruta === regla.ruta)) continue;

    salida.push({
      clave,
      titulo: librePorTitulo && titulo !== '' ? titulo : null,
      ruta: regla.ruta ?? '/',
      fragmento: regla.ruta ? null : idDeAncla(seccion.id),
      grupo: regla.grupo,
      conIdentidad: regla.conIdentidad === true,
    });
  }

  // Estable: dentro de cada grupo se respeta el orden de la pareja.
  return [
    ...salida.filter((e) => e.grupo === 'boda'),
    ...salida.filter((e) => e.grupo === 'participa'),
  ];
}

/** Cuántos enlaces caben en la barra de escritorio antes del «Más». */
export const MAX_EN_BARRA = 4;

/**
 * Qué se ve en la barra y qué se esconde tras «Más».
 *
 * Si todo cabe, no hay «Más»: un desplegable con un solo enlace dentro es peor
 * que el enlace.
 */
export function partirMenu(elementos: readonly ElementoMenu[]): {
  readonly enBarra: readonly ElementoMenu[];
  readonly enMas: readonly ElementoMenu[];
} {
  if (elementos.length <= MAX_EN_BARRA + 1) return { enBarra: elementos, enMas: [] };
  return { enBarra: elementos.slice(0, MAX_EN_BARRA), enMas: elementos.slice(MAX_EN_BARRA) };
}
