import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import { fechaLarga } from '../../../shared/fecha';
import { horaDeReloj } from '../../../shared/zona-horaria';
import { BodaStore } from '../boda.store';

/**
 * Los datos de la boda que fija la pareja.
 *
 * De momento, la **hora de la ceremonia**. Está aquí y no en el alta de
 * superadmin por una razón de negocio, no de comodidad: quien vende el
 * servicio no tiene por qué conocer la hora de la ceremonia, y cuando se
 * contrata la web lo normal es que la pareja aún no la haya cerrado. Ver D-28.
 *
 * La fecha se enseña pero no se edita todavía: cambiarla mueve las fechas de
 * toda la checklist, y eso merece su propia pantalla con su aviso.
 */
@Component({
  selector: 'np-datos-boda',
  imports: [ReactiveFormsModule, TranslocoDirective, NpAlert, NpButton, NpField, NpInput, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="db">
        <header class="db__intro">
          <h2>{{ t('panel.datos.titulo') }}</h2>
          <p>{{ t('panel.datos.ayuda') }}</p>
        </header>

        @if (fallo()) {
          <np-alert status="declined" [heading]="t('panel.datos.fallo')">
            <p>{{ store.error() }}</p>
          </np-alert>
        }

        <dl class="db__dato">
          <dt>
            <np-icon name="calendar" />
            {{ t('panel.datos.fecha') }}
          </dt>
          <dd>{{ fecha() || t('panel.datos.sinFecha') }}</dd>
        </dl>

        <form [formGroup]="formulario" (ngSubmit)="guardar()" class="db__form">
          <np-field
            [label]="t('panel.datos.hora')"
            [hint]="t('panel.datos.horaPista')"
            [error]="error()"
          >
            <input npInput type="time" formControlName="hora" />
          </np-field>

          <!--
            Mientras no haya hora, la cuenta atrás de la web enseña solo días.
            Decirlo aquí evita la pregunta «¿por qué no salen las horas?».
          -->
          @if (!hayHora()) {
            <p class="db__aviso">
              <np-icon name="info" />
              {{ t('panel.datos.sinHoraAviso') }}
            </p>
          }

          <div class="db__acciones">
            <button npButton type="submit" [loading]="guardando()">
              <np-icon name="check" />
              {{ t('common.save') }}
            </button>
            @if (hayHora()) {
              <button npButton variant="ghost" type="button" (click)="borrarHora()">
                {{ t('panel.datos.quitarHora') }}
              </button>
            }
          </div>

          @if (guardado()) {
            <p class="db__hecho">
              <np-icon name="check-circle" weight="fill" />
              {{ t('panel.datos.guardado') }}
            </p>
          }
        </form>
      </section>
    </ng-container>
  `,
  styles: `
    /* Primero móvil: una columna, y el ancho se limita solo cuando sobra. */
    .db {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-5);
      max-inline-size: 34rem;
    }
    .db__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .db__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .db__dato {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--np-space-1) var(--np-space-3);
      margin: 0;
      padding: var(--np-space-3) var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .db__dato dt {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .db__dato dd {
      margin: 0;
      font-weight: var(--np-weight-medium);
    }
    .db__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .db__aviso,
    .db__hecho {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .db__hecho {
      color: var(--np-status-confirmed-text);
    }
    .db__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
  `,
})
export class DatosBoda {
  protected readonly store = inject(BodaStore);
  private readonly fb = inject(FormBuilder);

  protected readonly formulario = this.fb.nonNullable.group({
    hora: [this.store.boda()?.weddingTime ?? ''],
  });

  protected readonly guardando = signal(false);
  protected readonly guardado = signal(false);
  protected readonly fallo = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly hayHora = computed(() => this.store.boda()?.weddingTime !== null);

  protected readonly fecha = computed(() => {
    const boda = this.store.boda();
    return boda ? fechaLarga(boda.weddingDate, 'es') : '';
  });

  protected async guardar(): Promise<void> {
    const escrita = this.formulario.controls.hora.value.trim();

    // Vacío significa «quítala», no «guarda una hora vacía».
    if (escrita !== '' && !horaDeReloj(escrita)) {
      this.error.set('panel.datos.horaIlegible');
      return;
    }

    this.error.set(null);
    await this.escribir(escrita === '' ? null : escrita);
  }

  protected async borrarHora(): Promise<void> {
    this.formulario.controls.hora.setValue('');
    await this.escribir(null);
  }

  private async escribir(hora: string | null): Promise<void> {
    this.guardando.set(true);
    this.guardado.set(false);

    const ok = await this.store.guardarHora(hora);

    this.guardando.set(false);
    this.fallo.set(!ok);
    this.guardado.set(ok);
  }
}
