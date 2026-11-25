/**
 * Autobuses para llegar al banquete y volver (D-63).
 *
 * **Copia literal** de `functions/src/dominio/autobuses.ts`, de la línea marcadora de ahí abajo
 * hasta el final. No se edita solo este fichero: se editan los dos, o el test
 * de la copia falla.
 *
 * Como el dress code, no es una colección: son pocas rutas por boda y viven en
 * `modules.buses.config.rutas`, dentro del documento de la boda.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_RUTAS = 12;
export const MAX_NOMBRE_RUTA = 60;
export const MAX_LUGAR_RUTA = 120;
export const MAX_NOTA_RUTA = 300;

/** Hacia dónde va el autobús: al banquete o de vuelta a casa. */
export const SENTIDOS_AUTOBUS = ['ida', 'vuelta'] as const;

export type SentidoAutobus = (typeof SENTIDOS_AUTOBUS)[number];

export function esSentidoAutobus(valor: unknown): valor is SentidoAutobus {
  return typeof valor === 'string' && (SENTIDOS_AUTOBUS as readonly string[]).includes(valor);
}

/**
 * Una ruta de autobús tal y como llega a la web pública.
 *
 * Es **información**, no una reserva: el invitado sabe de dónde sale, a qué
 * hora y adónde va, y nada más. Si algún día hace falta apuntarse, será otro
 * módulo.
 */
export interface RutaAutobus {
  readonly id: string;
  readonly sentido: SentidoAutobus;
  /** «Autobús 1», «Desde Sevilla»… Opcional: sin nombre se pinta solo el trayecto. */
  readonly nombre: string;
  /** Dónde se coge. */
  readonly salida: string;
  /** `HH:MM` o vacío si aún no se sabe. */
  readonly hora: string;
  /** Adónde lleva. */
  readonly destino: string;
  readonly nota: string;
}

export const AUTOBUSES_VACIO: readonly RutaAutobus[] = [];

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

/** `H:MM` o `HH:MM` válidas, normalizadas a `HH:MM`; lo demás, vacío. */
export function horaDeAutobus(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  const coincide = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
  if (!coincide) return '';
  const horas = Number(coincide[1]);
  const minutos = Number(coincide[2]);
  if (horas > 23 || minutos > 59) return '';
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/**
 * Deja la lista de rutas publicable. Nunca lanza.
 *
 * Sin salida o sin destino no es una ruta: el invitado no tendría qué hacer
 * con ella. La hora, el nombre y la nota son opcionales a propósito —la pareja
 * apunta lo que sabe y completa después—. Salen primero las de ida, y dentro
 * de cada sentido por hora (las que aún no la tienen, al final).
 */
export function sanearAutobuses(valor: unknown): readonly RutaAutobus[] {
  if (!Array.isArray(valor)) return AUTOBUSES_VACIO;

  const rutas: RutaAutobus[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const r = crudo as Record<string, unknown>;
    const id = texto(r['id'], 60);
    const salida = texto(r['salida'], MAX_LUGAR_RUTA);
    const destino = texto(r['destino'], MAX_LUGAR_RUTA);

    if (id === '' || vistos.has(id) || salida === '' || destino === '') continue;

    vistos.add(id);
    rutas.push({
      id,
      sentido: esSentidoAutobus(r['sentido']) ? r['sentido'] : 'ida',
      nombre: texto(r['nombre'], MAX_NOMBRE_RUTA),
      salida,
      hora: horaDeAutobus(r['hora']),
      destino,
      nota: texto(r['nota'], MAX_NOTA_RUTA),
    });
  }

  return rutas
    .map((ruta, indice) => ({ ruta, indice }))
    .sort((a, b) => {
      if (a.ruta.sentido !== b.ruta.sentido) return a.ruta.sentido === 'ida' ? -1 : 1;
      if (a.ruta.hora !== b.ruta.hora) {
        if (a.ruta.hora === '') return 1;
        if (b.ruta.hora === '') return -1;
        return a.ruta.hora.localeCompare(b.ruta.hora);
      }
      return a.indice - b.indice;
    })
    .map(({ ruta }) => ruta)
    .slice(0, MAX_RUTAS);
}

/** Si hay algo que enseñar. */
export function tieneAutobuses(rutas: readonly RutaAutobus[]): boolean {
  return rutas.length > 0;
}
