/**
 * El enlace que se le manda a cada invitado, y el mensaje que lo acompaña.
 *
 * **El enlace abre la web, y solo eso** (D-34, opción 3). Lleva un token por
 * invitado que el servidor genera y guarda en su documento; al abrirlo, el
 * invitado entra con nivel `enlace` y puede mirar. Para confirmar, elegir menú
 * o apuntar acompañantes se le piden los cuatro dígitos de su móvil.
 *
 * Esa partición es el punto. Estos enlaces se reenvían —el primo lo pasa al
 * grupo de la familia «por si alguien no lo tiene»—, así que lo cómodo es
 * cómodo y lo que tiene consecuencias sigue pidiendo algo que solo tiene él.
 *
 * El token lo pide el panel a `getInviteLink`; aquí solo se monta la URL.
 */

import type { ModoAcceso } from '../../../core/acceso/acceso';

// Los parámetros y la lectura del nombre viven en `core/acceso`: los usa la
// web pública nada más abrirse, y desde ahí no se puede importar nada del
// panel sin metérselo al invitado en el chunk inicial.
import { PARAM_ENLACE } from '../../../core/acceso/acceso';
export { PARAM_ENLACE, PARAM_NOMBRE, nombreDelEnlace } from '../../../core/acceso/acceso';

export interface InvitadoParaCompartir {
  readonly fullName: string;
  readonly phone: string | null;
}

/**
 * El enlace de ese invitado.
 *
 * `origen` es la URL de la boda tal cual: la pareja está mirando su panel en
 * `https://<slug>.nupcialis.com/panel/...`, así que sale de `location.origin`
 * y no de una configuración que se pueda quedar desfasada entre entornos.
 *
 * Sin token —o en una boda abierta, donde no hay puerta que abrir— es el enlace
 * de la boda y ya.
 */
export function enlaceDeInvitado(origen: string, token: string | null, modo: ModoAcceso): string {
  const base = origen.replace(/\/+$/, '');

  if (modo === 'open' || token === null || token === '') return base + '/';

  return `${base}/?${PARAM_ENLACE}=${encodeURIComponent(token)}`;
}

/**
 * El nombre que trae la URL, si lo trae.
 *
 * Vive aquí, al lado de quien escribe el enlace, para que las dos mitades usen
 * el mismo nombre de parámetro y se puedan probar juntas. Se le pasa
 * `location.search` tal cual.
 *
 * Nunca devuelve basura: un `?n=` vacío o con espacios es lo mismo que no
 * traer nada, y así la puerta no se queda con un campo que parece rellenado.
 */

/** Lo que se puede escribir entre llaves en el mensaje. */
export const MARCADORES = ['nombre', 'novios', 'fecha', 'enlace'] as const;
export type Marcador = (typeof MARCADORES)[number];

/**
 * El mensaje de fábrica.
 *
 * Tutea y es corto porque se lee en el móvil, dentro de una conversación de
 * WhatsApp y entre otros veinte mensajes. La pareja puede cambiarlo entero.
 */
export const MENSAJE_POR_DEFECTO =
  '¡Hola {nombre}! Nos casamos y queremos que estés.\n\n' +
  'Aquí tienes toda la información y puedes confirmar si vienes:\n{enlace}\n\n' +
  'Un abrazo,\n{novios}';

/**
 * El mensaje que se manda **una sola vez**, a todos, desde «Vuestra web» (D-52).
 *
 * Sin `{nombre}`: es el mismo para el grupo de la familia y para los amigos. El
 * enlace es el de la boda; cada invitado se identifica al entrar.
 */
export const MENSAJE_GENERAL =
  '¡Hola! Nos casamos y queremos que estéis.\n\n' +
  'Aquí tenéis toda la información y podéis confirmar si venís:\n{enlace}\n\n' +
  'Un abrazo,\n{novios}';

export interface DatosDelMensaje {
  readonly nombre: string;
  readonly novios: string;
  readonly fecha: string;
  readonly enlace: string;
}

/**
 * Sustituye los marcadores del mensaje.
 *
 * Lo que no reconoce **se queda tal cual**, sin vaciarlo: quien escriba
 * `{nombres}` en plural verá su error en la vista previa y lo arreglará. Si lo
 * borrásemos en silencio, mandaría doscientos mensajes con un hueco.
 */
export function mensajeDeInvitacion(plantilla: string, datos: DatosDelMensaje): string {
  return plantilla.replace(/\{(\w+)\}/g, (completo, clave: string) =>
    MARCADORES.includes(clave as Marcador) ? datos[clave as Marcador] : completo,
  );
}

/**
 * El enlace que abre WhatsApp con el mensaje escrito.
 *
 * Con el teléfono del invitado si lo hay, y sin él si no: entonces WhatsApp
 * pide a quién mandárselo, que es mejor que no ofrecer el botón. `wa.me` quiere
 * el número **sin el `+`** y sin nada que no sea un dígito.
 */
export function enlaceWhatsApp(mensaje: string, telefono: string | null): string {
  const numero = (telefono ?? '').replace(/\D/g, '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * ¿Se puede invitar ya a esta persona?
 *
 * En los modos con teléfono, quien no lo tenga en la lista recibirá un enlace
 * que no puede abrir. Es mejor decirlo antes de mandarlo que después.
 */
export function puedeEntrar(invitado: InvitadoParaCompartir, modo: ModoAcceso): boolean {
  return modo === 'open' || invitado.phone !== null;
}
