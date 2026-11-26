/**
 * El contenido de la HOME —la página de venta de `nupcialis.com`— tal y como lo
 * guarda y lo sirve el servidor.
 *
 * **Copia literal** del fichero del cliente
 * (`src/app/features/home/home.ts`), de la línea marcadora de abajo hasta el
 * final. No se edita solo este fichero: se editan los dos, o el test de la
 * copia falla.
 *
 * Aquí `sanearHome` se llama con `sanearHtml` (regla de oro 5): lo que escribe
 * el superadmin con el editor se sanea antes de guardarse, porque lo va a leer
 * cualquiera que abra la web.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

/** Límites. Los pone el servidor al guardar y el cliente al leer. */
export const MAX_TITULO = 140;
export const MAX_ETIQUETA = 60;
export const MAX_FRASE = 240;
export const MAX_HTML_CORTO = 700;
export const MAX_HTML = 1500;
export const MAX_URL = 600;
export const MAX_ALT = 160;
export const MAX_ITEMS_PROMESA = 4;
export const MAX_ITEMS_PASOS = 5;
export const MAX_ITEMS_LIBERTAD = 8;
export const MAX_VINETAS = 12;
export const MAX_ENLACES_PIE = 4;
export const MAX_DIAPOSITIVAS = 10;

// ---------------------------------------------------------------------------
// Plantillas, fuentes y colores: un catálogo cerrado, no texto libre.
//
// El superadmin **elige** entre opciones que ya se ven bien, igual que la
// pareja con su web. Una tipografía o un color escritos a mano acaban en una
// URL de fuentes inventada o en un texto que no se lee.
// ---------------------------------------------------------------------------

export const PLANTILLAS_HOME = ['luz', 'editorial', 'noche'] as const;
export type PlantillaHome = (typeof PLANTILLAS_HOME)[number];

export function esPlantillaHome(valor: unknown): valor is PlantillaHome {
  return typeof valor === 'string' && (PLANTILLAS_HOME as readonly string[]).includes(valor);
}

export interface FuenteHome {
  readonly id: string;
  readonly nombre: string;
  /** Lo que va en `font-family`. */
  readonly familia: string;
  /** El fragmento `family=…` de la URL de Google Fonts. */
  readonly google: string;
  readonly tipo: 'titulo' | 'cuerpo';
}

export const FUENTES_HOME: readonly FuenteHome[] = [
  {
    id: 'cormorant',
    nombre: 'Cormorant Garamond',
    familia: "'Cormorant Garamond', Georgia, serif",
    google: 'Cormorant+Garamond:wght@500;600;700',
    tipo: 'titulo',
  },
  {
    id: 'playfair',
    nombre: 'Playfair Display',
    familia: "'Playfair Display', Georgia, serif",
    google: 'Playfair+Display:wght@500;600;700',
    tipo: 'titulo',
  },
  {
    id: 'fraunces',
    nombre: 'Fraunces',
    familia: "'Fraunces', Georgia, serif",
    google: 'Fraunces:wght@500;600;700',
    tipo: 'titulo',
  },
  {
    id: 'dm-serif',
    nombre: 'DM Serif Display',
    familia: "'DM Serif Display', Georgia, serif",
    google: 'DM+Serif+Display',
    tipo: 'titulo',
  },
  {
    id: 'bodoni',
    nombre: 'Bodoni Moda',
    familia: "'Bodoni Moda', Georgia, serif",
    google: 'Bodoni+Moda:wght@500;600;700',
    tipo: 'titulo',
  },
  {
    id: 'cinzel',
    nombre: 'Cinzel',
    familia: "'Cinzel', Georgia, serif",
    google: 'Cinzel:wght@500;600;700',
    tipo: 'titulo',
  },
  {
    id: 'montserrat',
    nombre: 'Montserrat',
    familia: "'Montserrat', system-ui, sans-serif",
    google: 'Montserrat:wght@500;600;700',
    tipo: 'titulo',
  },
  {
    id: 'poppins',
    nombre: 'Poppins',
    familia: "'Poppins', system-ui, sans-serif",
    google: 'Poppins:wght@500;600;700',
    tipo: 'titulo',
  },
  {
    id: 'inter',
    nombre: 'Inter',
    familia: "'Inter', system-ui, sans-serif",
    google: 'Inter:wght@400;500;600',
    tipo: 'cuerpo',
  },
  {
    id: 'nunito',
    nombre: 'Nunito Sans',
    familia: "'Nunito Sans', system-ui, sans-serif",
    google: 'Nunito+Sans:wght@400;600;700',
    tipo: 'cuerpo',
  },
  {
    id: 'lato',
    nombre: 'Lato',
    familia: "'Lato', system-ui, sans-serif",
    google: 'Lato:wght@400;700',
    tipo: 'cuerpo',
  },
  {
    id: 'dm-sans',
    nombre: 'DM Sans',
    familia: "'DM Sans', system-ui, sans-serif",
    google: 'DM+Sans:wght@400;500;700',
    tipo: 'cuerpo',
  },
  {
    id: 'karla',
    nombre: 'Karla',
    familia: "'Karla', system-ui, sans-serif",
    google: 'Karla:wght@400;500;700',
    tipo: 'cuerpo',
  },
  {
    id: 'work-sans',
    nombre: 'Work Sans',
    familia: "'Work Sans', system-ui, sans-serif",
    google: 'Work+Sans:wght@400;500;600',
    tipo: 'cuerpo',
  },
];

export function fuenteDeHome(id: string): FuenteHome | null {
  return FUENTES_HOME.find((f) => f.id === id) ?? null;
}

/**
 * Los colores de acento. `base` va sobre fondos claros (el texto del botón es
 * blanco), `suave` sobre fondos oscuros (el texto del botón es oscuro). Un
 * test comprueba el contraste de las dos.
 */
export interface AcentoHome {
  readonly id: string;
  readonly nombre: string;
  readonly base: string;
  readonly suave: string;
}

export const ACENTOS_HOME: readonly AcentoHome[] = [
  { id: 'oro', nombre: 'Oro viejo', base: '#7d5f10', suave: '#d9b45c' },
  { id: 'rosa', nombre: 'Rosa empolvado', base: '#a14561', suave: '#eba3b6' },
  { id: 'salvia', nombre: 'Salvia', base: '#41674d', suave: '#a9cdb3' },
  { id: 'vino', nombre: 'Vino', base: '#7a2a3c', suave: '#e39aa9' },
  { id: 'azul', nombre: 'Azul noche', base: '#2b4f70', suave: '#9cc3e6' },
  { id: 'terracota', nombre: 'Terracota', base: '#a4482a', suave: '#f0a98c' },
];

export function acentoDeHome(id: string): AcentoHome | null {
  return ACENTOS_HOME.find((a) => a.id === id) ?? null;
}

export interface InfoPlantillaHome {
  readonly id: PlantillaHome;
  readonly nombre: string;
  readonly descripcion: string;
  readonly fuenteTitulo: string;
  readonly fuenteCuerpo: string;
  readonly acento: string;
  readonly oscura: boolean;
}

export const INFO_PLANTILLAS_HOME: readonly InfoPlantillaHome[] = [
  {
    id: 'luz',
    nombre: 'Luz',
    descripcion: 'Clara y cálida. Títulos con serif elegante y mucho aire.',
    fuenteTitulo: 'cormorant',
    fuenteCuerpo: 'nunito',
    acento: 'rosa',
    oscura: false,
  },
  {
    id: 'editorial',
    nombre: 'Editorial',
    descripcion: 'De revista. Tipografía grande, bloques de color y mucho contraste.',
    fuenteTitulo: 'fraunces',
    fuenteCuerpo: 'dm-sans',
    acento: 'terracota',
    oscura: false,
  },
  {
    id: 'noche',
    nombre: 'Noche',
    descripcion: 'Oscura y dramática. Dorados sobre fondo profundo.',
    fuenteTitulo: 'playfair',
    fuenteCuerpo: 'inter',
    acento: 'oro',
    oscura: true,
  },
];

export function infoDePlantillaHome(id: PlantillaHome): InfoPlantillaHome {
  return INFO_PLANTILLAS_HOME.find((p) => p.id === id) ?? INFO_PLANTILLAS_HOME[0]!;
}

/** Los iconos que se pueden elegir en las tarjetas. Todos están en el sprite `home`. */
export const ICONOS_HOME: readonly string[] = [
  'heart',
  'diamond',
  'sparkle',
  'eye-slash',
  'palette',
  'table',
  'users',
  'users-three',
  'gift',
  'camera',
  'images',
  'map-pin',
  'check-circle',
  'list-checks',
  'sliders-horizontal',
  'envelope',
  'chart-bar',
  'hand-heart',
  'star',
  'flower',
  'clock',
  'device-mobile',
  'paint-brush',
  'storefront',
  'seal-check',
  'rocket',
  'lock-open',
  'shield-check',
  'calendar-check',
  'desktop',
  'cursor-click',
  'confetti',
  'magic-wand',
  'layout',
];

// ---------------------------------------------------------------------------
// El contenido
// ---------------------------------------------------------------------------

export interface EnlaceHome {
  readonly label: string;
  readonly url: string;
}

/**
 * Una imagen de la HOME. `path` es la ruta en Storage, para poder borrarla; si
 * está vacía es una imagen que viene de serie con la aplicación (`/home/…`).
 */
export interface ImagenHome {
  readonly path: string;
  readonly url: string;
  readonly alt: string;
}

export interface ItemHome {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

export interface PasoHome {
  readonly title: string;
  readonly text: string;
}

export interface SeccionHome {
  readonly enabled: boolean;
  readonly title: string;
  /** HTML. Saneado en el servidor antes de guardarse. */
  readonly intro: string;
}

export interface HeroHome {
  readonly eyebrow: string;
  readonly title: string;
  /** HTML. */
  readonly subtitle: string;
  readonly cta: EnlaceHome;
  readonly secondary: EnlaceHome;
  readonly note: string;
  readonly image: ImagenHome | null;
}

export interface PromesaHome extends SeccionHome {
  readonly items: readonly ItemHome[];
}

export interface PasosHome extends SeccionHome {
  readonly items: readonly PasoHome[];
}

export interface PanelHome {
  readonly label: string;
  readonly title: string;
  /** HTML. */
  readonly text: string;
  readonly bullets: readonly string[];
  /**
   * El precio tal y como se enseña (`85 €`). Vacío = no se enseña. Lo decidió
   * Gabriel para esta primera tanda; el D-02 sigue abierto (ver PENDIENTES D-68).
   */
  readonly price: string;
  /** La letra pequeña del precio (`pago único`). */
  readonly priceNote: string;
  readonly cta: EnlaceHome;
  /**
   * Las capturas del panel de este plan, en una galería con flechas. La etiqueta
   * dice qué pantalla es («Timeline del día»). Una lista vacía = sin galería.
   */
  readonly shots: readonly DiapositivaHome[];
}

export interface PanelesHome extends SeccionHome {
  readonly basico: PanelHome;
  readonly extendido: PanelHome;
}

export interface LibertadHome extends SeccionHome {
  readonly items: readonly ItemHome[];
  readonly closing: string;
}

/**
 * Una captura con su etiqueta. En el escaparate es cómo se ve en un móvil una
 * plantilla con una paleta («Botánica · Salvia»); en los paneles, una pantalla
 * del panel («Timeline del día»).
 */
export interface DiapositivaHome {
  readonly image: ImagenHome;
  readonly label: string;
}

/**
 * El escaparate: lo que verán los invitados. Dos formas de enseñarlo que el
 * superadmin enciende y apaga por separado: **el mosaico** (una sola imagen con
 * todas las plantillas juntas) y **el carrusel** (una captura de móvil por
 * plantilla, para recorrerlas).
 */
export interface EscaparateHome extends SeccionHome {
  readonly mosaic: {
    readonly enabled: boolean;
    readonly show: VisibilidadHome;
    readonly image: ImagenHome | null;
  };
  readonly carousel: {
    readonly enabled: boolean;
    readonly show: VisibilidadHome;
    readonly slides: readonly DiapositivaHome[];
  };
  /**
   * Una captura de la pantalla «Diseño» del panel, debajo del mosaico: las
   * plantillas y las paletas con todas sus opciones, tal como las verán los
   * novios al elegir.
   */
  readonly design: {
    readonly enabled: boolean;
    readonly show: VisibilidadHome;
    readonly image: ImagenHome | null;
    readonly label: string;
  };
}

/**
 * En qué pantallas se ve una pieza del escaparate: en todas, solo en las
 * estrechas (móvil) o solo en las anchas (escritorio). El corte es el de la
 * propia HOME: una caja de 44 rem.
 */
export type VisibilidadHome = 'todos' | 'movil' | 'escritorio';

export const VISIBILIDADES_HOME: readonly VisibilidadHome[] = ['todos', 'movil', 'escritorio'];

/**
 * El formulario de contacto. Los nombres y el correo se piden siempre; el resto
 * de campos se encienden y apagan. A dónde llega la solicitud y a qué correo se
 * avisa **no** está aquí (este documento es público): ver `platform/homeRequests`.
 */
export interface ContactoHome extends SeccionHome {
  readonly submitLabel: string;
  readonly successTitle: string;
  readonly successText: string;
  /** La frase de la casilla de aceptación: qué se hace con los datos. */
  readonly privacy: string;
  readonly askPhone: boolean;
  readonly askDate: boolean;
  readonly askPlan: boolean;
  readonly askMessage: boolean;
}

export interface CierreHome {
  readonly enabled: boolean;
  readonly title: string;
  /** HTML. */
  readonly text: string;
  readonly cta: EnlaceHome;
  readonly contact: string;
}

export interface PieHome {
  readonly text: string;
  readonly links: readonly EnlaceHome[];
}

export interface SeoHome {
  readonly title: string;
  readonly description: string;
}

export interface ContenidoHome {
  readonly template: PlantillaHome;
  /** `''` = la de la plantilla. */
  readonly fontTitle: string;
  readonly fontBody: string;
  readonly accent: string;
  readonly seo: SeoHome;
  readonly hero: HeroHome;
  readonly promesa: PromesaHome;
  readonly pasos: PasosHome;
  readonly escaparate: EscaparateHome;
  readonly paneles: PanelesHome;
  readonly libertad: LibertadHome;
  readonly contacto: ContactoHome;
  readonly cierre: CierreHome;
  readonly pie: PieHome;
}

// ---------------------------------------------------------------------------
// Lo que viene de fábrica
// ---------------------------------------------------------------------------

const IMG = (url: string, alt: string): ImagenHome => ({ path: '', url, alt });

export const HOME_DE_FABRICA: ContenidoHome = {
  template: 'luz',
  fontTitle: '',
  fontBody: '',
  accent: '',
  seo: {
    title: 'Nupcialis · La web y el panel de vuestra boda',
    description:
      'Una web preciosa para vuestros invitados y un panel para organizarlo todo: confirmaciones, mesas, presupuesto y proveedores. Vosotros decidís cómo es.',
  },
  hero: {
    eyebrow: 'Vuestra boda, a vuestra manera',
    title: 'Una web preciosa para vuestros invitados. Un panel para tenerlo todo a mano.',
    subtitle:
      '<p>Confirmaciones, mesas, presupuesto y proveedores en un solo sitio, y una web propia en <strong>vuestronombre.nupcialis.com</strong> que se parece a vosotros. Sin hojas de cálculo y sin perseguir a nadie por WhatsApp.</p>',
    cta: { label: 'Quiero mi web de boda', url: '#contacto' },
    secondary: { label: 'Ver cómo funciona', url: '#como-funciona' },
    note: 'La preparáis vosotros, a vuestro ritmo.',
    image: IMG(
      '/home/hero.webp',
      'La web de una boda vista en un móvil y el panel de gestión en un portátil',
    ),
  },
  promesa: {
    enabled: true,
    title: 'Todo lo de la boda, donde lo vais a encontrar',
    intro:
      '<p>Organizar una boda son cientos de pequeñas decisiones. Nupcialis las reúne para que no se pierda ninguna y para que vuestros invitados sepan siempre qué toca.</p>',
    items: [
      {
        icon: 'device-mobile',
        title: 'Una web que da gusto abrir',
        text: 'Fecha, lugar, horarios y cómo llegar, en una página pensada para el móvil con el que la abrirán.',
      },
      {
        icon: 'check-circle',
        title: 'Confirmaciones sin persecuciones',
        text: 'Cada invitado confirma desde la web. Vosotros veis quién viene, con quién y qué come.',
      },
      {
        icon: 'sliders-horizontal',
        title: 'Un panel hecho para vosotros',
        text: 'Invitados, mesas, presupuesto, proveedores y tareas, con avisos de lo que falta.',
      },
    ],
  },
  pasos: {
    enabled: true,
    title: 'Así de fácil',
    intro: '<p>De cero a una web publicada en una tarde.</p>',
    items: [
      {
        title: 'Elegís el estilo',
        text: 'Una plantilla, una paleta de colores y vuestra foto de portada.',
      },
      {
        title: 'Lo rellenáis a vuestro aire',
        text: 'Horarios, mapa, regalos, alojamiento… solo lo que os haga falta, con un editor sencillo.',
      },
      {
        title: 'Compartís el enlace',
        text: 'Lo mandáis por WhatsApp. Cada cambio que hagáis se ve en la web en segundos.',
      },
      {
        title: 'Seguís la boda desde el panel',
        text: 'Quién ha confirmado, cómo van las mesas y el presupuesto, todo al día.',
      },
    ],
  },
  escaparate: {
    enabled: true,
    title: 'Lo que verán vuestros invitados',
    intro:
      '<p>Ocho plantillas y dieciocho paletas de colores. Elegís la que va con vosotros y la web se ve así en el móvil de cada invitado.</p>',
    mosaic: {
      enabled: true,
      // En una caja estrecha el mosaico queda muy pequeño: ahí manda el carrusel.
      show: 'escritorio',
      image: IMG(
        '/home/mosaico.webp',
        'Ocho webs de boda en un móvil, cada una con una plantilla y una paleta distintas',
      ),
    },
    carousel: {
      enabled: true,
      show: 'todos',
      slides: [
        { image: IMG('/home/movil-clasica.webp', 'Plantilla Clásica'), label: 'Clásica' },
        {
          image: IMG('/home/movil-botanica.webp', 'Plantilla Botánica con la paleta Salvia'),
          label: 'Botánica · Salvia',
        },
        {
          image: IMG('/home/movil-romantica.webp', 'Plantilla Romántica con la paleta Rosa palo'),
          label: 'Romántica · Rosa palo',
        },
        {
          image: IMG('/home/movil-moderna.webp', 'Plantilla Moderna con la paleta Grafito y oro'),
          label: 'Moderna · Grafito y oro',
        },
        {
          image: IMG('/home/movil-barroca.webp', 'Plantilla Barroca con la paleta Burdeos y oro'),
          label: 'Barroca · Burdeos y oro',
        },
        {
          image: IMG('/home/movil-sevillana.webp', 'Plantilla Sevillana con la paleta Terracota'),
          label: 'Sevillana · Terracota',
        },
        {
          image: IMG('/home/movil-cottage.webp', 'Plantilla Cottage con la paleta Oliva'),
          label: 'Cottage · Oliva',
        },
        {
          image: IMG('/home/movil-acuarela.webp', 'Plantilla Acuarela con la paleta Lavanda'),
          label: 'Acuarela · Lavanda',
        },
      ],
    },
    design: {
      enabled: true,
      show: 'todos',
      image: IMG(
        '/home/diseno.webp',
        'Pantalla de Diseño del panel de los novios, con las ocho plantillas y las dieciocho paletas de colores para elegir',
      ),
      label: 'Así elegiréis plantilla y colores desde vuestro panel.',
    },
  },
  paneles: {
    enabled: true,
    title: 'Dos formas de vivirlo',
    intro:
      '<p>Empezad por lo sencillo o llevad toda la organización dentro. Podéis empezar con el básico y pasar al extendido cuando lo necesitéis.</p>',
    basico: {
      label: 'Plan básico',
      title: 'La sencillez de una sola página',
      text: '<p>Una web clara y completa para que vuestros invitados tengan todo a un vistazo, y un panel mínimo para controlar las confirmaciones.</p>',
      bullets: [
        'Confirmación de asistencia con vuestras preguntas',
        'Mapa, cronología y preguntas frecuentes',
        'Regalos, alojamiento y autobuses',
      ],
      price: '85 €',
      priceNote: 'pago único',
      cta: { label: 'Quiero el básico', url: '#contacto' },
      shots: [
        {
          image: IMG(
            '/home/galeria-basico-1.webp',
            'El formulario de confirmación de asistencia en el panel del plan básico',
          ),
          label: 'Formulario de confirmación',
        },
        {
          image: IMG(
            '/home/galeria-basico-2.webp',
            'La pantalla de cómo llegar, con los sitios de la boda y su pin',
          ),
          label: 'Cómo llegar',
        },
        {
          image: IMG(
            '/home/galeria-basico-3.webp',
            'La cronología del día, hora a hora, en el panel del plan básico',
          ),
          label: 'Timeline del día',
        },
      ],
    },
    extendido: {
      label: 'Plan extendido',
      title: 'Toda la organización, en un solo panel',
      text: '<p>Para quienes quieren llevar la boda entera: mesas, presupuesto, proveedores, tareas y todos los detalles que hacen especial el día.</p>',
      bullets: [
        'Reparto de mesas arrastrando a los invitados',
        'Presupuesto, proveedores y tareas enlazados',
        'Galería de fotos, Trivial, música y libro de firmas',
      ],
      price: '250 €',
      priceNote: 'pago único',
      cta: { label: 'Quiero el extendido', url: '#contacto' },
      shots: [
        {
          image: IMG(
            '/home/galeria-extendido-1.webp',
            'El reparto de mesas con los invitados sentados en cada una',
          ),
          label: 'Mesas con sus invitados',
        },
        {
          image: IMG(
            '/home/galeria-extendido-2.webp',
            'La galería de fotos de los invitados, con las fotos desenfocadas',
          ),
          label: 'Galería de fotos',
        },
        {
          image: IMG(
            '/home/galeria-extendido-3.webp',
            'La página de tareas con su progreso y lo que vence primero',
          ),
          label: 'Tareas',
        },
        {
          image: IMG(
            '/home/galeria-extendido-4.webp',
            'La lista de tareas de la boda, completa, con las hechas y las que faltan',
          ),
          label: 'Todas las tareas de la boda',
        },
      ],
    },
  },
  libertad: {
    enabled: true,
    title: 'Vosotros sois los dueños de vuestra boda',
    intro:
      '<p>Nada viene impuesto. Cada detalle lo decidís vosotros y lo cambiáis cuando queráis, también después de publicar.</p>',
    items: [
      {
        icon: 'layout',
        title: 'Temas',
        text: 'Ocho plantillas con personalidad propia. Cambiáis de una a otra sin perder nada.',
      },
      {
        icon: 'palette',
        title: 'Colores',
        text: 'Paletas pensadas para leerse bien con el móvil al sol, o los colores de vuestra plantilla.',
      },
      {
        icon: 'users',
        title: 'Invitados',
        text: 'Grupos, acompañantes y quién confirma qué. Importáis la lista y la ordenáis como queráis.',
      },
      {
        icon: 'table',
        title: 'Mesas',
        text: 'Sentáis a cada persona arrastrándola. Probáis, deshacéis y volvéis a probar.',
      },
      {
        icon: 'storefront',
        title: 'Proveedores',
        text: 'Contactos, contratos y pagos de cada proveedor, enlazados con vuestro presupuesto.',
      },
      {
        icon: 'eye-slash',
        title: 'Lo que se ve y lo que no',
        text: 'Encendéis y apagáis cada sección de la web. Enseñáis lo que queráis, cuando queráis.',
      },
    ],
    closing: 'Es vuestra boda. Nosotros solo ponemos las herramientas.',
  },
  contacto: {
    enabled: true,
    title: '¿Empezamos con vuestra web?',
    intro:
      '<p>Contadnos quiénes sois y os escribimos para preparar vuestra web de boda y el acceso a vuestro panel.</p>',
    submitLabel: 'Quiero mi web de boda',
    successTitle: '¡Recibido!',
    successText: 'Os escribimos muy pronto al correo que nos habéis dado.',
    privacy:
      'Acepto que Nupcialis use estos datos para contestarme. No se comparten con nadie y puedo pedir que se borren cuando quiera.',
    askPhone: true,
    askDate: true,
    askPlan: true,
    askMessage: true,
  },
  cierre: {
    enabled: true,
    title: '¿Prefieres escribirnos?',
    text: '<p>Si os resulta más cómodo, contadnos vuestro caso por correo y os contestamos igual.</p>',
    cta: { label: 'Escribirnos', url: 'mailto:hola@nupcialis.com' },
    contact: 'hola@nupcialis.com',
  },
  pie: {
    text: '© Nupcialis',
    links: [],
  },
};

// ---------------------------------------------------------------------------
// Saneado: lo que llega, sea lo que sea, sale como un `ContenidoHome` completo
// ---------------------------------------------------------------------------

/**
 * Cómo se sanea un campo HTML. En el servidor es `sanearHtml` (sanitize-html);
 * en el cliente no hay nada que hacer, porque el HTML ya salió saneado del
 * servidor y Angular lo vuelve a sanear al pintarlo (regla de oro 5).
 */
export type SaneadorHtml = (valor: unknown, maximo: number) => string;

const SIN_SANEAR: SaneadorHtml = (valor, maximo) =>
  typeof valor === 'string' ? valor.slice(0, maximo) : '';

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

/** Un texto plano recortado. Si no llega texto, el de reserva; si llega vacío, vacío. */
function frase(valor: unknown, maximo: number, reserva: string): string {
  if (typeof valor !== 'string') return reserva;
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

function booleano(valor: unknown, reserva: boolean): boolean {
  return typeof valor === 'boolean' ? valor : reserva;
}

function lista<T>(
  valor: unknown,
  maximo: number,
  reserva: readonly T[],
  uno: (x: unknown) => T | null,
) {
  if (!Array.isArray(valor)) return reserva;
  const salida: T[] = [];
  for (const x of valor) {
    if (salida.length >= maximo) break;
    const limpio = uno(x);
    if (limpio !== null) salida.push(limpio);
  }
  return salida;
}

/**
 * Un enlace de la HOME: `https`, `mailto`, `tel`, un ancla (`#contacto`) o una
 * ruta de la propia web. Nada de `javascript:` ni de esquemas raros.
 */
export function esUrlDeEnlaceHome(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false;
  if (valor.length === 0 || valor.length > MAX_URL) return false;
  if (/^#[a-z0-9_-]{1,60}$/i.test(valor)) return true;
  if (/^\/(?!\/)[a-z0-9/_\-.?=&#]*$/i.test(valor)) return true;
  if (/^(mailto|tel):[^\s<>"']+$/i.test(valor)) return true;
  if (/^https:\/\/[^\s<>"']+$/i.test(valor)) return true;
  return false;
}

/** Una imagen: de serie (`/home/…`) o de Storage. Ni `data:` ni dominios ajenos. */
export function esUrlDeImagenHome(valor: unknown): valor is string {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > MAX_URL) return false;
  if (/^\/home\/[a-z0-9._-]+$/i.test(valor)) return true;
  return /^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//.test(valor);
}

function esRutaDeImagenHome(valor: unknown): valor is string {
  return typeof valor === 'string' && /^platform\/home\/[a-z0-9._-]{1,120}$/i.test(valor);
}

function enlace(valor: unknown, reserva: EnlaceHome): EnlaceHome {
  const o = objeto(valor);
  if (Object.keys(o).length === 0) return reserva;
  const label = frase(o['label'], MAX_ETIQUETA, reserva.label);
  const url = esUrlDeEnlaceHome(o['url']) ? o['url'] : reserva.url;
  return { label, url };
}

function imagen(valor: unknown, reserva: ImagenHome | null): ImagenHome | null {
  // `null` guardado a propósito = «sin imagen». Que falte la clave = la de fábrica.
  if (valor === null) return null;
  const o = objeto(valor);
  if (Object.keys(o).length === 0) return reserva;
  if (!esUrlDeImagenHome(o['url'])) return reserva;
  const path = esRutaDeImagenHome(o['path']) ? o['path'] : '';
  return { path, url: o['url'], alt: frase(o['alt'], MAX_ALT, '') };
}

function icono(valor: unknown, reserva: string): string {
  return typeof valor === 'string' && ICONOS_HOME.includes(valor) ? valor : reserva;
}

function seccion(valor: unknown, reserva: SeccionHome, html: SaneadorHtml): SeccionHome {
  const o = objeto(valor);
  return {
    enabled: booleano(o['enabled'], reserva.enabled),
    title: frase(o['title'], MAX_TITULO, reserva.title),
    intro: 'intro' in o ? html(o['intro'], MAX_HTML) : reserva.intro,
  };
}

function items(valor: unknown, maximo: number, reserva: readonly ItemHome[]): readonly ItemHome[] {
  return lista(valor, maximo, reserva, (x) => {
    const o = objeto(x);
    const title = frase(o['title'], MAX_ETIQUETA, '');
    if (title === '') return null;
    return {
      icon: icono(o['icon'], 'sparkle'),
      title,
      text: frase(o['text'], MAX_FRASE, ''),
    };
  });
}

function vinetas(valor: unknown, reserva: readonly string[]): readonly string[] {
  return lista(valor, MAX_VINETAS, reserva, (x) => {
    const t = frase(x, MAX_FRASE, '');
    return t === '' ? null : t;
  });
}

function imagenDeDiapositiva(valor: unknown): ImagenHome | null {
  const o = objeto(valor);
  if (!esUrlDeImagenHome(o['url'])) return null;
  const path = esRutaDeImagenHome(o['path']) ? o['path'] : '';
  return { path, url: o['url'], alt: frase(o['alt'], MAX_ALT, '') };
}

function panel(valor: unknown, reserva: PanelHome, html: SaneadorHtml): PanelHome {
  const o = objeto(valor);
  return {
    label: frase(o['label'], MAX_ETIQUETA, reserva.label),
    title: frase(o['title'], MAX_TITULO, reserva.title),
    text: 'text' in o ? html(o['text'], MAX_HTML) : reserva.text,
    bullets: vinetas(o['bullets'], reserva.bullets),
    price: frase(o['price'], MAX_ETIQUETA, reserva.price),
    priceNote: frase(o['priceNote'], MAX_ETIQUETA, reserva.priceNote),
    cta: enlace(o['cta'], reserva.cta),
    // Una lista guardada vacía a propósito es «sin galería»; que falte la
    // clave —un documento anterior a las galerías— es «las de fábrica».
    shots: lista(o['shots'], MAX_DIAPOSITIVAS, reserva.shots, (x) => {
      const d = objeto(x);
      const image = imagenDeDiapositiva(d['image']);
      return image === null ? null : { image, label: frase(d['label'], MAX_ETIQUETA, '') };
    }),
  };
}

function visibilidad(valor: unknown, reserva: VisibilidadHome): VisibilidadHome {
  return VISIBILIDADES_HOME.find((v) => v === valor) ?? reserva;
}

function escaparate(valor: unknown, reserva: EscaparateHome, html: SaneadorHtml): EscaparateHome {
  const o = objeto(valor);
  const mosaico = objeto(o['mosaic']);
  const carrusel = objeto(o['carousel']);
  const diseno = objeto(o['design']);
  return {
    ...seccion(o, reserva, html),
    design: {
      enabled: booleano(diseno['enabled'], reserva.design.enabled),
      show: visibilidad(diseno['show'], reserva.design.show),
      image:
        'image' in diseno ? imagen(diseno['image'], reserva.design.image) : reserva.design.image,
      label: frase(diseno['label'], MAX_FRASE, reserva.design.label),
    },
    mosaic: {
      enabled: booleano(mosaico['enabled'], reserva.mosaic.enabled),
      show: visibilidad(mosaico['show'], reserva.mosaic.show),
      image:
        'image' in mosaico ? imagen(mosaico['image'], reserva.mosaic.image) : reserva.mosaic.image,
    },
    carousel: {
      enabled: booleano(carrusel['enabled'], reserva.carousel.enabled),
      show: visibilidad(carrusel['show'], reserva.carousel.show),
      // Una lista guardada vacía a propósito es «sin capturas»; que falte la
      // clave es «las de fábrica».
      slides: lista(carrusel['slides'], MAX_DIAPOSITIVAS, reserva.carousel.slides, (x) => {
        const d = objeto(x);
        const image = imagenDeDiapositiva(d['image']);
        return image === null ? null : { image, label: frase(d['label'], MAX_ETIQUETA, '') };
      }),
    },
  };
}

function contacto(valor: unknown, reserva: ContactoHome, html: SaneadorHtml): ContactoHome {
  const o = objeto(valor);
  return {
    ...seccion(o, reserva, html),
    submitLabel: frase(o['submitLabel'], MAX_ETIQUETA, reserva.submitLabel) || reserva.submitLabel,
    successTitle: frase(o['successTitle'], MAX_TITULO, reserva.successTitle),
    successText: frase(o['successText'], MAX_FRASE, reserva.successText),
    privacy: frase(o['privacy'], MAX_FRASE, reserva.privacy) || reserva.privacy,
    askPhone: booleano(o['askPhone'], reserva.askPhone),
    askDate: booleano(o['askDate'], reserva.askDate),
    askPlan: booleano(o['askPlan'], reserva.askPlan),
    askMessage: booleano(o['askMessage'], reserva.askMessage),
  };
}

/**
 * El contenido de la HOME, siempre completo y siempre dentro de los límites.
 * Nunca lanza: lo que falta o no vale se sustituye por lo de fábrica.
 */
export function sanearHome(
  valor: unknown,
  html: SaneadorHtml = SIN_SANEAR,
  fabrica: ContenidoHome = HOME_DE_FABRICA,
): ContenidoHome {
  const o = objeto(valor);
  const seo = objeto(o['seo']);
  const hero = objeto(o['hero']);
  const promesa = objeto(o['promesa']);
  const pasos = objeto(o['pasos']);
  const paneles = objeto(o['paneles']);
  const libertad = objeto(o['libertad']);
  const cierre = objeto(o['cierre']);
  const pie = objeto(o['pie']);

  const fontTitle = typeof o['fontTitle'] === 'string' ? o['fontTitle'] : fabrica.fontTitle;
  const fontBody = typeof o['fontBody'] === 'string' ? o['fontBody'] : fabrica.fontBody;
  const accent = typeof o['accent'] === 'string' ? o['accent'] : fabrica.accent;

  return {
    template: esPlantillaHome(o['template']) ? o['template'] : fabrica.template,
    fontTitle: fuenteDeHome(fontTitle)?.tipo === 'titulo' ? fontTitle : '',
    fontBody: fuenteDeHome(fontBody)?.tipo === 'cuerpo' ? fontBody : '',
    accent: acentoDeHome(accent) ? accent : '',
    seo: {
      title: frase(seo['title'], MAX_TITULO, fabrica.seo.title),
      description: frase(seo['description'], 300, fabrica.seo.description),
    },
    hero: {
      eyebrow: frase(hero['eyebrow'], MAX_ETIQUETA * 2, fabrica.hero.eyebrow),
      title: frase(hero['title'], MAX_TITULO, fabrica.hero.title),
      subtitle: 'subtitle' in hero ? html(hero['subtitle'], MAX_HTML_CORTO) : fabrica.hero.subtitle,
      cta: enlace(hero['cta'], fabrica.hero.cta),
      secondary: enlace(hero['secondary'], fabrica.hero.secondary),
      note: frase(hero['note'], MAX_FRASE, fabrica.hero.note),
      image: 'image' in hero ? imagen(hero['image'], fabrica.hero.image) : fabrica.hero.image,
    },
    promesa: {
      ...seccion(promesa, fabrica.promesa, html),
      items: items(promesa['items'], MAX_ITEMS_PROMESA, fabrica.promesa.items),
    },
    pasos: {
      ...seccion(pasos, fabrica.pasos, html),
      items: lista(pasos['items'], MAX_ITEMS_PASOS, fabrica.pasos.items, (x) => {
        const p = objeto(x);
        const title = frase(p['title'], MAX_ETIQUETA, '');
        return title === '' ? null : { title, text: frase(p['text'], MAX_FRASE, '') };
      }),
    },
    escaparate: escaparate(o['escaparate'], fabrica.escaparate, html),
    paneles: {
      ...seccion(paneles, fabrica.paneles, html),
      basico: panel(paneles['basico'], fabrica.paneles.basico, html),
      extendido: panel(paneles['extendido'], fabrica.paneles.extendido, html),
    },
    libertad: {
      ...seccion(libertad, fabrica.libertad, html),
      items: items(libertad['items'], MAX_ITEMS_LIBERTAD, fabrica.libertad.items),
      closing: frase(libertad['closing'], MAX_FRASE, fabrica.libertad.closing),
    },
    contacto: contacto(o['contacto'], fabrica.contacto, html),
    cierre: {
      enabled: booleano(cierre['enabled'], fabrica.cierre.enabled),
      title: frase(cierre['title'], MAX_TITULO, fabrica.cierre.title),
      text: 'text' in cierre ? html(cierre['text'], MAX_HTML) : fabrica.cierre.text,
      cta: enlace(cierre['cta'], fabrica.cierre.cta),
      contact: frase(cierre['contact'], MAX_ETIQUETA * 2, fabrica.cierre.contact),
    },
    pie: {
      text: frase(pie['text'], MAX_FRASE, fabrica.pie.text),
      links: lista(pie['links'], MAX_ENLACES_PIE, fabrica.pie.links, (x) => {
        const e = objeto(x);
        const label = frase(e['label'], MAX_ETIQUETA, '');
        if (label === '' || !esUrlDeEnlaceHome(e['url'])) return null;
        return { label, url: e['url'] };
      }),
    },
  };
}

/** Las familias de Google Fonts que hay que descargar para este contenido. */
export function urlDeFuentesHome(contenido: ContenidoHome): string {
  const info = infoDePlantillaHome(contenido.template);
  const titulo = fuenteDeHome(contenido.fontTitle || info.fuenteTitulo);
  const cuerpo = fuenteDeHome(contenido.fontBody || info.fuenteCuerpo);
  const familias = [titulo, cuerpo].filter((f): f is FuenteHome => f !== null);
  const unicas = [...new Set(familias.map((f) => `family=${f.google}`))];
  return `https://fonts.googleapis.com/css2?${unicas.join('&')}&display=swap`;
}
