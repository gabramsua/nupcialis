import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpField } from '../../../design-system/components/field/field';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import type { FalloGaleria, FotoPublica } from '../../../core/galeria/galeria-panel-gateway';
import { ALBUMES, type AlbumFoto } from '../../public-site/galeria/galeria';
import { NpGaleriaPrevia } from './galeria-previa';
import { GaleriaPanelStore } from './galeria.store';
import { NpInput } from '../../../design-system/components/field/input';

/** Lo que hay que escribir para vaciar la galería. En mayúsculas, como sale. */
const PALABRA_VACIAR = 'VACIAR';

/**
 * La galería vista por la pareja (§8.5).
 *
 * Es una pantalla de **moderación a posteriori**: la foto se publica y aquí se
 * quita si hace falta. La cola de aprobación está apuntada (`F3.1b`) y no es
 * esto; mientras no exista, lo que la pareja necesita es ver lo que hay colgado
 * en su web y poder quitarlo en dos toques.
 *
 * Por eso cada foto lleva **el nombre de quien la subió debajo**, cosa que en
 * la web pública no se destaca: aquí es el dato que convierte «esta foto sobra»
 * en «hablo con mi primo».
 */
@Component({
  selector: 'np-panel-galeria',
  imports: [
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpField,
    NpGaleriaPrevia,
    NpModal,
    NpIcon,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="pg">
        <header class="pg__intro">
          <h2>{{ t('panel.galeria.titulo') }}</h2>
          <p>{{ t('panel.galeria.ayuda') }}</p>
        </header>

        <!-- Ver y subir fotos exige identificarse, también con la web abierta (D-56). -->
        <np-alert status="attention" [heading]="t('panel.galeria.identidadTitulo')">
          <p>{{ t('panel.galeria.identidadTexto') }}</p>
          <a routerLink="/panel/guests">{{ t('panel.galeria.identidadLista') }}</a>
        </np-alert>

        <div class="pg__albumes" role="tablist" [attr.aria-label]="t('panel.galeria.albumes')">
          @for (a of albumes; track a) {
            <button
              type="button"
              role="tab"
              [attr.data-album]="a"
              [attr.aria-selected]="store.album() === a"
              (click)="elegirAlbum(a)"
            >
              {{ t('publico.galeria.album.' + a) }}
            </button>
          }
        </div>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.galeria.error')">
            <p>{{ t('publico.galeria.fallo.' + fallo.tipo) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="images" [title]="t('panel.galeria.cargando')" />
          }
          @default {
            @if (store.cuantas() === 0) {
              <np-empty-state
                icon="images"
                [title]="t('panel.galeria.ninguna')"
                [description]="t('panel.galeria.ningunaDescripcion')"
              />
            } @else {
              <p class="pg__resumen">
                {{ t(claveResumen(), { n: store.cuantas() }) }}
              </p>

              <p class="pg__previa">
                <button npButton variant="secondary" type="button" (click)="previa.set(true)">
                  <np-icon name="eye" />
                  {{ t('panel.galeria.previa.boton') }}
                </button>
              </p>

              <ul class="pg__rejilla">
                @for (foto of store.fotos(); track foto.id) {
                  <li class="pg__celda">
                    <img
                      class="pg__foto"
                      [src]="foto.urlMiniatura"
                      [alt]="t('publico.galeria.deAlguien', { quien: foto.autor })"
                      loading="lazy"
                      decoding="async"
                    />

                    <div class="pg__pie">
                      <strong>{{ foto.autor || t('panel.galeria.sinAutor') }}</strong>
                      @if (foto.pie) {
                        <small>{{ foto.pie }}</small>
                      }
                    </div>

                    <button
                      class="pg__borrar"
                      type="button"
                      [attr.aria-label]="t('panel.galeria.borrarEsta')"
                      [disabled]="borrando() === foto.id"
                      (click)="pedirBorrado(foto)"
                    >
                      <np-icon name="trash" />
                    </button>
                  </li>
                }
              </ul>

              @if (store.hayMas()) {
                <button
                  npButton
                  variant="ghost"
                  type="button"
                  [loading]="store.trayendoMas()"
                  (click)="traerMas()"
                >
                  {{ t('panel.galeria.verMas') }}
                </button>
              }

              <!--
                Vaciar va al final y no en la cabecera: es lo más destructivo
                de la pantalla, y lo más destructivo no se pone donde cae el
                pulgar al abrir.
              -->
              <p class="pg__vaciar">
                <button npButton variant="ghost" type="button" (click)="abrirVaciado()">
                  <np-icon name="trash" />
                  {{ t('panel.galeria.vaciar') }}
                </button>
              </p>
            }
          }
        }

        @if (previa()) {
          <np-modal
            [open]="true"
            [heading]="t('panel.galeria.previa.titulo')"
            (closed)="previa.set(false)"
          >
            <p class="pg__previaAyuda">{{ t('panel.galeria.previa.ayuda') }}</p>
            <np-galeria-previa [fotos]="store.fotos()" [hayMas]="store.hayMas()" />

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="previa.set(false)">
                {{ t('common.close') }}
              </button>
            </div>
          </np-modal>
        }

        @if (aBorrar(); as foto) {
          <np-modal
            [open]="true"
            [heading]="t('panel.galeria.borrarEsta')"
            (closed)="aBorrar.set(null)"
          >
            <p>{{ t('panel.galeria.confirmarBorrado', { quien: foto.autor }) }}</p>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="aBorrar.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                variant="danger"
                type="button"
                [loading]="borrando() === foto.id"
                (click)="borrar(foto)"
              >
                <np-icon name="trash" />
                {{ t('panel.galeria.borrar') }}
              </button>
            </div>
          </np-modal>
        }

        @if (vaciando()) {
          <np-modal
            [open]="true"
            [heading]="t('panel.galeria.vaciar')"
            (closed)="vaciando.set(false)"
          >
            <np-alert status="attention">
              <p>{{ t('panel.galeria.confirmarVaciado', { n: store.cuantas() }) }}</p>
            </np-alert>

            <!--
              Se escribe la palabra, no se pulsa un botón rojo y ya. Son las
              fotos de la boda de todos sus invitados y no hay papelera: un
              toque de más en un móvil no puede bastar.
            -->
            <np-field [label]="t('panel.galeria.escribePalabra', { palabra: palabra })" #campo>
              <input
                npInput
                type="text"
                autocomplete="off"
                spellcheck="false"
                [id]="campo.id()"
                [value]="escrito()"
                (input)="escribir($event)"
              />
            </np-field>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="vaciando.set(false)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                variant="danger"
                type="button"
                [disabled]="!puedeVaciar()"
                [loading]="vaciandoYa()"
                (click)="vaciar()"
              >
                <np-icon name="trash" />
                {{ t('panel.galeria.vaciar') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .pg__intro {
      margin-block-end: var(--np-space-4);
    }
    .pg__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .pg__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pg__previa {
      margin: var(--np-space-3) 0;
    }
    .pg__previaAyuda {
      margin: 0 0 var(--np-space-3);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pg__vaciar {
      display: flex;
      margin: var(--np-space-4) 0 0;
    }
    .pg__albumes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--np-space-2);
      margin-block-end: var(--np-space-3);
    }
    .pg__albumes button {
      min-block-size: 2.75rem;
      padding-inline: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .pg__albumes button[aria-selected='true'] {
      border-width: 2px;
      font-weight: var(--np-weight-semibold);
    }
    .pg__resumen {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pg__rejilla {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--np-space-2);
      margin: var(--np-space-3) 0;
      padding: 0;
      list-style: none;
    }
    @media (min-width: 40rem) {
      .pg__rejilla {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (min-width: 64rem) {
      .pg__rejilla {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .pg__celda {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .pg__foto {
      display: block;
      inline-size: 100%;
      aspect-ratio: 1;
      object-fit: cover;
    }
    .pg__pie {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--np-space-2);
      font-size: var(--np-text-xs);
    }
    .pg__pie small {
      color: var(--np-surface-text-muted);
    }
    .pg__borrar {
      position: absolute;
      inset-block-start: var(--np-space-2);
      inset-inline-end: var(--np-space-2);
      display: flex;
      align-items: center;
      justify-content: center;
      /* 44 px: lo que pide un pulgar, aunque el icono sea pequeño. */
      inline-size: 2.75rem;
      block-size: 2.75rem;
      border: 0;
      border-radius: 50%;
      background: rgb(0 0 0 / 55%);
      color: #fff;
      cursor: pointer;
    }
    .pg__borrar:disabled {
      opacity: 0.5;
    }
    np-field input {
      inline-size: 100%;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  `,
})
export class PanelGaleria {
  protected readonly store = inject(GaleriaPanelStore);

  protected readonly palabra = PALABRA_VACIAR;

  protected readonly albumes = ALBUMES;
  protected readonly aBorrar = signal<FotoPublica | null>(null);
  protected readonly borrando = signal<string | null>(null);
  protected readonly previa = signal(false);
  protected readonly vaciando = signal(false);
  protected readonly vaciandoYa = signal(false);
  protected readonly escrito = signal('');

  protected readonly puedeVaciar = computed(
    () => this.escrito().trim().toUpperCase() === PALABRA_VACIAR,
  );

  constructor() {
    void this.store.cargar();
  }

  protected elegirAlbum(album: AlbumFoto): void {
    void this.store.elegirAlbum(album);
  }

  /** «1 foto» o «24 fotos»: el plural mal puesto canta igual que en una tabla. */
  protected claveResumen(): string {
    return this.store.cuantas() === 1 ? 'panel.galeria.unaFoto' : 'panel.galeria.fotos';
  }

  protected escribir(evento: Event): void {
    this.escrito.set((evento.target as HTMLInputElement).value);
  }

  protected abrirVaciado(): void {
    this.escrito.set('');
    this.vaciando.set(true);
  }

  protected pedirBorrado(foto: FotoPublica): void {
    this.aBorrar.set(foto);
  }

  protected async traerMas(): Promise<void> {
    await this.store.traerMas();
  }

  protected async borrar(foto: FotoPublica): Promise<void> {
    if (this.borrando() !== null) return;

    this.borrando.set(foto.id);
    const ok = await this.store.borrar(foto.id);
    this.borrando.set(null);
    if (ok) this.aBorrar.set(null);
  }

  protected async vaciar(): Promise<void> {
    if (this.vaciandoYa() || !this.puedeVaciar()) return;

    this.vaciandoYa.set(true);
    const ok = await this.store.vaciar();
    this.vaciandoYa.set(false);
    if (ok) {
      this.vaciando.set(false);
      this.escrito.set('');
    }
  }

  /** Expuesto para la prueba: el fallo tal como se pinta. */
  protected claveDelFallo(fallo: FalloGaleria): string {
    return `publico.galeria.fallo.${fallo.tipo}`;
  }
}
