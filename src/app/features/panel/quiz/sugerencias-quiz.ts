import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_CATALOGOS } from '../../../core/superadmin/catalogos-gateway';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import type { PreguntaDeCatalogo } from '../../superadmin/catalogos/catalogos';
import { PreguntasQuizStore } from './preguntas-quiz.store';

type Carga = 'cargando' | 'lista' | 'error';

/** Para saber si una sugerencia ya está en el quiz: sin mayúsculas, tildes ni espacios sobrantes. */
export function claveDeTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Preguntas sugeridas para el quiz, las que mantiene el superadmin.
 *
 * «Añadir a nuestro quiz» copia la sugerencia al banco de la boda, **apagada**:
 * las respuestas de las sugerencias son de muestra («Madrid», «5 años») y
 * jugarlas tal cual sería preguntar a los invitados algo que no es verdad. La
 * pareja las edita y, al guardarlas, pasan a jugarse.
 *
 * Lo que la pareja cambie en su copia no vuelve al catálogo.
 */
@Component({
  selector: 'np-sugerencias-quiz',
  imports: [TranslocoDirective, NpButton, NpIcon, NpStatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (carga() === 'lista' && sugerencias().length > 0) {
        <section class="sq">
          <h3>{{ t('panel.quiz.sugerencias.titulo') }}</h3>
          <p class="sq__ayuda">{{ t('panel.quiz.sugerencias.ayuda') }}</p>

          <ul class="sq__lista">
            @for (s of sugerencias(); track s.id) {
              <li class="sq__ficha">
                <strong>{{ s.text }}</strong>
                <small>
                  {{ t('panel.quiz.sugerencias.ejemplo', { respuesta: s.correctAnswer }) }}
                </small>
                @if (yaEsta(s)) {
                  <np-status-chip status="confirmed" [label]="t('panel.quiz.sugerencias.yaEsta')" />
                } @else {
                  <button
                    npButton
                    size="sm"
                    variant="secondary"
                    type="button"
                    [loading]="anadiendo() === s.id"
                    [disabled]="anadiendo() !== null"
                    (click)="anadir(s)"
                  >
                    <np-icon name="plus" />
                    {{ t('panel.quiz.sugerencias.anadir') }}
                  </button>
                }
              </li>
            }
          </ul>

          @if (fallo()) {
            <p class="sq__error" role="alert">
              <np-icon name="warning" />
              {{ t('panel.quiz.sugerencias.fallo') }}
            </p>
          }
          @if (ultima()) {
            <p class="sq__hecho" role="status">
              <np-icon name="check-circle" weight="fill" />
              {{ t('panel.quiz.sugerencias.anadida') }}
            </p>
          }
        </section>
      }
    </ng-container>
  `,
  styles: `
    .sq {
      display: grid;
      gap: var(--np-space-3);
      padding-block-start: var(--np-space-5);
      border-block-start: 1px solid var(--np-surface-border);
    }
    .sq h3,
    .sq p {
      margin: 0;
    }
    .sq__ayuda,
    .sq__ficha small {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .sq__lista {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .sq__ficha {
      display: grid;
      gap: var(--np-space-1);
      justify-items: start;
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .sq__error,
    .sq__hecho {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .sq__error {
      color: var(--np-declined-fg);
    }
    .sq__hecho {
      color: var(--np-status-confirmed-text);
    }
  `,
})
export class SugerenciasQuiz {
  private readonly puerta = inject(PUERTA_CATALOGOS);
  private readonly store = inject(PreguntasQuizStore);

  protected readonly carga = signal<Carga>('cargando');
  protected readonly todas = signal<readonly PreguntaDeCatalogo[]>([]);
  protected readonly anadiendo = signal<string | null>(null);
  protected readonly fallo = signal(false);
  protected readonly ultima = signal(false);

  /** Solo las encendidas: las apagadas son del superadmin y no se ofrecen. */
  protected readonly sugerencias = computed(() => this.todas().filter((s) => s.enabled));

  private readonly yaEnElQuiz = computed(
    () => new Set(this.store.preguntas().map((p) => claveDeTexto(p.text))),
  );

  constructor() {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    const resultado = await this.puerta.preguntas();
    if (resultado.ok) {
      this.todas.set(resultado.datos);
      this.carga.set('lista');
    } else {
      // Sin sugerencias no pasa nada: el quiz sigue funcionando. Simplemente no se pinta.
      this.carga.set('error');
    }
  }

  protected yaEsta(s: PreguntaDeCatalogo): boolean {
    return this.yaEnElQuiz().has(claveDeTexto(s.text));
  }

  protected async anadir(s: PreguntaDeCatalogo): Promise<void> {
    if (this.anadiendo() !== null) return;

    this.anadiendo.set(s.id);
    this.fallo.set(false);
    this.ultima.set(false);

    const resultado = await this.store.guardar({
      text: s.text,
      correctAnswer: s.correctAnswer,
      wrongAnswers: [...s.wrongAnswers],
      difficulty: s.difficulty,
      hint: s.hint,
      // Apagada hasta que la pareja cambie las respuestas de muestra.
      enabled: false,
      order: this.store.preguntas().length + 1,
    });

    this.anadiendo.set(null);
    this.fallo.set(!resultado.ok);
    this.ultima.set(resultado.ok);
  }
}
