import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { PUERTA_INVITADOS, type Invitado } from '../../../core/invitados/invitados-gateway';
import { PUERTA_TAREAS } from '../../../core/checklist/tareas-gateway';
import { fechaLarga, fechaMedia } from '../../../shared/fecha';
import { BodaStore } from '../boda.store';
import { ICONO_MODULO, rutaDeModulo, type Modulo } from '../boda';
import {
  plazoDeTarea,
  resumirTareas,
  tareasUrgentes,
  type TareaDelPanel,
} from '../checklist/tareas';
import { cifras, diasParaLaBoda, pendientes } from './pendientes';

/**
 * La primera pantalla del panel.
 *
 * Contesta, por este orden, lo que la pareja viene a mirar:
 *
 * 1. **Cuánto queda.** Es lo primero que se mira, todos los días.
 * 2. **Cuántos vienen y cuántos han abierto la invitación.** Las dos cifras
 *    que de verdad se consultan; el resto del detalle está en su pantalla.
 * 3. **Qué falta por hacer**, sacado de lo que ya sabemos y no de una lista
 *    que ellos tengan que mantener. Cada cosa lleva a donde se arregla.
 * 4. **Los atajos** a lo que se usa a diario.
 *
 * Primero móvil: una columna, las cifras grandes y lo pendiente en una lista
 * que se lee de un vistazo.
 */
/** Cuántas tareas urgentes se enseñan en el inicio; el resto, en su pantalla. */
const MAX_URGENTES = 3;

@Component({
  selector: 'np-panel-resumen',
  imports: [RouterLink, TranslocoDirective, NpButton, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="re">
        <header class="re__intro">
          <h2>{{ t('panel.inicio.hola', { nombres: nombres() }) }}</h2>
          @if (dias(); as cuantos) {
            <p class="re__cuenta">
              <np-icon name="clock-countdown" />
              @if (cuantos > 0) {
                {{ t('panel.inicio.faltan', { n: cuantos }) }}
              } @else if (cuantos === 0) {
                {{ t('panel.inicio.hoy') }}
              } @else {
                {{ t('panel.inicio.pasada', { n: -cuantos }) }}
              }
            </p>
            <p class="re__fecha">{{ fechaDeLaBoda() }}</p>
          } @else {
            <p class="re__fecha">{{ t('panel.inicio.sinFecha') }}</p>
          }
        </header>

        <!--
          Las dos cifras que se consultan a diario. Cada una lleva a la lista
          ya filtrada: mirar «84 sin contestar» y tener que buscarlos a mano
          era el paso que sobraba.
        -->
        <dl class="re__cifras">
          <a class="re__cifra" routerLink="/panel/guests">
            <dt>{{ t('panel.inicio.vienen') }}</dt>
            <dd>
              {{ cuenta().confirmados }}<span>/{{ cuenta().invitados }}</span>
            </dd>
          </a>
          <a class="re__cifra" routerLink="/panel/guests/accesos">
            <dt>{{ t('panel.inicio.hanEntrado') }}</dt>
            <dd>
              {{ cuenta().hanEntrado }}<span>/{{ cuenta().invitados }}</span>
            </dd>
          </a>
        </dl>

        <!--
          Lo que falta. No es una lista que la pareja mantenga —eso son las
          tareas, justo debajo—: es lo que este panel puede ver que está a
          medias, y se vacía sola según lo van haciendo.
        -->
        <section class="re__pendientes">
          <h3>{{ t('panel.inicio.queFalta') }}</h3>
          @if (cargando()) {
            <p class="re__cargando">{{ t('panel.inicio.cargando') }}</p>
          } @else if (loQueFalta().length === 0) {
            <p class="re__alDia">
              <np-icon name="check-circle" weight="fill" />
              {{ t('panel.inicio.alDia') }}
            </p>
          } @else {
            <ul>
              @for (falta of loQueFalta(); track falta.clave) {
                <li>
                  <a [routerLink]="falta.ruta">
                    <np-icon [name]="falta.icono" />
                    <span>{{ t('panel.inicio.falta.' + falta.clave, { n: falta.cuantos }) }}</span>
                    <np-icon name="caret-right" />
                  </a>
                </li>
              }
            </ul>
          }
        </section>

        <!--
          Las tareas que queman: vencidas y de esta semana. Solo sale si el
          módulo está encendido y hay tareas; lo demás está en su pantalla.
        -->
        @if (hayTareas()) {
          <section class="re__tareas">
            <h3>
              {{ t('panel.inicio.tareas.titulo') }}
              <a routerLink="/panel/checklist">{{ t('panel.inicio.tareas.verTodas') }}</a>
            </h3>
            @if (urgentes().length === 0) {
              <p class="re__alDia">
                <np-icon name="check-circle" weight="fill" />
                {{
                  t('panel.inicio.tareas.alDia', {
                    hechas: resumenTareas().hechas,
                    total: resumenTareas().total,
                  })
                }}
              </p>
            } @else {
              <ul>
                @for (tarea of urgentes(); track tarea.id) {
                  <li [attr.data-vencida]="vencida(tarea)">
                    <a routerLink="/panel/checklist">
                      <np-icon [name]="vencida(tarea) ? 'warning' : 'clock-countdown'" />
                      <span>
                        {{ tarea.title }}
                        <small>{{ plazo(tarea, t) }}</small>
                      </span>
                      <np-icon name="caret-right" />
                    </a>
                  </li>
                }
              </ul>
              @if (masUrgentes() > 0) {
                <p class="re__mas">{{ t('panel.inicio.tareas.mas', { n: masUrgentes() }) }}</p>
              }
            }
          </section>
        }

        <section class="re__atajos">
          <h3>{{ t('panel.inicio.atajos') }}</h3>
          <div>
            <a npButton variant="secondary" routerLink="/panel/rsvp/respuestas">
              <np-icon name="chat-circle-text" />
              {{ t('panel.inicio.verRespuestas') }}
            </a>
            <a npButton variant="secondary" routerLink="/panel/guests">
              <np-icon name="users" />
              {{ t('panel.inicio.verInvitados') }}
            </a>
            <!--
              Los módulos que la pareja tiene encendidos y todavía no tienen
              pantalla salen igual, apagados y diciendo que llegan pronto: los
              ha contratado, y esconderlos haría pensar que no están.
            -->
            @for (modulo of otrosModulos(); track modulo) {
              @if (ruta(modulo); as destino) {
                <a npButton variant="ghost" [routerLink]="destino">
                  <np-icon [name]="icono(modulo)" />
                  {{ t('panel.modulo.' + modulo) }}
                </a>
              } @else {
                <span class="re__enCamino">
                  <np-icon [name]="icono(modulo)" />
                  {{ t('panel.modulo.' + modulo) }}
                  <small>{{ t('panel.enCamino') }}</small>
                </span>
              }
            }
          </div>
        </section>
      </section>
    </ng-container>
  `,
  styles: `
    .re {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-5);
    }
    .re__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .re__cuenta {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: var(--np-space-2) 0 0;
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-medium);
    }
    .re__fecha {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .re__cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--np-space-3);
      margin: 0;
    }
    .re__cifra {
      display: block;
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: inherit;
      text-decoration: none;
    }
    .re__cifra dt {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .re__cifra dd {
      margin: var(--np-space-1) 0 0;
      font-size: var(--np-text-3xl);
      font-weight: var(--np-weight-semibold);
      font-variant-numeric: tabular-nums;
    }
    .re__cifra dd span {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-regular);
    }
    .re__tareas h3,
    .re__pendientes h3,
    .re__atajos h3 {
      margin: 0 0 var(--np-space-2);
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-medium);
    }
    .re__tareas ul,
    .re__pendientes ul {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .re__tareas a,
    .re__pendientes a {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: inherit;
      font-size: var(--np-text-sm);
      text-decoration: none;
    }
    .re__tareas a span,
    .re__pendientes a span {
      flex: 1;
    }
    .re__alDia {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      color: var(--np-confirmed-fg);
    }
    .re__cargando {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .re__atajos div {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .re__enCamino {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px dashed var(--np-surface-border);
      border-radius: var(--np-radius-md);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .re__enCamino small {
      opacity: 0.8;
    }
    .re__tareas h3 {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    .re__tareas h3 a {
      display: inline;
      min-block-size: 0;
      padding: 0;
      border: 0;
      background: none;
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-regular);
    }
    .re__tareas li small {
      display: block;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .re__tareas li[data-vencida='true'] a {
      border-inline-start: 4px solid var(--np-declined-border);
    }
    .re__tareas li[data-vencida='false'] a {
      border-inline-start: 4px solid var(--np-pending-border);
    }
    .re__mas {
      margin: var(--np-space-2) 0 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PanelResumen {
  protected readonly store = inject(BodaStore);
  private readonly puerta = inject(PUERTA_INVITADOS);
  /** Opcional: el inicio no depende de las tareas para pintarse. */
  private readonly puertaTareas = inject(PUERTA_TAREAS, { optional: true });
  private readonly ahora = new Date();
  private tareasPedidas = false;

  private readonly invitados = signal<readonly Invitado[]>([]);
  protected readonly cargando = signal(true);

  private readonly tareas = signal<readonly TareaDelPanel[]>([]);
  protected readonly resumenTareas = computed(() => resumirTareas(this.tareas(), this.ahora));
  protected readonly hayTareas = computed(
    () => this.store.boda()?.modulos.checklist?.enabled === true && this.tareas().length > 0,
  );
  private readonly todasLasUrgentes = computed(() =>
    tareasUrgentes(this.tareas(), this.ahora, 999),
  );
  protected readonly urgentes = computed(() => this.todasLasUrgentes().slice(0, MAX_URGENTES));
  protected readonly masUrgentes = computed(
    () => this.todasLasUrgentes().length - this.urgentes().length,
  );

  protected vencida(tarea: TareaDelPanel): boolean {
    return plazoDeTarea(tarea, this.ahora).clave === 'vencio';
  }

  protected plazo(
    tarea: TareaDelPanel,
    t: (clave: string, params?: Record<string, unknown>) => string,
  ): string {
    const p = plazoDeTarea(tarea, this.ahora);
    return t('panel.checklist.' + p.clave, { fecha: fechaMedia(p.fecha, 'es'), n: p.n });
  }

  protected readonly cuenta = computed(() => cifras(this.invitados()));
  protected readonly loQueFalta = computed(() => pendientes(this.store.boda(), this.invitados()));

  protected readonly nombres = computed(() => {
    const pareja = this.store.boda()?.pareja;
    return pareja ? [pareja.partnerA, pareja.partnerB].filter(Boolean).join(' y ') : '';
  });

  protected readonly dias = computed(() => diasParaLaBoda(this.store.boda()?.weddingDate ?? null));

  protected fechaDeLaBoda(): string {
    return fechaLarga(this.store.boda()?.weddingDate ?? null, 'es');
  }

  /**
   * Los módulos encendidos que no son los dos que ya tienen su atajo arriba.
   *
   * Salen aunque no tengan pantalla: la pareja los tiene contratados y
   * encendidos, y un módulo que desaparece del panel parece un módulo que no
   * está incluido.
   */
  protected readonly otrosModulos = computed(() =>
    this.store
      .menu()
      .map((entrada) => entrada.modulo)
      .filter((modulo) => modulo !== 'guests' && modulo !== 'rsvp' && modulo !== 'publicSite'),
  );

  protected ruta(modulo: Modulo): string | null {
    return rutaDeModulo(modulo);
  }

  protected icono(modulo: Modulo) {
    return ICONO_MODULO[modulo];
  }

  constructor() {
    void this.cargar();

    // Las tareas se piden cuando la boda ya está cargada y solo si el módulo
    // está encendido: sin él no hay nada que enseñar ni permiso que gastar.
    effect(() => {
      const boda = this.store.boda();
      if (!boda || this.tareasPedidas || !this.puertaTareas) return;
      if (boda.modulos.checklist?.enabled !== true) return;
      this.tareasPedidas = true;
      void this.cargarTareas(boda.weddingId);
    });
  }

  /** Si falla, el aviso simplemente no sale: el error de verdad está en su pantalla. */
  private async cargarTareas(weddingId: string): Promise<void> {
    const resultado = await this.puertaTareas?.listar(weddingId);
    if (resultado?.ok) this.tareas.set(resultado.tareas);
  }

  /**
   * La lista de invitados, para las cifras.
   *
   * Si falla no se enseña ningún error aquí: la pantalla sigue valiendo para
   * la cuenta atrás y los atajos, y el error de verdad —con su explicación y
   * su botón de reintentar— lo da la pantalla de invitados.
   */
  private async cargar(): Promise<void> {
    const resultado = await this.puerta.listar();
    if (resultado.ok) this.invitados.set(resultado.invitados);
    this.cargando.set(false);
  }
}
