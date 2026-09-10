import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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
import { NpSortHeader } from '../../design-system/components/table/sort-header';
import { NpSortable } from '../../design-system/components/table/sortable';
import { NpSortState, npSortRows } from '../../design-system/components/table/sort';
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
    NpSortable,
    NpSortHeader,
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

  protected readonly orden = signal<NpSortState | null>(null);

  private readonly filas = [
    {
      nombre: 'María García',
      grupo: 'Familia de la novia',
      estado: 'confirmed' as NpStatus,
      accesos: 4,
    },
    { nombre: 'Pablo Ruiz', grupo: 'Universidad', estado: 'pending' as NpStatus, accesos: 0 },
    {
      nombre: 'Consuelo Márquez',
      grupo: 'Familia del novio',
      estado: 'declined' as NpStatus,
      accesos: 2,
    },
    { nombre: 'Álvaro Ñíguez', grupo: 'Universidad', estado: 'confirmed' as NpStatus, accesos: 11 },
    { nombre: 'Zoe Ibáñez', grupo: 'Trabajo', estado: 'pending' as NpStatus, accesos: 1 },
  ];

  protected readonly filasOrdenadas = computed(() =>
    npSortRows(this.filas, this.orden(), {
      nombre: (f) => f.nombre,
      grupo: (f) => f.grupo,
      estado: (f) => this.etiquetaEstado[f.estado],
      accesos: (f) => f.accesos,
    }),
  );

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
