import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import type {
  CancionDelPanel,
  FalloPlaylistPanel,
} from '../../../core/playlist/playlist-panel-gateway';
import { BodaStore } from '../boda.store';
import { descargarXlsx } from '../invitados/exportar-xlsx';
import {
  MAX_ARTISTA,
  MAX_TITULO,
  limpiarTexto,
  type EstadoCancion,
} from '../../public-site/playlist/playlist';
import { hojasDePlaylist, nombreDelFicheroDePlaylist } from './exportar-playlist';
import { PlaylistStore } from './playlist.store';
import { NpInput } from '../../../design-system/components/field/input';

type Filtro = EstadoCancion;

/** El orden de las pestañas es el del trabajo: primero lo que falta por decidir. */
const FILTROS: readonly { readonly id: Filtro; readonly icono: NpIconName }[] = [
  { id: 'pending', icono: 'clock' },
  { id: 'accepted', icono: 'check-circle' },
  { id: 'discarded', icono: 'x-circle' },
  { id: 'vetoed', icono: 'prohibit' },
];

const ESTADO_DEL_CHIP = {
  pending: 'pending',
  accepted: 'confirmed',
  discarded: 'declined',
  vetoed: 'declined',
} as const;

/**
 * La playlist, donde la pareja decide qué suena (§8.14).
 *
 * El trabajo de esta pantalla es **vaciar «Por decidir»**: llegan canciones de
 * los invitados y del RSVP, y cada una necesita un sí, un no o un «jamás». Por
 * eso se abre ahí y cada estado es una pestaña con su recuento, no una lista
 * mezclada en la que hay que buscar lo pendiente.
 *
 * Cada estado se dice con color, icono **y** texto (§9.1): «Vetada» no es solo
 * un chip rojo.
 */
@Component({
  selector: 'np-panel-playlist',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpIcon,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="pls">
        <header class="pls__intro">
          <div>
            <h2>{{ t('panel.playlist.titulo') }}</h2>
            <p>{{ t('panel.playlist.ayuda') }}</p>
          </div>
          <div class="pls__botones">
            <button
              npButton
              variant="secondary"
              type="button"
              [loading]="exportando()"
              [disabled]="store.cuenta().accepted + store.cuenta().vetoed === 0"
              (click)="exportar()"
            >
              <np-icon name="download-simple" />
              {{ t('panel.playlist.exportar') }}
            </button>
            <button npButton type="button" (click)="nueva()">
              <np-icon name="plus" />
              {{ t('panel.playlist.anadir') }}
            </button>
          </div>
        </header>

        @if (falloAlExportar()) {
          <np-alert status="declined" [heading]="t('panel.playlist.errorGuardar')">
            <p>{{ t('panel.playlist.fallo.exportar') }}</p>
          </np-alert>
        }

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.playlist.errorGuardar')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="music-notes" [title]="t('panel.playlist.cargando')" />
          }
          @default {
            <div
              class="pls__filtros"
              role="tablist"
              [attr.aria-label]="t('panel.playlist.filtros')"
            >
              @for (f of filtros; track f.id) {
                <button
                  type="button"
                  role="tab"
                  class="pls__filtro"
                  [class.pls__filtro--activo]="filtro() === f.id"
                  [attr.aria-selected]="filtro() === f.id"
                  (click)="filtro.set(f.id)"
                >
                  <np-icon [name]="f.icono" />
                  <span>{{ t('panel.playlist.estado.' + f.id) }}</span>
                  <strong>{{ store.cuenta()[f.id] }}</strong>
                </button>
              }
            </div>

            @if (visibles().length === 0) {
              <np-empty-state
                [icon]="iconoDelFiltro()"
                [title]="t('panel.playlist.vacio.' + filtro())"
              />
            } @else {
              <ul class="pls__lista">
                @for (c of visibles(); track c.id) {
                  <li class="pls__cancion">
                    <p class="pls__cabecera">
                      <span class="pls__que">
                        <strong>{{ c.title }}</strong>
                        @if (c.artist) {
                          <small>{{ c.artist }}</small>
                        }
                      </span>
                      <span class="pls__votos">
                        <np-icon name="heart" weight="fill" />
                        {{ t('panel.playlist.votos', { n: c.votos }) }}
                      </span>
                    </p>

                    <span class="pls__estados">
                      <np-status-chip
                        [status]="chip(c.status)"
                        [label]="t('panel.playlist.estado.' + c.status)"
                      />
                      <small class="pls__origen">{{
                        t('panel.playlist.origen.' + c.source)
                      }}</small>
                    </span>

                    <div class="pls__acciones">
                      @if (c.status !== 'accepted') {
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="poner(c, 'accepted')"
                        >
                          <np-icon name="check-circle" />
                          {{ t('panel.playlist.aceptar') }}
                        </button>
                      }
                      @if (c.status !== 'discarded' && c.status !== 'vetoed') {
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="poner(c, 'discarded')"
                        >
                          <np-icon name="x-circle" />
                          {{ t('panel.playlist.descartar') }}
                        </button>
                      }
                      @if (c.status !== 'vetoed') {
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="poner(c, 'vetoed')"
                        >
                          <np-icon name="prohibit" />
                          {{ t('panel.playlist.vetar') }}
                        </button>
                      }
                      @if (c.status !== 'pending') {
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="poner(c, 'pending')"
                        >
                          <np-icon name="clock" />
                          {{ t('panel.playlist.deshacer') }}
                        </button>
                      }
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="borrando.set(c)"
                      >
                        <np-icon name="trash" />
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          }
        }

        @if (anadiendo()) {
          <np-modal
            [open]="true"
            [heading]="t('panel.playlist.nueva')"
            (closed)="anadiendo.set(false)"
          >
            <form class="pls__form" [formGroup]="formulario" (submit)="enviar($event)">
              <label>
                {{ t('panel.playlist.campo.cancion') }}
                <input npInput formControlName="title" [attr.maxlength]="maxTitulo" />
              </label>
              <label>
                {{ t('panel.playlist.campo.artista') }}
                <input npInput formControlName="artist" [attr.maxlength]="maxArtista" />
              </label>
              <label>
                {{ t('panel.playlist.campo.estado') }}
                <select npInput formControlName="estado">
                  <option value="accepted">{{ t('panel.playlist.campo.suena') }}</option>
                  <option value="vetoed">{{ t('panel.playlist.campo.veto') }}</option>
                </select>
              </label>
              <small>{{ t('panel.playlist.campo.estadoAyuda') }}</small>
            </form>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="anadiendo.set(false)">
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
            <p>{{ t('panel.playlist.confirmarBorrado', { nombre: cual.title }) }}</p>

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
    .pls__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .pls__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .pls__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pls__botones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    @media (min-width: 48rem) {
      .pls__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .pls__filtros {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--np-space-2);
      margin-block-end: var(--np-space-3);
    }
    @media (min-width: 40rem) {
      .pls__filtros {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .pls__filtro {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: 2.75rem;
      padding: 0 var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      font-size: var(--np-text-sm);
      cursor: pointer;
    }
    .pls__filtro strong {
      margin-inline-start: auto;
    }
    .pls__filtro--activo {
      border-width: 2px;
      font-weight: var(--np-weight-semibold);
    }
    .pls__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .pls__cancion {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .pls__cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--np-space-3);
      margin: 0;
    }
    .pls__que {
      display: flex;
      flex-direction: column;
      min-inline-size: 0;
      overflow-wrap: anywhere;
    }
    .pls__que small,
    .pls__origen {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pls__votos {
      display: inline-flex;
      flex: none;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .pls__estados,
    .pls__acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pls__acciones {
      gap: var(--np-space-1);
    }
    .pls__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .pls__form label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .pls__form small {
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PanelPlaylist {
  protected readonly store = inject(PlaylistStore);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(TranslocoService);
  private readonly boda = inject(BodaStore, { optional: true });

  protected readonly filtros = FILTROS;
  protected readonly maxTitulo = MAX_TITULO;
  protected readonly maxArtista = MAX_ARTISTA;

  protected readonly filtro = signal<Filtro>('pending');
  protected readonly anadiendo = signal(false);
  protected readonly borrando = signal<CancionDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly borrandoYa = signal(false);
  protected readonly exportando = signal(false);
  protected readonly falloAlExportar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    title: ['', Validators.required],
    artist: [''],
    estado: ['accepted' as EstadoCancion],
  });

  protected readonly visibles = computed(() =>
    this.store.canciones().filter((c) => c.status === this.filtro()),
  );

  protected readonly iconoDelFiltro = computed<NpIconName>(
    () => FILTROS.find((f) => f.id === this.filtro())?.icono ?? 'music-notes',
  );

  constructor() {
    void this.store.cargar();
  }

  protected chip(estado: EstadoCancion) {
    return ESTADO_DEL_CHIP[estado];
  }

  protected async poner(cancion: CancionDelPanel, estado: EstadoCancion): Promise<void> {
    await this.store.cambiarEstado(cancion.id, estado);
  }

  protected nueva(): void {
    this.formulario.reset({ title: '', artist: '', estado: 'accepted' });
    this.anadiendo.set(true);
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    void this.guardar();
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;

    const valores = this.formulario.getRawValue();
    const title = limpiarTexto(valores.title, MAX_TITULO);
    if (title === '') return;

    this.guardando.set(true);
    const resultado = await this.store.anadir(
      title,
      limpiarTexto(valores.artist, MAX_ARTISTA),
      valores.estado,
    );
    this.guardando.set(false);

    if (resultado.ok) {
      this.anadiendo.set(false);
      // Lo que se acaba de poner se ve donde la pareja lo ha puesto.
      this.filtro.set(valores.estado);
    }
  }

  protected async borrar(): Promise<void> {
    const cual = this.borrando();
    if (!cual || this.borrandoYa()) return;

    this.borrandoYa.set(true);
    const resultado = await this.store.borrar(cual.id);
    this.borrandoYa.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  /**
   * La lista definitiva para el DJ: lo que suena, por votos, y lo que no.
   *
   * Lo pendiente no sale: «sin decidir» no es una instrucción para quien pincha.
   */
  protected async exportar(): Promise<void> {
    if (this.exportando()) return;

    this.exportando.set(true);
    this.falloAlExportar.set(false);

    const t = (clave: string) => this.i18n.translate(clave);
    const hecho = await descargarXlsx(
      hojasDePlaylist(this.store.canciones(), {
        hojaSuena: t('panel.playlist.excel.suena'),
        hojaNoPoner: t('panel.playlist.excel.noPoner'),
        puesto: t('panel.playlist.excel.puesto'),
        cancion: t('panel.playlist.excel.cancion'),
        artista: t('panel.playlist.excel.artista'),
        votos: t('panel.playlist.excel.votos'),
      }),
      nombreDelFicheroDePlaylist(this.boda?.boda()?.slug ?? '', new Date()),
    );

    this.exportando.set(false);
    this.falloAlExportar.set(!hecho);
  }

  protected textoDelFallo(fallo: FalloPlaylistPanel, t: (clave: string) => string): string {
    switch (fallo.tipo) {
      case 'sin-permiso':
      case 'red':
        return t(`panel.playlist.fallo.${fallo.tipo}`);
      default:
        return t('panel.playlist.fallo.desconocido');
    }
  }
}
