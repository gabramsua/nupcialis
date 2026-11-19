import { describe, expect, it } from 'vitest';

import { dispositivoDe } from './dispositivo';

/**
 * Lo que importa aquí no es clavar el modelo del teléfono: es que dos aparatos
 * distintos den dos etiquetas distintas, porque de eso vive el aviso de
 * «esta invitación se está abriendo desde tres sitios» (D-34).
 *
 * Los `user-agent` son reales, copiados de navegadores de verdad.
 */

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.67',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1',
  samsung:
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  instagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 331.0.0.37.90',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
};

describe('dispositivoDe', () => {
  it('distingue los tres aparatos de una familia cualquiera', () => {
    expect(dispositivoDe(UA.iphone)).toBe('iPhone · Safari');
    expect(dispositivoDe(UA.androidChrome)).toBe('Android · Chrome');
    expect(dispositivoDe(UA.windowsEdge)).toBe('Windows · Edge');
  });

  /** Edge y Samsung dicen ser Chrome, y Chrome dice ser Safari. */
  it('no se deja engañar por los que dicen ser otro', () => {
    expect(dispositivoDe(UA.samsung)).toBe('Android · Samsung Internet');
    expect(dispositivoDe(UA.mac)).toBe('Mac · Chrome');
    expect(dispositivoDe(UA.firefox)).toBe('Windows · Firefox');
  });

  /** El iPad dice ser un Macintosh desde iPadOS 13. */
  it('un iPad no es un Mac', () => {
    expect(dispositivoDe(UA.ipad)).toBe('iPad · Safari');
  });

  /** En una boda, media invitación se abre desde el navegador de una app. */
  it('reconoce el navegador de Instagram, que es donde más se abre esto', () => {
    expect(dispositivoDe(UA.instagram)).toBe('iPhone · Instagram');
  });

  it('lo que no reconoce se queda en blanco, sin inventarse nada', () => {
    expect(dispositivoDe('')).toBe('');
    expect(dispositivoDe('   ')).toBe('');
    expect(dispositivoDe(undefined)).toBe('');
    expect(dispositivoDe(42)).toBe('');
    expect(dispositivoDe('curl/8.4.0')).toBe('');
  });

  it('con media pista da media etiqueta, que es mejor que ninguna', () => {
    expect(dispositivoDe('Mozilla/5.0 (Windows NT 10.0)')).toBe('Windows');
  });
});
