import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { minutosDeEspera, type FalloAcceso, type ModoAcceso } from '../../../core/acceso/acceso';
import { SesionInvitado } from '../../../core/firebase/sesion-invitado';

/**
 * «Confirma que eres tú»: de sesión de enlace a sesión verificada (D-34).
 *
 * El invitado ya está dentro porque abrió el enlace que le mandó la pareja, y
 * eso le deja ver la web. Para confirmar, elegir menú o apuntar acompañantes
 * hace falta algo que solo tenga él: los cuatro últimos dígitos de su móvil.
 *
 * **Por qué, dicho en la pantalla.** Pedir datos sin explicar para qué parece
 * un trámite inventado, y el invitado está de pie en la cocina. La frase es
 * «estos enlaces se reenvían»; con eso se entiende solo.
 *
 * Es deliberadamente más corto que la puerta (`acceso/entrar.ts`): aquí ya
 * sabemos quién dice ser, así que no se le vuelve a pedir el nombre.
 */
@Component({
  selector: 'np-verificar',
  imports: [ReactiveFormsModule, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="vf">
        <h2>
          <np-icon name="lock-simple" />
          {{ t('publico.verificar.titulo') }}
        </h2>
        <p class="vf__porque">{{ t('publico.verificar.porque') }}</p>

        <form [formGroup]="formulario" (submit)="enviar($event)" novalidate>
          @if (modo() === 'phone') {
            <label>
              <span>{{ t('publico.acceso.campo.telefono') }}</span>
              <input
                formControlName="telefono"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                enterkeyhint="go"
                [attr.aria-describedby]="fallo() ? 'vf-fallo' : null"
              />
            </label>
          } @else {
            <label>
              <span>{{ t('publico.acceso.campo.digitos') }}</span>
              <input
                formControlName="digitos"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                maxlength="4"
                enterkeyhint="go"
                class="vf__digitos"
                [attr.aria-describedby]="fallo() ? 'vf-fallo' : null"
              />
              <small>{{ t('publico.acceso.campo.digitosPista') }}</small>
            </label>
          }

          @if (fallo(); as f) {
            <p class="vf__fallo" id="vf-fallo" role="alert">
              {{
                f.tipo === 'demasiados-intentos'
                  ? t('publico.acceso.fallo.demasiados', { n: minutos(f) })
                  : t('publico.verificar.fallo.' + f.tipo)
              }}
            </p>
          }

          <button type="submit" [disabled]="enviando() || formulario.invalid">
            {{ enviando() ? t('publico.verificar.enviando') : t('publico.verificar.enviar') }}
          </button>
        </form>
      </section>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0 0 var(--np-space-2);
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .vf__porque {
      margin: 0 0 var(--np-space-4);
      font-size: var(--np-text-sm);
      opacity: 0.8;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    input {
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid currentColor;
      border-radius: var(--np-radius-md);
      background: var(--np-marca-surface, var(--np-surface-surface));
      color: inherit;
      font: inherit;
      /* 16 px o más: por debajo, Safari en iOS hace zoom al enfocar. */
      font-size: 1rem;
    }
    .vf__digitos {
      inline-size: 7rem;
      letter-spacing: 0.4em;
    }
    small {
      font-size: var(--np-text-xs);
      opacity: 0.7;
    }
    .vf__fallo {
      margin: 0;
      padding: var(--np-space-3);
      border-radius: var(--np-radius-md);
      background: var(--np-declined-bg);
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
    button {
      min-block-size: var(--np-tap-target);
      border: 0;
      border-radius: var(--np-radius-md);
      background: var(--np-marca-primary, var(--np-surface-text));
      color: var(--np-marca-background, var(--np-surface-canvas));
      font: inherit;
      font-weight: var(--np-weight-medium);
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: default;
    }
  `,
})
export class NpVerificar {
  private readonly sesion = inject(SesionInvitado);
  private readonly fb = inject(FormBuilder);

  readonly modo = input.required<ModoAcceso>();
  /** Ya está verificado: quien lo pidió puede volver a cargar lo suyo. */
  readonly verificado = output<void>();

  protected readonly enviando = signal(false);
  protected readonly fallo = signal<FalloAcceso | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    digitos: [''],
    telefono: [''],
  });

  protected readonly minutos = (f: FalloAcceso) =>
    f.tipo === 'demasiados-intentos' ? minutosDeEspera(f.esperaMs) : 0;

  constructor() {
    // En un efecto y no en la declaración del grupo: el modo llega como input y
    // ahí todavía no existe. Y no en un `queueMicrotask`, que puede ejecutarse
    // después del primer envío y dar por válido un formulario vacío.
    effect(() => this.ajustarValidadores(this.modo()));
  }

  private ajustarValidadores(modo: ModoAcceso): void {
    const c = this.formulario.controls;

    if (modo === 'phone') {
      c.telefono.setValidators([Validators.required]);
      c.digitos.setValidators([]);
    } else {
      c.telefono.setValidators([]);
      c.digitos.setValidators([Validators.required, Validators.pattern(/^\s*\d{4}\s*$/)]);
    }

    for (const control of [c.digitos, c.telefono]) control.updateValueAndValidity();
  }

  protected async enviar(evento?: Event): Promise<void> {
    evento?.preventDefault();
    if (this.formulario.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.fallo.set(null);

    const valores = this.formulario.getRawValue();
    const resultado = await this.sesion.verificar(
      this.modo() === 'phone' ? { telefono: valores.telefono } : { digitos: valores.digitos },
    );

    this.enviando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      // Los dígitos se borran: lo que ha fallado es justo eso.
      this.formulario.controls.digitos.setValue('');
      return;
    }

    this.verificado.emit();
  }
}
