import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Panel privado de la pareja. Chunk diferido: no entra en la web pública. */
@Component({
  selector: 'np-panel-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main><h1>Panel</h1></main>`,
})
export class PanelShell {}
