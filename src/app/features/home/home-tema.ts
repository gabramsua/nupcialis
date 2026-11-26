import {
  acentoDeHome,
  fuenteDeHome,
  infoDePlantillaHome,
  type ContenidoHome,
  type PlantillaHome,
} from './home';

/**
 * Los colores y las formas de cada plantilla de la HOME, como variables CSS.
 *
 * Las secciones no saben en qué plantilla están: solo usan estas variables. Así
 * una plantilla nueva es una entrada más aquí, no un componente nuevo, y el
 * contraste de cada una se puede comprobar en un test sin montar nada.
 */
export interface TemaHome {
  readonly bg: string;
  readonly bgAlt: string;
  readonly surface: string;
  readonly text: string;
  readonly muted: string;
  readonly borde: string;
  readonly sombra: string;
  readonly radio: string;
  readonly radioBoton: string;
  readonly bordeBoton: string;
}

export const TEMAS_HOME: Readonly<Record<PlantillaHome, TemaHome>> = {
  luz: {
    bg: '#fbf8f4',
    bgAlt: '#f4ede4',
    surface: '#ffffff',
    text: '#2a2420',
    muted: '#6b6058',
    borde: '1px solid rgb(42 36 32 / 0.12)',
    sombra: '0 10px 30px rgb(42 36 32 / 0.06)',
    radio: '1.25rem',
    radioBoton: '999px',
    bordeBoton: '1.5px solid transparent',
  },
  editorial: {
    bg: '#f3efe8',
    bgAlt: '#e9e2d5',
    surface: '#ffffff',
    text: '#151311',
    muted: '#555049',
    borde: '1.5px solid #151311',
    sombra: '6px 6px 0 #151311',
    radio: '0.35rem',
    radioBoton: '0.35rem',
    bordeBoton: '1.5px solid #151311',
  },
  noche: {
    bg: '#15110f',
    bgAlt: '#1c1714',
    surface: '#241e1a',
    text: '#f5efe6',
    muted: '#b9aea2',
    borde: '1px solid rgb(245 239 230 / 0.14)',
    sombra: '0 18px 40px rgb(0 0 0 / 0.35)',
    radio: '1rem',
    radioBoton: '999px',
    bordeBoton: '1.5px solid transparent',
  },
};

export interface ColoresResueltos {
  readonly accent: string;
  readonly onAccent: string;
}

/** El acento que se pinta: el del superadmin, o el de la plantilla si no eligió. */
export function coloresDeHome(contenido: ContenidoHome): ColoresResueltos {
  const info = infoDePlantillaHome(contenido.template);
  const acento = acentoDeHome(contenido.accent || info.acento) ?? acentoDeHome(info.acento);
  const oscura = info.oscura;
  return {
    accent: oscura ? (acento?.suave ?? '#d9b45c') : (acento?.base ?? '#a14561'),
    onAccent: oscura ? TEMAS_HOME.noche.bg : '#ffffff',
  };
}

/** Las variables CSS de este contenido, listas para un `[style]`. */
export function variablesDeHome(contenido: ContenidoHome): string {
  const info = infoDePlantillaHome(contenido.template);
  const tema = TEMAS_HOME[info.id];
  const { accent, onAccent } = coloresDeHome(contenido);
  const titulo = fuenteDeHome(contenido.fontTitle || info.fuenteTitulo);
  const cuerpo = fuenteDeHome(contenido.fontBody || info.fuenteCuerpo);

  const variables: Record<string, string> = {
    '--h-bg': tema.bg,
    '--h-bg-alt': tema.bgAlt,
    '--h-surface': tema.surface,
    '--h-text': tema.text,
    '--h-muted': tema.muted,
    '--h-borde': tema.borde,
    '--h-sombra': tema.sombra,
    '--h-radio': tema.radio,
    '--h-radio-boton': tema.radioBoton,
    '--h-borde-boton': tema.bordeBoton,
    '--h-accent': accent,
    '--h-on-accent': onAccent,
    '--h-inv-bg': onAccent,
    '--h-inv-fg': accent,
    '--h-font-title': titulo?.familia ?? 'Georgia, serif',
    '--h-font-body': cuerpo?.familia ?? 'system-ui, sans-serif',
  };
  return Object.entries(variables)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}
