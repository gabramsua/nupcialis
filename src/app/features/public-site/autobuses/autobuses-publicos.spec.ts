import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpAutobusesPublicos } from './autobuses-publicos';

/**
 * Los autobuses, como los abre el invitado: de ida y de vuelta en bloques
 * separados, con la hora en grande, y sin pintar lo que no es una ruta.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar(rutas: unknown) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('public')],
  });
  const fixture = TestBed.createComponent(NpAutobusesPublicos);
  fixture.componentRef.setInput('autobuses', rutas);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  return { raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

describe('los autobuses públicos', () => {
  it('sin rutas dice que llegará la información', () => {
    expect(montar([]).texto()).toContain('Muy pronto');
  });

  it('con algo que no es una lista tampoco pinta nada', () => {
    expect(montar(null).texto()).toContain('Muy pronto');
  });

  it('separa la ida de la vuelta y enseña hora, salida y destino con su palabra', () => {
    const p = montar([
      { id: 'v', sentido: 'vuelta', salida: 'Finca', destino: 'Sevilla', hora: '02:00' },
      {
        id: 'i',
        sentido: 'ida',
        nombre: 'Autobús 1',
        salida: 'Plaza Mayor',
        destino: 'Finca',
        hora: '16:00',
        nota: 'Puntuales',
      },
    ]);
    const grupos = [...p.raiz.querySelectorAll('.bus__titulo')].map((e) => e.textContent?.trim());
    expect(grupos).toEqual(['Ida', 'Vuelta']);
    expect(p.texto()).toContain('A las 16:00 h');
    expect(p.texto()).toContain('Sale de Plaza Mayor');
    expect(p.texto()).toContain('Va a Finca');
    expect(p.texto()).toContain('Autobús 1');
    expect(p.texto()).toContain('Puntuales');
  });

  it('una ruta sin hora dice que está por confirmar', () => {
    expect(montar([{ id: 'x', salida: 'A', destino: 'B' }]).texto()).toContain(
      'Hora por confirmar',
    );
  });

  it('no pinta lo que no es una ruta ni mete HTML', () => {
    const p = montar([
      { id: 'mala', salida: '', destino: 'B' },
      { id: 'xss', salida: '<img src=x onerror=alert(1)>', destino: 'B', hora: '10:00' },
    ]);
    expect(p.raiz.querySelectorAll('.bus__ruta')).toHaveLength(1);
    expect(p.raiz.querySelector('img')).toBeNull();
  });
});
