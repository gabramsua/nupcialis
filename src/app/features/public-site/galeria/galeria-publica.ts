import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_GALERIA,
  type FalloGaleria,
  type FotoPublica,
} from '../../../core/galeria/galeria-gateway';
import { MAX_POR_SUBIDA, puedeBorrar } from './galeria';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import { NpCabeceraBoda } from '../navegacion/cabecera-boda';
import { conCabecera, usarTemaDeLaBoda } from '../tema';

/**
 * La galería, como la ve el invitado (§8.5).
 *
 * Es lo que trae de vuelta a la gente **al día siguiente**, así que se diseña
 * para el móvil y para la mano con la que se sujeta: rejilla de miniaturas que
 * caben dos por fila, visor a pantalla completa al tocar una, y el botón de
 * subir siempre a la vista.
 *
 * Hereda el tema de la pareja como cualquier otra sección: los colores salen
 * de `--np-marca-*` con la reserva de la plantilla detrás, porque esta página
 * tiene que parecer de **esta** boda y no de un producto.
 *
 * Lo que no hace y es a propósito: **no carga el SDK de Storage**. Las fotos
 * se reducen en el navegador y suben por invocable, que es lo que deja la web
 * pública dentro de su presupuesto.
 */
@Component({
  selector: 'np-galeria-publica',
  imports: [NpCabeceraBoda, RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style]': 'tema()' },
  template: `
    <ng-container *transloco="let t">
      @if (cabecera()) {
        <np-cabecera-boda [tenant]="tenant()" />
      }
      <div class="gl">
        @if (!cabecera()) {
          <a class="gl__volver" routerLink="/">
            <np-icon name="caret-left" />
            {{ t('publico.galeria.volver') }}
          </a>
        }

        <header class="gl__cabecera">
          <h1>{{ t('publico.galeria.titulo') }}</h1>
          <p>{{ t('publico.galeria.ayuda', { max: maxPorSubida }) }}</p>
        </header>

        <!--
          El botón es una etiqueta sobre un campo de fichero escondido: en un móvil
          abre la cámara o el carrete sin pasos de más.
        -->
        <label class="gl__subir" [class.gl__subir--ocupado]="subiendo()">
          <input
            type="file"
            accept="image/*"
            multiple
            [disabled]="subiendo()"
            (change)="elegidas($event)"
          />
          <np-icon [name]="subiendo() ? 'spinner-gap' : 'camera'" />
          {{ subiendo() ? t('publico.galeria.subiendo') : t('publico.galeria.subir') }}
        </label>

        <!-- Abre la cámara directamente en el móvil; en el ordenador, el selector de siempre. -->
        <label class="gl__subir gl__subir--camara" [class.gl__subir--ocupado]="subiendo()">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            data-origen="camara"
            [disabled]="subiendo()"
            (change)="elegidas($event)"
          />
          <np-icon name="camera" />
          {{ t('publico.galeria.hacerFoto') }}
        </label>

        @if (fallo(); as cual) {
          <p class="gl__fallo">
            <np-icon name="warning" />
            {{ t('publico.galeria.fallo.' + cual.tipo) }}
          </p>
        }

        @if (cargando() && fotos().length === 0) {
          <p class="gl__vacia">{{ t('publico.galeria.cargando') }}</p>
        } @else if (fotos().length === 0) {
          <p class="gl__vacia">{{ t('publico.galeria.ninguna') }}</p>
        } @else {
          @if (hayMias()) {
            <div class="gl__filtro" role="group" [attr.aria-label]="t('publico.galeria.titulo')">
              <button
                type="button"
                data-filtro="todas"
                [attr.aria-pressed]="!soloMias()"
                (click)="soloMias.set(false)"
              >
                {{ t('publico.galeria.todas') }}
              </button>
              <button
                type="button"
                data-filtro="mias"
                [attr.aria-pressed]="soloMias()"
                (click)="soloMias.set(true)"
              >
                {{ t('publico.galeria.mias', { n: numeroMias() }) }}
              </button>
            </div>
          }

          <ul class="gl__rejilla">
            @for (item of visibles(); track item.foto.id) {
              <li class="gl__celda">
                <button type="button" class="gl__miniatura" (click)="abrir(item.indice)">
                  <img
                    [src]="item.foto.urlMiniatura"
                    [alt]="
                      item.foto.pie || t('publico.galeria.deAlguien', { quien: item.foto.autor })
                    "
                    loading="lazy"
                    decoding="async"
                  />
                </button>
                @if (puedoBorrar(item.foto)) {
                  <button
                    type="button"
                    class="gl__quitar"
                    data-accion="borrar-mia"
                    (click)="borrar(item.foto)"
                  >
                    <np-icon name="trash" />
                    <span class="gl__oculto">{{ t('publico.galeria.borrar') }}</span>
                  </button>
                }
              </li>
            }
          </ul>

          @if (hayMas()) {
            <button type="button" class="gl__mas" [disabled]="cargandoMas()" (click)="cargarMas()">
              {{ cargandoMas() ? t('publico.galeria.cargando') : t('publico.galeria.verMas') }}
            </button>
          }
        }

        <!--
          El visor: una foto a pantalla completa, con las flechas y la salida
          siempre donde el pulgar las encuentra.
        -->
        @if (abierta(); as foto) {
          <div
            class="gl__visor"
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="t('publico.galeria.titulo')"
          >
            <button type="button" class="gl__cerrar" (click)="cerrar()">
              <np-icon name="x" />
              <span class="gl__oculto">{{ t('common.close') }}</span>
            </button>

            <img class="gl__grande" [src]="foto.url" [alt]="foto.pie || foto.autor" />

            <p class="gl__pie">
              <span>{{ foto.pie }}</span>
              <small>{{ t('publico.galeria.deAlguien', { quien: foto.autor }) }}</small>
            </p>

            <div class="gl__mando">
              <button type="button" [disabled]="!hayAnterior()" (click)="anterior()">
                <np-icon name="caret-left" />
                <span class="gl__oculto">{{ t('publico.galeria.anterior') }}</span>
              </button>

              @if (puedoBorrar(foto)) {
                <button type="button" class="gl__borrar" (click)="borrar(foto)">
                  <np-icon name="trash" />
                  {{ t('publico.galeria.borrar') }}
                </button>
              }

              <button type="button" [disabled]="!haySiguiente()" (click)="siguiente()">
                <np-icon name="caret-right" />
                <span class="gl__oculto">{{ t('publico.galeria.siguiente') }}</span>
              </button>
            </div>
          </div>
        }
      </div>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      max-inline-size: 60rem;
      margin-inline: auto;
      padding: 1.25rem 1rem 3rem;
      --gl-acento: var(--np-marca-accent, #e54d69);
      --gl-texto: var(--np-marca-text, inherit);
    }
    .gl__volver {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: inherit;
      font-size: 0.9rem;
      text-decoration: none;
      opacity: 0.75;
    }
    .gl__cabecera h1 {
      margin: 1rem 0 0.25rem;
      font-size: 1.6rem;
    }
    .gl__cabecera p {
      margin: 0 0 1.25rem;
      opacity: 0.8;
    }
    /* Subir es la acción principal de esta página: ancho entero y alto de
       dedo, que se pulsa sin mirar mientras se anda. */
    .gl__subir {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-block-size: 3.25rem;
      margin-block-end: 1.25rem;
      border-radius: 999px;
      background: var(--gl-acento);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .gl__subir input {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      opacity: 0;
      pointer-events: none;
    }
    .gl__subir--ocupado {
      opacity: 0.7;
      cursor: progress;
    }
    .gl__fallo {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0 0 1rem;
      font-weight: 600;
    }
    .gl__fallo np-icon {
      flex: none;
      margin-block-start: 0.1em;
    }
    .gl__vacia {
      margin: 2rem 0;
      opacity: 0.75;
      text-align: center;
    }
    /* Dos por fila en un móvil y las que quepan en una pantalla grande. */
    .gl__rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .gl__celda {
      position: relative;
    }
    .gl__quitar {
      position: absolute;
      inset-block-end: 0.35rem;
      inset-inline-end: 0.35rem;
      display: grid;
      place-items: center;
      inline-size: 2.5rem;
      block-size: 2.5rem;
      border: 0;
      border-radius: 999px;
      background: rgb(0 0 0 / 0.65);
      color: #fff;
      cursor: pointer;
    }
    .gl__filtro {
      display: flex;
      gap: 0.5rem;
      margin-block-end: 1rem;
    }
    .gl__filtro button {
      min-block-size: 2.5rem;
      padding-inline: 1rem;
      border: 1px solid currentColor;
      border-radius: 999px;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .gl__filtro button[aria-pressed='true'] {
      background: var(--gl-acento);
      border-color: var(--gl-acento);
      color: #fff;
      font-weight: 600;
    }
    .gl__miniatura {
      display: block;
      inline-size: 100%;
      padding: 0;
      border: 0;
      border-radius: 0.75rem;
      background: none;
      cursor: pointer;
      overflow: hidden;
      aspect-ratio: 1;
    }
    .gl__miniatura img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
    .gl__mas {
      display: block;
      inline-size: 100%;
      min-block-size: 3rem;
      margin-block-start: 1rem;
      border: 1px solid currentColor;
      border-radius: 999px;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .gl__visor {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: #000;
      color: #fff;
    }
    .gl__grande {
      flex: 1;
      inline-size: 100%;
      min-block-size: 0;
      object-fit: contain;
    }
    .gl__pie {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      margin: 0;
      text-align: center;
    }
    .gl__pie small {
      opacity: 0.7;
    }
    .gl__cerrar {
      align-self: flex-end;
    }
    /* Los mandos, abajo: en un móvil grande, arriba no llega el pulgar. */
    .gl__mando {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .gl__visor button {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-inline-size: 3rem;
      min-block-size: 3rem;
      justify-content: center;
      border: 0;
      border-radius: 999px;
      background: rgb(255 255 255 / 15%);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .gl__visor button:disabled {
      opacity: 0.35;
    }
    .gl__borrar {
      padding-inline: 1rem;
    }
    .gl__oculto {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      clip-path: inset(50%);
      overflow: hidden;
    }
    /* Los títulos, con la letra de la plantilla de la pareja (D-55). */
    h1,
    h2 {
      font-family: var(--np-marca-titulos, inherit);
    }
  `,
})
export class NpGaleriaPublica {
  /** La boda, que resuelve la ruta: de aquí sale el tema (D-55). */
  readonly tenant = input<ResultadoTenant | null>(null);
  protected readonly tema = usarTemaDeLaBoda(this.tenant);
  protected readonly cabecera = computed(() => conCabecera(this.tenant()));

  private readonly puerta = inject(PUERTA_GALERIA);

  protected readonly maxPorSubida = MAX_POR_SUBIDA;

  protected readonly fotos = signal<readonly FotoPublica[]>([]);
  protected readonly cursor = signal<string | null>(null);
  protected readonly cargando = signal(true);
  protected readonly cargandoMas = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly fallo = signal<FalloGaleria | null>(null);

  /** Quién soy, para saber qué fotos puedo borrar. Lo dice el servidor. */
  protected readonly miGuestId = signal<string | null>(null);

  private readonly indice = signal<number | null>(null);

  /** El filtro «Mis fotos». */
  protected readonly soloMias = signal(false);

  private readonly lasMias = computed(() => this.fotos().filter((f) => this.puedoBorrar(f)));
  protected readonly numeroMias = computed(() => this.lasMias().length);
  protected readonly hayMias = computed(() => this.numeroMias() > 0);

  /** Lo que se pinta en la rejilla, con su posición en la lista entera (la del visor). */
  protected readonly visibles = computed(() => {
    const filtrar = this.soloMias() && this.hayMias();
    return this.fotos()
      .map((foto, indice) => ({ foto, indice }))
      .filter((item) => !filtrar || this.puedoBorrar(item.foto));
  });

  protected readonly abierta = computed<FotoPublica | null>(() => {
    const n = this.indice();
    return n === null ? null : (this.fotos()[n] ?? null);
  });

  protected readonly hayMas = computed(() => this.cursor() !== null);
  protected readonly hayAnterior = computed(() => (this.indice() ?? 0) > 0);
  protected readonly haySiguiente = computed(() => {
    const n = this.indice();
    return n !== null && n < this.fotos().length - 1;
  });

  /**
   * El teclado del visor.
   *
   * Lo usa quien mira la galería en un portátil, que es la mitad de la gente
   * al día siguiente de la boda.
   */
  private readonly alPulsarTecla = (evento: KeyboardEvent) => {
    if (this.indice() === null) return;
    if (evento.key === 'Escape') this.cerrar();
    if (evento.key === 'ArrowLeft') this.anterior();
    if (evento.key === 'ArrowRight') this.siguiente();
  };

  constructor() {
    document.addEventListener('keydown', this.alPulsarTecla);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', this.alPulsarTecla);
      document.body.style.overflow = '';
    });

    void this.cargar();
  }

  protected puedoBorrar(foto: FotoPublica): boolean {
    return puedeBorrar(foto, { guestId: this.miGuestId(), esPareja: false });
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    const resultado = await this.puerta.listar(null);
    this.cargando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    this.fallo.set(null);
    this.fotos.set(resultado.fotos);
    this.cursor.set(resultado.cursor);
    if (resultado.miGuestId) this.miGuestId.set(resultado.miGuestId);
  }

  protected async cargarMas(): Promise<void> {
    if (!this.hayMas() || this.cargandoMas()) return;

    this.cargandoMas.set(true);
    const resultado = await this.puerta.listar(this.cursor());
    this.cargandoMas.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    this.fotos.update((previas) => [...previas, ...resultado.fotos]);
    this.cursor.set(resultado.cursor);
    if (resultado.miGuestId) this.miGuestId.set(resultado.miGuestId);
  }

  /**
   * Las fotos elegidas: se suben **en paralelo y cada una por su cuenta**.
   *
   * Si una falla —la que salió movida de la cámara, el formato raro— las otras
   * dos siguen. Subirlas en cadena y parar en la primera que falla es perder
   * las que ya estaban listas.
   */
  protected async elegidas(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivos = entrada.files ? [...entrada.files] : [];
    entrada.value = '';

    if (archivos.length === 0 || this.subiendo()) return;

    this.subiendo.set(true);
    this.fallo.set(null);

    const resultados = await Promise.all(
      archivos.slice(0, MAX_POR_SUBIDA).map((archivo) => this.puerta.subir(archivo, '')),
    );

    const primerFallo = resultados.find((resultado) => !resultado.ok);
    if (primerFallo && !primerFallo.ok) this.fallo.set(primerFallo.fallo);

    this.subiendo.set(false);
    await this.cargar();
  }

  protected abrir(n: number): void {
    this.indice.set(n);
    document.body.style.overflow = 'hidden';
  }

  protected cerrar(): void {
    this.indice.set(null);
    document.body.style.overflow = '';
  }

  protected anterior(): void {
    if (this.hayAnterior()) this.indice.update((n) => (n ?? 0) - 1);
  }

  protected siguiente(): void {
    if (this.haySiguiente()) this.indice.update((n) => (n ?? 0) + 1);
  }

  protected async borrar(foto: FotoPublica): Promise<void> {
    const resultado = await this.puerta.borrar(foto.id);
    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    this.fotos.update((previas) => previas.filter((otra) => otra.id !== foto.id));
    if ((this.indice() ?? 0) >= this.fotos().length) this.cerrar();
  }
}
