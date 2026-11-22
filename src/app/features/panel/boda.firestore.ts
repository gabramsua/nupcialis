/**
 * Lectura y escritura del documento de la boda desde su panel.
 *
 * El `weddingId` **sale del claim del token**, nunca de la URL ni de un campo
 * del cliente (regla 1 de CLAUDE.md). Quien llama aquí se lo pasa ya sacado de
 * la sesión; este fichero no lo adivina.
 *
 * Frontera de confianza (D-19): lo que llega de Firestore se comprueba antes de
 * salir de aquí.
 */

import { inject } from '@angular/core';
import { Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

import { esModoAcceso, type ModoAcceso } from '../../core/acceso/acceso';
import { MENSAJE_POR_DEFECTO } from './invitados/invitacion';
import { FIRESTORE } from '../../core/firebase/firestore.providers';
import { CLAVES_PALETA, type ColoresPaleta } from '../public-site/paletas/paletas';
import { sanearSecciones, type Seccion } from '../public-site/secciones/secciones';
import { sanearAportacion } from '../public-site/regalos/regalos';
import {
  sanearDressCode,
  type DressCodePublico,
  type IdColorDress,
} from '../public-site/dress-code/dress-code';
import {
  MODULOS,
  esTipoDeCeremonia,
  type BodaDelPanel,
  type TipoDeCeremonia,
  type ConfigModulo,
  type Modulo,
  type Visibilidad,
} from './boda';

export interface FuenteBoda {
  leer(weddingId: string): Promise<BodaDelPanel | null>;
  cambiarPlantilla(weddingId: string, templateId: string): Promise<void>;
  /** `'17:00'`, o `null` para dejarla sin fijar. */
  guardarHora(weddingId: string, weddingTime: string | null): Promise<void>;
  /** Los datos básicos del alta, que la pareja puede corregir (D-49). */
  guardarDatos(weddingId: string, datos: DatosBasicosParaGuardar): Promise<void>;
  guardarSecciones(weddingId: string, secciones: readonly Seccion[]): Promise<void>;
  /** `null` quita la paleta y devuelve la boda a los colores de su plantilla. */
  guardarPaleta(weddingId: string, colores: ColoresPaleta | null): Promise<void>;
  /** Ruta y URL de la foto de portada, o las dos a `null` para quitarla. */
  guardarPortada(weddingId: string, path: string | null, url: string | null): Promise<void>;
  /** Salir o no en buscadores. */
  guardarIndexable(weddingId: string, indexable: boolean): Promise<void>;
  /** Si un invitado puede apuntar a sus acompañantes (§8.3). */
  guardarAcompanantes(weddingId: string, permitir: boolean): Promise<void>;
  /** Hasta cuándo se puede confirmar. `null` quita el plazo. */
  guardarFechaLimite(weddingId: string, limite: Date | null): Promise<void>;
  /** Cómo entra un invitado en la web (§3.3). */
  guardarModoAcceso(weddingId: string, modo: ModoAcceso): Promise<void>;
  /** La plantilla del mensaje de invitación, con sus marcadores. */
  guardarMensajeInvitacion(weddingId: string, mensaje: string): Promise<void>;
  /** El dress code (§8.11), que vive en la configuración de su módulo. */
  guardarDressCode(weddingId: string, dress: DressCodeParaGuardar): Promise<void>;
  guardarAportacion(weddingId: string, aportacion: AportacionParaGuardar): Promise<void>;
}

/** Lo que la pantalla de datos manda guardar: nombres, día, tipo y hora. */
export interface DatosBasicosParaGuardar {
  readonly partnerA: string;
  readonly partnerB: string;
  /** Medianoche UTC del día (invariante de `shared/zona-horaria.ts`). */
  readonly weddingDate: Date;
  readonly ceremonyType: TipoDeCeremonia | null;
  readonly weddingTime: string | null;
}

/** Lo que la pantalla de regalos manda guardar. Tal cual lo teclea la pareja. */
export interface AportacionParaGuardar {
  readonly iban: string;
  readonly titular: string;
  readonly bizum: string;
  readonly mensaje: string;
}

/** Lo que la pantalla del dress code manda guardar. */
export interface DressCodeParaGuardar {
  readonly description: string;
  readonly suggestedColors: readonly IdColorDress[];
  readonly avoidColors: readonly IdColorDress[];
  readonly tips: readonly string[];
}

export function crearFuenteBodaFirestore(): FuenteBoda {
  const db = inject(FIRESTORE);

  return {
    async leer(weddingId: string): Promise<BodaDelPanel | null> {
      const snap = await getDoc(doc(db, 'weddings', weddingId));
      if (!snap.exists()) return null;
      return desdeDocumento(weddingId, snap.data());
    },

    async cambiarPlantilla(weddingId: string, templateId: string): Promise<void> {
      // Ruta anidada, no un objeto `theme` entero: escribir el mapa completo se
      // llevaría por delante la paleta y la foto de portada de la pareja.
      await updateDoc(doc(db, 'weddings', weddingId), { 'theme.templateId': templateId });
    },

    async guardarHora(weddingId: string, weddingTime: string | null): Promise<void> {
      // `weddingTime` no es campo de sistema (regla 6): lo escribe la pareja
      // directamente, sin pasar por una función. Las reglas ya lo permiten.
      await updateDoc(doc(db, 'weddings', weddingId), { weddingTime });
    },

    async guardarDatos(weddingId: string, datos: DatosBasicosParaGuardar): Promise<void> {
      // Rutas de punto para `couple`: así no se pisa nada que algún día cuelgue
      // de ese mapa. Ninguno de estos campos es de sistema (regla 6); la
      // proyección pública se republica sola.
      await updateDoc(doc(db, 'weddings', weddingId), {
        'couple.partnerA': datos.partnerA,
        'couple.partnerB': datos.partnerB,
        weddingDate: Timestamp.fromDate(datos.weddingDate),
        ceremonyType: datos.ceremonyType,
        weddingTime: datos.weddingTime,
      });
    },

    async guardarPaleta(weddingId: string, colores: ColoresPaleta | null): Promise<void> {
      // Ruta anidada: escribir `theme` entero se llevaría por delante la
      // plantilla elegida y la foto de portada.
      await updateDoc(doc(db, 'weddings', weddingId), { 'theme.palette': colores });
    },

    async guardarPortada(
      weddingId: string,
      path: string | null,
      url: string | null,
    ): Promise<void> {
      await updateDoc(doc(db, 'weddings', weddingId), {
        'theme.heroImagePath': path,
        'theme.heroImageUrl': url,
      });
    },

    async guardarIndexable(weddingId: string, indexable: boolean): Promise<void> {
      await updateDoc(doc(db, 'weddings', weddingId), { indexable });
    },

    async guardarMensajeInvitacion(weddingId: string, inviteMessage: string): Promise<void> {
      await updateDoc(doc(db, 'weddings', weddingId), { inviteMessage });
    },

    async guardarAcompanantes(weddingId: string, permitir: boolean): Promise<void> {
      await updateDoc(doc(db, 'weddings', weddingId), {
        allowGuestAddedCompanions: permitir,
      });
    },

    async guardarFechaLimite(weddingId: string, limite: Date | null): Promise<void> {
      // Dentro de la configuración del módulo, con ruta de puntos para no
      // pisar el resto de `modules.rsvp`: un `updateDoc` con el objeto entero
      // apagaría el módulo si alguien olvida copiar `enabled`.
      await updateDoc(doc(db, 'weddings', weddingId), {
        'modules.rsvp.config.deadline': limite ? Timestamp.fromDate(limite) : null,
      });
    },

    async guardarModoAcceso(weddingId: string, modo: ModoAcceso): Promise<void> {
      // `guestAccessMode` no es campo de sistema (regla 6): lo decide la pareja
      // y las reglas ya la dejan escribirlo. El trigger de la proyección lo
      // republica, que es lo que hace que la web pública se entere.
      await updateDoc(doc(db, 'weddings', weddingId), { guestAccessMode: modo });
    },

    async guardarDressCode(weddingId: string, dress: DressCodeParaGuardar): Promise<void> {
      // Campo a campo y con ruta anidada, como el plazo del RSVP: escribir
      // `modules.dressCode` entero apagaría el módulo, y escribir `config`
      // entero se llevaría por delante el moodboard cuando exista.
      await updateDoc(doc(db, 'weddings', weddingId), {
        'modules.dressCode.config.description': dress.description,
        'modules.dressCode.config.suggestedColors': dress.suggestedColors as string[],
        'modules.dressCode.config.avoidColors': dress.avoidColors as string[],
        'modules.dressCode.config.tips': dress.tips as string[],
      });
    },

    async guardarAportacion(weddingId: string, aportacion: AportacionParaGuardar): Promise<void> {
      // Campo a campo bajo `content.gifts`, no el objeto entero: `content`
      // guarda también las secciones, y escribirlo completo se las llevaría.
      //
      // Se guarda **lo que la pareja ha escrito**, sin normalizar: si el IBAN
      // está mal, tiene que poder volver a su panel y ver lo que puso para
      // arreglarlo, no un hueco en blanco. Quien decide qué se publica es
      // `sanearAportacion`, en el servidor y al servirlo.
      await updateDoc(doc(db, 'weddings', weddingId), {
        'content.gifts.iban': aportacion.iban,
        'content.gifts.titular': aportacion.titular,
        'content.gifts.bizum': aportacion.bizum,
        'content.gifts.mensaje': aportacion.mensaje,
      });
    },

    async guardarSecciones(weddingId: string, secciones: readonly Seccion[]): Promise<void> {
      // Ruta anidada: `content` puede llegar a tener más cosas que `sections`,
      // y escribir el objeto entero se las llevaría por delante.
      await updateDoc(doc(db, 'weddings', weddingId), {
        // Se sanea también al salir. El servidor lo repetirá antes de publicar,
        // pero guardar basura en el documento de la boda y limpiarla después
        // deja a la pareja viendo en su panel algo distinto de lo que se
        // publica, que es la peor forma de descubrir un fallo.
        'content.sections': sanearSecciones(secciones) as Seccion[],
      });
    },
  };
}

/** El dress code que haya en la configuración de su módulo. */
function dressCodeDe(valor: unknown): DressCodePublico {
  if (valor === null || typeof valor !== 'object') return sanearDressCode(null);
  const modulo = (valor as Record<string, unknown>)['dressCode'];
  if (modulo === null || typeof modulo !== 'object') return sanearDressCode(null);
  return sanearDressCode((modulo as Record<string, unknown>)['config']);
}

/**
 * La paleta, solo si está completa.
 *
 * Misma regla que en la web pública: o están los seis colores o no hay paleta.
 * Media paleta mezcla tres colores de la pareja con tres de la plantilla.
 */
function paleta(valor: unknown): ColoresPaleta | null {
  if (valor === null || typeof valor !== 'object') return null;
  const p = valor as Record<string, unknown>;

  const completa = CLAVES_PALETA.every((c) => typeof p[c] === 'string' && p[c] !== '');
  if (!completa) return null;

  return Object.fromEntries(CLAVES_PALETA.map((c) => [c, p[c]])) as unknown as ColoresPaleta;
}

/** El array de secciones dentro de `content`, sin suponer que exista. */
function seccionesDe(valor: unknown): unknown {
  if (valor === null || typeof valor !== 'object') return null;
  return (valor as Record<string, unknown>)['sections'];
}

function visibilidad(valor: unknown): Visibilidad {
  return valor === 'visible' || valor === 'soon' ? valor : 'hidden';
}

function modulos(valor: unknown): Partial<Record<Modulo, ConfigModulo>> {
  const crudo =
    valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
  const salida: Partial<Record<Modulo, ConfigModulo>> = {};

  for (const modulo of MODULOS) {
    const config = crudo[modulo];
    if (config === null || typeof config !== 'object') continue;
    const c = config as Record<string, unknown>;
    salida[modulo] = { enabled: c['enabled'] === true, visibility: visibilidad(c['visibility']) };
  }

  return salida;
}

function desdeDocumento(weddingId: string, datos: Record<string, unknown>): BodaDelPanel {
  const tema =
    datos['theme'] !== null && typeof datos['theme'] === 'object'
      ? (datos['theme'] as Record<string, unknown>)
      : {};
  const estado = datos['status'];
  const pareja =
    datos['couple'] !== null && typeof datos['couple'] === 'object'
      ? (datos['couple'] as Record<string, unknown>)
      : {};

  return {
    weddingId,
    slug: typeof datos['slug'] === 'string' ? datos['slug'] : '',
    pareja: {
      partnerA: typeof pareja['partnerA'] === 'string' ? pareja['partnerA'] : '',
      partnerB: typeof pareja['partnerB'] === 'string' ? pareja['partnerB'] : '',
    },
    // Ante un estado desconocido, borrador: es el que menos promete.
    status: estado === 'active' || estado === 'archived' ? estado : 'draft',
    plan: datos['plan'] === 'extended' ? 'extended' : 'basic',
    weddingDate: datos['weddingDate'] instanceof Timestamp ? datos['weddingDate'].toDate() : null,
    weddingTime: typeof datos['weddingTime'] === 'string' ? datos['weddingTime'] : null,
    timezone: typeof datos['timezone'] === 'string' ? datos['timezone'] : 'Europe/Madrid',
    ceremonyType: esTipoDeCeremonia(datos['ceremonyType']) ? datos['ceremonyType'] : null,
    // Ante un valor desconocido, abierta: es la que no deja a nadie fuera.
    // Una boda que de pronto pidiera identificarse por un dato corrupto
    // dejaría a sus invitados en la puerta sin que nadie lo hubiera pedido.
    guestAccessMode: esModoAcceso(datos['guestAccessMode']) ? datos['guestAccessMode'] : 'open',
    inviteMessage:
      typeof datos['inviteMessage'] === 'string' && datos['inviteMessage'].trim() !== ''
        ? datos['inviteMessage']
        : MENSAJE_POR_DEFECTO,
    templateId: typeof tema['templateId'] === 'string' ? tema['templateId'] : '',
    indexable: datos['indexable'] === true,
    palette: paleta(tema['palette']),
    heroImagePath: typeof tema['heroImagePath'] === 'string' ? tema['heroImagePath'] : null,
    heroImageUrl: typeof tema['heroImageUrl'] === 'string' ? tema['heroImageUrl'] : null,
    secciones: sanearSecciones(seccionesDe(datos['content'])),
    modulos: modulos(datos['modules']),
    dressCode: dressCodeDe(datos['modules']),
    aportacion: sanearAportacion(aportacionDe(datos['content'])),
    rsvpDeadline: fechaLimiteRsvp(datos['modules']),
    allowGuestAddedCompanions: datos['allowGuestAddedCompanions'] === true,
  };
}

/**
 * La fecha límite del RSVP, enterrada en la configuración del módulo.
 *
 * Exportada para poder probarla: son cuatro saltos sobre un documento que puede
 * no tener ninguno, y equivocarse aquí no da un error, da un formulario que se
 * cierra solo o que no se cierra nunca.
 */
/** `content.gifts`, que puede no existir. */
export function aportacionDe(contenido: unknown): unknown {
  return contenido !== null && typeof contenido === 'object'
    ? (contenido as Record<string, unknown>)['gifts']
    : undefined;
}

export function fechaLimiteRsvp(valor: unknown): Date | null {
  const nivel = (dato: unknown, clave: string): unknown =>
    dato !== null && typeof dato === 'object'
      ? (dato as Record<string, unknown>)[clave]
      : undefined;

  const limite = nivel(nivel(nivel(valor, 'rsvp'), 'config'), 'deadline');
  return limite instanceof Timestamp ? limite.toDate() : null;
}
