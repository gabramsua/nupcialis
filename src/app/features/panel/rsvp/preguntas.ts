import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  PREGUNTA_DE_ASISTENCIA,
  soloSiViene,
  type FalloPreguntas,
  type PreguntaDelPanel,
} from '../../../core/rsvp/preguntas-gateway';
import type { TipoPregunta } from '../../../core/rsvp/rsvp-gateway';
import { PUERTA_RESPUESTAS } from '../../../core/rsvp/respuestas-gateway';
import { BodaStore } from '../boda.store';
import { PreguntasStore } from './preguntas.store';
import { resumirPregunta } from './resumen-respuestas';
import { NpInput } from '../../../design-system/components/field/input';

/** Los tipos que la pareja puede elegir, en el orden en que se entienden. */
const TIPOS: readonly TipoPregunta[] = [
  'boolean',
  'select',
  'radio',
  'checkbox',
  'text',
  'textarea',
  'number',
  'date',
];

/** Cuántos días antes de la boda se cierra el formulario sin plazo propio (D-66). Mismo valor que en el servidor. */
const DIAS_PLAZO_POR_DEFECTO = 7;

/**
 * El formulario de confirmación, como lo configura la pareja.
 *
 * Una boda nueva ya trae ocho preguntas puestas; lo que la pareja hace aquí es
 * ajustarlas. De ahí la forma de la pantalla: **una lista con lo que ya hay**,
 * no un creador en blanco.
 *
 * Tres cosas que se ven a propósito:
 *
 * - **Qué preguntas están apagadas**, con su chip. Sin esto, la pareja no
 *   entiende por qué su formulario tiene cinco preguntas y aquí hay ocho.
 * - **Cuáles no se pueden borrar.** Las de sistema alimentan el resto del
 *   producto —la del menú, la exportación al catering— y se pueden desactivar y
 *   reetiquetar, pero no borrar. Las reglas lo impiden; aquí se explica antes de
 *   que alguien lo intente.
 * - **A quién se le pregunta**: hay preguntas que son para el titular y otras
 *   para cada comensal, acompañantes incluidos.
 *
 * Lo que **no** hay es un constructor de condiciones. En su lugar, una casilla:
 * «solo a quien confirme que viene». Es la única condición que se da en una
 * boda de verdad, y un editor genérico de condiciones es una pantalla entera
 * para un caso que no existe. El modelo aguanta cualquier condición; este editor
 * escribe esa.
 */
@Component({
  selector: 'np-preguntas-rsvp',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpModal,
    NpStatusChip,
    NpIcon,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="pr">
        <header class="pr__intro">
          <div>
            <h2>{{ t('panel.rsvp.titulo') }}</h2>
            <p>{{ t('panel.rsvp.ayuda') }}</p>
          </div>
          <div class="pr__cabecera">
            <!--
              Lo que han contestado, al lado de las preguntas: es lo mismo visto
              del otro lado, y es donde la pareja lo busca.
            -->
            <a npButton variant="secondary" routerLink="/panel/rsvp/respuestas">
              <np-icon name="chat-circle-text" />
              {{ t('panel.rsvp.verRespuestas') }}
            </a>
            <button npButton type="button" (click)="nueva()">
              <np-icon name="plus" />
              {{ t('panel.rsvp.nueva') }}
            </button>
          </div>
        </header>

        <!--
          El plazo, arriba y a la vista: es lo que decide si el formulario sigue
          abierto, y la pareja lo busca aquí y no en «Datos de la boda».
        -->
        <div class="pr__plazo">
          <label for="rsvp-limite">{{ t('panel.rsvp.limite') }}</label>
          <div class="pr__plazo-fila">
            <input
              npInput
              id="rsvp-limite"
              type="date"
              aria-describedby="rsvp-limite-ayuda"
              [value]="limiteComoTexto()"
              (change)="cambiarLimite($event)"
            />
            @if (limiteComoTexto()) {
              <button npButton variant="ghost" type="button" (click)="quitarLimite()">
                {{ t('panel.rsvp.sinLimite') }}
              </button>
            }
          </div>
          <small id="rsvp-limite-ayuda">
            @if (limiteComoTexto()) {
              {{ t('panel.rsvp.limiteAyuda') }}
            } @else if (plazoPorDefecto(); as dia) {
              {{ t('panel.rsvp.limiteDefecto', { fecha: dia }) }}
            } @else {
              {{ t('panel.rsvp.limiteDefectoSinFecha') }}
            }
          </small>
        </div>

        @if (store.estado() === 'error' && store.fallo(); as f) {
          <np-alert status="declined" [heading]="t('panel.rsvp.errorCargar')">
            <p>{{ textoDelFallo(f, t) }}</p>
          </np-alert>
        } @else if (store.estado() === 'cargando') {
          <p class="pr__cargando">{{ t('panel.rsvp.cargando') }}</p>
        } @else {
          @if (store.fallo(); as f) {
            <np-alert status="declined" [heading]="t('panel.rsvp.errorGuardar')">
              <p>{{ textoDelFallo(f, t) }}</p>
            </np-alert>
          }

          <ol class="pr__lista">
            @for (p of store.preguntas(); track p.id; let i = $index) {
              <li class="pr__ficha" [class.pr__ficha--apagada]="!p.enabled">
                <div class="pr__cuerpo">
                  <p class="pr__etiqueta">{{ p.label }}</p>
                  <p class="pr__meta">
                    {{ t('panel.rsvp.tipo.' + p.type) }}
                    @if (p.required) {
                      · {{ t('panel.rsvp.obligatoria') }}
                    }
                    @if (p.target !== 'both') {
                      · {{ t('panel.rsvp.para.' + p.target) }}
                    }
                    @if (esCondicional(p)) {
                      · {{ t('panel.rsvp.soloSiViene') }}
                    }
                  </p>
                  <div class="pr__chips">
                    @if (!p.enabled) {
                      <np-status-chip status="pending" [label]="t('panel.rsvp.apagada')" />
                    }
                    @if (p.isSystem) {
                      <np-status-chip status="info" [label]="t('panel.rsvp.deSistema')" />
                    }
                  </div>
                </div>

                <div class="pr__acciones">
                  <button
                    npButton
                    size="sm"
                    variant="ghost"
                    type="button"
                    [disabled]="i === 0"
                    [attr.aria-label]="t('panel.rsvp.subir')"
                    (click)="subir(i)"
                  >
                    <np-icon name="caret-up" />
                  </button>
                  <button
                    npButton
                    size="sm"
                    variant="ghost"
                    type="button"
                    [disabled]="i === store.preguntas().length - 1"
                    [attr.aria-label]="t('panel.rsvp.bajar')"
                    (click)="bajar(i)"
                  >
                    <np-icon name="caret-down" />
                  </button>
                  <button npButton size="sm" variant="secondary" type="button" (click)="editar(p)">
                    <np-icon name="pencil-simple" />
                    {{ t('common.edit') }}
                  </button>
                  <button npButton size="sm" variant="ghost" type="button" (click)="alternar(p)">
                    <np-icon [name]="p.enabled ? 'eye-slash' : 'eye'" />
                    {{ p.enabled ? t('panel.rsvp.desactivar') : t('panel.rsvp.activar') }}
                  </button>
                  @if (!p.isSystem) {
                    <button
                      npButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      (click)="borrando.set(p)"
                    >
                      <np-icon name="trash" />
                      {{ t('common.delete') }}
                    </button>
                  }
                </div>
              </li>
            }
          </ol>
        }

        @if (editando(); as cual) {
          <np-modal
            [open]="true"
            [heading]="cual === 'nueva' ? t('panel.rsvp.nueva') : t('panel.rsvp.editar')"
            (closed)="cerrarEditor()"
          >
            <form class="pr__form" [formGroup]="formulario" (ngSubmit)="guardar()">
              <label>
                <span>{{ t('panel.rsvp.campo.etiqueta') }}</span>
                <input npInput formControlName="label" type="text" maxlength="120" />
              </label>

              <label>
                <span>{{ t('panel.rsvp.campo.ayuda') }}</span>
                <input npInput formControlName="helpText" type="text" maxlength="200" />
                <small>{{ t('panel.rsvp.campo.ayudaPista') }}</small>
              </label>

              <label>
                <span>{{ t('panel.rsvp.campo.tipo') }}</span>
                <!--
                  Una de sistema no cambia de tipo: su respuesta alimenta un
                  campo del invitado y cambiar el tipo lo dejaría con basura
                  dentro. Se reetiqueta y se desactiva, eso sí.
                -->
                <select npInput formControlName="type">
                  @for (tipo of tipos; track tipo) {
                    <option [value]="tipo" [selected]="formulario.controls.type.value === tipo">
                      {{ t('panel.rsvp.tipo.' + tipo) }}
                    </option>
                  }
                </select>
                @if (cual !== 'nueva' && cual.isSystem) {
                  <small>{{ t('panel.rsvp.campo.tipoFijo') }}</small>
                }
              </label>

              @if (pideOpciones()) {
                <label>
                  <span>{{ t('panel.rsvp.campo.opciones') }}</span>
                  <textarea npInput formControlName="opciones" rows="5"></textarea>
                  <small>{{ t('panel.rsvp.campo.opcionesPista') }}</small>
                </label>
              }

              <label>
                <span>{{ t('panel.rsvp.campo.para') }}</span>
                <select npInput formControlName="target">
                  @for (destino of destinos; track destino) {
                    <option
                      [value]="destino"
                      [selected]="formulario.controls.target.value === destino"
                    >
                      {{ t('panel.rsvp.para.' + destino) }}
                    </option>
                  }
                </select>
              </label>

              <label class="pr__casilla">
                <input formControlName="required" type="checkbox" />
                <span>{{ t('panel.rsvp.campo.obligatoria') }}</span>
              </label>

              @if (cual === 'nueva' || !esLaDeAsistencia(cual)) {
                <label class="pr__casilla">
                  <input formControlName="soloSiViene" type="checkbox" />
                  <span>{{ t('panel.rsvp.campo.soloSiViene') }}</span>
                </label>
              }

              <label class="pr__casilla">
                <input formControlName="enabled" type="checkbox" />
                <span>{{ t('panel.rsvp.campo.activa') }}</span>
              </label>
            </form>

            <!--
              Cambiar el tipo de una pregunta ya contestada no borra lo que hay
              escrito: una respuesta de texto se queda guardada aunque la
              pregunta pase a ser una lista. Lo que no puede pasar es que la
              pareja lo descubra después (F1.8f).
            -->
            @if (avisoDeTipo(); as cuantas) {
              <np-alert status="attention" [heading]="t('panel.rsvp.cambioDeTipo.titulo')">
                <p>{{ t('panel.rsvp.cambioDeTipo.explicacion', { n: cuantas }) }}</p>
              </np-alert>
            }

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="cerrarEditor()">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                type="button"
                [loading]="guardando()"
                [disabled]="formulario.invalid"
                (click)="guardar()"
              >
                <np-icon name="check" />
                {{ avisoDeTipo() ? t('panel.rsvp.cambioDeTipo.seguir') : t('common.save') }}
              </button>
            </div>
          </np-modal>
        }

        @if (borrando(); as cual) {
          <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
            <p>{{ t('panel.rsvp.confirmarBorrado', { etiqueta: cual.label }) }}</p>
            <p>{{ t('panel.rsvp.borradoAviso') }}</p>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="borrando.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                variant="danger"
                type="button"
                [loading]="borrandoYa()"
                (click)="borrar()"
              >
                {{ t('common.delete') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .pr__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .pr__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .pr__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .pr__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .pr__cabecera {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .pr__plazo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      margin-block-end: var(--np-space-4);
      padding: var(--np-space-3) var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .pr__cargando {
      color: var(--np-surface-text-muted);
    }
    .pr__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    /* Primero móvil: una ficha por pregunta y los botones debajo, a lo ancho.
       Una tabla de cinco columnas en 360 px es un carrusel horizontal. */
    .pr__ficha {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .pr__ficha--apagada {
      opacity: 0.65;
    }
    .pr__etiqueta {
      margin: 0;
      font-weight: var(--np-weight-medium);
    }
    .pr__meta {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pr__chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      margin-block-start: var(--np-space-2);
    }
    .pr__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    @media (min-width: 48rem) {
      .pr__ficha {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .pr__cuerpo {
        flex: 1;
      }
    }
    .pr__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .pr__form label,
    .pr__plazo > label {
      color: var(--np-surface-text-muted);
    }
    /* El botón junto al campo y centrado con él: no con la ayuda de debajo. */
    .pr__plazo-fila {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-3);
    }
    .pr__form label > span,
    .pr__plazo label > span {
      color: var(--np-surface-text-muted);
    }
    .pr__form textarea {
      min-block-size: 6rem;
      resize: vertical;
    }
    .pr__form small,
    .pr__plazo small {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-xs);
    }
    .pr__form .pr__casilla,
    .pr__plazo .pr__casilla {
      flex-direction: row !important;
      align-items: center;
      gap: var(--np-space-3);
      min-block-size: var(--np-tap-target);
    }
    .pr__casilla input {
      inline-size: 1.25rem;
      block-size: 1.25rem;
    }
    .pr__casilla span {
      color: inherit !important;
      font-size: var(--np-text-base);
    }
  `,
})
export class PreguntasRsvp {
  protected readonly store = inject(PreguntasStore);
  private readonly boda = inject(BodaStore);
  private readonly respuestas = inject(PUERTA_RESPUESTAS);
  private readonly fb = inject(FormBuilder);

  protected readonly tipos = TIPOS;
  protected readonly destinos = ['both', 'guest', 'companion'] as const;

  /** La pregunta que se está editando, o `'nueva'` si se está creando una. */
  protected readonly editando = signal<PreguntaDelPanel | 'nueva' | null>(null);
  protected readonly borrando = signal<PreguntaDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly borrandoYa = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(120)]],
    helpText: [''],
    type: ['text' as TipoPregunta],
    opciones: [''],
    target: ['both' as 'guest' | 'companion' | 'both'],
    required: [false],
    soloSiViene: [false],
    enabled: [true],
  });

  /**
   * El tipo que está elegido ahora mismo en el desplegable.
   *
   * De `valueChanges` y no del valor del control: el control no es una señal,
   * y sin esto el campo de opciones no aparecería al cambiar el tipo hasta la
   * siguiente detección de cambios, que en zoneless puede no llegar.
   */
  private readonly tipoElegido = toSignal(this.formulario.controls.type.valueChanges, {
    initialValue: this.formulario.controls.type.value,
  });

  /** Solo los tipos de lista necesitan opciones; el resto no las usa. */
  protected readonly pideOpciones = computed(() =>
    ['select', 'radio', 'checkbox'].includes(this.tipoElegido()),
  );

  /**
   * El plazo si la pareja no pone ninguno: una semana antes de la boda (D-66),
   * dicho como se lee. `null` mientras no haya fecha de boda.
   */
  protected readonly plazoPorDefecto = computed(() => {
    const boda = this.boda.boda()?.weddingDate;
    if (!boda) return null;
    const limite = new Date(boda.getTime() - DIAS_PLAZO_POR_DEFECTO * 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'UTC' }).format(limite);
  });

  protected readonly limiteComoTexto = computed(() => {
    const limite = this.boda.boda()?.rsvpDeadline;
    return limite ? limite.toISOString().slice(0, 10) : '';
  });

  constructor() {
    void this.store.cargar();
  }

  protected esCondicional(pregunta: PreguntaDelPanel): boolean {
    return soloSiViene(pregunta);
  }

  protected esLaDeAsistencia(cual: PreguntaDelPanel): boolean {
    return cual.id === PREGUNTA_DE_ASISTENCIA;
  }

  protected cerrarEditor(): void {
    this.avisoDeTipo.set(null);
    this.editando.set(null);
  }

  protected nueva(): void {
    this.avisoDeTipo.set(null);
    this.formulario.reset({
      label: '',
      helpText: '',
      type: 'text',
      opciones: '',
      target: 'both',
      required: false,
      soloSiViene: true,
      enabled: true,
    });
    this.editando.set('nueva');
  }

  protected editar(pregunta: PreguntaDelPanel): void {
    this.avisoDeTipo.set(null);
    this.formulario.reset({
      label: pregunta.label,
      helpText: pregunta.helpText,
      type: pregunta.type,
      opciones: pregunta.options.map((o) => o.label).join('\n'),
      target: pregunta.target,
      required: pregunta.required,
      soloSiViene: soloSiViene(pregunta),
      enabled: pregunta.enabled,
    });
    this.editando.set(pregunta);
  }

  /**
   * Cuántas respuestas hay guardadas de la pregunta cuyo tipo se va a cambiar.
   *
   * `null` mientras no haya nada que avisar. Es el estado que convierte el
   * botón de «Guardar» en «Cambiar de todas formas»: se pulsa dos veces a
   * propósito, una para enterarse y otra para hacerlo.
   */
  protected readonly avisoDeTipo = signal<number | null>(null);

  /**
   * Cuántos han contestado ya esa pregunta.
   *
   * Hay que preguntárselo al servidor: `guests` está cerrada a lectura directa
   * (regla 2) y las respuestas viven ahí dentro. Si la llamada falla no se
   * bloquea el cambio —se guarda sin aviso—, porque no poder contar no es
   * motivo para impedirle a la pareja editar su formulario.
   */
  private async cuantasRespuestas(pregunta: PreguntaDelPanel): Promise<number> {
    const resultado = await this.respuestas.leer();
    if (!resultado.ok) return 0;

    return resumirPregunta(pregunta, resultado.datos.invitados).total;
  }

  protected async guardar(): Promise<void> {
    const cual = this.editando();
    if (!cual || this.formulario.invalid || this.guardando()) return;

    const valores = this.formulario.getRawValue();
    const nueva = cual === 'nueva';

    // Primero avisar, después guardar. Solo la primera vez: con el aviso ya
    // en pantalla, el siguiente clic es la confirmación.
    if (!nueva && valores.type !== cual.type && this.avisoDeTipo() === null) {
      this.guardando.set(true);
      const cuantas = await this.cuantasRespuestas(cual);
      this.guardando.set(false);

      if (cuantas > 0) {
        this.avisoDeTipo.set(cuantas);
        return;
      }
    }

    this.guardando.set(true);

    const resultado = await this.store.guardar({
      id: nueva ? undefined : cual.id,
      label: valores.label.trim(),
      helpText: valores.helpText.trim(),
      type: valores.type,
      options: opcionesDesdeTexto(valores.opciones),
      required: valores.required,
      target: valores.target,
      // La de asistencia no puede depender de sí misma: sería un formulario
      // que no enseña nada y que, además, el servidor ocultaría entero.
      soloSiViene: valores.soloSiViene && (nueva || !this.esLaDeAsistencia(cual)),
      enabled: valores.enabled,
      order: nueva ? this.store.preguntas().length + 1 : cual.order,
    });

    this.guardando.set(false);
    if (resultado.ok) {
      this.avisoDeTipo.set(null);
      this.editando.set(null);
    }
  }

  /** Encender y apagar en un toque: es lo que más se hace aquí. */
  protected async alternar(pregunta: PreguntaDelPanel): Promise<void> {
    await this.store.guardar({
      id: pregunta.id,
      label: pregunta.label,
      helpText: pregunta.helpText,
      type: pregunta.type,
      options: pregunta.options,
      required: pregunta.required,
      target: pregunta.target,
      soloSiViene: soloSiViene(pregunta),
      enabled: !pregunta.enabled,
      order: pregunta.order,
    });
  }

  protected async borrar(): Promise<void> {
    const cual = this.borrando();
    if (!cual || this.borrandoYa()) return;

    this.borrandoYa.set(true);
    const resultado = await this.store.borrar(cual.id);
    this.borrandoYa.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  protected async subir(indice: number): Promise<void> {
    await this.mover(indice, indice - 1);
  }

  protected async bajar(indice: number): Promise<void> {
    await this.mover(indice, indice + 1);
  }

  private async mover(desde: number, hasta: number): Promise<void> {
    const ids = this.store.preguntas().map((p) => p.id);
    if (hasta < 0 || hasta >= ids.length) return;

    const movida = ids[desde]!;
    ids.splice(desde, 1);
    ids.splice(hasta, 0, movida);
    await this.store.reordenar(ids);
  }

  protected async cambiarLimite(evento: Event): Promise<void> {
    const valor = (evento.target as HTMLInputElement).value;
    if (valor === '') {
      await this.boda.guardarFechaLimite(null);
      return;
    }

    const fecha = new Date(`${valor}T00:00:00.000Z`);
    if (!Number.isNaN(fecha.getTime())) await this.boda.guardarFechaLimite(fecha);
  }

  protected async quitarLimite(): Promise<void> {
    await this.boda.guardarFechaLimite(null);
  }

  protected textoDelFallo(fallo: FalloPreguntas, t: (clave: string) => string): string {
    // Nunca el mensaje del SDK: un código de Firestore no le dice nada a la
    // pareja. Ya pasó con un «Unauthenticated [401]» en la lista de invitados.
    return fallo.tipo === 'error'
      ? t('panel.rsvp.fallo.desconocido')
      : t('panel.rsvp.fallo.' + fallo.tipo);
  }
}

/**
 * Las opciones, una por línea.
 *
 * Es lo que la pareja espera poder hacer: escribir «Normal / Vegetariano /
 * Vegano» y ya. El `value` se deriva de la etiqueta y **no cambia aunque luego
 * se reetiquete**, porque las respuestas ya guardadas apuntan a él.
 */
export function opcionesDesdeTexto(texto: string): readonly { value: string; label: string }[] {
  const vistos = new Set<string>();

  return texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '')
    .flatMap((label) => {
      const value =
        label
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'opcion';

      if (vistos.has(value)) return [];
      vistos.add(value);
      return [{ value, label }];
    });
}
