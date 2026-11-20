import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import type { Invitado } from '../../../core/invitados/invitados-gateway';
import { modulosNoVisibles, type BodaDelPanel } from '../boda';

/**
 * Qué le falta a la pareja, calculado a partir de lo que ya sabemos.
 *
 * No es una lista de tareas que ellos escriben —eso es el módulo `checklist`,
 * que va en F4—: es **lo que este producto puede ver que está a medias**. La
 * diferencia importa, porque esta lista se vacía sola según van haciendo cosas
 * y nunca les pide que la mantengan.
 *
 * Todo lo de aquí es cálculo puro: ni pide datos, ni sabe de Angular, ni
 * escribe texto visible. Devuelve **qué** falta; cómo se dice está en los
 * ficheros de traducción.
 *
 * El orden es el de lo que más duele si se queda sin hacer, y está pensado
 * para leerse de arriba abajo en un móvil: lo primero es lo siguiente que hay
 * que tocar.
 */

export type ClavePendiente =
  /** Sin fecha no hay cuenta atrás, ni plazo de confirmación, ni nada. */
  | 'fecha'
  /** La web sigue en borrador: nadie puede verla todavía. */
  | 'publicar'
  /** No hay invitados cargados: el resto del panel no sirve de nada aún. */
  | 'invitados'
  /** Hay módulos encendidos que el invitado no ve. Explica la web «vacía». */
  | 'ocultos'
  /** Falta la foto de portada, que es la primera pantalla de la web. */
  | 'portada'
  /** Hay invitados que no han abierto nunca la invitación. */
  | 'sin-entrar'
  /** Hay invitados que no han contestado. */
  | 'sin-contestar';

export interface Pendiente {
  readonly clave: ClavePendiente;
  readonly icono: NpIconName;
  /** A dónde lleva. Siempre lleva a algún sitio: un aviso sin salida estorba. */
  readonly ruta: string;
  /** El número del que habla, cuando lo hay. */
  readonly cuantos: number;
}

export interface CifrasDelPanel {
  readonly invitados: number;
  readonly confirmados: number;
  readonly sinContestar: number;
  /** Cuántos han abierto la web alguna vez. Es el otro número que preguntan. */
  readonly hanEntrado: number;
}

export function cifras(invitados: readonly Invitado[]): CifrasDelPanel {
  return {
    invitados: invitados.length,
    confirmados: invitados.filter((i) => i.rsvpStatus === 'confirmed').length,
    sinContestar: invitados.filter((i) => i.rsvpStatus === 'pending').length,
    hanEntrado: invitados.filter((i) => i.loginCount > 0).length,
  };
}

/**
 * Lo que falta, en orden.
 *
 * Con la lista de invitados vacía no se avisa de que nadie ha contestado ni de
 * que nadie ha entrado: es verdad, pero no es lo que hay que hacer ahora, y
 * tres avisos que dicen lo mismo esconden el que importa.
 */
export function pendientes(
  boda: BodaDelPanel | null,
  invitados: readonly Invitado[],
): readonly Pendiente[] {
  if (!boda) return [];

  const lista: Pendiente[] = [];
  const cuenta = cifras(invitados);

  if (boda.weddingDate === null) {
    lista.push({ clave: 'fecha', icono: 'calendar', ruta: '/panel/datos', cuantos: 0 });
  }

  if (boda.status === 'draft') {
    lista.push({ clave: 'publicar', icono: 'eye-slash', ruta: '/panel/datos', cuantos: 0 });
  }

  if (cuenta.invitados === 0) {
    lista.push({ clave: 'invitados', icono: 'users', ruta: '/panel/guests/importar', cuantos: 0 });
    return lista;
  }

  const ocultos = modulosNoVisibles(boda);
  if (ocultos > 0) {
    lista.push({ clave: 'ocultos', icono: 'eye-slash', ruta: '/panel/web', cuantos: ocultos });
  }

  if (boda.heroImageUrl === null) {
    lista.push({ clave: 'portada', icono: 'images', ruta: '/panel/diseno', cuantos: 0 });
  }

  if (cuenta.hanEntrado < cuenta.invitados) {
    lista.push({
      clave: 'sin-entrar',
      icono: 'envelope',
      ruta: '/panel/guests',
      cuantos: cuenta.invitados - cuenta.hanEntrado,
    });
  }

  if (cuenta.sinContestar > 0) {
    lista.push({
      clave: 'sin-contestar',
      icono: 'clock-countdown',
      ruta: '/panel/guests',
      cuantos: cuenta.sinContestar,
    });
  }

  return lista;
}

/**
 * Cuántos días quedan, contando días enteros.
 *
 * `0` es hoy y los negativos son una boda que ya pasó, que también hay que
 * saber decirlo: el panel sigue abierto después, y una cuenta atrás en
 * negativo es un error que se ve enseguida.
 */
export function diasParaLaBoda(fecha: Date | null, hoy: Date = new Date()): number | null {
  if (!fecha || Number.isNaN(fecha.getTime())) return null;

  const dia = 24 * 60 * 60 * 1000;
  const medianocheDeHoy = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const medianocheDeLaBoda = Date.UTC(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
  );

  return Math.round((medianocheDeLaBoda - medianocheDeHoy) / dia);
}
