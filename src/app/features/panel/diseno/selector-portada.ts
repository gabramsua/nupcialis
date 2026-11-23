import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { crearAlmacenPortada } from '../../../core/firebase/portada.storage';
import { BodaStore } from '../boda.store';

/** Lo que aceptan las reglas de Storage. Se repite aquí para filtrar el diálogo. */
const TIPOS = 'image/jpeg,image/png,image/webp,image/heic';
const MAXIMO_BYTES = 10 * 1024 * 1024;

/**
 * La foto de portada de la web.
 *
 * Se reduce en el navegador antes de subir (`shared/imagen.ts`): la foto sale
 * del móvil con 4000 px y seis megas, y la descarga cada invitado para verla en
 * una pantalla de teléfono.
 *
 * El aviso de contraste no es decoración. Una foto clara con el texto claro de
 * la plantilla encima deja los nombres ilegibles, y eso no lo puede saber el
 * código: lo tiene que mirar la pareja. Por eso se enseña la portada montada,
 * no la foto suelta.
 */
@Component({
  selector: 'np-selector-portada',
  imports: [TranslocoDirective, NpAlert, NpButton, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="pf">
        <header class="pf__intro">
          <h2>{{ t('panel.diseno.portada.titulo') }}</h2>
          <p>{{ t('panel.diseno.portada.ayuda') }}</p>
        </header>

        @if (error(); as mensaje) {
          <np-alert status="declined" [heading]="t('panel.diseno.portada.fallo')">
            <p>{{ mensaje }}</p>
          </np-alert>
        }

        @if (url(); as foto) {
          <img class="pf__foto" [src]="foto" [alt]="t('panel.diseno.portada.alt')" />
        } @else {
          <div class="pf__hueco">
            <np-icon name="images" />
            <span>{{ t('panel.diseno.portada.sinFoto') }}</span>
          </div>
        }

        <div class="pf__acciones">
          <label class="pf__subir" [class.pf__subir--ocupado]="trabajando()">
            <np-icon name="upload-simple" />
            {{ url() ? t('panel.diseno.portada.cambiar') : t('panel.diseno.portada.subir') }}
            <input
              type="file"
              [accept]="tipos"
              [disabled]="trabajando()"
              (change)="elegir($event)"
            />
          </label>

          <label class="pf__subir" [class.pf__subir--ocupado]="trabajando()">
            <np-icon name="camera" />
            {{ t('panel.diseno.portada.hacerFoto') }}
            <input
              type="file"
              [accept]="tipos"
              capture="environment"
              data-origen="camara"
              [disabled]="trabajando()"
              (change)="elegir($event)"
            />
          </label>

          @if (url()) {
            <button
              npButton
              variant="ghost"
              type="button"
              [disabled]="trabajando()"
              (click)="quitar()"
            >
              <np-icon name="trash" />
              {{ t('panel.diseno.portada.quitar') }}
            </button>
          }
        </div>

        @if (trabajando()) {
          <p class="pf__estado">
            <np-icon name="spinner-gap" />
            {{ t('panel.diseno.portada.subiendo') }}
          </p>
        }

        <p class="pf__estado">
          <np-icon name="info" />
          {{ t('panel.diseno.portada.consejo') }}
        </p>
      </section>
    </ng-container>
  `,
  styles: `
    .pf {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .pf__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-semibold);
    }
    .pf__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .pf__foto,
    .pf__hueco {
      inline-size: 100%;
      aspect-ratio: 16 / 10;
      border-radius: var(--np-radius-lg);
      object-fit: cover;
    }
    .pf__hueco {
      display: grid;
      place-content: center;
      gap: var(--np-space-2);
      justify-items: center;
      border: 1px dashed var(--np-surface-border);
      background: var(--np-surface-raised);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pf__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    /* El input de fichero, oculto pero alcanzable con el teclado: el foco viaja
       al input y el anillo se pinta sobre la etiqueta. */
    .pf__subir {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
      cursor: pointer;
    }
    .pf__subir--ocupado {
      opacity: 0.6;
      cursor: default;
    }
    .pf__subir:focus-within {
      outline: 2px solid var(--np-surface-text);
      outline-offset: 2px;
    }
    .pf__subir input {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      opacity: 0;
    }
    .pf__estado {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
  `,
})
export class SelectorPortada {
  protected readonly store = inject(BodaStore);
  private readonly almacen = crearAlmacenPortada();

  protected readonly tipos = TIPOS;
  protected readonly trabajando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly url = computed(() => this.store.boda()?.heroImageUrl ?? null);

  protected async elegir(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const fichero = entrada.files?.[0];
    // El diálogo se limpia siempre: si no, elegir dos veces la misma foto no
    // dispara el evento y parece que el botón se ha roto.
    entrada.value = '';
    if (!fichero) return;

    if (fichero.size > MAXIMO_BYTES) {
      this.error.set('panel.diseno.portada.demasiadoGrande');
      return;
    }

    const boda = this.store.boda();
    if (!boda) return;

    this.error.set(null);
    this.trabajando.set(true);

    try {
      const anterior = boda.heroImagePath;
      const subida = await this.almacen.subir(boda.weddingId, fichero);
      const ok = await this.store.guardarPortada(subida.path, subida.url);

      // El fichero viejo se borra **después** de que el documento apunte al
      // nuevo. Al revés, un fallo entre medias deja la web sin portada.
      if (ok && anterior) await this.almacen.borrar(anterior);
      if (!ok) this.error.set(this.store.error());
    } catch (fallo) {
      this.error.set(fallo instanceof Error ? fallo.message : String(fallo));
    } finally {
      this.trabajando.set(false);
    }
  }

  protected async quitar(): Promise<void> {
    const boda = this.store.boda();
    if (!boda) return;

    this.trabajando.set(true);
    const path = boda.heroImagePath;
    const ok = await this.store.guardarPortada(null, null);
    if (ok && path) await this.almacen.borrar(path);
    this.trabajando.set(false);
    if (!ok) this.error.set(this.store.error());
  }
}
