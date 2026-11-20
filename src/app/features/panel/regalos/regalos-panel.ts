import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpField } from '../../../design-system/components/field/field';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import type {
  FalloRegalosPanel,
  RegaloDelPanel,
} from '../../../core/regalos/regalos-panel-gateway';
import {
  bizumValido,
  enlaceValido,
  ibanEnGrupos,
  ibanValido,
  MAX_DESCRIPCION,
  MAX_MENSAJE,
  MAX_TITULO,
} from '../../public-site/regalos/regalos';
import { BodaStore } from '../boda.store';
import { RegalosStore } from './regalos.store';
import { NpInput } from '../../../design-system/components/field/input';

interface Formulario {
  id: string | null;
  titulo: string;
  descripcion: string;
  precio: string;
  enlace: string;
  imagen: string;
  enabled: boolean;
}

const VACIO: Formulario = {
  id: null,
  titulo: '',
  descripcion: '',
  precio: '',
  enlace: '',
  imagen: '',
  enabled: true,
};

/**
 * Los regalos en el panel de la pareja (§8.8).
 *
 * Dos cosas en una pantalla porque son la misma decisión: **cómo aportar** —el
 * Bizum, la cuenta y el mensaje— y **qué pedir** —la lista—. Las dos conviven
 * y se encienden por separado dejando su hueco vacío.
 *
 * El IBAN se comprueba con el módulo 97 **mientras se escribe**, y no al
 * guardar. Es el único dato de todo el producto donde un dígito mal significa
 * que el dinero de la boda acaba rebotado o en la cuenta de otro, y el momento
 * de decirlo es cuando la pareja todavía tiene el papel del banco delante.
 *
 * Lo que aquí no sale nunca es **quién** ha reservado cada regalo. La reserva
 * es anónima para el resto de invitados, y la pareja no necesita el nombre
 * para nada: lo que necesita es saber qué queda libre.
 */
@Component({
  selector: 'np-panel-regalos',
  imports: [
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpField,
    NpModal,
    NpIcon,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="pr">
        <header class="pr__intro">
          <div>
            <h2>{{ t('panel.regalos.titulo') }}</h2>
            <p>{{ t('panel.regalos.ayuda') }}</p>
          </div>
          <a npButton variant="ghost" size="sm" routerLink="/panel/gifts/recibidos">
            <np-icon name="currency-eur" />
            {{ t('panel.regalos.verRecibidos') }}
          </a>
        </header>

        <!-- Cómo aportar -->
        <section class="pr__bloque">
          <h3>{{ t('panel.regalos.aportar') }}</h3>
          <p class="pr__nota">
            <np-icon name="lock-simple" />
            {{ t('panel.regalos.notaPrivacidad') }}
          </p>

          <np-field
            [label]="t('panel.regalos.campo.bizum')"
            [hint]="t('panel.regalos.campo.bizumAyuda')"
            [error]="errorBizum() ? t('panel.regalos.campo.bizumMal') : null"
            #fBizum
          >
            <input
              npInput
              type="tel"
              inputmode="tel"
              autocomplete="off"
              [id]="fBizum.id()"
              [value]="bizum()"
              (input)="bizum.set(valor($event))"
            />
          </np-field>

          <np-field
            [label]="t('panel.regalos.campo.iban')"
            [hint]="t('panel.regalos.campo.ibanAyuda')"
            [error]="errorIban() ? t('panel.regalos.campo.ibanMal') : null"
            #fIban
          >
            <input
              npInput
              type="text"
              autocomplete="off"
              spellcheck="false"
              [id]="fIban.id()"
              [value]="iban()"
              (input)="iban.set(valor($event))"
            />
          </np-field>

          @if (ibanBueno(); as bueno) {
            <p class="pr__ok">
              <np-icon name="check-circle" weight="fill" />
              {{ t('panel.regalos.ibanBien', { iban: bueno }) }}
            </p>
          }

          <np-field [label]="t('panel.regalos.campo.titular')" #fTitular>
            <input
              npInput
              type="text"
              autocomplete="off"
              [id]="fTitular.id()"
              [value]="titular()"
              (input)="titular.set(valor($event))"
            />
          </np-field>

          <np-field
            [label]="t('panel.regalos.campo.mensaje')"
            [hint]="t('panel.regalos.campo.mensajeAyuda')"
            #fMensaje
          >
            <textarea
              npInput
              rows="4"
              [id]="fMensaje.id()"
              [attr.maxlength]="maxMensaje"
              [value]="mensaje()"
              (input)="mensaje.set(valor($event))"
            ></textarea>
          </np-field>

          <button
            npButton
            type="button"
            [loading]="guardandoAportacion()"
            (click)="guardarAportacion()"
          >
            {{ t('common.save') }}
          </button>
        </section>

        <!-- La lista -->
        <section class="pr__bloque">
          <header class="pr__cabecera">
            <h3>{{ t('panel.regalos.lista') }}</h3>
            <button npButton variant="ghost" type="button" (click)="nuevo()">
              <np-icon name="plus" />
              {{ t('panel.regalos.anadir') }}
            </button>
          </header>

          @if (store.fallo(); as fallo) {
            <np-alert status="declined" [heading]="t('panel.regalos.error')">
              <p>{{ t('panel.regalos.fallo.' + fallo.tipo) }}</p>
            </np-alert>
          }

          @switch (store.estado()) {
            @case ('cargando') {
              <np-empty-state icon="gift" [title]="t('panel.regalos.cargando')" />
            }
            @default {
              @if (store.regalos().length === 0) {
                <np-empty-state
                  icon="gift"
                  [title]="t('panel.regalos.sinRegalos')"
                  [description]="t('panel.regalos.sinRegalosDescripcion')"
                />
              } @else {
                <ul class="pr__regalos">
                  @for (regalo of store.regalos(); track regalo.id) {
                    <li class="pr__regalo" [class.pr__regalo--apagado]="!regalo.enabled">
                      <div class="pr__que">
                        <strong>{{ regalo.titulo }}</strong>
                        <small>
                          @if (regalo.precio !== null) {
                            {{ euros(regalo.precio) }}
                          }
                          @if (regalo.reservado) {
                            <span class="pr__cogido">
                              <np-icon name="check-circle" weight="fill" />
                              {{ t('panel.regalos.cogido') }}
                            </span>
                          }
                          @if (!regalo.enabled) {
                            <span class="pr__apagado">{{ t('panel.regalos.apagado') }}</span>
                          }
                        </small>
                      </div>

                      <button
                        npButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        (click)="editar(regalo)"
                      >
                        <np-icon name="pencil-simple" />
                        {{ t('common.edit') }}
                      </button>
                    </li>
                  }
                </ul>
              }
            }
          }
        </section>

        @if (editando()) {
          <np-modal
            [open]="true"
            [heading]="t('panel.regalos.' + (forma().id ? 'editarRegalo' : 'anadir'))"
            (closed)="editando.set(false)"
          >
            <np-field [label]="t('panel.regalos.campo.titulo')" [required]="true" #gTitulo>
              <input
                npInput
                type="text"
                [id]="gTitulo.id()"
                [attr.maxlength]="maxTitulo"
                [value]="forma().titulo"
                (input)="cambiar('titulo', $event)"
              />
            </np-field>

            <np-field [label]="t('panel.regalos.campo.descripcion')" #gDesc>
              <textarea
                npInput
                rows="3"
                [id]="gDesc.id()"
                [attr.maxlength]="maxDescripcion"
                [value]="forma().descripcion"
                (input)="cambiar('descripcion', $event)"
              ></textarea>
            </np-field>

            <np-field
              [label]="t('panel.regalos.campo.precio')"
              [hint]="t('panel.regalos.campo.precioAyuda')"
              #gPrecio
            >
              <input
                npInput
                type="number"
                min="0"
                step="1"
                inputmode="decimal"
                [id]="gPrecio.id()"
                [value]="forma().precio"
                (input)="cambiar('precio', $event)"
              />
            </np-field>

            <np-field
              [label]="t('panel.regalos.campo.enlace')"
              [error]="errorEnlace() ? t('panel.regalos.campo.enlaceMal') : null"
              #gEnlace
            >
              <input
                npInput
                type="url"
                inputmode="url"
                [id]="gEnlace.id()"
                [value]="forma().enlace"
                (input)="cambiar('enlace', $event)"
              />
            </np-field>

            <label class="pr__interruptor">
              <input
                type="checkbox"
                [checked]="forma().enabled"
                (change)="cambiarEncendido($event)"
              />
              {{ t('panel.regalos.encendido') }}
            </label>

            <div np-modal-actions>
              @if (forma().id) {
                <button npButton variant="danger" type="button" (click)="borrar()">
                  <np-icon name="trash" />
                  {{ t('common.delete') }}
                </button>
              }
              <button npButton variant="ghost" type="button" (click)="editando.set(false)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                type="button"
                [disabled]="forma().titulo.trim() === ''"
                [loading]="guardandoRegalo()"
                (click)="guardarRegalo()"
              >
                {{ t('common.save') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .pr__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    @media (min-width: 48rem) {
      .pr__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .pr__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .pr__intro p {
      margin: var(--np-space-1) 0 var(--np-space-4);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pr__bloque {
      display: grid;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-5);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .pr__bloque h3 {
      margin: 0;
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-semibold);
    }
    .pr__cabecera {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      align-items: center;
      justify-content: space-between;
    }
    .pr__nota,
    .pr__ok {
      display: flex;
      gap: var(--np-space-2);
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pr__ok {
      color: var(--np-confirmed-fg);
      font-variant-numeric: tabular-nums;
    }
    .pr__regalos {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .pr__regalo {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      align-items: center;
      justify-content: space-between;
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .pr__regalo--apagado {
      opacity: 0.6;
    }
    .pr__que {
      display: flex;
      flex-direction: column;
      min-inline-size: 0;
    }
    .pr__que small {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      align-items: center;
      color: var(--np-surface-text-muted);
    }
    .pr__cogido {
      display: inline-flex;
      gap: var(--np-space-1);
      align-items: center;
      color: var(--np-confirmed-fg);
    }
    .pr__interruptor {
      display: flex;
      gap: var(--np-space-2);
      align-items: center;
      font-size: var(--np-text-sm);
    }
    input,
    textarea {
      inline-size: 100%;
    }
  `,
})
export class PanelRegalos {
  protected readonly store = inject(RegalosStore);
  protected readonly boda = inject(BodaStore);

  protected readonly maxTitulo = MAX_TITULO;
  protected readonly maxDescripcion = MAX_DESCRIPCION;
  protected readonly maxMensaje = MAX_MENSAJE;

  /**
   * Lo tecleado, partiendo de lo guardado.
   *
   * `linkedSignal` y no `signal`: cuando la boda termina de cargar, los campos
   * se rellenan solos sin pisar lo que la pareja ya estuviera escribiendo.
   */
  /**
   * El IBAN guardado se pinta **en grupos de cuatro**, no pegado.
   *
   * Lo guardado está normalizado, que es lo que vale para comparar y para
   * publicar; lo que la pareja tiene que poder releer en su panel es lo que
   * trae el papel del banco. `ibanValido` acepta los espacios al volver.
   */
  protected readonly iban = linkedSignal(() => {
    const guardado = this.boda.boda()?.aportacion.iban;
    return guardado ? ibanEnGrupos(guardado) : '';
  });
  protected readonly titular = linkedSignal(() => this.boda.boda()?.aportacion.titular ?? '');
  protected readonly bizum = linkedSignal(() => this.boda.boda()?.aportacion.bizum ?? '');
  protected readonly mensaje = linkedSignal(() => this.boda.boda()?.aportacion.mensaje ?? '');

  protected readonly guardandoAportacion = signal(false);
  protected readonly guardandoRegalo = signal(false);
  protected readonly editando = signal(false);
  protected readonly forma = signal<Formulario>(VACIO);

  /** Escrito y mal: en blanco no es un error, es que no lo han puesto. */
  protected readonly errorIban = computed(
    () => this.iban().trim() !== '' && ibanValido(this.iban()) === null,
  );
  protected readonly errorBizum = computed(
    () => this.bizum().trim() !== '' && bizumValido(this.bizum()) === null,
  );
  protected readonly errorEnlace = computed(
    () => this.forma().enlace.trim() !== '' && enlaceValido(this.forma().enlace) === null,
  );

  /** El IBAN bueno, en grupos de cuatro, para que la pareja lo relea. */
  protected readonly ibanBueno = computed(() => {
    const bueno = ibanValido(this.iban());
    return bueno === null ? null : ibanEnGrupos(bueno);
  });

  constructor() {
    void this.store.cargar();
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected euros(precio: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: precio % 1 === 0 ? 0 : 2,
    }).format(precio);
  }

  protected cambiar(campo: 'titulo' | 'descripcion' | 'precio' | 'enlace', evento: Event): void {
    const valor = this.valor(evento);
    this.forma.update((previa) => ({ ...previa, [campo]: valor }));
  }

  protected cambiarEncendido(evento: Event): void {
    const encendido = (evento.target as HTMLInputElement).checked;
    this.forma.update((previa) => ({ ...previa, enabled: encendido }));
  }

  protected nuevo(): void {
    this.forma.set(VACIO);
    this.editando.set(true);
  }

  protected editar(regalo: RegaloDelPanel): void {
    this.forma.set({
      id: regalo.id,
      titulo: regalo.titulo,
      descripcion: regalo.descripcion,
      precio: regalo.precio === null ? '' : String(regalo.precio),
      enlace: regalo.enlace ?? '',
      imagen: regalo.imagen ?? '',
      enabled: regalo.enabled,
    });
    this.editando.set(true);
  }

  protected async guardarAportacion(): Promise<void> {
    if (this.guardandoAportacion()) return;

    this.guardandoAportacion.set(true);
    await this.boda.guardarAportacion({
      iban: this.iban().trim(),
      titular: this.titular().trim(),
      bizum: this.bizum().trim(),
      mensaje: this.mensaje(),
    });
    this.guardandoAportacion.set(false);
  }

  protected async guardarRegalo(): Promise<void> {
    const forma = this.forma();
    if (this.guardandoRegalo() || forma.titulo.trim() === '') return;

    this.guardandoRegalo.set(true);
    const resultado = await this.store.guardar({
      id: forma.id ?? undefined,
      titulo: forma.titulo.trim(),
      descripcion: forma.descripcion.trim(),
      precio: precioDe(forma.precio),
      enlace: enlaceValido(forma.enlace),
      imagen: enlaceValido(forma.imagen),
      order: this.store.regalos().length,
      enabled: forma.enabled,
    });
    this.guardandoRegalo.set(false);

    if (resultado.ok) this.editando.set(false);
  }

  protected async borrar(): Promise<void> {
    const id = this.forma().id;
    if (id === null) return;

    const resultado = await this.store.borrar(id);
    if (resultado.ok) this.editando.set(false);
  }

  /** Expuesto para la prueba: el fallo tal como se pinta. */
  protected claveDelFallo(fallo: FalloRegalosPanel): string {
    return `panel.regalos.fallo.${fallo.tipo}`;
  }
}

/** Un precio tecleado, o nada. Lo que no es un número no es un precio. */
function precioDe(texto: string): number | null {
  const limpio = texto.replace(',', '.').trim();
  if (limpio === '') return null;

  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) / 100 : null;
}
