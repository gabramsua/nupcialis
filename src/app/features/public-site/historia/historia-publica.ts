import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { NpCabeceraBoda } from '../navegacion/cabecera-boda';
import { conCabecera, usarTemaDeLaBoda } from '../tema';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import type { ApartadoPublicoDeHistoria } from './historia';

/**
 * «Nuestra historia» como la lee el invitado.
 *
 * Los cinco apartados en su orden, cada uno con su título fijo, su texto y,
 * debajo, las fotos que la pareja haya subido para ese momento. Un apartado
 * sin texto ni fotos no se pinta: la historia se va leyendo a medida que los
 * novios la escriben, sin huecos con un título y nada debajo.
 *
 * El HTML llega ya saneado del servidor (regla de oro 5).
 */
@Component({
  selector: 'np-historia-publica',
  imports: [NpCabeceraBoda, RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style]': 'colores()' },
  template: `
    <ng-container *transloco="let t">
      @if (cabecera()) {
        <np-cabecera-boda [tenant]="tenant()" />
      }
      <main class="hp">
        @if (!cabecera()) {
          <a class="hp__volver" routerLink="/">
            <np-icon name="caret-left" />
            {{ t('publico.historia.volver') }}
          </a>
        }

        <header class="hp__cabecera">
          <h1>{{ t('publico.historia.titulo') }}</h1>
        </header>

        @if (apartados().length === 0) {
          <p class="hp__nada">
            <np-icon name="book-open" />
            {{ t('publico.historia.nada') }}
          </p>
        } @else {
          @for (apartado of apartados(); track apartado.clave) {
            <section class="hp__apartado">
              <h2>{{ t('publico.historia.apartado.' + apartado.clave) }}</h2>
              @if (apartado.html) {
                <div class="np-rico hp__texto" [innerHTML]="apartado.html"></div>
              }
              @if (apartado.fotos.length > 0) {
                <div class="hp__fotos" [class.hp__fotos--dos]="apartado.fotos.length > 1">
                  @for (foto of apartado.fotos; track foto.url) {
                    <img
                      class="hp__foto"
                      [src]="foto.url"
                      [alt]="
                        t('publico.historia.fotoDe', {
                          apartado: t('publico.historia.apartado.' + apartado.clave),
                        })
                      "
                      loading="lazy"
                    />
                  }
                </div>
              }
            </section>
          }
        }
      </main>
    </ng-container>
  `,
  styles: `
    .hp {
      display: grid;
      gap: 1.5rem;
      max-inline-size: 42rem;
      margin-inline: auto;
      padding: 1rem;
    }
    .hp__volver {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: inherit;
      font-size: 0.9rem;
      text-decoration: none;
      opacity: 0.75;
    }
    .hp__cabecera h1 {
      margin: 0;
      font-size: 1.8rem;
    }
    .hp__nada {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      opacity: 0.85;
    }
    .hp__apartado {
      display: grid;
      gap: 0.75rem;
    }
    .hp__apartado h2 {
      margin: 0;
      font-size: 1.25rem;
    }
    .hp__fotos {
      display: grid;
      gap: 0.75rem;
    }
    .hp__fotos--dos {
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    }
    .hp__foto {
      inline-size: 100%;
      block-size: auto;
      max-block-size: 32rem;
      border-radius: 1rem;
      /* Sin recortar: una foto vertical o panorámica se ve entera. */
      object-fit: contain;
    }
    /* Los títulos, con la letra de la plantilla de la pareja (D-55). */
    h1,
    h2 {
      font-family: var(--np-marca-titulos, inherit);
    }
  `,
})
export class NpHistoriaPublica {
  /** Lo que resuelve la ruta: la boda, con su historia ya saneada. */
  readonly tenant = input.required<ResultadoTenant>();

  protected readonly colores = usarTemaDeLaBoda(this.tenant);
  protected readonly cabecera = computed(() => conCabecera(this.tenant()));

  /** Solo los apartados con algo que leer o que mirar. */
  protected readonly apartados = computed<readonly ApartadoPublicoDeHistoria[]>(() => {
    const t = this.tenant();
    if (t.tipo !== 'ok') return [];
    return t.sitio.historia.filter((a) => a.fotos.length > 0 || textoVisible(a.html));
  });
}

/** Un editor vacío deja `<p><br></p>`: eso no es texto. */
function textoVisible(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s/g, '') !== '';
}
