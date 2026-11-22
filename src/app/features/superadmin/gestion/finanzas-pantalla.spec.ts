import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import type { PagoEnEdicion } from './gestion';
import { abrirDialogosEnPruebas } from '../../panel/invitados/dobles.testing';
import { PantallaFinanzas } from './finanzas-pantalla';
import { crearMontaje, pago } from './gestion.testing';

const montar = crearMontaje(
  JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>,
);

/**
 * Los cobros del superadmin.
 *
 * 1. **Los totales salen de céntimos** y cambian con los filtros.
 * 2. **Un importe que no es un número no llega al servidor**.
 * 3. **Lo que se guarda lleva el importe en céntimos**, no en euros.
 * 4. **Borrar pide confirmación** y dice qué se borra.
 */

beforeAll(abrirDialogosEnPruebas);

const BODAS = [
  { weddingId: 'w1', slug: 'maria', couple: { partnerA: 'María', partnerB: 'Gabriel' } },
  { weddingId: 'w2', slug: 'ana', couple: { partnerA: 'Ana', partnerB: 'Juan' } },
];

const PAGOS = [
  pago(),
  pago({
    id: 'p2',
    weddingId: 'w2',
    amountCents: 15050,
    status: 'pending',
    paidOn: null,
    concept: 'Plan extendido',
  }),
];

function puerta(extra: Record<string, unknown> = {}) {
  const guardados: [string | null, PagoEnEdicion][] = [];
  const borrados: string[] = [];
  return {
    guardados,
    borrados,
    doble: {
      finanzas: async () => ({
        ok: true as const,
        datos: { pagos: PAGOS, bodas: BODAS, recortado: false },
      }),
      guardarPago: async (id: string | null, p: PagoEnEdicion) => {
        guardados.push([id, p]);
        return { ok: true as const, datos: { id: id ?? 'nuevo', ...p } };
      },
      borrarPago: async (id: string) => {
        borrados.push(id);
        return { ok: true as const, datos: null };
      },
      ...extra,
    },
  };
}

function escribir(selector: string, valor: string) {
  const campo = document.querySelector(`dialog ${selector}`) as HTMLInputElement;
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
  campo.dispatchEvent(new Event('change'));
}

describe('los cobros', () => {
  it('suma lo cobrado y lo pendiente por separado', async () => {
    const p = await montar(PantallaFinanzas, puerta().doble);
    const t = p.texto();
    expect(t).toContain('299,00 €');
    expect(t).toContain('150,50 €');
  });

  it('el estado se dice con texto', async () => {
    const p = await montar(PantallaFinanzas, puerta().doble);
    expect(p.texto()).toContain('Pendiente');
    expect(p.texto()).toContain('Cobrado');
  });

  it('filtrar por boda deja solo sus cobros y recalcula los totales', async () => {
    const p = await montar(PantallaFinanzas, puerta().doble);
    const select = p.raiz.querySelector('select') as HTMLSelectElement;
    select.value = 'w2';
    select.dispatchEvent(new Event('change'));
    p.fixture.detectChanges();

    const t = p.texto();
    expect(t).toContain('Plan extendido');
    expect(t).not.toContain('Plan básico');
    expect(p.raiz.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('un importe que no es un número no llega al servidor', async () => {
    const d = puerta();
    const p = await montar(PantallaFinanzas, d.doble);
    await p.pulsar(p.boton('Nuevo cobro'));

    escribir('select[formcontrolname="weddingId"]', 'w1');
    escribir('input[formcontrolname="concept"]', 'Plan');
    escribir('input[formcontrolname="importe"]', 'mucho');
    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));

    expect(d.guardados).toEqual([]);
    expect(p.dialogo()).toContain('El importe tiene que ser un número');
  });

  it('crea un cobro mandando el importe en céntimos', async () => {
    const d = puerta();
    const p = await montar(PantallaFinanzas, d.doble);
    await p.pulsar(p.boton('Nuevo cobro'));

    escribir('select[formcontrolname="weddingId"]', 'w1');
    escribir('input[formcontrolname="concept"]', 'Plan básico');
    escribir('input[formcontrolname="importe"]', '299,50');
    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));

    expect(d.guardados).toHaveLength(1);
    expect(d.guardados[0]?.[0]).toBeNull();
    expect(d.guardados[0]?.[1]).toMatchObject({
      weddingId: 'w1',
      amountCents: 29950,
      concept: 'Plan básico',
      status: 'pending',
      paidOn: null,
    });
    expect(p.texto()).toContain('Plan básico');
  });

  it('un rechazo del servidor dice qué campo falla', async () => {
    const d = puerta({
      guardarPago: async () => ({ ok: false, fallo: { tipo: 'invalido', motivo: 'fecha' } }),
    });
    const p = await montar(PantallaFinanzas, d.doble);
    await p.pulsar(p.boton('Nuevo cobro'));
    escribir('input[formcontrolname="importe"]', '10');
    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));
    expect(p.dialogo()).toContain('necesita una fecha válida');
  });

  it('borrar pide confirmación y dice qué se borra', async () => {
    const d = puerta();
    const p = await montar(PantallaFinanzas, d.doble);
    await p.pulsar(
      p.raiz.querySelector('tbody tr button[class*="danger"], tbody tr button:last-child'),
    );

    expect(d.borrados).toEqual([]);
    expect(p.dialogo()).toContain('Vas a borrar');

    await p.pulsar(p.boton('Eliminar', document.querySelector('dialog')!));
    expect(d.borrados).toHaveLength(1);
    expect(p.raiz.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('sin cobros, lo dice y ofrece apuntar el primero', async () => {
    const p = await montar(PantallaFinanzas, {
      finanzas: async () => ({ ok: true, datos: { pagos: [], bodas: BODAS, recortado: false } }),
    });
    expect(p.texto()).toContain('No hay cobros que mostrar');
    expect(p.boton('Nuevo cobro')).toBeTruthy();
  });

  it('un fallo de lectura se cuenta y deja reintentar', async () => {
    const p = await montar(PantallaFinanzas, {
      finanzas: async () => ({ ok: false, fallo: { tipo: 'sin-permiso' } }),
    });
    expect(p.texto()).toContain('No se han podido cargar los cobros');
    expect(p.texto()).toContain('Reintentar');
  });
});
