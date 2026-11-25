import { DOCUMENT, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Type,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { ResultadoTenant } from '../../core/tenant/tenant-loader';
import { variablesDeMarca as colores } from '../../core/tenant/marca';
import { plantillaDe } from '../../features/public-site/plantillas/catalogo';
import { cargarPlantilla } from '../../features/public-site/plantillas/cargador';
import { Fuentes } from '../../features/public-site/plantillas/fuentes';
import type { DatosPortada } from '../../features/public-site/plantillas/portada';
import { NpEmptyState } from '../../design-system/components/empty-state/empty-state';
import { NpIcon } from '../../design-system/icons/icon';
import { Indexacion, debeIndexarse } from '../../core/seo/indexacion';
import {
  PARAM_ENLACE,
  nombreDelEnlace,
  pideIdentificarse,
  type ModoAcceso,
} from '../../core/acceso/acceso';
import { FIREBASE_FUNCTIONS } from '../../core/firebase/functions.providers';
import { PUERTA_REGALOS_ABIERTOS } from '../../core/regalos/regalos-abiertos-gateway';
import { SesionInvitado } from '../../core/firebase/sesion-invitado';
import { registrarVisitaWeb } from '../../core/firebase/visita-web';
import { NpCabeceraBoda } from '../../features/public-site/navegacion/cabecera-boda';
import { conCabecera as bodaConCabecera } from '../../features/public-site/tema';
import { Entrar } from '../../features/public-site/acceso/entrar';
import { DRESS_CODE_VACIO } from '../../features/public-site/dress-code/dress-code';

/**
 * Envoltorio de la web pública de la boda.
 *
 * Todo lo que cuelgue de aquí lo descarga un invitado desde el móvil, a menudo
 * con mala cobertura. Presupuesto: 200 kB de JS comprimido. Nada del panel
 * puede acabar en este chunk.
 *
 * Esta envoltura **no diseña nada**: resuelve el estado de la boda, elige la
 * plantilla del catálogo y le pasa los datos. El diseño vive entero en la
 * plantilla, y por eso añadir la décima es escribir HTML y CSS.
 *
 * Cada estado tiene su pantalla. Ninguno cae en una página en blanco: quien
 * llega aquí ha tecleado un enlace que le han mandado, y merece saber qué pasa.
 */
@Component({
  selector: 'np-public-shell',
  imports: [
    NgComponentOutlet,
    RouterLink,
    TranslocoDirective,
    NpEmptyState,
    NpIcon,
    Entrar,
    NpCabeceraBoda,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style]': 'variablesDeMarca()' },
  template: `
    <ng-container *transloco="let t">
      @switch (tenant().tipo) {
        @case ('ok') {
          <!--
            La puerta va **delante de todo**, no dentro de la plantilla: en los
            modos B y C no hay visitante anónimo (§1.1), así que ni los nombres
            ni la fecha ni las secciones se pintan hasta saber quién es.

            Y va en un bloque diferido: así Firebase Auth y este formulario viven en su
            propio trozo, y una boda abierta —el modo por defecto— no descarga
            ni un byte de todo esto.
          -->
          @if (hayQuePreguntar()) {
            @defer (when hayQuePreguntar()) {
              <np-entrar
                [modo]="modo()"
                [slug]="slug()"
                [nombres]="nombresDeLaBoda()"
                [nombrePrevio]="nombreDelEnlace"
              />
            }
          } @else if (esperandoSesion()) {
            <!--
              Mientras Firebase dice si ya había sesión no se pinta nada. Un
              parpadeo de formulario antes de entrar es peor que medio segundo
              de fondo de marca, sobre todo al recargar.
            -->
          } @else if (plantilla(); as componente) {
            <!--
              La cabecera de navegación, solo en la web de varias páginas. Va
              antes de la plantilla y sale en todas las páginas de la boda, no
              solo en la portada.
            -->
            @if (conCabecera()) {
              <np-cabecera-boda [tenant]="tenant()" />
            }
            <ng-container
              *ngComponentOutlet="componente; inputs: { datos: datosPortada() }"
            ></ng-container>

            <!--
              Quién cree la web que eres, y cómo decir que no.
              Hace falta más desde D-34: el enlace entra solo, así que quien
              recibe uno reenviado está dentro como otra persona sin haber hecho
              nada. Tiene que poder salir, y la pareja tiene que poder fiarse de
              que quien confirmó era él.
            -->
            @if (sesion.identificado()) {
              <p class="np-quien">
                <np-icon name="user-circle" />
                <span>
                  {{
                    sesion.nombre()
                      ? t('publico.sesion.comoQuien', { nombre: sesion.nombre() })
                      : t('publico.sesion.comoInvitado')
                  }}
                </span>
                <button type="button" (click)="salir()">
                  {{ t('publico.sesion.noEresTu') }}
                </button>
              </p>
            }

            <!--
              La entrada al formulario de confirmación, pegada abajo.
              Primero móvil: en el pulgar, no al final de la página después de
              seis secciones. Y solo cuando sabemos quién es: sin identidad no
              hay a quién apuntar la respuesta (ver D-09).
            -->
            @if (puedeConfirmar() && !conCabecera()) {
              <a class="np-confirmar" routerLink="/confirmar">
                <np-icon name="check-circle" weight="fill" />
                {{ t('publico.confirmar.entrada') }}
              </a>
            }
          }
        }
        @case ('landing') {
          <!--
            Marcador honesto de la landing comercial, que es F5. Dice lo que es
            el producto en vez de fingir una web de boda que aquí no existe.
          -->
          <main class="np-landing">
            <h1>{{ t('app.name') }}</h1>
            <p>{{ t('app.tagline') }}</p>
          </main>
        }
        @case ('no-publicada') {
          <np-empty-state
            icon="eye-slash"
            [title]="t('publico.noPublicada.titulo')"
            [description]="t('publico.noPublicada.descripcion')"
          />
        }
        @case ('archivada') {
          <np-empty-state
            icon="clock-countdown"
            [title]="t('publico.archivada.titulo')"
            [description]="t('publico.archivada.descripcion')"
          />
        }
        @case ('error') {
          <np-empty-state
            icon="warning"
            [title]="t('publico.error.titulo')"
            [description]="t('publico.error.descripcion')"
          />
        }
        @default {
          <np-empty-state
            icon="magnifying-glass"
            [title]="t('publico.noEncontrada.titulo')"
            [description]="t('publico.noEncontrada.descripcion')"
          />
        }
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      min-block-size: 100dvh;
      background: var(--np-marca-background, var(--np-surface-canvas));
    }
    .np-landing {
      display: grid;
      place-content: center;
      gap: var(--np-space-2);
      min-block-size: 100dvh;
      padding: var(--np-space-5);
      text-align: center;
      color: var(--np-surface-text);
    }
    .np-landing h1 {
      margin: 0;
      font-size: var(--np-text-3xl);
      font-weight: var(--np-weight-semibold);
    }
    .np-landing p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    /* Discreta y arriba: es información, no una acción que haya que destacar.
       Pero el «¿no eres tú?» tiene que ser pulsable con el pulgar. */
    .np-quien {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-2);
      margin: 0;
      padding: var(--np-space-2) var(--np-space-4);
      background: var(--np-marca-surface, var(--np-surface-surface));
      color: var(--np-marca-text, var(--np-surface-text));
      font-size: var(--np-text-sm);
      opacity: 0.9;
    }
    .np-quien button {
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-2);
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: var(--np-text-sm);
      text-decoration: underline;
      cursor: pointer;
    }
    /* Pegada abajo y a lo ancho en el móvil; una pastilla centrada en cuanto
       hay sitio. Con icono y texto: el color nunca viaja solo. */
    .np-confirmar {
      position: fixed;
      inset-block-end: 0;
      inset-inline: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-2);
      min-block-size: 3.5rem;
      padding: var(--np-space-3) var(--np-space-4);
      padding-block-end: max(var(--np-space-3), env(safe-area-inset-bottom));
      background: var(--np-marca-primary, var(--np-surface-text));
      color: var(--np-marca-background, var(--np-surface-canvas));
      font-weight: var(--np-weight-medium);
      text-decoration: none;
    }
    @media (min-width: 48rem) {
      .np-confirmar {
        inset-inline: auto;
        inset-block-end: var(--np-space-4);
        inset-inline-end: var(--np-space-4);
        border-radius: var(--np-radius-full);
        box-shadow: var(--np-shadow-md, 0 2px 12px rgb(0 0 0 / 0.2));
      }
    }
  `,
})
export class PublicShell {
  private readonly fuentes = inject(Fuentes);
  private readonly indexacion = inject(Indexacion);
  protected readonly sesion = inject(SesionInvitado);
  private readonly functions = inject(FIREBASE_FUNCTIONS, { optional: true });
  private readonly puertaRegalos = inject(PUERTA_REGALOS_ABIERTOS, { optional: true });
  /** El servidor dijo que esta boda no tiene regalos que enseñar: la sección no sale. */
  private readonly sinRegalos = signal(false);

  /**
   * El nombre que trae el enlace que le mandó la pareja (`?n=`).
   *
   * Se lee de `location` y no del router: aquí no hay ruta con parámetros, es
   * la raíz de la boda, y el router reescribe la URL desde su propio estado en
   * cuanto navega.
   */
  protected readonly nombreDelEnlace = nombreDelEnlace(inject(DOCUMENT).location.search);

  private readonly documento = inject(DOCUMENT);

  /** El token que trae el enlace de la pareja, si lo trae (D-34). */
  private readonly tokenDelEnlace = new URLSearchParams(inject(DOCUMENT).location.search).get(
    PARAM_ENLACE,
  );

  /**
   * Abre la sesión del invitado: primero la que ya hubiera, y si no, el enlace.
   *
   * El orden importa. Quien ya se había identificado con sus cuatro dígitos no
   * puede perder ese nivel por volver a abrir el enlace del WhatsApp —que es lo
   * que hace todo el mundo—, así que un token de enlace no pisa una sesión que
   * ya está verificada.
   */
  private async abrir(): Promise<void> {
    await this.sesion.recuperar();

    const token = this.tokenDelEnlace;
    if (token === null) return;

    // El token sale de la barra de direcciones en cuanto se usa: queda en el
    // historial del móvil y en lo que se comparta desde el navegador, y no
    // hace falta para nada más.
    this.limpiarUrl();

    if (this.sesion.verificado()) return;

    await this.sesion.entrarConEnlace(this.slug(), token);
  }

  /**
   * Cierra la sesión del invitado y vuelve a la puerta.
   *
   * Lo que no hace es recargar: al soltar la sesión, `hayQuePreguntar()` pasa a
   * ser verdad y la puerta aparece sola. Y el token del enlace ya se ha
   * limpiado de la URL, así que no vuelve a entrar con el mismo.
   */
  protected async salir(): Promise<void> {
    await this.sesion.salir();
  }

  private limpiarUrl(): void {
    const ventana = this.documento.defaultView;
    const historial = ventana?.history;
    if (!historial?.replaceState) return;

    const url = new URL(this.documento.location.href);
    url.searchParams.delete(PARAM_ENLACE);
    historial.replaceState(historial.state, '', url.pathname + url.search + url.hash);
  }

  /** Lo resuelve `tenantResolver` antes de que esto se monte. */
  readonly tenant = input.required<ResultadoTenant>();

  /** Para que el efecto de abrir la sesión no se dispare dos veces. */
  private entrando = false;

  protected readonly plantilla = signal<Type<unknown> | null>(null);

  private readonly sitio = computed(() => {
    const t = this.tenant();
    return t.tipo === 'ok' ? t.sitio : null;
  });

  protected readonly modo = computed<ModoAcceso>(() => this.sitio()?.guestAccessMode ?? 'open');
  protected readonly slug = computed(() => {
    const t = this.tenant();
    return t.tipo === 'ok' ? t.slug : '';
  });

  protected readonly nombresDeLaBoda = computed(() => {
    const nombres = this.sitio()?.coupleNames;
    return nombres ? [nombres.partnerA, nombres.partnerB].filter(Boolean).join(' & ') : '';
  });

  /**
   * ¿Se le puede ofrecer el formulario de confirmación?
   *
   * Hacen falta las dos cosas: que la pareja tenga el módulo a la vista, y que
   * sepamos quién es el que está mirando. En una boda abierta no lo sabemos, y
   * una confirmación sin nombre no sirve para contar comensales ni para pedir
   * un menú. Qué hacer ahí es D-09, y no lo decido yo.
   */
  protected readonly puedeConfirmar = computed(
    () => this.sitio()?.modulos['rsvp'] === 'visible' && this.sesion.identificado(),
  );

  /** La web de varias páginas lleva cabecera de navegación (plan completo). */
  protected readonly conCabecera = computed(() => bodaConCabecera(this.tenant()));

  /** La boda pide identificarse y todavía no sabemos quién es. */
  protected readonly hayQuePreguntar = computed(
    () => pideIdentificarse(this.modo()) && this.sesion.resuelta() && !this.sesion.identificado(),
  );

  /** Pide identificarse y Firebase aún no ha contestado si había sesión. */
  protected readonly esperandoSesion = computed(
    () => pideIdentificarse(this.modo()) && !this.sesion.resuelta(),
  );

  private readonly elegida = computed(() => {
    const t = this.tenant();
    return plantillaDe(t.tipo === 'ok' ? t.sitio.theme.templateId : null);
  });

  protected readonly datosPortada = computed<DatosPortada>(() => {
    const t = this.tenant();
    if (t.tipo !== 'ok') {
      return {
        nombres: { partnerA: '', partnerB: '' },
        weddingDate: null,
        weddingTime: null,
        timezone: 'Europe/Madrid',
        locale: 'es',
        heroImageUrl: null,
        secciones: [],
        faqs: [],
        cronologia: [],
        alojamientos: [],
        autobuses: [],
        cortejo: [],
        ubicaciones: [],
        dressCode: DRESS_CODE_VACIO,
      };
    }
    return {
      nombres: t.sitio.coupleNames,
      weddingDate: t.sitio.weddingDate,
      weddingTime: t.sitio.weddingTime,
      timezone: t.sitio.timezone,
      locale: t.sitio.locale,
      heroImageUrl: t.sitio.theme.heroImageUrl,
      secciones: this.sinRegalos()
        ? t.sitio.secciones.filter((seccion) => seccion.type !== 'regalos')
        : t.sitio.secciones,
      faqs: t.sitio.faqs,
      cronologia: t.sitio.cronologia,
      alojamientos: t.sitio.alojamientos,
      autobuses: t.sitio.autobuses,
      cortejo: t.sitio.cortejo,
      ubicaciones: t.sitio.ubicaciones,
      dressCode: t.sitio.dressCode,
      layout: t.sitio.layout,
      slug: t.slug,
    };
  });

  /**
   * La paleta de la pareja, como variables CSS en el host.
   *
   * Las plantillas escriben `var(--np-marca-accent, <su reserva>)`, así que una
   * boda sin paleta elegida se ve con los colores de su plantilla y no en
   * blanco. Aquí no se inventa ningún color: o vienen los seis de la boda, o no
   * se pone ninguno (ver `tenant-source.firestore.ts`).
   */
  protected readonly variablesDeMarca = computed(() => {
    const t = this.tenant();
    return colores(t.tipo === 'ok' ? t.sitio.theme.palette : null);
  });

  constructor() {
    // Quitar el `noindex` es lo único que se hace aquí: la etiqueta ya viene en
    // el HTML servido, así que el estado por defecto no depende de que este
    // código llegue a ejecutarse. Ver `index.html` y REQUISITOS §8.1.
    effect(() => {
      const t = this.tenant();
      if (t.tipo !== 'ok') return;
      this.indexacion.aplicar(debeIndexarse(t.sitio.status, t.sitio.indexable));
    });

    // El contador de visitas (D-55): una vez por pestaña y solo con la web publicada.
    effect(() => {
      const sitio = this.sitio();
      const functions = this.functions;
      if (!sitio || sitio.status !== 'active' || !functions) return;
      void registrarVisitaWeb(functions, this.slug());
    });

    // Los regalos del plan básico van dentro de la página (D-66). Si el servidor
    // dice que no hay nada que enseñar, la sección entera —título incluido— se
    // quita, en vez de dejar un «Algo ha ido mal» delante del invitado.
    effect(() => {
      const t = this.tenant();
      const puerta = this.puertaRegalos;
      if (t.tipo !== 'ok' || !puerta || t.sitio.layout === 'multipage') return;
      if (!t.sitio.secciones.some((seccion) => seccion.type === 'regalos')) return;
      void puerta.listar(t.slug).then((resultado) => {
        if (!resultado.ok && resultado.fallo.tipo === 'no-disponible') this.sinRegalos.set(true);
      });
    });

    effect(() => {
      if (this.tenant().tipo !== 'ok') return;

      const plantilla = this.elegida();
      this.fuentes.cargar(plantilla);
      void cargarPlantilla(plantilla.id).then((componente) => this.plantilla.set(componente));
    });

    // Solo si la boda pide identificarse. En una abierta esto no se llama
    // nunca, y por eso Firebase Auth no llega a descargarse.
    effect(() => {
      if (!pideIdentificarse(this.modo()) || this.sesion.resuelta() || this.entrando) return;

      this.entrando = true;
      void this.abrir();
    });
  }
}
