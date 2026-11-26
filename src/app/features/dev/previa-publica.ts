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

import { ActivatedRoute } from '@angular/router';

import { variablesDeMarca } from '../../core/tenant/marca';
import { paletaDe, PALETAS } from '../public-site/paletas/paletas';
import { Fuentes } from '../public-site/plantillas/fuentes';
import { PLANTILLAS, plantillaDe, type PlantillaId } from '../public-site/plantillas/catalogo';
import { cargarPlantilla } from '../public-site/plantillas/cargador';
import { BODA_DE_MUESTRA, FOTO_DE_MUESTRA, VACIA, type Muestra } from './muestras';

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
    @if (conBarra) {
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

        <label>
          Paleta
          <select [value]="paleta()" (change)="elegirPaleta($event)">
            <option value="">La de la plantilla</option>
            @for (p of paletas; track p.id) {
              <option [value]="p.id">{{ p.nombre }}</option>
            }
          </select>
        </label>

        <span class="pv__nota">Solo en desarrollo. Sin Firebase: los datos son de muestra.</span>
      </div>
    }

    @if (componente(); as cual) {
      <div class="pv__lienzo" [style]="estilo()">
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

  /**
   * Parámetros de la URL, para poder fotografiar una combinación sin tocar la
   * barra (de aquí salen las capturas de la HOME, `scripts/capturas-home`):
   * `?plantilla=moderna&paleta=salvia&foto=1&barra=0`.
   */
  private readonly consulta = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly plantillas = PLANTILLAS;
  protected readonly paletas = PALETAS;
  protected readonly conBarra = this.consulta.get('barra') !== '0';
  protected readonly plantilla = signal<PlantillaId>(
    plantillaDe(this.consulta.get('plantilla')).id,
  );
  protected readonly paleta = signal<string>(paletaDe(this.consulta.get('paleta'))?.id ?? '');
  protected readonly conDatos = signal(true);
  protected readonly conFoto = signal(this.consulta.get('foto') === '1');
  protected readonly componente = signal<Type<unknown> | null>(null);

  protected readonly datos = computed<Muestra>(() =>
    this.conDatos()
      ? { ...BODA_DE_MUESTRA, heroImageUrl: this.conFoto() ? FOTO_DE_MUESTRA : null }
      : VACIA,
  );

  /** Los colores de la plantilla y, encima, los de la paleta si hay una. */
  protected readonly estilo = computed(() => {
    const plantilla = plantillaDe(this.plantilla());
    const paleta = paletaDe(this.paleta());
    return {
      '--np-marca-background': plantilla.colores.fondo,
      '--np-marca-text': plantilla.colores.texto,
      '--np-marca-accent': plantilla.colores.acento,
      '--np-marca-surface': plantilla.colores.superficie,
      '--np-marca-titulos': plantilla.tipografia.titulos,
      '--np-marca-fuente': plantilla.tipografia.texto,
      ...variablesDeMarca(paleta?.colores ?? null),
    };
  });

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

  protected elegirPaleta(evento: Event): void {
    this.paleta.set((evento.target as HTMLSelectElement).value);
  }

  protected elegirDatos(evento: Event): void {
    this.conDatos.set((evento.target as HTMLSelectElement).value === 'llena');
  }
}
