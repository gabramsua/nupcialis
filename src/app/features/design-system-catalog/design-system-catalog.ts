import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NpIcon } from '../../design-system/icons/icon';
import { NP_ICON_LABELS, NpIconName } from '../../design-system/icons/icon-name.generated';
import { NpStatusChip } from '../../design-system/components/status-chip/status-chip';
import { NpAlert } from '../../design-system/components/alert/alert';
import { NpButton } from '../../design-system/components/button/button';
import { NpCard } from '../../design-system/components/card/card';
import { NpEmptyState } from '../../design-system/components/empty-state/empty-state';
import { NpField } from '../../design-system/components/field/field';
import { NpInput } from '../../design-system/components/field/input';
import { NpModal } from '../../design-system/components/modal/modal';
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
  imports: [
    NpIcon,
    NpStatusChip,
    NpAlert,
    NpButton,
    NpCard,
    NpEmptyState,
    NpField,
    NpInput,
    NpModal,
  ],
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
  protected readonly modalAbierto = signal(false);
  protected readonly cargando = signal(false);

  protected simularCarga(): void {
    this.cargando.set(true);
    setTimeout(() => this.cargando.set(false), 1600);
  }

  protected cambiarTema(): void {
    const nuevo = this.tema() === 'light' ? 'dark' : 'light';
    this.tema.set(nuevo);
    document.documentElement.setAttribute('data-np-theme', nuevo);
  }
}
