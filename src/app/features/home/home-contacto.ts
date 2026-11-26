import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { PUERTA_SOLICITUDES, type FalloSolicitud } from '../../core/home/home-gateway';
import { NpIcon } from '../../design-system/icons/icon';
import type { ContactoHome } from './home';
import { NpHomeCabecera } from './home-cabecera';

type Plan = 'basic' | 'extended' | 'undecided';

/** El correo de un vistazo: lo justo para no mandar «ana@» al servidor. */
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * El formulario de contacto de la HOME: es lo que convierte una visita en una
 * solicitud. Nombres y correo siempre; teléfono, fecha, plan y mensaje los
 * enciende o apaga el superadmin.
 *
 * - Lleva un campo trampa que una persona no ve (`web`): si llega relleno es un
 *   bot y se finge el éxito sin enviar nada.
 * - Pide aceptar el tratamiento de los datos (RGPD); el texto lo edita el
 *   superadmin, pero la casilla no se puede apagar.
 * - Sin puerto (la vista previa del editor) enseña el formulario y, al enviar,
 *   un aviso: nunca finge que ha enviado algo.
 */
@Component({
  selector: 'np-home-contacto',
  imports: [NpIcon, NpHomeCabecera],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hf" id="contacto">
      <np-home-cabecera [titulo]="contacto().title" [intro]="contacto().intro" />

      @if (enviada()) {
        <div class="hf__caja hf__exito" role="status">
          <np-icon name="check-circle" weight="fill" />
          <h3 class="hf__exito-titulo">{{ contacto().successTitle }}</h3>
          <p class="hf__exito-texto">{{ contacto().successText }}</p>
        </div>
      } @else {
        <form class="hf__caja" novalidate (submit)="enviar($event)">
          <label class="hf__campo">
            <span>Vuestros nombres</span>
            <input
              name="names"
              type="text"
              autocomplete="name"
              maxlength="120"
              placeholder="Ana y Leo"
              [value]="nombres()"
              [attr.aria-invalid]="errores().nombres ? 'true' : null"
              (input)="nombres.set(valor($event))"
            />
            @if (errores().nombres) {
              <small class="hf__error">Decidnos cómo os llamáis.</small>
            }
          </label>

          <label class="hf__campo">
            <span>Correo electrónico</span>
            <input
              name="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              maxlength="254"
              [value]="correo()"
              [attr.aria-invalid]="errores().correo ? 'true' : null"
              (input)="correo.set(valor($event))"
            />
            @if (errores().correo) {
              <small class="hf__error">Ese correo no parece válido.</small>
            }
          </label>

          @if (contacto().askPhone) {
            <label class="hf__campo">
              <span>Teléfono <em>(opcional)</em></span>
              <input
                name="phone"
                type="tel"
                autocomplete="tel"
                inputmode="tel"
                maxlength="30"
                [value]="telefono()"
                [attr.aria-invalid]="errores().telefono ? 'true' : null"
                (input)="telefono.set(valor($event))"
              />
              @if (errores().telefono) {
                <small class="hf__error">Solo cifras, espacios y el prefijo.</small>
              }
            </label>
          }

          @if (contacto().askDate) {
            <label class="hf__campo">
              <span>Fecha de la boda <em>(opcional)</em></span>
              <input
                name="weddingDate"
                type="text"
                maxlength="60"
                placeholder="Junio de 2027"
                [value]="fecha()"
                (input)="fecha.set(valor($event))"
              />
            </label>
          }

          @if (contacto().askPlan) {
            <label class="hf__campo">
              <span>¿Qué plan os interesa?</span>
              <select name="plan" (change)="plan.set(plantilla($event))">
                <option value="undecided" [selected]="plan() === 'undecided'">
                  Aún no lo sabemos
                </option>
                <option value="basic" [selected]="plan() === 'basic'">Básico</option>
                <option value="extended" [selected]="plan() === 'extended'">Extendido</option>
              </select>
            </label>
          }

          @if (contacto().askMessage) {
            <label class="hf__campo">
              <span>¿Algo que queráis contarnos? <em>(opcional)</em></span>
              <textarea
                name="message"
                rows="4"
                maxlength="1200"
                [value]="mensaje()"
                (input)="mensaje.set(valor($event))"
              ></textarea>
            </label>
          }

          <!-- Campo trampa: una persona no lo ve ni lo alcanza con el teclado. -->
          <div class="hf__trampa" aria-hidden="true">
            <label>
              No rellenéis este campo
              <input
                name="web"
                type="text"
                tabindex="-1"
                autocomplete="off"
                [value]="trampa()"
                (input)="trampa.set(valor($event))"
              />
            </label>
          </div>

          <label class="hf__acepto">
            <input
              name="consent"
              type="checkbox"
              [checked]="acepta()"
              [attr.aria-invalid]="errores().acepta ? 'true' : null"
              (change)="acepta.set(marcada($event))"
            />
            <span>{{ contacto().privacy }}</span>
          </label>
          @if (errores().acepta) {
            <small class="hf__error">Necesitamos que lo aceptéis para poder escribiros.</small>
          }

          @if (aviso(); as texto) {
            <p class="hf__aviso" role="alert">{{ texto }}</p>
          }

          <button class="hf__enviar" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Enviando…' : contacto().submitLabel }}
            <np-icon name="arrow-right" />
          </button>
        </form>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .hf {
      max-inline-size: 40rem;
      margin-inline: auto;
      padding: clamp(3.5rem, 9cqi, 6.5rem) 1.25rem;
    }
    .hf__caja {
      display: grid;
      gap: 1.1rem;
      padding: clamp(1.4rem, 4cqi, 2.2rem);
      border: var(--h-borde);
      border-radius: var(--h-radio);
      background: var(--h-surface);
      box-shadow: var(--h-sombra);
    }
    .hf__campo {
      display: grid;
      gap: 0.4rem;
      font-weight: 600;
    }
    .hf__campo em {
      color: var(--h-muted);
      font-style: normal;
      font-weight: 400;
    }
    .hf__campo input,
    .hf__campo select,
    .hf__campo textarea {
      inline-size: 100%;
      box-sizing: border-box;
      padding: 0.75rem 0.9rem;
      border: 1.5px solid color-mix(in srgb, var(--h-text) 25%, transparent);
      border-radius: min(calc(var(--h-radio-boton) * 0.5), 0.9rem);
      background: var(--h-bg);
      color: var(--h-text);
      font: inherit;
      font-weight: 400;
    }
    .hf__campo input:focus-visible,
    .hf__campo select:focus-visible,
    .hf__campo textarea:focus-visible,
    .hf__acepto input:focus-visible {
      outline: 3px solid var(--h-accent);
      outline-offset: 2px;
    }
    .hf__campo [aria-invalid='true'] {
      border-color: #b3261e;
    }
    .hf__error {
      color: #b3261e;
      font-weight: 600;
    }
    .hf__acepto {
      display: flex;
      gap: 0.7rem;
      align-items: flex-start;
      color: var(--h-muted);
      font-size: 0.9rem;
    }
    .hf__acepto input {
      flex: none;
      inline-size: 1.15rem;
      block-size: 1.15rem;
      margin-block-start: 0.15rem;
      accent-color: var(--h-accent);
    }
    .hf__aviso {
      margin: 0;
      padding: 0.8rem 1rem;
      border-radius: min(calc(var(--h-radio-boton) * 0.5), 0.9rem);
      background: color-mix(in srgb, #b3261e 10%, var(--h-surface));
      color: #7d1a14;
      font-weight: 600;
    }
    .hf__enviar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 0.95rem 1.7rem;
      border: var(--h-borde-boton, 1.5px solid transparent);
      border-radius: var(--h-radio-boton, 999px);
      background: var(--h-accent);
      color: var(--h-on-accent);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .hf__enviar:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .hf__enviar:focus-visible {
      outline: 3px solid var(--h-accent);
      outline-offset: 3px;
    }
    .hf__exito {
      justify-items: center;
      text-align: center;
    }
    .hf__exito np-icon {
      color: var(--h-accent);
      font-size: 2.6rem;
    }
    .hf__exito-titulo {
      margin: 0;
      font-family: var(--h-font-title);
      font-size: 1.8rem;
    }
    .hf__exito-texto {
      margin: 0;
      color: var(--h-muted);
    }
    .hf__trampa {
      position: absolute;
      inset-inline-start: -10000px;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
    }
  `,
})
export class NpHomeContacto {
  readonly contacto = input.required<ContactoHome>();
  /** El correo de la HOME, para el aviso si el envío falla. */
  readonly correoDeContacto = input('');

  private readonly puerta = inject(PUERTA_SOLICITUDES, { optional: true });

  protected readonly nombres = signal('');
  protected readonly correo = signal('');
  protected readonly telefono = signal('');
  protected readonly fecha = signal('');
  protected readonly plan = signal<Plan>('undecided');
  protected readonly mensaje = signal('');
  protected readonly trampa = signal('');
  protected readonly acepta = signal(false);

  protected readonly intentado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly enviada = signal(false);
  protected readonly fallo = signal<FalloSolicitud | 'sin-puerto' | null>(null);

  protected readonly errores = computed(() => {
    if (!this.intentado()) {
      return { nombres: false, correo: false, telefono: false, acepta: false };
    }
    const tel = this.telefono().trim();
    return {
      nombres: this.nombres().trim().length < 2,
      correo: !CORREO.test(this.correo().trim()),
      telefono: this.contacto().askPhone && tel !== '' && !/^[0-9+()\-.\s]{6,30}$/.test(tel),
      acepta: !this.acepta(),
    };
  });

  protected readonly aviso = computed(() => {
    const f = this.fallo();
    if (f === null) return null;
    const escribir = this.correoDeContacto() ? ` O escribidnos a ${this.correoDeContacto()}.` : '';
    if (f === 'sin-puerto') return 'El formulario no está conectado en esta vista previa.';
    if (f.tipo === 'limite')
      return `Habéis enviado varias solicitudes seguidas. Probad dentro de un rato.${escribir}`;
    if (f.tipo === 'invalido') return 'Revisad los campos marcados y volved a probar.';
    return `No hemos podido enviarla. Probad otra vez.${escribir}`;
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected marcada(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected plantilla(evento: Event): Plan {
    return (evento.target as HTMLSelectElement).value as Plan;
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.enviando()) return;
    this.intentado.set(true);
    this.fallo.set(null);

    const e = this.errores();
    if (e.nombres || e.correo || e.telefono || e.acepta) return;

    // Un bot rellena el campo trampa. Se le da el éxito y no se envía nada.
    if (this.trampa() !== '') {
      this.enviada.set(true);
      return;
    }

    if (!this.puerta) {
      this.fallo.set('sin-puerto');
      return;
    }

    const c = this.contacto();
    this.enviando.set(true);
    const r = await this.puerta.enviar({
      names: this.nombres().trim(),
      email: this.correo().trim(),
      phone: c.askPhone ? this.telefono().trim() : '',
      weddingDate: c.askDate ? this.fecha().trim() : '',
      plan: c.askPlan ? this.plan() : 'undecided',
      message: c.askMessage ? this.mensaje().trim() : '',
      consent: true,
    });
    this.enviando.set(false);

    if (r.ok) this.enviada.set(true);
    else this.fallo.set(r.fallo);
  }
}
