import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpField } from '../../../design-system/components/field/field';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  MAX_DESCRIPCION_REGALO,
  MAX_ETIQUETA,
  MAX_NOTAS,
  METODOS,
  esMetodo,
  nombreDe,
  type MetodoRegalo,
  type RegaloRecibido,
} from './recibidos';
import { fechaMedia } from '../../../shared/fecha';
import { RecibidosStore } from './recibidos.store';
import { NpInput } from '../../../design-system/components/field/input';

type Filtro = 'todos' | 'sin-agradecer' | 'especie';

interface Formulario {
  id: string | null;
  guestId: string | null;
  fromLabel: string;
  busqueda: string;
  amount: string;
  method: MetodoRegalo;
  giftDescription: string;
  receivedAt: string;
  notes: string;
}

/** Cuántos invitados sugiere el buscador. Más de seis no se leen de un vistazo. */
const SUGERENCIAS = 6;

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

const VACIO = (): Formulario => ({
  id: null,
  guestId: null,
  fromLabel: '',
  busqueda: '',
  amount: '',
  method: 'bizum',
  giftDescription: '',
  receivedAt: hoy(),
  notes: '',
});

/**
 * Regalos recibidos: el cuaderno privado de la pareja (§8.8).
 *
 * Esta pantalla está pensada para **la resaca del día siguiente** y para la
 * semana de después, que es cuando se usa de verdad. De ahí tres decisiones:
 *
 * 1. **Apuntar es un formulario corto**, con la fecha ya puesta y el método en
 *    botones. Nadie va a teclear una fecha cincuenta veces.
 * 2. **Agradecer es un toque**, no abrir una ficha y guardar. Es el gesto que
 *    se repite, y es el trabajo que de verdad resuelve este módulo.
 * 3. **El cruce con la lista no es un reproche.** Quien vino y no tiene nada
 *    apuntado sale sin importes al lado y sin nada que se parezca a un
 *    ranking: es una lista de a quién repasar, no de quién no ha regalado.
 *
 * Y lo que no se hace: ponerle precio a un regalo en especie. Sería el
 * principio de ese ranking.
 */
@Component({
  selector: 'np-panel-recibidos',
  imports: [
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpField,
    NpModal,
    NpIcon,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="rc">
        <header class="rc__intro">
          <div>
            <h2>{{ t('panel.recibidos.titulo') }}</h2>
            <p>{{ t('panel.recibidos.ayuda') }}</p>
          </div>
          <a npButton variant="ghost" size="sm" routerLink="/panel/gifts">
            <np-icon name="gift" />
            {{ t('panel.recibidos.verLista') }}
          </a>
        </header>

        <np-alert status="info">
          <p>{{ t('panel.recibidos.privado') }}</p>
        </np-alert>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.recibidos.error')">
            <p>{{ t('panel.regalos.fallo.' + fallo.tipo) }}</p>
          </np-alert>
        }

        <button npButton type="button" class="rc__apuntar" (click)="apuntar()">
          <np-icon name="plus" />
          {{ t('panel.recibidos.apuntar') }}
        </button>

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="gift" [title]="t('panel.recibidos.cargando')" />
          }
          @default {
            @if (store.recibidos().length === 0) {
              <np-empty-state
                icon="gift"
                [title]="t('panel.recibidos.ninguno')"
                [description]="t('panel.recibidos.ningunoDescripcion')"
              />
            } @else {
              <!-- Los totales -->
              <section class="rc__totales">
                <p class="rc__total">
                  <strong>{{ euros(store.resumen().total) }}</strong>
                  <small>{{
                    t('panel.recibidos.enTotal' + (store.resumen().cuantos === 1 ? 'Uno' : ''), {
                      n: store.resumen().cuantos,
                    })
                  }}</small>
                </p>

                <ul class="rc__metodos">
                  @for (fila of store.resumen().porMetodo; track fila.method) {
                    <li>
                      <np-icon [name]="iconoDe(fila.method)" />
                      <span>{{ t('panel.recibidos.metodo.' + fila.method) }}</span>
                      <strong>{{ fila.total > 0 ? euros(fila.total) : '—' }}</strong>
                      <small>{{ fila.cuantos }}</small>
                    </li>
                  }
                </ul>

                @if (store.resumen().enEspecie > 0) {
                  <p class="rc__especie">
                    {{
                      t(
                        'panel.recibidos.enEspecie' +
                          (store.resumen().enEspecie === 1 ? 'Uno' : ''),
                        {
                          n: store.resumen().enEspecie,
                        }
                      )
                    }}
                  </p>
                }
              </section>

              <!-- Qué se mira -->
              <div class="rc__filtros" role="group">
                @for (cual of filtros; track cual) {
                  <button
                    type="button"
                    class="rc__filtro"
                    [class.rc__filtro--puesto]="filtro() === cual"
                    [attr.aria-pressed]="filtro() === cual"
                    (click)="filtro.set(cual)"
                  >
                    {{ t('panel.recibidos.filtro.' + cual) }}
                    @if (cual === 'sin-agradecer' && store.resumen().sinAgradecer > 0) {
                      <span class="rc__cuenta">{{ store.resumen().sinAgradecer }}</span>
                    }
                  </button>
                }
              </div>

              @if (visibles().length === 0) {
                <p class="rc__nada">{{ t('panel.recibidos.nadaConEseFiltro') }}</p>
              }

              <ul class="rc__lista">
                @for (recibido of visibles(); track recibido.id) {
                  <li class="rc__fila" [class.rc__fila--hecho]="recibido.thanked">
                    <!--
                      Agradecer es un toque. Es el gesto que se repite cincuenta
                      veces la semana siguiente, y abrir una ficha para marcarlo
                      es lo que hace que nadie lo use.
                    -->
                    <button
                      type="button"
                      class="rc__marca"
                      [attr.aria-pressed]="recibido.thanked"
                      [attr.aria-label]="t('panel.recibidos.agradecido')"
                      [disabled]="tocando() === recibido.id"
                      (click)="alternarAgradecido(recibido)"
                    >
                      <np-icon
                        [name]="recibido.thanked ? 'check-circle' : 'circle-dashed'"
                        [weight]="recibido.thanked ? 'fill' : 'regular'"
                      />
                    </button>

                    <button type="button" class="rc__que" (click)="editar(recibido)">
                      <strong>{{ quien(recibido) || t('panel.recibidos.sinNombre') }}</strong>
                      <small>
                        {{ t('panel.recibidos.metodo.' + recibido.method) }}
                        @if (recibido.giftDescription) {
                          · {{ recibido.giftDescription }}
                        }
                        @if (recibido.receivedAt) {
                          · {{ cuando(recibido.receivedAt) }}
                        }
                      </small>
                    </button>

                    <span class="rc__importe">
                      {{ recibido.amount === null ? '—' : euros(recibido.amount) }}
                    </span>
                  </li>
                }
              </ul>

              <!--
                El cruce. Información, nunca reproche (§8.8): sin importes al
                lado y sin nada que se parezca a un ranking.
              -->
              @if (store.sinApuntar().length > 0) {
                <section class="rc__cabos">
                  <h3>{{ t('panel.recibidos.sinApuntar') }}</h3>
                  <p>{{ t('panel.recibidos.sinApuntarAyuda') }}</p>
                  <ul>
                    @for (cabo of store.sinApuntar(); track cabo.guestId) {
                      <li>{{ cabo.nombre }}</li>
                    }
                  </ul>
                </section>
              }

              @if (store.noVinieron().length > 0) {
                <section class="rc__cabos">
                  <h3>{{ t('panel.recibidos.noVinieron') }}</h3>
                  <p>{{ t('panel.recibidos.noVinieronAyuda') }}</p>
                  <ul>
                    @for (cabo of store.noVinieron(); track cabo.guestId) {
                      <li>{{ cabo.nombre }}</li>
                    }
                  </ul>
                </section>
              }
            }
          }
        }

        @if (editando()) {
          <np-modal
            [open]="true"
            [heading]="t('panel.recibidos.' + (forma().id ? 'editarlo' : 'apuntar'))"
            (closed)="editando.set(false)"
          >
            <np-field
              [label]="t('panel.recibidos.campo.dequien')"
              [hint]="t('panel.recibidos.campo.dequienAyuda')"
              #fQuien
            >
              <input
                npInput
                type="text"
                autocomplete="off"
                [id]="fQuien.id()"
                [value]="forma().busqueda"
                (input)="buscar($event)"
              />
            </np-field>

            @if (forma().guestId; as elegido) {
              <p class="rc__elegido">
                <np-icon name="user" />
                {{ nombreDeInvitado(elegido) }}
                <button type="button" class="rc__quitar" (click)="olvidarInvitado()">
                  {{ t('panel.recibidos.cambiar') }}
                </button>
              </p>
            } @else if (sugerencias().length > 0) {
              <ul class="rc__sugerencias">
                @for (invitado of sugerencias(); track invitado.id) {
                  <li>
                    <button type="button" (click)="elegir(invitado.id, invitado.fullName)">
                      {{ invitado.fullName }}
                    </button>
                  </li>
                }
              </ul>
            }

            <np-field [label]="t('panel.recibidos.campo.metodo')">
              <div class="rc__metodo-botones" role="group">
                @for (cual of metodos; track cual) {
                  <button
                    type="button"
                    class="rc__metodo"
                    [class.rc__metodo--puesto]="forma().method === cual"
                    [attr.aria-pressed]="forma().method === cual"
                    (click)="ponerMetodo(cual)"
                  >
                    <np-icon [name]="iconoDe(cual)" />
                    {{ t('panel.recibidos.metodo.' + cual) }}
                  </button>
                }
              </div>
            </np-field>

            @if (esDinero()) {
              <np-field [label]="t('panel.recibidos.campo.importe')" #fImporte>
                <input
                  npInput
                  type="number"
                  min="0"
                  step="1"
                  inputmode="decimal"
                  [id]="fImporte.id()"
                  [value]="forma().amount"
                  (input)="cambiar('amount', $event)"
                />
              </np-field>
            } @else {
              <np-field [label]="t('panel.recibidos.campo.queEs')" #fQue>
                <input
                  npInput
                  type="text"
                  [id]="fQue.id()"
                  [attr.maxlength]="maxDescripcion"
                  [value]="forma().giftDescription"
                  (input)="cambiar('giftDescription', $event)"
                />
              </np-field>
            }

            <np-field [label]="t('panel.recibidos.campo.cuando')" #fCuando>
              <input
                npInput
                type="date"
                [id]="fCuando.id()"
                [value]="forma().receivedAt"
                (input)="cambiar('receivedAt', $event)"
              />
            </np-field>

            <np-field [label]="t('panel.recibidos.campo.notas')" #fNotas>
              <textarea
                npInput
                rows="2"
                [id]="fNotas.id()"
                [attr.maxlength]="maxNotas"
                [value]="forma().notes"
                (input)="cambiar('notes', $event)"
              ></textarea>
            </np-field>

            <div np-modal-actions>
              @if (forma().id) {
                <button npButton variant="danger" type="button" (click)="borrar()">
                  <np-icon name="trash" />
                  {{ t('common.delete') }}
                </button>
              }
              <button npButton variant="ghost" type="button" (click)="editando.set(false)">
                {{ t('common.cancel') }}
              </button>
              <button npButton type="button" [loading]="guardando()" (click)="guardar()">
                <np-icon name="check" />
                {{ t('common.save') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .rc__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-3);
    }
    .rc__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .rc__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .rc__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    /* Dentro del modal los campos van uno tras otro: sin aire, la etiqueta de
       cada uno parece colgar de la ayuda del anterior. */
    np-field {
      display: block;
      margin-block-end: var(--np-space-4);
    }
    .rc__apuntar {
      margin-block: var(--np-space-3);
    }
    .rc__totales {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .rc__total {
      display: flex;
      flex-direction: column;
      margin: 0;
    }
    .rc__total strong {
      font-size: var(--np-text-2xl);
      font-variant-numeric: tabular-nums;
    }
    .rc__total small,
    .rc__especie {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .rc__metodos,
    .rc__lista {
      display: grid;
      gap: var(--np-space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rc__metodos li {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      gap: var(--np-space-2);
      align-items: center;
      font-size: var(--np-text-sm);
    }
    .rc__metodos strong {
      font-variant-numeric: tabular-nums;
    }
    .rc__metodos small {
      color: var(--np-surface-text-muted);
      text-align: end;
    }
    .rc__filtros,
    .rc__metodo-botones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      margin-block: var(--np-space-3);
    }
    .rc__filtro,
    .rc__metodo {
      display: inline-flex;
      gap: var(--np-space-1);
      align-items: center;
      min-block-size: 2.5rem;
      padding: 0 var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: 999px;
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .rc__filtro--puesto,
    .rc__metodo--puesto {
      border-color: currentColor;
      background: var(--np-surface-bg);
      font-weight: var(--np-weight-semibold);
    }
    .rc__cuenta {
      padding: 0 var(--np-space-1);
      border-radius: 999px;
      background: var(--np-attention-bg);
      color: var(--np-attention-fg);
      font-size: var(--np-text-xs);
    }
    .rc__fila {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--np-space-2);
      align-items: center;
      padding: var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .rc__fila--hecho {
      opacity: 0.65;
    }
    .rc__marca {
      display: flex;
      align-items: center;
      justify-content: center;
      /* 44 px: es el botón que se toca cincuenta veces seguidas. */
      inline-size: 2.75rem;
      block-size: 2.75rem;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--np-confirmed-fg);
      cursor: pointer;
    }
    .rc__que {
      display: flex;
      flex-direction: column;
      min-inline-size: 0;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .rc__que small {
      color: var(--np-surface-text-muted);
    }
    .rc__importe {
      font-variant-numeric: tabular-nums;
      font-weight: var(--np-weight-semibold);
    }
    .rc__cabos {
      margin-block-start: var(--np-space-5);
    }
    .rc__cabos h3 {
      margin: 0;
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-semibold);
    }
    .rc__cabos p,
    .rc__nada {
      margin: var(--np-space-1) 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .rc__cabos ul {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rc__cabos li {
      padding: var(--np-space-1) var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: 999px;
      font-size: var(--np-text-sm);
    }
    .rc__sugerencias {
      display: grid;
      gap: var(--np-space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rc__sugerencias button {
      inline-size: 100%;
      min-block-size: 2.5rem;
      padding: 0 var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-sm);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .rc__elegido {
      display: flex;
      gap: var(--np-space-2);
      align-items: center;
      margin: 0;
      font-size: var(--np-text-sm);
    }
    .rc__quitar {
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
    input,
    textarea {
      inline-size: 100%;
    }
  `,
})
export class PanelRecibidos {
  protected readonly store = inject(RecibidosStore);

  protected readonly filtros: readonly Filtro[] = ['todos', 'sin-agradecer', 'especie'];
  protected readonly metodos = METODOS;
  protected readonly maxNotas = MAX_NOTAS;
  protected readonly maxDescripcion = MAX_DESCRIPCION_REGALO;

  protected readonly filtro = signal<Filtro>('todos');
  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly tocando = signal<string | null>(null);
  protected readonly forma = signal<Formulario>(VACIO());

  protected readonly esDinero = computed(() => {
    const metodo = this.forma().method;
    return metodo === 'cash' || metodo === 'bizum' || metodo === 'transfer';
  });

  protected readonly visibles = computed(() => {
    const todos = this.store.recibidos();
    switch (this.filtro()) {
      case 'sin-agradecer':
        return todos.filter((r) => !r.thanked);
      case 'especie':
        return todos.filter((r) => r.amount === null);
      default:
        return todos;
    }
  });

  /** Lo que el buscador sugiere: por nombre, y solo cuando ya se ha escrito. */
  protected readonly sugerencias = computed(() => {
    const busca = this.forma().busqueda.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (busca.length < 2) return [];

    return this.store
      .invitados()
      .filter((i) => i.fullName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(busca))
      .slice(0, SUGERENCIAS);
  });

  constructor() {
    void this.store.cargar();
  }

  protected quien(recibido: RegaloRecibido): string {
    return nombreDe(recibido, this.store.nombrePorId());
  }

  protected nombreDeInvitado(guestId: string): string {
    return this.store.nombrePorId()(guestId) ?? '';
  }

  /** «14 de junio de 2027», no `2027-06-14`: el día guardado, dicho como se lee. */
  protected cuando(dia: string): string {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
    if (!partes) return dia;
    return fechaMedia(new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])), 'es');
  }

  protected euros(importe: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: importe % 1 === 0 ? 0 : 2,
    }).format(importe);
  }

  protected iconoDe(metodo: MetodoRegalo) {
    switch (metodo) {
      case 'bizum':
        return 'device-mobile' as const;
      case 'transfer':
        return 'bank' as const;
      case 'cash':
        return 'currency-eur' as const;
      case 'gift':
        return 'gift' as const;
      default:
        return 'dots-three' as const;
    }
  }

  protected cambiar(
    campo: 'amount' | 'giftDescription' | 'receivedAt' | 'notes',
    evento: Event,
  ): void {
    const valor = (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.forma.update((previa) => ({ ...previa, [campo]: valor }));
  }

  protected buscar(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.forma.update((previa) => ({ ...previa, busqueda: valor, fromLabel: valor }));
  }

  protected elegir(guestId: string, nombre: string): void {
    this.forma.update((previa) => ({
      ...previa,
      guestId,
      busqueda: nombre,
      // Se guarda también el nombre escrito: si el invitado se borra algún
      // día, la anotación sigue diciendo de quién era.
      fromLabel: nombre,
    }));
  }

  protected olvidarInvitado(): void {
    this.forma.update((previa) => ({ ...previa, guestId: null }));
  }

  protected ponerMetodo(metodo: MetodoRegalo): void {
    if (!esMetodo(metodo)) return;
    this.forma.update((previa) => ({ ...previa, method: metodo }));
  }

  protected apuntar(): void {
    this.forma.set(VACIO());
    this.editando.set(true);
  }

  protected editar(recibido: RegaloRecibido): void {
    const nombre = this.quien(recibido);
    this.forma.set({
      id: recibido.id,
      guestId: recibido.guestId,
      fromLabel: recibido.fromLabel,
      busqueda: nombre,
      amount: recibido.amount === null ? '' : String(recibido.amount),
      method: recibido.method,
      giftDescription: recibido.giftDescription,
      receivedAt: recibido.receivedAt || hoy(),
      notes: recibido.notes,
    });
    this.editando.set(true);
  }

  protected async alternarAgradecido(recibido: RegaloRecibido): Promise<void> {
    if (this.tocando() !== null) return;

    this.tocando.set(recibido.id);
    await this.store.agradecer(recibido, hoy());
    this.tocando.set(null);
  }

  protected async guardar(): Promise<void> {
    const forma = this.forma();
    if (this.guardando()) return;

    this.guardando.set(true);
    const resultado = await this.store.guardar({
      id: forma.id ?? undefined,
      guestId: forma.guestId,
      fromLabel: forma.fromLabel.trim().slice(0, MAX_ETIQUETA),
      amount: this.esDinero() ? importeDe(forma.amount) : null,
      method: forma.method,
      giftDescription: this.esDinero() ? '' : forma.giftDescription.trim(),
      receivedAt: forma.receivedAt,
      // Apuntar algo no lo da por agradecido: al editar se conserva lo que
      // hubiera, y lo nuevo nace sin agradecer, que es lo que es.
      thanked: this.yaAgradecido(forma.id),
      thankedAt: this.cuandoAgradecido(forma.id),
      notes: forma.notes.trim(),
    });
    this.guardando.set(false);

    if (resultado.ok) this.editando.set(false);
  }

  protected async borrar(): Promise<void> {
    const id = this.forma().id;
    if (id === null) return;

    const resultado = await this.store.borrar(id);
    if (resultado.ok) this.editando.set(false);
  }

  private yaAgradecido(id: string | null): boolean {
    return id !== null && (this.store.recibidos().find((r) => r.id === id)?.thanked ?? false);
  }

  private cuandoAgradecido(id: string | null): string | null {
    return id === null
      ? null
      : (this.store.recibidos().find((r) => r.id === id)?.thankedAt ?? null);
  }
}

/** Un importe tecleado, o nada. Lo que no es un número no es un importe. */
function importeDe(texto: string): number | null {
  const limpio = texto.replace(',', '.').trim();
  if (limpio === '') return null;

  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) / 100 : null;
}
