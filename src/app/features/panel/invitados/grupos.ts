import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import {
  miembrosPorGrupo,
  moverGrupo,
  type Audiencia,
  type FalloGrupo,
  type Grupo,
} from '../../../core/invitados/grupos-gateway';
import { PUERTA_INVITADOS, type Lado } from '../../../core/invitados/invitados-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import { NP_CATEGORIAS, type NpCategoria } from '../../../design-system/tokens/semantic.generated';
import { BodaStore } from '../boda.store';
import { NpGrupoChip } from './grupo-chip';
import { GruposStore } from './grupos.store';

/**
 * Los grupos de invitados.
 *
 * Lo que aquí se decide va más allá de organizar la lista: **un grupo
 * restringido parte la galería** (§8.5). Por eso la audiencia no es un
 * interruptor escondido sino una elección explícita con su explicación al
 * lado, y el candado acompaña al grupo en todas las pantallas.
 *
 * Primero móvil: una tarjeta por grupo, con el número de invitados grande,
 * que es lo que la pareja viene a mirar.
 */
@Component({
  selector: 'np-grupos',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpIcon,
    NpGrupoChip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="gru">
        <header class="gru__intro">
          <div>
            <h2>{{ t('panel.grupos.titulo') }}</h2>
            <p>{{ t('panel.grupos.ayuda') }}</p>
          </div>
          <div class="gru__cabecera">
            <a class="gru__volver" routerLink="/panel/guests">
              <np-icon name="arrow-left" />
              {{ t('panel.importar.volver') }}
            </a>
            <button npButton type="button" (click)="nuevo()">
              <np-icon name="plus" />
              {{ t('panel.grupos.nuevo') }}
            </button>
          </div>
        </header>

        @if (store.estado() === 'error' && store.fallo(); as f) {
          <np-alert status="declined" [heading]="t('panel.grupos.errorCargar')">
            <p>{{ claveDe(f) ? t(claveDe(f)!) : mensajeDe(f) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.grupos.cargando')" />
          }
          @default {
            @if (store.grupos().length === 0) {
              <np-empty-state
                icon="users"
                [title]="t('panel.grupos.ninguno')"
                [description]="t('panel.grupos.ningunoDescripcion')"
              />
            } @else {
              <ul class="gru__lista">
                @for (grupo of store.grupos(); track grupo.id) {
                  <li class="gru__tarjeta">
                    <div class="gru__quien">
                      <np-grupo-chip
                        [grupo]="grupo"
                        [etiquetaRestringido]="t('panel.grupos.restringido')"
                      />
                      <span class="gru__dato">
                        {{ ladoDe(grupo.side, t) }}
                      </span>
                      @if (grupo.photoAudience === 'restricted') {
                        <span class="gru__dato">
                          <np-icon name="lock-simple" />
                          {{ t('panel.grupos.soloElGrupo') }}
                        </span>
                      }
                      @if (grupo.porDefecto) {
                        <span class="gru__dato">
                          <np-icon name="users" />
                          {{ t('panel.grupos.elDeTodos') }}
                        </span>
                      }
                    </div>

                    @let cuantos = miembros().get(grupo.id) ?? 0;
                    <!-- El espacio va dentro de la interpolación: Angular
                         quita los espacios sueltos entre etiquetas, y un lector
                         de pantalla leía «1invitados». -->
                    <p class="gru__cuantos">
                      <strong>{{ cuantos }}</strong
                      >{{
                        ' ' +
                          (cuantos === 1 ? t('panel.grupos.invitado') : t('panel.grupos.invitados'))
                      }}
                    </p>

                    <div class="gru__acciones">
                      <!--
                        Subir y bajar, no arrastrar: esto se usa con el pulgar
                        desde el móvil y un lector de pantalla puede manejarlo.
                        Arrastrar es otra discusión (D-29, PL.7c). El orden es
                        el que se ve al dar de alta a alguien, y por orden de
                        creación «Familia» acababa la sexta.
                      -->
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        [disabled]="$first"
                        [attr.aria-label]="t('panel.grupos.subir', { nombre: grupo.name })"
                        (click)="subir(grupo.id)"
                      >
                        <np-icon name="caret-up" />
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        [disabled]="$last"
                        [attr.aria-label]="t('panel.grupos.bajar', { nombre: grupo.name })"
                        (click)="bajar(grupo.id)"
                      >
                        <np-icon name="caret-down" />
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="editar(grupo)"
                      >
                        <np-icon name="pencil-simple" />
                        {{ t('common.edit') }}
                      </button>
                      <!-- El grupo de todos no se ofrece borrar: el servidor
                           lo rechazaría, y un botón que siempre falla es peor
                           que no tenerlo. -->
                      @if (!grupo.porDefecto) {
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="pedirBorrado(grupo)"
                        >
                          <np-icon name="trash" />
                          {{ t('common.delete') }}
                        </button>
                      }
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
          [heading]="enEdicion() ? t('panel.grupos.editar') : t('panel.grupos.nuevo')"
          (closed)="cerrar()"
        >
          <form [formGroup]="formulario" class="gru__form" (ngSubmit)="guardar()">
            <label>
              <span>{{ t('panel.grupos.campo.nombre') }}</span>
              <input formControlName="name" autocomplete="off" maxlength="60" />
              <small>{{ t('panel.grupos.campo.nombrePista') }}</small>
            </label>

            <fieldset>
              <legend>{{ t('panel.grupos.campo.color') }}</legend>
              <!-- Cada color con su nombre: el color nunca viaja solo (§9.1). -->
              <div class="gru__colores">
                @for (color of colores; track color.id) {
                  <label class="gru__color" [style.--np-grupo]="'var(--np-cat-' + color.id + ')'">
                    <input type="radio" formControlName="color" [value]="color.id" />
                    <span class="gru__muestra" aria-hidden="true"></span>
                    <span>{{ color.nombre }}</span>
                  </label>
                }
              </div>
            </fieldset>

            <fieldset>
              <legend>{{ t('panel.grupos.campo.lado') }}</legend>
              <div class="gru__opciones">
                @for (lado of lados; track lado) {
                  <label class="gru__opcion">
                    <input type="radio" formControlName="side" [value]="lado" />
                    <span>{{ ladoDe(lado, t) }}</span>
                  </label>
                }
              </div>
            </fieldset>

            @if (enEdicion()?.porDefecto) {
              <p class="gru__nota">
                <np-icon name="users" />
                {{ t('panel.grupos.elDeTodosFotos') }}
              </p>
            } @else {
              <fieldset>
                <legend>{{ t('panel.grupos.campo.fotos') }}</legend>
                <div class="gru__opciones">
                  <label class="gru__opcion gru__opcion--larga">
                    <input type="radio" formControlName="photoAudience" value="public" />
                    <span>
                      <strong>{{ t('panel.grupos.audiencia.public') }}</strong>
                      <small>{{ t('panel.grupos.audiencia.publicAyuda') }}</small>
                    </span>
                  </label>
                  <label class="gru__opcion gru__opcion--larga">
                    <input type="radio" formControlName="photoAudience" value="restricted" />
                    <span>
                      <strong>
                        <np-icon name="lock-simple" />
                        {{ t('panel.grupos.audiencia.restricted') }}
                      </strong>
                      <small>{{ t('panel.grupos.audiencia.restrictedAyuda') }}</small>
                    </span>
                  </label>
                </div>
              </fieldset>

              @if (formulario.controls.photoAudience.value === 'restricted') {
                <label class="gru__opcion gru__opcion--larga">
                  <input type="checkbox" formControlName="allowPublicOptIn" />
                  <span>
                    <strong>{{ t('panel.grupos.campo.optIn') }}</strong>
                    <small>{{ t('panel.grupos.campo.optInPista') }}</small>
                  </span>
                </label>
              }
            }

            @if (fallo(); as f) {
              <np-alert status="declined" [heading]="t('panel.grupos.noGuardado')">
                @switch (f.tipo) {
                  @case ('datos-invalidos') {
                    <ul>
                      @for (campo of f.campos; track campo.campo) {
                        <li>
                          {{ t('panel.grupos.invalido.' + campo.campo + '.' + campo.motivo) }}
                        </li>
                      }
                    </ul>
                  }
                  @case ('con-conflictos') {
                    <p>{{ t('panel.grupos.conflictos', { n: f.cuantos }) }}</p>
                  }
                  @default {
                    <p>{{ claveDe(f) ? t(claveDe(f)!) : mensajeDe(f) }}</p>
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

      @if (borrando(); as grupo) {
        <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
          <p>
            {{
              t('panel.grupos.confirmarBorrado', {
                nombre: grupo.name,
                n: miembros().get(grupo.id) ?? 0,
              })
            }}
          </p>
          @if (fallo(); as f) {
            <np-alert status="declined" [heading]="t('panel.grupos.noBorrado')">
              <p>{{ claveDe(f) ? t(claveDe(f)!) : mensajeDe(f) }}</p>
            </np-alert>
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
    .gru {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .gru__intro {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    .gru__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .gru__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .gru__cabecera {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-3);
    }
    .gru__volver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .gru__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .gru__tarjeta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2) var(--np-space-3);
      padding: var(--np-space-3) var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .gru__quien {
      display: flex;
      flex: 1;
      min-inline-size: 10rem;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--np-space-1);
    }
    .gru__quien np-grupo-chip {
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
    .gru__dato {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .gru__nota {
      display: flex;
      align-items: flex-start;
      gap: var(--np-space-2);
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .gru__cuantos {
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: var(--np-space-1);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .gru__cuantos strong {
      color: var(--np-surface-text);
      font-size: var(--np-text-xl);
      font-variant-numeric: tabular-nums;
    }
    .gru__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .gru__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .gru__form > label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .gru__form > label > span,
    .gru__form legend {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .gru__form small {
      display: block;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-xs);
    }
    .gru__form input:not([type]) {
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-canvas);
      color: inherit;
      font: inherit;
    }
    .gru__form fieldset {
      margin: 0;
      padding: 0;
      border: 0;
    }
    .gru__form legend {
      margin-block-end: var(--np-space-2);
      padding: 0;
    }
    /* Tres por fila en 360 px: el nombre del color cabe entero. */
    .gru__colores {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(6.25rem, 1fr));
      gap: var(--np-space-2);
    }
    .gru__color,
    .gru__opcion {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      font-size: var(--np-text-sm);
      cursor: pointer;
    }
    .gru__color:has(input:checked),
    .gru__opcion:has(input:checked) {
      border-color: var(--np-surface-text);
      box-shadow: inset 0 0 0 1px var(--np-surface-text);
    }
    .gru__color input,
    .gru__opcion input {
      margin: 0;
      accent-color: var(--np-surface-text);
    }
    .gru__muestra {
      flex: none;
      inline-size: 1rem;
      block-size: 1rem;
      border-radius: var(--np-radius-full);
      background: var(--np-grupo);
    }
    .gru__opciones {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
    }
    .gru__opcion--larga {
      align-items: flex-start;
    }
    .gru__opcion--larga input {
      margin-block-start: 0.2rem;
    }
    .gru__opcion--larga strong {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-weight: var(--np-weight-medium);
    }
  `,
})
export class Grupos {
  protected readonly store = inject(GruposStore);
  private readonly boda = inject(BodaStore);
  private readonly invitados = inject(PUERTA_INVITADOS);
  private readonly fb = inject(FormBuilder);

  protected readonly colores = NP_CATEGORIAS;
  protected readonly lados: readonly Lado[] = ['both', 'A', 'B'];

  protected readonly editando = signal(false);
  protected readonly enEdicion = signal<Grupo | null>(null);
  protected readonly borrando = signal<Grupo | null>(null);
  protected readonly guardando = signal(false);
  protected readonly fallo = signal<FalloGrupo | null>(null);

  private readonly groupIdsDeInvitados = signal<readonly { groupIds: readonly string[] }[]>([]);
  protected readonly miembros = computed(() => miembrosPorGrupo(this.groupIdsDeInvitados()));

  protected readonly formulario = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    color: ['rosa' as NpCategoria],
    side: ['both' as Lado],
    photoAudience: ['public' as Audiencia],
    allowPublicOptIn: [false],
  });

  constructor() {
    void this.contarMiembros();
  }

  /** «De María», «De Gabriel», «De los dos». Con los nombres, nunca «lado A». */
  protected ladoDe(lado: Lado, t: (clave: string, params?: object) => string): string {
    const pareja = this.boda.boda()?.pareja;
    if (lado === 'A' && pareja?.partnerA) return t('panel.lado.de', { nombre: pareja.partnerA });
    if (lado === 'B' && pareja?.partnerB) return t('panel.lado.de', { nombre: pareja.partnerB });
    return t('panel.lado.' + lado);
  }

  protected claveDe(f: FalloGrupo): string | null {
    switch (f.tipo) {
      case 'por-defecto':
        return 'panel.grupos.elDeTodosNoSeBorra';
      case 'sin-verificar':
        return 'superadmin.alta.sinVerificar';
      case 'sin-permiso':
        return 'panel.invitados.sinPermiso';
      default:
        return null;
    }
  }

  protected mensajeDe(f: FalloGrupo): string {
    return f.tipo === 'error' ? f.mensaje : '';
  }

  protected nuevo(): void {
    this.fallo.set(null);
    this.enEdicion.set(null);
    this.formulario.reset({
      name: '',
      color: this.colorLibre(),
      side: 'both',
      photoAudience: 'public',
      allowPublicOptIn: false,
    });
    this.editando.set(true);
  }

  /** Mueve un grupo y guarda el orden entero. Ver `moverGrupo`. */
  protected subir(id: string): void {
    void this.mover(id, -1);
  }

  protected bajar(id: string): void {
    void this.mover(id, 1);
  }

  private async mover(id: string, direccion: -1 | 1): Promise<void> {
    const movidos = moverGrupo(this.store.grupos(), id, direccion);
    if (movidos === this.store.grupos()) return;

    await this.store.reordenar(movidos);
  }

  protected editar(grupo: Grupo): void {
    this.fallo.set(null);
    this.enEdicion.set(grupo);
    this.formulario.reset({
      name: grupo.name,
      color: grupo.color,
      side: grupo.side,
      photoAudience: grupo.photoAudience,
      allowPublicOptIn: grupo.allowPublicOptIn,
    });
    this.editando.set(true);
  }

  protected cerrar(): void {
    this.editando.set(false);
    this.fallo.set(null);
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid) return;
    const valores = this.formulario.getRawValue();

    this.guardando.set(true);
    const resultado = await this.store.guardar({
      ...(this.enEdicion() ? { id: this.enEdicion()!.id } : {}),
      ...valores,
    });
    this.guardando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }
    this.editando.set(false);
  }

  protected pedirBorrado(grupo: Grupo): void {
    this.fallo.set(null);
    this.borrando.set(grupo);
  }

  protected async borrar(): Promise<void> {
    const grupo = this.borrando();
    if (!grupo) return;

    this.guardando.set(true);
    const resultado = await this.store.borrar(grupo.id);
    this.guardando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }
    this.borrando.set(null);
    await this.contarMiembros();
  }

  /** El primer color que no usa ningún grupo, para no empezar todos en rosa. */
  private colorLibre(): NpCategoria {
    const usados = new Set(this.store.grupos().map((g) => g.color));
    return (NP_CATEGORIAS.find((c) => !usados.has(c.id)) ?? NP_CATEGORIAS[0]).id;
  }

  /**
   * Cuántos hay en cada grupo. Sale de la lista de invitados, que es la única
   * fuente: los invitados están cerrados a lectura directa (regla 2).
   */
  private async contarMiembros(): Promise<void> {
    const resultado = await this.invitados.listar();
    if (resultado.ok) this.groupIdsDeInvitados.set(resultado.invitados);
  }
}
