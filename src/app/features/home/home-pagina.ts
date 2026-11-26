import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';

import { NP_ICON_SPRITE } from '../../design-system/icons/icon-sprite.providers';
import { urlDeFuentesHome, type ContenidoHome } from './home';
import { NpHomeCierre } from './home-cierre';
import { NpHomeHero } from './home-hero';
import { NpHomePaneles } from './home-paneles';
import { NpHomePasos } from './home-pasos';
import { NpHomePlanes } from './home-planes';
import { NpHomeTarjetas } from './home-tarjetas';
import { variablesDeHome } from './home-tema';

/**
 * La HOME entera: una sola página vertical, sin menú.
 *
 * Es **presentacional**: recibe el contenido y lo pinta. No sabe de dónde viene,
 * y por eso la misma pieza sirve en la web pública y en la vista previa del
 * superadmin.
 *
 * Es un *container* de CSS (`home`): las secciones se adaptan al ancho de **esta
 * caja**, no al de la ventana. Así la vista previa estrecha del editor enseña
 * la versión móvil de verdad, no la de escritorio comprimida.
 */
@Component({
  selector: 'np-home-pagina',
  imports: [NpHomeHero, NpHomeTarjetas, NpHomePasos, NpHomePaneles, NpHomePlanes, NpHomeCierre],
  providers: [{ provide: NP_ICON_SPRITE, useValue: '/icons/home.svg' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style]': 'variables()', '[attr.data-plantilla]': 'contenido().template' },
  template: `
    <np-home-hero [hero]="contenido().hero" [plantilla]="contenido().template" />

    @if (contenido().promesa.enabled) {
      <np-home-tarjetas
        variante="promesa"
        [titulo]="contenido().promesa.title"
        [intro]="contenido().promesa.intro"
        [items]="contenido().promesa.items"
      />
    }

    @if (contenido().pasos.enabled) {
      <np-home-pasos
        [titulo]="contenido().pasos.title"
        [intro]="contenido().pasos.intro"
        [items]="contenido().pasos.items"
      />
    }

    @if (contenido().paneles.enabled) {
      <np-home-paneles
        [titulo]="contenido().paneles.title"
        [intro]="contenido().paneles.intro"
        [paneles]="[contenido().paneles.basico, contenido().paneles.extendido]"
      />
    }

    @if (contenido().libertad.enabled) {
      <div class="hg-alt">
        <np-home-tarjetas
          variante="libertad"
          [titulo]="contenido().libertad.title"
          [intro]="contenido().libertad.intro"
          [items]="contenido().libertad.items"
          [cierre]="contenido().libertad.closing"
        />
      </div>
    }

    @if (contenido().planes.enabled) {
      <np-home-planes
        [titulo]="contenido().planes.title"
        [intro]="contenido().planes.intro"
        [planes]="[contenido().planes.basico, contenido().planes.extendido]"
      />
    }

    <np-home-cierre [cierre]="contenido().cierre" [pie]="contenido().pie" />
  `,
  styles: `
    :host {
      display: block;
      container: home / inline-size;
      background: var(--h-bg);
      color: var(--h-text);
      font-family: var(--h-font-body);
      font-size: 1rem;
      line-height: 1.5;
    }
    .hg-alt {
      background: var(--h-bg-alt);
    }
  `,
})
export class NpHomePagina {
  readonly contenido = input.required<ContenidoHome>();

  private readonly documento = inject(DOCUMENT);
  protected readonly variables = computed(() => variablesDeHome(this.contenido()));

  constructor() {
    // Las tipografías de este contenido, y solo esas. Idempotente: no duplica
    // el enlace si ya está, y no lo retira al cambiar (una hoja descargada no
    // molesta, y quitarla provocaría un parpadeo al volver).
    effect(() => {
      const url = urlDeFuentesHome(this.contenido());
      const cabecera = this.documento.head;
      if (!cabecera || cabecera.querySelector(`link[href="${url}"]`)) return;
      const enlace = this.documento.createElement('link');
      enlace.rel = 'stylesheet';
      enlace.href = url;
      cabecera.appendChild(enlace);
    });
  }
}
