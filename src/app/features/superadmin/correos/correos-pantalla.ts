import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_LLAMADAS } from '../../../core/llamadas/llamadas-gateway';
import type { FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { textoDeFalloSuperadmin } from '../texto-de-fallo';
import {
  esOk,
  leerPlantillas,
  leerVistaPrevia,
  type PlantillaEditable,
  type VistaPrevia,
} from './correos';

type Carga = 'cargando' | 'lista' | 'error';

/**
 * Los correos de Nupcialis (D-53): ver y editar el texto de cada uno.
 *
 * El correo lleva siempre el diseño de Nupcialis; aquí solo se cambian el asunto
 * y el texto. Los `{marcadores}` se rellenan al enviar. «Volver al original»
 * borra la versión guardada y vuelve a la de fábrica.
 */
@Component({
  selector: 'np-correos',
  imports: [FormsModule, TranslocoDirective, NpAlert, NpButton, NpField, NpInput, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="co__cabecera">
        <h1>{{ t('superadmin.correos.titulo') }}</h1>
        <p>{{ t('superadmin.correos.ayuda') }}</p>
      </header>

      <main class="co__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <p>{{ t('superadmin.correos.cargando') }}</p>
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.correos.error')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
            </np-alert>
          }
          @default {
            <nav class="co__lista" [attr.aria-label]="t('superadmin.correos.titulo')">
              @for (p of plantillas(); track p.id) {
                <button
                  type="button"
                  class="co__item"
                  [class.co__item--activo]="p.id === elegida()?.id"
                  [attr.aria-current]="p.id === elegida()?.id ? 'true' : null"
                  (click)="elegir(p)"
                >
                  <strong>{{ t('superadmin.correos.nombre.' + p.id) }}</strong>
                  <small>
                    {{ t('superadmin.correos.para.' + p.destinatario) }}
                    @if (p.personalizada) {
                      · {{ t('superadmin.correos.personalizada') }}
                    }
                  </small>
                </button>
              }
            </nav>

            @if (elegida(); as e) {
              <section class="co__editor">
                @if (aviso(); as a) {
                  <np-alert status="confirmed" [heading]="t('superadmin.correos.' + a)" />
                }
                @if (fallo(); as f) {
                  <np-alert status="declined" [heading]="t('superadmin.correos.error')">
                    <p>{{ textoDeFallo(f, t) }}</p>
                  </np-alert>
                }

                <np-field [label]="t('superadmin.correos.asunto')">
                  <input
                    npInput
                    name="asunto"
                    [ngModel]="asunto()"
                    (ngModelChange)="cambiarAsunto($event)"
                  />
                </np-field>
                <np-field
                  [label]="t('superadmin.correos.cuerpo')"
                  [hint]="t('superadmin.correos.cuerpoPista')"
                >
                  <textarea
                    npInput
                    name="cuerpo"
                    rows="12"
                    [ngModel]="cuerpo()"
                    (ngModelChange)="cambiarCuerpo($event)"
                  ></textarea>
                </np-field>

                <p class="co__marcadores">
                  {{ t('superadmin.correos.marcadores') }}
                  @for (m of e.marcadores; track m) {
                    <code>{{ '{' + m + '}' }}</code>
                  }
                </p>
                <p class="co__marcadores">
                  {{ t('superadmin.correos.boton', { texto: e.boton }) }}
                </p>

                <div class="co__acciones">
                  <button
                    npButton
                    type="button"
                    [loading]="ocupado() === 'guardar'"
                    (click)="guardar()"
                  >
                    <np-icon name="check" />
                    {{ t('common.save') }}
                  </button>
                  <button
                    npButton
                    variant="secondary"
                    type="button"
                    [loading]="ocupado() === 'vista'"
                    (click)="vistaPrevia()"
                  >
                    {{ t('superadmin.correos.vistaPrevia') }}
                  </button>
                  @if (e.personalizada) {
                    <button
                      npButton
                      variant="ghost"
                      type="button"
                      [loading]="ocupado() === 'reset'"
                      (click)="volverAlOriginal()"
                    >
                      {{ t('superadmin.correos.original') }}
                    </button>
                  }
                </div>

                @if (vista(); as v) {
                  <div class="co__vista">
                    <p class="co__asunto">
                      <strong>{{ t('superadmin.correos.asunto') }}:</strong> {{ v.asunto }}
                    </p>
                    <iframe
                      class="co__marco"
                      sandbox=""
                      [attr.title]="t('superadmin.correos.vistaPrevia')"
                      [srcdoc]="html()"
                    ></iframe>
                  </div>
                }
              </section>
            }
          }
        }
      </main>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      min-block-size: 100dvh;
      background: var(--np-surface-canvas);
    }
    .co__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .co__cabecera h1,
    .co__cabecera p {
      margin: 0;
    }
    .co__cabecera p,
    small,
    .co__marcadores {
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .co__cuerpo {
      display: grid;
      grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr);
      gap: var(--np-space-4);
      padding: var(--np-space-4);
      align-items: start;
    }
    @media (max-width: 48rem) {
      .co__cuerpo {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .co__lista {
      display: grid;
      gap: var(--np-space-2);
    }
    .co__item {
      display: grid;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
      font: inherit;
      text-align: start;
      color: inherit;
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      cursor: pointer;
    }
    .co__item--activo {
      border-color: var(--np-cat-rosa);
      box-shadow: inset 3px 0 0 var(--np-cat-rosa);
    }
    .co__editor {
      display: grid;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .co__marcadores {
      margin: 0;
    }
    .co__marcadores code {
      margin-inline-start: var(--np-space-1);
      padding-inline: var(--np-space-1);
      background: var(--np-surface-sunken);
      border-radius: var(--np-radius-sm);
    }
    .co__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .co__marco {
      inline-size: 100%;
      block-size: 30rem;
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: white;
    }
    .co__asunto {
      margin: 0 0 var(--np-space-2);
    }
  `,
})
export class PantallaCorreos {
  private readonly puerta = inject(PUERTA_LLAMADAS);
  private readonly sanitizador = inject(DomSanitizer);

  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly plantillas = signal<readonly PlantillaEditable[]>([]);
  protected readonly elegida = signal<PlantillaEditable | null>(null);
  protected readonly asunto = signal('');
  protected readonly cuerpo = signal('');
  protected readonly ocupado = signal<'guardar' | 'vista' | 'reset' | null>(null);
  protected readonly aviso = signal<'guardado' | 'restaurado' | null>(null);
  protected readonly vista = signal<VistaPrevia | null>(null);
  protected readonly html = signal<SafeHtml>('');

  constructor() {
    void this.cargar();
  }

  protected async cargar(elegirId?: string): Promise<void> {
    const r = await this.puerta.llamar('listEmailTemplates', {}, leerPlantillas);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      this.carga.set('error');
      return;
    }
    this.plantillas.set(r.datos);
    const id = elegirId ?? this.elegida()?.id;
    this.elegir(r.datos.find((p) => p.id === id) ?? r.datos[0] ?? null, false);
    this.carga.set('lista');
  }

  protected elegir(p: PlantillaEditable | null, limpiar = true): void {
    this.elegida.set(p);
    this.asunto.set(p?.asunto ?? '');
    this.cuerpo.set(p?.cuerpo ?? '');
    this.vista.set(null);
    if (limpiar) {
      this.aviso.set(null);
      this.fallo.set(null);
    }
  }

  protected cambiarAsunto(valor: string): void {
    this.asunto.set(valor);
  }

  protected cambiarCuerpo(valor: string): void {
    this.cuerpo.set(valor);
  }

  private borrador() {
    return { asunto: this.asunto(), cuerpo: this.cuerpo() };
  }

  protected async guardar(): Promise<void> {
    const e = this.elegida();
    if (!e) return;
    this.ocupado.set('guardar');
    this.fallo.set(null);
    const r = await this.puerta.llamar(
      'saveEmailTemplate',
      { id: e.id, plantilla: this.borrador() },
      esOk,
    );
    this.ocupado.set(null);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    await this.cargar(e.id);
    this.aviso.set('guardado');
  }

  protected async volverAlOriginal(): Promise<void> {
    const e = this.elegida();
    if (!e) return;
    this.ocupado.set('reset');
    this.fallo.set(null);
    const r = await this.puerta.llamar('resetEmailTemplate', { id: e.id }, esOk);
    this.ocupado.set(null);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    await this.cargar(e.id);
    this.aviso.set('restaurado');
  }

  protected async vistaPrevia(): Promise<void> {
    const e = this.elegida();
    if (!e) return;
    this.ocupado.set('vista');
    this.fallo.set(null);
    const r = await this.puerta.llamar(
      'previewEmail',
      { id: e.id, plantilla: this.borrador() },
      leerVistaPrevia,
    );
    this.ocupado.set(null);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    this.vista.set(r.datos);
    // El HTML lo monta nuestro servidor con todo lo escrito escapado, y el marco
    // va con `sandbox=""`: sin scripts ni nada que salga de él.
    this.html.set(this.sanitizador.bypassSecurityTrustHtml(r.datos.html));
  }

  protected textoDeFallo = textoDeFalloSuperadmin;
}
