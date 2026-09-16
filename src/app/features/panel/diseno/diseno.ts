import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SelectorPaleta } from './selector-paleta';
import { SelectorPlantilla } from './selector-plantilla';
import { SelectorPortada } from './selector-portada';

/**
 * La pantalla de diseño: plantilla, paleta y foto de portada, en ese orden.
 *
 * El orden importa. La plantilla decide la forma entera de la web, la paleta
 * solo la pinta y la foto va encima de las dos: elegir primero el color y
 * después la plantilla es elegir dos veces. Además una boda sin paleta y sin
 * foto se ve bien con lo que trae su plantilla; al revés no.
 */
@Component({
  selector: 'np-diseno',
  imports: [SelectorPlantilla, SelectorPaleta, SelectorPortada],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ds">
      <np-selector-plantilla />
      <hr class="ds__separador" />
      <np-selector-paleta />
      <hr class="ds__separador" />
      <np-selector-portada />
    </div>
  `,
  styles: `
    .ds {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-5);
    }
    .ds__separador {
      inline-size: 100%;
      margin: 0;
      border: 0;
      border-block-start: 1px solid var(--np-surface-border);
    }
  `,
})
export class Diseno {}
