import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_RESPUESTAS, type FalloAlGuardar } from '../../../core/rsvp/respuestas-gateway';
import type { Pregunta, Respuestas } from '../../../core/rsvp/rsvp-gateway';
import { visibles } from '../../../core/rsvp/visibilidad';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpInput } from '../../../design-system/components/field/input';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';

type Estado = 'pending' | 'confirmed' | 'declined';

/**
 * La pareja contesta por un invitado (D-45).
 *
 * Hay gente mayor que no entra en la web y gente que no contesta aunque se le
 * insista: lo dicen por teléfono o por WhatsApp y lo tiene que poder apuntar
 * quien organiza la boda. Es lo mismo que contestaría el invitado, con dos
 * diferencias: no hay plazo y **no hace falta rellenar lo obligatorio** —se
 * apunta lo que se sabe—.
 *
 * Arriba, lo primero y lo único que casi siempre hace falta: viene, no viene o
 * sigue sin contestar. Si solo se toca eso, solo eso se guarda, y el resto de lo
 * que el invitado hubiera contestado se queda como estaba.
 *
 * Tres estados con **color, icono y texto**, no solo color.
 */
@Component({
  selector: 'np-respuesta-de-invitado',
  imports: [TranslocoDirective, NpAlert, NpButton, NpIcon, NpInput, NpModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <np-modal
        [open]="true"
        [heading]="t('panel.respuestaPareja.titulo', { nombre: nombre() })"
        (closed)="cerrado.emit()"
      >
        @if (cargando()) {
          <p>{{ t('common.loading') }}</p>
        } @else {
          <p class="rpi__intro">{{ t('panel.respuestaPareja.intro') }}</p>

          <div
            class="rpi__estados"
            role="group"
            [attr.aria-label]="t('panel.respuestaPareja.estado')"
          >
            @for (e of estados; track e.valor) {
              <button
                type="button"
                class="rpi__estado"
                [class.rpi__estado--puesto]="estado() === e.valor"
                [attr.data-estado]="e.valor"
                [attr.aria-pressed]="estado() === e.valor"
                (click)="elegirEstado(e.valor)"
              >
                <np-icon [name]="e.icono" [weight]="estado() === e.valor ? 'fill' : 'regular'" />
                {{ t('panel.respuestaPareja.' + e.valor) }}
              </button>
            }
          </div>

          @if (preguntasAMostrar().length > 0) {
            <h3 class="rpi__subtitulo">{{ t('panel.respuestaPareja.detalle') }}</h3>

            @for (p of preguntasAMostrar(); track p.id) {
              <div class="rpi__pregunta">
                <label [attr.for]="'rpi-' + p.id">{{ p.label }}</label>
                @if (p.helpText) {
                  <small>{{ p.helpText }}</small>
                }

                @switch (p.type) {
                  @case ('textarea') {
                    <textarea
                      npInput
                      [id]="'rpi-' + p.id"
                      [value]="texto(p.id)"
                      (input)="poner(p.id, $any($event.target).value)"
                    ></textarea>
                  }
                  @case ('select') {
                    <select
                      npInput
                      [id]="'rpi-' + p.id"
                      [value]="texto(p.id)"
                      (change)="poner(p.id, $any($event.target).value)"
                    >
                      <option value="">{{ t('panel.respuestaPareja.sinContestar') }}</option>
                      @for (o of p.options; track o.value) {
                        <option [value]="o.value" [selected]="texto(p.id) === o.value">
                          {{ o.label }}
                        </option>
                      }
                    </select>
                  }
                  @case ('radio') {
                    <select
                      npInput
                      [id]="'rpi-' + p.id"
                      [value]="texto(p.id)"
                      (change)="poner(p.id, $any($event.target).value)"
                    >
                      <option value="">{{ t('panel.respuestaPareja.sinContestar') }}</option>
                      @for (o of p.options; track o.value) {
                        <option [value]="o.value" [selected]="texto(p.id) === o.value">
                          {{ o.label }}
                        </option>
                      }
                    </select>
                  }
                  @case ('checkbox') {
                    <div class="rpi__opciones">
                      @for (o of p.options; track o.value) {
                        <label class="rpi__opcion">
                          <input
                            type="checkbox"
                            [checked]="marcada(p.id, o.value)"
                            (change)="alternar(p.id, o.value, $any($event.target).checked)"
                          />
                          {{ o.label }}
                        </label>
                      }
                    </div>
                  }
                  @case ('boolean') {
                    <select
                      npInput
                      [id]="'rpi-' + p.id"
                      (change)="poner(p.id, siNo($any($event.target).value))"
                    >
                      <option value="" [selected]="respuestas()[p.id] === undefined">
                        {{ t('panel.respuestaPareja.sinContestar') }}
                      </option>
                      <option value="si" [selected]="respuestas()[p.id] === true">
                        {{ t('panel.respuestaPareja.si') }}
                      </option>
                      <option value="no" [selected]="respuestas()[p.id] === false">
                        {{ t('panel.respuestaPareja.no') }}
                      </option>
                    </select>
                  }
                  @case ('number') {
                    <input
                      npInput
                      type="number"
                      [id]="'rpi-' + p.id"
                      [value]="texto(p.id)"
                      (input)="poner(p.id, $any($event.target).value)"
                    />
                  }
                  @case ('date') {
                    <input
                      npInput
                      type="date"
                      [id]="'rpi-' + p.id"
                      [value]="texto(p.id)"
                      (input)="poner(p.id, $any($event.target).value)"
                    />
                  }
                  @default {
                    <input
                      npInput
                      [id]="'rpi-' + p.id"
                      [value]="texto(p.id)"
                      (input)="poner(p.id, $any($event.target).value)"
                    />
                  }
                }

                @if (fallosPorPregunta()[p.id]; as motivo) {
                  <small class="rpi__fallo" role="alert">
                    <np-icon name="warning" weight="fill" />
                    {{ t('panel.respuestaPareja.fallo.' + motivo) }}
                  </small>
                }
              </div>
            }
          }

          @if (error(); as e) {
            <np-alert status="declined">
              <p>{{ t('panel.respuestaPareja.error.' + e) }}</p>
            </np-alert>
          }
        }

        <div np-modal-actions>
          <button npButton variant="ghost" type="button" (click)="cerrado.emit()">
            {{ t('common.cancel') }}
          </button>
          <button
            npButton
            type="button"
            [loading]="guardando()"
            [disabled]="cargando()"
            (click)="guardar()"
          >
            <np-icon name="check" />
            {{ t('common.save') }}
          </button>
        </div>
      </np-modal>
    </ng-container>
  `,
  styles: `
    .rpi__intro {
      margin: 0 0 var(--np-space-3);
      color: var(--np-surface-text-muted);
    }
    .rpi__estados {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      gap: var(--np-space-2);
    }
    .rpi__estado {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2) var(--np-space-3);
      border: 2px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: var(--np-surface-text);
      font: inherit;
      font-weight: var(--np-weight-semibold);
      cursor: pointer;
    }
    .rpi__estado--puesto[data-estado='confirmed'] {
      border-color: var(--np-confirmed-border);
      background: var(--np-confirmed-bg);
      color: var(--np-confirmed-text);
    }
    .rpi__estado--puesto[data-estado='declined'] {
      border-color: var(--np-declined-border);
      background: var(--np-declined-bg);
      color: var(--np-declined-text);
    }
    .rpi__estado--puesto[data-estado='pending'] {
      border-color: var(--np-pending-border);
      background: var(--np-pending-bg);
      color: var(--np-pending-text);
    }
    .rpi__estado:focus-visible {
      outline: 2px solid var(--np-info-solid);
      outline-offset: 2px;
    }
    .rpi__subtitulo {
      margin: var(--np-space-5) 0 var(--np-space-2);
      font-size: var(--np-text-base);
    }
    .rpi__pregunta {
      display: grid;
      gap: var(--np-space-1);
      margin-block-end: var(--np-space-3);
    }
    .rpi__pregunta > label {
      font-weight: var(--np-weight-semibold);
    }
    .rpi__pregunta small {
      color: var(--np-surface-text-muted);
    }
    .rpi__opciones {
      display: grid;
      gap: var(--np-space-1);
    }
    .rpi__opcion {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
    }
    .rpi__fallo {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      color: var(--np-declined-text);
    }
  `,
})
export class NpRespuestaDeInvitado {
  private readonly puerta = inject(PUERTA_RESPUESTAS);

  readonly guestId = input.required<string>();
  readonly nombre = input.required<string>();
  /** Un acompañante no contesta lo que es del titular. */
  readonly esAcompanante = input(false);

  /** Se ha guardado: con el estado en que quedó, para refrescar la lista. */
  readonly guardado = output<Estado>();
  readonly cerrado = output<void>();

  protected readonly estados = [
    { valor: 'confirmed', icono: 'check-circle' },
    { valor: 'declined', icono: 'x-circle' },
    { valor: 'pending', icono: 'clock' },
  ] as const;

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<'red' | 'sin-permiso' | 'no-existe' | 'desconocido' | null>(
    null,
  );
  protected readonly estado = signal<Estado>('pending');
  protected readonly respuestas = signal<Respuestas>({});
  protected readonly fallosPorPregunta = signal<Readonly<Record<string, string>>>({});

  private readonly preguntas = signal<readonly Pregunta[]>([]);
  /** Si ha tocado alguna pregunta; si no, solo se manda el estado. */
  private readonly tocadas = signal(false);

  /** Las que se le harían a este invitado, con lo que lleva contestado. */
  protected readonly preguntasAMostrar = computed(() => {
    const suyo = this.esAcompanante() ? 'companion' : 'guest';
    const suyas = this.preguntas()
      .filter((p) => p.enabled !== false && (p.target === 'both' || (p.target ?? 'both') === suyo))
      .slice()
      .sort((a, b) => a.order - b.order);

    // La visibilidad se calcula con **todas**, también la de asistencia: el menú
    // depende de ella y, sin la pregunta delante, se daría por oculto. Solo
    // después se quita esa, porque ya se contesta con los tres botones de arriba.
    return visibles(suyas, this.conAsistencia()).filter((p) => p.mapsTo !== 'rsvpStatus');
  });

  /** Lo contestado, con la asistencia que marca el estado puesto arriba. */
  private readonly conAsistencia = computed<Respuestas>(() => {
    const asistencia = this.preguntas().find((p) => p.mapsTo === 'rsvpStatus');
    if (!asistencia) return this.respuestas();

    const resto = Object.fromEntries(
      Object.entries(this.respuestas()).filter(([id]) => id !== asistencia.id),
    );
    const e = this.estado();
    return e === 'pending' ? resto : { ...resto, [asistencia.id]: e === 'confirmed' };
  });

  constructor() {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    const r = await this.puerta.leer();

    if (!r.ok) {
      this.error.set(
        r.fallo.tipo === 'sin-permiso'
          ? 'sin-permiso'
          : r.fallo.tipo === 'red'
            ? 'red'
            : 'desconocido',
      );
      this.cargando.set(false);
      return;
    }

    this.preguntas.set(r.datos.preguntas);
    const suyo = r.datos.invitados.find((i) => i.guestId === this.guestId());
    if (suyo) {
      this.estado.set(suyo.estado);
      this.respuestas.set(suyo.respuestas);
    }
    this.cargando.set(false);
  }

  protected elegirEstado(valor: Estado): void {
    this.estado.set(valor);
  }

  protected texto(id: string): string {
    const v = this.respuestas()[id];
    return v === undefined || v === null ? '' : String(v);
  }

  protected marcada(id: string, valor: string): boolean {
    const v = this.respuestas()[id];
    return Array.isArray(v) && v.includes(valor);
  }

  protected poner(id: string, valor: unknown): void {
    this.tocadas.set(true);
    this.respuestas.update((r) => ({ ...r, [id]: valor }));
  }

  protected alternar(id: string, valor: string, puesta: boolean): void {
    const actual = this.respuestas()[id];
    const lista = Array.isArray(actual) ? (actual as string[]) : [];
    this.poner(id, puesta ? [...new Set([...lista, valor])] : lista.filter((v) => v !== valor));
  }

  protected siNo(valor: string): boolean | undefined {
    return valor === 'si' ? true : valor === 'no' ? false : undefined;
  }

  protected async guardar(): Promise<void> {
    this.error.set(null);
    this.fallosPorPregunta.set({});
    this.guardando.set(true);

    const r = await this.puerta.guardar(
      this.guestId(),
      this.tocadas()
        ? { estado: this.estado(), respuestas: this.conAsistencia() }
        : { estado: this.estado() },
    );

    this.guardando.set(false);

    if (r.ok) {
      this.guardado.emit(r.estado);
      return;
    }

    this.mostrarFallo(r.fallo);
  }

  private mostrarFallo(fallo: FalloAlGuardar): void {
    switch (fallo.tipo) {
      case 'no-valen':
        this.fallosPorPregunta.set(
          Object.fromEntries(fallo.fallos.map((f) => [f.questionId, f.motivo])),
        );
        this.error.set(fallo.fallos.length === 0 ? 'desconocido' : null);
        break;
      case 'no-existe':
        this.error.set('no-existe');
        break;
      case 'sin-permiso':
        this.error.set('sin-permiso');
        break;
      case 'red':
        this.error.set('red');
        break;
      default:
        this.error.set('desconocido');
    }
  }
}
