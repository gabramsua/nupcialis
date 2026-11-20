import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type Type,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { Fuentes } from '../public-site/plantillas/fuentes';
import { PLANTILLAS, plantillaDe, type PlantillaId } from '../public-site/plantillas/catalogo';
import { cargarPlantilla } from '../public-site/plantillas/cargador';
import { BODA_DE_MUESTRA, VACIA, type Muestra } from './muestras';

/**
 * Las plantillas de la web pública, con datos de muestra. **Solo en desarrollo.**
 *
 * Existe por una razón concreta: hasta ahora, ver una plantilla con contenido
 * de verdad obligaba a dar de alta una boda en Firebase, cargarle invitados,
 * escribirle preguntas, cronología, alojamientos y dress code, y entrar por su
 * subdominio. Eso son veinte minutos y un dominio autorizado de Auth gastado
 * (§11) cada vez que se quiere mirar si algo se sale de la pantalla en un móvil
 * de 360 px.
 *
 * Aquí se ve en un segundo, sin red y sin Firebase: la ruta no provee nada del
 * SDK, y los datos son un objeto en memoria. Las dos cosas que se miran son el
 * **cambio de plantilla** y el **caso vacío**, que es cómo se ve una boda recién
 * creada y el que siempre se olvida.
 *
 * No se registra en producción (`isDevMode()` en `app.routes.ts`), igual que el
 * catálogo del sistema visual.
 */
@Component({
  selector: 'np-previa-publica',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv__barra">
      <label>
        Plantilla
        <select [value]="plantilla()" (change)="elegir($event)">
          @for (p of plantillas; track p.id) {
            <option [value]="p.id">{{ p.nombre }}</option>
          }
        </select>
      </label>

      <label>
        Datos
        <select [value]="conDatos() ? 'llena' : 'vacia'" (change)="elegirDatos($event)">
          <option value="llena">Boda con todo relleno</option>
          <option value="vacia">Boda recién creada</option>
        </select>
      </label>

      <span class="pv__nota">Solo en desarrollo. Sin Firebase: los datos son de muestra.</span>
    </div>

    @if (componente(); as cual) {
      <div class="pv__lienzo">
        <ng-container *ngComponentOutlet="cual; inputs: { datos: datos() }" />
      </div>
    } @else {
      <p class="pv__nota">Cargando la plantilla…</p>
    }
  `,
  styles: `
    .pv__barra {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: end;
      padding: 0.75rem 1rem;
      border-block-end: 1px solid #ddd;
      background: #fff;
      color: #222;
      font-family: system-ui, sans-serif;
      font-size: 0.85rem;
    }
    .pv__barra label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .pv__nota {
      color: #666;
    }
    .pv__lienzo {
      container-type: inline-size;
    }
  `,
})
export class PreviaPublica {
  private readonly fuentes = inject(Fuentes);

  protected readonly plantillas = PLANTILLAS;
  protected readonly plantilla = signal<PlantillaId>('clasica');
  protected readonly conDatos = signal(true);
  protected readonly componente = signal<Type<unknown> | null>(null);

  protected readonly datos = computed<Muestra>(() => (this.conDatos() ? BODA_DE_MUESTRA : VACIA));

  constructor() {
    effect(() => {
      const elegida = plantillaDe(this.plantilla());
      this.fuentes.cargar(elegida);
      void cargarPlantilla(elegida.id).then((componente) => this.componente.set(componente));
    });
  }

  protected elegir(evento: Event): void {
    this.plantilla.set((evento.target as HTMLSelectElement).value as PlantillaId);
  }

  protected elegirDatos(evento: Event): void {
    this.conDatos.set((evento.target as HTMLSelectElement).value === 'llena');
  }
}
