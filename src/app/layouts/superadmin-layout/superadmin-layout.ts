import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_AUTH } from '../../core/auth/auth-gateway';
import { NpIcon } from '../../design-system/icons/icon';
import type { NpIconName } from '../../design-system/icons/icon-name.generated';

interface Seccion {
  readonly ruta: string;
  readonly clave: string;
  readonly icono: NpIconName;
  /** `true`: solo está activa con la ruta exacta (la de Bodas es la raíz). */
  readonly exacta: boolean;
}

/** Todas las secciones del superadmin, en el orden en que se muestran. */
export const SECCIONES_SUPERADMIN: readonly Seccion[] = [
  { ruta: '/superadmin', clave: 'bodas', icono: 'heart', exacta: true },
  { ruta: '/superadmin/estadisticas', clave: 'estadisticas', icono: 'chart-bar', exacta: false },
  { ruta: '/superadmin/finanzas', clave: 'finanzas', icono: 'currency-eur', exacta: false },
  { ruta: '/superadmin/proveedores', clave: 'proveedores', icono: 'storefront', exacta: false },
  { ruta: '/superadmin/recordatorios', clave: 'recordatorios', icono: 'bell', exacta: false },
  { ruta: '/superadmin/catalogos', clave: 'catalogos', icono: 'list-checks', exacta: false },
  { ruta: '/superadmin/planes', clave: 'planes', icono: 'sliders-horizontal', exacta: false },
  { ruta: '/superadmin/correos', clave: 'correos', icono: 'envelope', exacta: false },
  {
    ruta: '/superadmin/cola-correos',
    clave: 'colaCorreos',
    icono: 'clock-countdown',
    exacta: false,
  },
  { ruta: '/superadmin/consejos', clave: 'consejos', icono: 'sparkle', exacta: false },
  { ruta: '/superadmin/home', clave: 'home', icono: 'palette', exacta: false },
];

const CLAVE_PLEGADO = 'np.superadmin.menuPlegado';

/** Lo que el navegador recordó, o `null` si no hay nada o no se puede leer. */
function leerPlegado(): boolean | null {
  try {
    const guardado = localStorage.getItem(CLAVE_PLEGADO);
    return guardado === null ? null : guardado === '1';
  } catch {
    return null;
  }
}

/**
 * El marco del panel de superadmin: un menú vertical que se puede plegar a solo
 * iconos y, a su derecha, la sección que toque.
 *
 * Reúne en un sitio lo que antes eran enlaces sueltos en la cabecera de «Bodas»,
 * y es el único que sabe cerrar la sesión: las secciones no tienen que repetirlo.
 */
@Component({
  selector: 'np-superadmin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <div class="sl" [class.sl--plegado]="plegado()">
        <nav class="sl__menu" [attr.aria-label]="t('superadmin.menu.etiqueta')">
          <div class="sl__marca">
            <np-icon name="diamond" weight="fill" />
            <span class="sl__texto">{{ t('superadmin.titulo') }}</span>
          </div>

          <ul class="sl__lista">
            @for (s of secciones; track s.ruta) {
              <li>
                <a
                  class="sl__enlace"
                  [routerLink]="s.ruta"
                  routerLinkActive="sl__enlace--activo"
                  [routerLinkActiveOptions]="{ exact: s.exacta }"
                  ariaCurrentWhenActive="page"
                  [attr.title]="plegado() ? t('superadmin.menu.' + s.clave) : null"
                >
                  <np-icon [name]="s.icono" />
                  <span class="sl__texto">{{ t('superadmin.menu.' + s.clave) }}</span>
                </a>
              </li>
            }
          </ul>

          <div class="sl__pie">
            <button
              type="button"
              class="sl__boton"
              [attr.aria-expanded]="!plegado()"
              [attr.title]="plegado() ? t('superadmin.menu.desplegar') : null"
              (click)="alternar()"
            >
              <np-icon [name]="plegado() ? 'caret-right' : 'caret-left'" />
              <span class="sl__texto">{{ t('superadmin.menu.plegar') }}</span>
            </button>
            <button
              type="button"
              class="sl__boton"
              [attr.title]="plegado() ? t('superadmin.salir') : null"
              (click)="salir()"
            >
              <np-icon name="sign-out" />
              <span class="sl__texto">{{ t('superadmin.salir') }}</span>
            </button>
          </div>
        </nav>

        <div class="sl__contenido">
          <router-outlet />
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .sl {
      --sl-ancho: 15rem;
      display: grid;
      grid-template-columns: var(--sl-ancho) minmax(0, 1fr);
      min-block-size: 100dvh;
    }
    .sl--plegado {
      --sl-ancho: 3.75rem;
    }
    .sl__menu {
      position: sticky;
      inset-block-start: 0;
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      block-size: 100dvh;
      padding: var(--np-space-3) var(--np-space-2);
      background: var(--np-surface-surface);
      border-inline-end: 1px solid var(--np-surface-border);
      overflow-y: auto;
    }
    .sl__marca {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      padding: var(--np-space-2);
      font-weight: var(--np-weight-semibold);
    }
    .sl__marca np-icon {
      color: var(--np-cat-rosa);
    }
    .sl__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      flex: 1;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .sl__enlace,
    .sl__boton {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      inline-size: 100%;
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2);
      font: inherit;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
      text-decoration: none;
      background: transparent;
      border: 0;
      border-radius: var(--np-radius-md);
      cursor: pointer;
    }
    .sl__enlace:hover,
    .sl__boton:hover {
      background: var(--np-surface-sunken);
    }
    /* El activo se distingue por fondo, barra y peso, no solo por color. */
    .sl__enlace--activo {
      font-weight: var(--np-weight-semibold);
      color: var(--np-surface-text);
      background: var(--np-surface-sunken);
      box-shadow: inset 3px 0 0 var(--np-cat-rosa);
    }
    .sl__pie {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      padding-block-start: var(--np-space-2);
      border-block-start: 1px solid var(--np-surface-border);
    }
    .sl--plegado .sl__texto {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .sl__contenido {
      min-inline-size: 0;
    }
  `,
})
export class SuperadminLayout {
  private readonly auth = inject(PUERTA_AUTH);

  protected readonly secciones = SECCIONES_SUPERADMIN;
  /** En pantallas estrechas arranca plegado salvo que se haya elegido otra cosa. */
  protected readonly plegado = signal(
    leerPlegado() ?? (typeof matchMedia === 'function' && matchMedia('(max-width: 48rem)').matches),
  );

  protected alternar(): void {
    const nuevo = !this.plegado();
    this.plegado.set(nuevo);
    try {
      localStorage.setItem(CLAVE_PLEGADO, nuevo ? '1' : '0');
    } catch {
      // Sin almacenamiento el menú sigue funcionando; solo no se acuerda.
    }
  }

  protected async salir(): Promise<void> {
    await this.auth.salir();
    // Recarga completa y no navegación del router: se tira con ella todo lo que
    // el superadmin había cargado en memoria (correos, cobros).
    location.assign('/superadmin/acceso');
  }
}
