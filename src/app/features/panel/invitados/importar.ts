import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_INVITADOS,
  type DatosInvitado,
  type FalloInvitado,
  type Importacion,
} from '../../../core/invitados/invitados-gateway';
import { descargarXlsx } from './exportar-xlsx';
import { TIPOS_ACEPTADOS, esCsv, esXlsx, leerCsv, leerXlsx } from './leer-xlsx';
import { BodaStore } from '../boda.store';
import { GruposStore } from './grupos.store';
import {
  DEFINICIONES,
  MAX_FILAS,
  NOMBRE_PLANTILLA,
  adivinarColumnas,
  lado,
  hojaDePlantilla,
  nombresDeGrupo,
  pareceCabecera,
  type Columna,
} from './plantilla';

type Paso = 'origen' | 'mapeo' | 'resultado';

/**
 * Importar la lista de invitados desde nuestra plantilla de Excel.
 *
 * **La previsualización la calcula el servidor**, con la misma llamada que
 * importa y una bandera de «solo mirar». Si la calculara el navegador habría
 * dos validaciones distintas, y el día que se separaran la previsualización
 * empezaría a mentir sin que nadie se enterase hasta que faltan invitados.
 *
 * **Un solo camino de entrada** (D-52): se descarga la plantilla, se rellena y
 * se sube. Las columnas se reconocen solas porque las cabeceras son las
 * nuestras; un fichero que no las tenga se rechaza diciendo por qué, en vez de
 * pedirle a la pareja que adivine qué es cada columna.
 */
@Component({
  selector: 'np-importar-invitados',
  imports: [RouterLink, TranslocoDirective, NpAlert, NpButton, NpStatusChip, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="imp">
        <header class="imp__intro">
          <div>
            <h2>{{ t('panel.importar.titulo') }}</h2>
            <p>{{ t('panel.importar.ayuda') }}</p>
          </div>
          <a class="imp__volver" routerLink="/panel/guests">
            <np-icon name="arrow-left" />
            {{ t('panel.importar.volver') }}
          </a>
        </header>

        @if (fallo()) {
          <np-alert status="declined" [heading]="t('panel.importar.fallo')">
            <p>{{ claveDeFallo() ? t(claveDeFallo()!) : mensajeError() }}</p>
          </np-alert>
        }

        <!-- Lo que se puede decir sin preguntarle al servidor: un fichero
             vacío, o uno tan grande que lo va a rechazar de todas formas. -->
        @if (problemaLocal() === 'vacio') {
          <np-alert status="declined" [heading]="t('panel.importar.fallo')">
            <p>{{ t('panel.importar.fichero.vacio') }}</p>
          </np-alert>
        } @else if (problemaLocal() === 'demasiadas') {
          <np-alert status="declined" [heading]="t('panel.importar.fallo')">
            <p>{{ t('panel.importar.demasiadasFilas', { n: filasLeidas(), max: maxFilas }) }}</p>
          </np-alert>
        } @else if (problemaLocal() === 'plantilla') {
          <np-alert status="declined" [heading]="t('panel.importar.fallo')">
            <p>{{ t('panel.importar.fichero.plantilla') }}</p>
          </np-alert>
        } @else if (problemaLocal() === 'noExcel') {
          <np-alert status="declined" [heading]="t('panel.importar.fallo')">
            <p>{{ t('panel.importar.fichero.noExcel') }}</p>
          </np-alert>
        } @else if (problemaLocal() === 'xlsxIlegible') {
          <np-alert status="declined" [heading]="t('panel.importar.fallo')">
            <p>{{ t('panel.importar.fichero.xlsxIlegible') }}</p>
          </np-alert>
        }

        @if (leyendo()) {
          <p class="imp__leyendo">{{ t('panel.importar.fichero.leyendo') }}</p>
        }

        @switch (paso()) {
          @case ('origen') {
            <ol class="imp__pasos">
              <li>
                <h3>{{ t('panel.importar.paso1.titulo') }}</h3>
                <p>{{ t('panel.importar.paso1.ayuda') }}</p>
                <button
                  npButton
                  variant="secondary"
                  type="button"
                  [loading]="descargando()"
                  (click)="descargarPlantilla()"
                >
                  <np-icon name="download-simple" />
                  {{ t('panel.importar.paso1.descargar') }}
                </button>
              </li>
              <li>
                <h3>{{ t('panel.importar.paso2.titulo') }}</h3>
                <p>{{ t('panel.importar.paso2.ayuda') }}</p>
              </li>
              <li>
                <h3>{{ t('panel.importar.paso3.titulo') }}</h3>
                <p>{{ t('panel.importar.paso3.ayuda') }}</p>
                <label class="imp__subir">
                  <np-icon name="upload-simple" />
                  {{ t('panel.importar.paso3.elegir') }}
                  <input
                    type="file"
                    [attr.accept]="tiposAceptados"
                    (change)="elegirFichero($event)"
                  />
                </label>
              </li>
            </ol>
          }

          @case ('mapeo') {
            <div class="imp__tarjeta">
              <h3>{{ t('panel.importar.mapeo.titulo', { n: cuantasFilas() }) }}</h3>
              <p>{{ t('panel.importar.mapeo.ayuda') }}</p>

              <ul class="imp__columnas">
                @for (cabecera of cabeceras(); track $index; let columna = $index) {
                  <li>
                    <span class="imp__cabecera">{{
                      cabecera || t('panel.importar.sinTitulo')
                    }}</span>
                    @if (mapeo()[columna]; as clave) {
                      <np-status-chip
                        status="confirmed"
                        [label]="t('panel.importar.columna.' + clave)"
                      />
                    } @else {
                      <np-status-chip
                        status="pending"
                        [label]="t('panel.importar.columna.ignorada')"
                      />
                    }
                    <small class="imp__muestra">{{ muestraDe(columna) }}</small>
                  </li>
                }
              </ul>

              <div class="imp__acciones">
                <button npButton variant="ghost" type="button" (click)="empezarDeCero()">
                  {{ t('panel.importar.otroFichero') }}
                </button>
                <button npButton type="button" [loading]="trabajando()" (click)="comprobar()">
                  <np-icon name="eye" />
                  {{ t('panel.importar.comprobar') }}
                </button>
              </div>
            </div>
          }

          @case ('resultado') {
            @if (resultado(); as r) {
              <dl class="imp__resumen">
                <div>
                  <dt>{{ t('panel.importar.resumen.nuevos') }}</dt>
                  <dd>{{ r.resumen.nuevos }}</dd>
                </div>
                <div>
                  <dt>{{ t('panel.importar.resumen.duplicados') }}</dt>
                  <dd>{{ r.resumen.duplicados }}</dd>
                </div>
                <div>
                  <dt>{{ t('panel.importar.resumen.invalidos') }}</dt>
                  <dd>{{ r.resumen.invalidos }}</dd>
                </div>
                @if (r.resumen.sinSitio > 0) {
                  <div>
                    <dt>{{ t('panel.importar.resumen.sinSitio') }}</dt>
                    <dd>{{ r.resumen.sinSitio }}</dd>
                  </div>
                }
              </dl>

              @if (r.previsualizacion) {
                <np-alert status="info" [heading]="t('panel.importar.aunNoSeHaHecho')">
                  <p>{{ t('panel.importar.aunNoSeHaHechoAyuda') }}</p>
                </np-alert>
                <!-- Crear grupos es un efecto que no se ve en la lista de
                     filas: se anuncia aparte, con sus nombres, para que un
                     «Univesidad» mal escrito se vea antes de convertirse en
                     un grupo más. -->
                @if (r.gruposNuevos.length > 0) {
                  <np-alert
                    status="attention"
                    [heading]="t('panel.importar.gruposNuevos', { n: r.gruposNuevos.length })"
                  >
                    <p>{{ r.gruposNuevos.join(', ') }}</p>
                    <p>{{ t('panel.importar.gruposNuevosAyuda') }}</p>
                  </np-alert>
                }
              } @else {
                <np-alert
                  status="confirmed"
                  [heading]="t('panel.importar.hecho', { n: r.importados })"
                >
                  <a routerLink="/panel/guests">{{ t('panel.importar.verLista') }}</a>
                </np-alert>
              }

              <!-- Solo lo que no entra: repasar doscientas filas correctas no
                   aporta nada, y lo que hay que mirar se pierde entre ellas. -->
              @if (problematicas().length > 0) {
                <ul class="imp__filas">
                  @for (fila of problematicas(); track fila.fila) {
                    <li>
                      <span class="imp__numero">{{
                        t('panel.importar.fila', { n: fila.fila })
                      }}</span>
                      <span class="imp__nombre">{{
                        fila.nombre || t('panel.importar.sinNombre')
                      }}</span>
                      <np-status-chip
                        [status]="fila.estado === 'duplicado' ? 'pending' : 'declined'"
                        [label]="t('panel.importar.estado.' + fila.estado)"
                      />
                      @for (motivo of fila.motivos; track motivo.campo) {
                        <small>{{
                          t('panel.invitados.invalido.' + motivo.campo + '.' + motivo.motivo)
                        }}</small>
                      }
                    </li>
                  }
                </ul>
              }

              <div class="imp__acciones">
                <button npButton variant="ghost" type="button" (click)="empezarDeCero()">
                  {{ t('panel.importar.otroFichero') }}
                </button>
                @if (r.previsualizacion && r.resumen.nuevos > 0) {
                  <button npButton type="button" [loading]="trabajando()" (click)="importar()">
                    <np-icon name="check" />
                    {{ t('panel.importar.importar', { n: r.resumen.nuevos }) }}
                  </button>
                }
              </div>
            }
          }
        }
      </section>
    </ng-container>
  `,
  styles: `
    .imp__leyendo {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .imp {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .imp__intro {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    .imp__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .imp__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .imp__volver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .imp__tarjeta {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .imp__tarjeta h3 {
      margin: 0;
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-semibold);
    }
    .imp__tarjeta p {
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .imp__subir {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
      cursor: pointer;
    }
    .imp__subir:focus-within {
      outline: 2px solid var(--np-surface-text);
      outline-offset: 2px;
    }
    .imp__subir input {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      opacity: 0;
    }
    .imp__pasos {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: paso;
    }
    .imp__pasos li {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
      counter-increment: paso;
    }
    .imp__pasos h3 {
      margin: 0;
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-semibold);
    }
    .imp__pasos h3::before {
      content: counter(paso) '. ';
    }
    .imp__pasos p {
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    /* Primero móvil: una columna por fila, con su muestra debajo. */
    .imp__columnas {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      inline-size: 100%;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .imp__columnas li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-1) var(--np-space-3);
    }
    .imp__cabecera {
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
    .imp__muestra {
      flex-basis: 100%;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-xs);
    }
    .imp__resumen {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
      gap: var(--np-space-2);
      margin: 0;
    }
    .imp__resumen div {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .imp__resumen dt {
      font-size: var(--np-text-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--np-surface-text-muted);
    }
    .imp__resumen dd {
      margin: 0;
      font-size: var(--np-text-2xl);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .imp__filas {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .imp__filas li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      font-size: var(--np-text-sm);
    }
    .imp__numero {
      color: var(--np-surface-text-muted);
      font-variant-numeric: tabular-nums;
    }
    .imp__nombre {
      font-weight: var(--np-weight-medium);
    }
    .imp__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
  `,
})
export class ImportarInvitados {
  private readonly puerta = inject(PUERTA_INVITADOS);
  private readonly boda = inject(BodaStore);
  private readonly grupos = inject(GruposStore);

  protected readonly definiciones = DEFINICIONES;

  protected readonly paso = signal<Paso>('origen');
  protected readonly descargando = signal(false);
  protected readonly trabajando = signal(false);
  protected readonly fallo = signal<FalloInvitado | null>(null);
  protected readonly problemaLocal = signal<
    'vacio' | 'demasiadas' | 'xlsxIlegible' | 'plantilla' | 'noExcel' | null
  >(null);
  /** Mientras se abre el `.xlsx`: en una hoja grande tarda un segundo. */
  protected readonly leyendo = signal(false);
  protected readonly tiposAceptados = TIPOS_ACEPTADOS;
  protected readonly filasLeidas = signal(0);
  protected readonly maxFilas = MAX_FILAS;

  private readonly tabla = signal<readonly (readonly string[])[]>([]);
  protected readonly mapeo = signal<readonly (Columna | null)[]>([]);
  protected readonly resultado = signal<Importacion | null>(null);

  protected readonly cabeceras = computed(() => this.tabla()[0] ?? []);

  /** Las filas de datos, sin la de cabeceras. */
  private readonly datos = computed(() => this.tabla().slice(1));

  protected readonly cuantasFilas = computed(() => this.datos().length);

  protected readonly problematicas = computed(
    () => this.resultado()?.filas.filter((f) => f.estado !== 'nuevo') ?? [],
  );

  /**
   * Qué se le cuenta a la pareja. `null` si el mensaje viene del servidor.
   *
   * Sin el `default`, un fallo que no esté en la lista pinta un aviso rojo con
   * el hueco del texto vacío, que es peor que no avisar: se ve que algo ha
   * pasado y no se dice qué.
   */
  protected claveDeFallo(): string | null {
    const f = this.fallo();
    if (f === null) return null;

    switch (f.tipo) {
      case 'sin-verificar':
        return 'superadmin.alta.sinVerificar';
      case 'sin-permiso':
        return 'panel.invitados.sinPermiso';
      case 'error':
        return null;
      default:
        return 'panel.importar.rechazado';
    }
  }

  protected mensajeError(): string {
    const f = this.fallo();
    return f?.tipo === 'error' ? f.mensaje : '';
  }

  protected async descargarPlantilla(): Promise<void> {
    this.descargando.set(true);
    const hecho = await descargarXlsx([hojaDePlantilla(this.pareja())], NOMBRE_PLANTILLA);
    this.descargando.set(false);

    // Sin conexión la librería no llega a cargar: se dice, no se queda quieto.
    this.problemaLocal.set(hecho ? null : 'xlsxIlegible');
  }

  protected async elegirFichero(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const fichero = entrada.files?.[0];
    // Se limpia siempre: si no, elegir el mismo fichero dos veces no dispara el
    // evento y parece que el botón no hace nada.
    entrada.value = '';
    if (!fichero) return;

    // `.xlsx` y `.csv`: un `.xls` antiguo no se intenta leer. Se dice qué hacer,
    // que es guardarlo como Excel moderno o como CSV, o usar la plantilla.
    if (!esXlsx(fichero.name) && !esCsv(fichero.name)) {
      this.fallo.set(null);
      this.problemaLocal.set('noExcel');
      this.filasLeidas.set(0);
      return;
    }

    this.leyendo.set(true);
    const lectura = esCsv(fichero.name) ? await leerCsv(fichero) : await leerXlsx(fichero);
    this.leyendo.set(false);

    if (!lectura.ok) {
      this.fallo.set(null);
      this.problemaLocal.set(lectura.motivo === 'vacio' ? 'vacio' : 'xlsxIlegible');
      this.filasLeidas.set(0);
      return;
    }

    this.leerFilas(lectura.filas);
  }

  /**
   * Lo que se hace con las filas ya leídas: comprobar que son de nuestra
   * plantilla y preparar el paso siguiente.
   */
  protected leerFilas(filas: readonly (readonly string[])[]): void {
    this.fallo.set(null);
    this.problemaLocal.set(null);
    this.filasLeidas.set(filas.length);

    if (filas.length === 0) {
      this.problemaLocal.set('vacio');
      return;
    }
    // Se dice aquí y no después de mandarlo: subir un megabyte para que la
    // función conteste lo mismo es tiempo de la pareja tirado.
    if (filas.length > MAX_FILAS) {
      this.problemaLocal.set('demasiadas');
      return;
    }

    // La primera fila tiene que ser la de cabeceras y traer al menos el nombre.
    // Sin eso no es nuestra plantilla, y adivinar qué es cada columna es
    // exactamente lo que daba errores.
    const mapeo = pareceCabecera(filas[0]) ? adivinarColumnas(filas[0]) : [];
    if (!mapeo.includes('fullName')) {
      this.problemaLocal.set('plantilla');
      return;
    }

    this.tabla.set(filas.map((fila) => [...fila]));
    this.mapeo.set(mapeo);

    this.fallo.set(null);
    this.resultado.set(null);
    this.paso.set('mapeo');
  }

  /** Un par de valores de esa columna, para saber qué se está mapeando. */
  protected muestraDe(indice: number): string {
    return this.datos()
      .slice(0, 2)
      .map((fila) => fila[indice] ?? '')
      .filter((v) => v !== '')
      .join(' · ');
  }

  protected empezarDeCero(): void {
    this.tabla.set([]);
    this.mapeo.set([]);
    this.resultado.set(null);
    this.fallo.set(null);
    this.problemaLocal.set(null);
    this.filasLeidas.set(0);
    this.paso.set('origen');
  }

  protected comprobar(): Promise<void> {
    return this.enviar(true);
  }

  protected importar(): Promise<void> {
    return this.enviar(false);
  }

  private async enviar(soloPrevisualizar: boolean): Promise<void> {
    this.trabajando.set(true);
    const resultado = await this.puerta.importar(this.aFilas(), { soloPrevisualizar });
    this.trabajando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    this.fallo.set(null);
    this.resultado.set(resultado.importacion);
    this.paso.set('resultado');

    // Si se han creado grupos, el resto del panel tiene que verlos ya.
    if (!soloPrevisualizar && resultado.importacion.gruposNuevos.length > 0) {
      await this.grupos.cargar();
    }
  }

  private pareja(): { partnerA: string; partnerB: string } {
    return this.boda.boda()?.pareja ?? { partnerA: '', partnerB: '' };
  }

  /** Aplica el mapeo: de celdas sueltas a campos con nombre. */
  private aFilas(): readonly DatosInvitado[] {
    const mapeo = this.mapeo();
    const pareja = this.pareja();

    return this.datos().map((fila) => {
      const datos: Record<string, unknown> = { fullName: '' };

      mapeo.forEach((columna, indice) => {
        if (!columna) return;
        const valor = fila[indice] ?? '';

        if (columna === 'ageGroup') datos[columna] = edad(valor);
        else if (columna === 'groups') datos['groupNames'] = nombresDeGrupo(valor);
        else if (columna === 'side') {
          const suyo = lado(valor, pareja);
          if (suyo) datos['side'] = suyo;
        } else datos[columna] = valor;
      });

      return datos as unknown as DatosInvitado;
    });
  }
}

/** «niño», «nino», «child» → `child`. Lo que no se entienda, adulto. */
function edad(valor: string): 'adult' | 'child' | 'baby' {
  const limpio = valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  if (limpio.startsWith('nin') || limpio === 'child') return 'child';
  if (limpio.startsWith('beb') || limpio === 'baby') return 'baby';
  return 'adult';
}
