import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import {
  PUERTA_ALTA,
  type AltaCreada,
  type LugarParaAlta,
  type PlanContratado,
  type TipoDeCeremonia,
} from '../../../core/alta/alta-gateway';
import { normalizarSlug, MENSAJES_SLUG, validarSlug } from '../../../core/tenant/slug';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import { LUGAR_VACIO, LugarDeAlta, type LugarEditable } from './lugar-de-alta';

/**
 * Alta de una boda desde el panel de superadmin.
 *
 * Sustituye al script de semilla: es la pantalla por la que se dará de alta una
 * boda de verdad. Valida en cliente **lo mismo** que valida `provisionWedding`
 * —reusando las funciones puras de `core/tenant/slug`— para que el error
 * habitual se vea mientras se escribe y no después de una llamada de red. La
 * validación del servidor sigue siendo la que manda: esta solo es cortesía.
 */
@Component({
  selector: 'np-alta-boda',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    LugarDeAlta,
    NpAlert,
    NpButton,
    NpField,
    NpInput,
    NpIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (creada(); as alta) {
        <div class="np-alta__hecho">
          <np-alert status="confirmed" [heading]="t('superadmin.alta.creada', { slug: alta.slug })">
            <p>{{ t('superadmin.alta.creadaDescripcion') }}</p>
          </np-alert>

          @for (aviso of alta.avisos; track aviso) {
            <np-alert status="attention" [heading]="t('superadmin.alta.avisoTitulo')">
              <p>{{ aviso }}</p>
            </np-alert>
          }

          <!--
            Los enlaces de acceso solo se enseñan aquí, una vez. Dan entrada al
            panel de la boda: no se registran en ningún sitio ni se vuelven a
            mostrar. Mientras no haya proveedor de correo (D-05), los reparte el
            superadmin a mano.
          -->
          <div class="np-alta__enlaces">
            <h3>{{ t('superadmin.alta.enlaces') }}</h3>
            <p class="np-alta__aviso">{{ t('superadmin.alta.enlacesAviso') }}</p>
            @for (cuenta of alta.cuentas; track cuenta.uid) {
              <div class="np-alta__enlace">
                <div class="np-alta__email">{{ cuenta.email }}</div>
                @if (cuenta.enlaceAcceso; as enlace) {
                  <code>{{ enlace }}</code>
                } @else {
                  <span class="np-alta__sin-enlace">{{ t('superadmin.alta.sinEnlace') }}</span>
                }
              </div>
            }
          </div>

          <button npButton variant="secondary" type="button" (click)="otraMas()">
            <np-icon name="plus" />
            {{ t('superadmin.alta.otra') }}
          </button>
        </div>
      } @else {
        <form class="np-alta" [formGroup]="formulario" (ngSubmit)="enviar()">
          @if (fallo(); as mensaje) {
            <np-alert status="declined" [heading]="t('superadmin.alta.falloTitulo')">
              <p>{{ mensaje }}</p>
              @if (alternativas().length > 0) {
                <p>{{ t('superadmin.alta.alternativas') }}</p>
                <div class="np-alta__alternativas">
                  @for (opcion of alternativas(); track opcion) {
                    <button npButton size="sm" type="button" (click)="usarSlug(opcion)">
                      {{ opcion }}
                    </button>
                  }
                </div>
              }
            </np-alert>
          }

          <div class="np-alta__pareja">
            <np-field [label]="t('superadmin.alta.nombreA')" [required]="true">
              <input npInput formControlName="partnerA" autocomplete="off" />
            </np-field>
            <np-field [label]="t('superadmin.alta.nombreB')" [required]="true">
              <input npInput formControlName="partnerB" autocomplete="off" />
            </np-field>
          </div>

          <np-field
            [label]="t('superadmin.alta.direccion')"
            [required]="true"
            [hint]="pistaSlug()"
            [error]="errorSlug()"
          >
            <input npInput formControlName="slug" autocomplete="off" spellcheck="false" />
          </np-field>

          <np-field [label]="t('superadmin.alta.fecha')" [required]="true" [error]="errorFecha()">
            <input npInput type="date" formControlName="weddingDate" />
          </np-field>

          <fieldset class="np-alta__tipo">
            <legend>{{ t('superadmin.alta.ceremonia') }}</legend>
            @for (tipo of tipos; track tipo) {
              <label class="np-alta__opcion">
                <input
                  type="radio"
                  formControlName="ceremonyType"
                  [value]="tipo"
                  [attr.value]="tipo"
                />
                {{ t('superadmin.alta.ceremoniaTipo.' + tipo) }}
              </label>
            }
          </fieldset>

          <p class="np-alta__aviso">{{ t('superadmin.alta.lugaresAyuda') }}</p>
          @if (puedeSerMismoSitio()) {
            <label class="np-alta__opcion">
              <input type="checkbox" formControlName="mismoSitio" />
              {{ t('superadmin.alta.mismoSitio') }}
            </label>
          }
          <np-lugar-de-alta
            clave="ceremonia"
            [etiqueta]="
              t(unSoloSitio() ? 'superadmin.alta.lugarUnico' : 'superadmin.alta.lugarCeremonia')
            "
            [(value)]="lugarCeremonia"
          />
          @if (!unSoloSitio()) {
            <np-lugar-de-alta
              clave="celebracion"
              [etiqueta]="t('superadmin.alta.lugarCelebracion')"
              [(value)]="lugarCelebracion"
            />
          }

          <np-field
            [label]="t('superadmin.alta.emailA')"
            [required]="true"
            [hint]="t('superadmin.alta.emailAPista')"
          >
            <input npInput type="email" formControlName="emailA" autocomplete="off" />
          </np-field>

          <np-field [label]="t('superadmin.alta.emailB')" [hint]="t('superadmin.alta.emailBPista')">
            <input npInput type="email" formControlName="emailB" autocomplete="off" />
          </np-field>

          <np-field [label]="t('superadmin.alta.plan')" [required]="true">
            <select npInput formControlName="plan">
              <option value="basic">{{ t('superadmin.alta.planBasico') }}</option>
              <option value="extended">{{ t('superadmin.alta.planExtendido') }}</option>
            </select>
          </np-field>

          <button npButton variant="primary" type="submit" [loading]="enviando()">
            <np-icon name="plus" />
            {{ t('superadmin.alta.crear') }}
          </button>
        </form>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .np-alta,
    .np-alta__hecho {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .np-alta__pareja {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--np-space-3);
    }
    .np-alta__alternativas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      margin-block-start: var(--np-space-2);
    }
    .np-alta__enlaces {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .np-alta__enlaces h3 {
      margin: 0;
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-semibold);
    }
    .np-alta__aviso {
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .np-alta__enlace {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      padding-block: var(--np-space-2);
      border-block-start: 1px solid var(--np-surface-border);
    }
    .np-alta__email {
      font-weight: var(--np-weight-medium);
      font-size: var(--np-text-sm);
    }
    .np-alta__enlace code {
      font-family: var(--np-font-mono);
      font-size: var(--np-text-xs);
      word-break: break-all;
      color: var(--np-surface-text-muted);
    }
    .np-alta__sin-enlace {
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .np-alta__tipo {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-4);
      margin: 0;
      padding: 0;
      border: 0;
    }
    .np-alta__tipo legend {
      padding: 0;
      margin-block-end: var(--np-space-2);
      font-weight: var(--np-weight-medium);
    }
    .np-alta__opcion {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
    }
    @media (max-width: 40rem) {
      .np-alta__pareja {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AltaBoda {
  private readonly puerta = inject(PUERTA_ALTA);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(TranslocoService);

  /** Para que el listado se recargue sin que esta pantalla sepa quién escucha. */
  readonly altaHecha = output<AltaCreada>();

  protected readonly formulario = this.fb.nonNullable.group({
    partnerA: ['', Validators.required],
    partnerB: ['', Validators.required],
    slug: ['', Validators.required],
    weddingDate: ['', Validators.required],
    emailA: ['', [Validators.required, Validators.email]],
    emailB: [''],
    plan: ['basic' as PlanContratado, Validators.required],
    ceremonyType: ['civil' as TipoDeCeremonia, Validators.required],
    /** Solo con ceremonia civil: se casan donde celebran. */
    mismoSitio: [false],
  });

  protected readonly tipos: readonly TipoDeCeremonia[] = ['civil', 'religious'];
  protected readonly lugarCeremonia = signal<LugarEditable>(LUGAR_VACIO);
  protected readonly lugarCelebracion = signal<LugarEditable>(LUGAR_VACIO);

  protected readonly enviando = signal(false);
  protected readonly creada = signal<AltaCreada | null>(null);
  protected readonly fallo = signal<string | null>(null);
  protected readonly alternativas = signal<readonly string[]>([]);

  private readonly slugEscrito = signal('');
  private readonly fechaEscrita = signal('');
  private readonly tipoElegido = signal<TipoDeCeremonia>('civil');
  private readonly mismoSitioMarcado = signal(false);

  /** Una ceremonia religiosa casi nunca es en el salón del banquete: solo se ofrece en civil. */
  protected readonly puedeSerMismoSitio = computed(() => this.tipoElegido() === 'civil');
  protected readonly unSoloSitio = computed(
    () => this.puedeSerMismoSitio() && this.mismoSitioMarcado(),
  );

  constructor() {
    // Se normaliza mientras se escribe: la pareja ve la dirección real antes de
    // reservarla, no después. `María y Gabriel` → `maria-y-gabriel`.
    this.formulario.controls.slug.valueChanges.subscribe((valor) =>
      this.slugEscrito.set(valor ?? ''),
    );
    this.formulario.controls.weddingDate.valueChanges.subscribe((valor) =>
      this.fechaEscrita.set(valor ?? ''),
    );
    this.formulario.controls.ceremonyType.valueChanges.subscribe((valor) =>
      this.tipoElegido.set(valor ?? 'civil'),
    );
    this.formulario.controls.mismoSitio.valueChanges.subscribe((valor) =>
      this.mismoSitioMarcado.set(valor ?? false),
    );
  }

  protected readonly slugNormalizado = computed(() => normalizarSlug(this.slugEscrito()));

  protected readonly pistaSlug = computed(() => {
    const slug = this.slugNormalizado();
    return slug ? `${slug}.nupcialis.com` : this.i18n.translate('superadmin.alta.direccionPista');
  });

  protected readonly errorSlug = computed(() => {
    if (this.slugEscrito() === '') return null;
    const resultado = validarSlug(this.slugNormalizado());
    return resultado.ok ? null : MENSAJES_SLUG[resultado.motivo];
  });

  /**
   * La fecha en el pasado es el error de verdad: teclear el año que se acaba de
   * ir. El servidor también lo rechaza, pero verlo aquí ahorra el viaje.
   */
  protected readonly errorFecha = computed(() => {
    const escrita = this.fechaEscrita();
    if (!escrita) return null;
    const fecha = new Date(escrita);
    if (Number.isNaN(fecha.getTime())) return this.i18n.translate('superadmin.alta.fechaIlegible');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha < hoy ? this.i18n.translate('superadmin.alta.fechaPasada') : null;
  });

  protected usarSlug(slug: string): void {
    this.formulario.controls.slug.setValue(slug);
    this.fallo.set(null);
    this.alternativas.set([]);
  }

  protected otraMas(): void {
    this.creada.set(null);
    this.formulario.reset({ plan: 'basic', ceremonyType: 'civil', mismoSitio: false });
    this.lugarCeremonia.set(LUGAR_VACIO);
    this.lugarCelebracion.set(LUGAR_VACIO);
  }

  protected async enviar(): Promise<void> {
    if (this.formulario.invalid || this.errorSlug() || this.errorFecha()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.fallo.set(null);
    this.alternativas.set([]);

    const valores = this.formulario.getRawValue();
    const emails = [valores.emailA, valores.emailB].map((e) => e.trim()).filter((e) => e !== '');
    const ceremonia = lugarParaEnviar(this.lugarCeremonia());
    // Un solo sitio: se siembra igual en las dos fichas; la pareja podrá separarlas luego.
    const celebracion = this.unSoloSitio() ? ceremonia : lugarParaEnviar(this.lugarCelebracion());

    const resultado = await this.puerta.crearBoda({
      slug: this.slugNormalizado(),
      partnerA: valores.partnerA,
      partnerB: valores.partnerB,
      weddingDate: new Date(valores.weddingDate).toISOString(),
      emails,
      plan: valores.plan,
      ceremonyType: valores.ceremonyType,
      ceremonyPlace: ceremonia,
      receptionPlace: celebracion,
    });

    this.enviando.set(false);

    if (resultado.ok) {
      this.creada.set(resultado.alta);
      this.altaHecha.emit(resultado.alta);
      return;
    }

    switch (resultado.fallo.tipo) {
      case 'slug-ocupado':
        this.fallo.set(this.i18n.translate('superadmin.alta.slugOcupado'));
        this.alternativas.set(resultado.fallo.alternativas);
        break;
      case 'datos-invalidos':
        this.fallo.set(
          this.i18n.translate('superadmin.alta.camposInvalidos', {
            campos: resultado.fallo.campos.join(', '),
          }),
        );
        break;
      case 'sin-permiso':
        this.fallo.set(this.i18n.translate('superadmin.alta.sinPermiso'));
        break;
      case 'sin-verificar':
        this.fallo.set(this.i18n.translate('superadmin.alta.sinVerificar'));
        break;
      default:
        this.fallo.set(resultado.fallo.mensaje);
    }
  }
}

/** Un lugar sin nada escrito ni pin es «aún no se sabe», no un sitio vacío. */
function lugarParaEnviar(lugar: LugarEditable): LugarParaAlta | null {
  const address = lugar.address.trim();
  // Con dirección y sin nombre, el servidor rechazaría el alta: se usa el primer
  // trozo de la dirección, que casi siempre es el nombre del sitio.
  const name = lugar.name.trim() || (address.split(',')[0] ?? '').trim();
  if (name === '' && address === '' && lugar.lat === null) return null;
  return { name, address, lat: lugar.lat, lng: lugar.lng };
}
