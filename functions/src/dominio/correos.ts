/**
 * Los correos que manda Nupcialis: plantillas editables y su montaje.
 *
 * Dominio puro, sin Firebase. Una plantilla es un **asunto** y un **cuerpo de
 * texto** con marcadores entre llaves (`{novios}`, `{enlace}`…). El superadmin
 * edita ese texto; el HTML lo monta este fichero, con una estructura fija, así
 * que nadie puede romper la maquetación ni colar etiquetas: lo que se escribe
 * es texto y se escapa (D-53).
 *
 * El envío en sí lo hace la extensión «Trigger Email» de Firebase, que mira la
 * colección `mail` (ver `infra/correo.ts`).
 */

export const ID_PLANTILLAS = ['parejaAcceso', 'parejaRestablecer'] as const;
export type IdPlantilla = (typeof ID_PLANTILLAS)[number];

export function esIdPlantilla(valor: unknown): valor is IdPlantilla {
  return typeof valor === 'string' && (ID_PLANTILLAS as readonly string[]).includes(valor);
}

/** A quién va dirigida: sirve para agruparlas en la pantalla del superadmin. */
export type Destinatario = 'novios' | 'invitados';

export const MARCADORES_DE_CORREO = [
  'novios',
  'nombre',
  'fecha',
  'enlace',
  'web',
  'correo',
] as const;
export type MarcadorDeCorreo = (typeof MARCADORES_DE_CORREO)[number];

export interface PlantillaDeCorreo {
  readonly id: IdPlantilla;
  readonly destinatario: Destinatario;
  readonly asunto: string;
  readonly cuerpo: string;
  /** Qué marcadores tienen valor en esta plantilla (para mostrarlos al editar). */
  readonly marcadores: readonly MarcadorDeCorreo[];
  /** Texto del botón del correo, que lleva al `{enlace}`. */
  readonly boton: string;
}

export const MAX_ASUNTO = 150;
export const MAX_CUERPO = 4000;

/**
 * Los textos de fábrica. Cálidos y cortos: lo lee una pareja desde el móvil,
 * en mitad de mil cosas de la boda. Tutean.
 */
export const PLANTILLAS_DE_FABRICA: Readonly<Record<IdPlantilla, PlantillaDeCorreo>> = {
  parejaAcceso: {
    id: 'parejaAcceso',
    destinatario: 'novios',
    asunto: 'Ya tenéis vuestra web de boda en Nupcialis',
    cuerpo:
      '¡Hola, {novios}!\n\n' +
      'Ya está creado el espacio de vuestra boda{fecha}. Desde ahí vais a preparar vuestra web, ' +
      'vuestra lista de invitados y todo lo demás.\n\n' +
      'Para entrar solo tenéis que elegir una contraseña con el botón de abajo. ' +
      'Después podréis acceder siempre desde {web}.\n\n' +
      'Os recomendamos empezar por la lista de tareas: os guía paso a paso.\n\n' +
      'Un abrazo,\nEl equipo de Nupcialis',
    marcadores: ['novios', 'fecha', 'enlace', 'web', 'correo'],
    boton: 'Elegir mi contraseña',
  },
  parejaRestablecer: {
    id: 'parejaRestablecer',
    destinatario: 'novios',
    asunto: 'Elige una contraseña nueva para tu cuenta de Nupcialis',
    cuerpo:
      'Hola, {novios}:\n\n' +
      'Hemos preparado un enlace para que elijas una contraseña nueva para {correo}. ' +
      'Funciona una sola vez y caduca en poco tiempo.\n\n' +
      'Si no lo has pedido tú, no hace falta que hagas nada.\n\n' +
      'Un abrazo,\nEl equipo de Nupcialis',
    marcadores: ['novios', 'enlace', 'web', 'correo'],
    boton: 'Elegir una contraseña nueva',
  },
};

export type Datos = Partial<Record<MarcadorDeCorreo, string>>;

export type MotivoPlantilla = 'formato' | 'asunto' | 'cuerpo' | 'id';

export interface PlantillaEditada {
  readonly asunto: string;
  readonly cuerpo: string;
}

/** Valida lo que manda el superadmin al guardar. El texto, tal cual, sin HTML. */
export function validarPlantilla(
  valor: unknown,
): { ok: true; datos: PlantillaEditada } | { ok: false; motivo: MotivoPlantilla } {
  if (valor === null || typeof valor !== 'object') return { ok: false, motivo: 'formato' };
  const p = valor as Record<string, unknown>;

  const asunto = typeof p['asunto'] === 'string' ? p['asunto'].replace(/\s+/g, ' ').trim() : '';
  if (asunto === '' || asunto.length > MAX_ASUNTO) return { ok: false, motivo: 'asunto' };

  const cuerpo = typeof p['cuerpo'] === 'string' ? p['cuerpo'].replace(/\r\n/g, '\n').trim() : '';
  if (cuerpo === '' || cuerpo.length > MAX_CUERPO) return { ok: false, motivo: 'cuerpo' };

  return { ok: true, datos: { asunto, cuerpo } };
}

/**
 * Sustituye los marcadores. Lo que no reconoce se queda tal cual, para que se
 * vea el error en la vista previa y no se mande un correo con un hueco.
 */
export function sustituir(texto: string, datos: Datos): string {
  return texto.replace(/\{(\w+)\}/g, (completo, clave: string) => {
    if (!(MARCADORES_DE_CORREO as readonly string[]).includes(clave)) return completo;
    return datos[clave as MarcadorDeCorreo] ?? '';
  });
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface CorreoMontado {
  readonly asunto: string;
  readonly texto: string;
  readonly html: string;
}

/** Solo se acepta un enlace `https://` (o `http://localhost` en desarrollo). */
export function enlaceSeguro(valor: string | undefined): string | null {
  if (!valor) return null;
  return /^https:\/\/\S+$/.test(valor) || /^http:\/\/localhost[:/]\S*$/.test(valor) ? valor : null;
}

/**
 * Monta el correo: asunto, versión de texto y HTML.
 *
 * - Cada dato se **escapa** antes de entrar en el HTML.
 * - El `{enlace}` no se escribe en el cuerpo: va como **botón** debajo (y como
 *   texto en la versión sin HTML, por si el cliente de correo no pinta botones).
 * - Una línea en blanco separa párrafos; un salto simple es un `<br>`.
 */
export function montarCorreo(
  plantilla: PlantillaEditada,
  boton: string,
  datos: Datos,
): CorreoMontado {
  const enlace = enlaceSeguro(datos.enlace);
  // El enlace no se sustituye dentro del cuerpo: va aparte, como botón.
  const sinEnlace = { ...datos, enlace: '' };

  const asunto = sustituir(plantilla.asunto, sinEnlace).replace(/\s+/g, ' ').trim();
  const cuerpo = sustituir(plantilla.cuerpo, sinEnlace)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const parrafos = cuerpo
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escaparHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

  const botonHtml = enlace
    ? `<p style="margin:24px 0"><a href="${escaparHtml(enlace)}" style="display:inline-block;` +
      `padding:12px 24px;border-radius:8px;background:#7a2e4a;color:#ffffff;` +
      `text-decoration:none;font-weight:600">${escaparHtml(boton)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:#666666">Si el botón no funciona, ` +
      `copia este enlace en tu navegador:<br>${escaparHtml(enlace)}</p>`
    : '';

  const html =
    `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f6f3f1">` +
    `<div style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;` +
    `font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#2b2b2b">` +
    `${parrafos}${botonHtml}</div></body></html>`;

  const texto = enlace ? `${cuerpo}\n\n${boton}: ${enlace}` : cuerpo;

  return { asunto, texto, html };
}

/**
 * Lo que se guardó, combinado con lo de fábrica.
 *
 * Un documento guardado que no cuadra se ignora y manda la de fábrica: un
 * correo de acceso a una pareja nunca puede quedarse sin texto.
 */
export function plantillaEfectiva(id: IdPlantilla, guardada: unknown): PlantillaDeCorreo {
  const fabrica = PLANTILLAS_DE_FABRICA[id];
  const v = validarPlantilla(guardada);
  return v.ok ? { ...fabrica, asunto: v.datos.asunto, cuerpo: v.datos.cuerpo } : fabrica;
}

export function esCorreoValido(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    valor.length <= 254 &&
    /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/.test(valor)
  );
}

/**
 * El estado de un correo de la cola, en una palabra.
 *
 * La extensión «Trigger Email» escribe `delivery.state` al procesarlo. Mientras
 * no esté instalada nadie lo toca: el documento se queda sin `delivery` y
 * contamos que **sigue en la cola**.
 */
export type EstadoDeCorreo = 'en-cola' | 'enviando' | 'enviado' | 'error';

export function estadoDeCorreo(delivery: unknown): EstadoDeCorreo {
  const estado =
    delivery !== null && typeof delivery === 'object'
      ? (delivery as Record<string, unknown>)['state']
      : null;
  switch (estado) {
    case 'PROCESSING':
    case 'RETRY':
      return 'enviando';
    case 'SUCCESS':
      return 'enviado';
    case 'ERROR':
      return 'error';
    default:
      return 'en-cola';
  }
}
