import { Directive, ElementRef, inject, input, output, signal } from '@angular/core';

/**
 * Arrastrar un invitado hasta una mesa, con eventos de puntero.
 *
 * **No se usa el arrastre nativo de HTML** (`draggable`) por una razón que
 * decide el módulo entero: en un móvil no funciona. Y el reparto de mesas se
 * toca tanto desde el portátil de la pareja un martes por la noche como desde
 * el móvil el día antes, en la finca.
 *
 * Los eventos de puntero sí sirven para los dos, con una condición: hay que
 * **capturar el puntero** y dejar pasar el primer medio centímetro antes de
 * considerar que esto es un arrastre. Si no, cada toque en una ficha empieza
 * un arrastre de cero píxeles y el usuario no puede ni seleccionar.
 *
 * El arrastre es el atajo, no la única forma: la pantalla deja además elegir
 * una ficha y tocar la mesa, que en un móvil es más fiable que arrastrar a
 * través de una lista que hace scroll.
 */

/** A partir de cuántos píxeles un toque es un arrastre y no un toque. */
export const UMBRAL_ARRASTRE = 6;

export interface SoltadoEn {
  readonly x: number;
  readonly y: number;
}

@Directive({
  selector: '[npArrastrable]',
  host: {
    '(pointerdown)': 'empezar($event)',
    '(pointermove)': 'mover($event)',
    '(pointerup)': 'soltar($event)',
    '(pointercancel)': 'cancelar()',
    '[class.np-arrastrando]': 'arrastrando()',
    '[style.touch-action]': "'none'",
  },
})
export class NpArrastrable {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Qué se está arrastrando. Lo devuelve el evento, para no buscarlo luego. */
  readonly npArrastrable = input.required<string>();

  readonly arrastrado = output<string>();
  readonly soltado = output<SoltadoEn>();
  /** Un toque sin arrastre: la otra forma de sentar a alguien. */
  readonly tocado = output<string>();

  protected readonly arrastrando = signal(false);
  private desde: { x: number; y: number } | null = null;

  protected empezar(evento: PointerEvent): void {
    // Nada de arrastrar con el botón derecho. Se compara con `> 0` y no con
    // `!== 0` a propósito: un evento sintético sin `button` —los que fabrican
    // las pruebas y algunas automatizaciones— llega como `undefined`, y con la
    // comparación estricta no se podía ni tocar una ficha.
    if (typeof evento.button === 'number' && evento.button > 0) return;

    this.desde = { x: evento.clientX, y: evento.clientY };
    capturar(this.elemento.nativeElement, evento.pointerId, true);
  }

  protected mover(evento: PointerEvent): void {
    if (!this.desde || this.arrastrando()) return;

    const recorrido = Math.hypot(evento.clientX - this.desde.x, evento.clientY - this.desde.y);
    if (recorrido < UMBRAL_ARRASTRE) return;

    this.arrastrando.set(true);
    this.arrastrado.emit(this.npArrastrable());
  }

  protected soltar(evento: PointerEvent): void {
    capturar(this.elemento.nativeElement, evento.pointerId, false);

    if (this.arrastrando()) {
      this.arrastrando.set(false);
      this.soltado.emit({ x: evento.clientX, y: evento.clientY });
    } else if (this.desde) {
      this.tocado.emit(this.npArrastrable());
    }

    this.desde = null;
  }

  protected cancelar(): void {
    this.arrastrando.set(false);
    this.desde = null;
  }
}

/**
 * Capturar y soltar el puntero, sin que una excepción tire el gesto.
 *
 * `setPointerCapture` lanza `InvalidPointerId` cuando el puntero ya no está
 * activo —pasa al soltar fuera de la ventana, y con los eventos sintéticos de
 * una automatización—, y una excepción aquí dejaba la ficha cogida para
 * siempre: ni se sentaba ni se soltaba.
 */
function capturar(elemento: HTMLElement, pointerId: number, coger: boolean): void {
  try {
    if (coger) elemento.setPointerCapture?.(pointerId);
    else elemento.releasePointerCapture?.(pointerId);
  } catch {
    // La captura es una comodidad, no el gesto: sin ella el arrastre sigue
    // funcionando mientras el puntero esté encima.
  }
}
