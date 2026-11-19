import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_RSVP,
  type Acompanante,
  type FalloAcompanante,
} from '../../../core/rsvp/rsvp-gateway';

/**
 * «¿Vienes con alguien?», en la pantalla del invitado.
 *
 * Aparte del formulario de confirmación porque es otra cosa: se guarda sola, no
 * depende del botón de enviar, y tiene su propio estado —lo que está escribiendo
 * y a quién está quitando—. En la pantalla de al lado estorbaba y sus estilos se
 * comían el presupuesto del componente.
 *
 * El cupo **no se calcula aquí**. Lo cuenta el servidor con los documentos que
 * existen, y después de cada alta se pide el formulario otra vez: dos pestañas
 * abiertas pueden haber apuntado a alguien mientras esta rellenaba el nombre.
 */
@Component({
  selector: 'np-acompanantes',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="ac">
        <h2>{{ t('publico.confirmar.acompanantes.titulo') }}</h2>

        @if (acompanantes().length > 0) {
          <ul class="ac__traidos">
            @for (quien of acompanantes(); track quien.id) {
              <li>
                <span>
                  {{ quien.fullName }}
                  @if (quien.ageGroup !== 'adult') {
                    · {{ t('publico.confirmar.acompanantes.' + quien.ageGroup) }}
                  }
                </span>
                @if (!quien.yaEntro) {
                  <button
                    type="button"
                    class="ac__quitar"
                    [disabled]="quitando() === quien.id"
                    (click)="quitar(quien.id)"
                  >
                    <np-icon name="x-circle" />
                    {{ t('publico.confirmar.acompanantes.quitar') }}
                  </button>
                }
              </li>
            }
          </ul>
        }

        @if (puedeAnadir()) {
          <p class="ac__ayuda">
            {{
              t('publico.confirmar.acompanantes.quedan', {
                n: quedan(),
              })
            }}
          </p>

          <form class="ac__nuevo" (submit)="anadir($event)">
            <label>
              <span>{{ t('publico.confirmar.acompanantes.nombre') }}</span>
              <input
                type="text"
                autocomplete="off"
                [value]="nuevoNombre()"
                (input)="nuevoNombre.set(valorDe($event))"
              />
            </label>

            @if (exigeTelefono()) {
              <label>
                <span>{{ t('publico.confirmar.acompanantes.telefono') }}</span>
                <input
                  type="tel"
                  inputmode="tel"
                  autocomplete="off"
                  [value]="nuevoTelefono()"
                  (input)="nuevoTelefono.set(valorDe($event))"
                />
                <small>{{ t('publico.confirmar.acompanantes.telefonoPista') }}</small>
              </label>
            }

            <label>
              <span>{{ t('publico.confirmar.acompanantes.edad') }}</span>
              <select (change)="nuevaEdad.set(edadDe($event))">
                @for (edad of edades; track edad) {
                  <option [value]="edad" [selected]="nuevaEdad() === edad">
                    {{ t('publico.confirmar.acompanantes.' + edad) }}
                  </option>
                }
              </select>
            </label>

            @if (falloAcompanante(); as fa) {
              <p class="ac__mal" role="alert">{{ textoAcompanante(fa, t) }}</p>
            }

            <button type="submit" class="ac__boton" [disabled]="anadiendo()">
              {{
                anadiendo()
                  ? t('publico.confirmar.acompanantes.anadiendo')
                  : t('publico.confirmar.acompanantes.anadir')
              }}
            </button>
            <!--
              El aviso de que está dando datos de otra persona.
              Es un requisito, no un detalle: §5.5 y el aviso de
              privacidad.
            -->
            <p class="ac__pista">{{ t('publico.confirmar.acompanantes.rgpd') }}</p>
          </form>
        }
      </section>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      margin-block-start: var(--np-space-5);
      padding-block-start: var(--np-space-4);
      border-block-start: 1px solid currentColor;
    }
    h2 {
      margin: 0 0 var(--np-space-3);
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-semibold);
    }
    .ac__ayuda {
      margin: 0 0 var(--np-space-4);
      font-size: var(--np-text-sm);
      opacity: 0.8;
    }
    .ac__traidos {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0 0 var(--np-space-4);
      padding: 0;
      list-style: none;
    }
    .ac__traidos li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-3);
      min-block-size: var(--np-tap-target);
    }
    .ac__quitar {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-2);
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: var(--np-text-sm);
      cursor: pointer;
    }
    .ac__nuevo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .ac__nuevo label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    input,
    select {
      inline-size: 100%;
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid currentColor;
      border-radius: var(--np-radius-md);
      background: var(--np-marca-surface, var(--np-surface-surface));
      color: inherit;
      font: inherit;
      /* 16 px o más: por debajo, Safari en iOS hace zoom al enfocar. */
      font-size: 1rem;
    }
    .ac__pista {
      margin: 0;
      font-size: var(--np-text-xs);
      opacity: 0.75;
    }
    .ac__mal {
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
    .ac__boton {
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-4);
      border: 0;
      border-radius: var(--np-radius-md);
      background: var(--np-marca-primary, var(--np-surface-text));
      color: var(--np-marca-background, var(--np-surface-canvas));
      font: inherit;
      font-weight: var(--np-weight-medium);
      cursor: pointer;
    }
    .ac__boton:disabled {
      opacity: 0.6;
      cursor: default;
    }
  `,
})
export class NpAcompanantes {
  private readonly puerta = inject(PUERTA_RSVP);

  readonly acompanantes = input.required<readonly Acompanante[]>();
  readonly puedeAnadir = input(false);
  readonly quedan = input(0);
  readonly exigeTelefono = input(true);

  /** Se ha añadido o quitado a alguien: quien manda el formulario lo recarga. */
  readonly cambiado = output<void>();

  protected readonly edades = ['adult', 'child', 'baby'] as const;

  protected readonly nuevoNombre = signal('');
  protected readonly nuevoTelefono = signal('');
  protected readonly nuevaEdad = signal<'adult' | 'child' | 'baby'>('adult');
  protected readonly anadiendo = signal(false);
  protected readonly quitando = signal<string | null>(null);
  protected readonly falloAcompanante = signal<FalloAcompanante | null>(null);

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected edadDe(evento: Event): 'adult' | 'child' | 'baby' {
    const valor = (evento.target as HTMLSelectElement).value;
    return valor === 'child' || valor === 'baby' ? valor : 'adult';
  }

  /**
   * Añade un acompañante y recarga.
   *
   * Recargar y no apañar la lista en memoria: el cupo que queda lo cuenta el
   * servidor con lo que hay escrito, y dos pestañas abiertas pueden haber
   * añadido a alguien más mientras esta rellenaba el nombre.
   */
  protected async anadir(evento?: Event): Promise<void> {
    evento?.preventDefault();
    if (this.anadiendo()) return;

    const nombre = this.nuevoNombre().trim();
    if (nombre === '') {
      this.falloAcompanante.set({
        tipo: 'datos',
        campos: [{ campo: 'fullName', motivo: 'ausente' }],
      });
      return;
    }

    this.anadiendo.set(true);
    this.falloAcompanante.set(null);

    const resultado = await this.puerta.anadirAcompanante({
      fullName: nombre,
      phone: this.nuevoTelefono().trim(),
      ageGroup: this.nuevaEdad(),
    });

    this.anadiendo.set(false);

    if (!resultado.ok) {
      this.falloAcompanante.set(resultado.fallo);
      return;
    }

    this.nuevoNombre.set('');
    this.nuevoTelefono.set('');
    this.nuevaEdad.set('adult');
    this.cambiado.emit();
  }

  protected async quitar(id: string): Promise<void> {
    if (this.quitando() !== null) return;

    this.quitando.set(id);
    this.falloAcompanante.set(null);

    const resultado = await this.puerta.quitarAcompanante(id);
    this.quitando.set(null);

    if (!resultado.ok) {
      this.falloAcompanante.set(resultado.fallo);
      return;
    }

    this.cambiado.emit();
  }

  protected textoAcompanante(fallo: FalloAcompanante, t: (clave: string) => string): string {
    if (fallo.tipo === 'datos') {
      const primero = fallo.campos[0];
      return primero
        ? t('publico.confirmar.acompanantes.fallo.' + primero.campo + '-' + primero.motivo)
        : t('publico.confirmar.acompanantes.fallo.datos');
    }
    if (fallo.tipo === 'sin-cupo') {
      return t('publico.confirmar.acompanantes.fallo.' + fallo.motivo);
    }
    // Nunca el mensaje del SDK, igual que en el resto de la pantalla.
    return t(
      'publico.confirmar.acompanantes.fallo.' +
        (fallo.tipo === 'error' ? 'desconocido' : fallo.tipo),
    );
  }
}
