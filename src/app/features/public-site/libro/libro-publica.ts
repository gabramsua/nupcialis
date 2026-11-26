import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_LIBRO,
  type FalloLibro,
  type FirmaPublica,
  type ResultadoLibro,
} from '../../../core/libro/libro-gateway';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import { fechaMedia } from '../../../shared/fecha';
import { NpCabeceraBoda } from '../navegacion/cabecera-boda';
import { conCabecera, usarTemaDeLaBoda } from '../tema';
import { MAX_MENSAJE, MAX_POR_INVITADO } from './libro';

/**
 * El libro de firmas, como lo ve el invitado (§8.15).
 *
 * Se abre desde el móvil, y lo que hay que conseguir es que **firmar sean un
 * cuadro de texto y un botón**. Los mensajes de los demás van debajo, la más
 * reciente primero, cada uno con el nombre —o el mote— de quien lo escribió.
 * Quitar una firma propia es un toque; una ajena solo la quita la pareja.
 */
@Component({
  selector: 'np-libro-publica',
  imports: [NpCabeceraBoda, FormsModule, RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style]': 'tema()' },
  template: `
    <ng-container *transloco="let t">
      @if (cabecera()) {
        <np-cabecera-boda [tenant]="tenant()" />
      }
      <div class="lb">
        @if (!cabecera()) {
          <a class="lb__volver" routerLink="/">
            <np-icon name="caret-left" />
            {{ t('publico.libro.volver') }}
          </a>
        }

        <header class="lb__cabecera">
          <h1>{{ t('publico.libro.titulo') }}</h1>
          <p>{{ t('publico.libro.ayuda') }}</p>
        </header>

        <form class="lb__form" (submit)="firmar($event)">
          <label>
            {{ t('publico.libro.campo') }}
            <textarea
              name="message"
              rows="4"
              [attr.maxlength]="maxMensaje"
              [placeholder]="t('publico.libro.placeholder')"
              [ngModel]="mensaje()"
              (ngModelChange)="mensaje.set($event)"
            ></textarea>
          </label>
          <small class="lb__contador">{{ mensaje().length }} / {{ maxMensaje }}</small>
          <button type="submit" class="lb__enviar" [disabled]="!puedeFirmar() || enviando()">
            <np-icon name="book-open" weight="fill" />
            {{ t('publico.libro.firmar') }}
          </button>
          <small>{{ t('publico.libro.tope', { n: maxPorInvitado }) }}</small>
        </form>

        @if (aviso()) {
          <p class="lb__aviso" role="status">
            <np-icon name="check-circle" weight="fill" />
            {{ t('publico.libro.aviso') }}
          </p>
        }

        @if (fallo(); as cual) {
          <p class="lb__fallo" role="alert">
            <np-icon name="warning" />
            {{ t('publico.libro.fallo.' + cual.tipo) }}
          </p>
        }

        @if (cargando()) {
          <p class="lb__vacio">{{ t('publico.libro.cargando') }}</p>
        } @else if (firmas().length === 0 && fallo() === null) {
          <p class="lb__vacio">{{ t('publico.libro.nada') }}</p>
        } @else {
          <ul class="lb__lista">
            @for (f of firmas(); track f.id) {
              <li class="lb__firma" [class.lb__firma--mia]="f.mia">
                <p class="lb__mensaje">{{ f.mensaje }}</p>
                <footer>
                  <span class="lb__autor">
                    {{ f.autor }}
                    @if (dia(f); as d) {
                      <small>· {{ d }}</small>
                    }
                    @if (f.mia) {
                      <small class="lb__mia">· {{ t('publico.libro.laTuya') }}</small>
                    }
                  </span>
                  @if (f.mia) {
                    <button
                      type="button"
                      class="lb__borrar"
                      [disabled]="ocupado() !== null"
                      (click)="borrar(f)"
                    >
                      <np-icon name="trash" />
                      {{ t('publico.libro.borrar') }}
                    </button>
                  }
                </footer>
              </li>
            }
          </ul>
        }
      </div>
    </ng-container>
  `,
  styles: `
    .lb {
      max-inline-size: 42rem;
      margin-inline: auto;
      padding: 1.25rem 1rem 3rem;
      color: var(--np-marca-text, inherit);
    }
    .lb__volver {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: inherit;
      opacity: 0.75;
      text-decoration: none;
    }
    .lb__cabecera h1 {
      margin: 0.75rem 0 0.25rem;
      font-family: var(--np-marca-titulos, inherit);
      font-size: clamp(1.75rem, 7vw, 2.5rem);
    }
    .lb__cabecera p {
      margin: 0 0 1rem;
      opacity: 0.85;
    }
    .lb__form {
      display: grid;
      gap: 0.5rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
    }
    .lb__form label {
      display: grid;
      gap: 0.25rem;
      font-size: 0.9rem;
    }
    .lb__form textarea {
      padding: 0.6rem 0.75rem;
      border: 1px solid currentColor;
      border-radius: 0.6rem;
      background: transparent;
      color: inherit;
      font: inherit;
      resize: vertical;
    }
    .lb__form small {
      opacity: 0.75;
    }
    .lb__contador {
      justify-self: end;
      font-variant-numeric: tabular-nums;
    }
    .lb__enviar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-block-size: 2.75rem;
      border: 2px solid currentColor;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .lb__enviar:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lb__aviso,
    .lb__fallo,
    .lb__vacio {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0 0;
    }
    .lb__fallo {
      font-weight: 600;
    }
    .lb__lista {
      display: grid;
      gap: 0.75rem;
      margin: 1.25rem 0 0;
      padding: 0;
      list-style: none;
    }
    .lb__firma {
      padding: 0.9rem 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
    }
    .lb__firma--mia {
      border-width: 3px;
    }
    .lb__mensaje {
      margin: 0 0 0.6rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .lb__firma footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .lb__autor {
      font-weight: 600;
    }
    .lb__autor small {
      font-weight: 400;
      opacity: 0.75;
    }
    .lb__mia {
      font-style: italic;
    }
    .lb__borrar {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-block-size: 2.5rem;
      padding: 0 0.85rem;
      border: 1px solid currentColor;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .lb__borrar:disabled {
      opacity: 0.6;
    }
  `,
})
export class NpLibroPublica {
  /** La boda, que resuelve la ruta: de aquí sale el tema (D-55). */
  readonly tenant = input<ResultadoTenant | null>(null);
  protected readonly tema = usarTemaDeLaBoda(this.tenant);
  protected readonly cabecera = computed(() => conCabecera(this.tenant()));

  private readonly puerta = inject(PUERTA_LIBRO);

  protected readonly maxMensaje = MAX_MENSAJE;
  protected readonly maxPorInvitado = MAX_POR_INVITADO;

  protected readonly firmas = signal<readonly FirmaPublica[]>([]);
  protected readonly cargando = signal(true);
  protected readonly fallo = signal<FalloLibro | null>(null);
  protected readonly aviso = signal(false);
  protected readonly enviando = signal(false);
  /** La firma que se está borrando: bloquea los botones mientras va. */
  protected readonly ocupado = signal<string | null>(null);

  protected readonly mensaje = signal('');
  protected readonly puedeFirmar = computed(() => this.mensaje().trim().length > 0);

  constructor() {
    void this.cargar();
  }

  protected dia(firma: FirmaPublica): string {
    return firma.cuando ? fechaMedia(new Date(firma.cuando), 'es') : '';
  }

  private aplicar(resultado: ResultadoLibro): boolean {
    if (resultado.ok) {
      this.firmas.set(resultado.firmas);
      this.fallo.set(null);
      return true;
    }
    this.fallo.set(resultado.fallo);
    return false;
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.aplicar(await this.puerta.listar());
    this.cargando.set(false);
  }

  protected async firmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.puedeFirmar() || this.enviando()) return;

    this.enviando.set(true);
    this.aviso.set(false);
    const ok = this.aplicar(await this.puerta.firmar(this.mensaje().trim()));
    this.enviando.set(false);

    if (ok) {
      this.mensaje.set('');
      this.aviso.set(true);
    }
  }

  protected async borrar(firma: FirmaPublica): Promise<void> {
    if (this.ocupado() !== null) return;

    this.ocupado.set(firma.id);
    this.aviso.set(false);
    this.aplicar(await this.puerta.borrar(firma.id));
    this.ocupado.set(null);
  }
}
