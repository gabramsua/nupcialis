import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import {
  ACENTOS_HOME,
  FUENTES_HOME,
  HOME_DE_FABRICA,
  INFO_PLANTILLAS_HOME,
  type ContenidoHome,
} from '../home/home';
import { NpHomePagina } from '../home/home-pagina';

/**
 * La HOME de nupcialis.com con lo de fábrica. **Solo en desarrollo.**
 *
 * Para mirar las tres plantillas, las fuentes y los acentos sin Firebase ni
 * sesión de superadmin, y a 360 px, que es donde se rompen.
 */
@Component({
  selector: 'np-previa-home',
  imports: [NpHomePagina],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ph__barra">
      <label>
        Plantilla
        <select (change)="plantilla.set(valor($event))">
          @for (p of plantillas; track p.id) {
            <option [value]="p.id" [selected]="p.id === plantilla()">{{ p.nombre }}</option>
          }
        </select>
      </label>
      <label>
        Acento
        <select (change)="acento.set(valor($event))">
          <option value="">De la plantilla</option>
          @for (a of acentos; track a.id) {
            <option [value]="a.id">{{ a.nombre }}</option>
          }
        </select>
      </label>
      <label>
        Títulos
        <select (change)="titulo.set(valor($event))">
          <option value="">De la plantilla</option>
          @for (f of titulos; track f.id) {
            <option [value]="f.id">{{ f.nombre }}</option>
          }
        </select>
      </label>
      <span class="ph__nota">Solo en desarrollo. Contenido de fábrica.</span>
    </div>
    <np-home-pagina [contenido]="contenido()" />
  `,
  styles: `
    .ph__barra {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: end;
      padding: 0.6rem 1rem;
      background: #fff;
      color: #222;
      font: 0.85rem system-ui;
    }
    .ph__barra label {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
  `,
})
export class PreviaHome {
  protected readonly plantillas = INFO_PLANTILLAS_HOME;
  protected readonly acentos = ACENTOS_HOME;
  protected readonly titulos = FUENTES_HOME.filter((f) => f.tipo === 'titulo');

  protected readonly plantilla = signal<string>('luz');
  protected readonly acento = signal('');
  protected readonly titulo = signal('');

  protected readonly contenido = computed<ContenidoHome>(() => ({
    ...HOME_DE_FABRICA,
    template: this.plantilla() as ContenidoHome['template'],
    accent: this.acento(),
    fontTitle: this.titulo(),
  }));

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }
}
