/**
 * El instante exacto de la boda, a partir del día, la hora y la zona.
 *
 * Una boda no ocurre en un instante universal: ocurre **a las cinco de la tarde
 * en Cádiz**. Eso son dos datos distintos —una hora de reloj y una zona— y solo
 * juntos producen el momento contra el que cuenta la cuenta atrás.
 *
 * Sin librería de zonas horarias. `Intl.DateTimeFormat` ya sabe la regla de
 * cada zona, incluido el cambio de hora, y viene en el navegador: meter una
 * librería de zonas en el bundle que abre el invitado desde el móvil sería
 * pagar 30 kB por algo que ya está ahí.
 *
 * **Invariante de `weddingDate`**: se guarda como el Timestamp de la
 * medianoche **UTC** del día de la boda, porque nace de un `<input type="date">`
 * («2027-06-12») que `new Date()` interpreta en UTC. Por eso el día se extrae
 * con los getters UTC. Si algún día se guarda de otra forma, este fichero y su
 * test son lo primero que se entera.
 */

/**
 * Cuántos milisegundos va la zona por delante de UTC en ese instante.
 *
 * Se mide preguntándole a `Intl` qué hora de reloj marca la zona en ese
 * instante y comparándola con la hora UTC. Es la forma de averiguar el desfase
 * sin tablas propias, y sale bien también en los días que cambian la hora.
 */
function desfase(instante: Date, zona: string): number {
  let partes: Intl.DateTimeFormatPart[];
  try {
    partes = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(instante);
  } catch {
    // Zona desconocida o corrupta: se trata como UTC. Una boda no se queda sin
    // cuenta atrás porque alguien escribiera mal el nombre de una zona.
    return 0;
  }

  const p: Record<string, string> = {};
  for (const parte of partes) p[parte.type] = parte.value;

  const comoSiFueraUtc = Date.UTC(
    Number(p['year']),
    Number(p['month']) - 1,
    Number(p['day']),
    // `hour12: false` puede devolver 24 para la medianoche en algunos motores.
    Number(p['hour']) % 24,
    Number(p['minute']),
    Number(p['second']),
  );

  return comoSiFueraUtc - instante.getTime();
}

/** `'17:30'` → `{ horas: 17, minutos: 30 }`. `null` si no es una hora. */
export function horaDeReloj(valor: unknown): { horas: number; minutos: number } | null {
  if (typeof valor !== 'string') return null;

  const coincide = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
  if (!coincide) return null;

  const horas = Number(coincide[1]);
  const minutos = Number(coincide[2]);
  if (horas > 23 || minutos > 59) return null;

  return { horas, minutos };
}

/**
 * El instante de la boda. `null` si no hay día.
 *
 * Sin hora fijada devuelve la medianoche local de ese día, que es lo único
 * honesto que se puede decir: quien la use debe contar solo días. Lo marca
 * `cuentaAtras` con `conHora`.
 */
export function instanteDeBoda(dia: Date | null, hora: unknown, zona: string): Date | null {
  if (!dia || Number.isNaN(dia.getTime())) return null;

  const reloj = horaDeReloj(hora) ?? { horas: 0, minutos: 0 };

  // El día, en UTC: ver el invariante de la cabecera.
  const aproximado = Date.UTC(
    dia.getUTCFullYear(),
    dia.getUTCMonth(),
    dia.getUTCDate(),
    reloj.horas,
    reloj.minutos,
  );

  // Dos pasadas. La primera acierta siempre salvo en el fin de semana en que
  // cambia la hora, donde el desfase medido en el instante aproximado no es el
  // que rige en el instante bueno; la segunda lo corrige.
  const primera = aproximado - desfase(new Date(aproximado), zona);
  const segunda = aproximado - desfase(new Date(primera), zona);

  return new Date(segunda);
}
