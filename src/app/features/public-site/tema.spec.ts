import { describe, expect, it } from 'vitest';

import type { ResultadoTenant } from '../../core/tenant/tenant-loader';
import { estiloDeLaBoda, plantillaDeLaBoda } from './tema';

function tenant(templateId: string, palette: Record<string, string> | null): ResultadoTenant {
  return {
    tipo: 'ok',
    weddingId: 'w1',
    slug: 'ana-y-leo',
    sitio: { theme: { templateId, palette } },
  } as unknown as ResultadoTenant;
}

describe('estiloDeLaBoda (D-55)', () => {
  it('sin boda no pinta nada', () => {
    expect(estiloDeLaBoda(null)).toEqual({});
    expect(estiloDeLaBoda({ tipo: 'no-encontrada' })).toEqual({});
  });

  it('sin paleta, la página se parece a su plantilla', () => {
    const e = estiloDeLaBoda(tenant('romantica', null));
    expect(e['--np-marca-background']).toBe('#fbf1ef');
    expect(e['--np-marca-titulos']).toContain('Great Vibes');
    expect(e['--np-marca-fuente']).toContain('Lora');
  });

  it('la paleta de la pareja manda sobre la de la plantilla, pero la letra sigue siendo la de la plantilla', () => {
    const e = estiloDeLaBoda(
      tenant('moderna', {
        primary: '#111111',
        secondary: '#222222',
        background: '#abcdef',
        surface: '#ffffff',
        text: '#010101',
        accent: '#ff00ff',
      }),
    );
    expect(e['--np-marca-background']).toBe('#abcdef');
    expect(e['--np-marca-accent']).toBe('#ff00ff');
    expect(e['--np-marca-titulos']).toContain('Montserrat');
  });

  it('una plantilla retirada del catálogo cae a la clásica', () => {
    expect(plantillaDeLaBoda(tenant('desaparecida', null))?.id).toBe('clasica');
  });
});
