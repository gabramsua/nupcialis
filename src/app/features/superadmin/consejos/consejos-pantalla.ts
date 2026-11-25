import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_LLAMADAS } from '../../../core/llamadas/llamadas-gateway';
import type { FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { NpInput } from '../../../design-system/components/field/input';
import { textoDeFalloSuperadmin } from '../texto-de-fallo';
import { leerConsejos, leerOk, type ConsejoEditable } from './consejos';

type Carga = 'cargando' | 'lista' | 'error';

/**
 * Los consejos de cada módulo del panel (D-53).
 *
 * Cada pantalla de la pareja lleva arriba un «Consejo» desplegable con el texto
 * de aquí. Un texto vacío quita el consejo de ese módulo; «Volver al original»
 * recupera el de fábrica. Es texto plano: los saltos de línea separan párrafos.
 */
@Component({
  selector: 'np-consejos',
  imports: [FormsModule, TranslocoDirective, NpAlert, NpButton, NpInput, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="cs__cabecera">
        <h1>{{ t('superadmin.consejos.titulo') }}</h1>
        <p>{{ t('superadmin.consejos.ayuda') }}</p>
      </header>

      <main class="cs__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <p>{{ t('superadmin.consejos.cargando') }}</p>
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.consejos.error')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
            </np-alert>
          }
          @default {
            @if (fallo(); as f) {
              <np-alert status="declined" [heading]="t('superadmin.consejos.error')">
                <p>{{ textoDeFallo(f, t) }}</p>
              </np-alert>
            }
            @for (c of consejos(); track c.modulo) {
              <section class="cs__consejo">
                <label [for]="'consejo-' + c.modulo">
                  <strong>{{ t('panel.modulo.' + c.modulo) }}</strong>
                  @if (c.personalizado) {
                    <small>{{ t('superadmin.consejos.personalizado') }}</small>
                  }
                </label>
                <textarea
                  npInput
                  rows="4"
                  [id]="'consejo-' + c.modulo"
                  [name]="'consejo-' + c.modulo"
                  [maxLength]="max()"
                  [ngModel]="borrador(c.modulo)"
                  (ngModelChange)="escribir(c.modulo, $event)"
                ></textarea>
                <div class="cs__acciones">
                  <button
                    npButton
                    size="sm"
                    type="button"
                    [disabled]="borrador(c.modulo) === c.texto"
                    [loading]="ocupado() === c.modulo"
                    (click)="guardar(c)"
                  >
                    <np-icon name="check" />
                    {{ t('common.save') }}
                  </button>
                  @if (c.personalizado) {
                    <button
                      npButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      (click)="volverAlOriginal(c)"
                    >
                      {{ t('superadmin.consejos.original') }}
                    </button>
                  }
                  @if (borrador(c.modulo) === '') {
                    <small>{{ t('superadmin.consejos.sinConsejo') }}</small>
                  }
                  @if (guardado() === c.modulo && borrador(c.modulo) === c.texto) {
                    <small class="cs__hecho" role="status">
                      <np-icon name="check-circle" weight="fill" />
                      {{ t('common.saved') }}
                    </small>
                  }
                </div>
              </section>
            }
          }
        }
      </main>
    </ng-container>
  `,
  styles: `
    .cs__hecho {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-status-confirmed-text);
    }
    :host {
      display: block;
      min-block-size: 100dvh;
      background: var(--np-surface-canvas);
    }
    .cs__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .cs__cabecera h1,
    .cs__cabecera p {
      margin: 0;
    }
    .cs__cabecera p,
    small {
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .cs__cuerpo {
      display: grid;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
    }
    .cs__consejo {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .cs__consejo label {
      display: flex;
      align-items: baseline;
      gap: var(--np-space-2);
    }
    .cs__acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
  `,
})
export class PantallaConsejos {
  private readonly puerta = inject(PUERTA_LLAMADAS);

  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly consejos = signal<readonly ConsejoEditable[]>([]);
  protected readonly max = signal(800);
  protected readonly ocupado = signal<string | null>(null);
  protected readonly guardado = signal<string | null>(null);
  private readonly escritos = signal<Readonly<Record<string, string>>>({});

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    const r = await this.puerta.llamar('listTips', {}, leerConsejos);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      this.carga.set('error');
      return;
    }
    this.consejos.set(r.datos.consejos);
    this.max.set(r.datos.max);
    this.escritos.set({});
    this.carga.set('lista');
  }

  protected borrador(modulo: string): string {
    return this.escritos()[modulo] ?? this.consejos().find((c) => c.modulo === modulo)?.texto ?? '';
  }

  protected escribir(modulo: string, texto: string): void {
    this.escritos.update((e) => ({ ...e, [modulo]: texto }));
  }

  protected async guardar(c: ConsejoEditable): Promise<void> {
    this.ocupado.set(c.modulo);
    this.guardado.set(null);
    this.fallo.set(null);
    const r = await this.puerta.llamar(
      'saveTip',
      { modulo: c.modulo, texto: this.borrador(c.modulo) },
      leerOk,
    );
    this.ocupado.set(null);
    if (!r.ok) this.fallo.set(r.fallo);
    else {
      await this.cargar();
      this.guardado.set(c.modulo);
    }
  }

  protected async volverAlOriginal(c: ConsejoEditable): Promise<void> {
    this.ocupado.set(c.modulo);
    this.fallo.set(null);
    const r = await this.puerta.llamar('resetTip', { modulo: c.modulo }, leerOk);
    this.ocupado.set(null);
    if (!r.ok) this.fallo.set(r.fallo);
    else await this.cargar();
  }

  protected textoDeFallo = textoDeFalloSuperadmin;
}
