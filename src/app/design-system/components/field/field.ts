import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

let contador = 0;

/**
 * Campo de formulario: etiqueta, control, ayuda y error.
 *
 * Genera el `id` y lo enlaza con la etiqueta y con `aria-describedby`. Esa
 * fontanería es justo la que se olvida cuando cada pantalla se monta a mano, y
 * es la que hace que un formulario sea usable con lector de pantalla.
 *
 * El error se anuncia solo cuando aparece, no en cada tecleo.
 */
@Component({
  selector: 'np-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [attr.for]="id()">
      {{ label() }}
      @if (required()) {
        <span class="np-field__req" aria-hidden="true">*</span>
        <span class="np-field__sr">(obligatorio)</span>
      }
    </label>

    <ng-content />

    @if (hint() && !error()) {
      <p class="np-field__hint" [id]="id() + '-hint'">{{ hint() }}</p>
    }
    @if (error()) {
      <p class="np-field__error" [id]="id() + '-error'" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--np-space-2);
    }
    label {
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
    .np-field__req {
      color: var(--np-declined-fg);
    }
    .np-field__sr {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .np-field__hint {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-xs);
    }
    .np-field__error {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-xs);
      font-weight: var(--np-weight-medium);
    }
  `,
})
export class NpField {
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input(false);

  private readonly generado = signal(`np-field-${++contador}`);
  readonly id = computed(() => this.generado());

  /** Para que el control lo ponga en su `aria-describedby`. */
  readonly describedBy = computed(() =>
    this.error() ? `${this.id()}-error` : this.hint() ? `${this.id()}-hint` : null,
  );
}
