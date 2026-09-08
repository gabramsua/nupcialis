import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NpIcon } from '../../design-system/icons/icon';
import { NP_ICON_LABELS, NpIconName } from '../../design-system/icons/icon-name.generated';
import { NpStatusChip } from '../../design-system/components/status-chip/status-chip';
import {
  NP_STATUS_ICON,
  NP_STATUS_MEANING,
  NpStatus,
} from '../../design-system/tokens/semantic.generated';

const CATEGORICOS = [
  'rosa',
  'coral',
  'teja',
  'mostaza',
  'oliva',
  'verde',
  'esmeralda',
  'turquesa',
  'cian',
  'celeste',
  'azul',
  'indigo',
  'ciruela',
];

const ETIQUETAS_ESTADO: Record<NpStatus, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendiente',
  declined: 'No asiste',
  attention: 'Requiere revisión',
  info: 'Informativo',
};

/** Catálogo del sistema visual. Solo fuera de producción. */
@Component({
  selector: 'np-design-system-catalog',
  imports: [NpIcon, NpStatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './design-system-catalog.html',
  styleUrl: './design-system-catalog.scss',
})
export class DesignSystemCatalog {
  protected readonly categoricos = CATEGORICOS;
  protected readonly estados = Object.keys(NP_STATUS_ICON) as NpStatus[];
  protected readonly etiquetaEstado = ETIQUETAS_ESTADO;
  protected readonly significado = NP_STATUS_MEANING;
  protected readonly iconos = Object.entries(NP_ICON_LABELS) as [NpIconName, string][];
  protected readonly tema = signal<'light' | 'dark'>('light');

  protected cambiarTema(): void {
    const nuevo = this.tema() === 'light' ? 'dark' : 'light';
    this.tema.set(nuevo);
    document.documentElement.setAttribute('data-np-theme', nuevo);
  }
}
