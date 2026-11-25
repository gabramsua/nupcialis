/**
 * Las personas importantes de la boda (§8.12 `weddingParty`).
 *
 * El cortejo y quien tiene un papel el día de la boda: madrina, padrino,
 * portaanillos, chófer de la novia… Cada una con su papel, una línea sobre
 * quién es y, si la pareja quiere, su foto. La pareja decide a quién enseña a
 * los invitados; el teléfono **nunca** se publica.
 *
 * **La foto lleva consentimiento.** Son fotos de terceros publicadas en una web
 * (PENDIENTES D-61): para subirla la pareja confirma que la persona sabe que
 * saldrá, y se guarda que lo confirmó y cuándo. Sin esa confirmación, ni se
 * sube (las reglas de Firestore lo exigen) ni se publica (la proyección lo
 * comprueba).
 *
 * Frontera de confianza (D-19): `leerPersona` comprueba lo que vuelve de
 * Firestore y descarta lo roto en vez de tumbar la lista.
 */

import {
  LADOS,
  MAX_BIO,
  MAX_NOMBRE_PERSONA,
  MAX_PAPEL,
  MAX_PERSONAS,
  esLado,
  type LadoPersona,
} from '../../public-site/cortejo/cortejo';
import { telefonoValido } from '../../public-site/alojamientos/alojamientos';

export { LADOS, MAX_BIO, MAX_NOMBRE_PERSONA, MAX_PAPEL, MAX_PERSONAS, type LadoPersona };

/** Papeles habituales, para sugerirlos al escribir. La pareja puede poner el que quiera. */
export const PAPELES_SUGERIDOS = [
  'Madrina',
  'Padrino',
  'Testigo',
  'Dama de honor',
  'Paje',
  'Portaanillos',
  'Chófer',
  'Maestro de ceremonias',
  'Lector',
] as const;

export interface PersonaDelPanel {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly side: LadoPersona;
  readonly bio: string;
  /** Solo para la pareja: no sale de su panel. */
  readonly phone: string | null;
  readonly photoPath: string | null;
  readonly photoUrl: string | null;
  /** La pareja confirmó que la persona sabe que su foto sale en la web. */
  readonly photoConsent: boolean;
  /** Si el invitado la ve en la web. */
  readonly visible: boolean;
  /**
   * La ficha de la lista de invitados con la que está enlazada, o `null`. Es
   * solo del panel: ni este id ni nada del invitado sale a la web.
   */
  readonly guestId: string | null;
  readonly order: number;
}

export type DatosDePersona = Omit<PersonaDelPanel, 'id' | 'order'>;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/** Las fotos de una boda viven en `weddings/{id}/party/`. Otra ruta no es de esta boda. */
export function rutaDeFotoValida(ruta: unknown, weddingId: string): ruta is string {
  return typeof ruta === 'string' && ruta.startsWith(`weddings/${weddingId}/party/`);
}

export function leerPersona(
  id: string,
  crudo: unknown,
  /** Para descartar rutas de foto que no son de esta boda. */
  weddingId: string,
): PersonaDelPanel | null {
  if (crudo === null || typeof crudo !== 'object') return null;
  const d = crudo as Record<string, unknown>;

  const name = texto(d['displayName']);
  if (name === '') return null;

  const orden = d['order'];
  const url = typeof d['photoUrl'] === 'string' && d['photoUrl'].startsWith('https://');
  const conFoto = rutaDeFotoValida(d['photoPath'], weddingId) && url;

  return {
    id,
    name,
    role: texto(d['role']),
    side: esLado(d['side']) ? d['side'] : 'both',
    bio: texto(d['bio']),
    phone: telefonoValido(d['phone']),
    photoPath: conFoto ? (d['photoPath'] as string) : null,
    photoUrl: conFoto ? (d['photoUrl'] as string) : null,
    // Una foto sin consentimiento registrado no se da por buena.
    photoConsent: conFoto && d['photoConsent'] === true,
    visible: d['visibleToGuests'] === true,
    guestId: typeof d['guestId'] === 'string' && d['guestId'] !== '' ? d['guestId'] : null,
    order: typeof orden === 'number' && Number.isFinite(orden) ? orden : 0,
  };
}

export type MotivoPersona = 'nombre' | 'papel' | 'bio' | 'telefono' | 'consentimiento';

export interface BorradorDePersona {
  readonly name: string;
  readonly role: string;
  readonly side: LadoPersona;
  readonly bio: string;
  readonly phone: string;
  readonly visible: boolean;
  /** `''` si no está enlazada con ningún invitado. */
  readonly guestId: string;
  /** Lo que marca la pareja en la casilla del consentimiento. */
  readonly consentimiento: boolean;
}

/** Lo que hay de la foto en el momento de guardar. */
export interface EstadoDeFoto {
  /** La foto que ya tiene la persona (`null` si no tiene). */
  readonly actual: { readonly path: string; readonly url: string } | null;
  /** Una foto nueva elegida y sin subir todavía. */
  readonly nueva: boolean;
  /** La pareja ha pulsado «Quitar la foto». */
  readonly quitada: boolean;
}

/** Si, al guardar, la persona va a tener foto. */
export function tendraFoto(foto: EstadoDeFoto): boolean {
  return foto.nueva || (foto.actual !== null && !foto.quitada);
}

/**
 * De lo que escribe la pareja a lo que se guarda, o el campo que falla.
 *
 * El consentimiento es obligatorio **siempre que la persona vaya a tener
 * foto**: sin él no se guarda. Sin foto, la casilla no pinta nada.
 */
export function validarPersona(
  b: BorradorDePersona,
  foto: EstadoDeFoto,
):
  | {
      readonly ok: true;
      readonly datos: Pick<
        DatosDePersona,
        'name' | 'role' | 'side' | 'bio' | 'phone' | 'visible' | 'guestId'
      >;
    }
  | { readonly ok: false; readonly motivo: MotivoPersona } {
  const name = b.name.replace(/\s+/g, ' ').trim();
  if (name === '' || name.length > MAX_NOMBRE_PERSONA) return { ok: false, motivo: 'nombre' };

  const role = b.role.replace(/\s+/g, ' ').trim();
  if (role === '' || role.length > MAX_PAPEL) return { ok: false, motivo: 'papel' };

  const bio = b.bio.replace(/\r\n/g, '\n').trim();
  if (bio.length > MAX_BIO) return { ok: false, motivo: 'bio' };

  const telefono = b.phone.trim();
  const phone = telefono === '' ? null : telefonoValido(telefono);
  if (telefono !== '' && phone === null) return { ok: false, motivo: 'telefono' };

  if (tendraFoto(foto) && !b.consentimiento) return { ok: false, motivo: 'consentimiento' };

  return {
    ok: true,
    datos: {
      name,
      role,
      side: esLado(b.side) ? b.side : 'both',
      bio,
      phone,
      visible: b.visible,
      guestId: b.guestId.trim() === '' ? null : b.guestId.trim(),
    },
  };
}

/**
 * Cambia de sitio a una persona con la de arriba o la de abajo. Devuelve solo
 * las dos que cambian de `order`, o `null` si ya está en el borde.
 */
export function intercambiar(
  personas: readonly PersonaDelPanel[],
  id: string,
  direccion: -1 | 1,
): readonly { readonly id: string; readonly order: number }[] | null {
  const ordenadas = [...personas].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const desde = ordenadas.findIndex((p) => p.id === id);
  const hasta = desde + direccion;
  if (desde < 0 || hasta < 0 || hasta >= ordenadas.length) return null;

  // Se reasignan posiciones consecutivas: si dos personas compartían `order`
  // (dos altas a la vez), intercambiar solo sus valores no movería nada.
  const resultado = [...ordenadas];
  [resultado[desde], resultado[hasta]] = [resultado[hasta]!, resultado[desde]!];
  return resultado
    .map((p, i) => ({ id: p.id, order: i + 1, antes: p.order }))
    .filter((n) => n.order !== n.antes)
    .map(({ id, order }) => ({ id, order }));
}
