import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { SesionInvitado } from '../../../core/firebase/sesion-invitado';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import { NpIcon } from '../../../design-system/icons/icon';
import { elNombreQueHaya, losDosNombres } from '../plantillas/portada';
import { estiloDeLaBoda } from '../tema';
import { elementosDeMenu, partirMenu, type ElementoMenu } from './menu';

const ACTIVO_SOLO_RUTA = {
  paths: 'exact',
  queryParams: 'ignored',
  fragment: 'ignored',
  matrixParams: 'ignored',
} as const;

/**
 * La cabecera de la web de varias páginas (plan completo).
 *
 * En escritorio es una barra horizontal con los primeros enlaces y un «Más»
 * para el resto, y el botón de confirmar siempre a la vista. En el móvil, una
 * barra con el nombre y un botón de menú que abre un cajón con los enlaces
 * agrupados («La boda» y «Participa») y el botón de confirmar abajo, al
 * alcance del pulgar.
 *
 * Se pinta con los colores y la letra de **esta** boda —la plantilla y la
 * paleta—, no con los del sistema, y por eso lleva su propio estilo en vez de
 * heredarlo: la misma cabecera cuelga de la portada y de cada página de módulo.
 */
@Component({
  selector: 'np-cabecera-boda',
  imports: [RouterLink, RouterLinkActive, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style]': 'estilo()',
    '(document:click)': 'alPulsarFuera($event)',
    '(document:keydown.escape)': 'cerrar()',
  },
  template: `
    <ng-container *transloco="let t">
      <header class="cb">
        <div class="cb__barra">
          <a class="cb__marca" routerLink="/" (click)="cerrar()">
            @if (losDos()) {
              {{ t('publico.pareja', nombres()) }}
            } @else {
              {{ unNombre() }}
            }
          </a>

          <nav class="cb__nav" [attr.aria-label]="t('publico.menu.principal')">
            <a
              class="cb__enlace"
              routerLink="/"
              routerLinkActive="cb__enlace--activo"
              [routerLinkActiveOptions]="soloRuta"
              ariaCurrentWhenActive="page"
            >
              {{ t('publico.menu.inicio') }}
            </a>
            @for (e of partes().enBarra; track e.clave + (e.fragmento ?? e.ruta)) {
              <a
                class="cb__enlace"
                [routerLink]="e.ruta"
                [fragment]="e.fragmento ?? undefined"
                [routerLinkActive]="e.fragmento ? '' : 'cb__enlace--activo'"
                [routerLinkActiveOptions]="soloRuta"
              >
                {{ e.titulo ?? t('publico.menu.' + e.clave) }}
              </a>
            }
            @if (partes().enMas.length > 0) {
              <div class="cb__mas">
                <button
                  type="button"
                  class="cb__enlace cb__boton-mas"
                  aria-haspopup="true"
                  [attr.aria-expanded]="masAbierto()"
                  (click)="alternarMas($event)"
                >
                  {{ t('publico.menu.mas') }}
                  <np-icon name="caret-down" />
                </button>
                @if (masAbierto()) {
                  <ul class="cb__panel">
                    @for (e of partes().enMas; track e.clave + (e.fragmento ?? e.ruta)) {
                      <li>
                        <a
                          class="cb__item"
                          [routerLink]="e.ruta"
                          [fragment]="e.fragmento ?? undefined"
                          (click)="cerrar()"
                        >
                          {{ e.titulo ?? t('publico.menu.' + e.clave) }}
                          @if (e.conIdentidad) {
                            <np-icon name="lock-simple" [label]="t('publico.menu.identidad')" />
                          }
                        </a>
                      </li>
                    }
                  </ul>
                }
              </div>
            }
            @if (puedeConfirmar()) {
              <a class="cb__confirmar" routerLink="/confirmar">
                {{ t('publico.confirmar.entrada') }}
              </a>
            }
          </nav>

          <button
            type="button"
            class="cb__burger"
            aria-controls="cb-cajon"
            [attr.aria-expanded]="cajonAbierto()"
            [attr.aria-label]="cajonAbierto() ? t('publico.menu.cerrar') : t('publico.menu.abrir')"
            (click)="alternarCajon($event)"
          >
            <np-icon [name]="cajonAbierto() ? 'x' : 'list'" />
          </button>
        </div>

        @if (cajonAbierto()) {
          <div class="cb__cajon" id="cb-cajon">
            <nav class="cb__lista" [attr.aria-label]="t('publico.menu.principal')">
              <a class="cb__fila cb__fila--inicio" routerLink="/" (click)="cerrar()">
                {{ t('publico.menu.inicio') }}
              </a>
              @if (grupo('boda').length > 0) {
                <p class="cb__grupo">{{ t('publico.menu.grupo.boda') }}</p>
                @for (e of grupo('boda'); track e.clave + (e.fragmento ?? e.ruta)) {
                  <a
                    class="cb__fila"
                    [routerLink]="e.ruta"
                    [fragment]="e.fragmento ?? undefined"
                    (click)="cerrar()"
                  >
                    {{ e.titulo ?? t('publico.menu.' + e.clave) }}
                  </a>
                }
              }
              @if (grupo('participa').length > 0) {
                <p class="cb__grupo">{{ t('publico.menu.grupo.participa') }}</p>
                @for (e of grupo('participa'); track e.clave + (e.fragmento ?? e.ruta)) {
                  <a
                    class="cb__fila"
                    [routerLink]="e.ruta"
                    [fragment]="e.fragmento ?? undefined"
                    (click)="cerrar()"
                  >
                    {{ e.titulo ?? t('publico.menu.' + e.clave) }}
                    @if (e.conIdentidad) {
                      <np-icon name="lock-simple" [label]="t('publico.menu.identidad')" />
                    }
                  </a>
                }
              }
            </nav>
            @if (puedeConfirmar()) {
              <div class="cb__pie">
                <a class="cb__confirmar cb__confirmar--ancho" routerLink="/confirmar">
                  <np-icon name="check-circle" weight="fill" />
                  {{ t('publico.confirmar.entrada') }}
                </a>
              </div>
            }
          </div>
        }
      </header>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      position: sticky;
      inset-block-start: 0;
      z-index: 20;
      --cb-fondo: var(--np-marca-background, #ffffff);
      --cb-texto: var(--np-marca-text, #1a1a1a);
      --cb-superficie: var(--np-marca-surface, var(--cb-fondo));
      --cb-boton: var(--np-marca-primary, var(--cb-texto));
      --cb-linea: color-mix(in srgb, var(--cb-texto) 18%, transparent);
      --cb-alto: 4rem;
      font-family: var(--np-marca-fuente, system-ui, sans-serif);
      color: var(--cb-texto);
    }
    .cb {
      background: var(--cb-fondo);
      border-block-end: 1px solid var(--cb-linea);
    }
    .cb__barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-4);
      block-size: var(--cb-alto);
      padding-inline: var(--np-space-4);
      max-inline-size: 80rem;
      margin-inline: auto;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    .cb__marca {
      font-family: var(--np-marca-titulos, inherit);
      font-size: var(--np-text-xl);
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cb__nav {
      display: none;
    }
    .cb__enlace {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-2);
      border: 0;
      border-block-end: 2px solid transparent;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .cb__enlace:hover {
      border-block-end-color: color-mix(in srgb, var(--cb-texto) 40%, transparent);
    }
    .cb__enlace--activo {
      border-block-end-color: var(--cb-texto);
      font-weight: var(--np-weight-medium);
    }
    .cb__mas {
      position: relative;
    }
    .cb__panel {
      position: absolute;
      inset-block-start: 100%;
      inset-inline-end: 0;
      z-index: 1;
      min-inline-size: 14rem;
      margin: var(--np-space-1) 0 0;
      padding: var(--np-space-2);
      list-style: none;
      background: var(--cb-superficie);
      border: 1px solid var(--cb-linea);
      border-radius: var(--np-radius-lg, 0.75rem);
      box-shadow: 0 12px 32px color-mix(in srgb, var(--cb-texto) 22%, transparent);
    }
    .cb__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-3);
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-3);
      border-radius: var(--np-radius-md, 0.5rem);
    }
    .cb__item:hover {
      background: color-mix(in srgb, var(--cb-texto) 8%, transparent);
    }
    .cb__confirmar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-4);
      border-radius: var(--np-radius-full, 999px);
      background: var(--cb-boton);
      color: var(--cb-fondo);
      font-weight: var(--np-weight-medium);
      white-space: nowrap;
    }
    .cb__confirmar--ancho {
      inline-size: 100%;
      min-block-size: 3.25rem;
    }
    .cb__burger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: var(--np-tap-target);
      block-size: var(--np-tap-target);
      border: 0;
      border-radius: var(--np-radius-md, 0.5rem);
      background: color-mix(in srgb, var(--cb-texto) 10%, transparent);
      color: inherit;
      cursor: pointer;
    }
    .cb__burger np-icon {
      --np-icon-size: 1.5rem;
    }
    /* El cajón ocupa el resto de la pantalla bajo la barra, con el botón de
       confirmar pegado abajo. En el móvil no hay hover: todo se pulsa. */
    .cb__cajon {
      position: fixed;
      inset: var(--cb-alto) 0 0 0;
      display: flex;
      flex-direction: column;
      background: var(--cb-fondo);
      overflow-y: auto;
    }
    .cb__lista {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: var(--np-space-2) var(--np-space-4);
    }
    .cb__grupo {
      margin: var(--np-space-4) 0 var(--np-space-1);
      padding-block-start: var(--np-space-3);
      border-block-start: 1px solid var(--cb-linea);
      font-size: var(--np-text-xs);
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--cb-texto) 72%, transparent);
    }
    .cb__fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-block-size: 3rem;
      font-size: var(--np-text-lg);
    }
    .cb__fila--inicio {
      font-weight: var(--np-weight-medium);
    }
    .cb__pie {
      position: sticky;
      inset-block-end: 0;
      padding: var(--np-space-3) var(--np-space-4);
      padding-block-end: max(var(--np-space-4), env(safe-area-inset-bottom));
      background: var(--cb-fondo);
      border-block-start: 1px solid var(--cb-linea);
    }
    @media (min-width: 48rem) {
      .cb__barra {
        padding-inline: var(--np-space-6);
      }
      .cb__nav {
        display: flex;
        align-items: center;
        gap: var(--np-space-3);
      }
      .cb__burger,
      .cb__cajon {
        display: none;
      }
    }
  `,
})
export class NpCabeceraBoda {
  readonly tenant = input<ResultadoTenant | null | undefined>(null);

  private readonly sesion = inject(SesionInvitado, { optional: true });
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly soloRuta = ACTIVO_SOLO_RUTA;
  protected readonly masAbierto = signal(false);
  protected readonly cajonAbierto = signal(false);

  protected readonly estilo = computed(() => estiloDeLaBoda(this.tenant()));

  private readonly sitio = computed(() => {
    const t = this.tenant();
    return t?.tipo === 'ok' ? t.sitio : null;
  });

  protected readonly nombres = computed(
    () => this.sitio()?.coupleNames ?? { partnerA: '', partnerB: '' },
  );
  protected readonly losDos = computed(() => losDosNombres(this.nombres()));
  protected readonly unNombre = computed(() => elNombreQueHaya(this.nombres()));

  private readonly elementos = computed(() => elementosDeMenu(this.sitio()?.secciones ?? []));
  protected readonly partes = computed(() => partirMenu(this.elementos()));

  /**
   * Como el botón flotante de antes: solo si la pareja tiene el módulo a la
   * vista y sabemos quién es el invitado (sin identidad no hay a quién apuntar
   * la respuesta; ver D-09).
   */
  protected readonly puedeConfirmar = computed(
    () => this.sitio()?.modulos['rsvp'] === 'visible' && this.sesion?.identificado() === true,
  );

  protected grupo(cual: ElementoMenu['grupo']): readonly ElementoMenu[] {
    return this.elementos().filter((e) => e.grupo === cual);
  }

  protected alternarMas(evento: Event): void {
    evento.stopPropagation();
    this.masAbierto.update((abierto) => !abierto);
  }

  protected alternarCajon(evento: Event): void {
    evento.stopPropagation();
    this.cajonAbierto.update((abierto) => !abierto);
  }

  protected cerrar(): void {
    this.masAbierto.set(false);
    this.cajonAbierto.set(false);
  }

  /** Un clic fuera de la cabecera cierra el «Más». El cajón se cierra con su botón. */
  protected alPulsarFuera(evento: Event): void {
    if (!this.masAbierto()) return;
    const destino = evento.target;
    if (destino instanceof Node && this.anfitrion.nativeElement.contains(destino)) return;
    this.masAbierto.set(false);
  }
}
