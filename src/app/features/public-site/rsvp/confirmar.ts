import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { NpCabeceraBoda } from '../navegacion/cabecera-boda';
import { conCabecera, usarTemaDeLaBoda } from '../tema';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import {
  PUERTA_RSVP,
  type FalloPregunta,
  type FalloRsvp,
  type Formulario,
  type Pregunta,
  type Respuestas,
} from '../../../core/rsvp/rsvp-gateway';
import { visibles } from '../../../core/rsvp/visibilidad';
import type { ModoAcceso } from '../../../core/acceso/acceso';
import { NpAcompanantes } from './acompanantes';
import { NpVerificar } from './verificar';

type Carga = 'cargando' | 'lista' | 'error' | 'verificar';

/**
 * El formulario de confirmación, como lo ve el invitado.
 *
 * Lo rellena alguien de pie en la cocina con el móvil en una mano. De ahí todo
 * lo que tiene:
 *
 * - **Una pregunta por bloque**, a lo ancho y con el toque grande. Nada de dos
 *   columnas ni de campos pequeños.
 * - **El sí y el no son dos botones**, no un desplegable: es la pregunta que
 *   contesta todo el mundo y no debería costar dos toques y un scroll.
 * - **Lo que no se le pregunta no se le enseña**: al marcar que no viene, el
 *   menú y las alergias desaparecen en el mismo instante, sin viaje al
 *   servidor. La regla está copiada del servidor a propósito; ver
 *   `core/rsvp/visibilidad.ts`.
 * - **El fallo va pegado a su pregunta.** Un aviso genérico arriba, en un
 *   formulario de ocho preguntas y una pantalla de 360 px, obliga a buscar.
 *
 * Se puede volver a entrar y cambiar la respuesta mientras el plazo siga
 * abierto: la gente confirma, le cambian los planes y vuelve. Quien manda sobre
 * el plazo es el servidor; esto solo se adelanta a contarlo.
 */
@Component({
  selector: 'np-confirmar',
  imports: [NpCabeceraBoda, TranslocoDirective, NpIcon, NpAcompanantes, NpVerificar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Los colores de la pareja, igual que en la web y en la puerta: el invitado
  // no debería notar que esto es otra pantalla.
  host: { '[style]': 'colores()' },
  template: `
    <ng-container *transloco="let t">
      @if (cabecera()) {
        <np-cabecera-boda [tenant]="tenant()" />
      }
      <main class="cf">
        <div class="cf__hoja">
          @switch (carga()) {
            @case ('cargando') {
              <p class="cf__ayuda">{{ t('publico.confirmar.cargando') }}</p>
            }

            @case ('verificar') {
              <!--
                Está dentro por el enlace, pero esto pide los cuatro dígitos
                (D-34). No es un error: es el paso que falta, y se le pregunta
                aquí sin mandarlo a ninguna otra pantalla.
              -->
              <p class="cf__hola">{{ t('publico.confirmar.titulo') }}</p>
              <np-verificar [modo]="modoAVerificar()" (verificado)="cargar()" />
            }

            @case ('error') {
              <div class="cf__aviso cf__aviso--mal" role="alert">
                <np-icon name="warning" weight="fill" />
                <p>{{ textoDelFallo(t) }}</p>
              </div>
              <button type="button" class="cf__boton" (click)="cargar()">
                {{ t('publico.confirmar.reintentar') }}
              </button>
            }

            @case ('lista') {
              @if (formulario(); as f) {
                <p class="cf__hola">{{ t('publico.confirmar.hola', { nombre: f.nombre }) }}</p>
                <h1>{{ t('publico.confirmar.titulo') }}</h1>

                @if (enviado(); as estado) {
                  <!--
                    Después de enviar, lo primero es que ha salido: el invitado
                    necesita saberlo sin leer nada más. El color va con icono y
                    texto, como en todo el producto.
                  -->
                  <div
                    class="cf__aviso"
                    [class.cf__aviso--si]="estado === 'confirmed'"
                    [class.cf__aviso--no]="estado === 'declined'"
                    role="status"
                  >
                    <np-icon
                      [name]="estado === 'confirmed' ? 'check-circle' : 'x-circle'"
                      weight="fill"
                    />
                    <p>{{ t('publico.confirmar.enviado.' + estado) }}</p>
                  </div>
                  @if (f.abierto) {
                    <p class="cf__ayuda">{{ t('publico.confirmar.sePuedeCambiar') }}</p>
                    <button
                      type="button"
                      class="cf__boton cf__boton--suave"
                      (click)="volverAEditar()"
                    >
                      {{ t('publico.confirmar.cambiar') }}
                    </button>
                  }
                } @else if (!f.abierto) {
                  <!-- Plazo cerrado: se dice cuándo terminó y lo contestado se queda a la vista. -->
                  <div class="cf__aviso cf__aviso--mal" role="status">
                    <np-icon name="clock-countdown" weight="fill" />
                    <p>
                      {{
                        f.limite
                          ? t('publico.confirmar.cerrado.con', { fecha: fechaLimite(f.limite) })
                          : t('publico.confirmar.cerrado.sin')
                      }}
                    </p>
                  </div>
                  @if (f.yaContestado) {
                    <dl class="cf__resumen">
                      @for (p of aLaVista(); track p.id) {
                        <dt>{{ p.label }}</dt>
                        <dd>{{ comoTexto(p) || t('publico.confirmar.sinRespuesta') }}</dd>
                      }
                    </dl>
                  }
                } @else {
                  @if (f.limite) {
                    <p class="cf__ayuda">
                      {{ t('publico.confirmar.hastaCuando', { fecha: fechaLimite(f.limite) }) }}
                    </p>
                  }

                  <!--
                    submit y no ngSubmit: aquí no hay FormsModule ni
                    ReactiveFormsModule, así que ngSubmit no existe como evento
                    y el botón no haría nada —la página se recargaría perdiendo
                    lo escrito—. Lo encontró la prueba de la pantalla.
                  -->
                  <form (submit)="enviar($event)" novalidate>
                    @for (p of aLaVista(); track p.id) {
                      <fieldset class="cf__campo" [class.cf__campo--mal]="falloDe(p.id) !== null">
                        <legend>
                          {{ p.label }}
                          @if (p.required) {
                            <span
                              class="cf__obligatoria"
                              [attr.aria-label]="t('publico.confirmar.obligatoria')"
                              >*</span
                            >
                          }
                        </legend>

                        @if (p.helpText) {
                          <p class="cf__pista" [id]="'pista-' + p.id">{{ p.helpText }}</p>
                        }

                        @switch (p.type) {
                          @case ('boolean') {
                            <div class="cf__sino">
                              <button
                                type="button"
                                class="cf__opcion cf__opcion--si"
                                [class.cf__opcion--puesta]="valor(p.id) === true"
                                [attr.aria-pressed]="valor(p.id) === true"
                                (click)="poner(p.id, true)"
                              >
                                <np-icon
                                  name="check-circle"
                                  [weight]="valor(p.id) === true ? 'fill' : 'regular'"
                                />
                                {{ t('publico.confirmar.si') }}
                              </button>
                              <button
                                type="button"
                                class="cf__opcion cf__opcion--no"
                                [class.cf__opcion--puesta]="valor(p.id) === false"
                                [attr.aria-pressed]="valor(p.id) === false"
                                (click)="poner(p.id, false)"
                              >
                                <np-icon
                                  name="x-circle"
                                  [weight]="valor(p.id) === false ? 'fill' : 'regular'"
                                />
                                {{ t('publico.confirmar.no') }}
                              </button>
                            </div>
                          }

                          @case ('select') {
                            <select
                              [attr.aria-describedby]="p.helpText ? 'pista-' + p.id : null"
                              (change)="ponerTexto(p.id, $event)"
                            >
                              <option value="" [selected]="valor(p.id) === undefined">
                                {{ t('publico.confirmar.elige') }}
                              </option>
                              @for (o of p.options; track o.value) {
                                <option [value]="o.value" [selected]="valor(p.id) === o.value">
                                  {{ o.label }}
                                </option>
                              }
                            </select>
                          }

                          @case ('radio') {
                            <div class="cf__lista">
                              @for (o of p.options; track o.value) {
                                <label class="cf__marca">
                                  <input
                                    type="radio"
                                    [name]="p.id"
                                    [value]="o.value"
                                    [checked]="valor(p.id) === o.value"
                                    (change)="poner(p.id, o.value)"
                                  />
                                  <span>{{ o.label }}</span>
                                </label>
                              }
                            </div>
                          }

                          @case ('checkbox') {
                            <div class="cf__lista">
                              @for (o of p.options; track o.value) {
                                <label class="cf__marca">
                                  <input
                                    type="checkbox"
                                    [value]="o.value"
                                    [checked]="marcada(p.id, o.value)"
                                    (change)="alternar(p.id, o.value)"
                                  />
                                  <span>{{ o.label }}</span>
                                </label>
                              }
                            </div>
                          }

                          @case ('textarea') {
                            <textarea
                              rows="4"
                              [value]="comoCadena(p.id)"
                              [attr.aria-describedby]="p.helpText ? 'pista-' + p.id : null"
                              (input)="ponerTexto(p.id, $event)"
                            ></textarea>
                          }

                          @case ('number') {
                            <input
                              type="number"
                              inputmode="numeric"
                              [value]="comoCadena(p.id)"
                              (input)="ponerTexto(p.id, $event)"
                            />
                          }

                          @case ('date') {
                            <input
                              type="date"
                              [value]="comoCadena(p.id)"
                              (input)="ponerTexto(p.id, $event)"
                            />
                          }

                          @default {
                            <input
                              type="text"
                              [value]="comoCadena(p.id)"
                              [attr.aria-describedby]="p.helpText ? 'pista-' + p.id : null"
                              (input)="ponerTexto(p.id, $event)"
                            />
                          }
                        }

                        @if (falloDe(p.id); as motivo) {
                          <p class="cf__mal" role="alert">
                            {{ t('publico.confirmar.fallo.' + motivo) }}
                          </p>
                        }
                      </fieldset>
                    }

                    @if (falloGeneral()) {
                      <div class="cf__aviso cf__aviso--mal" role="alert">
                        <np-icon name="warning" weight="fill" />
                        <p>{{ textoDelFallo(t) }}</p>
                      </div>
                    }

                    <button type="submit" class="cf__boton" [disabled]="enviando()">
                      {{
                        enviando()
                          ? t('publico.confirmar.enviando')
                          : t(
                              f.yaContestado
                                ? 'publico.confirmar.guardar'
                                : 'publico.confirmar.enviar'
                            )
                      }}
                    </button>
                  </form>

                  <!--
                    Los acompañantes, debajo y aparte: son otra cosa que
                    confirmar, se guardan solos y no dependen del botón de
                    arriba. Solo aparece si la pareja lo ha activado y le ha
                    dado cupo a esta persona.
                  -->
                  @if (f.puedeAnadirAcompanantes || f.acompanantes.length > 0) {
                    <np-acompanantes
                      [acompanantes]="f.acompanantes"
                      [puedeAnadir]="f.puedeAnadirAcompanantes"
                      [quedan]="f.quedanAcompanantes"
                      [exigeTelefono]="f.exigeTelefonoDelAcompanante"
                      (cambiado)="cargar()"
                    />
                  }
                }
              }
            }
          }
        </div>
      </main>
    </ng-container>
  `,
  styles: `
    /* Primero móvil, y aquí sin versión de escritorio que valga: esto se abre
       desde WhatsApp. Una hoja centrada que no crece. */
    .cf {
      min-block-size: 100dvh;
      padding: var(--np-space-4);
      background: var(--np-marca-background, var(--np-surface-canvas));
      color: var(--np-marca-text, var(--np-surface-text));
    }
    .cf__hoja {
      inline-size: min(34rem, 100%);
      margin-inline: auto;
      padding: var(--np-space-5) var(--np-space-4);
    }
    .cf__hola {
      margin: 0;
      color: var(--np-marca-accent, var(--np-surface-text-muted));
      font-size: var(--np-text-sm);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .cf__hoja h1 {
      margin: var(--np-space-2) 0 var(--np-space-4);
      font-size: var(--np-text-2xl);
      font-weight: var(--np-weight-semibold);
    }
    .cf__ayuda {
      margin: 0 0 var(--np-space-4);
      font-size: var(--np-text-sm);
      opacity: 0.8;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-5);
    }
    .cf__campo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      border: 0;
    }
    .cf__campo legend {
      padding: 0;
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-medium);
    }
    .cf__obligatoria {
      color: var(--np-declined-fg);
    }
    .cf__pista {
      margin: 0;
      font-size: var(--np-text-sm);
      opacity: 0.75;
    }
    input,
    select,
    textarea {
      inline-size: 100%;
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid currentColor;
      border-radius: var(--np-radius-md);
      background: var(--np-marca-surface, var(--np-surface-surface));
      color: inherit;
      font: inherit;
      /* 16 px o más: por debajo, Safari en iOS hace zoom al enfocar. */
      font-size: 1rem;
    }
    textarea {
      min-block-size: 6rem;
      resize: vertical;
    }
    /* El sí y el no, dos botones grandes: es la pregunta que contesta todo el
       mundo y la que más se toca con el pulgar. */
    .cf__sino {
      display: flex;
      gap: var(--np-space-3);
    }
    .cf__opcion {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-2);
      min-block-size: 3.25rem;
      border: 2px solid currentColor;
      border-radius: var(--np-radius-md);
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: var(--np-weight-medium);
      cursor: pointer;
    }
    .cf__opcion--si.cf__opcion--puesta {
      background: var(--np-confirmed-bg);
      color: var(--np-confirmed-fg);
    }
    .cf__opcion--no.cf__opcion--puesta {
      background: var(--np-declined-bg);
      color: var(--np-declined-fg);
    }
    .cf__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
    }
    .cf__marca {
      display: flex;
      align-items: center;
      gap: var(--np-space-3);
      min-block-size: var(--np-tap-target);
      font-size: var(--np-text-base);
    }
    .cf__marca input {
      flex: none;
      inline-size: 1.25rem;
      min-block-size: 1.25rem;
      block-size: 1.25rem;
    }
    .cf__campo--mal legend {
      color: var(--np-declined-fg);
    }
    .cf__mal {
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
    .cf__aviso {
      display: flex;
      align-items: flex-start;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
      padding: var(--np-space-3) var(--np-space-4);
      border-radius: var(--np-radius-md);
      background: var(--np-info-bg);
      color: var(--np-info-fg);
    }
    .cf__aviso p {
      margin: 0;
      font-size: var(--np-text-sm);
    }
    .cf__aviso--si {
      background: var(--np-confirmed-bg);
      color: var(--np-confirmed-fg);
    }
    .cf__aviso--no,
    .cf__aviso--mal {
      background: var(--np-declined-bg);
      color: var(--np-declined-fg);
    }
    .cf__boton {
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-4);
      border: 0;
      border-radius: var(--np-radius-md);
      background: var(--np-marca-primary, var(--np-surface-text));
      color: var(--np-marca-background, var(--np-surface-canvas));
      font: inherit;
      font-weight: var(--np-weight-medium);
      cursor: pointer;
    }
    .cf__boton:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .cf__boton--suave {
      border: 1px solid currentColor;
      background: transparent;
      color: inherit;
    }
    .cf__resumen {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
    }
    .cf__resumen dt {
      font-size: var(--np-text-sm);
      opacity: 0.7;
    }
    .cf__resumen dd {
      margin: 0 0 var(--np-space-2);
      font-weight: var(--np-weight-medium);
    }
    /* Los títulos, con la letra de la plantilla de la pareja (D-55). */
    h1,
    h2 {
      font-family: var(--np-marca-titulos, inherit);
    }
  `,
})
export class Confirmar {
  private readonly puerta = inject(PUERTA_RSVP);

  /** Lo resuelve `tenantResolver`, igual que en la web. Solo se usa para la marca. */
  readonly tenant = input<ResultadoTenant | null>(null);

  protected readonly colores = usarTemaDeLaBoda(this.tenant);
  protected readonly cabecera = computed(() => conCabecera(this.tenant()));

  protected readonly carga = signal<Carga>('cargando');
  protected readonly formulario = signal<Formulario | null>(null);
  protected readonly fallo = signal<FalloRsvp | null>(null);
  protected readonly enviando = signal(false);
  /** El estado con el que salió el envío, o `null` si aún no se ha enviado. */
  protected readonly enviado = signal<'confirmed' | 'declined' | null>(null);

  /**
   * Lo que lleva contestado.
   *
   * `linkedSignal` sobre el formulario: parte de lo que contestó la última vez
   * y vuelve a partir de ahí si el formulario se recarga. Lo que teclee encima
   * manda.
   */
  protected readonly respuestas = linkedSignal<Formulario | null, Record<string, unknown>>({
    source: this.formulario,
    computation: (f) => ({ ...(f?.respuestas ?? {}) }),
  });

  /** Las preguntas que se le enseñan ahora, con lo que lleva contestado. */
  protected readonly aLaVista = computed(() =>
    visibles(this.formulario()?.preguntas ?? [], this.respuestas()),
  );

  private readonly fallosPorPregunta = computed(() => {
    const f = this.fallo();
    const fallos: readonly FalloPregunta[] = f?.tipo === 'respuestas' ? f.fallos : [];
    return new Map(fallos.map((x) => [x.questionId, x.motivo]));
  });

  /** Qué preguntarle para verificarse: dígitos en modo B, teléfono en modo C. */
  protected readonly modoAVerificar = computed<ModoAcceso>(() => {
    const f = this.fallo();
    return f?.tipo === 'pide-verificar' ? f.modo : 'name_phone4';
  });

  /** El fallo que no es de una pregunta concreta y va arriba. */
  protected readonly falloGeneral = computed(() => {
    const f = this.fallo();
    return f === null || f.tipo === 'respuestas' ? null : f;
  });

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    this.fallo.set(null);

    const resultado = await this.puerta.leer();

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      // Un «identifícate» no es un error: es el paso que falta.
      this.carga.set(resultado.fallo.tipo === 'pide-verificar' ? 'verificar' : 'error');
      return;
    }

    this.formulario.set(resultado.formulario);
    this.carga.set('lista');
  }

  protected falloDe(questionId: string): FalloPregunta['motivo'] | null {
    return this.fallosPorPregunta().get(questionId) ?? null;
  }

  protected valor(questionId: string): unknown {
    return this.respuestas()[questionId];
  }

  protected comoCadena(questionId: string): string {
    const valor = this.valor(questionId);
    return valor === undefined || valor === null ? '' : String(valor);
  }

  protected marcada(questionId: string, opcion: string): boolean {
    const valor = this.valor(questionId);
    return Array.isArray(valor) && valor.includes(opcion);
  }

  /** Lo contestado, en texto, para el resumen de cuando el plazo ya cerró. */
  protected comoTexto(pregunta: Pregunta): string {
    const valor = this.valor(pregunta.id);
    if (valor === undefined || valor === null || valor === '') return '';

    const etiqueta = (v: string) => pregunta.options.find((o) => o.value === v)?.label ?? v;

    if (Array.isArray(valor)) return valor.map((v) => etiqueta(String(v))).join(', ');
    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    return etiqueta(String(valor));
  }

  protected poner(questionId: string, valor: unknown): void {
    this.respuestas.update((previas) => ({ ...previas, [questionId]: valor }));
    this.olvidarFalloDe(questionId);
  }

  protected ponerTexto(questionId: string, evento: Event): void {
    const destino = evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    // Vaciar un campo borra la respuesta en vez de guardar una cadena vacía:
    // una pregunta opcional que se deja en blanco no debe ocupar sitio.
    this.poner(questionId, destino.value === '' ? undefined : destino.value);
  }

  protected alternar(questionId: string, opcion: string): void {
    const previas = this.valor(questionId);
    const lista = Array.isArray(previas) ? previas.map(String) : [];
    const siguiente = lista.includes(opcion)
      ? lista.filter((v) => v !== opcion)
      : [...lista, opcion];
    this.poner(questionId, siguiente.length === 0 ? undefined : siguiente);
  }

  protected volverAEditar(): void {
    this.enviado.set(null);
    void this.cargar();
  }

  protected async enviar(evento?: Event): Promise<void> {
    evento?.preventDefault();
    if (this.enviando()) return;

    // Lo que falta, antes de salir a la red: el invitado lo ve al instante y no
    // paga un viaje a Europa para que le digan que le falta el menú. El
    // servidor lo vuelve a comprobar de todas formas.
    const faltan = this.aLaVista()
      .filter((p) => p.required && estaVacia(this.valor(p.id)))
      .map((p) => ({ questionId: p.id, motivo: 'obligatoria' as const }));

    if (faltan.length > 0) {
      this.fallo.set({ tipo: 'respuestas', fallos: faltan });
      return;
    }

    this.enviando.set(true);
    this.fallo.set(null);

    const resultado = await this.puerta.enviar(soloLoQueSeVe(this.aLaVista(), this.respuestas()));

    this.enviando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);

      // El plazo pudo cerrarse mientras lo rellenaba: se recarga para que la
      // pantalla diga lo que hay en vez de seguir ofreciendo un botón inútil.
      // El aviso se vuelve a poner **después** de recargar, porque recargar lo
      // limpia: si no, el invitado se queda sin saber qué ha pasado.
      if (resultado.fallo.tipo === 'plazo-cerrado') {
        const cerrado = resultado.fallo;
        await this.cargar();
        this.fallo.set(cerrado);
      }

      // Se le ha caducado el nivel mientras rellenaba —24 h dura la sesión—:
      // se le pide y lo que tenga escrito se queda, porque `respuestas` no se
      // toca al verificar.
      if (resultado.fallo.tipo === 'pide-verificar') this.carga.set('verificar');
      return;
    }

    this.enviado.set(resultado.estado);
  }

  private olvidarFalloDe(questionId: string): void {
    const f = this.fallo();
    if (f?.tipo !== 'respuestas') return;

    const quedan = f.fallos.filter((x) => x.questionId !== questionId);
    this.fallo.set(quedan.length === 0 ? null : { tipo: 'respuestas', fallos: quedan });
  }

  /** La fecha llega en ISO; se enseña como la lee una persona. */
  protected fechaLimite(iso: string): string {
    const fecha = new Date(`${iso}T00:00:00.000Z`);
    return Number.isNaN(fecha.getTime())
      ? iso
      : new Intl.DateTimeFormat('es', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(fecha);
  }

  protected textoDelFallo(t: (clave: string, params?: Record<string, unknown>) => string): string {
    const f = this.fallo();
    if (f === null) return '';

    if (f.tipo === 'plazo-cerrado') {
      return f.limite
        ? t('publico.confirmar.cerrado.con', { fecha: this.fechaLimite(f.limite) })
        : t('publico.confirmar.cerrado.sin');
    }

    // Nunca el mensaje del SDK: «INTERNAL» encima de un formulario recién
    // rellenado no le dice nada a nadie.
    return t('publico.confirmar.fallo.' + (f.tipo === 'error' ? 'desconocido' : f.tipo));
  }
}

export function estaVacia(valor: unknown): boolean {
  return (
    valor === undefined ||
    valor === null ||
    valor === '' ||
    (Array.isArray(valor) && valor.length === 0)
  );
}

/**
 * Se manda solo lo que está a la vista y contestado.
 *
 * Quien marca que no viene y antes había elegido menú no manda ese menú: el
 * servidor lo descartaría igual, pero mandarlo significaría que el navegador
 * cree que sigue contestado, y eso acaba en pantallas que le enseñan un menú a
 * alguien que no va.
 */
export function soloLoQueSeVe(preguntas: readonly Pregunta[], respuestas: Respuestas): Respuestas {
  const salida: Record<string, unknown> = {};

  for (const pregunta of preguntas) {
    const valor = respuestas[pregunta.id];
    if (!estaVacia(valor)) salida[pregunta.id] = valor;
  }

  return salida;
}
