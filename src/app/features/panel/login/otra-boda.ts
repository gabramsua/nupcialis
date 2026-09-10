import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { PUERTA_AUTH } from '../../../core/auth/auth-gateway';

/**
 * Has entrado con la cuenta de otra boda.
 *
 * Parece un caso raro y no lo es: quien organiza su boda mira también la de sus
 * amigos, y el navegador recuerda la última sesión. Sin esta pantalla, el
 * mensaje sería un "acceso denegado" que no explica nada y que asusta.
 */
@Component({
  selector: 'np-otra-boda',
  imports: [NpButton, NpEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <np-empty-state
        icon="user"
        title="Esta no es vuestra boda"
        description="Has entrado con una cuenta que pertenece a otra boda. Sal y vuelve a entrar con la vuestra."
      >
        <button npButton variant="primary" (click)="salir()">Salir de esta cuenta</button>
      </np-empty-state>
    </main>
  `,
  styles: `
    main {
      display: grid;
      place-content: center;
      min-block-size: 100dvh;
    }
  `,
})
export class OtraBoda {
  private readonly puerta = inject(PUERTA_AUTH);

  protected async salir(): Promise<void> {
    await this.puerta.salir();
    location.assign('/panel/acceso');
  }
}
