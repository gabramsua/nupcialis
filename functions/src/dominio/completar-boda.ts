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

import { MODULOS, modulosIniciales, type ConfigModulo, type Modulo, type Plan } from './planes';
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

export function cambiosPendientes(boda: Record<string, unknown>): CambiosPendientes {
  const plan: Plan = esPlan(boda['plan']) ? boda['plan'] : 'basic';
  const actuales =
    boda['modules'] !== null && typeof boda['modules'] === 'object'
      ? (boda['modules'] as Record<string, unknown>)
      : {};

  const iniciales = modulosIniciales(plan);
  const modulos: Partial<Record<Modulo, ConfigModulo>> = {};
  for (const modulo of MODULOS) {
    if (!tieneConfig(actuales[modulo])) modulos[modulo] = iniciales[modulo];
  }

  return { modulos, secciones: seccionesCompletas(boda['content']) };
}

/**
 * Añade el cartel de «Nuestra historia» si la boda no tiene ninguna sección de
 * ese tipo. Apagado: es la pareja quien decide anunciarlo. Sin `content` (o sin
 * lista) no se inventa nada: ya cae en las iniciales al publicar.
 */
function seccionesCompletas(contenido: unknown): readonly Seccion[] | null {
  if (contenido === null || typeof contenido !== 'object') return null;
  const crudas = (contenido as Record<string, unknown>)['sections'];
  if (!Array.isArray(crudas)) return null;

  const secciones = sanearSecciones(crudas);
  if (secciones.some((s) => s.type === 'historia')) return null;
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
