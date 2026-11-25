import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  PUERTA_REGALOS_ABIERTOS,
  type PuertaRegalosAbiertos,
} from '../../../core/regalos/regalos-abiertos-gateway';
import type { ResultadoRegalos } from '../../../core/regalos/regalos-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpRegalosLlamada } from './regalos-llamada';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const RESPUESTA: ResultadoRegalos = {
  ok: true,
  aportacion: {
    iban: 'ES9121000418450200051332',
    titular: 'María y Gabriel',
    bizum: '600123456',
    mensaje: 'Lo que queráis, con cariño.',
  },
  regalos: [
    {
      id: 'g1',
      titulo: 'Cafetera',
      descripcion: '',
      precio: 80,
      enlace: null,
      imagen: null,
      reservado: false,
      esMio: false,
      order: 1,
    },
  ],
};

function montar(opciones: { puerta?: PuertaRegalosAbiertos; directo: boolean; slug: string }) {
  const pedidos: string[] = [];
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('public'),
      provideRouter([]),
      ...(opciones.puerta ? [{ provide: PUERTA_REGALOS_ABIERTOS, useValue: opciones.puerta }] : []),
    ],
  });
  const fixture = TestBed.createComponent(NpRegalosLlamada);
  fixture.componentRef.setInput('directo', opciones.directo);
  fixture.componentRef.setInput('slug', opciones.slug);
  fixture.detectChanges();
  return { fixture, raiz: fixture.nativeElement as HTMLElement, pedidos };
}

describe('los regalos del plan básico, dentro de la web (D-66)', () => {
  it('se pintan aquí, con el IBAN y el Bizum, sin enlace a otra pantalla', async () => {
    const pedidos: string[] = [];
    const { fixture, raiz } = montar({
      directo: true,
      slug: 'maria-y-gabriel',
      puerta: {
        async listar(slug) {
          pedidos.push(slug);
          return RESPUESTA;
        },
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(pedidos).toEqual(['maria-y-gabriel']);
    expect(raiz.textContent).toContain('ES91 2100 0418 4502 0005 1332');
    expect(raiz.textContent).toContain('600123456');
    expect(raiz.textContent).toContain('Cafetera');
    expect(raiz.querySelector('a[href="/regalos"]')).toBeNull();
    // Sin reservas: no hay invitado al que apuntárselas.
    expect(raiz.textContent).not.toContain('Reservar');
  });

  it('con página propia (plan extendido) sigue siendo la puerta a /regalos', () => {
    const { raiz } = montar({
      directo: false,
      slug: 'x',
      puerta: { listar: async () => RESPUESTA },
    });
    expect(raiz.querySelector('a')?.getAttribute('href')).toBe('/regalos');
  });

  it('sin puerta para pedirlos —la vista previa del panel— vuelve a la tarjeta', () => {
    const { raiz } = montar({ directo: true, slug: 'x' });
    expect(raiz.querySelector('a')?.getAttribute('href')).toBe('/regalos');
  });

  it('si el servidor dice que no, lo dice sin romper la página', async () => {
    const { fixture, raiz } = montar({
      directo: true,
      slug: 'x',
      puerta: { listar: async () => ({ ok: false, fallo: { tipo: 'error' } }) },
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(raiz.querySelector('np-regalos-directo')).not.toBeNull();
    expect(raiz.textContent).not.toContain('ES91');
  });
});
