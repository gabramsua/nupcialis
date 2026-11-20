/**
 * Catálogo de paletas de marca.
 *
 * **Cerrado, como el de plantillas y por el mismo motivo.** Seis selectores de
 * color sueltos producen, con mucha fiabilidad, texto gris claro sobre fondo
 * beige: ilegible al sol, que es donde media lista de invitados va a abrir la
 * web. Lo que vende este producto es que ninguna boda quede mal, y eso solo se
 * puede prometer si alguien ha mirado antes cada combinación.
 *
 * Cada paleta pasa un test de contraste (WCAG AA) antes de entrar. Si alguien
 * añade una con el texto ilegible, el test falla y no se mergea.
 *
 * La paleta se aplica **entera o nada**: media paleta mezcla tres colores de la
 * pareja con tres de la plantilla, que es peor que ninguno.
 */

export interface ColoresPaleta {
  /** Titulares y elementos principales. */
  readonly primary: string;
  /** Apoyos: separadores, fondos suaves, texto secundario. */
  readonly secondary: string;
  /** El fondo de la página. */
  readonly background: string;
  /** Tarjetas y cajas por encima del fondo. */
  readonly surface: string;
  /** El texto. */
  readonly text: string;
  /** Un solo color para lo que tiene que destacar. */
  readonly accent: string;
}

export interface Paleta {
  readonly id: string;
  readonly nombre: string;
  readonly colores: ColoresPaleta;
}

export const PALETAS: readonly Paleta[] = [
  {
    id: 'arena',
    nombre: 'Arena',
    colores: {
      primary: '#7a5438',
      secondary: '#a8825e',
      background: '#faf7f2',
      surface: '#ffffff',
      text: '#2b2420',
      accent: '#9c443c',
    },
  },
  {
    id: 'oliva',
    nombre: 'Oliva',
    colores: {
      primary: '#4a5a3c',
      secondary: '#7d8c6c',
      background: '#f6f7f2',
      surface: '#ffffff',
      text: '#262b22',
      accent: '#7a5a28',
    },
  },
  {
    id: 'bruma',
    nombre: 'Bruma',
    colores: {
      primary: '#33505f',
      secondary: '#6d8798',
      background: '#f4f7f9',
      surface: '#ffffff',
      text: '#1f272d',
      accent: '#a4563a',
    },
  },
  {
    id: 'rosa-palo',
    nombre: 'Rosa palo',
    colores: {
      primary: '#8f4655',
      secondary: '#b97a86',
      background: '#fbf5f5',
      surface: '#ffffff',
      text: '#2e2326',
      accent: '#64548a',
    },
  },
  {
    id: 'marfil',
    nombre: 'Marfil',
    colores: {
      primary: '#4a443f',
      secondary: '#8a827a',
      background: '#ffffff',
      surface: '#f7f6f4',
      text: '#22201e',
      accent: '#8a4c39',
    },
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    colores: {
      primary: '#dcceb0',
      secondary: '#9bb8a6',
      background: '#1a382c',
      surface: '#254a3a',
      text: '#f2efe6',
      accent: '#e8b878',
    },
  },
  {
    id: 'noche',
    nombre: 'Noche',
    colores: {
      primary: '#d3bd88',
      secondary: '#9db4c6',
      background: '#141f29',
      surface: '#1e2c39',
      text: '#eef2f5',
      accent: '#e0977a',
    },
  },
  {
    id: 'tinta',
    nombre: 'Tinta',
    colores: {
      primary: '#d8b44a',
      secondary: '#b0a89e',
      background: '#1c1a19',
      surface: '#282524',
      text: '#f1ece5',
      accent: '#dd8a68',
    },
  },
];

/** Las seis claves, en el orden en que se enseñan. */
export const CLAVES_PALETA = [
  'primary',
  'secondary',
  'background',
  'surface',
  'text',
  'accent',
] as const;

/**
 * Qué paleta del catálogo son estos colores, si es alguna.
 *
 * Se deduce comparando en vez de guardar el id junto a los colores: guardar las
 * dos cosas las deja divergir en cuanto se retoca una paleta del catálogo.
 */
export function paletaDeColores(colores: ColoresPaleta | null): Paleta | null {
  if (!colores) return null;
  return (
    PALETAS.find((paleta) =>
      CLAVES_PALETA.every(
        (clave) => paleta.colores[clave].toLowerCase() === colores[clave]?.toLowerCase(),
      ),
    ) ?? null
  );
}

/** La paleta con ese id, o `null`. Una boda puede no tener ninguna elegida. */
export function paletaDe(id: unknown): Paleta | null {
  return PALETAS.find((paleta) => paleta.id === id) ?? null;
}
