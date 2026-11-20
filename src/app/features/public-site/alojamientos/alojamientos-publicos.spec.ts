import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpAlojamientosPublicos } from './alojamientos-publicos';
import type { AlojamientoPublico } from './alojamientos';

/**
 * Dónde dormir, como lo abre el invitado de fuera.
 *
 * Lo que se vigila:
 *
 * 1. **Que el plazo de las habitaciones bloqueadas diga los días que quedan.**
 *    Es lo que de verdad angustia, y un «hasta el 1 de mayo» obliga a hacer la
 *    cuenta.
 * 2. **Que un plazo vencido se diga**, en vez de desaparecer.
 * 3. **Que el teléfono y la web sean pulsables**, que es cómo se reserva desde
 *    el móvil.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function enDias(dias: number): string {
  const fecha = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return fecha.toISOString().slice(0, 10);
}

function sitio(parcial: Partial<AlojamientoPublico> & { id: string }): AlojamientoPublico {
  return {
    name: `Hotel ${parcial.id}`,
    category: 'hotel',
    description: '',
    pricePerNight: null,
    distanceKm: null,
    phone: null,
    website: null,
    discountCode: '',
    blockedRooms: null,
    bookingDeadline: null,
    recommended: false,
    order: 1,
    ...parcial,
  };
}

async function montar(alojamientos: readonly AlojamientoPublico[]) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('public')],
  });

  const fixture = TestBed.createComponent(NpAlojamientosPublicos);
  fixture.componentRef.setInput('alojamientos', alojamientos);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  return { fixture, raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

describe('los alojamientos en la web', () => {
  it('enseña el nombre, el tipo, el precio y la distancia', async () => {
    const p = await montar([
      sitio({ id: 'central', name: 'Hotel Central', pricePerNight: 85, distanceKm: 4.5 }),
    ]);

    expect(p.texto()).toContain('Hotel Central');
    expect(p.texto()).toContain('Hotel');
    expect(p.texto()).toContain('85 € la noche');
    expect(p.texto()).toContain('4.5 km');
  });

  it('los recomendados van primero y lo dicen', async () => {
    const p = await montar([
      sitio({ id: 'otro', name: 'Otro', order: 1 }),
      sitio({ id: 'bueno', name: 'El bueno', recommended: true, order: 9 }),
    ]);

    expect([...p.raiz.querySelectorAll('.al__que strong')].map((e) => e.textContent)).toEqual([
      'El bueno',
      'Otro',
    ]);
    expect(p.texto()).toContain('Recomendado');
  });

  /** Lo que de verdad angustia al invitado de fuera. */
  it('dice cuántos días quedan para reservar las bloqueadas', async () => {
    const p = await montar([sitio({ id: 'a', blockedRooms: 12, bookingDeadline: enDias(20) })]);

    expect(p.texto()).toContain('12 habitaciones reservadas');
    expect(p.texto()).toContain('Quedan 20 días');
  });

  it('cuando queda poco, lo dice más fuerte', async () => {
    const p = await montar([sitio({ id: 'a', bookingDeadline: enDias(3) })]);

    expect(p.texto()).toContain('Solo quedan 3 días');
    expect(p.raiz.querySelector('.al__bloqueo')?.getAttribute('data-plazo')).toBe('ultimos');
  });

  /** El que mira la web el día después necesita saber que ya no hay bloqueo. */
  it('un plazo vencido se dice, no desaparece', async () => {
    const p = await montar([sitio({ id: 'a', bookingDeadline: enDias(-2) })]);

    expect(p.texto()).toContain('ya ha pasado');
  });

  it('el teléfono y la web son pulsables', async () => {
    const p = await montar([
      sitio({ id: 'a', phone: '+34954112233', website: 'https://hotel.example/' }),
    ]);

    const enlaces = [...p.raiz.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(enlaces).toContain('tel:+34954112233');
    expect(enlaces).toContain('https://hotel.example/');
    // Una web de fuera se abre aparte y sin dejarnos la ventana a mano.
    expect(p.raiz.querySelector('a[target="_blank"]')?.getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
  });

  it('el código o la mención para reservar se ve tal cual', async () => {
    const p = await montar([
      sitio({ id: 'a', discountCode: 'Di que vas a la boda de María y Gabriel' }),
    ]);

    expect(p.texto()).toContain('Di que vas a la boda de María y Gabriel');
  });

  it('sin alojamientos no deja un hueco en blanco', async () => {
    const p = await montar([]);

    expect(p.texto()).toContain('Muy pronto');
  });
});
