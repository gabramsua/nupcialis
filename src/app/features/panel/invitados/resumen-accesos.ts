import type { EntradaDeAcceso } from '../../../core/invitados/accesos-gateway';

/**
 * El registro de accesos, ordenado para que se pueda leer.
 *
 * Todo lo de aquí es cálculo puro sobre lo que devuelve el servidor: ni pide
 * nada, ni sabe de Angular, ni escribe texto visible —las etiquetas salen de
 * los ficheros de traducción, así que esto devuelve *qué* día es, no cómo se
 * llama—.
 *
 * Dos preguntas, que son las que trae la pareja:
 *
 * 1. «¿Ha abierto fulano la invitación?» → la lista por días.
 * 2. «¿Se está usando mi enlace de más?» → el aviso de varios aparatos.
 */

/**
 * A partir de cuántos aparatos distintos se avisa.
 *
 * Dos no dicen nada: el móvil y el ordenador de casa son dos, y eso lo tiene
 * cualquiera. Tres ya es una invitación que anda circulando —el iPhone de la
 * tía, el Android del primo y el Windows de alguien—, que es exactamente lo
 * que D-34 quería poder ver. Por debajo de tres, callar: un aviso que salta
 * siempre no lo lee nadie.
 */
export const AVISO_DISPOSITIVOS = 3;

/** Cómo se llama a quien entró. El mote manda: es como lo llama la pareja. */
export function quien(entrada: EntradaDeAcceso): string {
  return entrada.mote !== '' ? entrada.mote : entrada.nombre;
}

export type Dia =
  | { readonly cuando: 'hoy' }
  | { readonly cuando: 'ayer' }
  | { readonly cuando: 'fecha'; readonly fecha: Date };

export interface GrupoDeDia {
  /** `2026-11-13`, en hora local. Sirve de clave en el `@for`. */
  readonly clave: string;
  readonly dia: Dia;
  readonly entradas: readonly EntradaDeAcceso[];
}

/** `2026-11-13` en la hora del que mira, no en UTC. */
function claveDeDia(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Agrupa por día, de lo más reciente a lo más antiguo.
 *
 * El día se calcula **en la hora del que mira**: una entrada de las once de la
 * noche no puede aparecer en «mañana» porque en Londres ya lo sea.
 */
export function agruparPorDia(
  entradas: readonly EntradaDeAcceso[],
  ahora: Date = new Date(),
): readonly GrupoDeDia[] {
  const hoy = claveDeDia(ahora);
  const ayer = claveDeDia(new Date(ahora.getTime() - 24 * 60 * 60 * 1000));

  const porDia = new Map<string, { fecha: Date; entradas: EntradaDeAcceso[] }>();

  for (const entrada of [...entradas].sort((a, b) => b.cuando.localeCompare(a.cuando))) {
    const fecha = new Date(entrada.cuando);
    const clave = claveDeDia(fecha);

    const grupo = porDia.get(clave);
    if (grupo) grupo.entradas.push(entrada);
    else porDia.set(clave, { fecha, entradas: [entrada] });
  }

  return [...porDia.entries()].map(([clave, grupo]) => ({
    clave,
    dia:
      clave === hoy
        ? ({ cuando: 'hoy' } as const)
        : clave === ayer
          ? ({ cuando: 'ayer' } as const)
          : ({ cuando: 'fecha', fecha: grupo.fecha } as const),
    entradas: grupo.entradas,
  }));
}

export interface InvitadoConVariosAparatos {
  readonly guestId: string;
  readonly nombre: string;
  readonly dispositivos: readonly string[];
}

export interface ResumenDeAccesos {
  readonly entradas: number;
  /** Cuántos invitados distintos han entrado alguna vez. */
  readonly invitados: number;
  /** Los que han entrado desde `AVISO_DISPOSITIVOS` aparatos o más. */
  readonly avisos: readonly InvitadoConVariosAparatos[];
}

/**
 * Las cuentas de arriba.
 *
 * Los aparatos sin reconocer no cuentan para el aviso: un `user-agent` raro no
 * puede acabar acusando a nadie de haber reenviado su invitación.
 */
export function resumirAccesos(entradas: readonly EntradaDeAcceso[]): ResumenDeAccesos {
  const porInvitado = new Map<string, { nombre: string; dispositivos: Set<string> }>();

  for (const entrada of entradas) {
    const suyo = porInvitado.get(entrada.guestId) ?? {
      nombre: quien(entrada),
      dispositivos: new Set<string>(),
    };
    if (entrada.dispositivo !== '') suyo.dispositivos.add(entrada.dispositivo);
    porInvitado.set(entrada.guestId, suyo);
  }

  const avisos = [...porInvitado.entries()]
    .filter(([, suyo]) => suyo.dispositivos.size >= AVISO_DISPOSITIVOS)
    .map(([guestId, suyo]) => ({
      guestId,
      nombre: suyo.nombre,
      dispositivos: [...suyo.dispositivos].sort((a, b) => a.localeCompare(b, 'es')),
    }))
    .sort((a, b) => b.dispositivos.length - a.dispositivos.length);

  return { entradas: entradas.length, invitados: porInvitado.size, avisos };
}
