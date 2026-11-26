import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  CLAVES_HISTORIA,
  FOTOS_POR_APARTADO,
  MAX_TEXTO_HISTORIA,
  type ClaveHistoria,
} from '../../public-site/historia/historia';
import { NpEditorRico } from '../web/editor-rico';
import { HistoriaStore } from './historia.store';

/** Lo que aceptan las reglas de Storage. Se repite aquí para filtrar el diálogo. */
const TIPOS = 'image/jpeg,image/png,image/webp,image/heic';
const MAXIMO_BYTES = 10 * 1024 * 1024;

/**
 * «Nuestra historia»: cinco apartados fijos, cada uno con su texto (el mismo
 * editor que el resto de la web) y hasta dos fotos que se pintan debajo.
 *
 * Los textos se guardan todos de una vez con los dos botones (arriba y abajo);
 * las fotos se suben y se quitan al momento, cada una por su cuenta.
 */
@Component({
  selector: 'np-panel-historia',
  imports: [TranslocoDirective, NpAlert, NpButton, NpEmptyState, NpIcon, NpEditorRico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="hi">
        <header class="hi__intro">
          <h2>{{ t('panel.historia.titulo') }}</h2>
          <p>{{ t('panel.historia.ayuda') }}</p>
        </header>

        @if (store.fallo(); as f) {
          <np-alert status="declined" [heading]="t('panel.historia.fallo')">
            <p>{{ t('panel.historia.fallos.' + f.tipo) }}</p>
          </np-alert>
        }

        @if (errorFoto(); as e) {
          <np-alert status="attention" [heading]="t('panel.historia.fallo')">
            <p>{{ t(e) }}</p>
          </np-alert>
        }

        <div class="hi__guardar" data-barra="arriba">
          <button
            npButton
            type="button"
            data-accion="guardar"
            [loading]="guardando()"
            [disabled]="!hayCambios()"
            (click)="guardarTodo()"
          >
            <np-icon name="check" />
            {{ t('panel.historia.guardarTodo') }}
          </button>
          @if (hayCambios()) {
            <small>{{ t('panel.historia.sinGuardar') }}</small>
          } @else if (guardadoOk()) {
            <small class="hi__hecho" role="status">
              <np-icon name="check-circle" weight="fill" />
              {{ t('common.saved') }}
            </small>
          }
        </div>

        @if (store.estado() === 'cargando') {
          <np-empty-state icon="clock-countdown" [title]="t('panel.historia.cargando')" />
        } @else {
          @for (clave of claves; track clave) {
            <article class="hi__apartado" [attr.data-apartado]="clave">
              <h3>{{ t('panel.historia.apartado.' + clave) }}</h3>
              <p class="hi__sugerencia">{{ t('panel.historia.sugerencia.' + clave) }}</p>

              @defer (on viewport) {
                <np-editor-rico
                  [valor]="valor(clave)"
                  [maximo]="maximoTexto"
                  (cambia)="editar(clave, $event)"
                />
              } @placeholder {
                <p class="hi__cargando">{{ t('panel.secciones.cargandoEditor') }}</p>
              }

              <h4>
                {{
                  t('panel.historia.fotos', {
                    n: store.apartado(clave).fotos.length,
                    max: maxFotos,
                  })
                }}
              </h4>
              <ul class="hi__fotos">
                @for (foto of store.apartado(clave).fotos; track foto.url) {
                  <li class="hi__foto">
                    <img
                      [src]="foto.url"
                      [alt]="
                        t('panel.historia.fotoDe', {
                          apartado: t('panel.historia.apartado.' + clave),
                        })
                      "
                    />
                    <button
                      npButton
                      variant="ghost"
                      type="button"
                      data-accion="quitar-foto"
                      [disabled]="store.ocupado(clave)"
                      (click)="quitar(clave, foto.url)"
                    >
                      <np-icon name="trash" />
                      {{ t('panel.historia.quitarFoto') }}
                    </button>
                  </li>
                }
                @if (store.apartado(clave).fotos.length < maxFotos) {
                  <li>
                    <label class="hi__subir" [class.hi__subir--ocupado]="store.ocupado(clave)">
                      <np-icon name="upload-simple" />
                      {{ t('panel.historia.subirFoto') }}
                      <input
                        type="file"
                        [accept]="tipos"
                        [disabled]="store.ocupado(clave)"
                        (change)="elegir(clave, $event)"
                      />
                    </label>
                  </li>
                  <li>
                    <label class="hi__subir" [class.hi__subir--ocupado]="store.ocupado(clave)">
                      <np-icon name="camera" />
                      {{ t('panel.historia.hacerFoto') }}
                      <input
                        type="file"
                        [accept]="tipos"
                        capture="environment"
                        data-origen="camara"
                        [disabled]="store.ocupado(clave)"
                        (change)="elegir(clave, $event)"
                      />
                    </label>
                  </li>
                }
              </ul>
            </article>
          }
          <div class="hi__guardar" data-barra="abajo">
            <button
              npButton
              type="button"
              data-accion="guardar"
              [loading]="guardando()"
              [disabled]="!hayCambios()"
              (click)="guardarTodo()"
            >
              <np-icon name="check" />
              {{ t('panel.historia.guardarTodo') }}
            </button>
            @if (hayCambios()) {
              <small>{{ t('panel.historia.sinGuardar') }}</small>
            } @else if (guardadoOk()) {
              <small class="hi__hecho" role="status">
                <np-icon name="check-circle" weight="fill" />
                {{ t('common.saved') }}
              </small>
            }
          </div>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .hi__hecho {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-status-confirmed-text);
    }
    .hi {
      display: grid;
      gap: var(--np-space-4);
    }
    .hi__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-semibold);
    }
    .hi__intro p,
    .hi__sugerencia {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .hi__apartado {
      display: grid;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .hi__apartado h3,
    .hi__apartado h4 {
      margin: 0;
      font-weight: var(--np-weight-semibold);
    }
    .hi__apartado h4 {
      font-size: var(--np-text-sm);
    }
    .hi__guardar {
      display: flex;
      align-items: center;
      gap: var(--np-space-3);
    }
    .hi__fotos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .hi__foto {
      display: grid;
      gap: var(--np-space-1);
      inline-size: 10rem;
    }
    .hi__foto img {
      inline-size: 100%;
      block-size: auto;
      max-block-size: 14rem;
      border-radius: var(--np-radius-md);
      object-fit: contain;
      background: var(--np-surface-bg, transparent);
    }
    .hi__subir {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-4);
      border: 1px dashed var(--np-surface-border);
      border-radius: var(--np-radius-md);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
      cursor: pointer;
    }
    .hi__subir--ocupado {
      opacity: 0.6;
      cursor: default;
    }
    .hi__subir:focus-within {
      outline: 2px solid var(--np-surface-text);
      outline-offset: 2px;
    }
    .hi__subir input {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      opacity: 0;
    }
  `,
})
export class PanelHistoria {
  protected readonly store = inject(HistoriaStore);

  protected readonly claves = CLAVES_HISTORIA;
  protected readonly maximoTexto = MAX_TEXTO_HISTORIA;
  protected readonly maxFotos = FOTOS_POR_APARTADO;
  protected readonly tipos = TIPOS;

  /** Lo escrito y aún sin guardar, por apartado. */
  private readonly borradores = signal<Readonly<Partial<Record<ClaveHistoria, string>>>>({});
  protected readonly errorFoto = signal<string | null>(null);

  constructor() {
    void this.store.cargar();
  }

  protected valor(clave: ClaveHistoria): string {
    return this.borradores()[clave] ?? this.store.apartado(clave).html;
  }

  protected sinGuardar(clave: ClaveHistoria): boolean {
    const borrador = this.borradores()[clave];
    return borrador !== undefined && borrador !== this.store.apartado(clave).html;
  }

  protected editar(clave: ClaveHistoria, html: string): void {
    this.borradores.update((b) => ({ ...b, [clave]: html }));
  }

  protected readonly hayCambios = computed(() => this.claves.some((c) => this.sinGuardar(c)));
  protected readonly guardando = signal(false);
  protected readonly guardadoOk = signal(false);

  /** Guarda de una vez todos los apartados con texto sin guardar. */
  protected async guardarTodo(): Promise<void> {
    this.guardando.set(true);
    this.guardadoOk.set(false);
    let todoBien = true;
    try {
      for (const clave of this.claves) {
        if (!this.sinGuardar(clave)) continue;
        const borrador = this.borradores()[clave];
        if (borrador === undefined) continue;
        const ok = await this.store.guardarTexto(clave, borrador);
        if (ok) {
          this.borradores.update((b) => {
            const resto = { ...b };
            delete resto[clave];
            return resto;
          });
        } else {
          todoBien = false;
        }
      }
    } finally {
      this.guardando.set(false);
      this.guardadoOk.set(todoBien);
    }
  }

  protected async elegir(clave: ClaveHistoria, evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const fichero = entrada.files?.[0];
    // El diálogo se limpia siempre: si no, elegir dos veces la misma foto no
    // dispara el evento y parece que el botón se ha roto.
    entrada.value = '';
    if (!fichero) return;

    if (fichero.size > MAXIMO_BYTES) {
      this.errorFoto.set('panel.historia.demasiadoGrande');
      return;
    }

    this.errorFoto.set(null);
    await this.store.anadirFoto(clave, fichero);
  }

  protected async quitar(clave: ClaveHistoria, url: string): Promise<void> {
    this.errorFoto.set(null);
    await this.store.quitarFoto(clave, url);
  }
}
