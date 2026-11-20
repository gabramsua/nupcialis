/**
 * La playlist colaborativa (§8.14).
 *
 * **COPIA LITERAL** de `functions/src/dominio/playlist.ts`.
 * Si tocas una, toca la otra: lo vigila su `.spec.ts`.
 *
 * Los invitados proponen canciones y votan las de los demás; la pareja decide
 * qué suena y qué no suena bajo ningún concepto. Aquí vive lo que se decide sin
 * red: cuándo una propuesta es la misma canción que otra, qué se hace con ella
 * y qué ve cada invitado.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_TITULO = 100;
export const MAX_ARTISTA = 80;
/** Cuántas canciones nuevas puede proponer un invitado: votar no cuenta. */
export const MAX_PROPUESTAS_POR_INVITADO = 5;
/** Tope de la lista entera: una boda con 300 propuestas ya no la lee nadie. */
export const MAX_CANCIONES = 300;

/**
 * En qué punto está una canción.
 *
 * - `pending`: la acaban de proponer y la pareja no la ha mirado.
 * - `accepted`: va a sonar.
 * - `discarded`: no, gracias. Deja de verla el invitado.
 * - `vetoed`: **no queremos oírla bajo ningún concepto.** Además de ocultarse,
 *   impide que nadie vuelva a proponerla.
 */
export const ESTADOS_CANCION = ['pending', 'accepted', 'discarded', 'vetoed'] as const;
export type EstadoCancion = (typeof ESTADOS_CANCION)[number];

export function esEstadoCancion(valor: unknown): valor is EstadoCancion {
  return typeof valor === 'string' && (ESTADOS_CANCION as readonly string[]).includes(valor);
}

/** De dónde viene la canción: un invitado, su respuesta al RSVP o la pareja. */
export type OrigenCancion = 'guest' | 'rsvp' | 'couple';

export function esOrigenCancion(valor: unknown): valor is OrigenCancion {
  return valor === 'guest' || valor === 'rsvp' || valor === 'couple';
}

/** Una canción tal y como está guardada. `votes` son `guestId`: no salen del servidor. */
export interface CancionGuardada {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly suggestedBy: string;
  readonly source: OrigenCancion;
  readonly votes: readonly string[];
  readonly status: EstadoCancion;
}

/** Una canción tal y como la ve el invitado: sin quién votó ni quién la propuso. */
export interface CancionPublica {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly votos: number;
  readonly votadaPorMi: boolean;
  readonly mia: boolean;
}

export function limpiarTexto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, ' ').trim().slice(0, maximo);
}

/**
 * Lo que identifica a una canción: título y artista sin tildes, sin mayúsculas,
 * sin signos y sin lo que va entre paréntesis («(Remastered 2011)», «[Live]»).
 *
 * «Mr. Brightside», «mr brightside» y «Mr Brightside (Live)» son la misma
 * canción; dos votos repartidos entre ellas harían que ninguna llegue a lo
 * alto de la lista.
 */
export function claveDeTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * ¿Es la misma canción?
 *
 * El título tiene que coincidir. El artista, si **los dos** lo tienen: quien
 * pide «Despacito» a secas es el mismo que quien pide «Despacito — Luis
 * Fonsi», y exigir el artista dejaría las dos en la lista.
 */
export function mismaCancion(
  a: { readonly title: string; readonly artist: string },
  b: { readonly title: string; readonly artist: string },
): boolean {
  const ta = claveDeTexto(a.title);
  if (ta === '' || ta !== claveDeTexto(b.title)) return false;

  const aa = claveDeTexto(a.artist);
  const ab = claveDeTexto(b.artist);
  return aa === '' || ab === '' || aa === ab;
}

/** Lee una canción de Firestore. Lo que no tiene título no es una canción. */
export function leerCancion(id: string, datos: unknown): CancionGuardada | null {
  if (datos === null || typeof datos !== 'object') return null;
  const d = datos as Record<string, unknown>;

  const title = limpiarTexto(d['title'], MAX_TITULO);
  if (id === '' || title === '') return null;

  const votes = Array.isArray(d['votes'])
    ? [...new Set(d['votes'].filter((v): v is string => typeof v === 'string' && v !== ''))]
    : [];

  return {
    id,
    title,
    artist: limpiarTexto(d['artist'], MAX_ARTISTA),
    suggestedBy: typeof d['suggestedBy'] === 'string' ? d['suggestedBy'] : '',
    source: esOrigenCancion(d['source']) ? d['source'] : 'guest',
    votes,
    status: esEstadoCancion(d['status']) ? d['status'] : 'pending',
  };
}

export type DecisionDeAlta =
  | { readonly accion: 'crear' }
  /** Ya estaba: en vez de duplicarla, se suma el voto de quien la pide. */
  | { readonly accion: 'votar'; readonly id: string }
  /** Vetada o descartada. El invitado no distingue cuál de las dos. */
  | { readonly accion: 'no-disponible' }
  | { readonly accion: 'incompleta' }
  | { readonly accion: 'tope-invitado' }
  | { readonly accion: 'tope-lista' };

/**
 * Qué hacer cuando un invitado propone una canción.
 *
 * El orden importa. Primero se mira si ya está —aunque el invitado haya
 * llegado a su tope: sumar un voto no es proponer nada— y solo después los
 * topes, que cuentan canciones **nuevas**.
 */
export function decidirAlta(
  existentes: readonly CancionGuardada[],
  guestId: string,
  titulo: unknown,
  artista: unknown,
): DecisionDeAlta {
  const title = limpiarTexto(titulo, MAX_TITULO);
  const artist = limpiarTexto(artista, MAX_ARTISTA);
  if (claveDeTexto(title) === '') return { accion: 'incompleta' };

  const igual = existentes.find((c) => mismaCancion(c, { title, artist }));
  if (igual) {
    if (igual.status === 'vetoed' || igual.status === 'discarded') {
      return { accion: 'no-disponible' };
    }
    return { accion: 'votar', id: igual.id };
  }

  const suyas = existentes.filter((c) => c.suggestedBy === guestId && c.source === 'guest');
  if (suyas.length >= MAX_PROPUESTAS_POR_INVITADO) return { accion: 'tope-invitado' };
  if (existentes.length >= MAX_CANCIONES) return { accion: 'tope-lista' };

  return { accion: 'crear' };
}

/** Pone o quita el voto de un invitado. Nunca lo cuenta dos veces. */
export function alternarVoto(votes: readonly string[], guestId: string): readonly string[] {
  return votes.includes(guestId) ? votes.filter((v) => v !== guestId) : [...votes, guestId];
}

/** Más votos primero; a igualdad, por título, para que la lista no baile. */
export function porVotos(
  a: { readonly votos: number; readonly title: string },
  b: { readonly votos: number; readonly title: string },
): number {
  return b.votos - a.votos || a.title.localeCompare(b.title, 'es');
}

/**
 * La lista que ve un invitado: sin lo descartado ni lo vetado y sin ningún
 * `guestId`. Quién ha votado qué no es asunto de los demás invitados.
 */
export function cancionesParaInvitado(
  existentes: readonly CancionGuardada[],
  guestId: string,
): readonly CancionPublica[] {
  return existentes
    .filter((c) => c.status === 'pending' || c.status === 'accepted')
    .map((c) => ({
      id: c.id,
      title: c.title,
      artist: c.artist,
      votos: c.votes.length,
      votadaPorMi: c.votes.includes(guestId),
      mia: c.suggestedBy === guestId,
    }))
    .sort(porVotos);
}

/** Lo que vuelve del servidor, comprobado antes de pintarlo (D-19). */
export function sanearCancionesServidas(valor: unknown): readonly CancionPublica[] {
  if (!Array.isArray(valor)) return [];

  const salida: CancionPublica[] = [];
  const vistas = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;
    const c = crudo as Record<string, unknown>;

    const id = typeof c['id'] === 'string' ? c['id'] : '';
    const title = limpiarTexto(c['title'], MAX_TITULO);
    if (id === '' || title === '' || vistas.has(id)) continue;

    vistas.add(id);
    salida.push({
      id,
      title,
      artist: limpiarTexto(c['artist'], MAX_ARTISTA),
      votos:
        typeof c['votos'] === 'number' && Number.isFinite(c['votos']) && c['votos'] > 0
          ? Math.floor(c['votos'])
          : 0,
      votadaPorMi: c['votadaPorMi'] === true,
      mia: c['mia'] === true,
    });
  }

  return salida.sort(porVotos).slice(0, MAX_CANCIONES);
}

/**
 * De lo que escribe un invitado en «¿qué canción no puede faltar?» a canciones.
 *
 * Es una caja de texto libre, así que se acepta lo que la gente escribe de
 * verdad: «Despacito», «Despacito - Luis Fonsi», «Hello by Adele», o varias en
 * líneas o separadas por punto y coma. «de» **no** separa título y artista:
 * está dentro de demasiados títulos («Se fue de viaje») para fiarse de él. Como mucho tres: quien
 * pega una lista de veinte no está pidiendo una canción.
 */
export function cancionesDeTexto(
  valor: unknown,
): readonly { readonly title: string; readonly artist: string }[] {
  if (typeof valor !== 'string') return [];

  const salida: { title: string; artist: string }[] = [];

  for (const linea of valor.split(/[\n;]+/)) {
    const limpia = linea.trim();
    if (limpia === '') continue;

    const partido = limpia.match(/^(.+?)\s+(?:-|–|—|by)\s+(.+)$/i);
    const title = limpiarTexto(partido ? partido[1] : limpia, MAX_TITULO);
    const artist = limpiarTexto(partido ? partido[2] : '', MAX_ARTISTA);

    if (claveDeTexto(title) !== '') salida.push({ title, artist });
    if (salida.length === 3) break;
  }

  return salida;
}
