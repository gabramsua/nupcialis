import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgxJoditComponent, type JoditConfig } from 'ngx-jodit';

/**
 * El editor de texto enriquecido de la pareja (D-03: Jodit con `ngx-jodit`).
 *
 * **La barra es corta a propósito.** Lo que escribe una pareja en «Nuestra
 * historia» son párrafos: negrita, cursiva, una lista, un enlace a la finca y
 * un subtítulo. Todo lo demás —tablas, colores, tipografías, imágenes
 * incrustadas— sobra en una web que tiene su propio diseño, y además no
 * sobreviviría al saneado del servidor: lo que no está en la lista blanca de
 * `dominio/html.ts` se cae al publicar, así que ofrecerlo sería mentir.
 *
 * Este componente **no sanea nada**, y es deliberado: el saneado vive en el
 * servidor, antes de publicar (regla de oro 5). Lo que haga el navegador de la
 * pareja no protege a quien abre la web.
 *
 * Jodit es grande —medio megabyte largo—, así que vive en su propio trozo de
 * JavaScript: se carga con `@defer` desde el editor de secciones y no toca ni
 * el arranque del panel ni, por supuesto, la web pública. Lo vigila
 * `arranque-publico.spec.ts`.
 */
@Component({
  selector: 'np-editor-rico',
  imports: [NgxJoditComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngx-jodit [value]="valor()" [options]="opciones()" (joditChange)="cambia.emit($event)" />
  `,
  styles: `
    :host {
      display: block;
    }
    /* La barra y el marco, con los tokens del sistema: Jodit trae su propio
       gris y aquí dentro desentona. */
    :host ::ng-deep .jodit-container {
      border-color: var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-canvas);
      font-family: inherit;
    }
    :host ::ng-deep .jodit-toolbar__box {
      background: var(--np-surface-surface);
    }
    :host ::ng-deep .jodit-wysiwyg {
      min-block-size: 8rem;
      color: var(--np-surface-text);
    }
  `,
})
export class NpEditorRico {
  readonly valor = input('');
  /** Hasta dónde puede escribir. El mismo tope que aplica el servidor. */
  readonly maximo = input(5000);
  readonly cambia = output<string>();

  /**
   * Lo que ofrece la barra, en el orden en que se usa.
   *
   * `eraser` (quitar formato) está porque la mitad de las parejas van a pegar
   * desde WhatsApp o desde Word y querrán dejarlo limpio. Y el pegado entra
   * ya sin formato (`insert_clear_html`), que es lo mismo que haría el
   * servidor al publicar: mejor que lo vean al pegar y no después.
   */
  protected readonly opciones = computed<JoditConfig>(() => ({
    language: 'es',
    toolbarAdaptive: false,
    toolbarButtonSize: 'small',
    buttons: [
      'bold',
      'italic',
      'underline',
      'strikethrough',
      '|',
      'ul',
      'ol',
      '|',
      'paragraph',
      'link',
      '|',
      'eraser',
      'undo',
      'redo',
    ],
    statusbar: false,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    defaultActionOnPaste: 'insert_clear_html',
    limitChars: this.maximo(),
    // Sin subida de imágenes: no hay sitio donde subirlas desde aquí, y una
    // imagen pegada en base64 acabaría dentro del documento que descarga cada
    // invitado.
    disablePlugins: ['image', 'image-processor', 'image-properties', 'video', 'media', 'table'],
    minHeight: 180,
  }));
}
