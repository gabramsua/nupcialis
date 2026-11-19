import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { NP_CATEGORIAS } from '../../../design-system/tokens/semantic.generated';
import type { HitoDelPanel } from '../../../core/cronologia/cronologia-gateway';
import type { FalloCronologia } from '../../../core/cronologia/cronologia-gateway';
import {
  COLORES_HITO,
  ICONOS_HITO,
  MAX_DESCRIPCION,
  MAX_TITULO,
  huecos,
  minutosDelDia,
  solapes,
  type ColorHito,
  type HitoPublico,
  type IconoHito,
} from '../../public-site/cronologia/cronologia';
import { CronologiaStore } from './cronologia.store';

/**
 * La cronología del día, donde la pareja la monta (§8.13).
 *
 * Tres cosas que esta pantalla tiene que hacer bien:
 *
 * 1. **Distinguir lo interno de lo que ve el invitado.** La hora a la que llega
 *    el fotógrafo o empieza el montaje va en la misma agenda —es la que la
 *    pareja comparte con sus proveedores— y no se publica. Se marca con color,
 *    icono y texto, como todo estado (§9.1).
 * 2. **Avisar de solapes y huecos**, que es donde se ven los errores de
 *    planificación: dos cosas a la vez, o tres horas en las que no pasa nada.
 *    Es un aviso y no un error: una boda tiene cosas que pasan a la vez.
 * 3. **Entender que la boda acaba de madrugada.** «04:00» va al final, no al
 *    principio. Lo resuelve el dominio; aquí solo se enseña en orden.
 */
@Component({
  selector: 'np-panel-cronologia',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="cr">
        <header class="cr__intro">
          <div>
            <h2>{{ t('panel.cronologia.titulo') }}</h2>
            <p>{{ t('panel.cronologia.ayuda') }}</p>
          </div>
          <button npButton type="button" (click)="nuevo()">
            <np-icon name="plus" />
            {{ t('panel.cronologia.anadir') }}
          </button>
        </header>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.cronologia.errorGuardar')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.cronologia.cargando')" />
          }
          @default {
            @if (store.hitos().length === 0) {
              <np-empty-state
                icon="clock"
                [title]="t('panel.cronologia.ninguno')"
                [description]="t('panel.cronologia.ningunoDescripcion')"
              />
            } @else {
              <!--
                Los avisos de planificación, arriba y juntos: son lo único de
                esta pantalla que la pareja no puede ver por sí misma mirando la
                lista.
              -->
              @if (avisos().length > 0) {
                <np-alert status="attention" [heading]="t('panel.cronologia.avisos.titulo')">
                  <ul class="cr__avisos">
                    @for (aviso of avisos(); track aviso) {
                      <li>{{ aviso }}</li>
                    }
                  </ul>
                </np-alert>
              }

              <ol class="cr__lista">
                @for (hito of store.hitos(); track hito.id) {
                  <li
                    class="cr__ficha"
                    [class.cr__ficha--interna]="!hito.visibleToGuests"
                    [style.--cr-color]="'var(--np-cat-' + hito.color + ')'"
                  >
                    <p class="cr__hora">
                      <np-icon [name]="hito.icon" />
                      <strong>{{ hito.time || t('panel.cronologia.sinHora') }}</strong>
                      @if (hito.endTime) {
                        <small>{{ t('panel.cronologia.hasta', { hora: hito.endTime }) }}</small>
                      }
                    </p>

                    <div class="cr__que">
                      <span class="cr__titulo">{{ hito.title }}</span>
                      @if (hito.description) {
                        <span class="cr__descripcion">{{ hito.description }}</span>
                      }
                      <span class="cr__estados">
                        @if (!hito.visibleToGuests) {
                          <np-status-chip
                            status="pending"
                            [label]="t('panel.cronologia.interno')"
                          />
                        }
                        @if (!hito.time) {
                          <np-status-chip
                            status="attention"
                            [label]="t('panel.cronologia.sinPublicar')"
                          />
                        }
                      </span>
                    </div>

                    <div class="cr__acciones">
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="alternar(hito)"
                      >
                        <np-icon [name]="hito.visibleToGuests ? 'eye' : 'eye-slash'" />
                        {{
                          hito.visibleToGuests
                            ? t('panel.cronologia.hacerInterno')
                            : t('panel.cronologia.hacerPublico')
                        }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="editar(hito)"
                      >
                        <np-icon name="pencil-simple" />
                        {{ t('common.edit') }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="borrando.set(hito)"
                      >
                        <np-icon name="trash" />
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </li>
                }
              </ol>
            }
          }
        }

        @if (editando(); as cual) {
          <np-modal
            [open]="true"
            [heading]="
              cual === 'nuevo' ? t('panel.cronologia.nuevo') : t('panel.cronologia.editar')
            "
            (closed)="editando.set(null)"
          >
            <form class="cr__form" [formGroup]="formulario" (submit)="enviar($event)">
              <label>
                {{ t('panel.cronologia.campo.titulo') }}
                <input formControlName="title" [attr.maxlength]="maximoTitulo" />
              </label>

              <div class="cr__horas">
                <label>
                  {{ t('panel.cronologia.campo.hora') }}
                  <input formControlName="time" type="time" />
                </label>
                <label>
                  {{ t('panel.cronologia.campo.fin') }}
                  <input formControlName="endTime" type="time" />
                  <small>{{ t('panel.cronologia.campo.finAyuda') }}</small>
                </label>
              </div>

              <label>
                {{ t('panel.cronologia.campo.descripcion') }}
                <textarea
                  formControlName="description"
                  rows="3"
                  [attr.maxlength]="maximoDescripcion"
                ></textarea>
              </label>

              <div class="cr__horas">
                <label>
                  {{ t('panel.cronologia.campo.icono') }}
                  <select formControlName="icon">
                    @for (icono of iconos; track icono) {
                      <option [value]="icono">{{ t('panel.cronologia.icono.' + icono) }}</option>
                    }
                  </select>
                </label>
                <label>
                  {{ t('panel.cronologia.campo.color') }}
                  <select formControlName="color">
                    @for (color of colores; track color.id) {
                      <option [value]="color.id">{{ color.nombre }}</option>
                    }
                  </select>
                </label>
              </div>

              <label class="cr__casilla">
                <input formControlName="visibleToGuests" type="checkbox" />
                <span>{{ t('panel.cronologia.campo.visible') }}</span>
              </label>
              <small>{{ t('panel.cronologia.campo.visibleAyuda') }}</small>
            </form>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="editando.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                type="button"
                [loading]="guardando()"
                [disabled]="formulario.invalid"
                (click)="guardar()"
              >
                {{ t('common.save') }}
              </button>
            </div>
          </np-modal>
        }

        @if (borrando(); as cual) {
          <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
            <p>{{ t('panel.cronologia.confirmarBorrado', { titulo: cual.title }) }}</p>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="borrando.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                variant="danger"
                type="button"
                [loading]="borrandoYa()"
                (click)="borrar()"
              >
                <np-icon name="trash" />
                {{ t('common.delete') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .cr__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .cr__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .cr__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .cr__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .cr__avisos {
      margin: var(--np-space-1) 0 0;
      padding-inline-start: 1.1em;
    }
    .cr__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: var(--np-space-3) 0 0;
      padding: 0;
      list-style: none;
    }
    /* La barra de color a la izquierda es del hito, no decoración: es lo que
       permite seguir el hilo del día de un vistazo. Nunca sola: al lado van
       el icono, la hora y, si es interno, su etiqueta. */
    .cr__ficha {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-inline-start: 4px solid var(--cr-color);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    /* Lo interno se ve distinto a propósito: es la mitad de la agenda que no
       sale en la web, y confundirlas es publicar la hora del montaje. */
    .cr__ficha--interna {
      border-style: dashed;
      background: var(--np-surface-canvas);
    }
    .cr__hora {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      color: var(--cr-color);
      font-variant-numeric: tabular-nums;
    }
    .cr__hora small {
      color: var(--np-surface-text-muted);
    }
    .cr__que {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
    }
    .cr__titulo {
      font-weight: var(--np-weight-medium);
    }
    .cr__descripcion {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .cr__estados {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .cr__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1);
    }
    .cr__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .cr__form label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .cr__horas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
    }
    .cr__horas label {
      flex: 1;
      min-inline-size: 8rem;
    }
    .cr__form small {
      color: var(--np-surface-text-muted);
    }
    .cr__casilla {
      flex-direction: row;
      align-items: center;
      gap: var(--np-space-2);
    }
  `,
})
export class PanelCronologia {
  protected readonly store = inject(CronologiaStore);
  private readonly fb = inject(FormBuilder);

  protected readonly iconos = ICONOS_HITO;
  /**
   * Los colores que ofrece el desplegable, con su nombre.
   *
   * Salen de la paleta del sistema (§9.1): aquí no se inventa ninguno, y el
   * nombre viene del mismo sitio que el color para que no puedan discrepar.
   */
  protected readonly colores = NP_CATEGORIAS.filter((categoria) =>
    (COLORES_HITO as readonly string[]).includes(categoria.id),
  );
  protected readonly maximoTitulo = MAX_TITULO;
  protected readonly maximoDescripcion = MAX_DESCRIPCION;

  protected readonly editando = signal<HitoDelPanel | 'nuevo' | null>(null);
  protected readonly borrando = signal<HitoDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly borrandoYa = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    title: ['', Validators.required],
    time: ['', Validators.required],
    endTime: [''],
    description: [''],
    icon: ['clock' as IconoHito],
    color: ['rosa' as ColorHito],
    visibleToGuests: [true],
  });

  /**
   * Los avisos de planificación, ya escritos.
   *
   * Se calculan sobre **toda** la agenda, también los hitos internos: un
   * solape entre el montaje y la ceremonia es exactamente el error que esto
   * tiene que cazar.
   */
  protected readonly avisos = computed(() => {
    const hitos = this.comoPublicos();
    const nombre = (id: string) => hitos.find((h) => h.id === id)?.title ?? id;

    const porSolape = solapes(hitos).map(
      (s) => `«${nombre(s.uno)}» y «${nombre(s.otro)}» se pisan.`,
    );

    const porHueco = huecos(hitos).map(
      (h) =>
        `Entre «${nombre(h.despuesDe)}» y «${nombre(h.antesDe)}» hay ${horasYMinutos(h.minutos)} sin nada.`,
    );

    return [...porSolape, ...porHueco];
  });

  /**
   * La agenda en la forma que entiende el dominio.
   *
   * Los hitos sin hora se quedan fuera: no se pueden ordenar ni comparar, y en
   * la pantalla ya salen marcados como «sin publicar».
   */
  private comoPublicos(): readonly HitoPublico[] {
    return this.store
      .hitos()
      .filter((hito) => minutosDelDia(hito.time) !== null)
      .map((hito) => ({
        id: hito.id,
        time: hito.time,
        endTime: hito.endTime,
        title: hito.title,
        description: hito.description,
        icon: hito.icon,
        color: hito.color,
        order: hito.order,
      }));
  }

  constructor() {
    void this.store.cargar();
  }

  protected nuevo(): void {
    this.formulario.reset({
      title: '',
      time: '',
      endTime: '',
      description: '',
      icon: 'clock',
      color: 'rosa',
      visibleToGuests: true,
    });
    this.editando.set('nuevo');
  }

  protected editar(hito: HitoDelPanel): void {
    this.formulario.reset({
      title: hito.title,
      time: hito.time,
      endTime: hito.endTime ?? '',
      description: hito.description,
      icon: hito.icon,
      color: hito.color,
      visibleToGuests: hito.visibleToGuests,
    });
    this.editando.set(hito);
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    void this.guardar();
  }

  protected async guardar(): Promise<void> {
    const cual = this.editando();
    if (!cual || this.formulario.invalid || this.guardando()) return;

    const valores = this.formulario.getRawValue();
    const nuevo = cual === 'nuevo';
    this.guardando.set(true);

    const resultado = await this.store.guardar({
      id: nuevo ? undefined : cual.id,
      title: valores.title.trim(),
      time: valores.time,
      endTime: valores.endTime === '' ? null : valores.endTime,
      description: valores.description.trim(),
      icon: valores.icon,
      color: valores.color,
      visibleToGuests: valores.visibleToGuests,
      // El orden lo decide la hora (ver `sanearCronologia`), así que esto es
      // solo un desempate estable para los que coincidan.
      order: nuevo ? this.store.hitos().length + 1 : cual.order,
    });

    this.guardando.set(false);
    if (resultado.ok) this.editando.set(null);
  }

  /** Pasar un hito de público a interno y al revés, en un toque. */
  protected async alternar(hito: HitoDelPanel): Promise<void> {
    await this.store.guardar({
      id: hito.id,
      title: hito.title,
      time: hito.time,
      endTime: hito.endTime,
      description: hito.description,
      icon: hito.icon,
      color: hito.color,
      order: hito.order,
      visibleToGuests: !hito.visibleToGuests,
    });
  }

  protected async borrar(): Promise<void> {
    const cual = this.borrando();
    if (!cual || this.borrandoYa()) return;

    this.borrandoYa.set(true);
    const resultado = await this.store.borrar(cual.id);
    this.borrandoYa.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  protected textoDelFallo(fallo: FalloCronologia, t: (clave: string) => string): string {
    switch (fallo.tipo) {
      case 'sin-permiso':
      case 'red':
        return t(`panel.cronologia.fallo.${fallo.tipo}`);
      default:
        return t('panel.cronologia.fallo.desconocido');
    }
  }
}

/** «3 h 30 min», o «45 min». Para los avisos, que se leen de corrido. */
function horasYMinutos(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
