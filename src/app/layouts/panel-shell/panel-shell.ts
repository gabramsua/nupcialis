import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NpButton } from '../../design-system/components/button/button';
import { NpIcon } from '../../design-system/icons/icon';
import { PUERTA_AUTH } from '../../core/auth/auth-gateway';
import { SessionStore } from '../../core/auth/session.store';

/** Panel privado de la pareja. Chunk diferido: no entra en la web pública. */
@Component({
  selector: 'np-panel-shell',
  imports: [NpButton, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <span class="np-panel__marca">
        <np-icon name="diamond" weight="fill" />
        Nupcialis
      </span>
      <span class="np-panel__quien">{{ store.sesion().email }}</span>
      <button npButton variant="ghost" size="sm" (click)="salir()">Salir</button>
    </header>
    <main>
      <h1>Vuestro panel</h1>
      <p>Aquí irán los módulos de la boda.</p>
    </main>
  `,
  styles: `
    header {
      display: flex;
      align-items: center;
      gap: var(--np-space-3);
      padding: var(--np-space-3) var(--np-space-4);
      border-block-end: 1px solid var(--np-surface-border);
      background: var(--np-surface-surface);
    }
    .np-panel__marca {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      font-weight: var(--np-weight-semibold);
    }
    np-icon {
      color: var(--np-cat-rosa);
    }
    .np-panel__quien {
      margin-inline-start: auto;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    main {
      padding: var(--np-space-5) var(--np-space-4);
    }
    h1 {
      margin: 0 0 var(--np-space-2);
      font-size: var(--np-text-2xl);
      font-weight: var(--np-weight-semibold);
    }
  `,
})
export class PanelShell {
  protected readonly store = inject(SessionStore);
  private readonly puerta = inject(PUERTA_AUTH);

  protected async salir(): Promise<void> {
    await this.puerta.salir();
    location.assign('/panel/acceso');
  }
}
