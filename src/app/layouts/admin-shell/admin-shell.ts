import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Panel de superadmin. Chunk diferido. */
@Component({
  selector: 'np-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main><h1>Superadmin</h1></main>`,
})
export class AdminShell {}
