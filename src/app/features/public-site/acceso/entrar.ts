import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { minutosDeEspera, type FalloAcceso, type ModoAcceso } from '../../../core/acceso/acceso';
import { SesionInvitado } from '../../../core/firebase/sesion-invitado';

/**
 * La puerta: lo primero que ve un invitado cuando la boda no es abierta.
 *
 * Está diseñada para alguien que abre un enlace de WhatsApp andando por la
 * calle, no para alguien sentado delante de un portátil. De ahí casi todo lo
 * que tiene:
 *
 * - **Una sola pregunta por pantalla** en modo teléfono, dos en modo nombre.
 * - `inputmode="numeric"` en los dígitos, para que salga el teclado de números
 *   y no el de letras.
 * - El nombre con `autocapitalize` y `autocomplete` puestos: lo rellena el
 *   móvil y no hay que teclearlo.
 * - **El mensaje de fallo es uno solo**, porque el servidor manda uno solo
 *   (regla 3). Decir «ese nombre no está en la lista» convertiría esto en un
 *   buscador de invitados para cualquiera.
 */
@Component({
  selector: 'np-entrar',
  imports: [ReactiveFormsModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main class="ent">
        <div class="ent__tarjeta">
          <p class="ent__boda">{{ nombres() }}</p>
          <h1>{{ t('publico.acceso.titulo') }}</h1>
          <p class="ent__ayuda">{{ t('publico.acceso.ayuda.' + modo()) }}</p>

          <form [formGroup]="formulario" (ngSubmit)="entrar()">
            @if (modo() === 'name_phone4') {
              <label>
                <span>{{ t('publico.acceso.campo.nombre') }}</span>
                <input
                  formControlName="nombre"
                  type="text"
                  autocomplete="name"
                  autocapitalize="words"
                  enterkeyhint="next"
                  [attr.aria-describedby]="fallo() ? 'ent-fallo' : null"
                />
                <small>{{ t('publico.acceso.campo.nombrePista') }}</small>
              </label>
              <label>
                <span>{{ t('publico.acceso.campo.digitos') }}</span>
                <input
                  formControlName="digitos"
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  maxlength="4"
                  enterkeyhint="go"
                  class="ent__digitos"
                  [attr.aria-describedby]="fallo() ? 'ent-fallo' : null"
                />
                <small>{{ t('publico.acceso.campo.digitosPista') }}</small>
              </label>
            } @else {
              <label>
                <span>{{ t('publico.acceso.campo.telefono') }}</span>
                <input
                  formControlName="telefono"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel"
                  enterkeyhint="go"
                  [attr.aria-describedby]="fallo() ? 'ent-fallo' : null"
                />
                <small>{{ t('publico.acceso.campo.telefonoPista') }}</small>
              </label>
            }

            <!--
              El aviso se anuncia solo, para que un lector de pantalla lo diga al
              aparecer: quien no ve la pantalla se quedaría esperando sin
              enterarse de que ha fallado.
            -->
            @if (fallo(); as f) {
              <p class="ent__fallo" id="ent-fallo" role="alert">
                {{
                  f.tipo === 'demasiados-intentos'
                    ? t('publico.acceso.fallo.demasiados', { n: minutos(f) })
                    : t('publico.acceso.fallo.' + f.tipo)
                }}
              </p>
            }

            <button type="submit" [disabled]="entrando() || formulario.invalid">
              {{ entrando() ? t('publico.acceso.entrando') : t('publico.acceso.entrar') }}
            </button>
          </form>

          <p class="ent__pie">{{ t('publico.acceso.pie') }}</p>
        </div>
      </main>
    </ng-container>
  `,
  styles: `
    /* Primero móvil, y aquí no hay versión de escritorio que valga: esto se
       abre desde WhatsApp. La tarjeta se centra y no crece. */
    .ent {
      display: flex;
      align-items: center;
      justify-content: center;
      min-block-size: 100dvh;
      padding: var(--np-space-4);
      background: var(--np-marca-background, var(--np-surface-canvas));
      color: var(--np-marca-text, var(--np-surface-text));
    }
    .ent__tarjeta {
      inline-size: min(26rem, 100%);
      padding: var(--np-space-5);
      border-radius: var(--np-radius-lg);
      background: var(--np-marca-surface, var(--np-surface-surface));
    }
    .ent__boda {
      margin: 0;
      color: var(--np-marca-accent, var(--np-surface-text-muted));
      font-size: var(--np-text-sm);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .ent__tarjeta h1 {
      margin: var(--np-space-2) 0 var(--np-space-1);
      font-size: var(--np-text-2xl);
      font-weight: var(--np-weight-semibold);
    }
    .ent__ayuda {
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
      background: transparent;
      color: inherit;
      /* 16 px o más: por debajo, Safari en iOS hace zoom al enfocar y deja la
         página descuadrada. */
      font-size: 1rem;
    }
    .ent__digitos {
      inline-size: 7rem;
      letter-spacing: 0.4em;
    }
    small {
      font-size: var(--np-text-xs);
      opacity: 0.7;
    }
    .ent__fallo {
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
    .ent__pie {
      margin: var(--np-space-4) 0 0;
      font-size: var(--np-text-xs);
      opacity: 0.7;
      text-align: center;
    }
  `,
})
export class Entrar {
  private readonly sesion = inject(SesionInvitado);
  private readonly fb = inject(FormBuilder);

  readonly modo = input.required<ModoAcceso>();
  readonly slug = input.required<string>();
  /** Para que el invitado vea de qué boda es la puerta antes de dar sus datos. */
  readonly nombres = input('');
  /**
   * El nombre que venía en el enlace, si venía.
   *
   * Es comodidad, no identidad: lo trae el enlace para que no haya que
   * teclearlo en el móvil, y se puede corregir. Lo que de verdad identifica
   * siguen siendo los cuatro dígitos, que no viajan en la URL (D-34).
   */
  readonly nombrePrevio = input('');

  protected readonly entrando = signal(false);
  protected readonly fallo = signal<FalloAcceso | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: [''],
    digitos: [''],
    telefono: [''],
  });

  protected readonly minutos = (f: FalloAcceso) =>
    f.tipo === 'demasiados-intentos' ? minutosDeEspera(f.esperaMs) : 0;

  constructor() {
    // Los validadores dependen del modo, que llega como input, así que no
    // pueden estar en la declaración del grupo: ahí `modo()` todavía no existe.
    // En un efecto y no en un `queueMicrotask`: el microtask se ejecuta cuando
    // le toca, que puede ser después del primer envío, y entonces el formulario
    // se da por válido sin tener los cuatro dígitos.
    effect(() => this.ajustarValidadores(this.modo()));

    // Solo si el campo sigue vacío: si el invitado ya ha escrito, manda él.
    effect(() => {
      const previo = this.nombrePrevio().trim();
      if (previo !== '' && this.formulario.controls.nombre.value === '') {
        this.formulario.controls.nombre.setValue(previo);
      }
    });
  }

  private ajustarValidadores(modo: ModoAcceso): void {
    const c = this.formulario.controls;
    if (modo === 'phone') {
      c.telefono.setValidators([Validators.required]);
    } else {
      c.nombre.setValidators([Validators.required]);
      c.digitos.setValidators([Validators.required, Validators.pattern(/^\s*\d{4}\s*$/)]);
    }
    for (const control of [c.nombre, c.digitos, c.telefono]) control.updateValueAndValidity();
  }

  protected readonly credenciales = computed(() => this.formulario.getRawValue());

  protected async entrar(): Promise<void> {
    if (this.formulario.invalid || this.entrando()) return;

    this.entrando.set(true);
    this.fallo.set(null);

    const valores = this.formulario.getRawValue();
    const resultado = await this.sesion.entrar(
      this.slug(),
      this.modo() === 'phone'
        ? { telefono: valores.telefono }
        : { nombre: valores.nombre, digitos: valores.digitos },
    );

    this.entrando.set(false);
    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      // Los dígitos se borran y el nombre se queda: lo segundo casi nunca es lo
      // que falla, y hacerlo teclear otra vez es gratuito.
      this.formulario.controls.digitos.setValue('');
    }
  }
}
