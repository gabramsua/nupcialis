import { DOCUMENT, Injectable, inject } from '@angular/core';

import { urlDeFuentes, type Plantilla } from './catalogo';

/**
 * Carga la tipografía de la plantilla elegida, y solo esa.
 *
 * Meter todas las familias del catálogo en `index.html` sería más simple y
 * costaría una descarga por cada plantilla que la boda **no** usa. El invitado
 * abre el enlace desde WhatsApp, a menudo con mala cobertura: paga lo que su
 * boda necesita y nada más.
 *
 * Es idempotente: si el mismo `<link>` ya está puesto no se duplica, y no se
 * retira al cambiar de plantilla —una hoja de estilos ya descargada no molesta,
 * y quitarla provocaría un parpadeo de tipografía al volver.
 */
@Injectable({ providedIn: 'root' })
export class Fuentes {
  private readonly documento = inject(DOCUMENT);

  cargar(plantilla: Plantilla): void {
    const url = urlDeFuentes(plantilla);
    if (!url) return;

    const cabecera = this.documento.head;
    if (!cabecera || cabecera.querySelector(`link[href="${url}"]`)) return;

    // `preconnect` al servidor de ficheros: la hoja de estilos y las fuentes
    // vienen de hosts distintos, y sin esto la segunda conexión se abre tarde.
    this.enlace(cabecera, { rel: 'preconnect', href: 'https://fonts.gstatic.com', cors: true });
    this.enlace(cabecera, { rel: 'stylesheet', href: url });
  }

  private enlace(
    cabecera: HTMLHeadElement,
    opciones: { rel: string; href: string; cors?: boolean },
  ): void {
    if (cabecera.querySelector(`link[rel="${opciones.rel}"][href="${opciones.href}"]`)) return;

    const link = this.documento.createElement('link');
    link.rel = opciones.rel;
    link.href = opciones.href;
    if (opciones.cors) link.crossOrigin = 'anonymous';
    cabecera.appendChild(link);
  }
}
