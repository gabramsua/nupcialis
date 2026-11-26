import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpIcon } from '../../../design-system/icons/icon';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import {
  PUERTA_ACCESOS,
  type EntradaDeAcceso,
  type FalloAccesos,
  type RegistroDeAccesos,
} from '../../../core/invitados/accesos-gateway';
import { fechaMedia, horaCorta } from '../../../shared/fecha';
import { agruparPorDia, quien, resumirAccesos, type Dia } from './resumen-accesos';

type Carga = 'cargando' | 'lista' | 'error';

/** Los modos que sabemos nombrar. Cualquier otro se enseña como «entrada». */
const MODOS = ['enlace', 'name_phone4', 'phone'] as const;

/**
 * Quién ha entrado en la web de la boda.
 *
 * Los datos se escribían desde el primer día y no se veían en ninguna parte.
 * La pareja viene aquí con dos preguntas:
 *
 * 1. **«¿Le habrá llegado a mi tía?»** Se contesta mirando la lista, no
 *    llamándola por teléfono.
 * 2. **«¿Se está usando mi enlace de más?»** Desde D-34 el enlace entra solo,
 *    así que el primo que lo pasa al grupo de la familia convierte a doce
 *    personas en el mismo invitado. Eso se nota en que una misma invitación se
 *    abre desde un iPhone, un Android y un Windows, y eso es lo que avisa
 *    arriba.
 *
 * Lo que **no** se enseña: la IP, que se guarda para el límite de intentos y
 * no le dice nada a la pareja, y el `user-agent` entero, que baja a dos
 * palabras en el servidor. Ver `functions/src/access-log.ts`.
 *
 * Primero móvil: una entrada por línea, la hora a la izquierda y el resto
 * debajo en cuanto no cabe.
 */
@Component({
  selector: 'np-accesos',
  imports: [RouterLink, TranslocoDirective, NpAlert, NpButton, NpEmptyState, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="ac">
        <header class="ac__intro">
          <div>
            <h2>{{ t('panel.accesos.titulo') }}</h2>
            @if (carga() === 'lista' && entradas().length > 0) {
              <p>
                {{
                  t('panel.accesos.cuantas', {
                    entradas: resumen().entradas,
                    invitados: resumen().invitados,
                  })
                }}
              </p>
            }
          </div>
          <a class="ac__volver" routerLink="/panel/guests">
            <np-icon name="arrow-left" />
            {{ t('panel.accesos.volver') }}
          </a>
        </header>

        @switch (carga()) {
          @case ('cargando') {
            <p class="ac__cargando">{{ t('panel.accesos.cargando') }}</p>
          }

          @case ('error') {
            <np-alert status="declined" [heading]="t('panel.accesos.errorCargar')">
              <p>{{ textoDelFallo(t) }}</p>
            </np-alert>
            <button npButton type="button" (click)="cargar()">
              {{ t('panel.accesos.reintentar') }}
            </button>
          }

          @case ('lista') {
            @if (entradas().length === 0) {
              <np-empty-state
                icon="eye"
                [title]="t('panel.accesos.vacio.titulo')"
                [description]="t('panel.accesos.vacio.descripcion')"
              />
            } @else {
              <!--
                El aviso va arriba y antes de la lista: es lo único de esta
                pantalla que puede hacer que la pareja haga algo.
              -->
              @if (resumen().avisos.length > 0) {
                <np-alert status="attention" [heading]="t('panel.accesos.aviso.titulo')">
                  <p>{{ t('panel.accesos.aviso.explicacion') }}</p>
                  <ul class="ac__avisos">
                    @for (aviso of resumen().avisos; track aviso.guestId) {
                      <li>
                        <strong>{{ aviso.nombre || t('panel.accesos.sinNombre') }}</strong>
                        <span>{{ aviso.dispositivos.join(' · ') }}</span>
                      </li>
                    }
                  </ul>
                </np-alert>
              }

              @for (grupo of dias(); track grupo.clave) {
                <section class="ac__dia">
                  <h3>{{ etiquetaDia(grupo.dia, t) }}</h3>
                  <ul class="ac__entradas">
                    @for (entrada of grupo.entradas; track entrada.id) {
                      <li class="ac__entrada">
                        <span class="ac__hora">{{ hora(entrada) }}</span>
                        <span class="ac__quien">
                          <np-icon name="user-circle" />
                          {{ nombreDe(entrada) || t('panel.accesos.sinNombre') }}
                        </span>
                        <span class="ac__como" [attr.data-modo]="claveDeModo(entrada.modo)">
                          <np-icon [name]="iconoDeModo(entrada.modo)" />
                          {{ t('panel.accesos.modo.' + claveDeModo(entrada.modo)) }}
                        </span>
                        <span class="ac__aparato">
                          <np-icon name="device-mobile" />
                          {{ entrada.dispositivo || t('panel.accesos.aparatoDesconocido') }}
                        </span>
                      </li>
                    }
                  </ul>
                </section>
              }

              @if (hayMas()) {
                <p class="ac__tope">{{ t('panel.accesos.tope', { n: tope() }) }}</p>
              }
            }
          }
        }
      </section>
    </ng-container>
  `,
  styles: `
    .ac__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .ac__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .ac__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .ac__volver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
      text-decoration: none;
    }
    @media (min-width: 48rem) {
      .ac__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .ac__cargando {
      color: var(--np-surface-text-muted);
    }
    .ac__avisos {
      margin: var(--np-space-2) 0 0;
      padding: 0;
      list-style: none;
    }
    .ac__avisos li {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1) var(--np-space-2);
    }
    .ac__avisos span {
      opacity: 0.85;
    }
    .ac__dia {
      margin-block-start: var(--np-space-4);
    }
    .ac__dia h3 {
      margin: 0 0 var(--np-space-2);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
      color: var(--np-surface-text-muted);
      text-transform: lowercase;
    }
    .ac__entradas {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    /* Primero móvil: la hora manda la columna y lo demás se apila debajo. */
    .ac__entrada {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--np-space-1) var(--np-space-3);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      font-size: var(--np-text-sm);
    }
    .ac__hora {
      grid-row: 1 / span 3;
      font-variant-numeric: tabular-nums;
      color: var(--np-surface-text-muted);
    }
    .ac__quien {
      font-weight: var(--np-weight-medium);
    }
    .ac__quien,
    .ac__como,
    .ac__aparato {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      min-inline-size: 0;
    }
    .ac__como,
    .ac__aparato {
      color: var(--np-surface-text-muted);
    }
    /* El color nunca viaja solo: cada modo lleva su icono y su texto. */
    .ac__como[data-modo='enlace'] {
      color: var(--np-pending-fg);
    }
    .ac__como[data-modo='name_phone4'],
    .ac__como[data-modo='phone'] {
      color: var(--np-confirmed-fg);
    }
    @media (min-width: 48rem) {
      .ac__entrada {
        grid-template-columns: auto minmax(10rem, 1fr) auto auto;
        align-items: center;
      }
      .ac__hora {
        grid-row: auto;
      }
    }
    .ac__tope {
      margin-block-start: var(--np-space-4);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
  `,
})
export class Accesos {
  private readonly puerta = inject(PUERTA_ACCESOS);

  protected readonly carga = signal<Carga>('cargando');
  private readonly datos = signal<RegistroDeAccesos | null>(null);
  private readonly fallo = signal<FalloAccesos | null>(null);

  protected readonly entradas = computed(() => this.datos()?.entradas ?? []);
  protected readonly tope = computed(() => this.datos()?.tope ?? 0);
  protected readonly resumen = computed(() => resumirAccesos(this.entradas()));
  protected readonly dias = computed(() => agruparPorDia(this.entradas()));

  /**
   * ¿Se ha quedado algo fuera?
   *
   * El servidor devuelve como mucho `tope` entradas. Si vienen justo esas, lo
   * honesto es decir que hay más detrás, en vez de dejar que la pareja crea
   * que su boda empezó el día de la entrada más antigua que ve.
   */
  protected readonly hayMas = computed(
    () => this.tope() > 0 && this.entradas().length >= this.tope(),
  );

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');

    const resultado = await this.puerta.leer();
    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.carga.set('error');
      return;
    }

    this.datos.set(resultado.datos);
    this.carga.set('lista');
  }

  protected nombreDe(entrada: EntradaDeAcceso): string {
    return quien(entrada);
  }

  protected hora(entrada: EntradaDeAcceso): string {
    return horaCorta(new Date(entrada.cuando), 'es');
  }

  protected etiquetaDia(dia: Dia, t: (clave: string) => string): string {
    if (dia.cuando === 'hoy') return t('panel.accesos.hoy');
    if (dia.cuando === 'ayer') return t('panel.accesos.ayer');
    return fechaMedia(dia.fecha, 'es');
  }

  /** Un modo que no conocemos no rompe la pantalla: se llama «entrada». */
  protected claveDeModo(modo: string): string {
    return (MODOS as readonly string[]).includes(modo) ? modo : 'otro';
  }

  protected iconoDeModo(modo: string): NpIconName {
    return this.claveDeModo(modo) === 'enlace' ? 'link-simple' : 'check-circle';
  }

  /**
   * El texto del fallo sale de los ficheros de traducción, nunca del SDK.
   *
   * Un «Unauthenticated [401]» en la pantalla de la pareja ya pasó una vez.
   */
  protected textoDelFallo(t: (clave: string) => string): string {
    const fallo = this.fallo();
    if (!fallo) return '';

    switch (fallo.tipo) {
      case 'sin-permiso':
      case 'sin-verificar':
      case 'red':
        return t(`panel.accesos.fallo.${fallo.tipo}`);
      default:
        return t('panel.accesos.fallo.desconocido');
    }
  }
}
