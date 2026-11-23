import { PUERTA_LLAMADAS, type PuertaLlamadas } from '../../../core/llamadas/llamadas-gateway';
import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { PUERTA_GESTION, type PuertaGestion } from '../../../core/superadmin/gestion-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import type { FichaDeBoda, Pago } from './gestion';

export const NO_IMPLEMENTADO = async () => {
  throw new Error('Este doble no implementa esa llamada.');
};

export function ficha(parcial: Partial<FichaDeBoda> = {}): FichaDeBoda {
  return {
    weddingId: 'w1',
    slug: 'maria-y-gabriel',
    status: 'active',
    plan: 'basic',
    couple: { partnerA: 'María', partnerB: 'Gabriel' },
    weddingDay: '2027-06-12',
    createdAt: null,
    authDomain: 'ok',
    ceremonyType: 'civil',
    contactPhone: '',
    agreedPriceCents: null,
    invitados: 120,
    confirmados: 80,
    rechazados: 10,
    pendientes: 30,
    fotos: 0,
    acceso: {
      pareja: 0,
      parejaUltima: null,
      visitasWeb: 0,
      visitasWebUltima: null,
      invitadosQueEntraron: 0,
      invitadosEntradas: 0,
    },
    contactos: [],
    historial: [],
    pagos: [],
    ...parcial,
  };
}

export function pago(parcial: Partial<Pago> = {}): Pago {
  return {
    id: 'p1',
    weddingId: 'w1',
    amountCents: 29900,
    concept: 'Plan básico',
    method: 'bizum',
    status: 'paid',
    paidOn: '2026-11-20',
    invoiceNumber: 'F-1',
    notes: '',
    ...parcial,
  };
}

/**
 * Un montador con las traducciones que le pasen: se leen del fichero en el spec,
 * porque este archivo entra en la compilación de la aplicación y `node:fs` no
 * existe ahí.
 */
export function crearMontaje(ES: Record<string, unknown>) {
  return (
    componente: Type<unknown>,
    puerta: Partial<PuertaGestion>,
    ruta: Record<string, string> = {},
    llamadas: Partial<PuertaLlamadas> = {},
  ) => montarGestion(ES, componente, puerta, ruta, llamadas);
}

async function montarGestion<T>(
  ES: Record<string, unknown>,
  componente: Type<T>,
  puerta: Partial<PuertaGestion>,
  ruta: Record<string, string> = {},
  llamadas: Partial<PuertaLlamadas> = {},
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
      { provide: PUERTA_GESTION, useValue: puerta },
      { provide: PUERTA_LLAMADAS, useValue: llamadas },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: (k: string) => ruta[k] ?? null } } },
      },
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
  };
}

async function esperar(fixture: { detectChanges(): void }): Promise<void> {
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();
}
