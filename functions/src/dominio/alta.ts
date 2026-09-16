/**
 * Validación de los datos de alta de una boda.
 *
 * `provisionWedding` es una función invocable: la entrada llega del cliente y
 * no hay ningún formulario delante que garantice nada. Todo lo que sigue asume
 * que quien llama miente, aunque hoy solo pueda llamar el superadmin.
 *
 * Está aquí, en dominio puro, para poder probar el caso raro —fecha en el
 * pasado, email con espacios, plan inventado— sin levantar un emulador.
 */

import type { Plan } from './planes';
import { normalizarSlug, validarSlug, type SlugInvalido } from './slug';

export interface EntradaAlta {
  readonly slug: string;
  readonly partnerA: string;
  readonly partnerB: string;
  readonly weddingDate: string;
  readonly emails: readonly string[];
  readonly plan: Plan;
  readonly locale?: string;
  readonly timezone?: string;
}

export interface DatosAlta {
  readonly slug: string;
  readonly partnerA: string;
  readonly partnerB: string;
  readonly weddingDate: Date;
  readonly emails: readonly string[];
  readonly plan: Plan;
  readonly locale: string;
  readonly timezone: string;
}

export type MotivoAlta =
  | { readonly campo: 'slug'; readonly motivo: SlugInvalido }
  | { readonly campo: 'nombres'; readonly motivo: 'vacio' | 'demasiado-largo' }
  | {
      readonly campo: 'fecha';
      readonly motivo: 'ausente' | 'no-es-fecha' | 'en-el-pasado' | 'demasiado-lejos';
    }
  | {
      readonly campo: 'emails';
      readonly motivo: 'ausente' | 'no-es-email' | 'duplicado' | 'demasiados';
    }
  | { readonly campo: 'plan'; readonly motivo: 'desconocido' };

export type ResultadoAlta =
  | { readonly ok: true; readonly datos: DatosAlta }
  | { readonly ok: false; readonly motivos: readonly MotivoAlta[] };

const NOMBRE_MAX = 60;
const ANIOS_MAX = 5;
const EMAILS_MAX = 2;

/**
 * Comprobación de email deliberadamente laxa.
 *
 * La validación estricta de RFC 5322 rechaza direcciones perfectamente
 * entregables, y aquí el email no es un secreto: es el que recibe el enlace de
 * acceso. Si está mal escrito, la pareja lo dirá en cinco minutos. Lo que sí
 * importa es que no traiga espacios ni dos arrobas, porque eso rompe cosas río
 * abajo.
 */
const FORMA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

export function normalizarEmail(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
}

/**
 * Valida y normaliza. Devuelve **todos** los motivos, no el primero: quien da
 * de alta una boda quiere ver de una vez todo lo que tiene que corregir.
 */
export function validarAlta(bruto: Partial<EntradaAlta> | undefined, hoy: Date): ResultadoAlta {
  const motivos: MotivoAlta[] = [];
  const entrada = bruto ?? {};

  // El slug se normaliza antes de validar: si quien da de alta escribe
  // "María y Gabriel" en el campo, eso es un slug perfectamente razonable
  // —`maria-y-gabriel`—, no un error que devolverle.
  const slug = normalizarSlug(texto(entrada.slug));
  const resultadoSlug = validarSlug(slug);
  if (!resultadoSlug.ok) motivos.push({ campo: 'slug', motivo: resultadoSlug.motivo });

  const partnerA = texto(entrada.partnerA);
  const partnerB = texto(entrada.partnerB);
  if (!partnerA || !partnerB) {
    motivos.push({ campo: 'nombres', motivo: 'vacio' });
  } else if (partnerA.length > NOMBRE_MAX || partnerB.length > NOMBRE_MAX) {
    motivos.push({ campo: 'nombres', motivo: 'demasiado-largo' });
  }

  const fecha = fechaDeBoda(entrada.weddingDate, hoy);
  if (!fecha.ok) motivos.push({ campo: 'fecha', motivo: fecha.motivo });

  const emails = emailsDeAlta(entrada.emails);
  if (!emails.ok) motivos.push({ campo: 'emails', motivo: emails.motivo });

  const plan = entrada.plan;
  if (plan !== 'basic' && plan !== 'extended') {
    motivos.push({ campo: 'plan', motivo: 'desconocido' });
  }

  if (motivos.length > 0 || !fecha.ok || !emails.ok) {
    return { ok: false, motivos };
  }

  return {
    ok: true,
    datos: {
      slug,
      partnerA,
      partnerB,
      weddingDate: fecha.fecha,
      emails: emails.emails,
      plan: plan as Plan,
      locale: texto(entrada.locale) || 'es',
      timezone: texto(entrada.timezone) || 'Europe/Madrid',
    },
  };
}

type ResultadoFecha =
  | { readonly ok: true; readonly fecha: Date }
  | {
      readonly ok: false;
      readonly motivo: 'ausente' | 'no-es-fecha' | 'en-el-pasado' | 'demasiado-lejos';
    };

/**
 * La fecha llega como ISO y se guarda como Timestamp.
 *
 * Una boda en el pasado no es un caso de uso: es un dedo que ha escrito 2024 en
 * lugar de 2026. Si se acepta, la plantilla de checklist nace entera vencida y
 * la cuenta atrás sale en negativo el primer día.
 */
export function fechaDeBoda(valor: unknown, hoy: Date): ResultadoFecha {
  if (typeof valor !== 'string' || valor.trim() === '') return { ok: false, motivo: 'ausente' };

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return { ok: false, motivo: 'no-es-fecha' };

  // Se compara contra el inicio del día de hoy: una boda que es hoy sigue
  // siendo un alta válida —hay parejas que contratan la web la víspera—, pero
  // ayer no.
  const inicioDeHoy = new Date(hoy);
  inicioDeHoy.setHours(0, 0, 0, 0);
  if (fecha < inicioDeHoy) return { ok: false, motivo: 'en-el-pasado' };

  const limite = new Date(hoy);
  limite.setFullYear(limite.getFullYear() + ANIOS_MAX);
  if (fecha > limite) return { ok: false, motivo: 'demasiado-lejos' };

  return { ok: true, fecha };
}

type ResultadoEmails =
  | { readonly ok: true; readonly emails: readonly string[] }
  | { readonly ok: false; readonly motivo: 'ausente' | 'no-es-email' | 'duplicado' | 'demasiados' };

/**
 * Los emails de la pareja.
 *
 * Se admite uno solo: hay parejas que comparten cuenta de correo, y obligarles
 * a inventarse una segunda dirección es peor que permitirlo. Lo que no se
 * admite es la misma dos veces, porque serían dos altas sobre la misma cuenta
 * de Auth y la segunda pisaría los claims de la primera.
 */
export function emailsDeAlta(valor: unknown): ResultadoEmails {
  if (!Array.isArray(valor) || valor.length === 0) return { ok: false, motivo: 'ausente' };
  if (valor.length > EMAILS_MAX) return { ok: false, motivo: 'demasiados' };

  const emails = valor.map(normalizarEmail);
  if (emails.some((email) => !FORMA_EMAIL.test(email))) return { ok: false, motivo: 'no-es-email' };
  if (new Set(emails).size !== emails.length) return { ok: false, motivo: 'duplicado' };

  return { ok: true, emails };
}

/**
 * Alternativas cuando el slug pedido ya está cogido.
 *
 * Se prueban sufijos que la pareja reconocería como suyos —el año de la boda,
 * la palabra boda, un número— antes que cualquier cosa aleatoria:
 * `mariaygabriel-2027` se dicta por teléfono; `mariaygabriel-7f3a` no.
 */
export function sugerirSlugs(
  base: string,
  ocupados: ReadonlySet<string>,
  anio: number,
): readonly string[] {
  const candidatos = [
    `${base}-${anio}`,
    `${base}-boda`,
    `${base}-2`,
    `${base}-3`,
    `${base}-${anio + 1}`,
  ];
  return candidatos.filter((c) => !ocupados.has(c) && validarSlug(c).ok).slice(0, 3);
}
