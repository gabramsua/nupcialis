import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIconPicker } from '../../../design-system/components/picker/icon-picker';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  aMedias,
  categoriasUsadas,
  moverFaq,
  type FalloFaqs,
  type FaqDelPanel,
} from '../../../core/faqs/faqs-gateway';
import { ICONOS_FAQ, MAX_PREGUNTA, type IconoFaq } from '../../public-site/faqs/faqs';
import { NpEditorRico } from '../web/editor-rico';
import { FaqsStore } from './faqs.store';
import { NpInput } from '../../../design-system/components/field/input';

/**
 * Las preguntas frecuentes, donde la pareja las escribe (§8.9).
 *
 * La boda nace con siete preguntas puestas y sin respuesta: las que un invitado
 * hace siempre —el parking, el autobús, los niños, el dress code—. La pantalla
 * existe para contestarlas, y por eso lo primero que enseña de cada una es si
 * está **a medias**: una pregunta sin respuesta no se publica, y sin decirlo la
 * pareja creería que su web ya la enseña.
 *
 * La respuesta se escribe con el editor con formato, porque aquí es donde hace
 * falta de verdad: «el autobús sale a las **17:00** de la plaza, y hay otro a
 * las 18:00» con una lista y un enlace a la finca se lee en el móvil; el mismo
 * texto en un párrafo plano, no.
 */
@Component({
  selector: 'np-panel-faqs',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpIcon,
    NpEditorRico,
    NpInput,
    NpIconPicker,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="fq">
        <header class="fq__intro">
          <div>
            <h2>{{ t('panel.faqs.titulo') }}</h2>
            <p>{{ t('panel.faqs.ayuda') }}</p>
          </div>
          <button npButton type="button" (click)="nueva()">
            <np-icon name="plus" />
            {{ t('panel.faqs.anadir') }}
          </button>
        </header>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.faqs.errorGuardar')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.faqs.cargando')" />
          }
          @default {
            @if (store.faqs().length === 0) {
              <np-empty-state
                icon="question"
                [title]="t('panel.faqs.ninguna')"
                [description]="t('panel.faqs.ningunaDescripcion')"
              />
            } @else {
              @if (sinContestar() > 0) {
                <np-alert status="attention" [heading]="t('panel.faqs.aMedias.titulo')">
                  <p>{{ t('panel.faqs.aMedias.explicacion', { n: sinContestar() }) }}</p>
                </np-alert>
              }

              <ul class="fq__lista">
                @for (faq of store.faqs(); track faq.id; let primera = $first, ultima = $last) {
                  <li class="fq__ficha">
                    <div class="fq__quien">
                      <span class="fq__pregunta">
                        <np-icon [name]="faq.icon" />
                        {{ faq.question }}
                      </span>
                      <span class="fq__datos">
                        @if (faq.category) {
                          <span class="fq__categoria">{{ faq.category }}</span>
                        }
                        @if (estaAMedias(faq)) {
                          <np-status-chip
                            status="attention"
                            [label]="t('panel.faqs.sinRespuesta')"
                          />
                        }
                        @if (!faq.enabled) {
                          <np-status-chip status="pending" [label]="t('panel.faqs.apagada')" />
                        }
                      </span>
                    </div>

                    <div class="fq__acciones">
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        [disabled]="primera"
                        [attr.aria-label]="t('panel.faqs.subir', { pregunta: faq.question })"
                        (click)="subir(faq.id)"
                      >
                        <np-icon name="caret-up" />
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        [disabled]="ultima"
                        [attr.aria-label]="t('panel.faqs.bajar', { pregunta: faq.question })"
                        (click)="bajar(faq.id)"
                      >
                        <np-icon name="caret-down" />
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="alternar(faq)"
                      >
                        <np-icon [name]="faq.enabled ? 'eye' : 'eye-slash'" />
                        {{ faq.enabled ? t('panel.faqs.desactivar') : t('panel.faqs.activar') }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="editar(faq)"
                      >
                        <np-icon name="pencil-simple" />
                        {{ t('common.edit') }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="borrando.set(faq)"
                      >
                        <np-icon name="trash" />
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          }
        }

        @if (editando(); as cual) {
          <np-modal
            [open]="true"
            [heading]="cual === 'nueva' ? t('panel.faqs.nueva') : t('panel.faqs.editar')"
            (closed)="editando.set(null)"
          >
            <form class="fq__form" [formGroup]="formulario" (submit)="enviar($event)">
              <label>
                {{ t('panel.faqs.campo.pregunta') }}
                <input npInput formControlName="question" [attr.maxlength]="maximoPregunta" />
              </label>

              <label>
                {{ t('panel.faqs.campo.categoria') }}
                <input npInput formControlName="category" list="fq-categorias" maxlength="40" />
                <datalist id="fq-categorias">
                  @for (categoria of categorias(); track categoria) {
                    <option [value]="categoria"></option>
                  }
                </datalist>
                <small>{{ t('panel.faqs.campo.categoriaAyuda') }}</small>
              </label>

              <div class="fq__grupo" role="group" aria-labelledby="fq-icono">
                <span id="fq-icono" class="fq__etiqueta">{{ t('panel.faqs.campo.icono') }}</span>
                <np-icon-picker
                  [opciones]="opcionesDeIcono()"
                  [etiqueta]="t('panel.faqs.campo.icono')"
                  [value]="formulario.controls.icon.value"
                  (valueChange)="formulario.controls.icon.setValue($any($event))"
                />
              </div>

              <div class="fq__respuesta">
                <span class="fq__etiqueta">{{ t('panel.faqs.campo.respuesta') }}</span>
                <!--
                  El editor con formato, en su propio trozo de JavaScript: Jodit
                  pesa medio megabyte y no puede caer en el arranque del panel.
                  Si no cargara queda el área de texto, que escribe lo mismo
                  sin formato.
                -->
                @defer (on viewport) {
                  <np-editor-rico
                    [valor]="respuesta()"
                    [maximo]="maximoRespuesta"
                    (cambia)="respuesta.set($event)"
                  />
                } @placeholder {
                  <p class="fq__cargandoEditor">{{ t('panel.secciones.cargandoEditor') }}</p>
                } @error {
                  <textarea
                    npInput
                    rows="6"
                    [value]="respuesta()"
                    (input)="escribirRespuesta($event)"
                  ></textarea>
                }
                <small>{{ t('panel.faqs.campo.respuestaAyuda') }}</small>
              </div>

              <label class="fq__casilla">
                <input formControlName="enabled" type="checkbox" />
                <span>{{ t('panel.faqs.campo.activa') }}</span>
              </label>
            </form>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="editando.set(null)">
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
                {{ t('common.save') }}
              </button>
            </div>
          </np-modal>
        }

        @if (borrando(); as cual) {
          <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
            <p>{{ t('panel.faqs.confirmarBorrado', { pregunta: cual.question }) }}</p>
            <p>{{ t('panel.faqs.borradoAviso') }}</p>

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
                <np-icon name="trash" />
                {{ t('common.delete') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .fq__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .fq__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .fq__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .fq__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .fq__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: var(--np-space-3) 0 0;
      padding: 0;
      list-style: none;
    }
    .fq__ficha {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .fq__pregunta {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      font-weight: var(--np-weight-medium);
    }
    .fq__datos {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      margin-block-start: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .fq__categoria {
      color: var(--np-surface-text-muted);
    }
    .fq__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1);
    }
    .fq__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .fq__form label,
    .fq__respuesta {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .fq__grupo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
    }
    .fq__etiqueta {
      font-size: var(--np-text-sm);
    }
    .fq__form small {
      color: var(--np-surface-text-muted);
    }
    .fq__form .fq__casilla {
      flex-direction: row;
      align-items: center;
      gap: var(--np-space-2);
    }
    .fq__cargandoEditor {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PanelFaqs {
  protected readonly store = inject(FaqsStore);
  private readonly fb = inject(FormBuilder);

  private readonly i18n = inject(TranslocoService);

  protected readonly iconos = ICONOS_FAQ;
  /** Los iconos con su nombre, para el selector visual. */
  protected readonly opcionesDeIcono = computed(() =>
    this.iconos.map((icono) => ({
      value: icono,
      label: this.i18n.translate('panel.faqs.icono.' + icono),
    })),
  );
  protected readonly maximoPregunta = MAX_PREGUNTA;
  protected readonly maximoRespuesta = 3000;

  /** `'nueva'` o la que se está editando. `null` si el modal está cerrado. */
  protected readonly editando = signal<FaqDelPanel | 'nueva' | null>(null);
  protected readonly borrando = signal<FaqDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly borrandoYa = signal(false);

  /**
   * La respuesta vive aparte del formulario reactivo.
   *
   * El editor no es un control de HTML: no emite `input` ni tiene `value`, da
   * la cadena ya hecha. Meterlo en el `FormGroup` obligaría a un
   * `ControlValueAccessor` para no ganar nada.
   */
  protected readonly respuesta = signal('');

  protected readonly categorias = computed(() => categoriasUsadas(this.store.faqs()));

  /** Cuántas están a medio escribir, que es lo que la pantalla viene a resolver. */
  protected readonly sinContestar = computed(
    () => this.store.faqs().filter((faq) => aMedias(faq)).length,
  );

  protected readonly formulario = this.fb.nonNullable.group({
    question: ['', Validators.required],
    category: [''],
    icon: ['question' as IconoFaq],
    enabled: [true],
  });

  constructor() {
    void this.store.cargar();
  }

  protected estaAMedias(faq: FaqDelPanel): boolean {
    return aMedias(faq);
  }

  protected nueva(): void {
    this.formulario.reset({ question: '', category: '', icon: 'question', enabled: true });
    this.respuesta.set('');
    this.editando.set('nueva');
  }

  protected editar(faq: FaqDelPanel): void {
    this.formulario.reset({
      question: faq.question,
      category: faq.category,
      icon: faq.icon,
      enabled: faq.enabled,
    });
    this.respuesta.set(faq.answer);
    this.editando.set(faq);
  }

  protected escribirRespuesta(evento: Event): void {
    this.respuesta.set((evento.target as HTMLTextAreaElement).value);
  }

  /** El formulario no se manda con Enter sin recargar la página si no se para. */
  protected enviar(evento: Event): void {
    evento.preventDefault();
    void this.guardar();
  }

  protected async guardar(): Promise<void> {
    const cual = this.editando();
    if (!cual || this.formulario.invalid || this.guardando()) return;

    const valores = this.formulario.getRawValue();
    const nueva = cual === 'nueva';
    this.guardando.set(true);

    const resultado = await this.store.guardar({
      id: nueva ? undefined : cual.id,
      question: valores.question.trim(),
      answer: this.respuesta(),
      category: valores.category.trim(),
      icon: valores.icon,
      enabled: valores.enabled,
      order: nueva ? this.store.faqs().length + 1 : cual.order,
    });

    this.guardando.set(false);
    if (resultado.ok) this.editando.set(null);
  }

  /** Encender y apagar en un toque: es lo que más se hace aquí. */
  protected async alternar(faq: FaqDelPanel): Promise<void> {
    await this.store.guardar({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      icon: faq.icon,
      order: faq.order,
      enabled: !faq.enabled,
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

  protected subir(id: string): void {
    void this.mover(id, -1);
  }

  protected bajar(id: string): void {
    void this.mover(id, 1);
  }

  private async mover(id: string, direccion: -1 | 1): Promise<void> {
    const movidas = moverFaq(this.store.faqs(), id, direccion);
    if (movidas === this.store.faqs()) return;

    await this.store.reordenar(movidas.map((faq) => faq.id));
  }

  /**
   * El texto del fallo sale de los ficheros de traducción, nunca del SDK.
   *
   * Un «permission-denied» en la pantalla de la pareja no le dice a nadie qué
   * tiene que tocar.
   */
  protected textoDelFallo(fallo: FalloFaqs, t: (clave: string) => string): string {
    switch (fallo.tipo) {
      case 'sin-permiso':
      case 'red':
        return t(`panel.faqs.fallo.${fallo.tipo}`);
      default:
        return t('panel.faqs.fallo.desconocido');
    }
  }
}
