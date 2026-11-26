import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import {
  PUERTA_LLAMADAS,
  type PuertaLlamadas,
  type ResultadoLlamada,
} from '../../core/llamadas/llamadas-gateway';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';

/** Una llamada que se registra y contesta con lo que diga `respuestas[nombre]`. */
export interface LlamadaRegistrada {
  readonly nombre: string;
  readonly datos: unknown;
}

export type Respuestas = Record<string, (datos: unknown) => unknown>;

/**
 * Un `PuertaLlamadas` de pruebas: contesta con crudos, que pasan por el lector
 * real de la pantalla, como en producción.
 */
export function puertaDePrueba(respuestas: Respuestas, registro: LlamadaRegistrada[] = []) {
  const puerta: PuertaLlamadas = {
    async llamar<T>(nombre: string, datos: unknown, leer: (crudo: unknown) => T | null) {
      registro.push({ nombre, datos });
      const contestar = respuestas[nombre];
      if (!contestar) {
        return { ok: false, fallo: { tipo: 'error', mensaje: `Sin doble para ${nombre}` } };
      }
      const crudo = contestar(datos);
      if (crudo instanceof Error) return { ok: false, fallo: { tipo: 'red' } };
      const leido = leer(crudo);
      return leido === null
        ? { ok: false, fallo: { tipo: 'error', mensaje: 'Respuesta ilegible.' } }
        : ({ ok: true, datos: leido } satisfies ResultadoLlamada<T>);
    },
  };
  return puerta;
}

export async function montarConLlamadas<T>(
  ES: Record<string, unknown>,
  componente: Type<T>,
  puerta: PuertaLlamadas,
  extra: unknown[] = [],
) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideRouter([]),
      provideIconSprite('panel'),
      { provide: PUERTA_LLAMADAS, useValue: puerta },
      ...(extra as never[]),
    ],
  });

  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  await esperar(fixture);

  const raiz = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    raiz,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    dialogo: () => document.querySelector('dialog')?.textContent?.replace(/\s+/g, ' ') ?? '',
    async pulsar(boton: Element | undefined | null) {
      if (!boton) throw new Error('No se encontró el botón.');
      (boton as HTMLButtonElement).click();
      await esperar(fixture);
    },
    boton(texto: string, dentro: ParentNode = raiz) {
      return [...dentro.querySelectorAll('button')].find((b) => b.textContent?.includes(texto));
    },
    async esperar() {
      await esperar(fixture);
    },
  };
}

async function esperar(fixture: { detectChanges(): void }): Promise<void> {
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();
}
