import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_INVITADOS,
  filtrarInvitados,
  ordenarPorNombre,
  resumirInvitados,
  type DatosInvitado,
  type FalloInvitado,
  type Invitado,
} from '../../../core/invitados/invitados-gateway';

type Carga = 'cargando' | 'lista' | 'error';

/**
 * La lista de invitados de la boda.
 *
 * Todo pasa por funciones invocables: `guests` está cerrada a lectura directa
 * (regla 2), así que esta pantalla no toca Firestore ni de lejos.
 *
 * **Primero móvil, y aquí importa más que en ningún sitio.** Una pareja repasa
 * su lista de invitados en el sofá, en el coche y en casa de los suegros. Por
 * eso cada invitado es una tarjeta y no una fila de tabla: una tabla de ocho
 * columnas en 360 px es un carrusel horizontal, y lo que se necesita de un
 * vistazo —quién es, si ha contestado, si ha entrado— cabe de sobra en una
 * tarjeta.
 *
 * Solo alta manual. La importación desde CSV es la siguiente tarea; sin ella
 * una lista de doscientos se teclea a mano, que es exactamente lo que §8.3
 * quiere evitar.
 */
@Component({
  selector: 'np-invitados',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="inv">
        <header class="inv__intro">
          <div>
            <h2>{{ t('panel.invitados.titulo') }}</h2>
            <p>{{ t('panel.invitados.ayuda') }}</p>
          </div>
          <button npButton type="button" (click)="nuevo()">
            <np-icon name="user-plus" />
            {{ t('panel.invitados.anadir') }}
          </button>
        </header>

        @if (carga() === 'error') {
          <np-alert status="declined" [heading]="t('panel.invitados.errorCargar')">
            <p>{{ claveDeFallo() ? t(claveDeFallo()!) : mensajeError() }}</p>
            <button npButton size="sm" type="button" (click)="recargar()">
              <np-icon name="spinner-gap" />
              {{ t('common.retry') }}
            </button>
          </np-alert>
        }

        @if (todos().length > 0) {
          <!--
            El resumen va arriba y con el número grande: es lo que la pareja
            viene a mirar. Cada cifra lleva su etiqueta, nunca solo color.
          -->
          <dl class="inv__resumen">
            <div>
              <dt>{{ t('panel.invitados.total') }}</dt>
              <dd>{{ resumen().total }}</dd>
            </div>
            <div>
              <dt>{{ t('panel.invitados.confirmados') }}</dt>
              <dd>{{ resumen().confirmados }}</dd>
            </div>
            <div>
              <dt>{{ t('panel.invitados.pendientes') }}</dt>
              <dd>{{ resumen().pendientes }}</dd>
            </div>
            <div>
              <dt>{{ t('panel.invitados.sinEntrar') }}</dt>
              <dd>{{ resumen().sinEntrar }}</dd>
            </div>
          </dl>

          <label class="inv__buscador">
            <np-icon name="magnifying-glass" />
            <input
              type="search"
              [placeholder]="t('panel.invitados.buscar')"
              [value]="busqueda()"
              (input)="buscar($event)"
            />
          </label>
        }

        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.invitados.cargando')" />
          }
          @default {
            @if (todos().length === 0) {
              <np-empty-state
                icon="users"
                [title]="t('panel.invitados.ninguno')"
                [description]="t('panel.invitados.ningunoDescripcion')"
              />
            } @else if (visibles().length === 0) {
              <np-empty-state
                icon="magnifying-glass"
                [title]="t('panel.invitados.sinResultados')"
              />
            } @else {
              <ul class="inv__lista">
                @for (invitado of visibles(); track invitado.id) {
                  <li class="inv__tarjeta">
                    <div class="inv__quien">
                      <span class="inv__nombre">{{ invitado.fullName }}</span>
                      @if (invitado.phone; as telefono) {
                        <span class="inv__dato">{{ telefono }}</span>
                      }
                      @if (invitado.isCompanion) {
                        <span class="inv__dato">
                          <np-icon name="user-plus" />
                          {{ t('panel.invitados.esAcompanante') }}
                        </span>
                      }
                    </div>

                    <div class="inv__estados">
                      <np-status-chip
                        [status]="colorRsvp(invitado)"
                        [label]="t('panel.invitados.rsvp.' + invitado.rsvpStatus)"
                      />
                      @if (invitado.loginCount === 0) {
                        <np-status-chip
                          status="pending"
                          [label]="t('panel.invitados.noHaEntrado')"
                        />
                      }
                    </div>

                    <div class="inv__acciones">
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="editar(invitado)"
                      >
                        <np-icon name="pencil-simple" />
                        {{ t('common.edit') }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="pedirBorrado(invitado)"
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
      </section>

      @if (editando()) {
        <np-modal
          [open]="true"
          [heading]="enEdicion() ? t('panel.invitados.editar') : t('panel.invitados.anadir')"
          (closed)="cerrar()"
        >
          <form [formGroup]="formulario" class="inv__form" (ngSubmit)="guardar()">
            <label>
              <span>{{ t('panel.invitados.campo.nombre') }}</span>
              <input formControlName="fullName" autocomplete="off" />
            </label>
            <label>
              <span>{{ t('panel.invitados.campo.telefono') }}</span>
              <input formControlName="phone" inputmode="tel" autocomplete="off" />
              <small>{{ t('panel.invitados.campo.telefonoPista') }}</small>
            </label>
            <label>
              <span>{{ t('panel.invitados.campo.email') }}</span>
              <input formControlName="email" inputmode="email" autocomplete="off" />
            </label>
            <label>
              <span>{{ t('panel.invitados.campo.acompanantes') }}</span>
              <input formControlName="maxCompanions" type="number" min="0" max="10" />
              <small>{{ t('panel.invitados.campo.acompanantesPista') }}</small>
            </label>
            <label>
              <span>{{ t('panel.invitados.campo.notas') }}</span>
              <textarea formControlName="notes" rows="2"></textarea>
              <small>{{ t('panel.invitados.campo.notasPista') }}</small>
            </label>

            @if (fallo(); as f) {
              <np-alert status="declined" [heading]="t('panel.invitados.noGuardado')">
                @switch (f.tipo) {
                  @case ('duplicado') {
                    <p>{{ t('panel.invitados.duplicado.' + f.motivo) }}</p>
                    <button npButton size="sm" type="button" (click)="guardar(true)">
                      {{ t('panel.invitados.crearIgualmente') }}
                    </button>
                  }
                  @case ('datos-invalidos') {
                    <ul>
                      @for (campo of f.campos; track campo.campo) {
                        <li>
                          {{ t('panel.invitados.invalido.' + campo.campo + '.' + campo.motivo) }}
                        </li>
                      }
                    </ul>
                  }
                  @default {
                    <p>{{ claveDeFallo() ? t(claveDeFallo()!) : mensajeError() }}</p>
                  }
                }
              </np-alert>
            }
          </form>

          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="cerrar()">
              {{ t('common.cancel') }}
            </button>
            <button
              npButton
              type="button"
              [loading]="guardando()"
              [disabled]="formulario.invalid"
              (click)="guardar()"
            >
              <np-icon name="check" />
              {{ t('common.save') }}
            </button>
          </div>
        </np-modal>
      }

      @if (borrando(); as quien) {
        <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
          <p>{{ t('panel.invitados.confirmarBorrado', { nombre: quien.fullName }) }}</p>
          @if (fallo(); as f) {
            @if (f.tipo === 'con-acompanantes') {
              <np-alert status="declined" [heading]="t('panel.invitados.noBorrado')">
                <p>{{ t('panel.invitados.traeAcompanantes', { n: f.cuantos }) }}</p>
              </np-alert>
            }
          }
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="borrando.set(null)">
              {{ t('common.cancel') }}
            </button>
            <button
              npButton
              variant="danger"
              type="button"
              [loading]="guardando()"
              (click)="borrar()"
            >
              <np-icon name="trash" />
              {{ t('common.delete') }}
            </button>
          </div>
        </np-modal>
      }
    </ng-container>
  `,
  styles: `
    .inv {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .inv__intro {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    .inv__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .inv__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    /* Móvil: dos por fila. Cabe en 360 px sin apretar. */
    .inv__resumen {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
      gap: var(--np-space-2);
      margin: 0;
    }
    .inv__resumen div {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .inv__resumen dt {
      font-size: var(--np-text-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--np-surface-text-muted);
    }
    .inv__resumen dd {
      margin: 0;
      font-size: var(--np-text-2xl);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .inv__buscador {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      padding-inline: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: var(--np-surface-text-muted);
    }
    .inv__buscador input {
      flex: 1;
      min-block-size: var(--np-tap-target);
      border: 0;
      background: transparent;
      color: var(--np-surface-text);
      font: inherit;
    }
    .inv__buscador input:focus {
      outline: none;
    }
    .inv__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    /* Una tarjeta por invitado: en 360 px una tabla de ocho columnas es un
       carrusel horizontal, y esto se lee de un vistazo. */
    .inv__tarjeta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2) var(--np-space-3);
      padding: var(--np-space-3) var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .inv__quien {
      display: flex;
      flex: 1;
      min-inline-size: 10rem;
      flex-direction: column;
      gap: var(--np-space-1);
    }
    .inv__nombre {
      font-weight: var(--np-weight-medium);
    }
    .inv__dato {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .inv__estados,
    .inv__acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .inv__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .inv__form label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .inv__form label > span {
      color: var(--np-surface-text-muted);
    }
    .inv__form small {
      color: var(--np-surface-text-muted);
    }
    .inv__form input,
    .inv__form textarea {
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-canvas);
      color: inherit;
      font: inherit;
    }
  `,
})
export class Invitados {
  private readonly puerta = inject(PUERTA_INVITADOS);
  private readonly fb = inject(FormBuilder);

  protected readonly carga = signal<Carga>('cargando');
  protected readonly guardando = signal(false);
  protected readonly fallo = signal<FalloInvitado | null>(null);
  protected readonly busqueda = signal('');
  protected readonly editando = signal(false);
  protected readonly enEdicion = signal<Invitado | null>(null);
  protected readonly borrando = signal<Invitado | null>(null);

  protected readonly todos = signal<readonly Invitado[]>([]);

  protected readonly visibles = computed(() =>
    ordenarPorNombre(filtrarInvitados(this.todos(), this.busqueda())),
  );
  protected readonly resumen = computed(() => resumirInvitados(this.todos()));

  protected readonly formulario = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: [''],
    email: [''],
    maxCompanions: [0],
    notes: [''],
  });

  constructor() {
    void this.recargar();
  }

  /**
   * La clave de traducción del fallo, o `null` si el mensaje viene del servidor.
   *
   * Existe para que el caso más común de todos —App Check sin configurar, un
   * 401— no acabe enseñando «Unauthenticated [401]», que es lo que hacía y no
   * le dice a nadie qué tiene que tocar.
   */
  protected claveDeFallo(): string | null {
    switch (this.fallo()?.tipo) {
      case 'sin-verificar':
        return 'superadmin.alta.sinVerificar';
      case 'sin-permiso':
        return 'panel.invitados.sinPermiso';
      default:
        return null;
    }
  }

  protected mensajeError(): string {
    const f = this.fallo();
    return f?.tipo === 'error' ? f.mensaje : '';
  }

  /** Verde confirmado, rojo declinado, ámbar pendiente. Siempre con etiqueta. */
  protected colorRsvp(invitado: Invitado): 'confirmed' | 'declined' | 'pending' {
    if (invitado.rsvpStatus === 'confirmed') return 'confirmed';
    return invitado.rsvpStatus === 'declined' ? 'declined' : 'pending';
  }

  protected buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected async recargar(): Promise<void> {
    this.carga.set('cargando');
    const resultado = await this.puerta.listar();

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.carga.set('error');
      return;
    }

    this.todos.set(resultado.invitados);
    this.fallo.set(null);
    this.carga.set('lista');
  }

  protected nuevo(): void {
    this.fallo.set(null);
    this.enEdicion.set(null);
    this.formulario.reset({ fullName: '', phone: '', email: '', maxCompanions: 0, notes: '' });
    this.editando.set(true);
  }

  protected editar(invitado: Invitado): void {
    this.fallo.set(null);
    this.enEdicion.set(invitado);
    this.formulario.reset({
      fullName: invitado.fullName,
      phone: invitado.phone ?? '',
      email: invitado.email ?? '',
      maxCompanions: invitado.maxCompanions,
      notes: invitado.notes,
    });
    this.editando.set(true);
  }

  protected cerrar(): void {
    this.editando.set(false);
    this.fallo.set(null);
  }

  protected async guardar(forzar = false): Promise<void> {
    if (this.formulario.invalid) return;

    const valores = this.formulario.getRawValue();
    const datos: DatosInvitado = {
      ...(this.enEdicion() ? { id: this.enEdicion()!.id } : {}),
      fullName: valores.fullName,
      phone: valores.phone,
      email: valores.email,
      maxCompanions: Number(valores.maxCompanions) || 0,
      notes: valores.notes,
    };

    this.guardando.set(true);
    const resultado = await this.puerta.guardar(datos, forzar);
    this.guardando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    this.editando.set(false);
    this.fallo.set(null);
    await this.recargar();
  }

  protected pedirBorrado(invitado: Invitado): void {
    this.fallo.set(null);
    this.borrando.set(invitado);
  }

  protected async borrar(): Promise<void> {
    const quien = this.borrando();
    if (!quien) return;

    this.guardando.set(true);
    const resultado = await this.puerta.borrar(quien.id);
    this.guardando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    this.borrando.set(null);
    await this.recargar();
  }
}
