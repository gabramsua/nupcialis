import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpCard } from '../../../design-system/components/card/card';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import { ErrorAuth, MENSAJES_AUTH, PUERTA_AUTH } from '../../../core/auth/auth-gateway';
import { traducirErrorAuth } from '../../../core/firebase/auth-gateway.firebase';

/** Acceso de la pareja a su panel. */
@Component({
  selector: 'np-login',
  imports: [ReactiveFormsModule, NpAlert, NpButton, NpCard, NpField, NpInput, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <np-card heading="Entrar a vuestro panel">
        @if (error(); as e) {
          <np-alert status="declined">{{ MENSAJES[e] }}</np-alert>
        }

        @if (enviadoRecuperacion()) {
          <np-alert status="confirmed">
            Si ese correo tiene cuenta, te llega un enlace para cambiar la contraseña.
          </np-alert>
        }

        <form [formGroup]="form" (ngSubmit)="entrar()">
          <np-field label="Correo" [required]="true">
            <input npInput type="email" formControlName="email" autocomplete="email" />
          </np-field>

          <np-field label="Contraseña" [required]="true">
            <input
              npInput
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
          </np-field>

          <button npButton variant="primary" type="submit" [loading]="cargando()">
            @if (cargando()) {
              <np-icon name="spinner-gap" />
            }
            Entrar
          </button>
        </form>

        <div class="np-login__otros">
          <button npButton variant="secondary" type="button" (click)="entrarConGoogle()">
            Entrar con Google
          </button>
          <button npButton variant="ghost" size="sm" type="button" (click)="recuperar()">
            He olvidado la contraseña
          </button>
        </div>
      </np-card>
    </main>
  `,
  styles: `
    main {
      display: grid;
      place-content: center;
      min-block-size: 100dvh;
      padding: var(--np-space-4);
    }
    np-card {
      inline-size: min(24rem, 100%);
    }
    form,
    .np-login__otros {
      display: grid;
      gap: var(--np-space-3);
      margin-block-start: var(--np-space-4);
    }
    .np-login__otros {
      padding-block-start: var(--np-space-4);
      border-block-start: 1px solid var(--np-surface-border);
    }
  `,
})
export class Login {
  private readonly puerta = inject(PUERTA_AUTH);
  private readonly router = inject(Router);
  /**
   * A dónde se va tras entrar. Esta pantalla sirve a la pareja y al superadmin,
   * y mandar a los dos a `/panel` dejaba al superadmin en la landing: en el
   * dominio raíz `/panel` no es el de ninguna boda. Lo decide la ruta.
   */
  private readonly destino =
    (inject(ActivatedRoute).snapshot.data['destino'] as string | undefined) ?? '/panel';

  protected readonly MENSAJES = MENSAJES_AUTH;
  protected readonly cargando = signal(false);
  protected readonly error = signal<ErrorAuth | null>(null);
  protected readonly enviadoRecuperacion = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async entrar(): Promise<void> {
    if (this.form.invalid || this.cargando()) return;
    await this.intentar(() => {
      const { email, password } = this.form.getRawValue();
      return this.puerta.entrarConEmail(email, password);
    });
  }

  protected async entrarConGoogle(): Promise<void> {
    await this.intentar(() => this.puerta.entrarConGoogle());
  }

  protected async recuperar(): Promise<void> {
    const email = this.form.controls.email.value;
    if (!email) {
      this.form.controls.email.markAsTouched();
      return;
    }
    // Se responde igual exista o no la cuenta: decir "ese correo no existe"
    // permitiría averiguar quién está dado de alta.
    try {
      await this.puerta.enviarRecuperacion(email);
    } catch {
      /* se ignora a propósito */
    }
    this.enviadoRecuperacion.set(true);
  }

  private async intentar(accion: () => Promise<void>): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    this.enviadoRecuperacion.set(false);
    try {
      await accion();
      const llegado = await this.router.navigate([this.destino]);
      if (!environment.production) {
        console.warn(
          `[Login] Entrada correcta. Navegación a ${this.destino}: ${llegado ? 'hecha' : 'cancelada'}. ` +
            `URL ahora: ${this.router.url}`,
        );
      }
    } catch (e) {
      this.error.set(traducirErrorAuth((e as { code?: unknown })?.code));
    } finally {
      this.cargando.set(false);
    }
  }
}
