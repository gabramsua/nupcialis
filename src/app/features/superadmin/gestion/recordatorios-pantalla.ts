import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_GESTION, type FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { fechaMedia } from '../../../shared/fecha';
import { diaAFecha, type Recordatorio, type SituacionRecordatorio } from './gestion';

type Carga = 'cargando' | 'lista' | 'error';

const GRUPOS: readonly SituacionRecordatorio[] = ['vencido', 'proximo', 'enviado'];

const ESTADO_DE: Record<SituacionRecordatorio, 'declined' | 'pending' | 'confirmed'> = {
  vencido: 'declined',
  proximo: 'pending',
  enviado: 'confirmed',
};

/**
 * Los avisos de después de la boda (S1.3f, S1.3g).
 *
 * **No envía nada.** No hay proveedor de correo (REQUISITOS §11.5): lo que hace
 * esta pantalla es decir *qué toca y a quién*, dar el texto listo para copiar y
 * recordar qué se ha mandado ya. El envío lo hace Gabriel, por WhatsApp o desde
 * su correo, y marca el aviso. El día que haya proveedor, el texto y el estado
 * ya están; solo cambia quién aprieta el botón.
 */
@Component({
  selector: 'np-recordatorios',
  imports: [RouterLink, TranslocoDirective, NpAlert, NpButton, NpEmptyState, NpIcon, NpStatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="re__cabecera">
        <a class="re__volver" routerLink="/superadmin">
          <np-icon name="arrow-left" />
          {{ t('superadmin.ficha.volver') }}
        </a>
        <h1>{{ t('superadmin.recordatorios.titulo') }}</h1>
        <p class="re__intro">{{ t('superadmin.recordatorios.intro') }}</p>
      </header>

      <main class="re__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state
              icon="clock-countdown"
              [title]="t('superadmin.recordatorios.cargando')"
            />
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.recordatorios.errorCarga')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
              <button npButton size="sm" type="button" (click)="cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            @if (todos().length === 0) {
              <np-empty-state
                icon="bell"
                [title]="t('superadmin.recordatorios.ninguno')"
                [description]="t('superadmin.recordatorios.ningunoDescripcion')"
              />
            }
            @if (errorMarca()) {
              <np-alert status="declined" [heading]="t('superadmin.recordatorios.errorMarca')" />
            }
            @for (g of grupos; track g) {
              @if (porSituacion()[g].length > 0) {
                <section class="re__grupo" [attr.aria-labelledby]="'re-' + g">
                  <h2 [id]="'re-' + g">
                    {{ t('superadmin.recordatorios.grupo.' + g) }}
                    <span class="re__cuenta">{{ porSituacion()[g].length }}</span>
                  </h2>
                  <ul class="re__lista">
                    @for (r of porSituacion()[g]; track clave(r)) {
                      <li class="re__aviso" [attr.data-situacion]="r.situacion">
                        <div class="re__cab">
                          <a [routerLink]="['/superadmin/bodas', r.weddingId]">
                            {{ t('publico.pareja', r.couple) }}
                          </a>
                          <span class="re__tenue">{{ r.slug }}</span>
                          <np-status-chip
                            [status]="estadoDe(r.situacion)"
                            [label]="t('superadmin.recordatorios.situacion.' + r.situacion)"
                          />
                        </div>
                        <div class="re__que">
                          <strong>{{ t('superadmin.recordatorios.clave.' + r.key) }}</strong>
                          <span class="re__tenue">
                            {{ t('superadmin.recordatorios.destino.' + r.destino) }} ·
                            {{ t('superadmin.recordatorios.toca', { fecha: dia(r.dueOn) }) }}
                          </span>
                        </div>

                        @if (abierto().has(clave(r))) {
                          <pre class="re__texto">{{ texto(r, t) }}</pre>
                        }

                        <div class="re__acciones">
                          <button
                            npButton
                            size="sm"
                            variant="ghost"
                            type="button"
                            [attr.aria-expanded]="abierto().has(clave(r))"
                            (click)="alternar(r)"
                          >
                            <np-icon name="file-text" />
                            {{
                              abierto().has(clave(r))
                                ? t('superadmin.recordatorios.ocultarTexto')
                                : t('superadmin.recordatorios.verTexto')
                            }}
                          </button>
                          <button
                            npButton
                            size="sm"
                            variant="secondary"
                            type="button"
                            (click)="copiar(r, t)"
                          >
                            <np-icon [name]="copiado() === clave(r) ? 'check' : 'copy'" />
                            {{
                              copiado() === clave(r)
                                ? t('superadmin.ficha.copiado')
                                : t('superadmin.ficha.copiar')
                            }}
                          </button>
                          <button
                            npButton
                            size="sm"
                            type="button"
                            [variant]="r.situacion === 'enviado' ? 'ghost' : 'primary'"
                            [loading]="marcando() === clave(r)"
                            (click)="marcar(r)"
                          >
                            <np-icon
                              [name]="r.situacion === 'enviado' ? 'arrows-clockwise' : 'check'"
                            />
                            {{
                              r.situacion === 'enviado'
                                ? t('superadmin.recordatorios.desmarcar')
                                : t('superadmin.recordatorios.marcar')
                            }}
                          </button>
                        </div>
                      </li>
                    }
                  </ul>
                </section>
              }
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
    .re__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .re__cabecera h1,
    .re__intro {
      margin: 0;
    }
    .re__cabecera h1 {
      font-size: var(--np-text-xl);
    }
    .re__intro,
    .re__tenue {
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .re__volver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .re__cuerpo {
      display: grid;
      gap: var(--np-space-4);
      padding: var(--np-space-4);
      max-inline-size: 60rem;
      margin-inline: auto;
    }
    h2 {
      margin: 0;
      font-size: var(--np-text-lg);
    }
    .re__cuenta {
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
      margin-inline-start: var(--np-space-1);
    }
    .re__grupo {
      display: grid;
      gap: var(--np-space-3);
    }
    .re__lista {
      display: grid;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .re__aviso {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-inline-start-width: 4px;
      border-radius: var(--np-radius-md);
    }
    .re__aviso[data-situacion='vencido'] {
      border-inline-start-color: var(--np-declined-border);
    }
    .re__aviso[data-situacion='proximo'] {
      border-inline-start-color: var(--np-pending-border);
    }
    .re__aviso[data-situacion='enviado'] {
      border-inline-start-color: var(--np-confirmed-border);
    }
    .re__cab,
    .re__acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .re__que {
      display: grid;
      gap: var(--np-space-1);
    }
    .re__texto {
      margin: 0;
      padding: var(--np-space-3);
      background: var(--np-surface-canvas);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      font: inherit;
      font-size: var(--np-text-sm);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class PantallaRecordatorios {
  private readonly puerta = inject(PUERTA_GESTION);

  protected readonly grupos = GRUPOS;

  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly todos = signal<readonly Recordatorio[]>([]);

  protected readonly abierto = signal<ReadonlySet<string>>(new Set());
  protected readonly marcando = signal<string | null>(null);
  protected readonly errorMarca = signal(false);
  protected readonly copiado = signal<string | null>(null);

  protected readonly porSituacion = computed(() => {
    const salida: Record<SituacionRecordatorio, Recordatorio[]> = {
      vencido: [],
      proximo: [],
      enviado: [],
    };
    for (const r of this.todos()) salida[r.situacion].push(r);
    return salida;
  });

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const r = await this.puerta.recordatorios();
    if (r.ok) {
      this.todos.set(r.datos);
      this.carga.set('lista');
    } else {
      this.fallo.set(r.fallo);
      this.carga.set('error');
    }
  }

  protected clave(r: Recordatorio): string {
    return `${r.weddingId}__${r.key}`;
  }

  protected estadoDe(s: SituacionRecordatorio): 'declined' | 'pending' | 'confirmed' {
    return ESTADO_DE[s];
  }

  protected dia(dia: string): string {
    return fechaMedia(diaAFecha(dia), 'es');
  }

  protected alternar(r: Recordatorio): void {
    const clave = this.clave(r);
    const siguiente = new Set(this.abierto());
    if (!siguiente.delete(clave)) siguiente.add(clave);
    this.abierto.set(siguiente);
  }

  /** El texto listo para pegar, con los nombres y la dirección de esa boda. */
  protected texto(r: Recordatorio, t: (clave: string, params?: object) => string): string {
    return t(`superadmin.recordatorios.texto.${r.key}`, {
      pareja: t('publico.pareja', r.couple),
      slug: r.slug,
      url: `https://${r.slug}.nupcialis.com`,
    });
  }

  protected async copiar(
    r: Recordatorio,
    t: (clave: string, params?: object) => string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.texto(r, t));
      this.copiado.set(this.clave(r));
    } catch {
      // Sin permiso del portapapeles el texto sigue ahí para seleccionarlo.
      this.abierto.set(new Set([...this.abierto(), this.clave(r)]));
    }
  }

  protected async marcar(r: Recordatorio): Promise<void> {
    const clave = this.clave(r);
    const enviado = r.situacion !== 'enviado';

    this.errorMarca.set(false);
    this.marcando.set(clave);
    const res = await this.puerta.marcarRecordatorio(r.weddingId, r.key, enviado);
    this.marcando.set(null);

    if (!res.ok) {
      this.errorMarca.set(true);
      return;
    }

    // Se vuelve a leer: al desmarcar, un aviso lejano tiene que desaparecer de la
    // lista y uno vencido tiene que volver a «vencido», y eso lo decide el servidor.
    await this.cargar();
  }

  protected textoDeFallo(fallo: FalloGestion | null, t: (clave: string) => string): string {
    switch (fallo?.tipo) {
      case 'sin-permiso':
        return t('superadmin.estadisticas.falloPermiso');
      case 'sin-verificar':
        return t('superadmin.estadisticas.falloVerificar');
      case 'red':
        return t('superadmin.estadisticas.falloRed');
      case 'error':
        return fallo.mensaje;
      default:
        return t('superadmin.estadisticas.falloOtro');
    }
  }
}
