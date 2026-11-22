import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_RESPUESTAS } from '../../../core/rsvp/respuestas-gateway';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';

type Estado = 'confirmed' | 'declined' | 'pending';

const OPCIONES: readonly { readonly estado: Estado; readonly icono: NpIconName }[] = [
  { estado: 'confirmed', icono: 'check-circle' },
  { estado: 'declined', icono: 'x-circle' },
  { estado: 'pending', icono: 'circle-dashed' },
];

/**
 * «Viene», «no viene» o «sin contestar» para **todos los que se están viendo**
 * (F1.8i/j).
 *
 * Es lo del teléfono, multiplicado: una familia que confirma en una llamada, o un
 * grupo entero que dice que no puede. Se apoya en los filtros de la lista, igual
 * que el cupo de acompañantes: la familia de un titular, un grupo o una búsqueda
 * son las tres formas de elegir a quién, y no hacen falta casillas.
 *
 * **Pide confirmar y dice a cuántos afecta.** Cambia el recuento de confirmados,
 * las mesas y el catering, y deshacerlo es volver a marcarlos.
 *
 * Solo toca el estado: lo que cada uno hubiera contestado en el formulario se
 * queda como estaba.
 *
 * Vive aparte, como `np-cupo-en-lote`, para no inflar los estilos de la lista.
 */
@Component({
  selector: 'np-respuesta-en-lote',
  imports: [TranslocoDirective, NpButton, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <details>
        <summary>
          <np-icon name="check-circle" />
          {{ t('panel.invitados.lote.titulo', { n: ids().length }) }}
        </summary>

        <div class="lote__cuerpo">
          <p class="lote__ayuda">{{ t('panel.invitados.lote.ayuda') }}</p>

          <div
            class="lote__botones"
            role="group"
            [attr.aria-label]="t('panel.invitados.lote.titulo', { n: ids().length })"
          >
            @for (opcion of opciones; track opcion.estado) {
              <button
                npButton
                size="sm"
                variant="secondary"
                type="button"
                [disabled]="guardando()"
                [attr.aria-pressed]="eligiendo() === opcion.estado"
                (click)="pedir(opcion.estado)"
              >
                <np-icon [name]="opcion.icono" />
                {{ t('panel.invitados.lote.' + opcion.estado) }}
              </button>
            }
          </div>

          @if (eligiendo(); as estado) {
            <div class="lote__confirmar" role="alert">
              <p>
                {{
                  t('panel.invitados.lote.confirmar', {
                    n: ids().length,
                    estado: t('panel.invitados.lote.' + estado + 'Texto'),
                  })
                }}
              </p>
              <button
                npButton
                size="sm"
                type="button"
                [loading]="guardando()"
                (click)="aplicar(estado)"
              >
                {{ t('panel.invitados.lote.aplicar') }}
              </button>
              <button
                npButton
                size="sm"
                variant="ghost"
                type="button"
                [disabled]="guardando()"
                (click)="eligiendo.set(null)"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          }

          @if (resultado(); as hecho) {
            <p class="lote__hecho" role="status">
              <np-icon name="check-circle" weight="fill" />
              {{ t('panel.invitados.lote.hecho', { n: hecho.cambiados }) }}
              @if (hecho.omitidos > 0) {
                {{ t('panel.invitados.lote.omitidos', { n: hecho.omitidos }) }}
              }
            </p>
          }

          @if (fallo(); as clave) {
            <p class="lote__fallo" role="alert">
              <np-icon name="warning" />
              {{ t('panel.invitados.lote.error.' + clave) }}
            </p>
          }
        </div>
      </details>
    </ng-container>
  `,
  styles: `
    details {
      display: block;
      margin-block-end: var(--np-space-3);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      font-size: var(--np-text-sm);
    }
    summary {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      cursor: pointer;
    }
    .lote__cuerpo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin-block-start: var(--np-space-3);
    }
    .lote__ayuda {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .lote__botones,
    .lote__confirmar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .lote__confirmar p {
      flex-basis: 100%;
      margin: 0;
      font-weight: var(--np-weight-semibold);
    }
    .lote__hecho,
    .lote__fallo {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
    }
    .lote__hecho {
      color: var(--np-confirmed-fg);
    }
    .lote__fallo {
      color: var(--np-declined-fg);
    }
  `,
})
export class NpRespuestaEnLote {
  /** A quién: los que se están viendo, con sus acompañantes. */
  readonly ids = input.required<readonly string[]>();

  /** Se ha guardado: la lista tiene que recargarse. */
  readonly hecho = output<void>();

  private readonly puerta = inject(PUERTA_RESPUESTAS);

  protected readonly opciones = OPCIONES;
  /** El estado que está esperando confirmación. */
  protected readonly eligiendo = signal<Estado | null>(null);
  protected readonly guardando = signal(false);
  protected readonly resultado = signal<{ cambiados: number; omitidos: number } | null>(null);
  protected readonly fallo = signal<'sin-permiso' | 'red' | 'error' | null>(null);

  protected pedir(estado: Estado): void {
    this.resultado.set(null);
    this.fallo.set(null);
    this.eligiendo.set(estado);
  }

  protected async aplicar(estado: Estado): Promise<void> {
    if (this.guardando()) return;

    const ids = this.ids();
    if (ids.length === 0) return;

    this.guardando.set(true);
    const respuesta = await this.puerta.guardarEnLote(ids, estado);
    this.guardando.set(false);
    this.eligiendo.set(null);

    if (!respuesta.ok) {
      const tipo = respuesta.fallo.tipo;
      this.fallo.set(tipo === 'sin-permiso' || tipo === 'red' ? tipo : 'error');
      return;
    }

    this.resultado.set({ cambiados: respuesta.cambiados, omitidos: respuesta.omitidos });
    this.hecho.emit();
  }
}
