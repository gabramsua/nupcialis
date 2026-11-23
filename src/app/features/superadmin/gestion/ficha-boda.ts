import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { FichaAcciones } from './ficha-acciones';
import { PUERTA_GESTION, type FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpInput } from '../../../design-system/components/field/input';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { fechaMedia, horaCorta } from '../../../shared/fecha';
import {
  METODOS_PAGO,
  centimosAEuros,
  diaAFecha,
  eurosACentimos,
  esAccionConocida,
  resumenDePayload,
  totalesDePagos,
  type Contacto,
  type EntradaDeHistorial,
  type FichaDeBoda,
  type MetodoPago,
} from './gestion';

type Carga = 'cargando' | 'lista' | 'error';

interface EnlaceGenerado {
  readonly email: string;
  readonly enlace: string;
  /** Solo si se pidió mandar el correo: si quedó en la cola de envío. */
  readonly enviado?: boolean;
}

/**
 * La ficha de una boda para el superadmin (S1.7, S1.6b).
 *
 * Reúne lo que hasta ahora estaba repartido: quién es la pareja y cómo
 * localizarla, qué se ha hecho sobre su boda, qué han pagado. Y, desde aquí,
 * **recuperar su acceso**: el Admin SDK genera el enlace pero no puede enviarlo,
 * así que se enseña para copiarlo y pasarlo por WhatsApp.
 */
@Component({
  selector: 'np-ficha-boda',
  imports: [
    FormsModule,
    RouterLink,
    TranslocoDirective,
    FichaAcciones,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpIcon,
    NpInput,
    NpModal,
    NpStatusChip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="fb__cabecera">
        <a class="fb__volver" routerLink="/superadmin">
          <np-icon name="arrow-left" />
          {{ t('superadmin.ficha.volver') }}
        </a>
        @if (ficha(); as f) {
          <h1>{{ t('publico.pareja', f.couple) }}</h1>
        } @else {
          <h1>{{ t('superadmin.ficha.titulo') }}</h1>
        }
      </header>

      <main class="fb__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('superadmin.ficha.cargando')" />
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.ficha.error')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
              <button npButton size="sm" type="button" (click)="cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            @if (ficha(); as f) {
              <section class="fb__bloque" aria-labelledby="fb-resumen">
                <h2 id="fb-resumen">{{ t('superadmin.ficha.resumen') }}</h2>
                <dl class="fb__datos">
                  <div>
                    <dt>{{ t('superadmin.bodas.columna.direccion') }}</dt>
                    <dd>{{ f.slug }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.bodas.columna.estado') }}</dt>
                    <dd>{{ t('superadmin.estado.' + f.status) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.bodas.columna.plan') }}</dt>
                    <dd>{{ t('superadmin.plan.' + f.plan) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.bodas.columna.fecha') }}</dt>
                    <dd>{{ fecha(f) || t('superadmin.bodas.sinFecha') }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.bodas.columna.invitados') }}</dt>
                    <dd>
                      {{
                        t('superadmin.bodas.confirmadosDeTotal', {
                          confirmados: f.confirmados,
                          total: f.invitados,
                        })
                      }}
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.subdominio') }}</dt>
                    <dd>
                      <np-status-chip
                        [status]="f.authDomain === 'ok' ? 'confirmed' : 'declined'"
                        [label]="
                          f.authDomain === 'ok'
                            ? t('superadmin.ficha.subdominioOk')
                            : t('superadmin.bodas.dominioPendiente')
                        "
                      />
                    </dd>
                  </div>
                </dl>
              </section>

              <section class="fb__bloque" aria-labelledby="fb-actividad">
                <h2 id="fb-actividad">{{ t('superadmin.ficha.actividad') }}</h2>
                <dl class="fb__datos">
                  <div>
                    <dt>{{ t('superadmin.ficha.invitadosConfirmados') }}</dt>
                    <dd>{{ f.confirmados }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.invitadosRechazados') }}</dt>
                    <dd>{{ f.rechazados }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.invitadosPendientes') }}</dt>
                    <dd>{{ f.pendientes }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.fotos') }}</dt>
                    <dd>{{ f.fotos }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.entradasPareja') }}</dt>
                    <dd>
                      {{ f.acceso.pareja }}
                      @if (f.acceso.parejaUltima; as u) {
                        <span class="fb__tenue">
                          · {{ t('superadmin.ficha.ultimaEntrada', { fecha: dia(u) }) }}
                        </span>
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.entradasInvitados') }}</dt>
                    <dd>
                      {{
                        t('superadmin.ficha.entradasInvitadosValor', {
                          quienes: f.acceso.invitadosQueEntraron,
                          veces: f.acceso.invitadosEntradas,
                        })
                      }}
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.visitasWeb') }}</dt>
                    <dd data-visitas>
                      {{ f.acceso.visitasWeb }}
                      @if (f.acceso.visitasWebUltima; as u) {
                        <span class="fb__tenue">
                          · {{ t('superadmin.ficha.ultimaEntrada', { fecha: dia(u) }) }}
                        </span>
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.precioAcordado') }}</dt>
                    <dd data-precio>
                      @if (f.agreedPriceCents !== null) {
                        {{ euros(f.agreedPriceCents) }}
                      } @else {
                        <span class="fb__tenue">{{ t('superadmin.ficha.precioSinFijar') }}</span>
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>{{ t('superadmin.ficha.cobrado') }}</dt>
                    <dd>{{ euros(cobrado(f)) }}</dd>
                  </div>
                  @if (f.agreedPriceCents !== null) {
                    <div>
                      <dt>{{ t('superadmin.ficha.faltaCobrar') }}</dt>
                      <dd data-falta>{{ euros(faltaCobrar(f)) }}</dd>
                    </div>
                  }
                </dl>
                <p class="fb__nota">{{ t('superadmin.ficha.actividadNota') }}</p>
              </section>

              <section class="fb__bloque" aria-labelledby="fb-contacto">
                <h2 id="fb-contacto">{{ t('superadmin.ficha.contacto') }}</h2>
                @if (f.contactPhone) {
                  <p class="fb__telefono" data-telefono>
                    {{ t('superadmin.ficha.telefonoContacto', { telefono: f.contactPhone }) }}
                  </p>
                }
                @if (f.contactos.length === 0) {
                  <p class="fb__vacio">{{ t('superadmin.ficha.sinContactos') }}</p>
                } @else {
                  <ul class="fb__lista">
                    @for (c of f.contactos; track c.uid) {
                      <li class="fb__fila">
                        <div class="fb__persona">
                          <strong>{{ c.displayName || c.email || c.uid }}</strong>
                          @if (c.email) {
                            <span>{{ c.email }}</span>
                          }
                          @if (c.phone) {
                            <span>{{ c.phone }}</span>
                          }
                          <span class="fb__tenue">
                            {{
                              c.lastSignIn
                                ? t('superadmin.ficha.ultimoAcceso', { fecha: dia(c.lastSignIn) })
                                : t('superadmin.ficha.nuncaHaEntrado')
                            }}
                          </span>
                          @if (c.disabled) {
                            <np-status-chip
                              status="declined"
                              [label]="t('superadmin.ficha.cuentaDeshabilitada')"
                            />
                          }
                        </div>
                        <button
                          npButton
                          size="sm"
                          variant="secondary"
                          type="button"
                          [disabled]="!c.email"
                          [loading]="generando() === c.uid"
                          (click)="generarEnlace(c)"
                        >
                          <np-icon name="envelope" />
                          {{ t('superadmin.ficha.generarEnlace') }}
                        </button>
                        <button
                          npButton
                          size="sm"
                          type="button"
                          [disabled]="!c.email"
                          [loading]="enviando() === c.uid"
                          (click)="enviarCorreo(c)"
                        >
                          <np-icon name="envelope" />
                          {{ t('superadmin.ficha.enviarCorreo') }}
                        </button>
                      </li>
                    }
                  </ul>
                  <p class="fb__nota">{{ t('superadmin.ficha.enlaceNota') }}</p>
                }
                @if (falloEnlace(); as e) {
                  <np-alert status="declined" [heading]="t('superadmin.ficha.enlaceError')">
                    <p>{{ textoDeFallo(e, t) }}</p>
                  </np-alert>
                }
              </section>

              <np-ficha-acciones [ficha]="f" (editada)="cargar()" (borrada)="alBorrar()" />

              <section class="fb__bloque" aria-labelledby="fb-pagos">
                <h2 id="fb-pagos">{{ t('superadmin.ficha.pagos') }}</h2>
                @if (f.pagos.length === 0) {
                  <p class="fb__vacio">{{ t('superadmin.ficha.sinPagos') }}</p>
                } @else {
                  <p class="fb__total">
                    {{
                      t('superadmin.ficha.totalPagos', {
                        cobrado: euros(totales().cobrado),
                        pendiente: euros(totales().pendiente),
                      })
                    }}
                  </p>
                  <ul class="fb__lista">
                    @for (p of f.pagos; track p.id) {
                      <li class="fb__fila">
                        <div class="fb__persona">
                          <strong>{{ p.concept }}</strong>
                          <span>
                            {{ euros(p.amountCents) }} ·
                            {{ t('superadmin.finanzas.metodo.' + p.method) }}
                            @if (p.invoiceNumber) {
                              · {{ p.invoiceNumber }}
                            }
                          </span>
                        </div>
                        <np-status-chip
                          [status]="p.status === 'paid' ? 'confirmed' : 'pending'"
                          [label]="t('superadmin.finanzas.estado.' + p.status)"
                        />
                      </li>
                    }
                  </ul>
                }
                <form class="fb__cobro" (ngSubmit)="apuntarCobro()" #cobro="ngForm">
                  <h3>{{ t('superadmin.ficha.apuntarCobro') }}</h3>
                  <div class="fb__cobroCampos">
                    <label>
                      <span>{{ t('superadmin.ficha.cobroImporte') }}</span>
                      <input
                        npInput
                        type="text"
                        inputmode="decimal"
                        name="importe"
                        [ngModel]="importeCobro()"
                        (ngModelChange)="importeCobro.set($event)"
                      />
                    </label>
                    <label>
                      <span>{{ t('superadmin.ficha.cobroMetodo') }}</span>
                      <select
                        npInput
                        name="metodo"
                        [ngModel]="metodoCobro()"
                        (ngModelChange)="metodoCobro.set($event)"
                      >
                        @for (m of metodos; track m) {
                          <option [value]="m">{{ t('superadmin.finanzas.metodo.' + m) }}</option>
                        }
                      </select>
                    </label>
                    <button npButton type="submit" [loading]="guardandoCobro()">
                      <np-icon name="check" />
                      {{ t('superadmin.ficha.cobroGuardar') }}
                    </button>
                  </div>
                  @if (errorCobro(); as e) {
                    <p class="fb__cobroError" role="alert">{{ t(e) }}</p>
                  }
                </form>
                <a class="fb__enlace" routerLink="/superadmin/finanzas">
                  <np-icon name="currency-eur" />
                  {{ t('superadmin.ficha.irAFinanzas') }}
                </a>
              </section>

              <section class="fb__bloque" aria-labelledby="fb-historial">
                <h2 id="fb-historial">{{ t('superadmin.ficha.historial') }}</h2>
                @if (f.historial.length === 0) {
                  <p class="fb__vacio">{{ t('superadmin.ficha.sinHistorial') }}</p>
                } @else {
                  <ol class="fb__historial">
                    @for (e of f.historial; track e.id) {
                      <li>
                        <div class="fb__accion">
                          <strong>{{ etiqueta(e, t) }}</strong>
                          <span class="fb__tenue">{{ cuando(e) }}</span>
                        </div>
                        <span class="fb__tenue">{{ t('superadmin.ficha.actor.' + rol(e)) }}</span>
                        @if (detalle(e); as d) {
                          <span class="fb__detalle">{{ d }}</span>
                        }
                      </li>
                    }
                  </ol>
                  <p class="fb__nota">
                    {{ t('superadmin.ficha.historialNota', { n: f.historial.length }) }}
                  </p>
                }
              </section>
            }
          }
        }
      </main>

      <!--
        El enlace sirve para entrar en la cuenta de la pareja, así que se
        enseña una vez, aquí, y no se guarda en ningún sitio.
      -->
      @if (generado(); as g) {
        <np-modal [open]="true" [heading]="t('superadmin.ficha.enlaceTitulo')" (closed)="cerrar()">
          @if (g.enviado === true) {
            <np-alert status="confirmed" [heading]="t('superadmin.ficha.correoEnviado')">
              <p>{{ t('superadmin.ficha.correoEnviadoA', { email: g.email }) }}</p>
            </np-alert>
          } @else if (g.enviado === false) {
            <np-alert status="attention" [heading]="t('superadmin.ficha.correoNoEnviado')">
              <p>{{ t('superadmin.ficha.correoNoEnviadoTexto') }}</p>
            </np-alert>
          }
          <p>{{ t('superadmin.ficha.enlaceParaCuenta', { email: g.email }) }}</p>
          <code class="fb__codigo">{{ g.enlace }}</code>
          <p class="fb__nota">{{ t('superadmin.ficha.enlaceAviso') }}</p>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="cerrar()">
              {{ t('common.close') }}
            </button>
            <button npButton type="button" (click)="copiar(g.enlace)">
              <np-icon [name]="copiado() ? 'check' : 'copy'" />
              {{ copiado() ? t('superadmin.ficha.copiado') : t('superadmin.ficha.copiar') }}
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
    .fb__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .fb__cabecera h1 {
      margin: 0;
      font-size: var(--np-text-xl);
    }
    .fb__volver,
    .fb__enlace {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .fb__cuerpo {
      display: grid;
      gap: var(--np-space-4);
      padding: var(--np-space-4);
      max-inline-size: 60rem;
      margin-inline: auto;
    }
    .fb__bloque {
      display: grid;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    h2 {
      margin: 0;
      font-size: var(--np-text-lg);
    }
    .fb__datos {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--np-space-3);
      margin: 0;
    }
    .fb__datos dt,
    .fb__tenue,
    .fb__nota {
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    .fb__datos dd {
      margin: 0;
      font-weight: var(--np-weight-medium);
    }
    .fb__lista,
    .fb__historial {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .fb__fila {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-2);
      padding-block-end: var(--np-space-2);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .fb__persona {
      display: grid;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .fb__historial li {
      display: grid;
      gap: var(--np-space-1);
      padding-inline-start: var(--np-space-3);
      border-inline-start: 2px solid var(--np-surface-border);
      font-size: var(--np-text-sm);
    }
    .fb__accion {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      align-items: baseline;
    }
    .fb__detalle {
      font-size: var(--np-text-xs);
      overflow-wrap: anywhere;
    }
    .fb__codigo {
      display: block;
      padding: var(--np-space-3);
      background: var(--np-surface-canvas);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      font-size: var(--np-text-xs);
      overflow-wrap: anywhere;
      user-select: all;
    }
    .fb__vacio,
    .fb__total,
    .fb__nota {
      margin: 0;
    }
    @media (min-width: 40rem) {
      .fb__datos {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    .fb__cobro {
      display: grid;
      gap: var(--np-space-2);
      padding-block-start: var(--np-space-3);
    }
    .fb__cobro h3 {
      margin: 0;
      font-size: var(--np-text-md);
    }
    .fb__cobroCampos {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: var(--np-space-3);
    }
    .fb__cobroCampos label {
      display: grid;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .fb__cobroError {
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
  `,
})
export class FichaBoda {
  private readonly puerta = inject(PUERTA_GESTION);
  private readonly router = inject(Router);
  private readonly weddingId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly ficha = signal<FichaDeBoda | null>(null);

  protected readonly generando = signal<string | null>(null);
  protected readonly generado = signal<EnlaceGenerado | null>(null);
  protected readonly enviando = signal<string | null>(null);
  protected readonly falloEnlace = signal<FalloGestion | null>(null);
  protected readonly copiado = signal(false);

  protected readonly metodos = METODOS_PAGO;
  protected readonly importeCobro = signal('');
  protected readonly metodoCobro = signal<MetodoPago>('efectivo');
  protected readonly guardandoCobro = signal(false);
  protected readonly errorCobro = signal<string | null>(null);

  protected readonly totales = computed(() => totalesDePagos(this.ficha()?.pagos ?? []));

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const r = await this.puerta.ficha(this.weddingId);
    if (r.ok) {
      this.ficha.set(r.datos);
      this.carga.set('lista');
    } else {
      this.fallo.set(r.fallo);
      this.carga.set('error');
    }
  }

  protected async generarEnlace(contacto: Contacto): Promise<void> {
    this.falloEnlace.set(null);
    this.copiado.set(false);
    this.generando.set(contacto.uid);
    const r = await this.puerta.enlaceDeRestablecimiento(this.weddingId, contacto.uid);
    this.generando.set(null);

    if (r.ok) this.generado.set(r.datos);
    else this.falloEnlace.set(r.fallo);
  }

  protected async enviarCorreo(contacto: Contacto): Promise<void> {
    this.falloEnlace.set(null);
    this.copiado.set(false);
    this.enviando.set(contacto.uid);
    const r = await this.puerta.enviarCorreoDeAcceso(this.weddingId, contacto.uid);
    this.enviando.set(null);

    if (r.ok) this.generado.set(r.datos);
    else this.falloEnlace.set(r.fallo);
  }

  protected cerrar(): void {
    this.generado.set(null);
    this.copiado.set(false);
  }

  protected async copiar(enlace: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(enlace);
      this.copiado.set(true);
    } catch {
      // Sin permiso del portapapeles el texto sigue seleccionable con un clic.
      this.copiado.set(false);
    }
  }

  /** Lo que falta por cobrar del precio acordado; nunca negativo. */
  protected faltaCobrar(f: FichaDeBoda): number {
    return Math.max(0, (f.agreedPriceCents ?? 0) - this.cobrado(f));
  }

  /** Lo cobrado de esta boda: solo los cobros marcados como pagados. */
  protected cobrado(f: FichaDeBoda): number {
    return f.pagos.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amountCents, 0);
  }

  /**
   * Apunta un cobro ya cobrado, sin pasar por la pantalla de Finanzas: es lo
   * que se necesita cuando te dan el dinero en mano y quieres dejarlo escrito
   * en la ficha de esa boda.
   */
  protected async apuntarCobro(): Promise<void> {
    const f = this.ficha();
    if (!f) return;

    const centimos = eurosACentimos(this.importeCobro());
    if (centimos === null || centimos <= 0) {
      this.errorCobro.set('superadmin.ficha.cobroImporteError');
      return;
    }

    this.errorCobro.set(null);
    this.guardandoCobro.set(true);
    const r = await this.puerta.guardarPago(null, {
      weddingId: f.weddingId,
      amountCents: centimos,
      concept: 'Cobro',
      method: this.metodoCobro(),
      status: 'paid',
      paidOn: new Date().toISOString().slice(0, 10),
      invoiceNumber: '',
      notes: '',
    });
    this.guardandoCobro.set(false);

    if (!r.ok) {
      this.errorCobro.set('superadmin.ficha.cobroError');
      return;
    }
    this.importeCobro.set('');
    await this.cargar();
  }

  protected alBorrar(): void {
    void this.router.navigateByUrl('/superadmin');
  }

  protected euros(centimos: number): string {
    return centimosAEuros(centimos);
  }

  protected fecha(f: FichaDeBoda): string {
    return fechaMedia(diaAFecha(f.weddingDay), 'es');
  }

  protected dia(fecha: Date): string {
    return fechaMedia(fecha, 'es');
  }

  protected cuando(e: EntradaDeHistorial): string {
    return e.at ? `${fechaMedia(e.at, 'es')} · ${horaCorta(e.at, 'es')}` : '';
  }

  protected rol(e: EntradaDeHistorial): string {
    return e.actorRole === 'superadmin' || e.actorRole === 'owner' ? e.actorRole : 'system';
  }

  /** Una acción que no conocemos se enseña tal cual, no se esconde. */
  protected etiqueta(e: EntradaDeHistorial, t: (clave: string) => string): string {
    return esAccionConocida(e.action) ? t(`superadmin.ficha.accion.${e.action}`) : e.action;
  }

  protected detalle(e: EntradaDeHistorial): string {
    return resumenDePayload(e.payload);
  }

  protected textoDeFallo(fallo: FalloGestion | null, t: (clave: string) => string): string {
    switch (fallo?.tipo) {
      case 'sin-permiso':
        return t('superadmin.estadisticas.falloPermiso');
      case 'sin-verificar':
        return t('superadmin.estadisticas.falloVerificar');
      case 'red':
        return t('superadmin.estadisticas.falloRed');
      case 'no-existe':
        return t('superadmin.ficha.noExiste');
      case 'sin-correo':
        return t('superadmin.ficha.sinCorreo');
      case 'error':
        return fallo.mensaje;
      default:
        return t('superadmin.estadisticas.falloOtro');
    }
  }
}
