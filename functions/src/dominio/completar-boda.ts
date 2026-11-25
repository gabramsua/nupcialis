/**
 * Poner al día una boda ya creada con lo que se añadió a la plataforma después.
 *
 * Una boda nace con `modules.*` y `content.sections` de su momento. Cuando el
 * producto gana un módulo (`story`, `budget`…) o una sección, las bodas
 * existentes no lo tienen: el panel no sabría qué estado darle y la web pública
 * no mostraría el cartel. Esto calcula **solo lo que falta**; lo que la pareja
 * ya decidió (un módulo apagado a propósito, una sección renombrada) no se toca.
 *
 * Pura y sin red: la callable solo lee, aplica esto y escribe.
 */

import {
  MODULOS,
  MODULOS_NUEVOS_EN_BASICO,
  modulosIniciales,
  type ConfigModulo,
  type Modulo,
  type Plan,
} from './planes';
import { MAX_SECCIONES, sanearSecciones, type Seccion } from './secciones';

export interface CambiosPendientes {
  /** Módulos que la boda no tenía, con su valor inicial según el plan. */
  readonly modulos: Partial<Record<Modulo, ConfigModulo>>;
  /** Lista completa de secciones si hay que añadir alguna; `null` si no. */
  readonly secciones: readonly Seccion[] | null;
}

function esPlan(valor: unknown): valor is Plan {
  return valor === 'basic' || valor === 'extended';
}

function tieneConfig(valor: unknown): boolean {
  return valor !== null && typeof valor === 'object';
}

export function cambiosPendientes(
  boda: Record<string, unknown>,
  /** Los módulos de cada plan tal como los tiene el superadmin (D-53). */
  porPlan?: Partial<Record<Plan, readonly Modulo[]>>,
): CambiosPendientes {
  const plan: Plan = esPlan(boda['plan']) ? boda['plan'] : 'basic';
  const actuales =
    boda['modules'] !== null && typeof boda['modules'] === 'object'
      ? (boda['modules'] as Record<string, unknown>)
      : {};

  const iniciales = modulosIniciales(plan, porPlan?.[plan]);
  const modulos: Partial<Record<Modulo, ConfigModulo>> = {};
  for (const modulo of MODULOS) {
    if (!tieneConfig(actuales[modulo])) modulos[modulo] = iniciales[modulo];
  }

  // D-63: el plan básico ganó tres módulos. En una boda básica anterior existen
  // apagados porque el plan no los traía, y la pareja no puede encenderlos (lo
  // que está encendido lo decide el plan, no ella): se encienden una vez. Es
  // idempotente, y solo si el plan los incluye de verdad ahora.
  if (plan === 'basic') {
    for (const modulo of MODULOS_NUEVOS_EN_BASICO) {
      const actual = actuales[modulo];
      const apagado =
        tieneConfig(actual) && (actual as Record<string, unknown>)['enabled'] !== true;
      if (apagado && iniciales[modulo].enabled) modulos[modulo] = iniciales[modulo];
    }
  }

  // D-65: un módulo encendido y oculto es un estado al que se llegaba sin querer
  // (el superadmin añadía el módulo al plan y la visibilidad se quedaba en
  // `hidden`) y del que la pareja no puede salir: no tiene mando para ello. Se
  // pone visible; «muy pronto» y lo visible no se tocan.
  for (const modulo of MODULOS) {
    const actual = actuales[modulo];
    if (!tieneConfig(actual)) continue;
    const c = actual as Record<string, unknown>;
    if (c['enabled'] === true && c['visibility'] === 'hidden') {
      modulos[modulo] = { enabled: true, visibility: 'visible' };
    }
  }

  return { modulos, secciones: seccionesCompletas(boda['content']) };
}

/**
 * Deja **una sola** sección «Nuestra historia», en forma de cartel.
 *
 * Antes de existir el cartel (tipo `historia`), «Nuestra historia» era una
 * sección de texto con id `historia`. Las bodas viejas la conservan, y el
 * parche que añadía el cartel les ponía **otro** al lado (`historia-nuestra`):
 * dos secciones con el mismo título en la web (D-54). Ahora:
 *
 * - si ya hay cartel **y** la sección de texto vieja, se quita la vieja (y el
 *   cartel queda encendido si cualquiera de las dos lo estaba);
 * - si solo está la de texto vieja, se **convierte** en cartel, sin moverla ni
 *   apagarla;
 * - si no hay ninguna, se añade el cartel, apagado y al final (es la pareja
 *   quien decide anunciarlo).
 *
 * Sin `content` (o sin lista) no se inventa nada: ya cae en las iniciales al
 * publicar. Es idempotente: una segunda pasada no cambia nada.
 */
function seccionesCompletas(contenido: unknown): readonly Seccion[] | null {
  if (contenido === null || typeof contenido !== 'object') return null;
  const crudas = (contenido as Record<string, unknown>)['sections'];
  if (!Array.isArray(crudas)) return null;

  const secciones = sanearSecciones(crudas);
  const conHistoria = historiaCompleta(secciones) ?? secciones;
  const conLibro = libroCompleto(conHistoria) ?? conHistoria;
  const conCortejo = cortejoCompleto(conLibro) ?? conLibro;
  const conBuses = busesCompleto(conCortejo) ?? conCortejo;
  const conRsvp = rsvpCompleto(conBuses) ?? conBuses;

  return conRsvp === secciones ? null : conRsvp;
}

/** Añade el cartel del libro de firmas (§8.15), apagado y al final, si no hay ninguno. */
function libroCompleto(secciones: readonly Seccion[]): readonly Seccion[] | null {
  if (secciones.some((s) => s.type === 'libro')) return null;
  if (secciones.length >= MAX_SECCIONES) return null;

  const id = secciones.some((s) => s.id === 'libro') ? 'libro-firmas' : 'libro';
  const orden = secciones.reduce((max, s) => Math.max(max, s.order), 0) + 1;
  return [
    ...secciones,
    { id, type: 'libro', enabled: false, order: orden, fields: { titulo: 'Libro de firmas' } },
  ];
}

/**
 * Añade el cartel del formulario de confirmación (D-64), apagado y **justo
 * después de la portada**: es lo primero que se busca en una web de boda. La
 * pareja decide si lo publica.
 */
function rsvpCompleto(secciones: readonly Seccion[]): readonly Seccion[] | null {
  if (secciones.some((s) => s.type === 'rsvp')) return null;
  if (secciones.length >= MAX_SECCIONES) return null;

  const id = secciones.some((s) => s.id === 'confirmar') ? 'confirmar-asistencia' : 'confirmar';
  const nueva: Seccion = {
    id,
    type: 'rsvp',
    enabled: false,
    order: 0.5,
    fields: { titulo: 'Confirmad vuestra asistencia' },
  };
  // `order: 0.5` la deja entre la portada (0) y lo demás (≥ 1); el saneador renumera.
  return sanearSecciones([...secciones, nueva]);
}

/** Añade el cartel de los autobuses (D-63), apagado y al final, si no hay ninguno. */
function busesCompleto(secciones: readonly Seccion[]): readonly Seccion[] | null {
  if (secciones.some((s) => s.type === 'buses')) return null;
  if (secciones.length >= MAX_SECCIONES) return null;

  const id = secciones.some((s) => s.id === 'autobuses') ? 'autobuses-rutas' : 'autobuses';
  const orden = secciones.reduce((max, s) => Math.max(max, s.order), 0) + 1;
  return [
    ...secciones,
    { id, type: 'buses', enabled: false, order: orden, fields: { titulo: 'Autobuses' } },
  ];
}

/** Añade el cartel de las personas importantes (§8.12), apagado y al final, si no hay ninguno. */
function cortejoCompleto(secciones: readonly Seccion[]): readonly Seccion[] | null {
  if (secciones.some((s) => s.type === 'cortejo')) return null;
  if (secciones.length >= MAX_SECCIONES) return null;

  const id = secciones.some((s) => s.id === 'cortejo') ? 'cortejo-personas' : 'cortejo';
  const orden = secciones.reduce((max, s) => Math.max(max, s.order), 0) + 1;
  return [
    ...secciones,
    {
      id,
      type: 'cortejo',
      enabled: false,
      order: orden,
      fields: { titulo: 'Personas importantes' },
    },
  ];
}

function historiaCompleta(secciones: readonly Seccion[]): readonly Seccion[] | null {
  const cartel = secciones.find((s) => s.type === 'historia');
  const vieja = secciones.find((s) => s.id === 'historia' && s.type === 'texto');

  if (cartel && vieja) {
    return secciones
      .filter((s) => s !== vieja)
      .map((s) => (s === cartel ? { ...s, enabled: s.enabled || vieja.enabled } : s));
  }

  if (cartel) return null;

  if (vieja) {
    return secciones.map((s) =>
      s === vieja
        ? {
            id: s.id,
            type: 'historia' as const,
            enabled: s.enabled,
            order: s.order,
            fields: { titulo: s.fields['titulo'] || 'Nuestra historia' },
          }
        : s,
    );
  }

  if (secciones.length >= MAX_SECCIONES) return null;

  const id = secciones.some((s) => s.id === 'historia') ? 'historia-nuestra' : 'historia';
  const orden = secciones.reduce((max, s) => Math.max(max, s.order), 0) + 1;
  return [
    ...secciones,
    { id, type: 'historia', enabled: false, order: orden, fields: { titulo: 'Nuestra historia' } },
  ];
}

export function hayCambios(cambios: CambiosPendientes): boolean {
  return Object.keys(cambios.modulos).length > 0 || cambios.secciones !== null;
}
