import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { SessionStore } from '../../../core/auth/session.store';
import { traducirPersonas } from '../../../core/firebase/personas-gateway.firestore';
import {
  ALMACEN_FOTOS_PERSONAS,
  PUERTA_PERSONAS,
  type AlmacenFotosPersonas,
  type PuertaPersonas,
} from '../../../core/personas/personas-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { BodaStore } from '../boda.store';
import { abrirDialogosEnPruebas } from '../boda.testing';
import { doblesDeEnlaces } from '../enlaces/dobles-enlaces.testing';

import { PanelPersonas } from './personas-panel';
import type { DatosDePersona, PersonaDelPanel } from './personas';
import { PersonasStore } from './personas.store';

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const persona = (parcial: Partial<PersonaDelPanel> & { id: string }): PersonaDelPanel => ({
  name: 'Carmen Ruiz',
  role: 'Madrina',
  side: 'A',
  bio: '',
  phone: null,
  photoPath: null,
  photoUrl: null,
  photoConsent: false,
  visible: true,
  guestId: null,
  order: 1,
  ...parcial,
});

function montar(personas: readonly PersonaDelPanel[]) {
  const guardadas: {
    id: string | null;
    datos: DatosDePersona;
    orden: number;
    consentimientoNuevo: boolean;
  }[] = [];
  const borradas: string[] = [];
  const reordenadas: { id: string; order: number }[][] = [];
  const subidas: string[] = [];
  const fotosBorradas: string[] = [];

  const puerta: PuertaPersonas = {
    async listar() {
      return { ok: true, personas };
    },
    async guardar(_w, id, datos, orden, consentimientoNuevo) {
      guardadas.push({ id, datos, orden, consentimientoNuevo });
      return { ok: true };
    },
    async borrar(_w, id) {
      borradas.push(id);
      return { ok: true };
    },
    async reordenar(_w, cambios) {
      reordenadas.push([...cambios]);
      return { ok: true };
    },
  };
  const almacen: AlmacenFotosPersonas = {
    async subir(_w, fichero) {
      subidas.push(fichero.name);
      return { path: 'weddings/w1/party/1700000000000.jpg', url: 'https://x.test/nueva.jpg' };
    },
    async borrar(ruta) {
      fotosBorradas.push(ruta);
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      ...doblesDeEnlaces().providers,
      { provide: PUERTA_PERSONAS, useValue: puerta },
      { provide: ALMACEN_FOTOS_PERSONAS, useValue: almacen },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      {
        provide: BodaStore,
        useValue: {
          boda: signal({ pareja: { partnerA: 'María', partnerB: 'Gabriel' }, modulos: {} }),
        },
      },
      PersonasStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelPersonas);
  fixture.detectChanges();
  return {
    fixture,
    el: fixture.nativeElement as HTMLElement,
    guardadas,
    borradas,
    reordenadas,
    subidas,
    fotosBorradas,
  };
}

async function asentar(fixture: ReturnType<typeof montar>['fixture']): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  }
}

const texto = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ') ?? '';

function boton(el: HTMLElement, txt: string): HTMLButtonElement {
  const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find((x) =>
    (x.textContent ?? '').includes(txt),
  );
  if (!b) throw new Error(`No hay botón «${txt}»`);
  return b;
}

function escribir(el: HTMLElement, control: string, valor: string): void {
  const campo = el.querySelector<HTMLInputElement>(`[formControlName="${control}"]`);
  if (!campo) throw new Error(`No hay ${control}`);
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

function marcar(el: HTMLElement, control: string): void {
  el.querySelector<HTMLInputElement>(`[formControlName="${control}"]`)?.click();
}

function elegirFoto(el: HTMLElement, nombre = 'foto.jpg', tipo = 'image/jpeg', bytes = 10): void {
  const entrada = el.querySelector<HTMLInputElement>('input[type="file"]')!;
  const fichero = new File([new Uint8Array(bytes)], nombre, { type: tipo });
  Object.defineProperty(entrada, 'files', { value: [fichero], configurable: true });
  entrada.dispatchEvent(new Event('change'));
}

describe('las personas importantes de la pareja', () => {
  it('pinta la lista con su papel, el lado con el nombre real y si es visible (en texto)', async () => {
    const { fixture, el } = montar([
      persona({ id: 'a', name: 'Carmen Ruiz', role: 'Madrina', side: 'A', phone: '600112233' }),
      persona({ id: 'b', name: 'Antonio', role: 'Padrino', side: 'B', visible: false, order: 2 }),
    ]);
    await asentar(fixture);

    const t = texto(el);
    expect(t).toContain('Carmen Ruiz');
    expect(t).toContain('Madrina · Del lado de María');
    expect(t).toContain('Padrino · Del lado de Gabriel');
    expect(t).toContain('Visible en la web');
    expect(t).toContain('Oculta a los invitados');
    // El teléfono es de la pareja y se dice.
    expect(el.querySelector<HTMLAnchorElement>('a[href="tel:600112233"]')).not.toBeNull();
    expect(t).toContain('solo para vosotros');
  });

  it('vacío, lo dice y deja añadir', async () => {
    const { fixture, el } = montar([]);
    await asentar(fixture);
    expect(texto(el)).toContain('Todavía no hay personas');
    expect(boton(el, 'Añadir persona').disabled).toBe(false);
  });

  it('crea a una persona sin foto, sin pedir consentimiento, al final de la lista', async () => {
    const { fixture, el, guardadas } = montar([persona({ id: 'a', order: 4 })]);
    await asentar(fixture);

    boton(el, 'Añadir persona').click();
    fixture.detectChanges();
    // Sin foto, la casilla del consentimiento ni existe.
    expect(el.querySelector('[formControlName="consentimiento"]')).toBeNull();

    escribir(el, 'name', 'Lucía');
    escribir(el, 'role', 'Portaanillos');
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas).toEqual([
      {
        id: null,
        orden: 5,
        consentimientoNuevo: false,
        datos: expect.objectContaining({
          name: 'Lucía',
          role: 'Portaanillos',
          side: 'both',
          visible: true,
          photoPath: null,
          photoUrl: null,
          photoConsent: false,
        }),
      },
    ]);
  });

  it('falta el papel: no se guarda y se explica', async () => {
    const { fixture, el, guardadas } = montar([]);
    await asentar(fixture);

    boton(el, 'Añadir persona').click();
    fixture.detectChanges();
    escribir(el, 'name', 'Lucía');
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardadas).toHaveLength(0);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('papel');
  });

  describe('la foto y su consentimiento (D-61)', () => {
    it('elegir una foto hace aparecer la casilla, y sin marcarla NO se sube ni se guarda', async () => {
      const { fixture, el, guardadas, subidas } = montar([]);
      await asentar(fixture);

      boton(el, 'Añadir persona').click();
      fixture.detectChanges();
      escribir(el, 'name', 'Lucía');
      escribir(el, 'role', 'Portaanillos');
      elegirFoto(el);
      fixture.detectChanges();

      expect(el.querySelector('[formControlName="consentimiento"]')).not.toBeNull();
      expect(texto(el)).toContain('sabe que su foto saldrá publicada');

      boton(el, 'Guardar').click();
      await asentar(fixture);

      expect(guardadas).toHaveLength(0);
      expect(subidas).toHaveLength(0);
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('confirmad');
    });

    it('con la casilla marcada se sube, se guarda con consentimiento y se registra el momento', async () => {
      const { fixture, el, guardadas, subidas } = montar([]);
      await asentar(fixture);

      boton(el, 'Añadir persona').click();
      fixture.detectChanges();
      escribir(el, 'name', 'Lucía');
      escribir(el, 'role', 'Portaanillos');
      elegirFoto(el);
      fixture.detectChanges();
      marcar(el, 'consentimiento');
      boton(el, 'Guardar').click();
      await asentar(fixture);

      expect(subidas).toEqual(['foto.jpg']);
      expect(guardadas).toEqual([
        expect.objectContaining({
          consentimientoNuevo: true,
          datos: expect.objectContaining({
            photoPath: 'weddings/w1/party/1700000000000.jpg',
            photoUrl: 'https://x.test/nueva.jpg',
            photoConsent: true,
          }),
        }),
      ]);
    });

    it('lo que no es una imagen, o pesa más de 10 MB, no llega ni a elegirse', async () => {
      const { fixture, el } = montar([]);
      await asentar(fixture);

      boton(el, 'Añadir persona').click();
      fixture.detectChanges();

      elegirFoto(el, 'contrato.pdf', 'application/pdf');
      fixture.detectChanges();
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('JPG, PNG o WebP');
      expect(el.querySelector('[formControlName="consentimiento"]')).toBeNull();

      elegirFoto(el, 'enorme.jpg', 'image/jpeg', 11 * 1024 * 1024);
      fixture.detectChanges();
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('10 MB');
      expect(el.querySelector('[formControlName="consentimiento"]')).toBeNull();
    });

    it('una persona con foto guardada abre con el consentimiento ya marcado', async () => {
      const { fixture, el, guardadas } = montar([
        persona({
          id: 'a',
          photoPath: 'weddings/w1/party/1.jpg',
          photoUrl: 'https://x.test/1.jpg',
          photoConsent: true,
        }),
      ]);
      await asentar(fixture);

      boton(el, 'Editar').click();
      fixture.detectChanges();
      expect(
        el.querySelector<HTMLInputElement>('[formControlName="consentimiento"]')?.checked,
      ).toBe(true);

      escribir(el, 'bio', 'La tía');
      boton(el, 'Guardar').click();
      await asentar(fixture);

      // Editar otra cosa no reescribe el momento del consentimiento.
      expect(guardadas[0]).toMatchObject({
        id: 'a',
        consentimientoNuevo: false,
        datos: { bio: 'La tía', photoPath: 'weddings/w1/party/1.jpg', photoConsent: true },
      });
    });

    it('cambiar la foto exige confirmar otra vez, y la vieja se borra al guardar', async () => {
      const { fixture, el, guardadas, fotosBorradas } = montar([
        persona({
          id: 'a',
          photoPath: 'weddings/w1/party/vieja.jpg',
          photoUrl: 'https://x.test/vieja.jpg',
          photoConsent: true,
        }),
      ]);
      await asentar(fixture);

      boton(el, 'Editar').click();
      fixture.detectChanges();
      elegirFoto(el);
      fixture.detectChanges();
      // La casilla se desmarca: es otra persona en otra foto.
      expect(
        el.querySelector<HTMLInputElement>('[formControlName="consentimiento"]')?.checked,
      ).toBe(false);

      boton(el, 'Guardar').click();
      await asentar(fixture);
      expect(guardadas).toHaveLength(0);

      marcar(el, 'consentimiento');
      boton(el, 'Guardar').click();
      await asentar(fixture);

      expect(guardadas[0]).toMatchObject({
        consentimientoNuevo: true,
        datos: { photoPath: 'weddings/w1/party/1700000000000.jpg', photoConsent: true },
      });
      expect(fotosBorradas).toEqual(['weddings/w1/party/vieja.jpg']);
    });

    it('quitar la foto la borra y deja la ficha sin foto ni consentimiento', async () => {
      const { fixture, el, guardadas, fotosBorradas } = montar([
        persona({
          id: 'a',
          photoPath: 'weddings/w1/party/1.jpg',
          photoUrl: 'https://x.test/1.jpg',
          photoConsent: true,
        }),
      ]);
      await asentar(fixture);

      boton(el, 'Editar').click();
      fixture.detectChanges();
      boton(el, 'Quitar la foto').click();
      fixture.detectChanges();
      boton(el, 'Guardar').click();
      await asentar(fixture);

      expect(guardadas[0]).toMatchObject({
        id: 'a',
        datos: { photoPath: null, photoUrl: null, photoConsent: false },
      });
      expect(fotosBorradas).toEqual(['weddings/w1/party/1.jpg']);
    });
  });

  it('subir y bajar reordena solo las dos que cambian', async () => {
    const { fixture, el, reordenadas } = montar([
      persona({ id: 'a', name: 'Ana', order: 1 }),
      persona({ id: 'b', name: 'Bea', order: 2 }),
    ]);
    await asentar(fixture);

    el.querySelector<HTMLButtonElement>('[aria-label="Bajar a Ana"]')?.click();
    await asentar(fixture);

    expect(reordenadas).toEqual([
      [
        { id: 'b', order: 1 },
        { id: 'a', order: 2 },
      ],
    ]);
    // El primero no puede subir.
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Subir a Ana"]')?.disabled).toBe(true);
  });

  it('borra con confirmación y se lleva su foto', async () => {
    const { fixture, el, borradas, fotosBorradas } = montar([
      persona({
        id: 'a',
        photoPath: 'weddings/w1/party/1.jpg',
        photoUrl: 'https://x.test/1.jpg',
        photoConsent: true,
      }),
    ]);
    await asentar(fixture);

    boton(el, 'Eliminar').click();
    fixture.detectChanges();
    expect(texto(el)).toContain('¿Eliminar a «Carmen Ruiz»?');
    expect(texto(el)).toContain('También se borrará su foto');
    expect(borradas).toHaveLength(0);

    const confirmar = [...el.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')].find(
      (b) => (b.textContent ?? '').includes('Eliminar'),
    );
    confirmar?.click();
    await asentar(fixture);

    expect(borradas).toEqual(['a']);
    expect(fotosBorradas).toEqual(['weddings/w1/party/1.jpg']);
  });
});

describe('traducirPersonas', () => {
  it('distingue red, permisos y el resto', () => {
    expect(traducirPersonas({ code: 'unavailable' })).toEqual({ tipo: 'red' });
    expect(traducirPersonas({ code: 'permission-denied' })).toEqual({ tipo: 'sin-permiso' });
    expect(traducirPersonas({ message: 'x' })).toEqual({ tipo: 'error', mensaje: 'x' });
    expect(traducirPersonas(undefined)).toMatchObject({ tipo: 'error' });
  });
});
