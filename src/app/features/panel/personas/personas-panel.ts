import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpInput } from '../../../design-system/components/field/input';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { BodaStore } from '../boda.store';
import { resolver, idVigente } from '../enlaces/enlaces';
import type { EstadoRsvp, Invitado } from '../../../core/invitados/invitados-gateway';
import {
  LADOS,
  MAX_BIO,
  MAX_NOMBRE_PERSONA,
  MAX_PAPEL,
  PAPELES_SUGERIDOS,
  validarPersona,
  type LadoPersona,
  type PersonaDelPanel,
} from './personas';
import { PersonasStore } from './personas.store';

/** 10 MB, lo que admiten las reglas de Storage; la foto se reduce antes de subirla. */
const MAX_BYTES_FOTO = 10 * 1024 * 1024;

/**
 * Las personas importantes de la boda: madrina, padrino, portaanillos…
 *
 * La pareja decide a quién enseña en la web y en qué orden. El teléfono es solo
 * suyo. **La foto exige confirmar que la persona sabe que saldrá en la web**:
 * sin esa casilla marcada no se guarda, y se registra cuándo se marcó.
 */
@Component({
  selector: 'np-panel-personas',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpIcon,
    NpInput,
    NpModal,
    NpStatusChip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="pe">
        <header class="pe__intro">
          <h2>{{ t('panel.personas.titulo') }}</h2>
          <p>{{ t('panel.personas.ayuda') }}</p>
        </header>

        @if (store.fallo(); as f) {
          <np-alert status="declined" [heading]="t('panel.personas.fallo')">
            <p>{{ t('panel.personas.fallos.' + f.tipo) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.personas.cargando')" />
          }
          @default {
            <div class="pe__acciones">
              <button npButton type="button" [disabled]="store.lleno()" (click)="nueva()">
                <np-icon name="plus" />
                {{ t('panel.personas.nueva') }}
              </button>
            </div>

            @if (store.personas().length === 0) {
              <np-empty-state
                icon="crown-simple"
                [title]="t('panel.personas.vacio')"
                [description]="t('panel.personas.vacioDescripcion')"
              />
            }

            <ul class="pe__lista">
              @for (p of store.personas(); track p.id; let primero = $first; let ultimo = $last) {
                <li class="pe__persona">
                  <div class="pe__avatar" aria-hidden="true">
                    @if (p.photoUrl) {
                      <img [src]="p.photoUrl" alt="" loading="lazy" />
                    } @else {
                      {{ inicial(p.name) }}
                    }
                  </div>
                  <div class="pe__datos">
                    <strong>{{ p.name }}</strong>
                    <span>{{ p.role }} · {{ lado(p.side) }}</span>
                    @if (p.bio) {
                      <small>{{ p.bio }}</small>
                    }
                    @if (conInvitados() && p.guestId; as enlazado) {
                      @if (invitadoDe(p); as invitado) {
                        <span class="pe__invitado">
                          <np-icon name="user" />
                          {{ invitado.fullName }}
                          <np-status-chip
                            [status]="colorRsvp(invitado.rsvpStatus)"
                            [label]="t('panel.invitados.rsvp.' + invitado.rsvpStatus)"
                          />
                        </span>
                      } @else if (store.invitadosListos()) {
                        <small>
                          <np-icon name="warning" />
                          {{ t('panel.personas.invitadoPerdido') }}
                        </small>
                      }
                    }
                    @if (p.phone; as telefono) {
                      <small>
                        <a [href]="'tel:' + telefono">{{ telefono }}</a>
                        · {{ t('panel.personas.soloPareja') }}
                      </small>
                    }
                  </div>
                  <np-status-chip
                    [status]="p.visible ? 'confirmed' : 'pending'"
                    [label]="p.visible ? t('panel.personas.visible') : t('panel.personas.oculta')"
                  />
                  <div class="pe__botones">
                    <button
                      npButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      [disabled]="primero"
                      [attr.aria-label]="t('panel.personas.subir', { c: p.name })"
                      (click)="store.mover(p.id, -1)"
                    >
                      <np-icon name="caret-up" />
                    </button>
                    <button
                      npButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      [disabled]="ultimo"
                      [attr.aria-label]="t('panel.personas.bajar', { c: p.name })"
                      (click)="store.mover(p.id, 1)"
                    >
                      <np-icon name="caret-down" />
                    </button>
                    <button npButton size="sm" variant="ghost" type="button" (click)="editar(p)">
                      <np-icon name="pencil-simple" />
                      {{ t('common.edit') }}
                    </button>
                    <button
                      npButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      (click)="borrando.set(p)"
                    >
                      <np-icon name="trash" />
                      {{ t('common.delete') }}
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        }
      </section>

      @if (formAbierto()) {
        <np-modal
          [open]="true"
          [heading]="editando() ? t('panel.personas.editar') : t('panel.personas.nueva')"
          (closed)="formAbierto.set(false)"
        >
          <form class="pe__form" [formGroup]="form" (ngSubmit)="guardar()">
            <label>
              <span>{{ t('panel.personas.campo.nombre') }}</span>
              <input npInput type="text" formControlName="name" [attr.maxlength]="maxNombre" />
            </label>
            <label>
              <span>{{ t('panel.personas.campo.papel') }}</span>
              <input
                npInput
                type="text"
                formControlName="role"
                list="pe-papeles"
                [attr.maxlength]="maxPapel"
              />
              <datalist id="pe-papeles">
                @for (papel of papeles; track papel) {
                  <option [value]="papel"></option>
                }
              </datalist>
            </label>
            <label>
              <span>{{ t('panel.personas.campo.lado') }}</span>
              <select npInput formControlName="side">
                @for (l of lados; track l) {
                  <option [value]="l">{{ lado(l) }}</option>
                }
              </select>
            </label>
            <label>
              <span>{{ t('panel.personas.campo.bio') }}</span>
              <textarea npInput rows="2" formControlName="bio" [attr.maxlength]="maxBio"></textarea>
              <small>{{ t('panel.personas.campo.bioPista') }}</small>
            </label>
            <label>
              <span>{{ t('panel.personas.campo.telefono') }}</span>
              <input npInput type="tel" formControlName="phone" />
              <small>{{ t('panel.personas.campo.telefonoPista') }}</small>
            </label>
            @if (conInvitados() && store.invitadosListos()) {
              <label>
                <span>{{ t('panel.personas.campo.invitado') }}</span>
                <select npInput formControlName="guestId">
                  <option value="">{{ t('panel.personas.campo.sinInvitado') }}</option>
                  @for (i of store.invitados(); track i.id) {
                    <option [value]="i.id">{{ i.fullName }}</option>
                  }
                </select>
                <small>{{ t('panel.personas.campo.invitadoPista') }}</small>
              </label>
            }
            <label class="pe__casilla">
              <input type="checkbox" formControlName="visible" />
              <span>{{ t('panel.personas.campo.visible') }}</span>
            </label>

            <fieldset class="pe__bloque">
              <legend>{{ t('panel.personas.foto.titulo') }}</legend>

              @if (fotoActual(); as url) {
                <img class="pe__foto" [src]="url" alt="" />
              } @else if (fotoNueva(); as fichero) {
                <small>{{ t('panel.personas.foto.elegida', { n: fichero.name }) }}</small>
              } @else {
                <small>{{ t('panel.personas.foto.ninguna') }}</small>
              }

              <div class="pe__botones">
                <label class="pe__subir">
                  <span class="pe__subir-texto">
                    <np-icon name="upload-simple" />
                    {{
                      tieneFoto()
                        ? t('panel.personas.foto.cambiar')
                        : t('panel.personas.foto.subir')
                    }}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    (change)="elegirFoto($event)"
                  />
                </label>
                @if (tieneFoto()) {
                  <button npButton size="sm" variant="ghost" type="button" (click)="quitarFoto()">
                    <np-icon name="trash" />
                    {{ t('panel.personas.foto.quitar') }}
                  </button>
                }
              </div>

              @if (tieneFoto()) {
                <label class="pe__casilla pe__consentimiento">
                  <input type="checkbox" formControlName="consentimiento" />
                  <span>{{ t('panel.personas.foto.consentimiento') }}</span>
                </label>
                <small>{{ t('panel.personas.foto.consentimientoPista') }}</small>
              }
              @if (errorFoto(); as e) {
                <p class="pe__error" role="alert">
                  <np-icon name="warning" />
                  {{ e }}
                </p>
              }
            </fieldset>

            @if (errorForm(); as e) {
              <p class="pe__error" role="alert">
                <np-icon name="warning" />
                {{ e }}
              </p>
            }
          </form>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="formAbierto.set(false)">
              {{ t('common.cancel') }}
            </button>
            <button npButton type="button" [loading]="guardando()" (click)="guardar()">
              <np-icon name="check" />
              {{ t('common.save') }}
            </button>
          </div>
        </np-modal>
      }

      @if (borrando(); as p) {
        <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
          <p>{{ t('panel.personas.borrarConfirmar', { c: p.name }) }}</p>
          @if (p.photoUrl) {
            <p>{{ t('panel.personas.borrarFoto') }}</p>
          }
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="borrando.set(null)">
              {{ t('common.cancel') }}
            </button>
            <button
              npButton
              variant="danger"
              type="button"
              [loading]="guardando()"
              (click)="borrar()"
            >
              <np-icon name="trash" />
              {{ t('common.delete') }}
            </button>
          </div>
        </np-modal>
      }
    </ng-container>
  `,
  styles: `
    .pe,
    .pe__form {
      display: grid;
      gap: var(--np-space-3);
    }
    .pe {
      gap: var(--np-space-5);
      max-inline-size: 48rem;
    }
    .pe__intro h2,
    .pe__intro p {
      margin: 0;
    }
    .pe__intro p,
    .pe__datos small,
    .pe__form small {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pe__acciones,
    .pe__botones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pe__lista {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .pe__persona {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: var(--np-space-2) var(--np-space-3);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .pe__invitado {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      font-size: var(--np-text-sm);
    }
    .pe__persona > np-status-chip,
    .pe__persona .pe__botones {
      grid-column: 2;
    }
    .pe__avatar {
      display: grid;
      place-items: center;
      inline-size: 3.5rem;
      block-size: 3.5rem;
      overflow: hidden;
      border-radius: 50%;
      background: var(--np-surface-border);
      color: var(--np-surface-text);
      font-weight: var(--np-weight-semibold);
      font-size: var(--np-text-lg);
    }
    .pe__avatar img,
    .pe__foto {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
    .pe__datos {
      display: grid;
      gap: var(--np-space-1);
      min-inline-size: 0;
      overflow-wrap: anywhere;
    }
    .pe__form label {
      display: grid;
      gap: var(--np-space-1);
    }
    .pe__form .pe__casilla {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pe__bloque {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .pe__foto {
      inline-size: 8rem;
      block-size: 8rem;
      border-radius: var(--np-radius-md);
    }
    .pe__subir-texto {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      color: var(--np-surface-text);
    }
    .pe__consentimiento {
      padding: var(--np-space-2);
      border: 1px solid var(--np-attention-border, var(--np-surface-border));
      border-radius: var(--np-radius-md);
    }
    .pe__error {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
  `,
})
export class PanelPersonas {
  protected readonly store = inject(PersonasStore);
  private readonly boda = inject(BodaStore);
  private readonly i18n = inject(TranslocoService);

  /** El enlace con invitados existe solo si la boda tiene la lista de invitados. */
  protected readonly conInvitados = computed(
    () => this.boda.boda()?.modulos['guests']?.enabled === true,
  );

  protected readonly lados = LADOS;
  protected readonly papeles = PAPELES_SUGERIDOS;
  protected readonly maxNombre = MAX_NOMBRE_PERSONA;
  protected readonly maxPapel = MAX_PAPEL;
  protected readonly maxBio = MAX_BIO;

  protected readonly formAbierto = signal(false);
  protected readonly editando = signal<PersonaDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);
  protected readonly errorFoto = signal<string | null>(null);
  protected readonly borrando = signal<PersonaDelPanel | null>(null);

  /** Una foto nueva elegida, sin subir: se sube al guardar. */
  protected readonly fotoNueva = signal<File | null>(null);
  /** La pareja ha pulsado «Quitar la foto» sobre la que ya tenía. */
  protected readonly fotoQuitada = signal(false);

  /** La foto que tiene la persona ahora y se va a conservar, si la hay. */
  protected readonly fotoActual = computed(() =>
    this.fotoQuitada() || this.fotoNueva() ? null : (this.editando()?.photoUrl ?? null),
  );
  protected readonly tieneFoto = computed(
    () => this.fotoNueva() !== null || this.fotoActual() !== null,
  );

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    role: new FormControl('', { nonNullable: true }),
    side: new FormControl<LadoPersona>('both', { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    visible: new FormControl(true, { nonNullable: true }),
    guestId: new FormControl('', { nonNullable: true }),
    consentimiento: new FormControl(false, { nonNullable: true }),
  });

  constructor() {
    void this.store.cargar();
    if (this.conInvitados()) void this.store.cargarInvitados();
  }

  /** El invitado enlazado, o `null` si no hay enlace o la ficha ya no está. */
  protected invitadoDe(p: PersonaDelPanel): Invitado | null {
    return resolver(this.store.invitados(), p.guestId);
  }

  /** El mismo color que en la lista de invitados: confirmado, no viene o pendiente. */
  protected colorRsvp(estado: EstadoRsvp): 'confirmed' | 'declined' | 'pending' {
    if (estado === 'confirmed') return 'confirmed';
    return estado === 'declined' ? 'declined' : 'pending';
  }

  protected inicial(nombre: string): string {
    return nombre.trim().charAt(0).toUpperCase();
  }

  /** «De los dos» o «Lado de María», con los nombres reales de la pareja. */
  protected lado(lado: LadoPersona): string {
    const pareja = this.boda.boda()?.pareja;
    if (lado === 'both') return this.i18n.translate('panel.personas.lado.both');
    const nombre = (lado === 'A' ? pareja?.partnerA : pareja?.partnerB) ?? '';
    return nombre.trim() === ''
      ? this.i18n.translate(`panel.personas.lado.${lado}`)
      : this.i18n.translate('panel.personas.lado.de', { nombre });
  }

  protected nueva(): void {
    this.form.reset({ side: 'both', visible: true, guestId: '', consentimiento: false });
    this.abrir(null);
  }

  protected editar(p: PersonaDelPanel): void {
    this.form.reset({
      name: p.name,
      role: p.role,
      side: p.side,
      bio: p.bio,
      phone: p.phone ?? '',
      visible: p.visible,
      // Con la lista leída, un invitado que ya no existe se ve «sin enlace» y
      // al guardar se limpia; sin ella, el enlace se conserva tal cual.
      guestId: this.store.invitadosListos()
        ? idVigente(this.store.invitados(), p.guestId)
        : (p.guestId ?? ''),
      // Una foto que ya está guardada tiene su consentimiento registrado.
      consentimiento: p.photoConsent,
    });
    this.abrir(p);
  }

  private abrir(p: PersonaDelPanel | null): void {
    this.editando.set(p);
    this.fotoNueva.set(null);
    this.fotoQuitada.set(false);
    this.errorForm.set(null);
    this.errorFoto.set(null);
    this.formAbierto.set(true);
  }

  protected elegirFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const fichero = entrada.files?.[0];
    entrada.value = '';
    if (!fichero) return;

    if (!/^image\/(jpeg|png|webp)$/.test(fichero.type)) {
      this.errorFoto.set(this.i18n.translate('panel.personas.foto.error.tipo'));
      return;
    }
    if (fichero.size > MAX_BYTES_FOTO) {
      this.errorFoto.set(this.i18n.translate('panel.personas.foto.error.tamano'));
      return;
    }

    this.errorFoto.set(null);
    // Una foto nueva es un consentimiento nuevo: la pareja lo marca otra vez.
    this.form.controls.consentimiento.setValue(false);
    this.fotoNueva.set(fichero);
  }

  protected quitarFoto(): void {
    this.fotoNueva.set(null);
    this.fotoQuitada.set(true);
    this.form.controls.consentimiento.setValue(false);
    this.errorFoto.set(null);
  }

  protected async guardar(): Promise<void> {
    if (this.guardando()) return;

    const actual = this.editando();
    const v = this.form.getRawValue();
    const nueva = this.fotoNueva();
    const quitada = this.fotoQuitada();

    const validado = validarPersona(
      {
        ...v,
        guestId:
          this.conInvitados() && this.store.invitadosListos() ? v.guestId : (actual?.guestId ?? ''),
      },
      {
        actual:
          actual?.photoPath && actual.photoUrl
            ? { path: actual.photoPath, url: actual.photoUrl }
            : null,
        nueva: nueva !== null,
        quitada,
      },
    );

    if (!validado.ok) {
      this.errorForm.set(this.i18n.translate(`panel.personas.error.${validado.motivo}`));
      return;
    }

    this.errorForm.set(null);
    this.guardando.set(true);
    const resultado = await this.store.guardar({
      id: actual?.id ?? null,
      datos: {
        ...validado.datos,
        photoPath: actual?.photoPath ?? null,
        photoUrl: actual?.photoUrl ?? null,
        photoConsent: actual?.photoConsent ?? false,
      },
      fotoNueva: nueva,
      quitarFoto: quitada && nueva === null,
    });
    this.guardando.set(false);

    if (resultado.ok) this.formAbierto.set(false);
    else if (nueva) this.errorFoto.set(this.i18n.translate('panel.personas.foto.error.subida'));
  }

  protected async borrar(): Promise<void> {
    const p = this.borrando();
    if (!p || this.guardando()) return;

    this.guardando.set(true);
    const resultado = await this.store.borrar(p);
    this.guardando.set(false);
    if (resultado.ok) this.borrando.set(null);
  }
}
