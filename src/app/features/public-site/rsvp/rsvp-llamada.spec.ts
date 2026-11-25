import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpRsvpLlamada } from './rsvp-llamada';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

describe('el cartel de confirmar asistencia', () => {
  it('lleva al formulario y lo dice', () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: ES },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [provideIconSprite('public'), provideRouter([])],
    });
    const fixture = TestBed.createComponent(NpRsvpLlamada);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('a')?.getAttribute('href')).toBe('/confirmar');
    expect(raiz.textContent).toContain('Confirmar asistencia');
  });
});
