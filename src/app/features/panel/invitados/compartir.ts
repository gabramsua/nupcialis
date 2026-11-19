import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import type { Invitado } from '../../../core/invitados/invitados-gateway';
import { fechaLarga } from '../../../shared/fecha';
import { BodaStore } from '../boda.store';
import { PUERTA_ENLACES, type FalloEnlace } from '../../../core/invitados/enlaces-gateway';
import {
  MARCADORES,
  MENSAJE_POR_DEFECTO,
  enlaceDeInvitado,
  enlaceWhatsApp,
  mensajeDeInvitacion,
  puedeEntrar,
} from './invitacion';

/**
 * Mandarle la invitación a una persona.
 *
 * Tiene pantalla propia —modal, pero componente aparte— porque es lo único de
 * la lista de invitados que tiene estado suyo: el mensaje que se está
 * retocando, la plantilla que se está editando y qué se acaba de copiar. En la
 * lista estorbaba, y sus estilos se comían el presupuesto del componente.
 *
 * **El botón de WhatsApp es el primero y el grande.** La pareja manda
 * doscientas invitaciones una a una desde el móvil; copiar y pegar es el plan
 * B, para quien use Telegram o el correo.
 */
@Component({
  selector: 'np-compartir-invitado',
  imports: [TranslocoDirective, NpAlert, NpButton, NpModal, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <np-modal
        [open]="true"
        [heading]="t('panel.invitar.titulo', { nombre: invitado().fullName })"
        (closed)="cerrado.emit()"
      >
        <div class="cmp">
          <!--
            El aviso primero: mandarle el enlace a alguien que no puede abrirlo
            es peor que no mandárselo, porque se entera él y te lo dice por
            teléfono.
          -->
          @if (!puedeAbrirlo()) {
            <np-alert status="attention" [heading]="t('panel.invitar.sinTelefono.titulo')">
              <p>{{ t('panel.invitar.sinTelefono.ayuda') }}</p>
            </np-alert>
          }

          <!--
            El enlace lo da el servidor (D-34): hasta que llega no hay nada que
            mandar, y decirlo es mejor que enseñar un mensaje con un hueco donde
            va la URL.
          -->
          @if (pidiendoEnlace()) {
            <p class="cmp__esperando">{{ t('panel.invitar.preparando') }}</p>
          } @else if (falloEnlace(); as f) {
            <np-alert status="declined" [heading]="t('panel.invitar.sinEnlace.titulo')">
              <p>{{ t('panel.invitar.sinEnlace.' + f.tipo) }}</p>
            </np-alert>
          }

          <label>
            <span>{{ t('panel.invitar.mensaje') }}</span>
            <textarea rows="7" [value]="mensaje()" (input)="editarMensaje($event)"></textarea>
            <small>{{ t('panel.invitar.mensajePista') }}</small>
          </label>

          <div class="cmp__acciones">
            <a
              npButton
              [href]="enlaceDeWhatsApp()"
              [class.cmp__sinEnlace]="pidiendoEnlace()"
              target="_blank"
              rel="noopener"
            >
              <np-icon name="whatsapp-logo" />
              {{ t('panel.invitar.porWhatsapp') }}
            </a>
            <button npButton variant="secondary" type="button" (click)="copiar(mensaje())">
              <np-icon name="copy" />
              {{
                copiado() === 'mensaje'
                  ? t('panel.invitar.copiado')
                  : t('panel.invitar.copiarMensaje')
              }}
            </button>
            <button npButton variant="ghost" type="button" (click)="copiar(enlace())">
              <np-icon name="link-simple" />
              {{
                copiado() === 'enlace'
                  ? t('panel.invitar.copiado')
                  : t('panel.invitar.copiarEnlace')
              }}
            </button>
          </div>

          <!--
            La plantilla se edita aquí y no en otra pantalla: se cambia la
            primera vez que compartes, que es cuando te das cuenta de que no
            dice lo que quieres.
          -->
          <details class="cmp__plantilla">
            <summary>{{ t('panel.invitar.plantilla.abrir') }}</summary>
            <p>{{ t('panel.invitar.plantilla.ayuda') }}</p>
            <label>
              <span class="cmp__oculto">{{ t('panel.invitar.plantilla.abrir') }}</span>
              <textarea rows="7" [value]="plantilla()" (input)="editarPlantilla($event)"></textarea>
            </label>
            <p class="cmp__marcadores">
              @for (marcador of marcadores; track marcador) {
                <code>{{ marcador }}</code>
              }
            </p>
            <button
              npButton
              size="sm"
              type="button"
              [loading]="guardandoPlantilla()"
              (click)="guardarPlantilla()"
            >
              <np-icon name="check" />
              {{ t('panel.invitar.plantilla.guardar') }}
            </button>
          </details>

          <!--
            Cambiar el enlace es lo único que invalida uno que se haya ido donde
            no debía. Va escondido porque rompe el que ya mandaste, y eso no se
            pulsa por curiosidad.
          -->
          @if (modo() !== 'open') {
            <details class="cmp__plantilla">
              <summary>{{ t('panel.invitar.rotar.abrir') }}</summary>
              <p>{{ t('panel.invitar.rotar.ayuda') }}</p>
              <button
                npButton
                size="sm"
                variant="ghost"
                type="button"
                [loading]="pidiendoEnlace()"
                (click)="rotarEnlace()"
              >
                <np-icon name="arrows-clockwise" />
                {{ t('panel.invitar.rotar.hacerlo') }}
              </button>
            </details>
          }
        </div>

        <div np-modal-actions>
          <button npButton variant="ghost" type="button" (click)="cerrado.emit()">
            {{ t('common.close') }}
          </button>
        </div>
      </np-modal>
    </ng-container>
  `,
  styles: `
    .cmp {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .cmp label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .cmp label > span {
      color: var(--np-surface-text-muted);
    }
    .cmp textarea {
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-canvas);
      color: inherit;
      font: inherit;
    }
    .cmp small {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-xs);
    }
    /* En el móvil, uno debajo de otro y a lo ancho: son los tres botones que
       se pulsan doscientas veces. */
    .cmp__acciones {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
    }
    @media (min-width: 40rem) {
      .cmp__acciones {
        flex-direction: row;
        flex-wrap: wrap;
      }
    }
    .cmp__plantilla {
      padding-block-start: var(--np-space-3);
      border-block-start: 1px solid var(--np-surface-border);
    }
    .cmp__plantilla summary {
      font-size: var(--np-text-sm);
      cursor: pointer;
    }
    .cmp__plantilla > p,
    .cmp__plantilla > label {
      margin-block: var(--np-space-2);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .cmp__marcadores {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1);
    }
    .cmp__marcadores code {
      padding: 0 var(--np-space-1);
      border-radius: var(--np-radius-sm);
      background: var(--np-surface-canvas);
      font-size: var(--np-text-xs);
    }
    .cmp__esperando {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .cmp__sinEnlace {
      opacity: 0.5;
      pointer-events: none;
    }
    .cmp__oculto {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class NpCompartirInvitado {
  private readonly boda = inject(BodaStore);
  private readonly enlaces = inject(PUERTA_ENLACES);
  /**
   * La URL de la boda, que es donde la pareja está mirando su panel.
   *
   * De `location` y no de la configuración: el panel se sirve desde
   * `<slug>.nupcialis.com`, así que el origen **es** el enlace de la boda, y
   * así no hay una tabla de entornos que se quede desfasada.
   */
  private readonly origen = inject(DOCUMENT).location.origin;

  readonly invitado = input.required<Invitado>();
  readonly cerrado = output<void>();

  /**
   * El token del enlace de esta persona (D-34).
   *
   * Se pide al abrir el modal y no al pintar la lista: son trescientos
   * invitados y solo se comparte con uno a la vez. El servidor lo crea la
   * primera vez y lo reutiliza después, así que el enlace que ya se mandó por
   * WhatsApp sigue valiendo.
   */
  private readonly token = signal<string | null>(null);
  protected readonly pidiendoEnlace = signal(true);
  protected readonly falloEnlace = signal<FalloEnlace | null>(null);

  /**
   * Ya con las llaves puestas. Escribirlas en la plantilla no se puede: una
   * llave suelta al lado de una interpolación es un error de sintaxis, y la
   * entidad HTML se decodifica antes de que Angular lea la interpolación.
   */
  protected readonly marcadores = MARCADORES.map((m) => `{${m}}`);

  protected readonly copiado = signal<'mensaje' | 'enlace' | null>(null);
  protected readonly guardandoPlantilla = signal(false);

  /** La plantilla en edición. Sale de la boda y vuelve a ella al guardarse. */
  protected readonly plantilla = signal(this.boda.boda()?.inviteMessage ?? MENSAJE_POR_DEFECTO);
  /**
   * El mensaje ya montado para este invitado, retocable antes de mandarlo.
   *
   * `linkedSignal` y no `signal`: se monta solo la primera vez que se lee —el
   * input obligatorio todavía no existe cuando se construye la clase— y se
   * rehace al cambiar la plantilla, que es como se edita viendo el resultado.
   * Lo que teclee la pareja encima manda hasta el siguiente cambio.
   */
  protected readonly mensaje = linkedSignal(() => this.montar(this.plantilla()));

  protected readonly modo = computed(() => this.boda.boda()?.guestAccessMode ?? 'open');

  protected readonly enlace = computed(() =>
    enlaceDeInvitado(this.origen, this.token(), this.modo()),
  );

  protected readonly enlaceDeWhatsApp = computed(() =>
    enlaceWhatsApp(this.mensaje(), this.invitado().phone),
  );

  protected readonly puedeAbrirlo = computed(() => puedeEntrar(this.invitado(), this.modo()));

  /** De quién se ha pedido ya el enlace, para no pedirlo dos veces. */
  private pedidoPara: string | null = null;

  constructor() {
    // En un efecto y no en el constructor: `invitado` es un input obligatorio y
    // ahí todavía no tiene valor —leerlo lanza—. El efecto corre cuando ya está.
    effect(() => {
      const id = this.invitado().id;
      if (this.pedidoPara === id) return;

      this.pedidoPara = id;
      void this.pedirEnlace();
    });
  }

  private async pedirEnlace(rotar = false): Promise<void> {
    // En una boda abierta no hay token que pedir: el enlace es el de la boda.
    if (this.modo() === 'open') {
      this.pidiendoEnlace.set(false);
      return;
    }

    this.pidiendoEnlace.set(true);
    this.falloEnlace.set(null);

    const resultado = await this.enlaces.obtener(this.invitado().id, rotar);

    this.pidiendoEnlace.set(false);
    if (resultado.ok) {
      this.token.set(resultado.token);
      this.copiado.set(null);
    } else {
      this.falloEnlace.set(resultado.fallo);
    }
  }

  /**
   * Cambia el enlace de esta persona.
   *
   * Es la única forma de invalidar uno que se haya ido donde no debía —un grupo
   * de WhatsApp que no era—. El anterior deja de funcionar al instante, así que
   * hay que volver a mandárselo.
   */
  protected async rotarEnlace(): Promise<void> {
    await this.pedirEnlace(true);
  }

  protected editarMensaje(evento: Event): void {
    this.mensaje.set((evento.target as HTMLTextAreaElement).value);
  }

  protected editarPlantilla(evento: Event): void {
    // El mensaje se rehace solo: cuelga de la plantilla (ver `mensaje`).
    this.plantilla.set((evento.target as HTMLTextAreaElement).value);
  }

  protected async guardarPlantilla(): Promise<void> {
    this.guardandoPlantilla.set(true);
    await this.boda.guardarMensajeInvitacion(this.plantilla());
    this.guardandoPlantilla.set(false);
  }

  protected async copiar(texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      this.copiado.set(texto === this.enlace() ? 'enlace' : 'mensaje');
    } catch {
      // Sin permiso de portapapeles no hay nada que decir: el texto está a la
      // vista y se puede seleccionar a mano. Un error aquí asusta más que ayuda.
      this.copiado.set(null);
    }
  }

  private montar(plantilla: string): string {
    const boda = this.boda.boda();
    const pareja = boda?.pareja;
    const invitado = this.invitado();

    return mensajeDeInvitacion(plantilla, {
      // El mote si lo tiene: en un WhatsApp, «Hola Majo» se lee mejor que
      // «Hola María José Pérez».
      nombre: invitado.nickname || invitado.fullName,
      novios: pareja ? [pareja.partnerA, pareja.partnerB].filter(Boolean).join(' y ') : '',
      fecha: boda?.weddingDate ? fechaLarga(boda.weddingDate, 'es') : '',
      enlace: this.enlace(),
    });
  }
}
