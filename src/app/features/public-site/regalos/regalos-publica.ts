import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_REGALOS,
  type AportacionPublica,
  type FalloRegalos,
  type RegaloPublico,
} from '../../../core/regalos/regalos-gateway';
import { hayAportacion, ibanEnGrupos, resumenDeRegalos } from './regalos';

/**
 * Los regalos, como los ve el invitado (§8.8).
 *
 * Tiene página propia y no sección en la web por una razón de seguridad: el
 * IBAN y el Bizum de la pareja no pueden viajar en la proyección pública, que
 * la lee cualquiera que sepa el slug. Aquí llegan por invocable y solo a quien
 * está identificado.
 *
 * Y se diseña para el móvil con una idea fija: el invitado abre esto de pie,
 * en una comida familiar, con la aplicación del banco en la otra mano. Por eso
 * el IBAN y el Bizum son **botones que copian**, no texto que hay que
 * seleccionar con el dedo sin pasarse.
 */
@Component({
  selector: 'np-regalos-publica',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <div class="rg">
        <a class="rg__volver" routerLink="/">
          <np-icon name="caret-left" />
          {{ t('publico.regalos.volver') }}
        </a>

        <header class="rg__cabecera">
          <h1>{{ t('publico.regalos.titulo') }}</h1>
        </header>

        @if (fallo(); as cual) {
          <p class="rg__fallo">
            <np-icon name="warning" />
            {{ t('publico.regalos.fallo.' + cual.tipo) }}
          </p>
        }

        @if (cargando()) {
          <p class="rg__vacio">{{ t('publico.regalos.cargando') }}</p>
        } @else {
          @if (aportacion(); as ap) {
            @if (hayQueAportar()) {
              <section class="rg__aportar">
                @if (ap.mensaje) {
                  <p class="rg__mensaje">{{ ap.mensaje }}</p>
                }

                @if (ap.bizum) {
                  <button type="button" class="rg__dato" (click)="copiar(ap.bizum)">
                    <np-icon name="device-mobile" />
                    <span class="rg__dato-que">
                      <small>{{ t('publico.regalos.bizum') }}</small>
                      <strong>{{ ap.bizum }}</strong>
                    </span>
                    <np-icon [name]="copiado() === ap.bizum ? 'check' : 'copy'" />
                  </button>
                }

                @if (ap.iban) {
                  <button type="button" class="rg__dato" (click)="copiar(ap.iban)">
                    <np-icon name="bank" />
                    <span class="rg__dato-que">
                      <small>{{ t('publico.regalos.iban') }}</small>
                      <strong class="rg__iban">{{ ibanLegible(ap.iban) }}</strong>
                      @if (ap.titular) {
                        <small>{{ ap.titular }}</small>
                      }
                    </span>
                    <np-icon [name]="copiado() === ap.iban ? 'check' : 'copy'" />
                  </button>
                }

                @if (copiado()) {
                  <p class="rg__copiado" role="status">{{ t('publico.regalos.copiado') }}</p>
                }
              </section>
            }
          }

          @if (regalos().length > 0) {
            <section class="rg__lista">
              <h2>{{ t('publico.regalos.lista') }}</h2>
              <p class="rg__cuantos">
                {{ t('publico.regalos.libres', { n: resumen().libres }) }}
              </p>

              <ul>
                @for (regalo of regalos(); track regalo.id) {
                  <li
                    class="rg__regalo"
                    [class.rg__regalo--cogido]="regalo.reservado && !regalo.esMio"
                    [class.rg__regalo--mio]="regalo.esMio"
                  >
                    @if (regalo.imagen) {
                      <img
                        class="rg__imagen"
                        [src]="regalo.imagen"
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    }

                    <div class="rg__que">
                      <strong>{{ regalo.titulo }}</strong>
                      @if (regalo.descripcion) {
                        <small>{{ regalo.descripcion }}</small>
                      }
                      @if (regalo.precio !== null) {
                        <small class="rg__precio">{{ euros(regalo.precio) }}</small>
                      }
                      @if (regalo.enlace) {
                        <a class="rg__enlace" [href]="regalo.enlace" target="_blank" rel="noopener">
                          {{ t('publico.regalos.verlo') }}
                          <np-icon name="link-simple" />
                        </a>
                      }
                    </div>

                    <!--
                      Tres estados y ni uno más: lo puedo coger, lo he cogido
                      yo, lo ha cogido alguien. Quién, no se dice: la reserva es
                      anónima para el resto (§8.8).
                    -->
                    @if (regalo.esMio) {
                      <button
                        type="button"
                        class="rg__accion rg__accion--mia"
                        [disabled]="ocupado() !== null"
                        (click)="soltar(regalo)"
                      >
                        <np-icon name="check-circle" weight="fill" />
                        {{ t('publico.regalos.soltar') }}
                      </button>
                    } @else if (regalo.reservado) {
                      <span class="rg__cogido">{{ t('publico.regalos.cogido') }}</span>
                    } @else {
                      <button
                        type="button"
                        class="rg__accion"
                        [disabled]="ocupado() !== null"
                        (click)="reservar(regalo)"
                      >
                        {{ t('publico.regalos.reservar') }}
                      </button>
                    }
                  </li>
                }
              </ul>
            </section>
          }

          @if (!hayQueAportar() && regalos().length === 0 && fallo() === null) {
            <p class="rg__vacio">{{ t('publico.regalos.nada') }}</p>
          }
        }
      </div>
    </ng-container>
  `,
  styles: `
    .rg {
      max-inline-size: 42rem;
      margin-inline: auto;
      padding: 1.25rem 1rem 3rem;
      color: var(--np-marca-texto, inherit);
    }
    .rg__volver {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: inherit;
      opacity: 0.75;
      text-decoration: none;
    }
    .rg__cabecera h1 {
      margin: 0.75rem 0 1rem;
      font-family: var(--np-marca-titulos, inherit);
      font-size: clamp(1.75rem, 7vw, 2.5rem);
    }
    .rg__mensaje {
      margin: 0 0 1rem;
      white-space: pre-line;
    }
    .rg__aportar {
      display: grid;
      gap: 0.75rem;
      margin-block-end: 2rem;
    }
    .rg__dato {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      /* 1rem arriba y abajo: el dedo va a dar aquí con el banco abierto. */
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .rg__dato-que {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-inline-size: 0;
      gap: 0.1rem;
    }
    .rg__dato-que small {
      opacity: 0.75;
    }
    .rg__iban {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      overflow-wrap: anywhere;
    }
    .rg__copiado {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    .rg__lista h2 {
      margin: 0 0 0.25rem;
      font-family: var(--np-marca-titulos, inherit);
      font-size: 1.4rem;
    }
    .rg__cuantos {
      margin: 0 0 1rem;
      opacity: 0.75;
    }
    .rg__lista ul {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rg__regalo {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem 0.9rem;
      align-items: center;
      padding: 0.9rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
    }
    /*
       Lo que ha cogido otro se apaga; **lo mío no**. Apagar lo propio es el
       fallo que se vio en el móvil: el invitado cree que no le toca y
       vuelve a coger otra cosa.
    */
    .rg__regalo--cogido {
      opacity: 0.55;
    }
    .rg__regalo--mio {
      border-width: 2px;
    }
    .rg__accion--mia {
      font-weight: 600;
    }
    .rg__imagen {
      inline-size: 4rem;
      block-size: 4rem;
      border-radius: 0.6rem;
      object-fit: cover;
    }
    .rg__que {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-inline-size: 0;
    }
    .rg__que small {
      opacity: 0.8;
    }
    .rg__precio {
      font-variant-numeric: tabular-nums;
    }
    .rg__enlace {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      margin-block-start: 0.2rem;
      color: inherit;
    }
    .rg__accion,
    .rg__cogido {
      grid-column: 1 / -1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-block-size: 2.75rem;
      padding: 0 1rem;
      border: 1px solid currentColor;
      border-radius: 999px;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .rg__cogido {
      border-style: dashed;
      cursor: default;
      opacity: 0.8;
    }
    .rg__accion:disabled {
      cursor: progress;
      opacity: 0.6;
    }
    .rg__fallo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1rem;
    }
    .rg__vacio {
      opacity: 0.8;
    }
  `,
})
export class NpRegalosPublica {
  private readonly puerta = inject(PUERTA_REGALOS);

  protected readonly aportacion = signal<AportacionPublica | null>(null);
  protected readonly regalos = signal<readonly RegaloPublico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly fallo = signal<FalloRegalos | null>(null);
  /** El id en el que se está trabajando: bloquea los botones mientras va. */
  protected readonly ocupado = signal<string | null>(null);
  protected readonly copiado = signal<string | null>(null);

  protected readonly resumen = computed(() => resumenDeRegalos(this.regalos()));
  protected readonly hayQueAportar = computed(() => {
    const ap = this.aportacion();
    return ap !== null && hayAportacion(ap);
  });

  constructor() {
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

  /**
   * Copia al portapapeles, y si el navegador no deja, no pasa nada.
   *
   * El número sigue ahí escrito: copiar es el atajo, no la única forma.
   */
  protected async copiar(valor: string): Promise<void> {
    try {
      await navigator.clipboard?.writeText(valor);
      this.copiado.set(valor);
    } catch {
      this.copiado.set(null);
    }
  }

  protected async reservar(regalo: RegaloPublico): Promise<void> {
    await this.trabajar(regalo.id, () => this.puerta.reservar(regalo.id));
  }

  protected async soltar(regalo: RegaloPublico): Promise<void> {
    await this.trabajar(regalo.id, () => this.puerta.soltar(regalo.id));
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.aplicar(await this.puerta.listar());
    this.cargando.set(false);
  }

  /**
   * Una reserva a la vez, y la lista entera de vuelta.
   *
   * Si alguien ha cogido algo mientras este invitado miraba, se entera aquí:
   * el servidor devuelve la lista al día incluso cuando dice que no.
   */
  private async trabajar(
    id: string,
    accion: () => Promise<Awaited<ReturnType<typeof this.puerta.listar>>>,
  ): Promise<void> {
    if (this.ocupado() !== null) return;

    this.ocupado.set(id);
    const resultado = await accion();
    this.ocupado.set(null);

    this.aplicar(resultado);

    // Un «ya lo ha cogido alguien» deja la lista vieja en pantalla, y lo que
    // el invitado necesita ver es la nueva. Se vuelve a pedir.
    if (!resultado.ok && resultado.fallo.tipo === 'ya-reservado') {
      const fresca = await this.puerta.listar();
      if (fresca.ok) {
        this.aportacion.set(fresca.aportacion);
        this.regalos.set(fresca.regalos);
      }
    }
  }

  private aplicar(resultado: Awaited<ReturnType<typeof this.puerta.listar>>): void {
    if (resultado.ok) {
      this.aportacion.set(resultado.aportacion);
      this.regalos.set(resultado.regalos);
      this.fallo.set(null);
    } else {
      this.fallo.set(resultado.fallo);
    }
  }
}
