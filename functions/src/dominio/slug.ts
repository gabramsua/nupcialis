/**
 * Copia del slug del cliente. **No editar aquí.**
 *
 * La fuente es `src/app/core/tenant/slug.ts`. Vive duplicado porque
 * `functions/` es un paquete npm aparte que se despliega solo, y un import
 * fuera de su raíz rompería la compilación y el empaquetado del despliegue.
 *
 * La duplicación la vigila `slug.spec.ts`, que compara ambos ficheros y falla
 * si divergen: si la lista de reservados cambia solo en un lado, el panel
 * aceptaría un slug que `provisionWedding` rechaza, o al revés.
 */

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/**
 * Subdominios que no se pueden pedir.
 *
 * Tres familias, y las tres importan:
 * - Superficies del producto: si alguien se queda con `admin` o `app`, el panel
 *   deja de existir.
 * - Infraestructura y correo: `mail`, `smtp`, `ns1`. Un slug aquí puede romper
 *   la entrega de correo del dominio entero.
 * - Palabras que la gente escribe por error o que dan pie a suplantación:
 *   `soporte`, `ayuda`, `pagos`, `login`.
 */
export const SLUGS_RESERVADOS: ReadonlySet<string> = new Set([
  // superficies
  'www',
  'admin',
  'api',
  'app',
  'panel',
  'superadmin',
  'dashboard',
  'nupcialis',
  'demo',
  'test',
  'staging',
  'dev',
  'preview',
  'beta',
  // infraestructura
  'static',
  'cdn',
  'assets',
  'img',
  'images',
  'files',
  'media',
  'storage',
  'mail',
  'smtp',
  'imap',
  'pop',
  'webmail',
  'email',
  'ftp',
  'ns',
  'ns1',
  'ns2',
  'dns',
  'mx',
  'autodiscover',
  'autoconfig',
  'status',
  'health',
  'metrics',
  'monitor',
  // atención y confianza
  'soporte',
  'support',
  'ayuda',
  'help',
  'contacto',
  'contact',
  'login',
  'signin',
  'auth',
  'cuenta',
  'account',
  'pago',
  'pagos',
  'pay',
  'checkout',
  'billing',
  'facturacion',
  'seguridad',
  'security',
  'blog',
  'legal',
  'privacidad',
  'privacy',
  'terminos',
  'terms',
  // trampas técnicas
  'null',
  'undefined',
  'true',
  'false',
]);

export type SlugInvalido =
  'vacio' | 'demasiado-corto' | 'demasiado-largo' | 'reservado' | 'caracteres-no-validos';

export type ResultadoSlug =
  | { readonly ok: true; readonly slug: string }
  | { readonly ok: false; readonly motivo: SlugInvalido };

/**
 * Normaliza texto libre a un slug candidato.
 *
 * `María y Gabriel` → `maria-y-gabriel`. Se hace en el panel mientras la pareja
 * escribe, para que vean el resultado antes de reservarlo.
 *
 * Los acentos se quitan con NFD, no con una tabla de reemplazos: así funciona
 * también para nombres que no son españoles, que los hay en toda boda.
 */
export function normalizarSlug(texto: string): string {
  return (
    texto
      .normalize('NFD')
      // Marcas diacríticas: tildes, diéresis y la virgulilla de la ñ.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      // La ß no se descompone en NFD y en alemán equivale a "ss".
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, SLUG_MAX)
      // Recortar a 40 puede dejar un guion al final.
      .replace(/-+$/g, '')
  );
}

/**
 * Un slug ya normalizado y con la forma exacta que se guarda.
 *
 * Prohibir guiones consecutivos no es estética: bloquea de paso el prefijo
 * `xn--` de los dominios internacionalizados, que los navegadores interpretan
 * de forma especial y muestran de manera impredecible.
 */
const FORMA_VALIDA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validarSlug(slug: string): ResultadoSlug {
  if (!slug) return { ok: false, motivo: 'vacio' };
  if (!FORMA_VALIDA.test(slug)) return { ok: false, motivo: 'caracteres-no-validos' };
  if (slug.length < SLUG_MIN) return { ok: false, motivo: 'demasiado-corto' };
  if (slug.length > SLUG_MAX) return { ok: false, motivo: 'demasiado-largo' };
  if (SLUGS_RESERVADOS.has(slug)) return { ok: false, motivo: 'reservado' };
  return { ok: true, slug };
}

/** Normaliza y valida de una vez. Lo que usa el formulario del panel. */
export function normalizarYValidar(texto: string): ResultadoSlug {
  return validarSlug(normalizarSlug(texto));
}

export const MENSAJES_SLUG: Record<SlugInvalido, string> = {
  vacio: 'Escribe un nombre para la dirección de vuestra boda.',
  'demasiado-corto': `La dirección necesita al menos ${SLUG_MIN} caracteres.`,
  'demasiado-largo': `La dirección no puede pasar de ${SLUG_MAX} caracteres.`,
  reservado: 'Esa dirección está reservada. Probad con otra.',
  'caracteres-no-validos':
    'Solo letras, números y guiones sueltos. No puede empezar ni acabar en guion.',
};
