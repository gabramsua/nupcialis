import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  MAX_LUGAR_RUTA,
  MAX_NOMBRE_RUTA,
  MAX_NOTA_RUTA,
  MAX_RUTAS,
  SENTIDOS_AUTOBUS,
  esSentidoAutobus,
  sanearAutobuses,
  type RutaAutobus,
  type SentidoAutobus,
} from '../../public-site/autobuses/autobuses';
import { BodaStore } from '../boda.store';

/** Una ruta tal y como se está escribiendo: aún puede estar a medias. */
interface Borrador {
  readonly id: string;
  readonly sentido: SentidoAutobus;
  readonly nombre: string;
  readonly salida: string;
  readonly hora: string;
  readonly destino: string;
  readonly nota: string;
}

type Campo = 'nombre' | 'salida' | 'hora' | 'destino' | 'nota';

let contador = 0;

/** Un id nuevo, estable mientras la ruta exista. Basta que no se repita en la lista. */
function idNuevo(): string {
  contador += 1;
  return `r${Date.now().toString(36)}${contador}`;
}

/**
 * Autobuses, donde la pareja los apunta (D-63).
 *
 * Es información de rutas —de dónde sale, a qué hora, adónde va—, no una
 * reserva: el invitado no se apunta a nada. Lo que esta pantalla vigila y la
 * web no puede es **lo que se queda fuera**: una ruta sin salida o sin destino
 * no se publica, y la pareja tiene que enterarse aquí y no al ver que el
 * autobús no sale en la web.
 */
@Component({
  selector: 'np-panel-autobuses',
  imports: [TranslocoDirective, NpAlert, NpButton, NpIcon, NpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="bu">
        <header class="bu__intro">
          <div>
            <h2>{{ t('panel.autobuses.titulo') }}</h2>
            <p>{{ t('panel.autobuses.ayuda') }}</p>
          </div>
          <button npButton type="button" [loading]="guardando()" (click)="guardar()">
            <np-icon name="check" />
            {{ t('common.save') }}
          </button>
        </header>

        @if (guardado()) {
          <p class="bu__hecho" role="status">
            <np-icon name="check-circle" weight="fill" />
            {{ t('panel.datos.guardado') }}
          </p>
        }

        @if (store.error(); as error) {
          <np-alert status="declined" [heading]="t('panel.autobuses.errorGuardar')">
            <p>{{ error }}</p>
          </np-alert>
        }

        @if (incompletas() > 0) {
          <np-alert status="attention" [heading]="t('panel.autobuses.repasad')">
            <p>{{ t('panel.autobuses.incompletas', { n: incompletas() }) }}</p>
          </np-alert>
        }

        @if (rutas().length === 0) {
          <p class="bu__vacio">{{ t('panel.autobuses.vacio') }}</p>
        }

        <ul class="bu__lista">
          @for (ruta of rutas(); track ruta.id; let n = $index) {
            <li class="bu__ruta">
              <div class="bu__fila">
                <label class="bu__campo">
                  <span>{{ t('panel.autobuses.campo.sentido') }}</span>
                  <select npInput (change)="cambiarSentido(ruta.id, $event)">
                    @for (sentido of sentidos; track sentido) {
                      <option [value]="sentido" [selected]="ruta.sentido === sentido">
                        {{ t('panel.autobuses.sentido.' + sentido) }}
                      </option>
                    }
                  </select>
                </label>
                <label class="bu__campo">
                  <span>{{ t('panel.autobuses.campo.hora') }}</span>
                  <input
                    npInput
                    type="time"
                    [value]="ruta.hora"
                    (input)="escribir(ruta.id, 'hora', $event)"
                  />
                </label>
                <label class="bu__campo bu__campo--ancho">
                  <span>{{ t('panel.autobuses.campo.nombre') }}</span>
                  <input
                    npInput
                    type="text"
                    [value]="ruta.nombre"
                    [attr.maxlength]="maxNombre"
                    [placeholder]="t('panel.autobuses.campo.nombreEjemplo')"
                    (input)="escribir(ruta.id, 'nombre', $event)"
                  />
                </label>
              </div>

              <div class="bu__fila">
                <label class="bu__campo bu__campo--ancho">
                  <span>{{ t('panel.autobuses.campo.salida') }}</span>
                  <input
                    npInput
                    type="text"
                    [value]="ruta.salida"
                    [attr.maxlength]="maxLugar"
                    (input)="escribir(ruta.id, 'salida', $event)"
                  />
                </label>
                <label class="bu__campo bu__campo--ancho">
                  <span>{{ t('panel.autobuses.campo.destino') }}</span>
                  <input
                    npInput
                    type="text"
                    [value]="ruta.destino"
                    [attr.maxlength]="maxLugar"
                    (input)="escribir(ruta.id, 'destino', $event)"
                  />
                </label>
              </div>

              <label class="bu__campo">
                <span>{{ t('panel.autobuses.campo.nota') }}</span>
                <input
                  npInput
                  type="text"
                  [value]="ruta.nota"
                  [attr.maxlength]="maxNota"
                  (input)="escribir(ruta.id, 'nota', $event)"
                />
              </label>

              <div class="bu__pie">
                @if (!completa(ruta)) {
                  <small class="bu__falta">
                    <np-icon name="warning" />
                    {{ t('panel.autobuses.faltaDato') }}
                  </small>
                }
                <button
                  npButton
                  size="sm"
                  variant="ghost"
                  type="button"
                  [attr.aria-label]="t('panel.autobuses.quitar', { n: n + 1 })"
                  (click)="quitar(ruta.id)"
                >
                  <np-icon name="trash" />
                  {{ t('common.delete') }}
                </button>
              </div>
            </li>
          }
        </ul>

        @if (rutas().length < maxRutas) {
          <div>
            <button npButton variant="secondary" type="button" (click)="anadir()">
              <np-icon name="plus" />
              {{ t('panel.autobuses.anadir') }}
            </button>
          </div>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .bu {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .bu__hecho {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-status-confirmed-text);
    }
    .bu__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .bu__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .bu__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .bu__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .bu__vacio {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .bu__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .bu__ruta {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-raised);
    }
    .bu__fila {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
    }
    .bu__campo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .bu__campo--ancho {
      flex: 1 1 14rem;
    }
    .bu__pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-2);
    }
    .bu__falta {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      color: var(--np-pending-fg);
    }
    .bu__pie button {
      margin-inline-start: auto;
    }
  `,
})
export class PanelAutobuses {
  protected readonly store = inject(BodaStore);

  protected readonly sentidos = SENTIDOS_AUTOBUS;
  protected readonly maxRutas = MAX_RUTAS;
  protected readonly maxNombre = MAX_NOMBRE_RUTA;
  protected readonly maxLugar = MAX_LUGAR_RUTA;
  protected readonly maxNota = MAX_NOTA_RUTA;

  protected readonly guardando = signal(false);
  protected readonly guardado = signal(false);

  private readonly guardadas = computed<readonly RutaAutobus[]>(
    () => this.store.boda()?.autobuses ?? [],
  );

  /**
   * Las rutas que se están escribiendo.
   *
   * Parten de lo guardado y vuelven a partir de ahí cuando la boda se recarga
   * o se guarda; lo que la pareja escriba encima manda.
   */
  protected readonly rutas = linkedSignal<readonly RutaAutobus[], readonly Borrador[]>({
    source: this.guardadas,
    computation: (guardadas) => guardadas.map((ruta) => ({ ...ruta })),
  });

  /** Las que no se publicarían: sin salida o sin destino. */
  protected readonly incompletas = computed(
    () => this.rutas().filter((ruta) => !this.completa(ruta)).length,
  );

  protected completa(ruta: Borrador): boolean {
    return ruta.salida.trim() !== '' && ruta.destino.trim() !== '';
  }

  protected anadir(): void {
    this.rutas.update((rutas) =>
      rutas.length >= MAX_RUTAS
        ? rutas
        : [
            ...rutas,
            {
              id: idNuevo(),
              sentido: 'ida',
              nombre: '',
              salida: '',
              hora: '',
              destino: '',
              nota: '',
            },
          ],
    );
  }

  protected quitar(id: string): void {
    this.rutas.update((rutas) => rutas.filter((ruta) => ruta.id !== id));
  }

  protected escribir(id: string, campo: Campo, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.rutas.update((rutas) =>
      rutas.map((ruta) => (ruta.id === id ? { ...ruta, [campo]: valor } : ruta)),
    );
  }

  protected cambiarSentido(id: string, evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    if (!esSentidoAutobus(valor)) return;
    this.rutas.update((rutas) =>
      rutas.map((ruta) => (ruta.id === id ? { ...ruta, sentido: valor } : ruta)),
    );
  }

  protected async guardar(): Promise<void> {
    if (this.guardando()) return;

    this.guardando.set(true);
    this.guardado.set(false);
    // Lo incompleto no se guarda: el saneador lo tiraría igual, y así lo que
    // queda guardado es lo que se publica.
    const ok = await this.store.guardarAutobuses(sanearAutobuses(this.rutas()));
    this.guardando.set(false);
    this.guardado.set(ok);
  }
}
