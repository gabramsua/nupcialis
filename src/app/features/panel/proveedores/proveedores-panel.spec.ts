import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { SessionStore } from '../../../core/auth/session.store';
import { traducirProveedores } from '../../../core/firebase/proveedores-gateway.firestore';
import {
  ALMACEN_CONTRATOS,
  PUERTA_PROVEEDORES,
  type AlmacenContratos,
  type PuertaProveedores,
} from '../../../core/proveedores/proveedores-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { abrirDialogosEnPruebas } from '../boda.testing';
import { doblesDeEnlaces } from '../enlaces/dobles-enlaces.testing';

import { PanelProveedores } from './proveedores-panel';
import type { DatosDeProveedor, ProveedorDelPanel } from './proveedores';
import { ProveedoresStore } from './proveedores.store';

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const proveedor = (parcial: Partial<ProveedorDelPanel> & { id: string }): ProveedorDelPanel => ({
  name: 'Foto Luz',
  category: 'Fotografía',
  contactName: '',
  phone: null,
  email: null,
  website: null,
  quotedCents: 0,
  agreedCents: 0,
  status: 'candidate',
  payments: [],
  contractPaths: [],
  rating: null,
  notes: '',
  order: 1,
  ...parcial,
});

function montar(proveedores: readonly ProveedorDelPanel[]) {
  const guardados: { id: string | null; datos: DatosDeProveedor; orden: number }[] = [];
  const borrados: string[] = [];
  const subidos: { proveedorId: string; nombre: string }[] = [];
  const quitados: string[] = [];

  const puerta: PuertaProveedores = {
    async listar() {
      return { ok: true, proveedores };
    },
    async guardar(_w, id, datos, orden) {
      guardados.push({ id, datos, orden });
      return { ok: true, id: id ?? 'nuevo' };
    },
    async borrar(_w, id) {
      borrados.push(id);
      return { ok: true, id };
    },
  };
  const almacen: AlmacenContratos = {
    async subir(w, proveedorId, fichero) {
      subidos.push({ proveedorId, nombre: fichero.name });
      return `weddings/${w}/vendors/${proveedorId}/1700000000000-${fichero.name}`;
    },
    async url(ruta) {
      return `https://descarga.test/${ruta}`;
    },
    async borrar(ruta) {
      quitados.push(ruta);
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
      { provide: PUERTA_PROVEEDORES, useValue: puerta },
      { provide: ALMACEN_CONTRATOS, useValue: almacen },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      ProveedoresStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelProveedores);
  fixture.detectChanges();
  return {
    fixture,
    el: fixture.nativeElement as HTMLElement,
    store: TestBed.inject(ProveedoresStore),
    guardados,
    borrados,
    subidos,
    quitados,
  };
}

async function asentar(fixture: ReturnType<typeof montar>['fixture']): Promise<void> {
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();
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

describe('los proveedores de la pareja', () => {
  it('pinta los totales y las fichas por categoría, con el estado en texto', async () => {
    const { fixture, el } = montar([
      proveedor({
        id: 'a',
        name: 'Catering Sol',
        category: 'Comida',
        status: 'contracted',
        agreedCents: 400000,
        payments: [{ amountCents: 100000, on: '2027-01-10', concept: 'Señal' }],
      }),
      proveedor({ id: 'b', name: 'Foto Luz', status: 'discarded', order: 2 }),
    ]);
    await asentar(fixture);

    const t = texto(el);
    expect(t).toContain('Comida');
    expect(t).toContain('Fotografía');
    expect(t).toContain('Catering Sol');
    expect(t).toContain('Contratado');
    expect(t).toContain('Descartado');
    expect(t).toMatch(/Acordado\s*4\.?000,00/);
    expect(t).toMatch(/Pagado\s*1\.?000,00/);
    expect(t).toMatch(/Por pagar\s*3\.?000,00/);
  });

  it('marca el candidato de presupuesto más bajo', async () => {
    const { fixture, el } = montar([
      proveedor({ id: 'a', name: 'Caro', quotedCents: 200000 }),
      proveedor({ id: 'b', name: 'Barato', quotedCents: 100000, order: 2 }),
    ]);
    await asentar(fixture);

    const fichas = [...el.querySelectorAll('.pv__proveedor')];
    const barato = fichas.find((f) => (f.textContent ?? '').includes('Barato'));
    const caro = fichas.find((f) => (f.textContent ?? '').includes('Caro'));
    expect(barato?.textContent).toContain('Presupuesto más bajo');
    expect(caro?.textContent).not.toContain('Presupuesto más bajo');
  });

  it('el contacto es pulsable: teléfono, correo y web', async () => {
    const { fixture, el } = montar([
      proveedor({
        id: 'a',
        phone: '600112233',
        email: 'ana@fotoluz.es',
        website: 'https://fotoluz.es/',
      }),
    ]);
    await asentar(fixture);

    const enlaces = [...el.querySelectorAll<HTMLAnchorElement>('.pv__enlaces a')];
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      'tel:600112233',
      'mailto:ana@fotoluz.es',
      'https://fotoluz.es/',
    ]);
    // La web se abre fuera y sin pasar el `window.opener`.
    expect(enlaces[2]?.getAttribute('rel')).toContain('noopener');
  });

  it('vacío, lo dice y deja añadir', async () => {
    const { fixture, el } = montar([]);
    await asentar(fixture);
    expect(texto(el)).toContain('Todavía no hay proveedores');
    expect(boton(el, 'Añadir proveedor').disabled).toBe(false);
  });

  it('añade un proveedor con importes en céntimos y un pago, y lo manda al final', async () => {
    const { fixture, el, guardados } = montar([proveedor({ id: 'a', order: 4 })]);
    await asentar(fixture);

    boton(el, 'Añadir proveedor').click();
    fixture.detectChanges();
    escribir(el, 'name', 'Flores Rosa');
    escribir(el, 'category', 'Flores');
    escribir(el, 'quoted', '800');
    escribir(el, 'agreed', '750,50');
    escribir(el, 'importe', '200');
    escribir(el, 'fecha', '2027-02-01');
    escribir(el, 'concepto', 'Señal');
    boton(el, 'Añadir pago').click();
    fixture.detectChanges();
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardados).toEqual([
      {
        id: null,
        orden: 5,
        datos: expect.objectContaining({
          name: 'Flores Rosa',
          category: 'Flores',
          quotedCents: 80000,
          agreedCents: 75050,
          status: 'candidate',
          payments: [{ amountCents: 20000, on: '2027-02-01', concept: 'Señal' }],
          contractPaths: [],
        }),
      },
    ]);
  });

  it('un presupuesto ilegible no sale y se explica', async () => {
    const { fixture, el, guardados } = montar([]);
    await asentar(fixture);

    boton(el, 'Añadir proveedor').click();
    fixture.detectChanges();
    escribir(el, 'name', 'Flores Rosa');
    escribir(el, 'quoted', 'mucho');
    boton(el, 'Guardar').click();
    await asentar(fixture);

    expect(guardados).toHaveLength(0);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('presupuesto');
  });

  it('un pago sin importe no se añade y se explica', async () => {
    const { fixture, el } = montar([]);
    await asentar(fixture);

    boton(el, 'Añadir proveedor').click();
    fixture.detectChanges();
    boton(el, 'Añadir pago').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('importe del pago');
  });

  it('edita con el id, conserva los contratos y borra con confirmación', async () => {
    const ruta = 'weddings/w1/vendors/a/1700000000000-contrato.pdf';
    const { fixture, el, guardados, borrados, quitados } = montar([
      proveedor({ id: 'a', contractPaths: [ruta] }),
    ]);
    await asentar(fixture);

    boton(el, 'Editar').click();
    fixture.detectChanges();
    escribir(el, 'agreed', '1.400');
    boton(el, 'Guardar').click();
    await asentar(fixture);
    expect(guardados[0]).toMatchObject({
      id: 'a',
      datos: { agreedCents: 140000, contractPaths: [ruta] },
    });

    boton(el, 'Eliminar').click();
    fixture.detectChanges();
    expect(texto(el)).toContain('¿Eliminar a «Foto Luz»?');
    expect(texto(el)).toContain('1 contrato(s)');
    expect(borrados).toHaveLength(0);

    const confirmar = [...el.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')].find(
      (b) => (b.textContent ?? '').includes('Eliminar'),
    );
    confirmar?.click();
    await asentar(fixture);
    expect(borrados).toEqual(['a']);
    // Sin ficha no hay quien abra el contrato: el PDF se borra con ella.
    expect(quitados).toEqual([ruta]);
  });

  it('una ficha nueva no deja adjuntar contratos hasta guardarla', async () => {
    const { fixture, el } = montar([]);
    await asentar(fixture);

    boton(el, 'Añadir proveedor').click();
    fixture.detectChanges();
    expect(texto(el)).toContain('Guardad la ficha');
    expect(el.querySelector('input[type="file"]')).toBeNull();
  });
});

describe('los contratos en PDF', () => {
  const pdf = (nombre: string, bytes = 10, tipo = 'application/pdf') =>
    new File([new Uint8Array(bytes)], nombre, { type: tipo });

  it('sube el PDF, lo cuelga de la ficha y lo guarda con su ruta', async () => {
    const { store, guardados, subidos } = montar([proveedor({ id: 'a' })]);
    await store.cargar();

    const ok = await store.subirContrato(store.proveedores()[0]!, pdf('contrato.pdf'));

    expect(ok).toBe(true);
    expect(subidos).toEqual([{ proveedorId: 'a', nombre: 'contrato.pdf' }]);
    expect(guardados[0]).toMatchObject({
      id: 'a',
      datos: { contractPaths: ['weddings/w1/vendors/a/1700000000000-contrato.pdf'] },
    });
  });

  it('no sube más contratos del máximo', async () => {
    const llenos = Array.from({ length: 10 }, (_, i) => `weddings/w1/vendors/a/${i}.pdf`);
    const { store, subidos } = montar([proveedor({ id: 'a', contractPaths: llenos })]);
    await store.cargar();

    expect(await store.subirContrato(store.proveedores()[0]!, pdf('otro.pdf'))).toBe(false);
    expect(subidos).toHaveLength(0);
  });

  it('quitar un contrato actualiza la ficha y borra el fichero', async () => {
    const ruta = 'weddings/w1/vendors/a/1700000000000-contrato.pdf';
    const { store, guardados, quitados } = montar([proveedor({ id: 'a', contractPaths: [ruta] })]);
    await store.cargar();

    expect(await store.quitarContrato(store.proveedores()[0]!, ruta)).toBe(true);
    expect(guardados[0]).toMatchObject({ id: 'a', datos: { contractPaths: [] } });
    expect(quitados).toEqual([ruta]);
  });

  it('la pantalla rechaza lo que no es PDF o pesa más de 20 MB, sin llegar a subirlo', async () => {
    const { fixture, el, subidos } = montar([proveedor({ id: 'a' })]);
    await asentar(fixture);

    boton(el, 'Editar').click();
    fixture.detectChanges();
    const entrada = el.querySelector<HTMLInputElement>('input[type="file"]')!;

    const poner = (fichero: File) => {
      Object.defineProperty(entrada, 'files', { value: [fichero], configurable: true });
      entrada.dispatchEvent(new Event('change'));
    };

    poner(pdf('foto.png', 10, 'image/png'));
    await asentar(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('PDF');

    poner(pdf('enorme.pdf', 21 * 1024 * 1024));
    await asentar(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('20 MB');
    expect(subidos).toHaveLength(0);
  });
});

describe('traducirProveedores', () => {
  it('distingue red, permisos y el resto', () => {
    expect(traducirProveedores({ code: 'unavailable' })).toEqual({ tipo: 'red' });
    expect(traducirProveedores({ code: 'permission-denied' })).toEqual({ tipo: 'sin-permiso' });
    expect(traducirProveedores({ message: 'x' })).toEqual({ tipo: 'error', mensaje: 'x' });
    expect(traducirProveedores(undefined)).toMatchObject({ tipo: 'error' });
  });
});
