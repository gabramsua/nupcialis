import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import type { Grupo } from '../../../core/invitados/grupos-gateway';
import type { Invitado, Lado } from '../../../core/invitados/invitados-gateway';
import { NpButton } from '../../../design-system/components/button/button';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { NpGrupoChip } from './grupo-chip';

export interface ParejaDeLaBoda {
  readonly partnerA?: string;
  readonly partnerB?: string;
}

type Traducir = (clave: string, params?: object) => string;

/** «De María», «De Gabriel», «De los dos». */
export function ladoDeInvitado(
  lado: Lado,
  pareja: ParejaDeLaBoda | null | undefined,
  t: Traducir,
): string {
  if (lado === 'A' && pareja?.partnerA) return t('panel.lado.de', { nombre: pareja.partnerA });
  if (lado === 'B' && pareja?.partnerB) return t('panel.lado.de', { nombre: pareja.partnerB });
  return t('panel.lado.' + lado);
}

/**
 * La lista de invitados: una fila corta por persona y, al abrirla, el resto.
 *
 * Con unos doscientos invitados por boda, una tarjeta grande por cabeza obliga
 * a desplazarse kilómetros para ver a quién falta. Aquí cada fila es una línea
 * —número, nombre, grupos y respuesta—, y los datos y las acciones están
 * detrás de un acordeón (botón con `aria-expanded`), de modo que se puede
 * recorrer la lista entera de un vistazo y abrir solo lo que se necesita.
 *
 * Es tonta a propósito: no filtra ni ordena (eso lo decide quien la pinta, y
 * el número es la posición **en lo que se ve**) y no sabe de puertas; todo lo
 * que se hace con un invitado sale como evento.
 */
@Component({
  selector: 'np-lista-invitados',
  imports: [TranslocoDirective, NpButton, NpIcon, NpStatusChip, NpGrupoChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (hayAbiertas()) {
        <button npButton size="sm" variant="ghost" type="button" (click)="plegarTodo()">
          <np-icon name="caret-up" />
          {{ t('panel.invitados.lista.plegarTodo') }}
        </button>
      }
      <ul class="lst">
        @for (invitado of invitados(); track invitado.id; let i = $index) {
          @let abierta = estaAbierta(invitado.id);
          <li class="lst__fila" [class.lst__fila--abierta]="abierta">
            <button
              type="button"
              class="lst__cabecera"
              [attr.aria-expanded]="abierta"
              [attr.aria-controls]="abierta ? 'inv-' + invitado.id : null"
              (click)="alternar(invitado.id)"
            >
              <span class="lst__num">{{ i + 1 }}</span>
              <span class="lst__quien">
                <span class="lst__nombre">{{ invitado.fullName }}</span>
                @if (invitado.isCompanion) {
                  <span class="lst__sub">
                    <np-icon name="user-plus" />
                    @if (quienLoTrae(invitado); as titular) {
                      {{ t('panel.invitados.loTrae', { nombre: titular }) }}
                    } @else {
                      {{ t('panel.invitados.esAcompanante') }}
                    }
                  </span>
                }
              </span>
              @let suyos = gruposDe(invitado);
              @if (suyos.length > 0) {
                <span class="lst__grupos">
                  @for (grupo of suyos; track grupo.id) {
                    <np-grupo-chip
                      [grupo]="grupo"
                      [etiquetaRestringido]="t('panel.grupos.restringido')"
                    />
                  }
                </span>
              }
              <np-status-chip
                [status]="colorRsvp(invitado)"
                [label]="t('panel.invitados.rsvp.' + invitado.rsvpStatus)"
              />
              <np-icon class="lst__flecha" [name]="abierta ? 'caret-up' : 'caret-down'" />
            </button>

            @if (abierta) {
              <div class="lst__detalle" [id]="'inv-' + invitado.id">
                <dl class="lst__datos">
                  @if (invitado.phone; as telefono) {
                    <div>
                      <dt>{{ t('panel.invitados.campo.telefono') }}</dt>
                      <dd>{{ telefono }}</dd>
                    </div>
                  }
                  @if (invitado.nickname) {
                    <div>
                      <dt>{{ t('panel.invitados.campo.mote') }}</dt>
                      <dd>{{ invitado.nickname }}</dd>
                    </div>
                  }
                  <div>
                    <dt>{{ t('panel.invitados.campo.lado') }}</dt>
                    <dd>{{ lado(invitado.side, t) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('panel.invitados.campo.edad') }}</dt>
                    <dd>{{ t('panel.invitados.edad.' + invitado.ageGroup) }}</dd>
                  </div>
                  @if (!invitado.isCompanion && invitado.maxCompanions > 0) {
                    <div>
                      <dt>{{ t('panel.invitados.campo.acompanantes') }}</dt>
                      <dd>{{ invitado.maxCompanions }}</dd>
                    </div>
                  }
                  @if (invitado.menu) {
                    <div>
                      <dt>{{ t('panel.invitados.lista.menu') }}</dt>
                      <dd>{{ invitado.menu }}</dd>
                    </div>
                  }
                  @if (invitado.allergies) {
                    <div>
                      <dt>{{ t('panel.invitados.lista.alergias') }}</dt>
                      <dd>{{ invitado.allergies }}</dd>
                    </div>
                  }
                  @if (invitado.notes) {
                    <div class="lst__ancho">
                      <dt>{{ t('panel.invitados.campo.notas') }}</dt>
                      <dd>{{ invitado.notes }}</dd>
                    </div>
                  }
                </dl>

                <div class="lst__vinculos">
                  @if (invitado.loginCount === 0) {
                    <np-status-chip status="pending" [label]="t('panel.invitados.noHaEntrado')" />
                  }
                  <!--
                    Quién lo trae, con nombre, y a cuántos trae: llevan a la
                    familia entera. «Es acompañante» a secas obligaría a
                    adivinar de quién, que es justo lo que se necesita para
                    sentarlos juntos.
                  -->
                  @if (invitado.isCompanion && invitado.invitedById; as titularId) {
                    @if (quienLoTrae(invitado)) {
                      <button type="button" class="lst__enlace" (click)="familia.emit(titularId)">
                        <np-icon name="users" />
                        {{ t('panel.invitados.familia.ver') }}
                      </button>
                    }
                  }
                  @if (cuantosTrae(invitado); as cuantos) {
                    <button type="button" class="lst__enlace" (click)="familia.emit(invitado.id)">
                      <np-icon name="users" />
                      {{ t('panel.invitados.trae', { n: cuantos }) }}
                    </button>
                  }
                </div>

                <div class="lst__acciones">
                  @if (!invitado.isCompanion) {
                    <button
                      npButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      (click)="acompanante.emit(invitado)"
                    >
                      <np-icon name="user-plus" />
                      {{ t('panel.invitados.anadirAcompanante') }}
                    </button>
                  }
                  <button
                    npButton
                    size="sm"
                    variant="ghost"
                    type="button"
                    (click)="responder.emit(invitado)"
                  >
                    <np-icon name="check-circle" />
                    {{ t('panel.respuestaPareja.abrir') }}
                  </button>
                  <button
                    npButton
                    size="sm"
                    variant="ghost"
                    type="button"
                    (click)="compartir.emit(invitado)"
                  >
                    <np-icon name="whatsapp-logo" />
                    {{ t('panel.invitar.compartir') }}
                  </button>
                  <button
                    npButton
                    size="sm"
                    variant="ghost"
                    type="button"
                    (click)="editar.emit(invitado)"
                  >
                    <np-icon name="pencil-simple" />
                    {{ t('common.edit') }}
                  </button>
                  <button
                    npButton
                    size="sm"
                    variant="ghost"
                    type="button"
                    (click)="borrar.emit(invitado)"
                  >
                    <np-icon name="trash" />
                    {{ t('common.delete') }}
                  </button>
                </div>
              </div>
            }
          </li>
        }
      </ul>
    </ng-container>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
    }
    :host > button {
      align-self: flex-end;
    }
    .lst {
      margin: 0;
      padding: 0;
      list-style: none;
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
      overflow: hidden;
    }
    .lst__fila + .lst__fila {
      border-block-start: 1px solid var(--np-surface-border);
    }
    .lst__fila--abierta {
      background: var(--np-surface-canvas);
    }
    /* Una línea por invitado. En móvil los grupos bajan debajo del nombre. */
    .lst__cabecera {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-1) var(--np-space-3);
      inline-size: 100%;
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2) var(--np-space-3);
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .lst__cabecera:hover {
      background: var(--np-surface-canvas);
    }
    .lst__num {
      min-inline-size: 2.25rem;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
      font-variant-numeric: tabular-nums;
      text-align: end;
    }
    .lst__quien {
      display: flex;
      flex: 1 1 10rem;
      flex-direction: column;
      min-inline-size: 0;
    }
    .lst__nombre {
      font-weight: var(--np-weight-medium);
    }
    .lst__sub {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    .lst__grupos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1);
    }
    .lst__flecha {
      color: var(--np-surface-text-muted);
    }
    .lst__detalle {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      padding: var(--np-space-2) var(--np-space-4) var(--np-space-4)
        calc(var(--np-space-3) + 2.25rem + var(--np-space-3));
    }
    .lst__datos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
      gap: var(--np-space-2) var(--np-space-4);
      margin: 0;
    }
    .lst__datos dt {
      font-size: var(--np-text-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--np-surface-text-muted);
    }
    .lst__datos dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .lst__ancho {
      grid-column: 1 / -1;
    }
    .lst__vinculos,
    .lst__acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .lst__vinculos:empty {
      display: none;
    }
    /* «Trae a 2» y «Ver su familia» son botones con pinta de dato. */
    .lst__enlace {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      padding: 0;
      border: 0;
      background: none;
      color: var(--np-surface-text);
      font: inherit;
      font-size: var(--np-text-sm);
      cursor: pointer;
    }
    .lst__enlace:hover {
      text-decoration: underline;
    }
    @media (max-width: 40rem) {
      .lst__detalle {
        padding-inline-start: var(--np-space-4);
      }
    }
  `,
})
export class NpListaInvitados {
  /** Los que se ven, **ya ordenados**: el número de cada uno es su posición. */
  readonly invitados = input.required<readonly Invitado[]>();
  readonly grupos = input<readonly Grupo[]>([]);
  /** Nombre (o mote) de cada invitado por id: para decir «lo trae Ana». */
  readonly nombres = input<ReadonlyMap<string, string>>(new Map());
  /** Cuántos acompañantes trae cada titular, por id del titular. */
  readonly traen = input<ReadonlyMap<string, number>>(new Map());
  readonly pareja = input<ParejaDeLaBoda | null>(null);

  /** Id del titular cuya familia se quiere ver. */
  readonly familia = output<string>();
  readonly acompanante = output<Invitado>();
  readonly responder = output<Invitado>();
  readonly compartir = output<Invitado>();
  readonly editar = output<Invitado>();
  readonly borrar = output<Invitado>();

  private readonly abiertas = signal<ReadonlySet<string>>(new Set());
  protected readonly hayAbiertas = computed(() => this.abiertas().size > 0);

  protected estaAbierta(id: string): boolean {
    return this.abiertas().has(id);
  }

  protected alternar(id: string): void {
    this.abiertas.update((actuales) => {
      const siguientes = new Set(actuales);
      if (!siguientes.delete(id)) siguientes.add(id);
      return siguientes;
    });
  }

  protected plegarTodo(): void {
    this.abiertas.set(new Set());
  }

  /** Sus grupos, en el orden de la pareja. Los que ya no existen no se pintan. */
  protected gruposDe(invitado: Invitado): readonly Grupo[] {
    return this.grupos().filter((g) => invitado.groupIds.includes(g.id));
  }

  protected quienLoTrae(invitado: Invitado): string | null {
    if (invitado.invitedById === null) return null;
    return this.nombres().get(invitado.invitedById) ?? null;
  }

  /** Cuántos trae, o `null` para que la plantilla no pinte un cero. */
  protected cuantosTrae(invitado: Invitado): number | null {
    return this.traen().get(invitado.id) ?? null;
  }

  /** Verde confirmado, rojo declinado, ámbar pendiente. Siempre con etiqueta. */
  protected colorRsvp(invitado: Invitado): 'confirmed' | 'declined' | 'pending' {
    if (invitado.rsvpStatus === 'confirmed') return 'confirmed';
    return invitado.rsvpStatus === 'declined' ? 'declined' : 'pending';
  }

  protected lado(lado: Lado, t: Traducir): string {
    return ladoDeInvitado(lado, this.pareja(), t);
  }
}
