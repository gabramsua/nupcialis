/**
 * Fechas legibles, en el idioma de cada boda.
 *
 * **No se usa `DatePipe` de Angular.** El pipe necesita que los datos del idioma
 * estén registrados en el arranque con `registerLocaleData`, y lanza
 * `NG0701: Missing locale data` si no lo están. Eso no encaja aquí por dos
 * motivos, y el segundo costó una portada:
 *
 * 1. El idioma **llega en los datos** (`sitio.locale`), no en la compilación.
 *    Registrar por adelantado todos los idiomas posibles significa meterlos
 *    todos en el bundle que abre el invitado desde el móvil.
 * 2. Cuando falta, el pipe **lanza a mitad de render**. No deja un hueco: corta
 *    la plantilla por ahí. El 2026-09-16 la portada enseñaba los nombres y nada
 *    más —ni fecha ni cuenta atrás— porque el `@if` de la fecha reventaba y se
 *    llevaba por delante todo lo que venía detrás.
 *
 * `Intl.DateTimeFormat` lo trae el navegador, conoce todos los idiomas sin
 * añadir un byte, y aquí además no puede tumbar una página: ante un idioma que
 * no entiende, cae al español y sigue.
 */

const RESERVA = 'es';

/** Cachea los formateadores: crear uno por render es caro y no hace falta. */
const cache = new Map<string, Intl.DateTimeFormat>();

function formateador(locale: string, opciones: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const clave = `${locale}|${JSON.stringify(opciones)}`;
  const guardado = cache.get(clave);
  if (guardado) return guardado;

  let creado: Intl.DateTimeFormat;
  try {
    creado = new Intl.DateTimeFormat(locale, opciones);
  } catch {
    // `Intl` lanza `RangeError` con una etiqueta de idioma malformada. Un dato
    // corrupto en una boda no puede dejar sin fecha a sus invitados.
    creado = new Intl.DateTimeFormat(RESERVA, opciones);
  }

  cache.set(clave, creado);
  return creado;
}

/** «sábado, 12 de junio de 2027». La fecha de la portada. */
export function fechaLarga(fecha: Date | null, locale: string): string {
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  return formateador(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha);
}

/** «12 de junio de 2027». Para listados, donde el día de la semana estorba. */
export function fechaMedia(fecha: Date | null, locale: string): string {
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  return formateador(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha);
}
