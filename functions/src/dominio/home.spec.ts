import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { sanearHtml } from './html';
import {
  ACENTOS_HOME,
  FUENTES_HOME,
  HOME_DE_FABRICA,
  ICONOS_HOME,
  INFO_PLANTILLAS_HOME,
  MAX_ITEMS_LIBERTAD,
  esUrlDeEnlaceHome,
  esUrlDeImagenHome,
  fuenteDeHome,
  sanearHome,
  urlDeFuentesHome,
} from './home';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de la HOME', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./home.ts')).toBe(cuerpo('../../../src/app/features/home/home.ts'));
  });
});

describe('sanearHome', () => {
  it('aguanta cualquier basura y devuelve lo de fábrica', () => {
    for (const basura of [null, undefined, 42, 'texto', [], [null, 1, 'x']]) {
      expect(sanearHome(basura)).toEqual(HOME_DE_FABRICA);
    }
  });

  it('es idempotente: sanear lo ya saneado no cambia nada', () => {
    const una = sanearHome({
      template: 'noche',
      hero: { title: '  Hola  ', image: null },
      libertad: { items: [{ icon: 'heart', title: 'Uno', text: 'x' }] },
    });
    expect(sanearHome(una)).toEqual(una);
    expect(sanearHome(HOME_DE_FABRICA)).toEqual(HOME_DE_FABRICA);
  });

  it('una plantilla, fuente o acento desconocidos caen a la plantilla', () => {
    const c = sanearHome({ template: 'rara', fontTitle: 'comic', fontBody: 'cinzel', accent: 'x' });
    expect(c.template).toBe(HOME_DE_FABRICA.template);
    expect(c.fontTitle).toBe('');
    // `cinzel` es de títulos: no vale como fuente del cuerpo.
    expect(c.fontBody).toBe('');
    expect(c.accent).toBe('');
  });

  it('acepta una fuente y un acento del catálogo', () => {
    const c = sanearHome({ fontTitle: 'bodoni', fontBody: 'lato', accent: 'vino' });
    expect([c.fontTitle, c.fontBody, c.accent]).toEqual(['bodoni', 'lato', 'vino']);
  });

  it('un texto vacío guardado a propósito se respeta; si falta, vale el de fábrica', () => {
    expect(sanearHome({ hero: { eyebrow: '' } }).hero.eyebrow).toBe('');
    expect(sanearHome({ hero: {} }).hero.eyebrow).toBe(HOME_DE_FABRICA.hero.eyebrow);
  });

  it('recorta los textos largos y limita las listas', () => {
    const c = sanearHome({
      hero: { title: 'x'.repeat(5000) },
      libertad: {
        items: Array.from({ length: 40 }, (_, i) => ({ icon: 'heart', title: `T${i}`, text: '' })),
      },
    });
    expect(c.hero.title.length).toBeLessThanOrEqual(140);
    expect(c.libertad.items).toHaveLength(MAX_ITEMS_LIBERTAD);
  });

  it('descarta tarjetas sin título y cambia un icono desconocido por uno del catálogo', () => {
    const c = sanearHome({
      promesa: {
        items: [
          { icon: 'heart', title: '', text: 'sin título' },
          { icon: 'no-existe', title: 'Bien', text: '' },
        ],
      },
    });
    expect(c.promesa.items).toEqual([{ icon: 'sparkle', title: 'Bien', text: '' }]);
  });

  it('pasa por el saneador cada campo HTML', () => {
    const vistos: string[] = [];
    sanearHome(
      {
        hero: { subtitle: '<p>a</p>' },
        promesa: { intro: '<p>b</p>' },
        paneles: { basico: { text: '<p>c</p>' } },
        cierre: { text: '<p>d</p>' },
      },
      (v) => {
        vistos.push(String(v));
        return 'LIMPIO';
      },
    );
    expect(vistos.sort()).toEqual(['<p>a</p>', '<p>b</p>', '<p>c</p>', '<p>d</p>']);
  });

  it('con el saneador real, el HTML peligroso no sobrevive', () => {
    const c = sanearHome(
      {
        hero: {
          subtitle:
            '<p onclick="x()">Hola</p><script>alert(1)</script><a href="javascript:x()">a</a>',
        },
      },
      sanearHtml,
    );
    expect(c.hero.subtitle).not.toContain('script');
    expect(c.hero.subtitle).not.toContain('onclick');
    expect(c.hero.subtitle).not.toContain('javascript:');
    expect(c.hero.subtitle).toContain('Hola');
  });
});

describe('enlaces e imágenes', () => {
  it('solo valen https, mailto, tel, anclas y rutas de la propia web', () => {
    for (const bien of [
      'https://nupcialis.com',
      'mailto:hola@nupcialis.com',
      'tel:+34600111222',
      '#contacto',
      '/privacidad',
    ]) {
      expect(esUrlDeEnlaceHome(bien), bien).toBe(true);
    }
    for (const mal of [
      'javascript:alert(1)',
      'data:text/html,hola',
      'http://inseguro.com',
      '//otro.com',
      'ftp://x',
      '',
      '#',
      'https://x.com/ <script>',
    ]) {
      expect(esUrlDeEnlaceHome(mal), mal).toBe(false);
    }
  });

  it('una URL de enlace rara se sustituye por la de fábrica', () => {
    const c = sanearHome({ hero: { cta: { label: 'Hola', url: 'javascript:x()' } } });
    expect(c.hero.cta).toEqual({ label: 'Hola', url: HOME_DE_FABRICA.hero.cta.url });
  });

  it('las imágenes son de serie o de Storage, nunca de otro dominio ni data:', () => {
    expect(esUrlDeImagenHome('/home/hero.webp')).toBe(true);
    expect(esUrlDeImagenHome('https://firebasestorage.googleapis.com/v0/b/x/o/y?alt=media')).toBe(
      true,
    );
    for (const mal of [
      'https://evil.com/a.png',
      'data:image/png;base64,AAAA',
      '/otra/ruta.png',
      '',
    ]) {
      expect(esUrlDeImagenHome(mal), mal).toBe(false);
    }
  });

  it('`image: null` guardado quita la imagen; una imagen mala conserva la de fábrica', () => {
    expect(sanearHome({ hero: { image: null } }).hero.image).toBeNull();
    expect(sanearHome({ hero: { image: { url: 'https://evil.com/a.png' } } }).hero.image).toEqual(
      HOME_DE_FABRICA.hero.image,
    );
  });

  it('la ruta de Storage solo se conserva si es de la HOME', () => {
    const url = 'https://firebasestorage.googleapis.com/v0/b/x/o/y?alt=media';
    const buena = sanearHome({ hero: { image: { url, path: 'platform/home/1.jpg', alt: 'a' } } });
    expect(buena.hero.image).toEqual({ url, path: 'platform/home/1.jpg', alt: 'a' });
    const mala = sanearHome({ hero: { image: { url, path: 'weddings/otra/hero/1.jpg' } } });
    expect(mala.hero.image?.path).toBe('');
  });
});

describe('el catálogo', () => {
  it('las plantillas apuntan a fuentes y acentos que existen, del tipo que toca', () => {
    for (const p of INFO_PLANTILLAS_HOME) {
      expect(fuenteDeHome(p.fuenteTitulo)?.tipo).toBe('titulo');
      expect(fuenteDeHome(p.fuenteCuerpo)?.tipo).toBe('cuerpo');
      expect(ACENTOS_HOME.some((a) => a.id === p.acento)).toBe(true);
    }
  });

  it('la URL de fuentes lleva las dos familias de la plantilla', () => {
    const url = urlDeFuentesHome(HOME_DE_FABRICA);
    expect(url).toContain('Cormorant+Garamond');
    expect(url).toContain('Nunito+Sans');
    expect(url.startsWith('https://fonts.googleapis.com/css2?')).toBe(true);
  });

  it('no hay fuentes repetidas', () => {
    expect(new Set(FUENTES_HOME.map((f) => f.id)).size).toBe(FUENTES_HOME.length);
  });

  it('todos los iconos elegibles están en el sprite de la web de venta', () => {
    const catalogo = JSON.parse(
      readFileSync(
        new URL('../../../src/app/design-system/icons/icons.json', import.meta.url),
        'utf8',
      ),
    ) as { categorias: Record<string, { iconos: { id: string; surfaces: string[] }[] }> };
    const enHome = new Set(
      Object.values(catalogo.categorias)
        .flatMap((c) => c.iconos)
        .filter((i) => i.surfaces.includes('home'))
        .map((i) => i.id),
    );
    expect(ICONOS_HOME.filter((i) => !enHome.has(i))).toEqual([]);
  });

  it('lo de fábrica usa solo iconos del catálogo', () => {
    const usados = [...HOME_DE_FABRICA.promesa.items, ...HOME_DE_FABRICA.libertad.items].map(
      (i) => i.icon,
    );
    expect(usados.filter((i) => !ICONOS_HOME.includes(i))).toEqual([]);
  });
});

/** Luminancia relativa y contraste WCAG, para que el texto sobre el acento se lea. */
function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}
function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

describe('contraste de los acentos', () => {
  const FONDO_OSCURO = '#15110f';
  for (const a of ACENTOS_HOME) {
    it(`${a.nombre}: texto blanco sobre «base» y texto oscuro sobre «suave»`, () => {
      expect(contraste(a.base, '#ffffff')).toBeGreaterThanOrEqual(4.5);
      expect(contraste(a.suave, FONDO_OSCURO)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
