import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  FAQS_PARA_BUSCADOR,
  MAX_FAQS,
  agrupadas,
  filtrarFaqs,
  sanearFaqs,
  type FaqPublica,
} from './faqs';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de las preguntas frecuentes', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./faqs.ts')).toBe(cuerpo('../../../src/app/features/public-site/faqs/faqs.ts'));
  });
});

function faq(parcial: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'parking',
    question: '¿Hay aparcamiento?',
    answer: '<p>Sí, en la finca.</p>',
    category: 'Cómo llegar',
    icon: 'car-simple',
    order: 1,
    enabled: true,
    ...parcial,
  };
}

describe('sanearFaqs', () => {
  it('deja pasar una pregunta completa', () => {
    expect(sanearFaqs([faq()])).toEqual([
      {
        id: 'parking',
        question: '¿Hay aparcamiento?',
        answer: '<p>Sí, en la finca.</p>',
        category: 'Cómo llegar',
        icon: 'car-simple',
        order: 1,
      },
    ]);
  });

  /**
   * La semilla de fábrica nace con la pregunta puesta y la respuesta vacía.
   * Publicarla sería prometerle al invitado una respuesta que no está.
   */
  it('una pregunta sin respuesta no se publica', () => {
    expect(sanearFaqs([faq({ answer: '' })])).toEqual([]);
    expect(sanearFaqs([faq({ answer: '   ' })])).toEqual([]);
  });

  it('una respuesta sin pregunta tampoco', () => {
    expect(sanearFaqs([faq({ question: '' })])).toEqual([]);
  });

  /** Apagar es como la pareja esconde una pregunta sin perder lo escrito. */
  it('las apagadas no salen', () => {
    expect(sanearFaqs([faq({ enabled: false })])).toEqual([]);
  });

  it('un icono que no está en la lista cae en el genérico', () => {
    expect(sanearFaqs([faq({ icon: 'calavera' })])[0]?.icon).toBe('question');
    expect(sanearFaqs([faq({ icon: undefined })])[0]?.icon).toBe('question');
  });

  it('ordena por `order` y, a igualdad, por id para no bailar en cada recarga', () => {
    const lista = sanearFaqs([
      faq({ id: 'c', order: 2 }),
      faq({ id: 'b', order: 1 }),
      faq({ id: 'a', order: 1 }),
    ]);

    expect(lista.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('no publica más de las que caben', () => {
    const muchas = Array.from({ length: MAX_FAQS + 10 }, (_, i) => faq({ id: `f${i}` }));

    expect(sanearFaqs(muchas)).toHaveLength(MAX_FAQS);
  });

  it('lo que no es una lista no revienta', () => {
    expect(sanearFaqs(null)).toEqual([]);
    expect(sanearFaqs({})).toEqual([]);
    expect(sanearFaqs([null, 42, 'hola'])).toEqual([]);
  });

  it('dos preguntas con el mismo id son una', () => {
    expect(sanearFaqs([faq(), faq()])).toHaveLength(1);
  });
});

describe('agrupadas', () => {
  const publicada = (id: string, category: string, order: number): FaqPublica => ({
    id,
    question: id,
    answer: '<p>x</p>',
    category,
    icon: 'question',
    order,
  });

  /**
   * En el orden en que aparecen, no alfabético: la pareja ordena las preguntas
   * y ese orden decide también el de los grupos.
   */
  it('agrupa respetando el orden de las preguntas', () => {
    const grupos = agrupadas([
      publicada('a', 'Cómo llegar', 1),
      publicada('b', 'El día', 2),
      publicada('c', 'Cómo llegar', 3),
    ]);

    expect(grupos.map((g) => g.categoria)).toEqual(['Cómo llegar', 'El día']);
    expect(grupos[0].preguntas.map((p) => p.id)).toEqual(['a', 'c']);
  });

  /** Las que no tienen categoría van juntas al final. */
  it('las sueltas se quedan al final', () => {
    const grupos = agrupadas([publicada('a', '', 1), publicada('b', 'El día', 2)]);

    expect(grupos.map((g) => g.categoria)).toEqual(['El día', '']);
  });

  it('sin preguntas no hay grupos', () => {
    expect(agrupadas([])).toEqual([]);
  });
});

describe('filtrarFaqs', () => {
  const lista: readonly FaqPublica[] = [
    {
      id: 'bus',
      question: '¿Habrá autobús?',
      answer: '<p>Sale a las 17:00 de la plaza.</p>',
      category: 'Cómo llegar',
      icon: 'bus',
      order: 1,
    },
    {
      id: 'ninos',
      question: '¿Puedo llevar niños?',
      answer: '<p>Claro que sí.</p>',
      category: 'Invitados',
      icon: 'baby',
      order: 2,
    },
  ];

  it('busca sin acentos, que es como se escribe en el móvil', () => {
    expect(filtrarFaqs(lista, 'autobus').map((f) => f.id)).toEqual(['bus']);
    expect(filtrarFaqs(lista, 'NIÑOS').map((f) => f.id)).toEqual(['ninos']);
  });

  /** La palabra puede estar en la respuesta y no en el título. */
  it('busca también dentro de la respuesta', () => {
    expect(filtrarFaqs(lista, 'plaza').map((f) => f.id)).toEqual(['bus']);
  });

  /** Lo que no puede pasar: que buscar «p» saque todas por las etiquetas. */
  it('no busca dentro de las etiquetas HTML', () => {
    expect(filtrarFaqs(lista, '<p>')).toEqual([]);
    expect(filtrarFaqs(lista, 'strong')).toEqual([]);
  });

  it('sin texto, la lista entera', () => {
    expect(filtrarFaqs(lista, '')).toHaveLength(2);
    expect(filtrarFaqs(lista, '   ')).toHaveLength(2);
  });

  it('el buscador aparece a partir de diez', () => {
    expect(FAQS_PARA_BUSCADOR).toBe(10);
  });
});
