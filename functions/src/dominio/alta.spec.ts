import { describe, expect, it } from 'vitest';

import { emailsDeAlta, fechaDeBoda, sugerirSlugs, validarAlta, type EntradaAlta } from './alta';

const HOY = new Date('2026-09-10T12:00:00Z');

const VALIDA: EntradaAlta = {
  slug: 'maria-y-gabriel',
  partnerA: 'María',
  partnerB: 'Gabriel',
  weddingDate: '2027-06-12T00:00:00.000Z',
  emails: ['maria@example.com', 'gabriel@example.com'],
  plan: 'extended',
};

function motivos(entrada: Partial<EntradaAlta>) {
  const resultado = validarAlta({ ...VALIDA, ...entrada }, HOY);
  return resultado.ok ? [] : resultado.motivos;
}

describe('validarAlta', () => {
  it('acepta un alta completa y la normaliza', () => {
    const resultado = validarAlta(VALIDA, HOY);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.slug).toBe('maria-y-gabriel');
    expect(resultado.datos.locale).toBe('es');
    expect(resultado.datos.timezone).toBe('Europe/Madrid');
  });

  it('normaliza el slug que llega escrito como texto libre', () => {
    const resultado = validarAlta({ ...VALIDA, slug: '  María y Gabriel  ' }, HOY);
    expect(resultado.ok && resultado.datos.slug).toBe('maria-y-gabriel');
  });

  it('recorta los espacios de los nombres sin perder el nombre', () => {
    const resultado = validarAlta({ ...VALIDA, partnerA: '  María   José ' }, HOY);
    expect(resultado.ok && resultado.datos.partnerA).toBe('María José');
  });

  it('pasa el email a minúsculas', () => {
    const resultado = validarAlta({ ...VALIDA, emails: ['Maria@Example.COM'] }, HOY);
    expect(resultado.ok && resultado.datos.emails).toEqual(['maria@example.com']);
  });

  // El motivo de devolver la lista entera: quien da de alta una boda con tres
  // campos mal no quiere descubrirlos de uno en uno.
  it('devuelve todos los motivos a la vez', () => {
    const resultado = validarAlta(
      {
        slug: 'admin',
        partnerA: '',
        partnerB: '',
        weddingDate: 'ayer',
        emails: [],
        plan: 'oro' as never,
      },
      HOY,
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.map((m) => m.campo).sort()).toEqual([
      'emails',
      'fecha',
      'nombres',
      'plan',
      'slug',
    ]);
  });

  it('rechaza una entrada vacía sin explotar', () => {
    expect(validarAlta(undefined, HOY).ok).toBe(false);
  });

  it('rechaza un slug reservado', () => {
    expect(motivos({ slug: 'admin' })).toContainEqual({ campo: 'slug', motivo: 'reservado' });
  });

  it('rechaza un plan que no existe', () => {
    expect(motivos({ plan: 'premium' as never })).toContainEqual({
      campo: 'plan',
      motivo: 'desconocido',
    });
  });

  it('rechaza un nombre kilométrico', () => {
    expect(motivos({ partnerA: 'a'.repeat(61) })).toContainEqual({
      campo: 'nombres',
      motivo: 'demasiado-largo',
    });
  });
});

describe('fechaDeBoda', () => {
  it('acepta una boda futura', () => {
    expect(fechaDeBoda('2027-06-12', HOY).ok).toBe(true);
  });

  // Este es el error real: teclear el año pasado. Si se cuela, el checklist
  // nace con doce tareas vencidas y la pareja abandona el panel.
  it('rechaza una boda en el pasado', () => {
    expect(fechaDeBoda('2024-06-12', HOY)).toEqual({ ok: false, motivo: 'en-el-pasado' });
  });

  it('acepta una boda que es hoy mismo', () => {
    expect(fechaDeBoda('2026-09-10T18:00:00Z', HOY).ok).toBe(true);
  });

  it('rechaza una fecha a diez años vista', () => {
    expect(fechaDeBoda('2036-06-12', HOY)).toEqual({ ok: false, motivo: 'demasiado-lejos' });
  });

  it('distingue una fecha ausente de una fecha ilegible', () => {
    expect(fechaDeBoda('', HOY)).toEqual({ ok: false, motivo: 'ausente' });
    expect(fechaDeBoda('el sábado', HOY)).toEqual({ ok: false, motivo: 'no-es-fecha' });
    expect(fechaDeBoda(undefined, HOY)).toEqual({ ok: false, motivo: 'ausente' });
  });
});

describe('emailsDeAlta', () => {
  it('admite que la pareja comparta una sola dirección', () => {
    expect(emailsDeAlta(['los2@example.com'])).toEqual({ ok: true, emails: ['los2@example.com'] });
  });

  // Dos veces el mismo email crearía dos altas sobre la misma cuenta de Auth.
  it('rechaza la misma dirección repetida, aunque cambie el capitalizado', () => {
    expect(emailsDeAlta(['a@example.com', 'A@Example.com'])).toEqual({
      ok: false,
      motivo: 'duplicado',
    });
  });

  it('rechaza direcciones con espacios o sin dominio', () => {
    expect(emailsDeAlta(['maria @example.com']).ok).toBe(false);
    expect(emailsDeAlta(['maria@example']).ok).toBe(false);
    expect(emailsDeAlta(['maria']).ok).toBe(false);
  });

  it('rechaza una lista vacía, ausente o de tres', () => {
    expect(emailsDeAlta([])).toEqual({ ok: false, motivo: 'ausente' });
    expect(emailsDeAlta(undefined)).toEqual({ ok: false, motivo: 'ausente' });
    expect(emailsDeAlta(['a@b.com', 'c@d.com', 'e@f.com'])).toEqual({
      ok: false,
      motivo: 'demasiados',
    });
  });
});

describe('sugerirSlugs', () => {
  it('propone alternativas dictables por teléfono', () => {
    expect(sugerirSlugs('mariaygabriel', new Set(), 2027)).toEqual([
      'mariaygabriel-2027',
      'mariaygabriel-boda',
      'mariaygabriel-2',
    ]);
  });

  it('salta las que también están cogidas', () => {
    const ocupados = new Set(['mariaygabriel-2027', 'mariaygabriel-boda']);
    expect(sugerirSlugs('mariaygabriel', ocupados, 2027)[0]).toBe('mariaygabriel-2');
  });

  // Un slug base de 39 caracteres más sufijo pasa de 40: la sugerencia sería
  // inválida y el alta volvería a fallar con el nombre que acabamos de proponer.
  it('no propone alternativas que no pasarían la validación', () => {
    expect(sugerirSlugs('a'.repeat(39), new Set(), 2027)).toEqual([]);
  });
});
