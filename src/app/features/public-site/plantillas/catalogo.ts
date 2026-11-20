/**
 * Catálogo de plantillas de la web pública.
 *
 * La pareja elige una de aquí; `theme.templateId` guarda cuál. No hay editor
 * libre —eso está descartado en `CLAUDE.md`— y ese es justo el motivo de que
 * exista un catálogo cerrado: lo que vende el producto es que **ninguna boda
 * quede mal**, y eso solo se puede prometer si cada plantilla está diseñada
 * entera, no compuesta a mano por quien no se dedica a esto.
 *
 * Añadir una plantilla es añadir una entrada aquí y su carpeta. Nada más del
 * producto necesita enterarse.
 */

export type PlantillaId = 'clasica' | 'botanica';

export interface Plantilla {
  readonly id: PlantillaId;
  readonly nombre: string;
  /** Una frase para el selector del panel. */
  readonly descripcion: string;
  /**
   * Familias de Google Fonts que necesita, en el formato de la URL.
   *
   * Se cargan **solo cuando se monta la plantilla elegida**: una boda con la
   * clásica no debe descargar las tipografías de la botánica. El invitado abre
   * el enlace desde WhatsApp con datos móviles.
   */
  readonly fuentes: readonly string[];
}

export const PLANTILLAS: readonly Plantilla[] = [
  {
    id: 'clasica',
    nombre: 'Clásica',
    descripcion: 'Papel claro, tipografía con serifa y una foto grande. Sobria y luminosa.',
    fuentes: ['Cormorant+Garamond:wght@300;400;500;600', 'Karla:wght@400;500;600'],
  },
  {
    id: 'botanica',
    nombre: 'Botánica',
    descripcion: 'Portada oscura a sangre y el día contado en una línea de tiempo.',
    fuentes: ['DM+Serif+Display', 'Jost:wght@300;400;500'],
  },
];

/** La que se usa cuando no hay ninguna elegida, o la elegida ya no existe. */
export const PLANTILLA_POR_DEFECTO: PlantillaId = 'clasica';

/**
 * Convierte lo que venga en una plantilla que existe.
 *
 * Una boda puede tener guardado el id de una plantilla retirada del catálogo.
 * Caer a la clásica es feo; dejar la web en blanco, mucho peor: el invitado ya
 * está delante con el enlace abierto.
 */
export function plantillaDe(id: unknown): Plantilla {
  const encontrada = PLANTILLAS.find((plantilla) => plantilla.id === id);
  return encontrada ?? PLANTILLAS.find((p) => p.id === PLANTILLA_POR_DEFECTO)!;
}

/** URL de Google Fonts para una plantilla. `null` si no necesita ninguna. */
export function urlDeFuentes(plantilla: Plantilla): string | null {
  if (plantilla.fuentes.length === 0) return null;
  const familias = plantilla.fuentes.map((familia) => `family=${familia}`).join('&');
  // `display=swap`: el texto se ve con la tipografía de reserva mientras carga.
  // Una portada en blanco esperando a una fuente es una portada rota.
  return `https://fonts.googleapis.com/css2?${familias}&display=swap`;
}
