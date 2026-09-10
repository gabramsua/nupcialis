import { Directive } from '@angular/core';

/**
 * Control de formulario.
 *
 * Existe para no usar `::ng-deep` desde `<np-field>`. `::ng-deep` está obsoleto
 * y, sobre todo, se salta la encapsulación: un estilo escrito así puede acabar
 * afectando a cualquier `input` del árbol de abajo. En código fundacional eso se
 * propaga a todo el producto.
 *
 * Con una directiva, el que quiere el estilo lo pide.
 */
@Directive({
  selector: 'input[npInput], select[npInput], textarea[npInput]',
  host: { class: 'np-input' },
})
export class NpInput {}
