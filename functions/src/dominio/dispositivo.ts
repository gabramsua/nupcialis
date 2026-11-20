/**
 * De qué aparato ha entrado un invitado, en dos palabras.
 *
 * El `user-agent` completo **no sale del servidor**. Son trescientos
 * caracteres por entrada, con versiones de sistema y de navegador que no le
 * dicen nada a la pareja y que sí son un dato más del invitado del que
 * responder. Lo que sube a la pantalla es «Android · Chrome», y eso se calcula
 * aquí.
 *
 * El objetivo tampoco es acertar el modelo del teléfono: es que la pareja vea
 * que una misma invitación se está abriendo desde un iPhone, un Android y un
 * Windows, que es la forma que tiene un enlace reenviado de notarse (D-34).
 * Por eso la etiqueta es gruesa a propósito.
 *
 * Sin librería: `ua-parser` y compañía pesan y se actualizan cada mes para
 * distinguir cosas que aquí no se distinguen.
 */

/** Los sistemas, en orden: el primero que encaja manda. */
const SISTEMAS: readonly (readonly [RegExp, string])[] = [
  // iPad antes que Mac: desde iPadOS 13 el iPad se anuncia como Macintosh y
  // solo se delata por el soporte táctil, así que se mira primero lo suyo.
  [/\biPad\b/, 'iPad'],
  [/\biPhone\b/, 'iPhone'],
  [/\biPod\b/, 'iPhone'],
  // Android antes que Linux: todo Android dice también Linux.
  [/\bAndroid\b/, 'Android'],
  [/\bWindows\b/, 'Windows'],
  [/\bMacintosh\b|\bMac OS X\b/, 'Mac'],
  [/\bCrOS\b/, 'Chromebook'],
  [/\bLinux\b|\bX11\b/, 'Linux'],
];

/**
 * Los navegadores, en orden. Aquí el orden **es** el algoritmo: Edge dice ser
 * Chrome, Chrome dice ser Safari y casi todos dicen ser Mozilla.
 */
const NAVEGADORES: readonly (readonly [RegExp, string])[] = [
  [/\bEdgA?\/|\bEdge\//, 'Edge'],
  [/\bOPR\/|\bOpera\//, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bFxiOS\/|\bFirefox\//, 'Firefox'],
  [/\bCriOS\//, 'Chrome'],
  // Instagram y Facebook abren los enlaces en su propio navegador, y en una
  // boda eso pasa mucho: merece la pena verlo.
  [/\bInstagram\b/, 'Instagram'],
  [/\bFBAN\/|\bFBAV\//, 'Facebook'],
  [/\bChrome\//, 'Chrome'],
  [/\bSafari\//, 'Safari'],
];

function primero(cadena: string, tabla: readonly (readonly [RegExp, string])[]): string {
  for (const [patron, nombre] of tabla) {
    if (patron.test(cadena)) return nombre;
  }
  return '';
}

/**
 * «Android · Chrome», «iPhone · Safari», o `''` si no hay por dónde cogerlo.
 *
 * Vacío es una respuesta legítima: hay navegadores que mandan un `user-agent`
 * recortado y bots que no mandan ninguno. La pantalla dirá «dispositivo
 * desconocido», que es la verdad, en vez de inventarse un Windows.
 */
export function dispositivoDe(userAgent: unknown): string {
  if (typeof userAgent !== 'string' || userAgent.trim() === '') return '';

  const sistema = primero(userAgent, SISTEMAS);
  const navegador = primero(userAgent, NAVEGADORES);

  if (sistema === '' && navegador === '') return '';
  if (sistema === '') return navegador;
  if (navegador === '') return sistema;
  return `${sistema} · ${navegador}`;
}
