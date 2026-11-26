import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import type { FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { abrirDialogosEnPruebas } from '../../panel/invitados/dobles.testing';
import type { DatosDeFinanzas } from '../gestion/gestion';
import { crearMontaje, pago } from '../gestion/gestion.testing';
import { PantallaProveedores } from './proveedores-pantalla';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;
const montar = crearMontaje(ES);

beforeAll(abrirDialogosEnPruebas);

const PEPE = {
  id: 'p1',
  name: 'Invitaciones Pepe',
  code: 'pepe',
  contactName: '',
  email: '',
  phone: '',
  wholesalePrice: { basic: 3000, extended: 6000 },
  active: true,
};

const FINANZAS: DatosDeFinanzas = {
  recortado: false,
  bodas: [
    { weddingId: 'w1', slug: 'ana-y-luis', couple: { partnerA: 'Ana', partnerB: 'Luis' } },
    { weddingId: 'w2', slug: 'eva-y-leo', couple: { partnerA: 'Eva', partnerB: 'Leo' } },
  ],
  pagos: [
    pago({
      id: 'a',
      weddingId: 'w1',
      partnerId: 'p1',
      status: 'pending',
      paidOn: null,
      amountCents: 3000,
      method: 'partner_cash',
    }),
    pago({
      id: 'b',
      weddingId: 'w2',
      partnerId: 'p1',
      status: 'pending',
      paidOn: null,
      amountCents: 6000,
      method: 'partner_cash',
    }),
    pago({
      id: 'c',
      weddingId: 'w2',
      partnerId: '',
      status: 'pending',
      paidOn: null,
      amountCents: 9900,
    }),
  ],
};

function puertas(extra: Record<string, (d: unknown) => unknown> = {}, registro: unknown[][] = []) {
  return {
    gestion: { finanzas: async () => ({ ok: true as const, datos: FINANZAS }) },
    llamadas: {
      async llamar<T>(nombre: string, datos: unknown, leer: (c: unknown) => T | null) {
        registro.push([nombre, datos]);
        const respuestas: Record<string, (d: unknown) => unknown> = {
          listPartners: () => ({ proveedores: [PEPE] }),
          ...extra,
        };
        const crudo = respuestas[nombre]?.(datos);
        if (crudo instanceof Error)
          return { ok: false as const, fallo: { tipo: 'red' } as FalloGestion };
        if (crudo && typeof crudo === 'object' && 'fallo' in crudo) {
          return { ok: false as const, fallo: (crudo as { fallo: FalloGestion }).fallo };
        }
        const leido = leer(crudo);
        return leido === null
          ? { ok: false as const, fallo: { tipo: 'error', mensaje: 'ilegible' } as FalloGestion }
          : { ok: true as const, datos: leido };
      },
    },
  };
}

describe('proveedores', () => {
  it('enseña cada proveedor con sus bodas y lo que debe, sin contar los cobros directos', async () => {
    const p = puertas();
    const v = await montar(PantallaProveedores, p.gestion, {}, p.llamadas);
    expect(v.texto()).toContain('Invitaciones Pepe');
    expect(v.texto()).toContain('Os deben en total 90,00');
    expect(v.texto()).toContain('Liquidar cobros (2)');
  });

  it('liquidar manda solo lo marcado, con la fecha, y deja los cobros como cobrados', async () => {
    const registro: unknown[][] = [];
    const p = puertas(
      { settlePartnerPayments: () => ({ liquidados: 1, totalCents: 3000 }) },
      registro,
    );
    const v = await montar(PantallaProveedores, p.gestion, {}, p.llamadas);

    await v.pulsar(v.boton('Liquidar cobros'));
    const casillas = [
      ...v.raiz.querySelectorAll<HTMLInputElement>('.pv__liq input[type=checkbox]'),
    ];
    expect(casillas).toHaveLength(2);
    casillas[0]!.click();
    v.fixture.detectChanges();
    const fecha = v.raiz.querySelector<HTMLInputElement>('.pv__liq input[type=date]')!;
    fecha.value = '2026-11-20';
    fecha.dispatchEvent(new Event('change'));
    await v.pulsar(v.boton('Liquidar 1'));

    const llamada = registro.find((r) => r[0] === 'settlePartnerPayments');
    expect(llamada?.[1]).toEqual({ partnerId: 'p1', paymentIds: ['a'], paidOn: '2026-11-20' });
    expect(v.texto()).toContain('1 cobros marcados como cobrados');
    expect(v.texto()).toContain('Os deben en total 60,00');
  });

  it('si el servidor rechaza la liquidación, lo dice y no cambia el saldo', async () => {
    const p = puertas({
      settlePartnerPayments: () => ({ fallo: { tipo: 'invalido', motivo: 'ya-cobrado' } }),
    });
    const v = await montar(PantallaProveedores, p.gestion, {}, p.llamadas);
    await v.pulsar(v.boton('Liquidar cobros'));
    v.raiz.querySelector<HTMLInputElement>('.pv__liq input[type=checkbox]')!.click();
    v.fixture.detectChanges();
    await v.pulsar(v.boton('Liquidar 1'));
    expect(v.texto()).toContain('ya estaba cobrado');
    expect(v.texto()).toContain('Os deben en total 90,00');
  });

  it('crea un proveedor pasando las tarifas a céntimos', async () => {
    const registro: unknown[][] = [];
    const p = puertas(
      {
        savePartner: (d) => ({
          id: 'nuevo',
          ...((d as { partner: object }).partner as object),
        }),
      },
      registro,
    );
    const v = await montar(PantallaProveedores, p.gestion, {}, p.llamadas);
    await v.pulsar(v.boton('Nuevo proveedor'));

    const rellenar = (nombre: string, valor: string) => {
      const c = document.querySelector<HTMLInputElement>(`dialog [formcontrolname=${nombre}]`)!;
      c.value = valor;
      c.dispatchEvent(new Event('input'));
    };
    rellenar('name', 'Fotos Ana');
    rellenar('code', 'ana');
    rellenar('basic', '30,50');
    await v.pulsar(v.boton('Guardar', document.querySelector('dialog')!));

    const llamada = registro.find((r) => r[0] === 'savePartner');
    expect(llamada?.[1]).toMatchObject({
      partnerId: '',
      partner: {
        name: 'Fotos Ana',
        code: 'ana',
        wholesalePrice: { basic: 3050, extended: 0 },
        active: true,
      },
    });
    expect(v.texto()).toContain('Fotos Ana');
  });

  it('una tarifa ilegible no sale hacia el servidor', async () => {
    const registro: unknown[][] = [];
    const p = puertas({}, registro);
    const v = await montar(PantallaProveedores, p.gestion, {}, p.llamadas);
    await v.pulsar(v.boton('Nuevo proveedor'));
    const c = document.querySelector<HTMLInputElement>('dialog [formcontrolname=basic]')!;
    c.value = 'mucho';
    c.dispatchEvent(new Event('input'));
    await v.pulsar(v.boton('Guardar', document.querySelector('dialog')!));
    expect(registro.some((r) => r[0] === 'savePartner')).toBe(false);
    expect(v.dialogo()).toContain('importe válido');
  });

  it('un código repetido se explica con su mensaje', async () => {
    const p = puertas({
      savePartner: () => ({ fallo: { tipo: 'invalido', motivo: 'codigo-repetido' } }),
    });
    const v = await montar(PantallaProveedores, p.gestion, {}, p.llamadas);
    await v.pulsar(v.boton('Nuevo proveedor'));
    await v.pulsar(v.boton('Guardar', document.querySelector('dialog')!));
    expect(v.dialogo()).toContain('Ya hay otro proveedor con ese código');
  });

  it('sin proveedores, invita a crear el primero', async () => {
    const p = puertas({ listPartners: () => ({ proveedores: [] }) });
    const v = await montar(PantallaProveedores, p.gestion, {}, p.llamadas);
    expect(v.texto()).toContain('Todavía no hay proveedores');
  });

  it('si no se pueden leer, lo dice y deja reintentar', async () => {
    const p = puertas({ listPartners: () => new Error('red') });
    const v = await montar(PantallaProveedores, p.gestion, {}, p.llamadas);
    expect(v.texto()).toContain('No se han podido leer los proveedores');
    expect(v.boton('Reintentar')).toBeTruthy();
  });
});
