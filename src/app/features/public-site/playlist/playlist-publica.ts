import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_PLAYLIST,
  type CancionPublica,
  type FalloPlaylist,
  type ResultadoPlaylist,
} from '../../../core/playlist/playlist-gateway';
import { MAX_ARTISTA, MAX_PROPUESTAS_POR_INVITADO, MAX_TITULO } from './playlist';

/**
 * La playlist, como la ve el invitado (§8.14).
 *
 * Se abre desde el móvil, en el sofá, el día que la pareja lo cuenta en el
 * grupo: lo que hay que conseguir es que **votar sea un toque** y que proponer
 * sean dos campos y un botón. Nada de cuentas, nada de buscar en Spotify.
 *
 * El corazón lleva siempre su recuento y su texto —«Votar» o «Votada»—: el
 * color y el relleno no van solos (§9.1).
 */
@Component({
  selector: 'np-playlist-publica',
  imports: [FormsModule, RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <div class="pl">
        <a class="pl__volver" routerLink="/">
          <np-icon name="caret-left" />
          {{ t('publico.playlist.volver') }}
        </a>

        <header class="pl__cabecera">
          <h1>{{ t('publico.playlist.titulo') }}</h1>
          <p>{{ t('publico.playlist.ayuda') }}</p>
        </header>

        <form class="pl__form" (submit)="proponer($event)">
          <label>
            {{ t('publico.playlist.titulo_campo') }}
            <input
              name="title"
              autocomplete="off"
              [attr.maxlength]="maxTitulo"
              [ngModel]="titulo()"
              (ngModelChange)="titulo.set($event)"
            />
          </label>
          <label>
            {{ t('publico.playlist.artista_campo') }}
            <input
              name="artist"
              autocomplete="off"
              [attr.maxlength]="maxArtista"
              [ngModel]="artista()"
              (ngModelChange)="artista.set($event)"
            />
          </label>
          <button type="submit" class="pl__enviar" [disabled]="!puedeProponer() || enviando()">
            <np-icon name="music-notes" weight="fill" />
            {{ t('publico.playlist.proponer') }}
          </button>
          <small>{{ t('publico.playlist.tope', { n: maxPropuestas }) }}</small>
        </form>

        @if (aviso(); as a) {
          <p class="pl__aviso" role="status">
            <np-icon name="check-circle" weight="fill" />
            {{ t('publico.playlist.aviso.' + a) }}
          </p>
        }

        @if (fallo(); as cual) {
          <p class="pl__fallo" role="alert">
            <np-icon name="warning" />
            {{ t('publico.playlist.fallo.' + cual.tipo) }}
          </p>
        }

        @if (cargando()) {
          <p class="pl__vacio">{{ t('publico.playlist.cargando') }}</p>
        } @else if (canciones().length === 0 && fallo() === null) {
          <p class="pl__vacio">{{ t('publico.playlist.nada') }}</p>
        } @else {
          <ol class="pl__lista">
            @for (c of canciones(); track c.id) {
              <li class="pl__cancion" [class.pl__cancion--votada]="c.votadaPorMi">
                <span class="pl__puesto" aria-hidden="true">{{ $index + 1 }}</span>
                <span class="pl__que">
                  <strong>{{ c.title }}</strong>
                  @if (c.artist) {
                    <small>{{ c.artist }}</small>
                  }
                  @if (c.mia) {
                    <small class="pl__mia">{{ t('publico.playlist.laPediste') }}</small>
                  }
                </span>
                <button
                  type="button"
                  class="pl__voto"
                  [class.pl__voto--votado]="c.votadaPorMi"
                  [attr.aria-pressed]="c.votadaPorMi"
                  [disabled]="ocupado() !== null"
                  (click)="votar(c)"
                >
                  <np-icon name="heart" [weight]="c.votadaPorMi ? 'fill' : 'regular'" />
                  <span class="pl__voto-n">{{ c.votos }}</span>
                  <span class="pl__voto-txt">
                    {{ c.votadaPorMi ? t('publico.playlist.votada') : t('publico.playlist.votar') }}
                  </span>
                </button>
              </li>
            }
          </ol>
        }
      </div>
    </ng-container>
  `,
  styles: `
    .pl {
      max-inline-size: 42rem;
      margin-inline: auto;
      padding: 1.25rem 1rem 3rem;
      color: var(--np-marca-texto, inherit);
    }
    .pl__volver {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: inherit;
      opacity: 0.75;
      text-decoration: none;
    }
    .pl__cabecera h1 {
      margin: 0.75rem 0 0.25rem;
      font-family: var(--np-marca-titulos, inherit);
      font-size: clamp(1.75rem, 7vw, 2.5rem);
    }
    .pl__cabecera p {
      margin: 0 0 1rem;
      opacity: 0.85;
    }
    .pl__form {
      display: grid;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
    }
    .pl__form label {
      display: grid;
      gap: 0.25rem;
      font-size: 0.9rem;
    }
    .pl__form input {
      min-block-size: 2.75rem;
      padding: 0 0.75rem;
      border: 1px solid currentColor;
      border-radius: 0.6rem;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .pl__enviar {
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
    .pl__enviar:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .pl__form small {
      opacity: 0.75;
    }
    .pl__aviso,
    .pl__fallo,
    .pl__vacio {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0 0;
    }
    .pl__fallo {
      font-weight: 600;
    }
    .pl__lista {
      display: grid;
      gap: 0.5rem;
      margin: 1.25rem 0 0;
      padding: 0;
      list-style: none;
    }
    .pl__cancion {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
    }
    .pl__cancion--votada {
      border-width: 3px;
    }
    .pl__puesto {
      flex: none;
      inline-size: 1.5rem;
      text-align: center;
      opacity: 0.6;
      font-variant-numeric: tabular-nums;
    }
    .pl__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-inline-size: 0;
      overflow-wrap: anywhere;
    }
    .pl__que small {
      opacity: 0.8;
    }
    .pl__mia {
      font-style: italic;
    }
    .pl__voto {
      display: inline-flex;
      flex: none;
      align-items: center;
      gap: 0.35rem;
      min-block-size: 2.75rem;
      padding: 0 0.85rem;
      border: 1px solid currentColor;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .pl__voto--votado {
      border-width: 2px;
      font-weight: 600;
    }
    .pl__voto:disabled {
      opacity: 0.6;
    }
    .pl__voto-n {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class NpPlaylistPublica {
  private readonly puerta = inject(PUERTA_PLAYLIST);

  protected readonly maxTitulo = MAX_TITULO;
  protected readonly maxArtista = MAX_ARTISTA;
  protected readonly maxPropuestas = MAX_PROPUESTAS_POR_INVITADO;

  protected readonly canciones = signal<readonly CancionPublica[]>([]);
  protected readonly cargando = signal(true);
  protected readonly fallo = signal<FalloPlaylist | null>(null);
  protected readonly aviso = signal<'creada' | 'ya-estaba' | null>(null);
  protected readonly enviando = signal(false);
  /** La canción en la que se está votando: bloquea los botones mientras va. */
  protected readonly ocupado = signal<string | null>(null);

  protected readonly titulo = signal('');
  protected readonly artista = signal('');
  protected readonly puedeProponer = computed(() => this.titulo().trim().length > 0);

  constructor() {
    void this.cargar();
  }

  private aplicar(resultado: ResultadoPlaylist): void {
    if (resultado.ok) {
      this.canciones.set(resultado.canciones);
      this.fallo.set(null);
    } else {
      this.fallo.set(resultado.fallo);
    }
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.aplicar(await this.puerta.listar());
    this.cargando.set(false);
  }

  protected async proponer(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.puedeProponer() || this.enviando()) return;

    this.enviando.set(true);
    this.aviso.set(null);
    const resultado = await this.puerta.proponer(this.titulo().trim(), this.artista().trim());
    this.enviando.set(false);

    if (resultado.ok) {
      this.canciones.set(resultado.canciones);
      this.fallo.set(null);
      this.aviso.set(resultado.resultado);
      this.titulo.set('');
      this.artista.set('');
    } else {
      this.fallo.set(resultado.fallo);
    }
  }

  protected async votar(cancion: CancionPublica): Promise<void> {
    if (this.ocupado() !== null) return;

    this.ocupado.set(cancion.id);
    this.aviso.set(null);
    const resultado = await this.puerta.votar(cancion.id);
    this.ocupado.set(null);

    if (resultado.ok) {
      this.aplicar(resultado);
    } else if (resultado.fallo.tipo === 'no-existe') {
      // La pareja la quitó mientras miraba: se recarga para que desaparezca.
      this.fallo.set(resultado.fallo);
      await this.cargar();
    } else {
      this.fallo.set(resultado.fallo);
    }
  }
}
