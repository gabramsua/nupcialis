import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import type { FotoPublica } from '../../../core/galeria/galeria-panel-gateway';
import { NpIcon } from '../../../design-system/icons/icon';

/**
 * Cómo ve la galería un invitado (§8.5), dentro del panel.
 *
 * Es **una maqueta con las mismas fotos**, no la página pública montada: esa
 * necesita sesión de invitado y habla con `listPhotos`. Se dibuja igual —rejilla
 * de miniaturas, visor a pantalla completa con flechas— pero **sin botón de
 * subir que funcione y sin borrar**: aquí se mira, no se toca. Si cambia el
 * aspecto de `galeria-publica.ts`, cambia aquí también.
 */
@Component({
  selector: 'np-galeria-previa',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <div class="gv" role="group" [attr.aria-label]="t('panel.galeria.previa.titulo')">
        <header class="gv__cabecera">
          <h3>{{ t('publico.galeria.titulo') }}</h3>
          <p>{{ t('publico.galeria.ayuda', { max: 3 }) }}</p>
        </header>

        <!-- El botón de subir sale, pero apagado: es parte de lo que se ve. -->
        <span class="gv__subir" aria-disabled="true">
          <np-icon name="camera" />
          {{ t('publico.galeria.subir') }}
        </span>

        @if (fotos().length === 0) {
          <p class="gv__vacia">{{ t('publico.galeria.ninguna') }}</p>
        } @else {
          <ul class="gv__rejilla">
            @for (foto of fotos(); track foto.id; let i = $index) {
              <li>
                <button type="button" class="gv__miniatura" (click)="abrir(i)">
                  <img
                    [src]="foto.urlMiniatura"
                    [alt]="foto.pie || t('publico.galeria.deAlguien', { quien: foto.autor })"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </li>
            }
          </ul>
          @if (hayMas()) {
            <p class="gv__mas">{{ t('panel.galeria.previa.hayMas') }}</p>
          }
        }

        @if (abierta(); as foto) {
          <div
            class="gv__visor"
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="t('publico.galeria.titulo')"
          >
            <button type="button" class="gv__cerrar" (click)="cerrar()">
              <np-icon name="x" />
              <span class="gv__oculto">{{ t('common.close') }}</span>
            </button>

            <img class="gv__grande" [src]="foto.url" [alt]="foto.pie || foto.autor" />

            <p class="gv__pie">
              <span>{{ foto.pie }}</span>
              <small>{{ t('publico.galeria.deAlguien', { quien: foto.autor }) }}</small>
            </p>

            <div class="gv__mando">
              <button type="button" [disabled]="!hayAnterior()" (click)="anterior()">
                <np-icon name="caret-left" />
                <span class="gv__oculto">{{ t('publico.galeria.anterior') }}</span>
              </button>
              <button type="button" [disabled]="!haySiguiente()" (click)="siguiente()">
                <np-icon name="caret-right" />
                <span class="gv__oculto">{{ t('publico.galeria.siguiente') }}</span>
              </button>
            </div>
          </div>
        }
      </div>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      --gv-acento: var(--np-marca-accent, #e54d69);
    }
    .gv {
      padding: 1rem;
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-bg, #fff);
    }
    .gv__cabecera h3 {
      margin: 0 0 0.25rem;
      font-size: 1.4rem;
    }
    .gv__cabecera p {
      margin: 0 0 1rem;
      opacity: 0.8;
    }
    .gv__subir {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-block-size: 3.25rem;
      margin-block-end: 1rem;
      border-radius: 999px;
      background: var(--gv-acento);
      color: #fff;
      font-weight: 600;
      opacity: 0.6;
    }
    .gv__vacia,
    .gv__mas {
      margin: 1.5rem 0 0;
      opacity: 0.75;
      text-align: center;
    }
    .gv__rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .gv__miniatura {
      display: block;
      inline-size: 100%;
      padding: 0;
      border: 0;
      border-radius: 0.75rem;
      background: none;
      cursor: pointer;
      overflow: hidden;
      aspect-ratio: 1;
    }
    .gv__miniatura img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
    .gv__visor {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: #000;
      color: #fff;
    }
    .gv__grande {
      flex: 1;
      inline-size: 100%;
      min-block-size: 0;
      object-fit: contain;
    }
    .gv__pie {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      margin: 0;
      text-align: center;
    }
    .gv__pie small {
      opacity: 0.7;
    }
    .gv__cerrar {
      align-self: flex-end;
    }
    .gv__mando {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .gv__visor button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-inline-size: 3rem;
      min-block-size: 3rem;
      border: 0;
      border-radius: 999px;
      background: rgb(255 255 255 / 15%);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .gv__visor button:disabled {
      opacity: 0.35;
    }
    .gv__oculto {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      clip-path: inset(50%);
      overflow: hidden;
    }
  `,
})
export class NpGaleriaPrevia {
  /** Las fotos que ve la pareja, tal cual. */
  readonly fotos = input.required<readonly FotoPublica[]>();
  /** Si hay más páginas sin traer: la web las pide con «Ver más». */
  readonly hayMas = input(false);

  private readonly indice = signal<number | null>(null);

  protected readonly abierta = computed<FotoPublica | null>(() => {
    const n = this.indice();
    return n === null ? null : (this.fotos()[n] ?? null);
  });
  protected readonly hayAnterior = computed(() => (this.indice() ?? 0) > 0);
  protected readonly haySiguiente = computed(() => {
    const n = this.indice();
    return n !== null && n < this.fotos().length - 1;
  });

  private readonly alPulsarTecla = (evento: KeyboardEvent) => {
    if (this.indice() === null) return;
    if (evento.key === 'ArrowLeft') this.anterior();
    if (evento.key === 'ArrowRight') this.siguiente();
    // Escape cierra el visor, no el modal de debajo.
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      evento.preventDefault();
      this.cerrar();
    }
  };

  constructor() {
    document.addEventListener('keydown', this.alPulsarTecla, true);
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('keydown', this.alPulsarTecla, true),
    );
  }

  protected abrir(n: number): void {
    this.indice.set(n);
  }

  protected cerrar(): void {
    this.indice.set(null);
  }

  protected anterior(): void {
    if (this.hayAnterior()) this.indice.update((n) => (n ?? 0) - 1);
  }

  protected siguiente(): void {
    if (this.haySiguiente()) this.indice.update((n) => (n ?? 0) + 1);
  }
}
