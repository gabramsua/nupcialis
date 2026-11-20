import { describe, expect, it } from 'vitest';

import { SECCIONES_INICIALES } from './secciones';

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

  /**
   * El dress code es el único módulo cuyo contenido vive en su `config`, y la
   * regla de esta función es que ninguna `config` se copia. Estos dos tests
   * son los que sostienen que siga siendo verdad.
   */
  describe('el dress code (§8.11)', () => {
    it('se publica construido campo a campo, no copiado', () => {
      const publico = proyeccionPublica({
        ...BODA,
        modules: {
          dressCode: {
            enabled: true,
            visibility: 'visible',
            ...({
              config: {
                description: '<p>Elegante pero <b>cómodo</b>.</p>',
                suggestedColors: ['verde-salvia', 'fucsia'],
                avoidColors: ['blanco'],
                tips: ['La ceremonia es sobre hierba.'],
                notasInternas: 'llamar a la modista',
              },
            } as object),
          },
        },
      });

      expect(publico.content.dressCode.descripcion).toBe('<p>Elegante pero <b>cómodo</b>.</p>');
      expect(publico.content.dressCode.sugeridos.map((c) => c.nombre)).toEqual(['Verde salvia']);
      expect(publico.content.dressCode.evitar.map((c) => c.nombre)).toEqual(['Blanco']);
      expect(publico.content.dressCode.avisos).toEqual(['La ceremonia es sobre hierba.']);
      // Lo que no estaba en la lista blanca no viaja, aunque esté en la misma
      // `config`: no se copia, se construye.
      expect(contieneClave(publico, 'notasInternas')).toBe(false);
      expect(contieneClave(publico, 'config')).toBe(false);
    });

    /**
     * Quien decide si el invitado lo ve es el interruptor de **su sección**,
     * igual que con las preguntas y los alojamientos. El del módulo no entra
     * aquí: si entrara, la pareja escribiría el dress code, lo vería en su
     * panel y no saldría en la web sin ninguna pista de por qué.
     */
    it('no depende del interruptor del módulo', () => {
      const publico = proyeccionPublica({
        ...BODA,
        modules: {
          dressCode: {
            enabled: false,
            ...({ config: { description: '<p>De chaqué</p>', tips: ['Hay hierba'] } } as object),
          },
        },
      });

      expect(publico.content.dressCode.descripcion).toBe('<p>De chaqué</p>');
      expect(publico.content.dressCode.avisos).toEqual(['Hay hierba']);
    });

    describe('el mapa', () => {
      const sitio = (extra: object) => ({
        id: 'ceremonia',
        type: 'ceremonia',
        name: 'Iglesia',
        coords: { lat: 40.9481, lng: -4.1184 },
        visibleToGuests: true,
        order: 1,
        ...extra,
      });

      /** El punto donde la pareja deja el coche de los proveedores no es de los invitados. */
      it('publica solo lo visible y con pin, y no lo interno', () => {
        const publico = proyeccionPublica(
          BODA,
          [],
          [],
          [],
          [
            sitio({}),
            sitio({ id: 'proveedores', name: 'Proveedores', visibleToGuests: false }),
            sitio({ id: 'sinpin', name: 'Sin pin', coords: null }),
            sitio({ id: 'mar', name: 'En el mar', coords: { lat: 0, lng: 0 } }),
          ],
        );

        expect(publico.content.ubicaciones.map((u) => u.id)).toEqual(['ceremonia']);
        expect(JSON.stringify(publico)).not.toContain('Proveedores');
      });

      it('sin ubicaciones publica la lista vacía, no un hueco', () => {
        expect(proyeccionPublica(BODA).content.ubicaciones).toEqual([]);
      });
    });

    it('sin nada escrito publica el dress code vacío, no un hueco', () => {
      const publico = proyeccionPublica(BODA);

      expect(publico.content.dressCode).toEqual({
        descripcion: '',
        sugeridos: [],
        evitar: [],
        avisos: [],
      });
    });

    /** Regla de oro 5: el HTML se sanea aquí, no en el navegador de la pareja. */
    it('sanea la descripción antes de publicarla', () => {
      const publico = proyeccionPublica({
        ...BODA,
        modules: {
          dressCode: {
            enabled: true,
            ...({
              config: { description: '<p>Elegante<script>robar()</script></p>' },
            } as object),
          },
        },
      });

      expect(publico.content.dressCode.descripcion).not.toContain('script');
      expect(publico.content.dressCode.descripcion).toContain('Elegante');
    });
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
    // Una boda sin `content` no se publica vacía: se publica con las secciones
    // iniciales. Una web en blanco es peor que una con la portada y poco más,
    // y el invitado ya está delante con el enlace abierto.
    expect(publico.content.sections).toEqual(SECCIONES_INICIALES);
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

/**
 * Lo que de verdad protege a los invitados (regla de oro 5).
 *
 * La pareja escribe en su panel y eso acaba en el único documento que puede
 * leer cualquiera con el enlace. Entre una cosa y la otra está esto.
 */
describe('el texto enriquecido que se publica', () => {
  function conHistoria(texto: string) {
    return proyeccionPublica({
      ...BODA,
      content: {
        sections: [
          { id: 'portada', type: 'portada', enabled: true, order: 0, fields: {} },
          {
            id: 'historia',
            type: 'texto',
            enabled: true,
            order: 1,
            fields: { titulo: 'Nuestra historia', texto },
          },
        ],
      },
    });
  }

  it('sale saneado, no como lo escribieron', () => {
    const publicado = conHistoria('<p>Hola</p><script>alert(1)</script>');
    const historia = publicado.content.sections.find((s) => s.id === 'historia');

    expect(historia?.fields['texto']).toBe('<p>Hola</p>');
  });

  it('un atributo de evento no llega a la web', () => {
    const publicado = conHistoria('<p onclick="robar()">Nos casamos</p>');
    const historia = publicado.content.sections.find((s) => s.id === 'historia');

    expect(historia?.fields['texto']).not.toContain('onclick');
    expect(historia?.fields['texto']).toContain('Nos casamos');
  });

  it('el formato de verdad se respeta', () => {
    const publicado = conHistoria('<p><strong>Nos conocimos</strong> en 2019.</p>');
    const historia = publicado.content.sections.find((s) => s.id === 'historia');

    expect(historia?.fields['texto']).toBe('<p><strong>Nos conocimos</strong> en 2019.</p>');
  });

  /** Lo que no es campo rico sigue siendo texto y se escapa al pintarse. */
  it('el título no se convierte en HTML por el camino', () => {
    const publicado = proyeccionPublica({
      ...BODA,
      content: {
        sections: [
          {
            id: 'historia',
            type: 'texto',
            enabled: true,
            order: 1,
            fields: { titulo: '<b>Nuestra historia</b>', texto: '' },
          },
        ],
      },
    });
    const historia = publicado.content.sections.find((s) => s.id === 'historia');

    expect(historia?.fields['titulo']).toBe('<b>Nuestra historia</b>');
  });
});

/**
 * Las preguntas frecuentes, en la proyección (§8.9).
 *
 * Viajan en el documento público y no en su colección porque en una boda
 * abierta no hay sesión de invitado con la que leer nada, y las preguntas a
 * medio escribir de la pareja no tienen por qué estar al alcance de una
 * consulta directa.
 */
describe('las preguntas frecuentes publicadas', () => {
  const faq = (extra: Record<string, unknown> = {}) => ({
    id: 'parking',
    question: '¿Hay aparcamiento?',
    answer: '<p>Sí, en la finca.</p>',
    category: 'Cómo llegar',
    icon: 'car-simple',
    order: 1,
    enabled: true,
    ...extra,
  });

  it('salen las que tienen respuesta escrita', () => {
    const publicado = proyeccionPublica(BODA, [faq()]);

    expect(publicado.content.faqs).toHaveLength(1);
    expect(publicado.content.faqs[0].question).toBe('¿Hay aparcamiento?');
  });

  /** La semilla de fábrica nace sin respuesta: no se publica a medias. */
  it('las que están a medio escribir no salen', () => {
    expect(proyeccionPublica(BODA, [faq({ answer: '' })]).content.faqs).toEqual([]);
  });

  it('la respuesta se sanea, como todo lo que escribe la pareja', () => {
    const publicado = proyeccionPublica(BODA, [
      faq({ answer: '<p>Sí</p><script>alert(1)</script>' }),
    ]);

    expect(publicado.content.faqs[0].answer).toBe('<p>Sí</p>');
  });

  it('sin preguntas, una lista vacía y no un hueco', () => {
    expect(proyeccionPublica(BODA).content.faqs).toEqual([]);
    expect(proyeccionPublica(BODA, null).content.faqs).toEqual([]);
  });
});

/**
 * La cronología, en la proyección (§8.13).
 *
 * Aquí es donde de verdad se cumple «la hora a la que llega el fotógrafo no es
 * asunto de los invitados»: el documento público es lo único que leen.
 */
describe('la cronología publicada', () => {
  const hito = (extra: Record<string, unknown> = {}) => ({
    id: 'ceremonia',
    time: '17:00',
    endTime: '17:45',
    title: 'Ceremonia',
    description: 'En la ermita',
    icon: 'church',
    color: 'rosa',
    order: 1,
    visibleToGuests: true,
    ...extra,
  });

  it('sale lo visible, en orden de hora', () => {
    const publicado = proyeccionPublica(
      BODA,
      [],
      [hito({ id: 'fin', time: '04:00', title: 'Fin de fiesta' }), hito()],
    );

    expect(publicado.content.cronologia.map((h) => h.id)).toEqual(['ceremonia', 'fin']);
  });

  it('lo interno no llega a la web', () => {
    const publicado = proyeccionPublica(
      BODA,
      [],
      [hito({ id: 'fotografo', title: 'Llega el fotógrafo', visibleToGuests: false }), hito()],
    );

    expect(publicado.content.cronologia.map((h) => h.id)).toEqual(['ceremonia']);
  });

  it('sin cronología, una lista vacía y no un hueco', () => {
    expect(proyeccionPublica(BODA).content.cronologia).toEqual([]);
  });
});
