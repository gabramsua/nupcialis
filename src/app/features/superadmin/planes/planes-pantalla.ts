import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_LLAMADAS } from '../../../core/llamadas/llamadas-gateway';
import type { FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { NpModal } from '../../../design-system/components/modal/modal';
import { textoDeFalloSuperadmin } from '../texto-de-fallo';
import { leerGuardado, leerPlanes, type ModuloAfectado, type PlanEditable } from './planes';

type Carga = 'cargando' | 'lista' | 'error';

/** Sin la web pública no hay boda: es el único módulo que no se puede quitar. */
const OBLIGATORIO = 'publicSite';

/**
 * Planes y módulos (D-53): qué módulos trae cada plan.
 *
 * Lo que se marca aquí se aplica a **todas las bodas de ese plan**. Añadir un
 * módulo es inmediato. Quitarlo pide confirmación con cuántas bodas lo usan, y
 * solo lo **desactiva**: los datos de la pareja se quedan donde estaban.
 */
@Component({
  selector: 'np-planes',
  imports: [TranslocoDirective, NpAlert, NpButton, NpModal, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="pl__cabecera">
        <h1>{{ t('superadmin.planes.titulo') }}</h1>
        <p>{{ t('superadmin.planes.ayuda') }}</p>
      </header>

      <main class="pl__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <p>{{ t('superadmin.planes.cargando') }}</p>
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.planes.error')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
            </np-alert>
          }
          @default {
            @if (resultado(); as r) {
              <np-alert status="confirmed" [heading]="t('superadmin.planes.aplicado')">
                <p>{{ t('superadmin.planes.aplicadoTexto', { n: r }) }}</p>
              </np-alert>
            }
            @if (fallo(); as f) {
              <np-alert status="declined" [heading]="t('superadmin.planes.error')">
                <p>{{ textoDeFallo(f, t) }}</p>
              </np-alert>
            }

            @for (plan of planes(); track plan.id) {
              <section class="pl__plan" [attr.aria-labelledby]="'plan-' + plan.id">
                <div class="pl__plan-cab">
                  <h2 [id]="'plan-' + plan.id">{{ t('superadmin.planes.nombre.' + plan.id) }}</h2>
                  <span class="pl__bodas">{{
                    t('superadmin.planes.bodas', { n: plan.bodas })
                  }}</span>
                </div>
                <ul class="pl__modulos">
                  @for (m of catalogo(); track m) {
                    <li>
                      <label>
                        <input
                          type="checkbox"
                          [checked]="marcado(plan, m)"
                          [disabled]="m === obligatorio"
                          (change)="alternar(plan.id, m)"
                        />
                        <span>{{ t('panel.modulo.' + m) }}</span>
                        @if (m === obligatorio) {
                          <small>{{ t('superadmin.planes.obligatorio') }}</small>
                        }
                      </label>
                    </li>
                  }
                </ul>
                <div>
                  <button
                    npButton
                    type="button"
                    [disabled]="!cambiado(plan)"
                    [loading]="guardando() === plan.id"
                    (click)="guardar(plan.id, false)"
                  >
                    <np-icon name="check" />
                    {{ t('superadmin.planes.guardar') }}
                  </button>
                </div>
              </section>
            }
          }
        }
      </main>

      @if (pendiente(); as p) {
        <np-modal
          [open]="true"
          [heading]="t('superadmin.planes.confirmarTitulo')"
          (closed)="pendiente.set(null)"
        >
          <p>{{ t('superadmin.planes.confirmarTexto') }}</p>
          <ul class="pl__afectadas">
            @for (a of p.afectadas; track a.modulo) {
              <li>
                {{
                  t('superadmin.planes.afectada', {
                    modulo: t('panel.modulo.' + a.modulo),
                    n: a.bodas,
                  })
                }}
              </li>
            }
          </ul>
          <p class="pl__nota">{{ t('superadmin.planes.confirmarNota') }}</p>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="pendiente.set(null)">
              {{ t('common.cancel') }}
            </button>
            <button npButton type="button" (click)="guardar(p.plan, true)">
              {{ t('superadmin.planes.confirmar') }}
            </button>
          </div>
        </np-modal>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      min-block-size: 100dvh;
      background: var(--np-surface-canvas);
    }
    .pl__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .pl__cabecera h1,
    .pl__cabecera p,
    h2 {
      margin: 0;
    }
    .pl__cabecera p,
    .pl__bodas,
    .pl__nota,
    small {
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .pl__cuerpo {
      display: grid;
      gap: var(--np-space-4);
      padding: var(--np-space-4);
      max-inline-size: 60rem;
    }
    .pl__plan {
      display: grid;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .pl__plan-cab {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    .pl__modulos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      gap: var(--np-space-1) var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .pl__modulos label {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
    }
    .pl__afectadas {
      margin: 0;
      padding-inline-start: var(--np-space-4);
    }
  `,
})
export class PantallaPlanes {
  private readonly puerta = inject(PUERTA_LLAMADAS);

  protected readonly obligatorio = OBLIGATORIO;
  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly planes = signal<readonly PlanEditable[]>([]);
  protected readonly catalogo = signal<readonly string[]>([]);
  protected readonly guardando = signal<string | null>(null);
  protected readonly resultado = signal<number | null>(null);
  protected readonly pendiente = signal<{
    readonly plan: PlanEditable['id'];
    readonly afectadas: readonly ModuloAfectado[];
  } | null>(null);

  /** Lo marcado ahora mismo, por plan; distinto de `planes()` hasta que se guarda. */
  private readonly marcas = signal<Readonly<Record<string, readonly string[]>>>({});

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const r = await this.puerta.llamar('listPlans', {}, leerPlanes);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      this.carga.set('error');
      return;
    }
    this.fallo.set(null);
    this.planes.set(r.datos.planes);
    this.catalogo.set(r.datos.catalogo);
    this.marcas.set(Object.fromEntries(r.datos.planes.map((p) => [p.id, p.modulos])));
    this.carga.set('lista');
  }

  protected marcado(plan: PlanEditable, modulo: string): boolean {
    return (this.marcas()[plan.id] ?? plan.modulos).includes(modulo);
  }

  protected cambiado(plan: PlanEditable): boolean {
    const actuales = this.marcas()[plan.id] ?? plan.modulos;
    return (
      actuales.length !== plan.modulos.length || actuales.some((m) => !plan.modulos.includes(m))
    );
  }

  protected alternar(plan: PlanEditable['id'], modulo: string): void {
    if (modulo === OBLIGATORIO) return;
    const actuales = this.marcas()[plan] ?? [];
    const nuevas = actuales.includes(modulo)
      ? actuales.filter((m) => m !== modulo)
      : [...actuales, modulo];
    this.marcas.update((m) => ({ ...m, [plan]: nuevas }));
    this.resultado.set(null);
  }

  protected async guardar(plan: PlanEditable['id'], confirmar: boolean): Promise<void> {
    this.guardando.set(plan);
    this.fallo.set(null);
    this.resultado.set(null);
    const r = await this.puerta.llamar(
      'savePlanModules',
      { plan, modules: this.marcas()[plan] ?? [], confirmar },
      leerGuardado,
    );
    this.guardando.set(null);
    this.pendiente.set(null);

    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    if (!r.datos.aplicado) {
      // Quitar un módulo que alguien usa: se pregunta antes de tocar nada.
      this.pendiente.set({ plan, afectadas: r.datos.afectadas });
      return;
    }
    this.resultado.set(r.datos.bodasActualizadas);
    await this.recargarSinParpadeo();
  }

  /** Vuelve a leer sin pasar por «cargando», para no perder el sitio en la página. */
  private async recargarSinParpadeo(): Promise<void> {
    const r = await this.puerta.llamar('listPlans', {}, leerPlanes);
    if (!r.ok) return;
    this.planes.set(r.datos.planes);
    this.marcas.set(Object.fromEntries(r.datos.planes.map((p) => [p.id, p.modulos])));
  }

  protected textoDeFallo = textoDeFalloSuperadmin;
}
