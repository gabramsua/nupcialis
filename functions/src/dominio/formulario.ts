/**
 * El formulario de confirmación, sin Firestore y sin HTTP.
 *
 * Aquí vive lo que decide **qué se pregunta, qué vale como respuesta y qué se
 * guarda**. Está aparte porque son las tres cosas del RSVP que no se pueden
 * comprobar mirando una pantalla: una pregunta condicional mal resuelta se nota
 * cuando un invitado que no viene ha elegido menú, y un `mapsTo` mal aplicado se
 * nota cuando alguien se ha quedado sin acceso a la web.
 *
 * **La regla que gobierna este fichero.** Las preguntas las escribe la pareja
 * (`formQuestions` es suya), así que son datos de entrada, no código de
 * confianza. Una pregunta con `mapsTo: 'active'` no puede sacar a nadie de la
 * boda, y una con `mapsTo: 'groupIds'` no puede meter a nadie en el grupo de las
 * fotos restringidas. Por eso `mapsTo` **no se aplica, se traduce**: solo los
 * campos de `CAMPOS_MAPEABLES` llegan al invitado, cada uno con su tipo, y todo
 * lo demás se ignora en silencio.
 */

import type { OpcionPregunta, PreguntaFormulario } from './semillas';

export type { OpcionPregunta, PreguntaFormulario };

/** Una pregunta tal y como está guardada: la clave es el id del documento. */
export interface Pregunta extends Omit<PreguntaFormulario, 'key'> {
  readonly id: string;
}

export type TipoPregunta = Pregunta['type'];
export type Destinatario = Pregunta['target'];

export type Respuestas = Readonly<Record<string, unknown>>;

/** Topes de texto. Generosos para un mensaje a los novios, no infinitos. */
export const MAX_TEXTO = 200;
export const MAX_TEXTO_LARGO = 1000;
/** Un número que nadie va a escribir en una boda, pero que cierra la puerta. */
export const MAX_NUMERO = 1_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// Lo que llega de Firestore
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS = [
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'number',
  'date',
  'boolean',
] as const;

const DESTINOS = ['guest', 'companion', 'both'] as const;

export function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function opciones(valor: unknown): readonly OpcionPregunta[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((cruda) => {
    if (cruda === null || typeof cruda !== 'object') return [];
    const o = cruda as Record<string, unknown>;
    const value = texto(o['value']);
    return value === '' ? [] : [{ value, label: texto(o['label']) || value }];
  });
}

function condicion(valor: unknown): Pregunta['visibleIf'] {
  if (valor === null || typeof valor !== 'object') return null;
  const c = valor as Record<string, unknown>;
  const questionId = texto(c['questionId']);
  return questionId === '' ? null : { questionId, equals: c['equals'] ?? null };
}

/**
 * Una pregunta tal y como está en Firestore, saneada.
 *
 * Un tipo que no conocemos pasa a `text`: el documento está raro, pero un campo
 * de texto siempre se puede contestar. Dejar la pregunta fuera sería peor —el
 * invitado no vería que le falta algo— y confiar en el valor, también.
 */
export function aPregunta(id: string, datos: Record<string, unknown>): Pregunta {
  const tipo = datos['type'];
  const destino = datos['target'];

  return {
    id,
    label: texto(datos['label']),
    helpText: texto(datos['helpText']),
    type: TIPOS.includes(tipo as Pregunta['type']) ? (tipo as Pregunta['type']) : 'text',
    options: opciones(datos['options']),
    required: datos['required'] === true,
    target: DESTINOS.includes(destino as Pregunta['target'])
      ? (destino as Pregunta['target'])
      : 'both',
    mapsTo: typeof datos['mapsTo'] === 'string' && datos['mapsTo'] !== '' ? datos['mapsTo'] : null,
    visibleIf: condicion(datos['visibleIf']),
    order: typeof datos['order'] === 'number' ? datos['order'] : 0,
    // Ausente es activa: las preguntas de fábrica se sembraron con el campo,
    // pero una añadida a mano sin él se tiene que poder contestar.
    enabled: datos['enabled'] !== false,
    isSystem: datos['isSystem'] === true,
  };
}

/**
 * Las respuestas guardadas, o ninguna.
 *
 * Un array donde se esperaba un mapa se descarta: `rsvpAnswers` lo escribe solo
 * el servidor, pero un documento de una versión anterior no tiene por qué
 * encajar y no vale la pena reventar el formulario por eso.
 */
export function respuestasGuardadas(valor: unknown): Respuestas {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Respuestas)
    : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// A quién se le pregunta
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las preguntas que le toca contestar a esta persona, ya ordenadas.
 *
 * Un acompañante no es un invitado de segunda: es un documento de invitado de
 * pleno derecho (§5.5) y hay preguntas que son para él —su menú— y otras que no
 * —si hace falta autobús lo dice el titular una vez—.
 */
export function preguntasPara(
  preguntas: readonly Pregunta[],
  esAcompanante: boolean,
): readonly Pregunta[] {
  const suyo: Destinatario = esAcompanante ? 'companion' : 'guest';

  return preguntas
    .filter((p) => p.enabled && (p.target === 'both' || p.target === suyo))
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibilidad condicional
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ¿Se le enseña esta pregunta, con lo que ha contestado hasta ahora?
 *
 * Se sigue la cadena hacia arriba: el menú depende de la asistencia, y si la
 * asistencia misma está oculta, el menú tampoco se pregunta. La cadena se corta
 * a la primera repetición, porque `visibleIf` lo escribe la pareja y dos
 * preguntas que se condicionan entre sí no pueden colgar el formulario.
 */
export function esVisible(
  pregunta: Pregunta,
  preguntas: readonly Pregunta[],
  respuestas: Respuestas,
): boolean {
  const porId = new Map(preguntas.map((p) => [p.id, p]));
  const vistas = new Set<string>();
  let actual: Pregunta | undefined = pregunta;

  while (actual) {
    if (vistas.has(actual.id)) return false;
    vistas.add(actual.id);

    const condicion = actual.visibleIf;
    if (!condicion) return true;

    const padre = porId.get(condicion.questionId);
    // Condición que apunta a una pregunta que no existe o que no se le hace a
    // esta persona: no se enseña. Lo contrario enseñaría el menú a quien no ha
    // podido decir si viene.
    if (!padre) return false;
    if (!iguales(respuestas[condicion.questionId], condicion.equals)) return false;

    actual = padre;
  }

  return true;
}

/** Las preguntas que se le enseñan ahora mismo. */
export function visibles(
  preguntas: readonly Pregunta[],
  respuestas: Respuestas,
): readonly Pregunta[] {
  return preguntas.filter((p) => esVisible(p, preguntas, respuestas));
}

/**
 * Comparación de la condición.
 *
 * Tolerante con el `'true'` que llega de un `<select>` y con el número que llega
 * como texto, porque `equals` lo escribe la pareja y un desplegable del panel no
 * tiene por qué guardar el tipo exacto.
 */
function iguales(respuesta: unknown, esperado: unknown): boolean {
  if (respuesta === esperado) return true;
  if (typeof esperado === 'boolean') return booleano(respuesta) === esperado;
  if (Array.isArray(respuesta)) return respuesta.some((v) => iguales(v, esperado));
  if (respuesta === null || respuesta === undefined || esperado === null) return false;
  return String(respuesta) === String(esperado);
}

function booleano(valor: unknown): boolean | null {
  if (typeof valor === 'boolean') return valor;
  if (valor === 'true' || valor === 'si' || valor === 'sí') return true;
  if (valor === 'false' || valor === 'no') return false;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación
// ─────────────────────────────────────────────────────────────────────────────

export type MotivoFallo = 'obligatoria' | 'tipo' | 'opcion' | 'largo' | 'rango' | 'fecha';

export interface FalloRespuesta {
  readonly questionId: string;
  readonly motivo: MotivoFallo;
}

export type Validacion =
  | { readonly ok: true; readonly respuestas: Record<string, unknown> }
  | { readonly ok: false; readonly fallos: readonly FalloRespuesta[] };

/**
 * Valida y **limpia** lo que ha mandado el invitado.
 *
 * Devuelve las respuestas ya saneadas y nada más: lo que no se pregunta no se
 * guarda. Esto no es higiene, es lo que evita que alguien que dice que no viene
 * se quede con un menú elegido de la vez anterior, o que una respuesta a una
 * pregunta que la pareja ha borrado siga viva en el documento.
 *
 * El orden importa: primero se decide qué es visible con lo que ha mandado, y
 * solo lo visible se valida. Una pregunta oculta nunca es obligatoria.
 */
export function validarRespuestas(
  preguntas: readonly Pregunta[],
  enviadas: Respuestas,
  esAcompanante = false,
  /**
   * `false` solo cuando contesta la pareja **por** el invitado: la abuela le
   * dice por teléfono que sí viene y no se sabe aún qué menú querrá. Lo que se
   * contesta se valida igual de estricto; lo que falta no es un fallo.
   */
  exigirObligatorias = true,
): Validacion {
  const suyas = preguntasPara(preguntas, esAcompanante);
  const aVista = visibles(suyas, enviadas);

  const fallos: FalloRespuesta[] = [];
  const limpias: Record<string, unknown> = {};

  for (const pregunta of aVista) {
    const resultado = validarUna(pregunta, enviadas[pregunta.id]);

    if ('motivo' in resultado) {
      if (resultado.motivo === 'obligatoria' && !exigirObligatorias) continue;
      fallos.push({ questionId: pregunta.id, motivo: resultado.motivo });
      continue;
    }
    // `undefined` no se guarda: Firestore no lo acepta y una pregunta opcional
    // sin contestar es justo eso, no una respuesta vacía.
    if (resultado.valor !== undefined) limpias[pregunta.id] = resultado.valor;
  }

  return fallos.length > 0 ? { ok: false, fallos } : { ok: true, respuestas: limpias };
}

type Limpia = { readonly valor: unknown } | { readonly motivo: MotivoFallo };

function validarUna(pregunta: Pregunta, valor: unknown): Limpia {
  const vacia =
    valor === undefined ||
    valor === null ||
    valor === '' ||
    (Array.isArray(valor) && valor.length === 0);

  if (vacia) return pregunta.required ? { motivo: 'obligatoria' } : { valor: undefined };

  switch (pregunta.type) {
    case 'text':
    case 'textarea': {
      if (typeof valor !== 'string') return { motivo: 'tipo' };
      const texto = valor.trim();
      if (texto === '') return pregunta.required ? { motivo: 'obligatoria' } : { valor: undefined };
      const tope = pregunta.type === 'text' ? MAX_TEXTO : MAX_TEXTO_LARGO;
      return texto.length > tope ? { motivo: 'largo' } : { valor: texto };
    }

    case 'select':
    case 'radio': {
      if (typeof valor !== 'string') return { motivo: 'tipo' };
      return pregunta.options.some((o) => o.value === valor) ? { valor } : { motivo: 'opcion' };
    }

    case 'checkbox': {
      if (!Array.isArray(valor)) return { motivo: 'tipo' };
      if (valor.some((v) => typeof v !== 'string')) return { motivo: 'tipo' };
      const elegidas = [...new Set(valor as string[])];
      const validas = elegidas.every((v) => pregunta.options.some((o) => o.value === v));
      return validas ? { valor: elegidas } : { motivo: 'opcion' };
    }

    case 'number': {
      const numero = typeof valor === 'number' ? valor : Number(valor);
      if (typeof valor !== 'number' && typeof valor !== 'string') return { motivo: 'tipo' };
      if (!Number.isFinite(numero)) return { motivo: 'tipo' };
      return Math.abs(numero) > MAX_NUMERO ? { motivo: 'rango' } : { valor: numero };
    }

    case 'date': {
      if (typeof valor !== 'string') return { motivo: 'tipo' };
      return esFechaISO(valor) ? { valor } : { motivo: 'fecha' };
    }

    case 'boolean': {
      const si = booleano(valor);
      return si === null ? { motivo: 'tipo' } : { valor: si };
    }

    default:
      // Tipo que no conocemos: la pareja no lo ha podido elegir, así que el
      // documento está corrupto. No se guarda y no se da por bueno.
      return { motivo: 'tipo' };
  }
}

/** `YYYY-MM-DD`, y que el día exista: `2027-02-31` no es una fecha. */
export function esFechaISO(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

// ─────────────────────────────────────────────────────────────────────────────
// mapsTo: de respuesta a campo del invitado
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Los únicos campos del invitado que una respuesta puede tocar.
 *
 * **Lista blanca a propósito.** `mapsTo` sale de un documento que escribe la
 * pareja; sin esta lista, una pregunta con `mapsTo: 'active'` dejaría a alguien
 * fuera de la web al contestar, y una con `mapsTo: 'groupIds'` lo metería en el
 * grupo de las fotos restringidas. Añadir un campo aquí es una decisión, no un
 * detalle: lo que esté en esta lista lo puede cambiar el invitado desde su
 * móvil.
 *
 * Está al mínimo a propósito: son los cinco campos que algo lee hoy —el estado,
 * el menú y las alergias para el catering, el autobús y el alojamiento para la
 * logística—. La canción y el mensaje a los novios viven en `rsvpAnswers` y no
 * necesitan campo propio hasta que la lista de reproducción (F3) los lea.
 */
export const CAMPOS_MAPEABLES = {
  rsvpStatus: 'estado',
  menu: 'texto',
  allergies: 'texto',
  needsTransport: 'booleano',
  needsAccommodation: 'booleano',
} as const;

export type CampoMapeable = keyof typeof CAMPOS_MAPEABLES;

export type EstadoRsvp = 'pending' | 'confirmed' | 'declined';

export interface CamposDelInvitado {
  rsvpStatus?: EstadoRsvp;
  menu?: string;
  allergies?: string;
  needsTransport?: boolean;
  needsAccommodation?: boolean;
}

/**
 * Traduce las respuestas a campos del invitado.
 *
 * Es lo que mantiene en pie al resto del producto (§5.8): la pareja puede
 * reordenar y reetiquetar las preguntas, pero la respuesta del menú sigue
 * aterrizando en `guests.menu`, y por eso la exportación al catering y los
 * filtros del panel siguen funcionando.
 *
 * Solo mira las preguntas **visibles y contestadas**: si alguien dice que no
 * viene, su menú de la vez anterior no se arrastra.
 */
export function camposDelInvitado(
  preguntas: readonly Pregunta[],
  respuestas: Respuestas,
): CamposDelInvitado {
  const salida: Record<string, unknown> = {};

  for (const pregunta of visibles(preguntas, respuestas)) {
    // Dos candados sobre el mismo campo, a propósito: esta comprobación, y que
    // el `switch` de abajo no tenga rama por defecto. Quitar uno no cambia el
    // comportamiento —ninguna prueba se enteraría—, así que si tocas esto,
    // mantén los dos.
    const campo = pregunta.mapsTo;
    if (campo === null || !(campo in CAMPOS_MAPEABLES)) continue;

    const valor = respuestas[pregunta.id];
    if (valor === undefined) continue;

    switch (CAMPOS_MAPEABLES[campo as CampoMapeable]) {
      case 'estado': {
        const si = booleano(valor);
        if (si !== null) salida[campo] = si ? 'confirmed' : 'declined';
        break;
      }
      case 'texto':
        salida[campo] = Array.isArray(valor) ? valor.join(', ') : String(valor);
        break;
      case 'booleano': {
        const si = booleano(valor);
        if (si !== null) salida[campo] = si;
        break;
      }
    }
  }

  return salida as CamposDelInvitado;
}

/**
 * El estado que queda tras contestar.
 *
 * Si no hay pregunta de asistencia —la pareja la ha desactivado—, el hecho de
 * mandar el formulario **es** la confirmación: nadie rellena el menú de una boda
 * a la que no va.
 */
export function estadoTrasEnviar(campos: CamposDelInvitado): EstadoRsvp {
  return campos.rsvpStatus ?? 'confirmed';
}

// ─────────────────────────────────────────────────────────────────────────────
// Fecha límite
// ─────────────────────────────────────────────────────────────────────────────

/** Cuántos días antes de la boda se cierra el formulario si la pareja no pone fecha (D-66). */
export const DIAS_PLAZO_POR_DEFECTO = 7;

/**
 * El plazo cuando la pareja no ha puesto uno: **una semana antes de la boda**.
 *
 * Con la boda encima ya no cambian ni el catering ni las mesas, así que
 * dejarlo abierto hasta el día es prometer algo que nadie va a poder cumplir.
 * La pareja lo puede mover poniendo su fecha.
 */
export function plazoPorDefecto(fechaBoda: Date): Date {
  return new Date(fechaBoda.getTime() - DIAS_PLAZO_POR_DEFECTO * 24 * 60 * 60 * 1000);
}

/**
 * ¿Se puede contestar todavía?
 *
 * El día del límite cuenta entero: una fecha límite es «hasta el 1 de junio»,
 * no «hasta las 00:00 del 1 de junio». Quien contesta esa noche llega a tiempo,
 * que es lo que esperaría cualquiera.
 */
export function plazoAbierto(limite: Date | null, ahora: Date): boolean {
  if (!limite) return true;
  const finDelDia = new Date(limite);
  finDelDia.setUTCHours(23, 59, 59, 999);
  return ahora.getTime() <= finDelDia.getTime();
}
