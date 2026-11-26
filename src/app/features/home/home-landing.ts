import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { PUERTA_HOME_PUBLICA } from '../../core/home/home-gateway';
import { Indexacion } from '../../core/seo/indexacion';
import { HOME_DE_FABRICA, type ContenidoHome } from './home';
import { NpHomePagina } from './home-pagina';

/** Lo que se espera a Firestore antes de pintar lo de fábrica. */
export const ESPERA_MAXIMA_MS = 2500;

/**
 * La HOME de `nupcialis.com` tal y como la ve el público.
 *
 * Carga el contenido que dejó el superadmin y, si no hay ninguno, si no hay
 * red o si tarda demasiado, pinta lo de fábrica: la portada del producto **no
 * puede quedarse en blanco** por un fallo de lectura. Hasta que sabe cuál de
 * las dos pintar no enseña nada, para no mostrar el texto de fábrica un
 * instante y cambiarlo después.
 *
 * Es la única superficie de la web que se **indexa** siempre: la portada del
 * producto tiene que salir en Google.
 */
@Component({
  selector: 'np-home-landing',
  imports: [NpHomePagina],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (contenido(); as c) {
      <np-home-pagina [contenido]="c" />
    }
  `,
  styles: `
    :host {
      display: block;
      min-block-size: 100dvh;
    }
  `,
})
export class NpHomeLanding implements OnInit {
  private readonly puerta = inject(PUERTA_HOME_PUBLICA, { optional: true });
  private readonly titulo = inject(Title);
  private readonly meta = inject(Meta);
  private readonly indexacion = inject(Indexacion);

  protected readonly contenido = signal<ContenidoHome | null>(null);

  ngOnInit(): void {
    this.indexacion.aplicar(true);
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    const guardado = await this.conLimite(this.puerta?.leer() ?? Promise.resolve(null));
    const c = guardado ?? HOME_DE_FABRICA;
    this.titulo.setTitle(c.seo.title);
    this.meta.updateTag({ name: 'description', content: c.seo.description });
    this.meta.updateTag({ property: 'og:title', content: c.seo.title });
    this.meta.updateTag({ property: 'og:description', content: c.seo.description });
    this.contenido.set(c);
  }

  private conLimite<T>(promesa: Promise<T | null>): Promise<T | null> {
    return Promise.race([
      promesa.catch(() => null),
      new Promise<null>((listo) => setTimeout(() => listo(null), ESPERA_MAXIMA_MS)),
    ]);
  }
}
