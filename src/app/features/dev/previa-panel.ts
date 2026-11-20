import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, type Type, signal } from '@angular/core';

import { PanelAlojamientos } from '../panel/alojamientos/alojamientos';
import { PanelResumen } from '../panel/resumen/resumen';
import { PanelChecklist } from '../panel/checklist/checklist-panel';
import { PanelMapa } from '../panel/mapa/mapa-panel';
import { PanelPlaylist } from '../panel/playlist/playlist-panel';
import { PanelCronologia } from '../panel/cronologia/cronologia';
import { PanelDressCode } from '../panel/dress-code/dress-code';
import { PanelFaqs } from '../panel/faqs/faqs';
import { PanelPreguntasQuiz } from '../panel/quiz/preguntas-quiz';
import { PanelRankingQuiz } from '../panel/quiz/ranking-quiz';
import { PanelMesas } from '../panel/mesas/mesas-pantalla';
import { PanelGaleria } from '../panel/galeria/galeria-panel';
import { PanelRegalos } from '../panel/regalos/regalos-panel';
import { PanelRecibidos } from '../panel/regalos/recibidos-panel';

/**
 * Las pantallas de contenido del panel, con datos de muestra. **Solo en desarrollo.**
 *
 * Misma idea que `/dev/previa` y por la misma razón: verlas con contenido
 * obligaba a entrar al panel de una boda de verdad, y eso son credenciales,
 * App Check y una boda de prueba. Aquí se abren en un segundo, y sobre todo se
 * pueden mirar **a 360 px**, que es donde se rompen.
 *
 * Los datos salen de `dobles-panel.ts`, que provee la ruta.
 */
@Component({
  selector: 'np-previa-panel',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pp__barra">
      <label>
        Pantalla
        <select [value]="cual()" (change)="elegir($event)">
          @for (p of pantallas; track p.id) {
            <option [value]="p.id">{{ p.nombre }}</option>
          }
        </select>
      </label>
      <span class="pp__nota">Solo en desarrollo. Sin Firebase: los datos son de muestra.</span>
    </div>

    <div class="pp__lienzo">
      <ng-container *ngComponentOutlet="componente()" />
    </div>
  `,
  styles: `
    .pp__barra {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: end;
      padding: 0.75rem 1rem;
      border-block-end: 1px solid var(--np-surface-border);
      font-size: 0.85rem;
    }
    .pp__barra label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .pp__nota {
      color: var(--np-surface-text-muted);
    }
    /* El mismo ancho acotado y el mismo aire que da el panel de verdad, para
       que lo que se mida aquí valga allí. */
    .pp__lienzo {
      max-inline-size: 60rem;
      margin-inline: auto;
      padding: var(--np-space-4) var(--np-space-3);
    }
  `,
})
export class PreviaPanel {
  protected readonly pantallas = [
    { id: 'alojamientos', nombre: 'Dónde dormir', componente: PanelAlojamientos },
    { id: 'resumen', nombre: 'El inicio', componente: PanelResumen },
    { id: 'checklist', nombre: 'Las tareas', componente: PanelChecklist },
    { id: 'mapa', nombre: 'El mapa', componente: PanelMapa },
    { id: 'playlist', nombre: 'La música', componente: PanelPlaylist },
    { id: 'dressCode', nombre: 'Cómo vestir', componente: PanelDressCode },
    { id: 'faqs', nombre: 'Preguntas frecuentes', componente: PanelFaqs },
    { id: 'cronologia', nombre: 'El día, hora a hora', componente: PanelCronologia },
    { id: 'quizPreguntas', nombre: 'El juego: preguntas', componente: PanelPreguntasQuiz },
    { id: 'quizRanking', nombre: 'El juego: quién ha jugado', componente: PanelRankingQuiz },
    { id: 'mesas', nombre: 'El reparto de mesas', componente: PanelMesas },
    { id: 'galeria', nombre: 'Las fotos', componente: PanelGaleria },
    { id: 'regalos', nombre: 'Los regalos', componente: PanelRegalos },
    { id: 'recibidos', nombre: 'Lo recibido', componente: PanelRecibidos },
  ] as const;

  protected readonly cual = signal<string>('alojamientos');

  protected componente(): Type<unknown> {
    const elegida = this.pantallas.find((p) => p.id === this.cual());
    return (elegida ?? this.pantallas[0]).componente as Type<unknown>;
  }

  protected elegir(evento: Event): void {
    this.cual.set((evento.target as HTMLSelectElement).value);
  }
}
