import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_LLAMADAS, objeto, lista } from '../../../core/llamadas/llamadas-gateway';
import type { FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import { textoDeFalloSuperadmin } from '../texto-de-fallo';
import { centimosATexto, eurosACentimosOCero } from '../../../shared/dinero';
import { leerPlanes } from '../planes/planes';
import type { FichaDeBoda } from './gestion';
import { telefonoVisible } from '../../../shared/telefono';

/**
 * Editar y borrar una boda (D-53), desde su ficha.
 *
 * - **Editar** cambia nombres, fecha, ceremonia, plan, teléfono y dirección
 *   (slug); la web pública se actualiza sola. Cambiar la dirección rompe los
 *   enlaces ya repartidos: se avisa antes de guardar (D-55).
 * - **Cambiar de plan** enseña antes qué módulos se ganan y cuáles se pierden,
 *   avisa si es una bajada (los datos se conservan, el módulo se oculta) y deja
 *   fijar el nuevo precio acordado. No registra ningún cobro.
 * - **Borrar** es definitivo e inmediato. Para no hacerlo por error, hay que
 *   escribir la dirección de la boda. Los cobros y el historial se conservan.
 */
@Component({
  selector: 'np-ficha-acciones',
  imports: [FormsModule, TranslocoDirective, NpAlert, NpButton, NpField, NpInput, NpModal, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="fa__bloque" aria-labelledby="fa-acciones">
        <h2 id="fa-acciones">{{ t('superadmin.ficha.gestion') }}</h2>
        @if (aviso(); as a) {
          <np-alert status="confirmed" [heading]="t('superadmin.ficha.' + a)" />
        }
        <div class="fa__botones">
          <button npButton variant="secondary" type="button" (click)="abrirEdicion()">
            <np-icon name="pencil-simple" />
            {{ t('superadmin.ficha.editar') }}
          </button>
          <button npButton variant="secondary" type="button" (click)="abrirPlan()">
            <np-icon name="arrows-clockwise" />
            {{ t('superadmin.ficha.plan.boton') }}
          </button>
          <button
            npButton
            variant="ghost"
            class="fa__peligro"
            type="button"
            (click)="abrirBorrado()"
          >
            <np-icon name="trash" />
            {{ t('superadmin.ficha.borrar') }}
          </button>
        </div>
      </section>

      @if (editando()) {
        <np-modal
          [open]="true"
          [heading]="t('superadmin.ficha.editarTitulo')"
          (closed)="editando.set(false)"
        >
          @if (fallo(); as f) {
            <np-alert status="declined" [heading]="t('superadmin.ficha.editarError')">
              <p>{{ textoDe(f, t) }}</p>
            </np-alert>
          }
          <div class="fa__form">
            <np-field
              [label]="t('superadmin.ficha.direccionWeb')"
              [hint]="t('superadmin.ficha.direccionPista')"
            >
              <input
                npInput
                name="slug"
                autocapitalize="none"
                autocomplete="off"
                [ngModel]="slug()"
                (ngModelChange)="slug.set($event)"
              />
            </np-field>
            @if (cambiaSlug()) {
              <np-alert status="attention" [heading]="t('superadmin.ficha.direccionAvisoTitulo')">
                <p>{{ t('superadmin.ficha.direccionAviso') }}</p>
              </np-alert>
            }
            <np-field [label]="t('superadmin.alta.nombreA')">
              <input npInput name="a" [ngModel]="a()" (ngModelChange)="a.set($event)" />
            </np-field>
            <np-field [label]="t('superadmin.alta.nombreB')">
              <input npInput name="b" [ngModel]="b()" (ngModelChange)="b.set($event)" />
            </np-field>
            <np-field [label]="t('superadmin.bodas.columna.fecha')">
              <input
                npInput
                type="date"
                name="dia"
                [ngModel]="dia()"
                (ngModelChange)="dia.set($event)"
              />
            </np-field>
            <np-field [label]="t('superadmin.ficha.ceremonia')">
              <select
                npInput
                name="ceremonia"
                [ngModel]="ceremonia()"
                (ngModelChange)="ceremonia.set($event)"
              >
                <option value="civil">{{ t('superadmin.ficha.ceremoniaCivil') }}</option>
                <option value="religious">{{ t('superadmin.ficha.ceremoniaReligiosa') }}</option>
              </select>
            </np-field>
            <np-field
              [label]="t('superadmin.alta.telefono')"
              [hint]="t('superadmin.alta.telefonoPista')"
            >
              <input
                npInput
                type="tel"
                inputmode="tel"
                name="telefono"
                [ngModel]="telefono()"
                (ngModelChange)="telefono.set($event)"
              />
            </np-field>
            <np-field
              [label]="t('superadmin.ficha.precioAcordado')"
              [hint]="t('superadmin.ficha.precioPista')"
              [error]="errorPrecio() ? t('superadmin.ficha.precioError') : null"
            >
              <input
                npInput
                type="text"
                inputmode="decimal"
                name="precio"
                [ngModel]="precio()"
                (ngModelChange)="precio.set($event)"
              />
            </np-field>
          </div>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="editando.set(false)">
              {{ t('common.cancel') }}
            </button>
            <button npButton type="button" [loading]="ocupado()" (click)="guardar()">
              <np-icon name="check" />
              {{ t('common.save') }}
            </button>
          </div>
        </np-modal>
      }

      @if (cambiandoPlan()) {
        <np-modal
          [open]="true"
          [heading]="t('superadmin.ficha.plan.titulo')"
          (closed)="cambiandoPlan.set(false)"
        >
          <p class="fa__plan-actual">
            {{
              t('superadmin.ficha.plan.actual', {
                plan: t('superadmin.plan.' + planActual()),
              })
            }}
          </p>
          <np-field [label]="t('superadmin.ficha.plan.nuevo')">
            <select
              npInput
              name="planNuevo"
              [ngModel]="planNuevo()"
              (ngModelChange)="elegirPlan($event)"
            >
              <option value="basic">{{ t('superadmin.plan.basic') }}</option>
              <option value="extended">{{ t('superadmin.plan.extended') }}</option>
            </select>
          </np-field>

          @if (planesCargados() === 'cargando') {
            <p>{{ t('superadmin.ficha.plan.cargando') }}</p>
          } @else if (planesCargados() === 'error') {
            <np-alert status="declined" [heading]="t('superadmin.ficha.plan.errorPlanes')" />
          } @else if (!cambiaDePlan()) {
            <p>{{ t('superadmin.ficha.plan.sinCambio') }}</p>
          } @else {
            <div class="fa__diferencia">
              <section [attr.aria-label]="t('superadmin.ficha.plan.gana')">
                <h3>{{ t('superadmin.ficha.plan.gana') }}</h3>
                @if (diferencia().anadidos.length === 0) {
                  <p>{{ t('superadmin.ficha.plan.ningunoGana') }}</p>
                } @else {
                  <ul class="fa__gana">
                    @for (m of diferencia().anadidos; track m) {
                      <li>
                        <np-icon name="check-circle" />
                        {{ t('panel.modulo.' + m) }}
                      </li>
                    }
                  </ul>
                }
              </section>
              <section [attr.aria-label]="t('superadmin.ficha.plan.pierde')">
                <h3>{{ t('superadmin.ficha.plan.pierde') }}</h3>
                @if (diferencia().quitados.length === 0) {
                  <p>{{ t('superadmin.ficha.plan.ningunoPierde') }}</p>
                } @else {
                  <ul class="fa__pierde">
                    @for (m of diferencia().quitados; track m) {
                      <li>
                        <np-icon name="warning" />
                        {{ t('panel.modulo.' + m) }}
                      </li>
                    }
                  </ul>
                }
              </section>
            </div>

            @if (diferencia().quitados.length > 0) {
              <np-alert status="pending" [heading]="t('superadmin.ficha.plan.bajadaTitulo')">
                <p>{{ t('superadmin.ficha.plan.bajadaTexto') }}</p>
              </np-alert>
            }

            <np-field
              [label]="t('superadmin.ficha.plan.precio')"
              [hint]="t('superadmin.ficha.plan.precioPista')"
              [error]="errorPrecio() ? t('superadmin.ficha.precioError') : null"
            >
              <input
                npInput
                type="text"
                inputmode="decimal"
                name="precioPlan"
                [ngModel]="precio()"
                (ngModelChange)="precio.set($event)"
              />
            </np-field>
            <p class="fa__nota">{{ t('superadmin.ficha.plan.cobroNota') }}</p>
          }

          @if (fallo(); as f) {
            <np-alert status="declined" [heading]="t('superadmin.ficha.plan.error')">
              <p>{{ textoDe(f, t) }}</p>
            </np-alert>
          }
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="cambiandoPlan.set(false)">
              {{ t('common.cancel') }}
            </button>
            <button
              npButton
              type="button"
              [disabled]="!cambiaDePlan() || planesCargados() !== 'lista'"
              [loading]="ocupado()"
              (click)="guardarPlan()"
            >
              {{
                diferencia().quitados.length > 0
                  ? t('superadmin.ficha.plan.confirmarBajada')
                  : t('superadmin.ficha.plan.confirmar')
              }}
            </button>
          </div>
        </np-modal>
      }

      @if (borrando()) {
        <np-modal
          [open]="true"
          [heading]="t('superadmin.ficha.borrarTitulo')"
          (closed)="borrando.set(false)"
        >
          <np-alert status="declined" [heading]="t('superadmin.ficha.borrarAviso')">
            <p>{{ t('superadmin.ficha.borrarTexto') }}</p>
          </np-alert>
          @if (fallo(); as f) {
            <np-alert status="declined" [heading]="t('superadmin.ficha.borrarError')">
              <p>{{ textoDe(f, t) }}</p>
            </np-alert>
          }
          <np-field [label]="t('superadmin.ficha.borrarConfirma', { slug: ficha().slug })">
            <input
              npInput
              name="confirmar"
              autocomplete="off"
              [ngModel]="escrito()"
              (ngModelChange)="escrito.set($event)"
            />
          </np-field>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="borrando.set(false)">
              {{ t('common.cancel') }}
            </button>
            <button
              npButton
              type="button"
              class="fa__peligro"
              [disabled]="!coincide()"
              [loading]="ocupado()"
              (click)="borrar()"
            >
              {{ t('superadmin.ficha.borrarBoton') }}
            </button>
          </div>
        </np-modal>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .fa__bloque {
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
    .fa__botones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .fa__form {
      display: grid;
      gap: var(--np-space-3);
    }
    .fa__peligro {
      color: var(--np-status-declined-text, inherit);
    }
    .fa__diferencia {
      display: grid;
      gap: var(--np-space-3);
    }
    .fa__diferencia h3 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-semibold);
    }
    .fa__diferencia ul {
      display: grid;
      gap: var(--np-space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .fa__diferencia li {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
    }
    .fa__nota {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
  `,
})
export class FichaAcciones {
  private readonly puerta = inject(PUERTA_LLAMADAS);

  readonly ficha = input.required<FichaDeBoda>();
  /** La boda se ha editado: la ficha tiene que recargarse. */
  readonly editada = output<void>();
  /** La boda ya no existe: hay que salir de su ficha. */
  readonly borrada = output<void>();

  protected readonly editando = signal(false);
  protected readonly borrando = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly aviso = signal<'editada' | 'planCambiado' | null>(null);

  protected readonly a = signal('');
  protected readonly b = signal('');
  protected readonly dia = signal('');
  protected readonly ceremonia = signal<string>('civil');
  protected readonly telefono = signal('');
  /** El precio acordado, en euros tal como se escribe; vacío = sin fijar. */
  protected readonly precio = signal('');
  protected readonly errorPrecio = signal(false);
  protected readonly slug = signal('');
  protected readonly cambiaSlug = computed(
    () => this.slug().trim() !== '' && this.slug().trim() !== this.ficha().slug,
  );
  protected readonly escrito = signal('');

  // — Cambiar de plan —
  protected readonly cambiandoPlan = signal(false);
  protected readonly planNuevo = signal<'basic' | 'extended'>('extended');
  protected readonly planesCargados = signal<'cargando' | 'lista' | 'error'>('cargando');
  private readonly modulosDePlan = signal<Record<string, readonly string[]>>({});

  protected readonly planActual = computed<'basic' | 'extended'>(() =>
    this.ficha().plan === 'extended' ? 'extended' : 'basic',
  );
  protected readonly cambiaDePlan = computed(() => this.planNuevo() !== this.planActual());

  /** Lo que gana y lo que pierde la boda, con las listas guardadas de cada plan. */
  protected readonly diferencia = computed(() => {
    const planes = this.modulosDePlan();
    const antes = planes[this.planActual()] ?? [];
    const despues = planes[this.planNuevo()] ?? [];
    return {
      anadidos: despues.filter((m) => !antes.includes(m)),
      quitados: antes.filter((m) => !despues.includes(m)),
    };
  });

  protected readonly coincide = computed(() => this.escrito().trim() === this.ficha().slug);

  protected abrirEdicion(): void {
    const f = this.ficha();
    this.a.set(f.couple.partnerA);
    this.b.set(f.couple.partnerB);
    this.dia.set(f.weddingDay ?? '');
    this.ceremonia.set(f.ceremonyType);
    this.telefono.set(telefonoVisible(f.contactPhone));
    this.precio.set(f.agreedPriceCents === null ? '' : centimosATexto(f.agreedPriceCents));
    this.errorPrecio.set(false);
    this.slug.set(f.slug);
    this.fallo.set(null);
    this.aviso.set(null);
    this.editando.set(true);
  }

  protected async abrirPlan(): Promise<void> {
    const f = this.ficha();
    this.planNuevo.set(this.planActual() === 'basic' ? 'extended' : 'basic');
    this.precio.set(f.agreedPriceCents === null ? '' : centimosATexto(f.agreedPriceCents));
    this.errorPrecio.set(false);
    this.fallo.set(null);
    this.aviso.set(null);
    this.cambiandoPlan.set(true);

    if (this.planesCargados() === 'lista') return;
    this.planesCargados.set('cargando');
    const r = await this.puerta.llamar('listPlans', {}, leerPlanes);
    if (!r.ok) {
      this.planesCargados.set('error');
      return;
    }
    this.modulosDePlan.set(Object.fromEntries(r.datos.planes.map((p) => [p.id, p.modulos])));
    this.planesCargados.set('lista');
  }

  protected elegirPlan(valor: string): void {
    this.planNuevo.set(valor === 'basic' ? 'basic' : 'extended');
  }

  /**
   * Cambia el plan y, si se ha escrito, el precio acordado.
   *
   * El servidor aplica la diferencia de módulos (D-53). **No se registra ningún
   * cobro**: lo cobrado lo apunta el superadmin en Finanzas, por bloques.
   */
  protected async guardarPlan(): Promise<void> {
    if (!this.cambiaDePlan()) return;

    const escrito = this.precio().trim();
    const precio = escrito === '' ? null : eurosACentimosOCero(escrito);
    this.errorPrecio.set(escrito !== '' && precio === null);
    if (this.errorPrecio()) return;

    const cambios: Record<string, string | number | null> = { plan: this.planNuevo() };
    if (precio !== this.ficha().agreedPriceCents) cambios['agreedPriceCents'] = precio;

    this.ocupado.set(true);
    this.fallo.set(null);
    const r = await this.puerta.llamar(
      'updateWedding',
      { weddingId: this.ficha().weddingId, cambios },
      (crudo) => (objeto(crudo)['ok'] === true ? true : null),
    );
    this.ocupado.set(false);

    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    this.cambiandoPlan.set(false);
    this.aviso.set('planCambiado');
    this.editada.emit();
  }

  protected abrirBorrado(): void {
    this.escrito.set('');
    this.fallo.set(null);
    this.borrando.set(true);
  }

  /** Solo se manda lo que ha cambiado: menos escritura y menos que auditar. */
  protected cambios(): Record<string, string | number | null> {
    const f = this.ficha();
    const salida: Record<string, string | number | null> = {};
    if (this.a().trim() !== f.couple.partnerA) salida['partnerA'] = this.a();
    if (this.b().trim() !== f.couple.partnerB) salida['partnerB'] = this.b();
    if (this.dia() !== '' && this.dia() !== f.weddingDay) salida['weddingDate'] = this.dia();
    if (this.ceremonia() !== f.ceremonyType) salida['ceremonyType'] = this.ceremonia();
    if (this.cambiaSlug()) salida['slug'] = this.slug();
    if (this.telefono().trim() !== telefonoVisible(f.contactPhone))
      salida['contactPhone'] = this.telefono();

    // Vacío quita el precio; «0» es un precio válido (se regala).
    const escrito = this.precio().trim();
    const precio = escrito === '' ? null : eurosACentimosOCero(escrito);
    if (precio !== null || escrito === '') {
      if (precio !== f.agreedPriceCents) salida['agreedPriceCents'] = precio;
    }
    return salida;
  }

  protected async guardar(): Promise<void> {
    // Un importe ilegible no se manda ni se redondea: se pide que se corrija.
    const escrito = this.precio().trim();
    this.errorPrecio.set(escrito !== '' && eurosACentimosOCero(escrito) === null);
    if (this.errorPrecio()) return;

    const cambios = this.cambios();
    if (Object.keys(cambios).length === 0) {
      this.editando.set(false);
      return;
    }
    this.ocupado.set(true);
    this.fallo.set(null);
    const r = await this.puerta.llamar(
      'updateWedding',
      { weddingId: this.ficha().weddingId, cambios },
      (crudo) => (objeto(crudo)['ok'] === true ? true : null),
    );
    this.ocupado.set(false);

    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    this.editando.set(false);
    this.aviso.set('editada');
    this.editada.emit();
  }

  protected async borrar(): Promise<void> {
    if (!this.coincide()) return;
    this.ocupado.set(true);
    this.fallo.set(null);
    const r = await this.puerta.llamar(
      'deleteWedding',
      { weddingId: this.ficha().weddingId, confirmarSlug: this.escrito().trim() },
      (crudo) => (objeto(crudo)['ok'] === true ? lista(objeto(crudo)['avisos']) : null),
    );
    this.ocupado.set(false);

    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    this.borrando.set(false);
    this.borrada.emit();
  }

  protected textoDe(f: FalloGestion, t: (clave: string) => string): string {
    return textoDeFalloSuperadmin(f, t);
  }
}
