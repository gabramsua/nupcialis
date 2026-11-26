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
import { NpIcon } from '../../../design-system/icons/icon';
import {
  COLORES_DRESS,
  DRESS_CODE_VACIO,
  MAX_AVISO,
  MAX_AVISOS,
  MAX_COLORES,
  MAX_DESCRIPCION_DRESS,
  colorDress,
  colorEnLasDos,
  sanearDressCode,
  tieneDressCode,
  type DressCodePublico,
  type IdColorDress,
} from '../../public-site/dress-code/dress-code';
import { BodaStore } from '../boda.store';
import { NpEditorRico } from '../web/editor-rico';
import { NpInput } from '../../../design-system/components/field/input';

type Lista = 'sugeridos' | 'evitar';

/**
 * Cómo vestir, donde la pareja lo decide (§8.11).
 *
 * La pantalla está construida alrededor de una cosa: **los colores se eligen
 * de una lista cerrada, no de un selector**. Un selector de color da un
 * hexadecimal, y nadie sabe si eso es «verde oliva» o «verde salvia», que es
 * justo lo que el invitado necesita leer; además, un hexadecimal que viniera
 * del cliente acabaría dentro de un atributo de estilo de la web pública. Con
 * la lista cerrada, cada muestra tiene nombre por construcción.
 *
 * Lo que esta pantalla vigila y la web no puede:
 *
 * 1. **Un color en las dos listas.** «Poneos verde oliva» y «evitad el verde
 *    oliva» en la misma página deja al invitado sin saber qué hacer.
 * 2. **Que haya algo que enseñar.** Una sección de dress code con el título
 *    solo es peor que no tenerla.
 */
@Component({
  selector: 'np-panel-dress-code',
  imports: [TranslocoDirective, NpAlert, NpButton, NpIcon, NpEditorRico, NpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="dc">
        <header class="dc__intro">
          <div>
            <h2>{{ t('panel.dressCode.titulo') }}</h2>
            <p>{{ t('panel.dressCode.ayuda') }}</p>
          </div>
          <button npButton type="button" [loading]="guardando()" (click)="guardar()">
            <np-icon name="check" />
            {{ t('common.save') }}
          </button>
        </header>

        @if (recienGuardado()) {
          <p class="dc__hecho" role="status">
            <np-icon name="check-circle" weight="fill" />
            {{ t('panel.datos.guardado') }}
          </p>
        }

        @if (store.error(); as error) {
          <np-alert status="declined" [heading]="t('panel.dressCode.errorGuardar')">
            <p>{{ error }}</p>
          </np-alert>
        }

        @if (avisos().length > 0) {
          <np-alert status="attention" [heading]="t('panel.dressCode.avisos')">
            <ul class="dc__lista-avisos">
              @for (aviso of avisos(); track aviso) {
                <li>{{ aviso }}</li>
              }
            </ul>
          </np-alert>
        }

        <p class="dc__campo">
          <strong>{{ t('panel.dressCode.campo.descripcion') }}</strong>
          <small>{{ t('panel.dressCode.campo.descripcionAyuda') }}</small>
        </p>
        @defer (on viewport) {
          <np-editor-rico
            [valor]="descripcion()"
            [maximo]="maximoDescripcion"
            (cambia)="descripcion.set($event)"
          />
        } @placeholder {
          <p class="dc__cargando">{{ t('panel.secciones.cargandoEditor') }}</p>
        }

        <!--
          Cada paleta va plegada: son treinta colores por lista y, desplegadas
          las dos, la pantalla medía dos mil píxeles en un móvil. Lo que
          importa —lo que han elegido— está en el resumen y se ve sin abrir
          nada; la rejilla solo hace falta cuando se va a tocar.
        -->
        @for (cual of listas; track cual) {
          <details class="dc__paleta">
            <summary class="dc__campo">
              <strong>
                <np-icon [name]="cual === 'sugeridos' ? 'dress' : 'x-circle'" />
                {{ t('panel.dressCode.lista.' + cual) }}
                <small>
                  {{
                    t('panel.dressCode.elegidos', {
                      n: elegidos(cual).length,
                      max: maximoColores,
                    })
                  }}
                </small>
                <!--
                  La flecha es la única señal de que esto se abre: un summary
                  en caja flexible pierde su marcador, y sin ella la pareja no
                  tiene forma de saber que hay treinta colores debajo.
                -->
                <np-icon class="dc__flecha" name="caret-down" />
              </strong>

              @if (elegidos(cual).length === 0) {
                <small>{{ t('panel.dressCode.ninguno') }}</small>
              } @else {
                <span class="dc__resumen">
                  @for (id of elegidos(cual); track id) {
                    <span class="dc__puesto">
                      <span class="dc__muestra dc__muestra--mini" [style.background]="hex(id)">
                      </span>
                      {{ nombre(id) }}
                    </span>
                  }
                </span>
              }
            </summary>

            <!--
              Botones de dos estados y no casillas: lo que se toca aquí es el
              color, y el área pulsable tiene que ser la muestra entera para
              que funcione con el dedo. Lo elegido se dice con el marco, el
              icono y aria-pressed, nunca solo con el color (§9.1).
            -->
            <ul class="dc__colores">
              @for (color of colores; track color.id) {
                <li>
                  <button
                    type="button"
                    class="dc__color"
                    [class.dc__color--puesto]="elegidos(cual).includes(color.id)"
                    [attr.aria-pressed]="elegidos(cual).includes(color.id)"
                    [disabled]="bloqueado(cual, color.id)"
                    (click)="alternar(cual, color.id)"
                  >
                    <span class="dc__muestra" [style.background]="color.hex">
                      @if (elegidos(cual).includes(color.id)) {
                        <np-icon name="check-circle" />
                      }
                    </span>
                    {{ color.nombre }}
                  </button>
                </li>
              }
            </ul>
          </details>
        }

        <section class="dc__tips">
          <p class="dc__campo">
            <strong>
              <np-icon name="warning" />
              {{ t('panel.dressCode.campo.avisos') }}
            </strong>
            <small>{{ t('panel.dressCode.campo.avisosAyuda') }}</small>
          </p>

          <ul class="dc__tips-lista">
            @for (aviso of tips(); track $index) {
              <li>
                <input
                  npInput
                  type="text"
                  [value]="aviso"
                  [attr.maxlength]="maximoAviso"
                  [attr.aria-label]="t('panel.dressCode.campo.avisos')"
                  (input)="cambiarTip($index, $event)"
                />
                <button
                  npButton
                  size="sm"
                  variant="ghost"
                  type="button"
                  [attr.aria-label]="t('common.delete')"
                  (click)="quitarTip($index)"
                >
                  <np-icon name="trash" />
                </button>
              </li>
            }
          </ul>

          @if (tips().length < maximoAvisos) {
            <button npButton size="sm" variant="ghost" type="button" (click)="anadirTip()">
              <np-icon name="plus" />
              {{ t('panel.dressCode.anadirAviso') }}
            </button>
          }
        </section>
      </section>
    </ng-container>
  `,
  styles: `
    .dc {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .dc__hecho {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-status-confirmed-text);
    }
    .dc__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .dc__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .dc__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .dc__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .dc__lista-avisos {
      margin: var(--np-space-1) 0 0;
      padding-inline-start: 1.1em;
    }
    .dc__campo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: 0;
    }
    .dc__campo strong {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
    }
    .dc__campo small,
    .dc__cargando {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .dc__paleta,
    .dc__tips {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
    }
    .dc__paleta summary {
      cursor: pointer;
    }
    .dc__paleta summary strong {
      justify-content: start;
    }
    .dc__flecha {
      margin-inline-start: auto;
      transition: transform 120ms ease;
    }
    .dc__paleta[open] .dc__flecha {
      transform: rotate(180deg);
    }
    @media (prefers-reduced-motion: reduce) {
      .dc__flecha {
        transition: none;
      }
    }
    .dc__paleta summary::marker {
      color: var(--np-surface-text-muted);
    }
    .dc__resumen {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1) var(--np-space-3);
    }
    .dc__puesto {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .dc__muestra--mini {
      inline-size: 1rem;
      block-size: 1rem;
    }
    .dc__colores {
      margin-block-start: var(--np-space-2);
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
      gap: var(--np-space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .dc__color {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      inline-size: 100%;
      padding: var(--np-space-2);
      border: 1px solid transparent;
      border-radius: var(--np-radius-md);
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .dc__color:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    /* Elegido: marco, fondo e icono dentro de la muestra. El color de la
       muestra no cuenta como señal, porque es el contenido. */
    .dc__color--puesto {
      border-color: var(--np-surface-text);
      background: var(--np-surface-canvas);
      font-weight: var(--np-weight-medium);
    }
    .dc__muestra {
      display: grid;
      flex: none;
      place-items: center;
      inline-size: 1.75rem;
      block-size: 1.75rem;
      border: 1px solid var(--np-surface-border);
      border-radius: 50%;
      color: #fff;
      filter: drop-shadow(0 0 1px rgb(0 0 0 / 60%));
    }
    .dc__tips-lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .dc__tips-lista li {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
    }
    .dc__tips-lista input {
      flex: 1;
    }
  `,
})
export class PanelDressCode {
  protected readonly store = inject(BodaStore);

  protected readonly colores = COLORES_DRESS;
  protected readonly listas: readonly Lista[] = ['sugeridos', 'evitar'];
  protected readonly maximoColores = MAX_COLORES;
  protected readonly maximoAvisos = MAX_AVISOS;
  protected readonly maximoAviso = MAX_AVISO;
  protected readonly maximoDescripcion = MAX_DESCRIPCION_DRESS;

  protected readonly guardando = signal(false);
  protected readonly recienGuardado = signal(false);

  /**
   * El dress code que hay guardado, o el vacío mientras la boda carga.
   *
   * Es la fuente de los cuatro campos de abajo.
   */
  private readonly guardado = computed<DressCodePublico>(
    () => this.store.boda()?.dressCode ?? DRESS_CODE_VACIO,
  );

  /**
   * Los cuatro campos, con `linkedSignal`.
   *
   * Parten de lo guardado y vuelven a partir de ahí cuando la boda se recarga
   * o cuando se guarda; lo que la pareja escriba encima manda. Con un `signal`
   * a secas se quedarían vacíos para siempre, porque la boda llega después de
   * que se monte la pantalla.
   */
  protected readonly descripcion = linkedSignal<DressCodePublico, string>({
    source: this.guardado,
    computation: (dress) => dress.descripcion,
  });

  protected readonly sugeridos = linkedSignal<DressCodePublico, readonly IdColorDress[]>({
    source: this.guardado,
    computation: (dress) => dress.sugeridos.map((color) => color.id as IdColorDress),
  });

  protected readonly evitar = linkedSignal<DressCodePublico, readonly IdColorDress[]>({
    source: this.guardado,
    computation: (dress) => dress.evitar.map((color) => color.id as IdColorDress),
  });

  protected readonly tips = linkedSignal<DressCodePublico, readonly string[]>({
    source: this.guardado,
    computation: (dress) => [...dress.avisos],
  });

  /**
   * Lo que la pareja no puede ver mirando la pantalla.
   *
   * El primero es el que importa: un color en las dos listas a la vez es una
   * contradicción que el invitado no puede resolver.
   */
  protected readonly avisos = computed(() => {
    const avisos: string[] = [];
    const dress = sanearDressCode({
      description: this.descripcion(),
      suggestedColors: this.sugeridos(),
      avoidColors: this.evitar(),
      tips: this.tips(),
    });

    for (const color of colorEnLasDos(dress)) {
      avisos.push(
        `«${color.nombre}» está en las dos listas: a la vez lo sugerís y pedís evitarlo.`,
      );
    }

    if (!tieneDressCode(dress)) {
      avisos.push(
        'Todavía no hay nada escrito: la sección de la web sale con el título solo. Contad al menos cómo de arreglado queréis que vaya la gente.',
      );
    }

    return avisos;
  });

  /** El nombre y el color de un id, para el resumen de la paleta plegada. */
  protected nombre(id: IdColorDress): string {
    return colorDress(id)?.nombre ?? '';
  }

  protected hex(id: IdColorDress): string {
    return colorDress(id)?.hex ?? 'transparent';
  }

  protected elegidos(cual: Lista): readonly IdColorDress[] {
    return cual === 'sugeridos' ? this.sugeridos() : this.evitar();
  }

  /** El tope de cada lista: pasado, los demás colores dejan de poder pulsarse. */
  protected bloqueado(cual: Lista, id: IdColorDress): boolean {
    const elegidos = this.elegidos(cual);
    return elegidos.length >= MAX_COLORES && !elegidos.includes(id);
  }

  protected alternar(cual: Lista, id: IdColorDress): void {
    const lista = cual === 'sugeridos' ? this.sugeridos : this.evitar;
    const elegidos = lista();

    lista.set(
      elegidos.includes(id)
        ? elegidos.filter((otro) => otro !== id)
        : [...elegidos, id].slice(0, MAX_COLORES),
    );
  }

  protected anadirTip(): void {
    this.tips.update((tips) => [...tips, '']);
  }

  protected cambiarTip(indice: number, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.tips.update((tips) => tips.map((tip, n) => (n === indice ? valor : tip)));
  }

  protected quitarTip(indice: number): void {
    this.tips.update((tips) => tips.filter((_, n) => n !== indice));
  }

  protected async guardar(): Promise<void> {
    if (this.guardando()) return;

    this.guardando.set(true);
    this.recienGuardado.set(false);
    const ok = await this.store.guardarDressCode({
      description: this.descripcion(),
      suggestedColors: this.sugeridos(),
      avoidColors: this.evitar(),
      // Los vacíos no se guardan: un aviso en blanco no es un aviso, y el
      // saneador del servidor lo tiraría igual.
      tips: this.tips()
        .map((tip) => tip.trim())
        .filter((tip) => tip !== ''),
    });
    this.guardando.set(false);
    this.recienGuardado.set(ok);
  }
}
