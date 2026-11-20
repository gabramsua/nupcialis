import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
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
/**
 * La hoja de estilos de Jodit, enlazada al abrir el editor.
 *
 * **Sin ella el editor sale sin tema**: la barra sin botones con forma, el cuerpo
 * sin marco, los menús desplegables a pelo. Es lo que se veía. Se copia a
 * `/vendor/jodit` en la compilación (`angular.json`) y se enlaza aquí, **no** en
 * `styles.scss`: pesa unos 60 kB y la web pública no tiene por qué cargarlos.
 */
const HOJA_JODIT = '/vendor/jodit/jodit.min.css';

function enlazarHojaDeJodit(documento: Document): void {
  if (documento.querySelector('link[data-jodit]')) return;

  const enlace = documento.createElement('link');
  enlace.rel = 'stylesheet';
  enlace.href = HOJA_JODIT;
  enlace.dataset['jodit'] = '1';
  documento.head.appendChild(enlace);
}

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
    /* El tema de Jodit (su hoja oficial, que se enlaza al abrir el editor) con
       los tokens del sistema: marco, barra y cuerpo como el resto de campos. */
    :host ::ng-deep .jodit-container:not(.jodit_inline) {
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      font-family: inherit;
      overflow: hidden;
    }
    :host ::ng-deep .jodit-container:not(.jodit_inline):focus-within {
      outline: 2px solid var(--np-info-solid);
      outline-offset: 1px;
    }
    :host ::ng-deep .jodit-toolbar__box:not(:empty) {
      background: var(--np-surface-canvas);
      border-block-end: 1px solid var(--np-surface-border);
      padding-inline: var(--np-space-1);
    }
    :host ::ng-deep .jodit-workplace {
      background: var(--np-surface-surface);
    }
    :host ::ng-deep .jodit-wysiwyg {
      min-block-size: 8rem;
      padding: var(--np-space-3);
      color: var(--np-surface-text);
      font: inherit;
      line-height: 1.55;
    }
    :host ::ng-deep .jodit-wysiwyg p {
      margin-block: 0 var(--np-space-2);
    }
  `,
})
export class NpEditorRico {
  private readonly documento = inject(DOCUMENT);

  constructor() {
    enlazarHojaDeJodit(this.documento);
  }

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
