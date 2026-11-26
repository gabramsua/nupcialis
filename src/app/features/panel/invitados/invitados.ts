import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import { dosRestringidos } from '../../../core/invitados/grupos-gateway';
import {
  PUERTA_INVITADOS,
  apuntadosHacePoco,
  filtrarInvitados,
  deLaFamilia,
  porGrupo,
  ordenarInvitados,
  ordenarPorNombre,
  CAMPOS_DE_ORDEN,
  type CampoOrden,
  type Sentido,
  porVista,
  resumirInvitados,
  type DatosInvitado,
  type Edad,
  type FalloInvitado,
  type Invitado,
  type Lado,
  type Vista,
} from '../../../core/invitados/invitados-gateway';
import { SessionStore } from '../../../core/auth/session.store';
import { PUERTA_MESAS } from '../../../core/mesas/mesas-gateway';
import { nombreDeMesaPorId } from '../mesas/exportar-mesas';
import { BodaStore } from '../boda.store';
import { NpRespuestaDeInvitado } from '../rsvp/respuesta-de-invitado';
import { NpRespuestaEnLote } from './respuesta-en-lote';
import { NpFiltroGrupos } from './filtro-grupos';
import { hojas, nombreDelFichero, type RespuestasDelFormulario } from './exportacion';
import { descargarXlsx } from './exportar-xlsx';
import { PUERTA_RESPUESTAS } from '../../../core/rsvp/respuestas-gateway';
import { NpGrupoChip } from './grupo-chip';
import { NpListaInvitados, ladoDeInvitado } from './lista-invitados';
import { GruposStore } from './grupos.store';
import { NpInput } from '../../../design-system/components/field/input';
import { telefonoVisible } from '../../../shared/telefono';

type Carga = 'cargando' | 'lista' | 'error';

/**
 * La lista de invitados de la boda.
 *
 * Todo pasa por funciones invocables: `guests` está cerrada a lectura directa
 * (regla 2), así que esta pantalla no toca Firestore ni de lejos.
 *
 * **Primero móvil, y aquí importa más que en ningún sitio.** Una pareja repasa
 * su lista de invitados en el sofá, en el coche y en casa de los suegros. Por
 * eso cada invitado es una tarjeta y no una fila de tabla: una tabla de ocho
 * columnas en 360 px es un carrusel horizontal, y lo que se necesita de un
 * vistazo —quién es, si ha contestado, si ha entrado— cabe de sobra en una
 * tarjeta.
 *
 * El alta de uno en uno vive aquí; la importación en bloque tiene pantalla
 * propia (`importar.ts`) porque son tres pasos con su propio estado, y
 * meterlos en un modal sobre esta lista no cabe en 360 px.
 */
@Component({
  selector: 'np-invitados',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpIcon,
    NpGrupoChip,
    NpListaInvitados,
    NpRespuestaDeInvitado,
    NpRespuestaEnLote,
    NpFiltroGrupos,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="inv">
        <header class="inv__intro">
          <div>
            <h2>{{ t('panel.invitados.titulo') }}</h2>
            <p>{{ t('panel.invitados.ayuda') }}</p>
          </div>
          <div class="inv__altas">
            <a npButton variant="ghost" routerLink="/panel/guests/grupos">
              <np-icon name="users" />
              {{ t('panel.invitados.grupos') }}
            </a>
            <a npButton variant="ghost" routerLink="/panel/guests/accesos">
              <np-icon name="eye" />
              {{ t('panel.invitados.accesos') }}
            </a>
            <a npButton variant="ghost" routerLink="/panel/guests/importar">
              <np-icon name="upload-simple" />
              {{ t('panel.invitados.importar') }}
            </a>
            <!--
              Exportar no lleva a otra pantalla: monta el fichero aquí mismo con
              la lista que ya está cargada y lo descarga. La librería se carga
              al pulsar, no al abrir el panel.
            -->
            <button
              npButton
              variant="ghost"
              type="button"
              [loading]="exportando()"
              [disabled]="todos().length === 0"
              (click)="exportar()"
            >
              <np-icon name="download-simple" />
              {{ t('panel.invitados.exportar') }}
            </button>
            <button npButton type="button" (click)="nuevo()">
              <np-icon name="user-plus" />
              {{ t('panel.invitados.anadir') }}
            </button>
          </div>
        </header>

        @if (carga() === 'error') {
          <np-alert status="declined" [heading]="t('panel.invitados.errorCargar')">
            <p>{{ claveDeFallo() ? t(claveDeFallo()!) : mensajeError() }}</p>
            <button npButton size="sm" type="button" (click)="recargar()">
              <np-icon name="spinner-gap" />
              {{ t('common.retry') }}
            </button>
          </np-alert>
        }

        @if (todos().length > 0) {
          <!--
            El resumen va arriba y con el número grande: es lo que la pareja
            viene a mirar. Cada cifra lleva su etiqueta, nunca solo color.
          -->
          <!--
            El aviso de que alguien ha apuntado a alguien (F1.5c). Antes esto
            solo se veía mirando la lista con atención: un acompañante nuevo no
            se distingue de los doscientos que ya estaban.
          -->
          @if (novedades().length > 0) {
            <np-alert status="attention" [heading]="t('panel.invitados.novedades.titulo')">
              <p>
                {{ t('panel.invitados.novedades.quienes', { nombres: nombresDeNovedades() }) }}
              </p>
              <button npButton size="sm" type="button" (click)="verSolo('apuntados')">
                <np-icon name="user-plus" />
                {{ t('panel.invitados.novedades.verlos') }}
              </button>
            </np-alert>
          }

          <dl class="inv__resumen">
            <!--
              Los números **son los filtros**. La pareja mira «pendientes: 84» y
              lo siguiente que quiere es ver esos 84; con el número como texto
              muerto, tenía que buscarlos a mano.
            -->
            @for (cual of vistas(); track cual.vista) {
              <div>
                <button
                  type="button"
                  class="inv__cifra"
                  [class.inv__cifra--puesta]="vista() === cual.vista"
                  [attr.aria-pressed]="vista() === cual.vista"
                  (click)="verSolo(cual.vista)"
                >
                  <dt>{{ t('panel.invitados.' + cual.clave) }}</dt>
                  <dd>{{ cuantos(cual.vista) }}</dd>
                </button>
              </div>
            }
          </dl>

          <!--
            Los grupos, como filtro y a lo ancho. Se cruzan con la cifra de
            arriba: «pendientes» + «Primos» es justo lo que se mira antes de
            ponerse a llamar por teléfono a una rama de la familia.
          -->
          @if (familiaDe(); as titularId) {
            <np-alert status="attention" [heading]="t('panel.invitados.familia.titulo')">
              <p>{{ t('panel.invitados.familia.de', { nombre: nombreDe(titularId) }) }}</p>
              <button npButton size="sm" type="button" (click)="verFamilia(null)">
                <np-icon name="arrow-left" />
                {{ t('panel.invitados.familia.verTodos') }}
              </button>
            </np-alert>
          }

          @if (gruposVisibles().length > 0 && !familiaDe()) {
            <np-filtro-grupos
              [grupos]="gruposParaFiltrar()"
              [elegido]="grupoElegido()"
              (elige)="verGrupo($event)"
            />
          }

          <label class="inv__buscador" [hidden]="familiaDe() !== null">
            <np-icon name="magnifying-glass" />
            <input
              type="search"
              [placeholder]="t('panel.invitados.buscar')"
              [value]="busqueda()"
              (input)="buscar($event)"
            />
          </label>

          <!--
            «Viene / no viene» para varios a la vez, solo cuando se está mirando
            una familia o un grupo: sobre una lista suelta de X invitados no
            tiene sentido y es fácil marcar a quien no tocaba.
          -->
          @if (visibles().length > 0 && (familiaDe() !== null || grupoElegido() !== null)) {
            <np-respuesta-en-lote [ids]="idsVisibles()" (hecho)="recargar()" />
          }
        }

        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.invitados.cargando')" />
          }
          @default {
            @if (todos().length === 0) {
              <np-empty-state
                icon="users"
                [title]="t('panel.invitados.ninguno')"
                [description]="t('panel.invitados.ningunoDescripcion')"
              />
            } @else if (visibles().length === 0) {
              <np-empty-state
                icon="magnifying-glass"
                [title]="t('panel.invitados.sinResultados')"
              />
            } @else {
              @if (!familiaDe()) {
                <div class="inv__orden">
                  <label>
                    <span>{{ t('panel.invitados.orden.etiqueta') }}</span>
                    <select npInput [value]="orden().campo" (change)="ordenarPor($event)">
                      @for (campo of camposDeOrden; track campo) {
                        <option [value]="campo" [selected]="orden().campo === campo">
                          {{ t('panel.invitados.orden.campo.' + campo) }}
                        </option>
                      }
                    </select>
                  </label>
                  <button
                    npButton
                    size="sm"
                    variant="ghost"
                    type="button"
                    [attr.aria-label]="
                      t('panel.invitados.orden.cambiarSentido', {
                        sentido: t('panel.invitados.orden.' + orden().sentido),
                      })
                    "
                    (click)="cambiarSentido()"
                  >
                    <np-icon [name]="orden().sentido === 'asc' ? 'caret-up' : 'caret-down'" />
                    {{ t('panel.invitados.orden.' + orden().sentido) }}
                  </button>
                  <span class="inv__cuenta" aria-live="polite">
                    {{
                      t('panel.invitados.orden.cuenta', {
                        n: visibles().length,
                        total: todos().length,
                      })
                    }}
                  </span>
                </div>
              }
              <np-lista-invitados
                [invitados]="visibles()"
                [grupos]="gruposVisibles()"
                [nombres]="porId()"
                [traen]="acompanantesPorTitular()"
                [pareja]="pareja()"
                (familia)="verFamilia($event)"
                (acompanante)="nuevo($event)"
                (responder)="respondiendoPor.set($event)"
                (editar)="editar($event)"
                (borrar)="pedirBorrado($event)"
              />
            }
          }
        }
      </section>

      @if (editando()) {
        <np-modal
          [open]="true"
          [heading]="
            enEdicion()
              ? t('panel.invitados.editar')
              : titularElegido()
                ? t('panel.invitados.anadirAcompanante')
                : t('panel.invitados.anadir')
          "
          (closed)="cerrar()"
        >
          <form [formGroup]="formulario" class="inv__form" (ngSubmit)="guardar()">
            <label>
              <span>{{ t('panel.invitados.campo.nombre') }}</span>
              <input npInput formControlName="fullName" autocomplete="off" />
            </label>
            <label>
              <span>{{ t('panel.invitados.campo.mote') }}</span>
              <input npInput formControlName="nickname" autocomplete="off" />
              <small>{{ t('panel.invitados.campo.motePista') }}</small>
            </label>
            <label>
              <span>{{ t('panel.invitados.campo.telefono') }}</span>
              <input npInput formControlName="phone" inputmode="tel" autocomplete="off" />
              <small>{{ t('panel.invitados.campo.telefonoPista') }}</small>
            </label>
            <!--
              Con quién viene (F1.5d). Quien ya trae gente no puede ser
              acompañante de otro —se encadenaría—, así que ni se ofrece.
            -->
            @if (enEdicion() && !enEdicionTraeGente()) {
              <label>
                <span>{{ t('panel.invitados.campo.vieneCon') }}</span>
                <select npInput [value]="titularElegido()" (change)="elegirTitular($event)">
                  <option value="">{{ t('panel.invitados.campo.vieneSolo') }}</option>
                  @for (candidato of candidatosATitular(); track candidato.id) {
                    <option [value]="candidato.id" [selected]="candidato.id === titularElegido()">
                      {{ candidato.nickname || candidato.fullName }}
                    </option>
                  }
                </select>
                <small>{{ t('panel.invitados.campo.vieneConPista') }}</small>
              </label>
            }
            <fieldset>
              <legend>{{ t('panel.invitados.campo.lado') }}</legend>
              <div class="inv__opciones">
                @for (lado of lados; track lado) {
                  <label class="inv__opcion">
                    <input type="radio" formControlName="side" [value]="lado" />
                    <span>{{ ladoDe(lado, t) }}</span>
                  </label>
                }
              </div>
            </fieldset>

            <fieldset>
              <legend>{{ t('panel.invitados.campo.edad') }}</legend>
              <div class="inv__opciones">
                @for (edad of edades; track edad) {
                  <label class="inv__opcion">
                    <input type="radio" formControlName="ageGroup" [value]="edad" />
                    <span>{{ t('panel.invitados.edad.' + edad) }}</span>
                  </label>
                }
              </div>
            </fieldset>

            @if (titularElegido()) {
              <small>{{ t('panel.invitados.campo.gruposDelTitular') }}</small>
            } @else {
              <fieldset>
                <legend>{{ t('panel.invitados.campo.grupos') }}</legend>
                @if (gruposVisibles().length === 0) {
                  <small>
                    {{ t('panel.invitados.campo.sinGrupos') }}
                    <a routerLink="/panel/guests/grupos" (click)="cerrar()">{{
                      t('panel.invitados.campo.crearGrupos')
                    }}</a>
                  </small>
                } @else {
                  <div class="inv__opciones inv__opciones--grupos">
                    @for (grupo of gruposVisibles(); track grupo.id) {
                      <label class="inv__opcion">
                        <input
                          type="checkbox"
                          [checked]="seleccionados().includes(grupo.id)"
                          (change)="alternarGrupo(grupo.id)"
                        />
                        <np-grupo-chip
                          [grupo]="grupo"
                          [etiquetaRestringido]="t('panel.grupos.restringido')"
                        />
                      </label>
                    }
                  </div>
                  <!-- Se avisa antes de guardar. El servidor lo rechazaría igual,
                     pero enterarse por el error, después de rellenarlo todo,
                     es peor. -->
                  @if (avisoRestringidos()) {
                    <np-alert status="attention" [heading]="t('panel.invitados.dosRestringidos')">
                      <p>{{ t('panel.invitados.dosRestringidosAyuda') }}</p>
                    </np-alert>
                  }
                }
              </fieldset>
            }

            <label>
              <span>{{ t('panel.invitados.campo.notas') }}</span>
              <textarea npInput formControlName="notes" rows="2"></textarea>
              <small>{{ t('panel.invitados.campo.notasPista') }}</small>
            </label>

            @if (fallo(); as f) {
              <np-alert status="declined" [heading]="t('panel.invitados.noGuardado')">
                @switch (f.tipo) {
                  @case ('duplicado') {
                    <p>{{ t('panel.invitados.duplicado.' + f.motivo) }}</p>
                    <button npButton size="sm" type="button" (click)="guardar(true)">
                      {{ t('panel.invitados.crearIgualmente') }}
                    </button>
                  }
                  @case ('vinculo-invalido') {
                    <p>{{ t('panel.invitados.vinculo.' + f.motivo) }}</p>
                  }
                  @case ('datos-invalidos') {
                    <ul>
                      @for (campo of f.campos; track campo.campo) {
                        <li>
                          {{ t('panel.invitados.invalido.' + campo.campo + '.' + campo.motivo) }}
                        </li>
                      }
                    </ul>
                  }
                  @default {
                    <p>{{ claveDeFallo() ? t(claveDeFallo()!) : mensajeError() }}</p>
                  }
                }
              </np-alert>
            }
          </form>

          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="cerrar()">
              {{ t('common.cancel') }}
            </button>
            <button
              npButton
              type="button"
              [loading]="guardando()"
              [disabled]="formulario.invalid || avisoRestringidos()"
              (click)="guardar()"
            >
              <np-icon name="check" />
              {{ t('common.save') }}
            </button>
          </div>
        </np-modal>
      }

      @if (respondiendoPor(); as quien) {
        <np-respuesta-de-invitado
          [guestId]="quien.id"
          [nombre]="quien.nickname || quien.fullName"
          [esAcompanante]="quien.isCompanion"
          (guardado)="respuestaGuardada()"
          (cerrado)="respondiendoPor.set(null)"
        />
      }

      @if (borrando(); as quien) {
        <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
          <p>{{ t('panel.invitados.confirmarBorrado', { nombre: quien.fullName }) }}</p>
          @if (fallo(); as f) {
            @if (f.tipo === 'con-acompanantes') {
              <np-alert status="declined" [heading]="t('panel.invitados.noBorrado')">
                <p>{{ t('panel.invitados.traeAcompanantes', { n: f.cuantos }) }}</p>
              </np-alert>
            }
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
    .inv {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .inv__intro {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    .inv__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .inv__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    /* Móvil: dos por fila. Cabe en 360 px sin apretar. */
    /* En móvil los dos botones ocupan la línea entera; en cuanto hay sitio,
       se ponen juntos a la derecha del título. */
    .inv__altas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .inv__resumen {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
      gap: var(--np-space-2);
      margin: 0;
    }
    .inv__resumen div {
      display: flex;
    }
    /* La cifra es un botón: filtra la lista. Se ve que lo es por el cursor y
       por el borde, y cuál está puesta, por el relleno. */
    .inv__cifra {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .inv__cifra--puesta {
      border-color: var(--np-surface-text);
      background: var(--np-surface-canvas);
      box-shadow: inset 0 0 0 1px var(--np-surface-text);
    }
    .inv__resumen dt {
      font-size: var(--np-text-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--np-surface-text-muted);
    }
    .inv__resumen dd {
      margin: 0;
      font-size: var(--np-text-2xl);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .inv__orden {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--np-space-2) var(--np-space-3);
    }
    .inv__orden label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .inv__cuenta {
      margin-inline-start: auto;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .inv__buscador {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      padding-inline: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: var(--np-surface-text-muted);
    }
    .inv__buscador input {
      flex: 1;
      min-block-size: var(--np-tap-target);
      border: 0;
      background: transparent;
      color: var(--np-surface-text);
      font: inherit;
    }
    .inv__buscador input:focus {
      outline: none;
    }
    .inv__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .inv__form label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .inv__form label > span {
      color: var(--np-surface-text-muted);
    }
    .inv__form small {
      color: var(--np-surface-text-muted);
    }
    .inv__oculto {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .inv__form fieldset {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      border: 0;
    }
    .inv__form legend {
      margin-block-end: var(--np-space-2);
      padding: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .inv__opciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .inv__form .inv__opcion {
      flex-direction: row;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-1) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      cursor: pointer;
    }
    .inv__form .inv__opcion:has(input:checked) {
      border-color: var(--np-surface-text);
      box-shadow: inset 0 0 0 1px var(--np-surface-text);
    }
    .inv__form .inv__opcion input {
      min-block-size: auto;
      margin: 0;
      padding: 0;
      accent-color: var(--np-surface-text);
    }
  `,
})
export class Invitados {
  private readonly puerta = inject(PUERTA_INVITADOS);
  private readonly respuestas = inject(PUERTA_RESPUESTAS);
  // Opcionales: solo hacen falta al exportar, y la pantalla tiene que abrirse
  // igual donde no estén (pruebas, vista previa de desarrollo).
  private readonly puertaMesas = inject(PUERTA_MESAS, { optional: true });
  private readonly sesion = inject(SessionStore, { optional: true });
  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly boda = inject(BodaStore);
  private readonly i18n = inject(TranslocoService);
  protected readonly grupos = inject(GruposStore);

  protected readonly lados: readonly Lado[] = ['both', 'A', 'B'];
  protected readonly edades: readonly Edad[] = ['adult', 'child', 'baby'];

  protected readonly exportando = signal(false);

  /**
   * Descarga la lista en una hoja de cálculo.
   *
   * Dos hojas: la lista entera de la pareja y una **para el catering**, solo
   * con quien viene y sin teléfonos ni notas. Ese fichero sale por correo a una
   * empresa de fuera, y la lista de teléfonos de trescientas personas no tiene
   * por qué ir dentro.
   */
  protected async exportar(): Promise<void> {
    if (this.exportando()) return;

    this.exportando.set(true);
    this.fallo.set(null);

    const hecho = await descargarXlsx(
      hojas({
        invitados: this.todos(),
        grupos: this.grupos.grupos(),
        formulario: await this.loEscrito(),
        mesaDe: await this.nombresDeMesa(),
        etiquetas: {
          estado: {
            confirmed: this.i18n.translate('panel.invitados.rsvp.confirmed'),
            declined: this.i18n.translate('panel.invitados.rsvp.declined'),
            pending: this.i18n.translate('panel.invitados.rsvp.pending'),
          },
          edad: {
            adult: this.i18n.translate('panel.invitados.edad.adult'),
            child: this.i18n.translate('panel.invitados.edad.child'),
            baby: this.i18n.translate('panel.invitados.edad.baby'),
          },
          // El lado, con los nombres de la pareja: «De María» se entiende en
          // una hoja que va a leer la finca; «A» no.
          lado: {
            A: this.ladoDe('A', (clave, params) => this.i18n.translate(clave, params)),
            B: this.ladoDe('B', (clave, params) => this.i18n.translate(clave, params)),
            both: this.ladoDe('both', (clave, params) => this.i18n.translate(clave, params)),
          },
          si: this.i18n.translate('common.yes'),
          no: this.i18n.translate('common.no'),
        },
      }),
      nombreDelFichero(this.boda.boda()?.slug ?? '', new Date()),
    );

    this.exportando.set(false);
    if (!hecho) this.fallo.set({ tipo: 'error', mensaje: 'export' });
  }

  /**
   * El nombre de cada mesa, para la columna «Mesa».
   *
   * Se pide al pulsar exportar, como las respuestas, y si falla la columna sale
   * vacía: un fichero sin mesas es mejor que ninguno, y mejor que uno con
   * identificadores de Firestore.
   */
  private async nombresDeMesa(): Promise<(id: string | null) => string> {
    const weddingId = this.sesion?.weddingId();
    if (!weddingId || !this.puertaMesas) return () => '';

    const resultado = await this.puertaMesas.listar(weddingId);
    return resultado.ok ? nombreDeMesaPorId(resultado.mesas) : () => '';
  }

  /**
   * Lo que han escrito en el formulario, para la tercera hoja (F1.8g).
   *
   * Se pide **al pulsar exportar** y no al abrir la pantalla: la lista no lo
   * necesita para pintarse y son trescientas respuestas de viaje.
   *
   * Si falla, la exportación sale igual con sus dos hojas de siempre. Quedarse
   * sin fichero porque no se ha podido leer un extra sería peor que el extra.
   */
  private async loEscrito(): Promise<RespuestasDelFormulario | undefined> {
    const resultado = await this.respuestas.leer();
    return resultado.ok ? resultado.datos : undefined;
  }

  /**
   * Quién trae a quién.
   *
   * Dos mapas sobre la lista que ya está cargada: `guests` está cerrada a
   * lectura directa (regla 2), así que no hay otra consulta que hacer, y
   * recorrer la lista una vez por invitado sería cuadrático con mil invitados.
   */
  protected readonly porId = computed(
    () => new Map(this.todos().map((i) => [i.id, i.nickname || i.fullName])),
  );

  protected readonly acompanantesPorTitular = computed(() => {
    const cuenta = new Map<string, number>();
    for (const invitado of this.todos()) {
      if (invitado.invitedById === null) continue;
      cuenta.set(invitado.invitedById, (cuenta.get(invitado.invitedById) ?? 0) + 1);
    }
    return cuenta;
  });

  /** Cuántos trae, o `null` para que la plantilla no pinte un cero. */
  protected cuantosTrae(invitado: Invitado): number | null {
    return this.acompanantesPorTitular().get(invitado.id) ?? null;
  }

  /** A quién se le está apuntando la respuesta en su nombre (D-45). */
  protected readonly respondiendoPor = signal<Invitado | null>(null);

  /** Los grupos marcados en el formulario. Fuera del FormGroup: es una lista de casillas. */
  protected readonly seleccionados = signal<readonly string[]>([]);
  protected readonly avisoRestringidos = computed(() =>
    dosRestringidos(this.seleccionados(), this.grupos.grupos()),
  );

  protected readonly carga = signal<Carga>('cargando');
  protected readonly guardando = signal(false);
  protected readonly fallo = signal<FalloInvitado | null>(null);
  protected readonly busqueda = signal('');
  protected readonly editando = signal(false);

  /** El titular elegido en «Viene con», o `''` si viene por su cuenta. */
  protected readonly titularElegido = signal('');

  /** De qué titular se está mirando la familia, o `null` si se mira la lista. */
  protected readonly familiaDe = signal<string | null>(null);
  protected readonly enEdicion = signal<Invitado | null>(null);
  protected readonly borrando = signal<Invitado | null>(null);

  protected readonly todos = signal<readonly Invitado[]>([]);

  /** Qué lista está mirando: todos, o una de las cuatro cifras de arriba. */
  protected readonly vista = signal<Vista>('todos');

  /** Las cifras de la cabecera, que son también los filtros. */
  private readonly vistasFijas: readonly { vista: Vista; clave: string }[] = [
    { vista: 'todos', clave: 'total' },
    { vista: 'confirmed', clave: 'confirmados' },
    { vista: 'pending', clave: 'pendientes' },
    { vista: 'sin-entrar', clave: 'sinEntrar' },
  ];

  /**
   * «Apuntados por invitados» solo sale cuando hay alguno.
   *
   * En una boda con el módulo apagado esa cifra sería un cero permanente
   * ocupando sitio en la cabecera, que en el móvil es media pantalla.
   */
  protected readonly vistas = computed(() =>
    this.resumen().apuntados > 0
      ? [...this.vistasFijas, { vista: 'apuntados' as const, clave: 'apuntados' }]
      : this.vistasFijas,
  );

  /**
   * Los grupos que la pareja ve. El de todos («Invitados») se queda por
   * debajo —todo invitado está en él, D-47— pero no se enseña: como grupo no
   * dice nada y estorba en filtros y fichas (D-52).
   */
  protected readonly gruposVisibles = computed(() =>
    this.grupos.grupos().filter((g) => !g.porDefecto),
  );

  /** El grupo por el que se está filtrando, o `null` si son todos. */
  protected readonly grupoElegido = signal<string | null>(null);

  protected readonly visibles = computed(() => {
    const titularId = this.familiaDe();
    if (titularId !== null) {
      // La familia ignora los demás filtros: se llega aquí a mirar quién viene
      // con quién, y un filtro olvidado escondería justo a alguien. El titular,
      // primero.
      const familia = ordenarPorNombre(deLaFamilia(this.todos(), titularId));
      return [
        ...familia.filter((i) => i.id === titularId),
        ...familia.filter((i) => i.id !== titularId),
      ];
    }

    const { campo, sentido } = this.orden();
    return ordenarInvitados(
      porGrupo(
        porVista(filtrarInvitados(this.todos(), this.busqueda()), this.vista()),
        this.grupoElegido(),
      ),
      campo,
      sentido,
      // Solo los grupos que la pareja ve: el general (oculto) lo tienen todos y
      // empataría a todo el mundo en el primer puesto, dejando el orden por nombre.
      this.gruposVisibles().map((g) => g.id),
    );
  });

  protected readonly camposDeOrden = CAMPOS_DE_ORDEN;
  protected readonly pareja = computed(() => this.boda.boda()?.pareja ?? null);

  /** Por qué se ordena la lista y en qué sentido. Por nombre, de la A a la Z, de entrada. */
  protected readonly orden = signal<{ readonly campo: CampoOrden; readonly sentido: Sentido }>({
    campo: 'nombre',
    sentido: 'asc',
  });

  protected ordenarPor(evento: Event): void {
    const campo = (evento.target as HTMLSelectElement).value as CampoOrden;
    if (!CAMPOS_DE_ORDEN.includes(campo)) return;
    this.orden.set({ campo, sentido: 'asc' });
  }

  protected cambiarSentido(): void {
    this.orden.update((o) => ({ ...o, sentido: o.sentido === 'asc' ? 'desc' : 'asc' }));
  }

  /** Los que pueden ser titulares de este invitado: cualquiera menos él y los acompañantes. */
  protected readonly candidatosATitular = computed(() => {
    const yo = this.enEdicion()?.id;
    return ordenarPorNombre(this.todos().filter((i) => !i.isCompanion && i.id !== yo));
  });

  /** Quien ya trae gente no puede pasar a ser acompañante. */
  protected readonly enEdicionTraeGente = computed(() => {
    const yo = this.enEdicion();
    return yo !== null && this.cuantosTrae(yo) !== null;
  });

  protected nombreDe(id: string): string {
    return this.porId().get(id) ?? '';
  }

  /** Salta a un titular con sus acompañantes; `null` vuelve a la lista. */
  protected verFamilia(titularId: string | null): void {
    this.familiaDe.set(titularId);
    // Se llega desde el fondo de una lista larga: sin subir, la pantalla
    // enseña un hueco en blanco donde antes estaba la fila.
    this.host.nativeElement.scrollIntoView?.({ block: 'start' });
  }

  protected elegirTitular(evento: Event): void {
    const id = (evento.target as HTMLSelectElement).value;
    this.titularElegido.set(id);

    // Lo que se ve es lo que va a quedar: sus grupos son los del titular.
    const titular = this.todos().find((i) => i.id === id);
    if (titular) this.seleccionados.set(titular.groupIds);
  }
  protected readonly resumen = computed(() => resumirInvitados(this.todos()));

  /**
   * Los que han apuntado los invitados esta semana.
   *
   * Se recalcula con la lista, no con un reloj: no hace falta que el aviso
   * desaparezca solo a los siete días exactos estando la pantalla abierta.
   */
  protected readonly novedades = computed(() => apuntadosHacePoco(this.todos()));

  protected nombresDeNovedades(): string {
    const nombres = this.novedades().map((i) => i.nickname || i.fullName);
    return nombres.slice(0, 3).join(', ') + (nombres.length > 3 ? '…' : '');
  }

  protected cuantos(vista: Vista): number {
    const resumen = this.resumen();
    if (vista === 'apuntados') return resumen.apuntados;
    if (vista === 'confirmed') return resumen.confirmados;
    if (vista === 'declined') return resumen.declinados;
    if (vista === 'pending') return resumen.pendientes;
    if (vista === 'sin-entrar') return resumen.sinEntrar;
    return resumen.total;
  }

  /** Pulsar la cifra que ya está puesta vuelve a la lista entera. */
  protected verSolo(vista: Vista): void {
    this.familiaDe.set(null);
    this.vista.update((actual) => (actual === vista ? 'todos' : vista));
  }

  protected readonly idsVisibles = computed(() => this.visibles().map((invitado) => invitado.id));

  /** Igual que las cifras: pulsar el grupo que ya está puesto lo quita. */
  protected verGrupo(groupId: string): void {
    this.familiaDe.set(null);
    this.grupoElegido.update((actual) => (actual === groupId ? null : groupId));
  }

  /**
   * Los grupos con cuántos hay en cada uno, **con la cifra de arriba ya
   * aplicada**.
   *
   * Si no, con «pendientes» puesto se vería «Primos 40» y al pulsarlo saldrían
   * seis, y la pareja no sabría cuál de los dos números se ha equivocado.
   */
  protected readonly gruposParaFiltrar = computed(() => {
    const dentroDeLaVista = porVista(this.todos(), this.vista());

    return this.gruposVisibles().map((grupo) => ({
      grupo,
      cuantos: porGrupo(dentroDeLaVista, grupo.id).length,
    }));
  });

  /**
   * Todos los campos que la pareja puede tocar, **también los que no cambia**.
   *
   * `upsertGuest` sobrescribe lo que valida. Con un formulario que no llevaba
   * el mote, la edad ni los grupos, editar el teléfono de un niño importado lo
   * convertía en adulto, le quitaba el mote y lo sacaba de sus grupos.
   */
  protected readonly formulario = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    nickname: [''],
    phone: [''],
    side: ['both' as Lado],
    ageGroup: ['adult' as Edad],
    notes: [''],
  });

  constructor() {
    void this.recargar();
  }

  /**
   * La clave de traducción del fallo, o `null` si el mensaje viene del servidor.
   *
   * Existe para que el caso más común de todos —App Check sin configurar, un
   * 401— no acabe enseñando «Unauthenticated [401]», que es lo que hacía y no
   * le dice a nadie qué tiene que tocar.
   */
  protected claveDeFallo(): string | null {
    switch (this.fallo()?.tipo) {
      case 'sin-verificar':
        return 'superadmin.alta.sinVerificar';
      case 'sin-permiso':
        return 'panel.invitados.sinPermiso';
      default:
        return null;
    }
  }

  protected mensajeError(): string {
    const f = this.fallo();
    return f?.tipo === 'error' ? f.mensaje : '';
  }

  protected buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  /**
   * Se ha apuntado una respuesta por un invitado: se cierra y se vuelve a leer
   * la lista **sin** el «cargando» de pantalla completa. El chip de arriba y las
   * cifras de la cabecera tienen que cambiar delante de los ojos de quien acaba
   * de pulsar «Guardar», no tras un parpadeo en blanco.
   */
  protected async respuestaGuardada(): Promise<void> {
    this.respondiendoPor.set(null);
    const resultado = await this.puerta.listar();
    if (resultado.ok) this.todos.set(resultado.invitados);
  }

  protected async recargar(): Promise<void> {
    this.carga.set('cargando');
    const resultado = await this.puerta.listar();

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.carga.set('error');
      return;
    }

    this.todos.set(resultado.invitados);
    this.fallo.set(null);
    this.carga.set('lista');
  }

  /** Con un titular, el alta nace ya como su acompañante. */
  protected nuevo(titular?: Invitado): void {
    this.fallo.set(null);
    this.enEdicion.set(null);
    this.titularElegido.set(titular?.id ?? '');
    this.formulario.reset({
      fullName: '',
      nickname: '',
      phone: '',
      side: titular?.side ?? 'both',
      ageGroup: 'adult',
      notes: '',
    });
    if (titular) {
      this.seleccionados.set(titular.groupIds);
      this.editando.set(true);
      return;
    }
    // Marcado de salida el grupo de todos: el servidor lo pondría igual (D-31),
    // y así la pareja ve dónde va a entrar antes de guardar.
    this.seleccionados.set(
      this.grupos
        .grupos()
        .filter((g) => g.porDefecto)
        .map((g) => g.id),
    );
    this.editando.set(true);
  }

  protected editar(invitado: Invitado): void {
    this.fallo.set(null);
    this.enEdicion.set(invitado);
    this.titularElegido.set(invitado.invitedById ?? '');
    this.formulario.reset({
      fullName: invitado.fullName,
      // Si el mote es el propio nombre, es que no tenía: se enseña vacío para
      // que no parezca que alguien lo escribió así.
      nickname: invitado.nickname === invitado.fullName ? '' : invitado.nickname,
      phone: telefonoVisible(invitado.phone),
      side: invitado.side,
      ageGroup: invitado.ageGroup,
      notes: invitado.notes,
    });
    // El grupo de todos va siempre (D-47), también en invitados que aún no lo tenían.
    this.seleccionados.set([...new Set([...this.idsDelGrupoGeneral(), ...invitado.groupIds])]);
    this.editando.set(true);
  }

  private idsDelGrupoGeneral(): readonly string[] {
    return this.grupos
      .grupos()
      .filter((g) => g.porDefecto)
      .map((g) => g.id);
  }

  protected alternarGrupo(id: string): void {
    // El grupo de todos no se quita: un invitado siempre está en él.
    if (this.idsDelGrupoGeneral().includes(id)) return;
    this.seleccionados.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  /** «De María», «De Gabriel», «De los dos». */
  protected ladoDe(lado: Lado, t: (clave: string, params?: object) => string): string {
    return ladoDeInvitado(lado, this.boda.boda()?.pareja, t);
  }

  protected cerrar(): void {
    this.editando.set(false);
    this.fallo.set(null);
  }

  protected async guardar(forzar = false): Promise<void> {
    if (this.formulario.invalid) return;

    const valores = this.formulario.getRawValue();
    const datos: DatosInvitado = {
      ...(this.enEdicion() ? { id: this.enEdicion()!.id } : {}),
      fullName: valores.fullName,
      nickname: valores.nickname,
      phone: valores.phone,
      side: valores.side,
      ageGroup: valores.ageGroup,
      groupIds: this.seleccionados(),
      notes: valores.notes,
      invitedById: this.titularElegido() || null,
    };

    this.guardando.set(true);
    const resultado = await this.puerta.guardar(datos, forzar);
    this.guardando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    // Se acaba de colgar a alguien de un titular: se enseña la familia para
    // que se vea que ha quedado donde debía.
    const titular = this.titularElegido();
    this.editando.set(false);
    this.fallo.set(null);
    await this.recargar();
    if (titular) this.familiaDe.set(titular);
  }

  protected pedirBorrado(invitado: Invitado): void {
    this.fallo.set(null);
    this.borrando.set(invitado);
  }

  protected async borrar(): Promise<void> {
    const quien = this.borrando();
    if (!quien) return;

    this.guardando.set(true);
    const resultado = await this.puerta.borrar(quien.id);
    this.guardando.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    this.borrando.set(null);
    await this.recargar();
  }
}
