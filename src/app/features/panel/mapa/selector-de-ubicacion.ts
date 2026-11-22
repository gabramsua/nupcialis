import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpInput } from '../../../design-system/components/field/input';
import { UbicacionesStore } from './ubicaciones.store';

/**
 * «¿Dónde es?»: enlaza un hito de la cronología o un alojamiento con una de las
 * ubicaciones del mapa (§8.6, `F2.2b` y `F2.4b`).
 *
 * Se enlaza **por id**, no copiando la dirección: si la pareja corrige el pin o
 * el nombre de la finca, todos los sitios que apuntan a ella cambian a la vez.
 *
 * Las ubicaciones **sin pin o ocultas** a los invitados se ofrecen igualmente,
 * pero se dice que no se verán: el servidor solo publica el enlace si esa
 * ubicación se publica (`conEnlaceValido`), y callarlo sería dejar a la pareja
 * convencida de que sus invitados tienen un «Cómo llegar» que no existe.
 *
 * Necesita `UbicacionesStore` en las rutas que lo usan.
 */
@Component({
  selector: 'np-selector-de-ubicacion',
  imports: [TranslocoDirective, NpInput, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <label class="su">
        {{ t('panel.mapa.enlace.etiqueta') }}
        <select npInput (change)="elegir($event)">
          <option value="" [selected]="valor() === ''">
            {{ t('panel.mapa.enlace.ninguna') }}
          </option>
          @for (u of opciones(); track u.id) {
            <option [value]="u.id" [selected]="u.id === valor()">
              {{ u.name }}{{ u.aviso ? ' · ' + t('panel.mapa.enlace.' + u.aviso) : '' }}
            </option>
          }
          @if (huerfana()) {
            <option [value]="valor()" selected>{{ t('panel.mapa.enlace.yaNoExiste') }}</option>
          }
        </select>
        @if (store.estado() === 'lista' && store.ubicaciones().length === 0) {
          <small>
            {{ t('panel.mapa.enlace.sinUbicaciones') }}
            <a routerLink="/panel/map">{{ t('panel.mapa.enlace.irAlMapa') }}</a>
          </small>
        } @else {
          <small>{{ t('panel.mapa.enlace.ayuda') }}</small>
        }
      </label>
    </ng-container>
  `,
  styles: `
    .su {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
    }
    small {
      color: var(--np-surface-text-muted);
    }
  `,
})
export class NpSelectorDeUbicacion {
  /** El id elegido, o `''` si no hay enlace. */
  readonly value = input<string | null>('');
  readonly valueChange = output<string>();

  protected readonly store = inject(UbicacionesStore);

  protected readonly valor = computed(() => this.value() ?? '');

  protected readonly opciones = computed(() =>
    this.store.ubicaciones().map((u) => ({
      id: u.id,
      name: u.name,
      aviso:
        u.lat === null || u.lng === null
          ? ('sinPin' as const)
          : u.visibleToGuests
            ? null
            : ('oculta' as const),
    })),
  );

  /** El enlace apunta a una ubicación que ya no está: se enseña, no se esconde. */
  protected readonly huerfana = computed(
    () =>
      this.valor() !== '' &&
      this.store.estado() === 'lista' &&
      !this.store.ubicaciones().some((u) => u.id === this.valor()),
  );

  constructor() {
    void this.store.cargar();
  }

  protected elegir(evento: Event): void {
    this.valueChange.emit((evento.target as HTMLSelectElement).value);
  }
}
