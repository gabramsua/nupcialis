import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpButton } from '../../../design-system/components/button/button';
import { NpInput } from '../../../design-system/components/field/input';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { fechaMedia } from '../../../shared/fecha';
import { MAX_TITULO_TAREA, type TareaDelPanel } from '../checklist/tareas';

/**
 * Las tareas colgadas de un proveedor o de una partida.
 *
 * Es un componente tonto: recibe las tareas ya filtradas y avisa de lo que la
 * pareja quiere hacer (enlazar una que ya existe, quitar el enlace, crear una
 * nueva ya enlazada). Quien lo usa decide cómo se guarda; así sirve igual para
 * la ficha del proveedor y para la de una partida.
 */
@Component({
  selector: 'np-tareas-enlazadas',
  imports: [TranslocoDirective, NpButton, NpInput, NpIcon, NpStatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="te" *transloco="let t" [attr.aria-label]="t('panel.enlaces.tareas.titulo')">
      <h3 class="te__titulo">
        <np-icon name="list-checks" />
        {{ t('panel.enlaces.tareas.titulo') }}
      </h3>

      @if (enlazadas().length === 0) {
        <p class="te__vacio">{{ t('panel.enlaces.tareas.ninguna') }}</p>
      } @else {
        <ul class="te__lista">
          @for (tarea of enlazadas(); track tarea.id) {
            <li class="te__fila">
              <span class="te__texto">
                <span [class.te__hecha]="tarea.done">{{ tarea.title }}</span>
                @if (tarea.dueDate; as limite) {
                  <span class="te__fecha">{{ dia(limite) }}</span>
                }
              </span>
              <np-status-chip
                [status]="tarea.done ? 'confirmed' : 'pending'"
                [label]="
                  t(tarea.done ? 'panel.enlaces.tareas.hecha' : 'panel.enlaces.tareas.abierta')
                "
              />
              <button
                npButton
                variant="ghost"
                size="sm"
                type="button"
                [disabled]="ocupado()"
                [attr.aria-label]="t('panel.enlaces.tareas.quitarDe', { t: tarea.title })"
                (click)="desenlazar.emit(tarea.id)"
              >
                <np-icon name="x" />
                {{ t('panel.enlaces.tareas.quitar') }}
              </button>
            </li>
          }
        </ul>
      }

      @if (libres().length > 0) {
        <div class="te__alta">
          <label class="te__campo">
            <span>{{ t('panel.enlaces.tareas.enlazarExistente') }}</span>
            <select npInput [value]="elegida()" (change)="elegida.set($any($event.target).value)">
              <option value="">{{ t('panel.enlaces.tareas.elige') }}</option>
              @for (tarea of libres(); track tarea.id) {
                <option [value]="tarea.id" [selected]="elegida() === tarea.id">
                  {{ tarea.title }}
                </option>
              }
            </select>
          </label>
          <button
            npButton
            variant="secondary"
            size="sm"
            type="button"
            [disabled]="ocupado() || elegida() === ''"
            (click)="enlazarElegida()"
          >
            {{ t('panel.enlaces.tareas.enlazar') }}
          </button>
        </div>
      }

      <div class="te__alta">
        <label class="te__campo">
          <span>{{ t('panel.enlaces.tareas.nueva') }}</span>
          <input
            npInput
            [value]="titulo()"
            [attr.maxlength]="maxTitulo"
            [placeholder]="t('panel.enlaces.tareas.nuevaEjemplo')"
            (input)="titulo.set($any($event.target).value)"
            (keydown.enter)="crearNueva($event)"
          />
        </label>
        <button
          npButton
          variant="secondary"
          size="sm"
          type="button"
          [disabled]="ocupado() || titulo().trim() === ''"
          (click)="crearNueva()"
        >
          <np-icon name="plus" />
          {{ t('panel.enlaces.tareas.crear') }}
        </button>
      </div>
    </section>
  `,
  styles: `
    .te {
      display: grid;
      gap: var(--np-space-3);
      padding-block-start: var(--np-space-3);
      border-block-start: 1px solid var(--np-border);
    }
    .te__titulo {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-base);
    }
    .te__vacio {
      margin: 0;
      color: var(--np-text-muted);
      font-size: var(--np-text-sm);
    }
    .te__lista {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .te__fila {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .te__texto {
      display: grid;
      flex: 1 1 12rem;
      min-inline-size: 0;
      overflow-wrap: anywhere;
    }
    .te__hecha {
      text-decoration: line-through;
      color: var(--np-text-muted);
    }
    .te__fecha {
      color: var(--np-text-muted);
      font-size: var(--np-text-sm);
    }
    .te__alta {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: var(--np-space-2);
    }
    .te__campo {
      display: grid;
      flex: 1 1 14rem;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
  `,
})
export class NpTareasEnlazadas {
  /** Las tareas que ya cuelgan de este proveedor o partida. */
  readonly enlazadas = input.required<readonly TareaDelPanel[]>();
  /** Las que se podrían enlazar (abiertas y sin enlace de este tipo). */
  readonly libres = input<readonly TareaDelPanel[]>([]);
  readonly ocupado = input(false);

  readonly enlazar = output<string>();
  readonly desenlazar = output<string>();
  readonly crear = output<string>();

  protected readonly maxTitulo = MAX_TITULO_TAREA;
  protected readonly elegida = signal('');
  protected readonly titulo = signal('');
  protected readonly hayLibres = computed(() => this.libres().length > 0);

  protected readonly dia = (fecha: Date): string => fechaMedia(fecha, 'es');

  protected enlazarElegida(): void {
    const id = this.elegida();
    if (id === '') return;
    this.enlazar.emit(id);
    this.elegida.set('');
  }

  protected crearNueva(evento?: Event): void {
    evento?.preventDefault();
    const titulo = this.titulo().trim();
    if (titulo === '') return;
    this.crear.emit(titulo);
    this.titulo.set('');
  }
}
