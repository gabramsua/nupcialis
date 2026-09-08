import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NpIcon } from '../../icons/icon';

/**
 * Diálogo.
 *
 * Sobre `<dialog>` nativo a propósito: el navegador ya sabe atrapar el foco,
 * cerrar con Escape, poner el fondo inerte y anunciarlo como diálogo. Todo eso
 * reimplementado a mano sale mal, y sale mal justo para quien más lo necesita.
 */
@Component({
  selector: 'np-modal',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg (close)="closed.emit()">
      <header>
        <h2>{{ heading() }}</h2>
        <button type="button" class="np-modal__cerrar" (click)="cerrar()">
          <np-icon name="x" label="Cerrar" />
        </button>
      </header>
      <div class="np-modal__cuerpo">
        <ng-content />
      </div>
      <footer>
        <ng-content select="[np-modal-actions]" />
      </footer>
    </dialog>
  `,
  styles: `
    dialog {
      inline-size: min(32rem, calc(100vw - 2rem));
      padding: 0;
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
      color: var(--np-surface-text);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 45%);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      border-block-end: 1px solid var(--np-surface-border);
    }
    h2 {
      margin: 0;
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-semibold);
    }
    .np-modal__cerrar {
      display: grid;
      place-items: center;
      inline-size: var(--np-tap-target);
      block-size: var(--np-tap-target);
      border: 0;
      border-radius: var(--np-radius-md);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .np-modal__cuerpo {
      padding: var(--np-space-4);
    }
    footer:has(*) {
      display: flex;
      justify-content: flex-end;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      border-block-start: 1px solid var(--np-surface-border);
    }
  `,
})
export class NpModal {
  readonly heading = input.required<string>();
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.open() && !el.open) {
        el.showModal();
      } else if (!this.open() && el.open) {
        el.close();
      }
    });
  }

  protected cerrar(): void {
    this.dlg().nativeElement.close();
  }
}
