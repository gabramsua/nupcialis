import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  type OnInit,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_REGALOS_ABIERTOS,
  type PuertaRegalosAbiertos,
} from '../../../core/regalos/regalos-abiertos-gateway';
import type {
  AportacionPublica,
  FalloRegalos,
  RegaloPublico,
} from '../../../core/regalos/regalos-gateway';
import { hayAportacion, ibanEnGrupos } from './regalos';

/**
 * Los regalos **dentro de la web**, para el plan básico (D-66).
 *
 * Sin pantalla aparte y sin pedir identificarse: el básico no tiene lista de
 * invitados, así que no hay contra quién comprobar nada. Los datos llegan por
 * `getOpenGifts`, que solo contesta a bodas básicas publicadas. El IBAN sigue
 * sin viajar en la proyección pública.
 *
 * Es la misma idea que la página `/regalos` —botones que copian el IBAN y el
 * Bizum, pensados para el móvil con el banco en la otra mano—, sin reservas:
 * sin invitado no hay a quién apuntársela.
 */
@Component({
  selector: 'np-regalos-directo',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (cargando()) {
        <p class="rd__aviso">{{ t('publico.regalos.cargando') }}</p>
      } @else if (fallo()) {
        <p class="rd__aviso">
          <np-icon name="warning" />
          {{ t('publico.regalos.fallo.' + fallo()!.tipo) }}
        </p>
      } @else {
        @if (aportacion(); as ap) {
          @if (hayQueAportar()) {
            <section class="rd__aportar">
              @if (ap.mensaje) {
                <p class="rd__mensaje">{{ ap.mensaje }}</p>
              }
              @if (ap.bizum) {
                <button type="button" class="rd__dato" (click)="copiar(ap.bizum)">
                  <np-icon name="device-mobile" />
                  <span class="rd__que">
                    <small>{{ t('publico.regalos.bizum') }}</small>
                    <strong>{{ ap.bizum }}</strong>
                  </span>
                  <np-icon [name]="copiado() === ap.bizum ? 'check' : 'copy'" />
                </button>
              }
              @if (ap.iban) {
                <button type="button" class="rd__dato" (click)="copiar(ap.iban)">
                  <np-icon name="bank" />
                  <span class="rd__que">
                    <small>{{ t('publico.regalos.iban') }}</small>
                    <strong class="rd__iban">{{ ibanLegible(ap.iban) }}</strong>
                    @if (ap.titular) {
                      <small>{{ ap.titular }}</small>
                    }
                  </span>
                  <np-icon [name]="copiado() === ap.iban ? 'check' : 'copy'" />
                </button>
              }
              @if (copiado()) {
                <p class="rd__aviso" role="status">{{ t('publico.regalos.copiado') }}</p>
              }
            </section>
          }
        }

        @if (regalos().length > 0) {
          <ul class="rd__lista">
            @for (regalo of regalos(); track regalo.id) {
              <li class="rd__regalo">
                @if (regalo.imagen) {
                  <img class="rd__imagen" [src]="regalo.imagen" alt="" loading="lazy" />
                }
                <div class="rd__que">
                  <strong>{{ regalo.titulo }}</strong>
                  @if (regalo.descripcion) {
                    <small>{{ regalo.descripcion }}</small>
                  }
                  @if (regalo.precio !== null) {
                    <small>{{ euros(regalo.precio) }}</small>
                  }
                  @if (regalo.enlace) {
                    <a class="rd__enlace" [href]="regalo.enlace" target="_blank" rel="noopener">
                      {{ t('publico.regalos.verlo') }}
                      <np-icon name="link-simple" />
                    </a>
                  }
                </div>
              </li>
            }
          </ul>
        }

        @if (!hayQueAportar() && regalos().length === 0) {
          <p class="rd__aviso">{{ t('publico.regalos.vacioDirecto') }}</p>
        }
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .rd__aportar {
      display: grid;
      gap: 0.75rem;
      margin-block-end: 1.25rem;
    }
    .rd__mensaje {
      margin: 0;
      white-space: pre-line;
    }
    .rd__dato {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .rd__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-inline-size: 0;
      gap: 0.15rem;
    }
    .rd__que small {
      opacity: 0.8;
    }
    .rd__iban {
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
    .rd__aviso {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      opacity: 0.8;
    }
    .rd__lista {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rd__regalo {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.9rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      text-align: start;
    }
    .rd__imagen {
      flex: none;
      inline-size: 4rem;
      block-size: 4rem;
      border-radius: 0.6rem;
      object-fit: cover;
    }
    .rd__enlace {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      color: inherit;
    }
  `,
})
export class NpRegalosDirecto implements OnInit {
  /** La dirección de la boda: con ella el servidor encuentra la boda. */
  readonly slug = input.required<string>();

  private readonly puerta: PuertaRegalosAbiertos = inject(PUERTA_REGALOS_ABIERTOS);

  protected readonly aportacion = signal<AportacionPublica | null>(null);
  protected readonly regalos = signal<readonly RegaloPublico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly fallo = signal<FalloRegalos | null>(null);
  protected readonly copiado = signal<string | null>(null);

  protected readonly hayQueAportar = computed(() => {
    const ap = this.aportacion();
    return ap !== null && hayAportacion(ap);
  });

  /** Aquí y no en el constructor: el `slug` es un `input` y todavía no ha llegado. */
  ngOnInit(): void {
    void this.cargar();
  }

  protected ibanLegible(iban: string): string {
    return ibanEnGrupos(iban);
  }

  protected euros(precio: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: precio % 1 === 0 ? 0 : 2,
    }).format(precio);
  }

  /** Copiar es el atajo; si el navegador no deja, el número sigue ahí escrito. */
  protected async copiar(valor: string): Promise<void> {
    try {
      await navigator.clipboard?.writeText(valor);
      this.copiado.set(valor);
    } catch {
      this.copiado.set(null);
    }
  }

  private async cargar(): Promise<void> {
    const resultado = await this.puerta.listar(this.slug());
    if (resultado.ok) {
      this.aportacion.set(resultado.aportacion);
      this.regalos.set(resultado.regalos);
    } else {
      this.fallo.set(resultado.fallo);
    }
    this.cargando.set(false);
  }
}
