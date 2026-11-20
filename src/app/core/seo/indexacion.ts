import { DOCUMENT, Injectable, inject } from '@angular/core';

/**
 * Si esta boda sale en Google o no.
 *
 * El HTML se sirve con `noindex, nofollow` puesto (ver `index.html`), así que
 * lo único que hace falta en tiempo de ejecución es **quitarlo** cuando la
 * pareja ha dicho que sí. Al revés —ponerlo desde el código— dejaría una
 * ventana en la que la página está indexable, y un rastreador que no ejecute
 * JavaScript la vería siempre así.
 */
@Injectable({ providedIn: 'root' })
export class Indexacion {
  private readonly documento = inject(DOCUMENT);

  aplicar(indexable: boolean): void {
    const etiqueta = this.documento.head?.querySelector('meta[name="robots"]');
    if (!etiqueta) return;
    if (indexable) etiqueta.remove();
  }
}

/**
 * Decide si una boda puede indexarse. Pura, y por eso probada.
 *
 * Son dos condiciones y las dos importan: una boda **no publicada** no se
 * indexa aunque su interruptor diga que sí, porque el interruptor se puede
 * haber dejado encendido de antes. Y una archivada tampoco: la web ya no está,
 * y lo último que quiere una pareja es que su boda del año pasado siga saliendo
 * la primera al buscar sus nombres.
 */
export function debeIndexarse(status: string, indexable: unknown): boolean {
  return status === 'active' && indexable === true;
}
