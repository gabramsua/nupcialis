/**
 * Cómo se presenta cada tipo de sección en el editor de la pareja.
 *
 * Esto **no** viaja a la web pública: es la capa de presentación del panel.
 * Vive aparte de `secciones.ts` porque aquel fichero es copia literal del de
 * las funciones y no puede llevar nada que el servidor no necesite.
 */

import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import { CAMPOS_POR_TIPO, type TipoSeccion } from './secciones';

export type TipoCampo = 'texto' | 'parrafo' | 'hora';

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
    control: CONTROLES[nombre] ?? 'texto',
    etiqueta: `panel.secciones.campo.${nombre}`,
    maximo,
  }));
}

export const TIPOS_EDITABLES: Record<TipoSeccion, TipoEditable> = {
  portada: { tipo: 'portada', icono: 'images', campos: campos('portada') },
  texto: { tipo: 'texto', icono: 'note-pencil', campos: campos('texto') },
  evento: { tipo: 'evento', icono: 'champagne', campos: campos('evento') },
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
