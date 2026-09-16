import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Type,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { plantillaDe } from '../../public-site/plantillas/catalogo';
import { cargarPlantilla } from '../../public-site/plantillas/cargador';
import { Fuentes } from '../../public-site/plantillas/fuentes';
import type { DatosPortada } from '../../public-site/plantillas/portada';
import { TIPOS_EDITABLES, mover } from '../../public-site/secciones/catalogo-secciones';
import type { Seccion } from '../../public-site/secciones/secciones';
import { BodaStore } from '../boda.store';

/**
 * Editor de la web pública: secciones a un lado, la web de verdad al otro.
 *
 * Es el modelo de edición de REQUISITOS §8.1 y **no es un maquetador**: no se
 * arrastran bloques por un lienzo, se rellenan los campos de secciones ya
 * diseñadas. La sensación de edición visual la da la vista previa, que es la
 * plantilla real con los datos reales, no una aproximación.
 *
 * **Primero móvil.** En un teléfono no caben las dos cosas a la vez, así que se
 * alternan con dos pestañas; a partir de 64rem se ven en paralelo. La pareja va
 * a montar su web desde el sofá con el móvil, no sentada a un escritorio.
 *
 * Se guarda con un botón, no a cada tecla: cada escritura dispara el trigger
 * que republica la web, y hacerlo en cada letra cuesta dinero y llena el log de
 * auditoría de ruido. La vista previa sí es instantánea, porque lee el borrador.
 */
@Component({
  selector: 'np-editor-secciones',
  imports: [NgComponentOutlet, TranslocoDirective, NpAlert, NpButton, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="es">
        <header class="es__intro">
          <div>
            <h2>{{ t('panel.secciones.titulo') }}</h2>
            <p>{{ t('panel.secciones.ayuda') }}</p>
          </div>

          <button
            npButton
            type="button"
            [loading]="guardando()"
            [disabled]="!sucio()"
            (click)="guardar()"
          >
            <np-icon name="check" />
            {{ t('common.save') }}
          </button>
        </header>

        @if (fallo()) {
          <np-alert status="declined" [heading]="t('panel.secciones.fallo')">
            <p>{{ store.error() }}</p>
          </np-alert>
        }
        @if (sucio()) {
          <p class="es__aviso">
            <np-icon name="warning" />
            {{ t('panel.secciones.sinGuardar') }}
          </p>
        }

        <div class="es__pestanas" role="tablist">
          <button
            type="button"
            role="tab"
            class="es__pestana"
            [attr.aria-selected]="vista() === 'editar'"
            [class.es__pestana--activa]="vista() === 'editar'"
            (click)="vista.set('editar')"
          >
            <np-icon name="pencil-simple" />
            {{ t('panel.secciones.pestanaEditar') }}
          </button>
          <button
            type="button"
            role="tab"
            class="es__pestana"
            [attr.aria-selected]="vista() === 'previa'"
            [class.es__pestana--activa]="vista() === 'previa'"
            (click)="vista.set('previa')"
          >
            <np-icon name="eye" />
            {{ t('panel.secciones.pestanaPrevia') }}
          </button>
        </div>

        <!--
          El buscador va con las secciones y no en «Datos de la boda» porque es
          una decisión sobre la web, y porque se entiende mejor justo al lado de
          lo que se está publicando.
        -->
        <label class="es__buscadores">
          <input
            type="checkbox"
            [checked]="store.boda()?.indexable"
            [disabled]="cambiandoIndex()"
            (change)="cambiarIndexable($event)"
          />
          <span>
            <strong>{{ t('panel.secciones.buscadores') }}</strong>
            <small>{{ t('panel.secciones.buscadoresAyuda') }}</small>
          </span>
        </label>

        <div class="es__cuerpo" [attr.data-vista]="vista()">
          <div class="es__lista">
            @for (seccion of secciones(); track seccion.id; let primera = $first, ultima = $last) {
              <article class="es__seccion" [class.es__seccion--apagada]="!seccion.enabled">
                <header class="es__cabecera">
                  <np-icon
                    [name]="icono(seccion)"
                    [weight]="seccion.enabled ? 'fill' : 'regular'"
                  />
                  <span class="es__nombre">{{ nombre(seccion, t) }}</span>

                  @if (seccion.type !== 'portada') {
                    <div class="es__mandos">
                      <button
                        type="button"
                        class="es__mando"
                        [attr.aria-label]="t('panel.secciones.subir')"
                        [disabled]="primera"
                        (click)="subir(seccion.id)"
                      >
                        <np-icon name="caret-up" />
                      </button>
                      <button
                        type="button"
                        class="es__mando"
                        [attr.aria-label]="t('panel.secciones.bajar')"
                        [disabled]="ultima"
                        (click)="bajar(seccion.id)"
                      >
                        <np-icon name="caret-down" />
                      </button>
                      <button
                        npButton
                        size="sm"
                        type="button"
                        [variant]="seccion.enabled ? 'secondary' : 'primary'"
                        (click)="alternar(seccion.id)"
                      >
                        <np-icon [name]="seccion.enabled ? 'eye-slash' : 'eye'" />
                        {{
                          seccion.enabled
                            ? t('panel.secciones.ocultar')
                            : t('panel.secciones.mostrar')
                        }}
                      </button>
                    </div>
                  } @else {
                    <span class="es__fija">{{ t('panel.secciones.siempre') }}</span>
                  }
                </header>

                @for (campo of campos(seccion); track campo.nombre) {
                  <div class="es__campo">
                    <!-- Etiqueta y control asociados por id, no por anidamiento:
                         el control vive dentro de un @if y la asociación
                         implícita se pierde. -->
                    <label [attr.for]="idCampo(seccion, campo.nombre)">
                      {{ t(campo.etiqueta) }}
                    </label>
                    @if (campo.control === 'parrafo') {
                      <textarea
                        rows="4"
                        [id]="idCampo(seccion, campo.nombre)"
                        [attr.maxlength]="campo.maximo"
                        [value]="seccion.fields[campo.nombre] ?? ''"
                        (input)="escribir(seccion.id, campo.nombre, $event)"
                      ></textarea>
                    } @else {
                      <input
                        [id]="idCampo(seccion, campo.nombre)"
                        [type]="campo.control === 'hora' ? 'time' : 'text'"
                        [attr.maxlength]="campo.maximo"
                        [value]="seccion.fields[campo.nombre] ?? ''"
                        (input)="escribir(seccion.id, campo.nombre, $event)"
                      />
                    }
                  </div>
                }
              </article>
            }
          </div>

          <div class="es__previa">
            <div class="es__marco">
              @if (plantilla(); as componente) {
                <ng-container
                  *ngComponentOutlet="componente; inputs: { datos: datosPrevia() }"
                ></ng-container>
              }
            </div>
          </div>
        </div>
      </section>
    </ng-container>
  `,
  styles: `
    .es {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .es__intro {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    .es__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .es__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .es__aviso {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-status-pending-text);
    }
    .es__pestanas {
      display: flex;
      gap: var(--np-space-1);
      padding: var(--np-space-1);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-raised);
    }
    .es__pestana {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      border: 0;
      border-radius: var(--np-radius-md);
      background: transparent;
      color: var(--np-surface-text-muted);
      font: inherit;
      cursor: pointer;
    }
    .es__pestana--activa {
      background: var(--np-surface-surface);
      color: var(--np-surface-text);
      font-weight: var(--np-weight-medium);
    }
    .es__buscadores {
      display: flex;
      align-items: flex-start;
      gap: var(--np-space-3);
      padding: var(--np-space-3) var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
      cursor: pointer;
    }
    .es__buscadores input {
      inline-size: 1.15rem;
      block-size: 1.15rem;
      margin-block-start: 0.15rem;
      flex: none;
    }
    .es__buscadores span {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
    }
    .es__buscadores small {
      color: var(--np-surface-text-muted);
    }
    .es__cuerpo {
      display: grid;
      gap: var(--np-space-4);
    }
    .es__cuerpo[data-vista='editar'] .es__previa,
    .es__cuerpo[data-vista='previa'] .es__lista {
      display: none;
    }
    .es__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .es__seccion {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .es__seccion--apagada {
      border-style: dashed;
      background: var(--np-surface-raised);
    }
    .es__cabecera {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .es__nombre {
      flex: 1;
      min-inline-size: 8rem;
      font-weight: var(--np-weight-medium);
    }
    .es__fija {
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    .es__mandos {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
    }
    .es__mando {
      display: grid;
      place-items: center;
      inline-size: var(--np-tap-target);
      block-size: var(--np-tap-target);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: inherit;
      cursor: pointer;
    }
    .es__mando:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .es__campo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .es__campo label {
      color: var(--np-surface-text-muted);
    }
    .es__campo input,
    .es__campo textarea {
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-canvas);
      color: inherit;
      font: inherit;
    }
    .es__campo textarea {
      resize: vertical;
    }
    .es__marco {
      overflow: hidden auto;
      max-block-size: 70dvh;
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-canvas);
    }
    @media (min-width: 64rem) {
      .es__pestanas {
        display: none;
      }
      .es__cuerpo {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        align-items: start;
      }
      .es__cuerpo[data-vista='editar'] .es__previa,
      .es__cuerpo[data-vista='previa'] .es__lista {
        display: block;
      }
      .es__previa {
        position: sticky;
        inset-block-start: var(--np-space-4);
      }
      .es__marco {
        max-block-size: calc(100dvh - 8rem);
      }
    }
  `,
})
export class EditorSecciones {
  protected readonly store = inject(BodaStore);
  private readonly fuentes = inject(Fuentes);

  protected readonly vista = signal<'editar' | 'previa'>('editar');
  protected readonly guardando = signal(false);
  protected readonly cambiandoIndex = signal(false);
  protected readonly fallo = signal(false);

  /** Copia de trabajo. Lo guardado vive en el store; esto es el borrador. */
  protected readonly secciones = signal<readonly Seccion[]>([]);

  protected readonly plantilla = signal<Type<unknown> | null>(null);

  protected readonly sucio = computed(
    () => JSON.stringify(this.secciones()) !== JSON.stringify(this.store.boda()?.secciones ?? []),
  );

  /** Lo que ve la vista previa: la boda real con las secciones del borrador. */
  protected readonly datosPrevia = computed<DatosPortada>(() => {
    const boda = this.store.boda();
    return {
      nombres: { partnerA: '', partnerB: '' },
      weddingDate: boda?.weddingDate ?? null,
      weddingTime: boda?.weddingTime ?? null,
      timezone: boda?.timezone ?? 'Europe/Madrid',
      locale: 'es',
      heroImageUrl: boda?.heroImageUrl ?? null,
      secciones: this.secciones(),
    };
  });

  constructor() {
    // El borrador arranca de lo guardado, y se rehace si la boda se recarga.
    effect(() => {
      const boda = this.store.boda();
      if (boda) this.secciones.set(boda.secciones);
    });

    effect(() => {
      const boda = this.store.boda();
      if (!boda) return;

      const plantilla = plantillaDe(boda.templateId);
      this.fuentes.cargar(plantilla);
      void cargarPlantilla(plantilla.id).then((componente) => this.plantilla.set(componente));
    });
  }

  protected icono(seccion: Seccion) {
    return TIPOS_EDITABLES[seccion.type].icono;
  }

  protected campos(seccion: Seccion) {
    return TIPOS_EDITABLES[seccion.type].campos;
  }

  /** El título que la pareja escribió, o el nombre del tipo si aún no hay. */
  protected nombre(seccion: Seccion, t: (clave: string) => string): string {
    return seccion.fields['titulo']?.trim() || t('panel.secciones.tipo.' + seccion.type);
  }

  protected idCampo(seccion: Seccion, campo: string): string {
    return `np-sec-${seccion.id}-${campo}`;
  }

  protected escribir(id: string, campo: string, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.secciones.update((lista) =>
      lista.map((seccion) =>
        seccion.id === id ? { ...seccion, fields: { ...seccion.fields, [campo]: valor } } : seccion,
      ),
    );
  }

  protected alternar(id: string): void {
    this.secciones.update((lista) =>
      lista.map((seccion) =>
        seccion.id === id ? { ...seccion, enabled: !seccion.enabled } : seccion,
      ),
    );
  }

  protected subir(id: string): void {
    this.reordenar(id, -1);
  }

  protected bajar(id: string): void {
    this.reordenar(id, 1);
  }

  private reordenar(id: string, direccion: -1 | 1): void {
    this.secciones.update((lista) => {
      const movidas = mover(lista, id, direccion);
      // `mover` solo conoce id, tipo y orden: se vuelven a casar con su sección.
      const porId = new Map(lista.map((seccion) => [seccion.id, seccion]));
      return movidas.map((m) => ({ ...porId.get(m.id)!, order: m.order }));
    });
  }

  protected async cambiarIndexable(evento: Event): Promise<void> {
    const quiere = (evento.target as HTMLInputElement).checked;
    this.cambiandoIndex.set(true);
    const ok = await this.store.guardarIndexable(quiere);
    this.cambiandoIndex.set(false);
    this.fallo.set(!ok);
  }

  protected async guardar(): Promise<void> {
    this.guardando.set(true);
    const ok = await this.store.guardarSecciones(this.secciones());
    this.guardando.set(false);
    this.fallo.set(!ok);
  }
}
