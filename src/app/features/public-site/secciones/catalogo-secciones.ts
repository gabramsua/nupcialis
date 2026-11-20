/**
 * Cómo se presenta cada tipo de sección en el editor de la pareja.
 *
 * Esto **no** viaja a la web pública: es la capa de presentación del panel.
 * Vive aparte de `secciones.ts` porque aquel fichero es copia literal del de
 * las funciones y no puede llevar nada que el servidor no necesite.
 */

import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import { CAMPOS_POR_TIPO, esCampoRico, type TipoSeccion } from './secciones';

/**
 * `rico` es el editor de texto enriquecido; el resto son controles de HTML.
 *
 * Cuál le toca a cada campo no se decide aquí a mano: sale de `CAMPOS_RICOS`,
 * que es la lista que comparten el cliente y el servidor. Así no puede pasar
 * que el panel ofrezca formato en un campo que el servidor publica como texto
 * plano, ni al contrario.
 */
export type TipoCampo = 'texto' | 'parrafo' | 'hora' | 'rico';

export interface CampoEditable {
  readonly nombre: string;
  readonly control: TipoCampo;
  /** Clave de i18n de la etiqueta. */
  readonly etiqueta: string;
  readonly maximo: number;
}

export interface TipoEditable {
  readonly tipo: TipoSeccion;
  readonly icono: NpIconName;
  readonly campos: readonly CampoEditable[];
}

/** Qué control pide cada campo. Lo demás sale de `CAMPOS_POR_TIPO`. */
const CONTROLES: Record<string, TipoCampo> = {
  titulo: 'texto',
  texto: 'parrafo',
  hora: 'hora',
  lugar: 'texto',
  direccion: 'texto',
  nota: 'parrafo',
};

function campos(tipo: TipoSeccion): readonly CampoEditable[] {
  // Se recorre la lista blanca compartida, no una copia: si mañana se añade un
  // campo a `CAMPOS_POR_TIPO`, aparece en el editor sin tocar este fichero.
  return Object.entries(CAMPOS_POR_TIPO[tipo]).map(([nombre, maximo]) => ({
    nombre,
    control: esCampoRico(tipo, nombre) ? 'rico' : (CONTROLES[nombre] ?? 'texto'),
    etiqueta: `panel.secciones.campo.${nombre}`,
    maximo,
  }));
}

export const TIPOS_EDITABLES: Record<TipoSeccion, TipoEditable> = {
  portada: { tipo: 'portada', icono: 'images', campos: campos('portada') },
  texto: { tipo: 'texto', icono: 'note-pencil', campos: campos('texto') },
  evento: { tipo: 'evento', icono: 'champagne', campos: campos('evento') },
  // Las preguntas no se escriben en la sección: viven en su propia pantalla
  // (§8.9). Aquí solo se les pone el título y se decide dónde van.
  preguntas: { tipo: 'preguntas', icono: 'question', campos: campos('preguntas') },
  // La cronología se escribe en su pantalla (§8.13); aquí va su título.
  cronologia: { tipo: 'cronologia', icono: 'clock', campos: campos('cronologia') },
  // Los alojamientos se escriben en su pantalla (§8.10); aquí va su título.
  alojamientos: { tipo: 'alojamientos', icono: 'bed', campos: campos('alojamientos') },
  // El dress code se escribe en su pantalla (§8.11); aquí va su título.
  dressCode: { tipo: 'dressCode', icono: 't-shirt', campos: campos('dressCode') },
  // El quiz vive en su propia página; aquí solo se decide si hay cartel y qué
  // pone (§8.7).
  quiz: { tipo: 'quiz', icono: 'game-controller', campos: campos('quiz') },
  // Las fotos viven en su propia página (§8.5); aquí va su cartel.
  galeria: { tipo: 'galeria', icono: 'images', campos: campos('galeria') },
  // Los regalos viven en su propia página (§8.8) porque el número de cuenta no
  // puede ir en la proyección pública; aquí va su cartel.
  regalos: { tipo: 'regalos', icono: 'gift', campos: campos('regalos') },
  // El mapa vive en su propia página (§8.6), que carga Leaflet; aquí va su cartel.
  mapa: { tipo: 'mapa', icono: 'map-pin', campos: campos('mapa') },
  // La playlist (§8.14) también: su cartel lleva a la página donde se vota.
  playlist: { tipo: 'playlist', icono: 'music-notes', campos: campos('playlist') },
};

/**
 * Sube o baja una sección. Devuelve una lista nueva con los `order` al día.
 *
 * La portada no se mueve: es la primera y punto. Y no se puede sacar nada por
 * encima de ella, que es el otro caso que hay que impedir.
 */
export function mover(
  secciones: readonly { id: string; type: TipoSeccion; order: number }[],
  id: string,
  direccion: -1 | 1,
): readonly { id: string; type: TipoSeccion; order: number }[] {
  const desde = secciones.findIndex((s) => s.id === id);
  if (desde < 0) return secciones;
  if (secciones[desde].type === 'portada') return secciones;

  const hasta = desde + direccion;
  if (hasta < 0 || hasta >= secciones.length) return secciones;
  if (secciones[hasta].type === 'portada') return secciones;

  const copia = [...secciones];
  [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
  return copia.map((seccion, indice) => ({ ...seccion, order: indice }));
}
