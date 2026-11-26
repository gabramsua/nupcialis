import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import type { PlanContratado } from '../../../core/alta/alta-gateway';
import { PUERTA_LLAMADAS } from '../../../core/llamadas/llamadas-gateway';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { centimosATexto } from '../../../shared/dinero';
import { ESTADOS_PAGO, METODOS_PAGO, type EstadoPago, type MetodoPago } from '../gestion/gestion';
import { leerProveedores, tarifaDe, type Proveedor } from '../proveedores/proveedores';

/** Lo que se escribe en el alta sobre el cobro; el importe sigue siendo texto hasta enviar. */
export interface CobroEditable {
  readonly partnerId: string;
  readonly importe: string;
  readonly metodo: MetodoPago;
  readonly estado: EstadoPago;
  readonly fecha: string;
}

export const COBRO_VACIO: CobroEditable = {
  partnerId: '',
  importe: '',
  metodo: 'bizum',
  estado: 'pending',
  fecha: '',
};

/**
 * El cobro de una boda recién dada de alta (F0.7.7, D-25/D-26).
 *
 * Es opcional y vive aparte del alta: el alta no se hace depender del dinero.
 * Con proveedor, el importe se rellena con su tarifa mayorista del plan (hasta
 * que se escribe a mano) y el método es `partner_cash`, pendiente: lo cobró él
 * y aún no nos lo ha liquidado. Los proveedores se piden **al abrir esta
 * sección**, no al abrir el alta.
 */
@Component({
  selector: 'np-cobro-de-alta',
  imports: [ReactiveFormsModule, TranslocoDirective, NpField, NpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <fieldset class="cb" [formGroup]="form">
        <legend>{{ t('superadmin.alta.cobro.titulo') }}</legend>
        <np-field [label]="t('superadmin.alta.cobro.proveedor')">
          <select npInput formControlName="partnerId">
            <option value="">{{ t('superadmin.alta.cobro.directo') }}</option>
            @for (p of proveedores(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
        </np-field>
        <np-field [label]="t('superadmin.alta.cobro.importe')" [required]="true">
          <input
            npInput
            type="text"
            inputmode="decimal"
            formControlName="importe"
            (input)="importeTocado = true"
          />
        </np-field>
        <np-field [label]="t('superadmin.alta.cobro.metodo')">
          <select npInput formControlName="metodo">
            @for (m of metodos(); track m) {
              <option [value]="m">{{ t('superadmin.finanzas.metodo.' + m) }}</option>
            }
          </select>
        </np-field>
        <np-field [label]="t('superadmin.alta.cobro.estado')">
          <select npInput formControlName="estado">
            @for (e of estados; track e) {
              <option [value]="e">{{ t('superadmin.finanzas.estado.' + e) }}</option>
            }
          </select>
        </np-field>
        @if (form.controls.estado.value === 'paid') {
          <np-field [label]="t('superadmin.alta.cobro.fecha')">
            <input npInput type="date" formControlName="fecha" />
          </np-field>
        }
      </fieldset>
    </ng-container>
  `,
  styles: `
    .cb {
      display: grid;
      gap: var(--np-space-3);
      margin: 0;
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .cb legend {
      padding-inline: var(--np-space-1);
      font-weight: var(--np-weight-medium);
    }
  `,
})
export class CobroDeAlta {
  private readonly llamadas = inject(PUERTA_LLAMADAS);

  readonly plan = input.required<PlanContratado>();
  readonly value = model<CobroEditable>(COBRO_VACIO);

  protected readonly estados = ESTADOS_PAGO;
  protected readonly proveedores = signal<readonly Proveedor[]>([]);
  protected readonly metodos = signal<readonly MetodoPago[]>(
    METODOS_PAGO.filter((m) => m !== 'partner_cash'),
  );
  /** Una vez que se escribe el importe a mano, la tarifa deja de pisarlo. */
  protected importeTocado = false;

  protected readonly form = new FormGroup({
    partnerId: new FormControl('', { nonNullable: true }),
    importe: new FormControl('', { nonNullable: true }),
    metodo: new FormControl<MetodoPago>('bizum', { nonNullable: true }),
    estado: new FormControl<EstadoPago>('pending', { nonNullable: true }),
    fecha: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    void this.llamadas.llamar('listPartners', {}, leerProveedores).then((r) => {
      // Sin proveedores (o sin poder leerlos) el cobro directo sigue funcionando.
      if (r.ok) this.proveedores.set(r.datos.filter((p) => p.active));
    });

    this.form.controls.partnerId.valueChanges.subscribe((id) => {
      const conProveedor = id !== '';
      this.metodos.set(METODOS_PAGO.filter((m) => conProveedor || m !== 'partner_cash'));
      if (conProveedor) {
        this.form.patchValue({ metodo: 'partner_cash', estado: 'pending' });
      } else if (this.form.controls.metodo.value === 'partner_cash') {
        this.form.patchValue({ metodo: 'bizum' });
      }
      this.aplicarTarifa();
    });

    // Cambiar de plan en el alta cambia la tarifa que toca.
    effect(() => {
      this.plan();
      untracked(() => this.aplicarTarifa());
    });

    this.form.valueChanges.subscribe(() => this.value.set(this.form.getRawValue()));
    this.value.set(this.form.getRawValue());
  }

  private aplicarTarifa(): void {
    if (this.importeTocado) return;
    const proveedor = this.proveedores().find((p) => p.id === this.form.controls.partnerId.value);
    const tarifa = tarifaDe(proveedor, this.plan());
    this.form.controls.importe.setValue(tarifa ? centimosATexto(tarifa) : '');
  }
}
