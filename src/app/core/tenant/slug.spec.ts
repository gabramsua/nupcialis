import { describe, expect, it } from 'vitest';
import { MENSAJES_SLUG, normalizarSlug, normalizarYValidar, validarSlug } from './slug';

describe('normalizarSlug', () => {
  it('pasa a minúsculas y une con guiones', () => {
    expect(normalizarSlug('María y Gabriel')).toBe('maria-y-gabriel');
  });

  it('quita acentos y la eñe', () => {
    expect(normalizarSlug('Begoña e Íñigo')).toBe('begona-e-inigo');
  });

  it('funciona con nombres que no son españoles', () => {
    // En toda boda hay algún invitado o algún novio de fuera.
    expect(normalizarSlug('Chloé et François')).toBe('chloe-et-francois');
    expect(normalizarSlug('Jörg und Müller')).toBe('jorg-und-muller');
    expect(normalizarSlug('Weiß')).toBe('weiss');
  });

  it('colapsa separadores repetidos y recorta los de los extremos', () => {
    expect(normalizarSlug('  ---María   &&&   Gabriel---  ')).toBe('maria-gabriel');
  });

  it('descarta lo que no es letra ni número', () => {
    expect(normalizarSlug('María 💍 Gabriel')).toBe('maria-gabriel');
    expect(normalizarSlug('#boda2026!')).toBe('boda2026');
  });

  it('recorta a 40 sin dejar un guion colgando al final', () => {
    const largo = normalizarSlug('maria alejandra y gabriel fernando de la cruz');
    expect(largo.length).toBeLessThanOrEqual(40);
    expect(largo.endsWith('-')).toBe(false);
  });

  it('devuelve cadena vacía si no queda nada aprovechable', () => {
    expect(normalizarSlug('💍💍💍')).toBe('');
    expect(normalizarSlug('   ')).toBe('');
  });
});

describe('validarSlug', () => {
  it('acepta un slug normal', () => {
    expect(validarSlug('mariaygabriel')).toEqual({ ok: true, slug: 'mariaygabriel' });
  });

  it.each([
    ['', 'vacio'],
    ['ab', 'demasiado-corto'],
    ['a'.repeat(41), 'demasiado-largo'],
    ['María', 'caracteres-no-validos'],
    ['maria gabriel', 'caracteres-no-validos'],
    ['-maria', 'caracteres-no-validos'],
    ['maria-', 'caracteres-no-validos'],
    ['maria--gabriel', 'caracteres-no-validos'],
    ['MARIA', 'caracteres-no-validos'],
  ])('rechaza %j por %s', (entrada, motivo) => {
    expect(validarSlug(entrada)).toEqual({ ok: false, motivo });
  });

  it.each(['www', 'admin', 'api', 'app', 'mail', 'soporte', 'pagos', 'login'])(
    'rechaza el reservado %s',
    (reservado) => {
      expect(validarSlug(reservado)).toEqual({ ok: false, motivo: 'reservado' });
    },
  );

  it('rechaza el prefijo de punycode', () => {
    // Un subdominio que empiece por xn-- lo interpretan los navegadores como
    // dominio internacionalizado y se muestra de forma impredecible. Cae por la
    // prohibición de guiones consecutivos, que existe también por esto.
    expect(validarSlug('xn--maria')).toEqual({
      ok: false,
      motivo: 'caracteres-no-validos',
    });
  });

  it('tiene mensaje para todos los motivos', () => {
    const motivos = [
      'vacio',
      'demasiado-corto',
      'demasiado-largo',
      'reservado',
      'caracteres-no-validos',
    ] as const;
    for (const motivo of motivos) {
      expect(MENSAJES_SLUG[motivo]).toBeTruthy();
    }
  });
});

describe('normalizarYValidar', () => {
  it('acepta lo que la pareja escribiría de verdad', () => {
    expect(normalizarYValidar('María y Gabriel')).toEqual({
      ok: true,
      slug: 'maria-y-gabriel',
    });
  });

  it('acepta iniciales con separador, que dan justo el mínimo', () => {
    expect(normalizarYValidar('J&M')).toEqual({ ok: true, slug: 'j-m' });
  });

  it('rechaza un nombre que al normalizar se queda demasiado corto', () => {
    expect(normalizarYValidar('Jo')).toEqual({ ok: false, motivo: 'demasiado-corto' });
    expect(normalizarYValidar('💍')).toEqual({ ok: false, motivo: 'vacio' });
  });

  it('rechaza un nombre que al normalizar coincide con un reservado', () => {
    // "App" con mayúscula no protege de nada si luego se normaliza.
    expect(normalizarYValidar('App')).toEqual({ ok: false, motivo: 'reservado' });
  });
});
