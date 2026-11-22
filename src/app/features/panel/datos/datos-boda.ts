import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import { horaDeReloj } from '../../../shared/zona-horaria';
import { MODOS_ACCESO, type ModoAcceso } from '../../../core/acceso/acceso';
import { PUERTA_INVITADOS } from '../../../core/invitados/invitados-gateway';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import { BodaStore } from '../boda.store';
import { esTipoDeCeremonia, type TipoDeCeremonia } from '../boda';

/**
 * Los datos de la boda que fija la pareja.
 *
 * La **hora de la ceremonia** y **cómo entran los invitados**. Las dos están
 * aquí y no en el alta de superadmin por la misma razón de negocio: quien vende
 * el servicio no tiene por qué saber a qué hora es la ceremonia ni si la pareja
 * quiere la web abierta, y al contratar lo normal es que aún no lo hayan
 * decidido. Ver D-28.
 *
 * La fecha se enseña pero no se edita todavía: cambiarla mueve las fechas de
 * toda la checklist, y eso merece su propia pantalla con su aviso.
 */
@Component({
  selector: 'np-datos-boda',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpField,
    NpInput,
    NpIcon,
  ],
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

        <form [formGroup]="formulario" (ngSubmit)="guardar()" class="db__form">
          <div class="db__pareja">
            <np-field [label]="t('panel.datos.nombreA')" [required]="true" [error]="errorNombre()">
              <input npInput formControlName="partnerA" autocomplete="off" />
            </np-field>
            <np-field [label]="t('panel.datos.nombreB')" [required]="true">
              <input npInput formControlName="partnerB" autocomplete="off" />
            </np-field>
          </div>

          <np-field
            [label]="t('panel.datos.fecha')"
            [required]="true"
            [hint]="t('panel.datos.fechaPista')"
            [error]="errorFecha()"
          >
            <input npInput type="date" formControlName="fecha" />
          </np-field>

          <fieldset class="db__tipo">
            <legend>{{ t('panel.datos.ceremonia') }}</legend>
            @for (tipo of tipos; track tipo) {
              <label class="db__modo">
                <input
                  type="radio"
                  formControlName="ceremonia"
                  [value]="tipo"
                  [attr.value]="tipo"
                />
                <span>
                  <strong>{{ t('panel.datos.ceremoniaTipo.' + tipo) }}</strong>
                </span>
              </label>
            }
            @if (formulario.controls.ceremonia.value === '') {
              <small class="db__aviso">{{ t('panel.datos.ceremoniaSinIndicar') }}</small>
            }
          </fieldset>

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

        <section class="db__bloque">
          <h3>{{ t('panel.datos.lugares') }}</h3>
          <p>{{ t('panel.datos.lugaresAyuda') }}</p>
          <a npButton variant="secondary" routerLink="/panel/map">
            <np-icon name="map-pin" />
            {{ t('panel.datos.lugaresIr') }}
          </a>
        </section>

        <section class="db__bloque">
          <h3>{{ t('panel.acceso.titulo') }}</h3>
          <p>{{ t('panel.acceso.ayuda') }}</p>

          <!--
            Cada modo con su nombre y lo que implica debajo. No es relleno: de
            esta elección depende que la web pida identificarse, y «nombre +
            cuatro dígitos» no se entiende sin leer qué pasa si un invitado no
            tiene teléfono.
          -->
          <div class="db__modos">
            @for (modo of modos; track modo) {
              <label class="db__modo">
                <input
                  type="radio"
                  name="modoAcceso"
                  [value]="modo"
                  [checked]="modoActual() === modo"
                  [disabled]="guardandoModo()"
                  (change)="cambiarModo(modo)"
                />
                <span>
                  <strong>
                    <np-icon [name]="iconoDe(modo)" />
                    {{ t('panel.acceso.modo.' + modo) }}
                  </strong>
                  <small>{{ t('panel.acceso.modoAyuda.' + modo) }}</small>
                </span>
              </label>
            }
          </div>

          <!--
            El aviso que de verdad importa: con teléfono de por medio, quien no
            lo tenga en la lista se queda fuera, y eso solo se descubre el día
            que un invitado llama por teléfono a la pareja.
          -->
          @if (modoActual() !== 'open' && sinTelefono() > 0) {
            <np-alert status="attention" [heading]="t('panel.acceso.sinTelefono.titulo')">
              <p>{{ t('panel.acceso.sinTelefono.ayuda', { n: sinTelefono() }) }}</p>
              <a routerLink="/panel/guests">{{ t('panel.acceso.sinTelefono.verLista') }}</a>
            </np-alert>
          }

          @if (modoGuardado()) {
            <p class="db__hecho">
              <np-icon name="check-circle" weight="fill" />
              {{ t('panel.datos.guardado') }}
            </p>
          }
        </section>

        <section class="db__bloque">
          <h3>{{ t('panel.acompanantes.titulo') }}</h3>
          <p>{{ t('panel.acompanantes.ayuda') }}</p>

          <label class="db__interruptor">
            <input
              type="checkbox"
              [checked]="permiteAcompanantes()"
              [disabled]="guardandoAcompanantes()"
              (change)="cambiarAcompanantes($event)"
            />
            <span>{{ t('panel.acompanantes.permitir') }}</span>
          </label>

          <!--
            El cupo es por invitado y se pone en su ficha. Decirlo aquí evita el
            viaje de ida y vuelta: con el interruptor encendido y todos los cupos
            a cero, no pasa nada y no hay forma de adivinar por qué.
          -->
          @if (permiteAcompanantes()) {
            <np-alert status="info" [heading]="t('panel.acompanantes.cupo.titulo')">
              <p>{{ t('panel.acompanantes.cupo.ayuda') }}</p>
              <a routerLink="/panel/guests">{{ t('panel.acompanantes.cupo.verLista') }}</a>
            </np-alert>
          }

          @if (acompanantesGuardado()) {
            <p class="db__hecho">
              <np-icon name="check-circle" weight="fill" />
              {{ t('panel.datos.guardado') }}
            </p>
          }
        </section>
      </section>
    </ng-container>
  `,
  styles: `
    .db__interruptor {
      display: flex;
      align-items: center;
      gap: var(--np-space-3);
      min-block-size: var(--np-tap-target);
      font-size: var(--np-text-base);
    }
    .db__interruptor input {
      inline-size: 1.25rem;
      block-size: 1.25rem;
    }
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
    .db__bloque {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      padding-block-start: var(--np-space-5);
      border-block-start: 1px solid var(--np-surface-border);
    }
    .db__bloque h3 {
      margin: 0;
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-semibold);
    }
    .db__bloque > p {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .db__modos {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
    }
    .db__modo {
      display: flex;
      align-items: flex-start;
      gap: var(--np-space-3);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      cursor: pointer;
    }
    .db__modo:has(input:checked) {
      border-color: var(--np-surface-text);
      box-shadow: inset 0 0 0 1px var(--np-surface-text);
    }
    .db__modo input {
      margin-block-start: 0.25rem;
      accent-color: var(--np-surface-text);
    }
    .db__modo strong {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      font-weight: var(--np-weight-medium);
    }
    .db__modo small {
      display: block;
      margin-block-start: var(--np-space-1);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-xs);
    }
    .db__pareja {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--np-space-3);
    }
    .db__tipo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      border: 0;
    }
    .db__tipo legend {
      padding: 0;
      margin-block-end: var(--np-space-1);
      font-weight: var(--np-weight-medium);
    }
    @media (max-width: 30rem) {
      .db__pareja {
        grid-template-columns: 1fr;
      }
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
  private readonly invitados = inject(PUERTA_INVITADOS);
  private readonly fb = inject(FormBuilder);

  private readonly i18n = inject(TranslocoService);

  protected readonly tipos: readonly TipoDeCeremonia[] = ['civil', 'religious'];

  protected readonly formulario = this.fb.nonNullable.group({
    partnerA: [this.store.boda()?.pareja.partnerA ?? ''],
    partnerB: [this.store.boda()?.pareja.partnerB ?? ''],
    fecha: [diaIso(this.store.boda()?.weddingDate ?? null)],
    ceremonia: [(this.store.boda()?.ceremonyType ?? '') as TipoDeCeremonia | ''],
    hora: [this.store.boda()?.weddingTime ?? ''],
  });

  protected readonly errorNombre = signal<string | null>(null);
  protected readonly errorFecha = signal<string | null>(null);

  protected readonly modos = MODOS_ACCESO;
  protected readonly guardandoModo = signal(false);
  protected readonly modoGuardado = signal(false);
  protected readonly modoActual = computed(() => this.store.boda()?.guestAccessMode ?? 'open');

  /**
   * Cuántos invitados no podrían entrar en los modos que piden teléfono.
   *
   * Sale de la lista, que es la única fuente: `guests` está cerrada a lectura
   * directa (regla 2).
   */
  protected readonly sinTelefono = signal(0);

  protected readonly guardando = signal(false);
  protected readonly guardado = signal(false);
  protected readonly fallo = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly hayHora = computed(() => this.store.boda()?.weddingTime !== null);

  constructor() {
    void this.contarSinTelefono();
  }

  private async contarSinTelefono(): Promise<void> {
    const resultado = await this.invitados.listar();
    if (resultado.ok) {
      this.sinTelefono.set(resultado.invitados.filter((i) => !i.phone).length);
    }
  }

  protected iconoDe(modo: ModoAcceso): NpIconName {
    if (modo === 'open') return 'eye';
    return modo === 'phone' ? 'device-mobile' : 'lock-simple';
  }

  protected readonly guardandoAcompanantes = signal(false);
  protected readonly acompanantesGuardado = signal(false);
  protected readonly permiteAcompanantes = computed(
    () => this.store.boda()?.allowGuestAddedCompanions === true,
  );

  protected async cambiarAcompanantes(evento: Event): Promise<void> {
    const permitir = (evento.target as HTMLInputElement).checked;

    this.guardandoAcompanantes.set(true);
    this.acompanantesGuardado.set(false);
    const ok = await this.store.guardarAcompanantes(permitir);
    this.guardandoAcompanantes.set(false);
    this.fallo.set(!ok);
    this.acompanantesGuardado.set(ok);
  }

  protected async cambiarModo(modo: ModoAcceso): Promise<void> {
    this.guardandoModo.set(true);
    this.modoGuardado.set(false);
    const ok = await this.store.guardarModoAcceso(modo);
    this.guardandoModo.set(false);
    this.fallo.set(!ok);
    this.modoGuardado.set(ok);
  }

  protected async guardar(): Promise<void> {
    const v = this.formulario.getRawValue();
    const partnerA = v.partnerA.trim();
    const partnerB = v.partnerB.trim();
    const hora = v.hora.trim();

    this.errorNombre.set(
      partnerA === '' || partnerB === '' ? this.i18n.translate('panel.datos.nombreVacio') : null,
    );

    const dia = v.fecha === '' ? null : new Date(v.fecha);
    const diaValido = dia !== null && !Number.isNaN(dia.getTime());
    this.errorFecha.set(diaValido ? null : this.i18n.translate('panel.datos.fechaIlegible'));

    // Vacío significa «quítala», no «guarda una hora vacía».
    const horaValida = hora === '' || horaDeReloj(hora) !== null;
    this.error.set(horaValida ? null : this.i18n.translate('panel.datos.horaIlegible'));

    if (this.errorNombre() || this.errorFecha() || this.error() || !diaValido) return;

    this.guardando.set(true);
    this.guardado.set(false);
    const ok = await this.store.guardarDatos({
      partnerA,
      partnerB,
      weddingDate: dia,
      ceremonyType: esTipoDeCeremonia(v.ceremonia) ? v.ceremonia : null,
      weddingTime: hora === '' ? null : hora,
    });
    this.guardando.set(false);
    this.fallo.set(!ok);
    this.guardado.set(ok);
  }

  protected async borrarHora(): Promise<void> {
    this.formulario.controls.hora.setValue('');
    await this.guardar();
  }
}

/** `'2027-06-12'` del día guardado (medianoche UTC), o `''` sin día. */
function diaIso(fecha: Date | null): string {
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha.toISOString().slice(0, 10) : '';
}
