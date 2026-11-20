/**
 * La cronología del día de la boda (§8.13).
 *
 * **Copia literal** del fichero del cliente, de la línea marcadora de ahí abajo
 * hasta el final. No se edita solo este fichero: se editan los dos, o el test
 * de la copia falla.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_HITOS = 30;
export const MAX_TITULO = 80;
export const MAX_DESCRIPCION = 300;

/**
 * Los iconos de la cronología.
 *
 * Pensados para el día de una boda y **presentes en los dos sprites**, el del
 * panel y el público: uno que solo estuviera en el del panel se pintaría como
 * un hueco en la web del invitado. Lo que no esté aquí cae en `clock`.
 */
export const ICONOS_HITO = [
  'clock',
  'dress',
  'church',
  'confetti',
  'champagne',
  'fork-knife',
  'cake',
  'music-notes',
  'wine',
  'disco-ball',
  'camera',
  'bus',
  'taxi',
  'moon-stars',
  'flower',
  'map-pin',
  'heart',
  'car',
  'balloon',
  'video-camera',
  'hand-heart',
  'bed',
  'martini',
  'microphone-stage',
  'users-three',
  'hands-clapping',
  'door-open',
  'sparkle',
  'person-simple-walk',
  'flag-checkered',
  'guitar',
  'suitcase',
  't-shirt',
] as const;

export type IconoHito = (typeof ICONOS_HITO)[number];

export function esIconoHito(valor: unknown): valor is IconoHito {
  return typeof valor === 'string' && (ICONOS_HITO as readonly string[]).includes(valor);
}

/**
 * Los colores, de la paleta de categorías del sistema (§9.1).
 *
 * La misma que usan los grupos de invitados, y por el mismo motivo: aquí no se
 * inventa ningún color, y el que se elija tiene contraste comprobado.
 */
export const COLORES_HITO = [
  'rosa',
  'teja',
  'mostaza',
  'verde',
  'turquesa',
  'azul',
  'ciruela',
] as const;

export type ColorHito = (typeof COLORES_HITO)[number];

export function esColorHito(valor: unknown): valor is ColorHito {
  return typeof valor === 'string' && (COLORES_HITO as readonly string[]).includes(valor);
}

/** Un hito tal y como llega a la web pública. */
export interface HitoPublico {
  readonly id: string;
  /** Hora de reloj, `'17:00'`. */
  readonly time: string;
  /** Cuándo acaba, si la pareja lo ha puesto. */
  readonly endTime: string | null;
  readonly title: string;
  readonly description: string;
  readonly icon: IconoHito;
  readonly color: ColorHito;
  readonly order: number;
}

/**
 * La hora de reloj en minutos, **contando el día de la boda y no el reloj**.
 *
 * Una boda que empieza a las cinco de la tarde acaba a las cinco de la mañana,
 * y «04:30» no es antes que «17:00»: es doce horas después. Sin esto, la barra
 * libre aparecería antes de la ceremonia en la cronología y el aviso de solapes
 * diría cualquier cosa.
 *
 * El corte está en las seis de la mañana: nada de una boda empieza antes, y
 * todo lo que pasa después de medianoche cae antes de esa hora.
 */
export const HORA_DE_CORTE = 6;

export function minutosDelDia(hora: unknown): number | null {
  if (typeof hora !== 'string') return null;

  const encaje = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!encaje) return null;

  const h = Number(encaje[1]);
  const m = Number(encaje[2]);
  if (h > 23 || m > 59) return null;

  return (h < HORA_DE_CORTE ? h + 24 : h) * 60 + m;
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

function horaValida(valor: unknown): string | null {
  return minutosDelDia(valor) === null ? null : (valor as string).trim();
}

/**
 * Deja la cronología publicable. Nunca lanza.
 *
 * Qué se cae y por qué:
 *
 * - Lo que está marcado como **interno**: la hora a la que llega el fotógrafo
 *   no es asunto de los invitados (§8.13). Esto es lo que de verdad protege ese
 *   requisito, porque el documento público es lo único que el invitado lee.
 * - Lo que **no tiene hora válida o no tiene título**: una línea de tiempo con
 *   un hito sin hora no se puede ni ordenar.
 *
 * El orden sale de la hora, no de `order`: en una cronología, el orden **es**
 * la hora, y dejar que un `order` escrito a mano la contradiga solo serviría
 * para que la pareja viera su día desordenado.
 */
export function sanearCronologia(valor: unknown): readonly HitoPublico[] {
  if (!Array.isArray(valor)) return [];

  const salida: HitoPublico[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const h = crudo as Record<string, unknown>;
    const id = texto(h['id'], 60);
    const title = texto(h['title'], MAX_TITULO);
    const time = horaValida(h['time']);

    if (id === '' || vistos.has(id)) continue;
    if (title === '' || time === null) continue;
    if (h['visibleToGuests'] === false) continue;

    vistos.add(id);
    salida.push({
      id,
      time,
      endTime: horaValida(h['endTime']),
      title,
      description: texto(h['description'], MAX_DESCRIPCION),
      icon: esIconoHito(h['icon']) ? h['icon'] : 'clock',
      color: esColorHito(h['color']) ? h['color'] : 'rosa',
      order: typeof h['order'] === 'number' && Number.isFinite(h['order']) ? h['order'] : 0,
    });
  }

  return salida.sort(porHora).slice(0, MAX_HITOS);
}

/** Por hora, y a igualdad por el id: dos hitos a la misma hora no bailan. */
export function porHora(a: HitoPublico, b: HitoPublico): number {
  const minutosA = minutosDelDia(a.time) ?? 0;
  const minutosB = minutosDelDia(b.time) ?? 0;
  return minutosA - minutosB || a.id.localeCompare(b.id);
}

/**
 * Los hitos que se pisan unos con otros.
 *
 * Solo cuenta cuando el primero **dice cuándo acaba**: sin hora de fin no hay
 * solape que detectar, solo dos cosas que empiezan seguidas. Y dos hitos que
 * se tocan —uno acaba a las 18:00 y el otro empieza a las 18:00— no se pisan.
 *
 * Es un aviso, no un error: una boda tiene cosas que pasan a la vez (el cóctel
 * y las fotos de grupo). Lo que no puede es que nadie se lo diga a la pareja
 * mientras lo escribe.
 */
export interface Solape {
  readonly uno: string;
  readonly otro: string;
}

export function solapes(hitos: readonly HitoPublico[]): readonly Solape[] {
  const ordenados = [...hitos].sort(porHora);
  const encontrados: Solape[] = [];

  for (let i = 0; i < ordenados.length; i += 1) {
    const actual = ordenados[i];
    const fin = actual ? minutosDelDia(actual.endTime) : null;
    if (!actual || fin === null) continue;

    for (let j = i + 1; j < ordenados.length; j += 1) {
      const siguiente = ordenados[j];
      const empieza = siguiente ? minutosDelDia(siguiente.time) : null;
      if (!siguiente || empieza === null) continue;
      if (empieza >= fin) break;

      encontrados.push({ uno: actual.id, otro: siguiente.id });
    }
  }

  return encontrados;
}

/**
 * A partir de cuántos minutos un hueco es un hueco.
 *
 * Dos horas. Menos es la vida normal de una boda —entre el cóctel y el
 * banquete pasa hora y media—; más es que falta algo por contar, y el invitado
 * que mire la cronología se va a preguntar qué hace en ese rato.
 */
export const HUECO_LARGO = 120;

export interface Hueco {
  readonly despuesDe: string;
  readonly antesDe: string;
  readonly minutos: number;
}

export function huecos(
  hitos: readonly HitoPublico[],
  minimo: number = HUECO_LARGO,
): readonly Hueco[] {
  const ordenados = [...hitos].sort(porHora);
  const encontrados: Hueco[] = [];

  for (let i = 0; i < ordenados.length - 1; i += 1) {
    const actual = ordenados[i];
    const siguiente = ordenados[i + 1];
    if (!actual || !siguiente) continue;

    // **Solo cuenta si el hito dice cuándo acaba.** Sin hora de fin no se sabe
    // si el cóctel dura veinte minutos o tres horas, y suponer que acaba en
    // cuanto empieza convertía en «hueco» todo rato entre dos cosas: una boda
    // normal salía con cuatro avisos, y un aviso que salta siempre no lo lee
    // nadie. Se vio en la pantalla, con una agenda de las de verdad.
    const desde = minutosDelDia(actual.endTime);
    const hasta = minutosDelDia(siguiente.time);
    if (desde === null || hasta === null) continue;

    const minutos = hasta - desde;
    if (minutos >= minimo) {
      encontrados.push({ despuesDe: actual.id, antesDe: siguiente.id, minutos });
    }
  }

  return encontrados;
}
