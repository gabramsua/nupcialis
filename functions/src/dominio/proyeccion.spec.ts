import { describe, expect, it } from 'vitest';

import { modulosIniciales } from './planes';
import {
  MODULOS_PUBLICOS,
  PROHIBIDOS_EN_PUBLICO,
  modulosPublicos,
  proyeccionPublica,
  type BodaParaProyectar,
} from './proyeccion';

const BODA: BodaParaProyectar = {
  slug: 'maria-y-gabriel',
  status: 'active',
  layout: 'multipage',
  locale: 'es',
  timezone: 'Europe/Madrid',
  weddingDate: '2027-06-12',
  couple: { partnerA: 'María', partnerB: 'Gabriel' },
  guestAccessMode: 'name_phone4',
  theme: {
    templateId: 'jardin',
    palette: { primary: '#123456' },
    heroImagePath: 'bodas/x/hero.jpg',
  },
  modules: modulosIniciales('extended'),
};

/** Recorre el objeto entero buscando una clave, a cualquier profundidad. */
function contieneClave(valor: unknown, clave: string): boolean {
  if (valor === null || typeof valor !== 'object') return false;
  if (!Array.isArray(valor) && Object.prototype.hasOwnProperty.call(valor, clave)) return true;
  return Object.values(valor as Record<string, unknown>).some((v) => contieneClave(v, clave));
}

describe('proyeccionPublica', () => {
  it('publica lo que la web necesita', () => {
    const publico = proyeccionPublica(BODA);
    expect(publico.coupleNames).toEqual({ partnerA: 'María', partnerB: 'Gabriel' });
    expect(publico.layout).toBe('multipage');
    expect(publico.guestAccessMode).toBe('name_phone4');
    expect(publico.theme.templateId).toBe('jardin');
  });

  // Este es el test que importa de verdad de todo el fichero. Si algún día
  // alguien construye la proyección con un spread de la boda, esto se pone rojo.
  it('no filtra ningún campo interno de la boda', () => {
    const conDatosInternos: BodaParaProyectar = {
      ...BODA,
      ...({
        counters: { guestsTotal: 120 },
        plan: 'extended',
        ownerUids: ['uid-1', 'uid-2'],
        notes: 'la madre de ella no viene',
        stripeCustomerId: 'cus_123',
      } as object),
    };
    const publico = proyeccionPublica(conDatosInternos);
    for (const prohibido of PROHIBIDOS_EN_PUBLICO) {
      expect(contieneClave(publico, prohibido), `se ha filtrado "${prohibido}"`).toBe(false);
    }
  });

  it('no publica la configuración de los módulos, solo su visibilidad', () => {
    const publico = proyeccionPublica({
      ...BODA,
      modules: {
        gifts: {
          enabled: true,
          visibility: 'visible',
          ...({ config: { iban: 'ES12...' } } as object),
        },
      },
    });
    expect(publico.publicModules['gifts']).toBe('visible');
    expect(contieneClave(publico, 'iban')).toBe(false);
    expect(contieneClave(publico, 'config')).toBe(false);
  });

  it('ante un estado corrupto se comporta como no publicada', () => {
    expect(proyeccionPublica({ ...BODA, status: 'publicada' }).status).toBe('draft');
    expect(proyeccionPublica({ ...BODA, status: undefined }).status).toBe('draft');
  });

  it('sobrevive a una boda a medio escribir sin lanzar', () => {
    const publico = proyeccionPublica({});
    expect(publico.status).toBe('draft');
    expect(publico.coupleNames).toEqual({ partnerA: '', partnerB: '' });
    expect(publico.theme.heroImagePath).toBeNull();
    expect(publico.content).toEqual({ sections: [] });
  });
});

describe('modulosPublicos', () => {
  it('no saca a la web los módulos que solo usa la pareja', () => {
    const publicos = Object.keys(modulosPublicos(modulosIniciales('extended')));
    expect([...publicos].sort()).toEqual([...MODULOS_PUBLICOS].sort());
    for (const interno of ['budget', 'vendors', 'checklist', 'guests', 'tables', 'publicSite']) {
      expect(publicos, interno).not.toContain(interno);
    }
  });

  // El interruptor manda sobre la etiqueta: un módulo apagado que quedó marcado
  // como "muy pronto" no debe anunciarse.
  it('un módulo desactivado es hidden aunque diga visible', () => {
    const publicos = modulosPublicos({ gallery: { enabled: false, visibility: 'visible' } });
    expect(publicos['gallery']).toBe('hidden');
  });

  it('conserva el estado "muy pronto"', () => {
    const publicos = modulosPublicos({ gallery: { enabled: true, visibility: 'soon' } });
    expect(publicos['gallery']).toBe('soon');
  });

  it('trata una visibilidad desconocida como oculta', () => {
    const publicos = modulosPublicos({ gallery: { enabled: true, visibility: 'publico' } });
    expect(publicos['gallery']).toBe('hidden');
  });

  it('en el plan básico la galería y el quiz no llegan a la web', () => {
    const publicos = modulosPublicos(modulosIniciales('basic'));
    expect(publicos['gallery']).toBe('hidden');
    expect(publicos['quiz']).toBe('hidden');
    expect(publicos['rsvp']).toBe('visible');
  });
});
