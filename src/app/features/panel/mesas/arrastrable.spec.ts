import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { NpArrastrable, UMBRAL_ARRASTRE, type SoltadoEn } from './arrastrable';

/**
 * El gesto de arrastrar una ficha.
 *
 * Lo que se vigila es la diferencia entre **tocar** y **arrastrar**, que es de
 * donde salen los dos fallos clásicos: si no hay umbral, cada toque empieza un
 * arrastre de cero píxeles y no se puede ni seleccionar; y si el umbral no
 * acaba en un `soltado`, el invitado se queda pegado al dedo.
 */

@Component({
  imports: [NpArrastrable],
  template: `
    <button
      type="button"
      [npArrastrable]="'g1'"
      (tocado)="tocados.update((t) => [...t, $event])"
      (arrastrado)="arrastrados.update((a) => [...a, $event])"
      (soltado)="soltados.update((s) => [...s, $event])"
    >
      Ana
    </button>
  `,
})
class Anfitrion {
  readonly tocados = signal<string[]>([]);
  readonly arrastrados = signal<string[]>([]);
  readonly soltados = signal<SoltadoEn[]>([]);
}

function montar() {
  TestBed.configureTestingModule({ imports: [Anfitrion] });
  const fixture = TestBed.createComponent(Anfitrion);
  fixture.detectChanges();

  const boton = (fixture.nativeElement as HTMLElement).querySelector('button')!;

  const puntero = (tipo: string, x: number, y: number) =>
    boton.dispatchEvent(
      new PointerEvent(tipo, { button: 0, clientX: x, clientY: y, bubbles: true }),
    );

  return { fixture, boton, puntero, componente: fixture.componentInstance };
}

describe('arrastrar una ficha', () => {
  it('bajar y subir sin moverse es un toque', () => {
    const p = montar();
    p.puntero('pointerdown', 10, 10);
    p.puntero('pointerup', 10, 10);

    expect(p.componente.tocados()).toEqual(['g1']);
    expect(p.componente.arrastrados()).toEqual([]);
    expect(p.componente.soltados()).toEqual([]);
  });

  /** Un dedo nunca se queda exactamente quieto. */
  it('moverse un pelo sigue siendo un toque', () => {
    const p = montar();
    p.puntero('pointerdown', 10, 10);
    p.puntero('pointermove', 10 + UMBRAL_ARRASTRE - 2, 10);
    p.puntero('pointerup', 10 + UMBRAL_ARRASTRE - 2, 10);

    expect(p.componente.tocados()).toEqual(['g1']);
  });

  it('pasado el umbral es un arrastre, y al soltar dice dónde', () => {
    const p = montar();
    p.puntero('pointerdown', 10, 10);
    p.puntero('pointermove', 60, 80);
    p.puntero('pointerup', 120, 200);

    expect(p.componente.arrastrados()).toEqual(['g1']);
    expect(p.componente.soltados()).toEqual([{ x: 120, y: 200 }]);
    expect(p.componente.tocados()).toEqual([]);
  });

  it('el botón derecho no arrastra a nadie', () => {
    const p = montar();
    p.boton.dispatchEvent(new PointerEvent('pointerdown', { button: 2, bubbles: true }));
    p.boton.dispatchEvent(new PointerEvent('pointerup', { button: 2, bubbles: true }));

    expect(p.componente.tocados()).toEqual([]);
  });

  /** Si el gesto se cancela, la ficha no se queda pegada al dedo. */
  it('un gesto cancelado no deja nada a medias', () => {
    const p = montar();
    p.puntero('pointerdown', 10, 10);
    p.puntero('pointermove', 60, 80);
    p.boton.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    p.puntero('pointerup', 120, 200);

    expect(p.componente.soltados()).toEqual([]);
    expect(p.componente.tocados()).toEqual([]);
  });
});
