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
  {
    id: 'lavanda',
    nombre: 'Lavanda',
    colores: {
      primary: '#5b4a8a',
      secondary: '#7a68ab',
      background: '#f7f5fb',
      surface: '#ffffff',
      text: '#26212f',
      accent: '#a1456b',
    },
  },
  {
    id: 'terracota',
    nombre: 'Terracota',
    colores: {
      primary: '#9a4a2c',
      secondary: '#b0603d',
      background: '#fcf6f1',
      surface: '#ffffff',
      text: '#2f241e',
      accent: '#3f6b5c',
    },
  },
  {
    id: 'cereza',
    nombre: 'Cereza',
    colores: {
      primary: '#8c1f3a',
      secondary: '#a8475f',
      background: '#fdf6f6',
      surface: '#ffffff',
      text: '#2a1a1e',
      accent: '#2f5d62',
    },
  },
  {
    id: 'salvia',
    nombre: 'Salvia',
    colores: {
      primary: '#3e5c53',
      secondary: '#648074',
      background: '#f3f6f4',
      surface: '#ffffff',
      text: '#1f2a26',
      accent: '#a2573b',
    },
  },
  {
    id: 'marino',
    nombre: 'Marino',
    colores: {
      primary: '#e8c987',
      secondary: '#8fb0d6',
      background: '#0f2236',
      surface: '#1a3350',
      text: '#eef3f8',
      accent: '#f08f78',
    },
  },
  {
    id: 'vino',
    nombre: 'Vino',
    colores: {
      primary: '#e7c9a0',
      secondary: '#d39aa7',
      background: '#3a1522',
      surface: '#4d1f2f',
      text: '#f8eeea',
      accent: '#f1a58b',
    },
  },
  {
    id: 'tinto-rosa',
    nombre: 'Tinto y rosa',
    colores: {
      primary: '#7a1f3a',
      secondary: '#a8546a',
      background: '#fdf3f1',
      surface: '#ffffff',
      text: '#33191f',
      accent: '#8a6420',
    },
  },
  {
    id: 'burdeos-oro',
    nombre: 'Burdeos y oro',
    colores: {
      primary: '#d9b56c',
      secondary: '#d28a9b',
      background: '#2a0d18',
      surface: '#3c1727',
      text: '#f8ece8',
      accent: '#f0a090',
    },
  },
  {
    id: 'grafito-oro',
    nombre: 'Grafito y oro',
    colores: {
      primary: '#d6b66b',
      secondary: '#a9aeb4',
      background: '#1f2124',
      surface: '#2b2e32',
      text: '#f0eeea',
      accent: '#ecd8a0',
    },
  },
  {
    id: 'perla-oro',
    nombre: 'Perla y oro',
    colores: {
      primary: '#4a4e54',
      secondary: '#7b8087',
      background: '#f3f3f1',
      surface: '#ffffff',
      text: '#26282b',
      accent: '#8f6a1f',
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
