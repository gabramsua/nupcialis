import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { PersonaPublica } from './cortejo';
import { NpCortejoPublico } from './cortejo-publico';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const persona = (parcial: Partial<PersonaPublica> & { id: string }): PersonaPublica => ({
  name: 'Carmen Ruiz',
  role: 'Madrina',
  side: 'A',
  bio: 'La tía que lo organiza todo.',
  photoUrl: null,
  order: 1,
  ...parcial,
});

function montar(personas: readonly PersonaPublica[]) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
  });
  const fixture = TestBed.createComponent(NpCortejoPublico);
  fixture.componentRef.setInput('personas', personas);
  fixture.componentRef.setInput('nombres', { partnerA: 'María', partnerB: 'Gabriel' });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('las personas importantes en la web', () => {
  it('pinta nombre, papel, lado con el nombre real y la línea que la presenta', () => {
    const el = montar([
      persona({ id: 'a' }),
      persona({ id: 'b', name: 'Antonio', role: 'Padrino', side: 'B', order: 2 }),
    ]);
    const t = el.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(t).toContain('Carmen Ruiz');
    expect(t).toContain('Madrina');
    expect(t).toContain('Del lado de María');
    expect(t).toContain('Del lado de Gabriel');
    expect(t).toContain('La tía que lo organiza todo.');
  });

  it('una persona de los dos lados no dice de quién es', () => {
    const el = montar([persona({ id: 'a', side: 'both' })]);
    expect(el.textContent).not.toContain('Del lado de');
  });

  it('con foto pinta la imagen con su alternativa; sin ella, la inicial', () => {
    const el = montar([
      persona({ id: 'a', photoUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg' }),
      persona({ id: 'b', name: 'Lucía', photoUrl: null, order: 2 }),
    ]);
    const imagenes = el.querySelectorAll('img');
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0]?.getAttribute('alt')).toBe('Foto de Carmen Ruiz');
    expect(el.querySelectorAll('.co__avatar span')[0]?.textContent).toBe('L');
  });

  it('sin personas no pinta nada, ni siquiera una lista vacía', () => {
    const el = montar([]);
    expect(el.querySelector('ul')).toBeNull();
    expect(el.textContent?.trim()).toBe('');
  });
});
