import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpMapaLlamada } from './mapa-llamada';
import type { UbicacionPublica } from './ubicaciones';

/**
 * «Cómo llegar» dentro de la web: lo que la pareja puso en su mapa, no una
 * tarjeta genérica (D-64).
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const sitio = (parcial: Partial<UbicacionPublica>): UbicacionPublica => ({
  id: 'x',
  type: 'otro',
  name: 'Sitio',
  address: '',
  lat: 40.9,
  lng: -4.1,
  description: '',
  time: null,
  order: 1,
  ...parcial,
});

function montar(ubicaciones: readonly UbicacionPublica[] | null) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('public'), provideRouter([])],
  });
  const fixture = TestBed.createComponent(NpMapaLlamada);
  fixture.componentRef.setInput('ubicaciones', ubicaciones);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  return { raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

describe('«Cómo llegar» en la web', () => {
  it('sin sitios publicados deja la puerta al mapa', () => {
    const p = montar([]);
    expect(p.raiz.querySelector('a[href="/mapa"]')).not.toBeNull();
    expect(p.texto()).toContain('Dónde es todo');
  });

  it('la dirección larga del buscador se enseña corta: sitio, calle y localidad', () => {
    const p = montar([
      sitio({
        id: 'b',
        type: 'ceremonia',
        name: 'Boda',
        address:
          'Castillo de San Marcos, Plaza Alfonso X el Sabio, Sudamérica, El Puerto de Santa María, Bahía de Cádiz, Cádiz, Andalucía, 11500, España',
      }),
    ]);
    expect(p.texto()).toContain(
      'Castillo de San Marcos, Plaza Alfonso X el Sabio, El Puerto de Santa María',
    );
    expect(p.texto()).not.toContain('Bahía de Cádiz');
    expect(p.texto()).not.toContain('11500');
  });

  it('enseña cada sitio con su dirección y su botón de ruta', () => {
    const p = montar([
      sitio({
        id: 'c',
        type: 'ceremonia',
        name: 'Iglesia de San Pedro',
        address: 'Plaza Mayor, 1',
        time: '17:00',
      }),
      sitio({ id: 'p', type: 'parking', name: 'Aparcamiento', lat: 41, lng: -4 }),
    ]);
    expect(p.texto()).toContain('Iglesia de San Pedro');
    expect(p.texto()).toContain('Plaza Mayor, 1');
    expect(p.texto()).toContain('a las 17:00');
    expect(p.texto()).toContain('Aparcamiento');

    const botones = [...p.raiz.querySelectorAll<HTMLAnchorElement>('a.mp-ll__boton')];
    expect(botones).toHaveLength(2);
    expect(botones[0]?.href).toContain('destination=40.9,-4.1');
    expect(botones[0]?.rel).toContain('noopener');
    expect(p.raiz.querySelector('a[href="/mapa"]')).not.toBeNull();
  });

  it('la ceremonia y el banquete en el mismo punto son un solo sitio', () => {
    const p = montar([
      sitio({ id: 'c', type: 'ceremonia', name: 'Finca Los Olmos', time: '17:00' }),
      sitio({ id: 'b', type: 'banquete', name: 'Finca Los Olmos', time: '20:30' }),
    ]);
    expect(p.raiz.querySelectorAll('.mp-ll__sitio')).toHaveLength(1);
    expect(p.texto()).toContain('Ceremonia y banquete');
  });

  it('en puntos distintos no los junta', () => {
    const p = montar([
      sitio({ id: 'c', type: 'ceremonia', name: 'Iglesia' }),
      sitio({ id: 'b', type: 'banquete', name: 'Finca', lat: 41.2 }),
    ]);
    expect(p.raiz.querySelectorAll('.mp-ll__sitio')).toHaveLength(2);
  });

  it('un sitio sin pin válido no se pinta', () => {
    expect(montar([sitio({ lat: 0, lng: 0 })]).raiz.querySelector('.mp-ll__sitio')).toBeNull();
  });
});
