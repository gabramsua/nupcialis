import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { abrirDialogosEnPruebas } from '../../panel/invitados/dobles.testing';
import { FichaBoda } from './ficha-boda';
import type { PagoEnEdicion } from './gestion';
import { ficha, crearMontaje, pago } from './gestion.testing';

const montar = crearMontaje(
  JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>,
);

/**
 * La ficha de boda del superadmin.
 *
 * Lo que se vigila:
 *
 * 1. **Que el enlace de restablecimiento se pida para la cuenta pulsada** y se
 *    enseñe una vez, con el aviso de que da acceso a la cuenta.
 * 2. **Que un fallo al generarlo se cuente**, sin tirar la ficha entera.
 * 3. **Que el historial no esconda lo que no entiende**: una acción sin etiqueta
 *    se enseña con su nombre.
 */

beforeAll(abrirDialogosEnPruebas);
afterEach(() => vi.unstubAllGlobals());

const CONTACTO = {
  uid: 'u1',
  email: 'maria@example.com',
  displayName: 'María',
  phone: null,
  disabled: false,
  lastSignIn: new Date('2026-11-01T10:00:00Z'),
};

describe('la ficha de boda', () => {
  it('enseña la pareja, el resumen y los contactos', async () => {
    const p = await montar(
      FichaBoda,
      { ficha: async () => ({ ok: true, datos: ficha({ contactos: [CONTACTO] }) }) },
      { id: 'w1' },
    );
    const t = p.texto();
    expect(t).toContain('María y Gabriel');
    expect(t).toContain('maria-y-gabriel');
    expect(t).toContain('80 de 120');
    expect(t).toContain('maria@example.com');
    expect(t).toContain('Autorizado en Auth');
  });

  it('un subdominio sin autorizar se dice con texto', async () => {
    const p = await montar(
      FichaBoda,
      { ficha: async () => ({ ok: true, datos: ficha({ authDomain: 'pending' }) }) },
      { id: 'w1' },
    );
    expect(p.texto()).toContain('Subdominio sin autorizar en Auth');
  });

  it('pide el enlace para la cuenta pulsada y lo enseña', async () => {
    const pedidos: [string, string][] = [];
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({ ok: true, datos: ficha({ contactos: [CONTACTO] }) }),
        enlaceDeRestablecimiento: async (weddingId, uid) => {
          pedidos.push([weddingId, uid]);
          return {
            ok: true,
            datos: { email: 'maria@example.com', enlace: 'https://x.test/reset' },
          };
        },
      },
      { id: 'w1' },
    );

    await p.pulsar(p.boton('Enlace de restablecimiento'));

    expect(pedidos).toEqual([['w1', 'u1']]);
    expect(p.dialogo()).toContain('https://x.test/reset');
    expect(p.dialogo()).toContain('maria@example.com');
    expect(p.dialogo()).toContain('Quien tenga este enlace puede entrar en la cuenta');
  });

  it('«Correo de reestablecer contraseña» manda el acceso y avisa de que ha salido', async () => {
    const pedidos: [string, string][] = [];
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({ ok: true, datos: ficha({ contactos: [CONTACTO] }) }),
        enviarCorreoDeAcceso: async (weddingId, uid) => {
          pedidos.push([weddingId, uid]);
          return {
            ok: true,
            datos: { email: 'maria@example.com', enlace: 'https://x.test/reset', enviado: true },
          };
        },
      },
      { id: 'w1' },
    );
    await p.pulsar(p.boton('Correo de reestablecer contraseña'));

    expect(pedidos).toEqual([['w1', 'u1']]);
    expect(p.dialogo()).toContain('Correo en cola');
    expect(p.dialogo()).toContain('https://x.test/reset');
  });

  it('si el correo no se ha podido encolar, lo dice y deja el enlace para copiar', async () => {
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({ ok: true, datos: ficha({ contactos: [CONTACTO] }) }),
        enviarCorreoDeAcceso: async () => ({
          ok: true,
          datos: { email: 'maria@example.com', enlace: 'https://x.test/reset', enviado: false },
        }),
      },
      { id: 'w1' },
    );
    await p.pulsar(p.boton('Correo de reestablecer contraseña'));

    expect(p.dialogo()).toContain('El correo no ha salido');
    expect(p.dialogo()).toContain('https://x.test/reset');
  });

  it('copiar manda el enlace al portapapeles', async () => {
    const escribir = vi.fn<(texto: string) => Promise<void>>(async () => undefined);
    vi.stubGlobal('navigator', { userAgent: 'prueba', clipboard: { writeText: escribir } });

    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({ ok: true, datos: ficha({ contactos: [CONTACTO] }) }),
        enlaceDeRestablecimiento: async () => ({
          ok: true,
          datos: { email: 'maria@example.com', enlace: 'https://x.test/reset' },
        }),
      },
      { id: 'w1' },
    );
    await p.pulsar(p.boton('Enlace de restablecimiento'));
    await p.pulsar(p.boton('Copiar', document.querySelector('dialog')!));

    expect(escribir).toHaveBeenCalledWith('https://x.test/reset');
    vi.unstubAllGlobals();
  });

  it('una cuenta sin correo no ofrece el enlace', async () => {
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({
          ok: true,
          datos: ficha({ contactos: [{ ...CONTACTO, email: null }] }),
        }),
      },
      { id: 'w1' },
    );
    expect(p.boton('Enlace de restablecimiento')?.disabled).toBe(true);
  });

  it('si el servidor falla, lo cuenta y la ficha sigue', async () => {
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({ ok: true, datos: ficha({ contactos: [CONTACTO] }) }),
        enlaceDeRestablecimiento: async () => ({ ok: false, fallo: { tipo: 'sin-correo' } }),
      },
      { id: 'w1' },
    );
    await p.pulsar(p.boton('Enlace de restablecimiento'));
    expect(p.texto()).toContain('No se ha podido generar el enlace');
    expect(p.texto()).toContain('no tiene correo');
    expect(p.texto()).toContain('María y Gabriel');
  });

  it('el historial usa etiquetas, y lo desconocido sale con su nombre', async () => {
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({
          ok: true,
          datos: ficha({
            historial: [
              {
                id: 'h1',
                action: 'setWeddingStatus',
                actorRole: 'superadmin',
                at: new Date('2026-11-10T09:30:00Z'),
                payload: { de: 'draft', a: 'active' },
              },
              { id: 'h2', action: 'accionNueva', actorRole: 'system', at: null, payload: {} },
            ],
          }),
        }),
      },
      { id: 'w1' },
    );
    const t = p.texto();
    expect(t).toContain('Estado de la boda cambiado');
    expect(t).toContain('de: draft · a: active');
    expect(t).toContain('accionNueva');
  });

  it('enseña los cobros con su total', async () => {
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({
          ok: true,
          datos: ficha({
            pagos: [
              pago(),
              pago({
                id: 'p2',
                amountCents: 10000,
                status: 'pending',
                paidOn: null,
                concept: 'Extra',
              }),
            ],
          }),
        }),
      },
      { id: 'w1' },
    );
    const t = p.texto();
    expect(t).toContain('Plan básico');
    expect(t).toContain('Cobrado 299,00 € · pendiente 100,00 €');
  });

  it('una boda que no existe lo dice y deja reintentar', async () => {
    const p = await montar(
      FichaBoda,
      { ficha: async () => ({ ok: false, fallo: { tipo: 'no-existe' } }) },
      { id: 'zzz' },
    );
    expect(p.texto()).toContain('Esa boda no existe');
    expect(p.texto()).toContain('Reintentar');
  });
});

describe('actividad de la boda', () => {
  it('enseña los contadores de entradas de la pareja y de los invitados', async () => {
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({
          ok: true,
          datos: ficha({
            acceso: {
              pareja: 7,
              parejaUltima: new Date('2026-11-20T10:00:00Z'),
              visitasWeb: 240,
              visitasWebUltima: new Date('2026-11-21T10:00:00Z'),
              invitadosQueEntraron: 31,
              invitadosEntradas: 58,
            },
            fotos: 12,
            pagos: [pago({ amountCents: 29900, status: 'paid' })],
          }),
        }),
      },
      { id: 'w1' },
    );

    const t = p.texto();
    expect(t).toContain('Entradas de la pareja al panel 7');
    expect(t).toContain('31 invitados han entrado, 58 entradas en total');
    expect(t).toContain('Visitas a la web 240');
    expect(t).toContain('Fotos en la galería12');
    expect(t).toContain('299');
  });

  it('apunta un cobro en mano: ya cobrado, con el método elegido', async () => {
    const guardados: unknown[] = [];
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({ ok: true, datos: ficha() }),
        guardarPago: async (_id: string | null, pago: PagoEnEdicion) => {
          guardados.push(pago);
          return { ok: true as const, datos: { id: 'p1', ...pago } };
        },
      },
      { id: 'w1' },
    );
    const importe = p.raiz.querySelector<HTMLInputElement>('input[name="importe"]')!;
    importe.value = '149,90';
    importe.dispatchEvent(new Event('input'));
    await p.pulsar(p.boton('Apuntar cobro'));

    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({
      weddingId: 'w1',
      amountCents: 14990,
      method: 'efectivo',
      status: 'paid',
    });
  });

  it('un importe que no vale no se manda y se explica', async () => {
    const guardados: unknown[] = [];
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({ ok: true, datos: ficha() }),
        guardarPago: async (_id: string | null, pago: PagoEnEdicion) => {
          guardados.push(pago);
          return { ok: true as const, datos: { id: 'p1', ...pago } };
        },
      },
      { id: 'w1' },
    );
    await p.pulsar(p.boton('Apuntar cobro'));

    expect(guardados).toHaveLength(0);
    expect(p.texto()).toContain('Escribe un importe mayor que cero');
  });

  it('con precio acordado, enseña cuánto falta por cobrar (D-56)', async () => {
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({
          ok: true,
          datos: ficha({
            agreedPriceCents: 40000,
            pagos: [pago({ amountCents: 29900, status: 'paid' })],
          }),
        }),
      },
      { id: 'w1' },
    );
    expect(p.raiz.querySelector('[data-precio]')?.textContent).toContain('400,00');
    expect(p.raiz.querySelector('[data-falta]')?.textContent).toContain('101,00');
  });

  it('sin precio acordado lo dice y no inventa un pendiente', async () => {
    const p = await montar(
      FichaBoda,
      { ficha: async () => ({ ok: true, datos: ficha() }) },
      { id: 'w1' },
    );
    expect(p.raiz.querySelector('[data-precio]')?.textContent).toContain('Sin fijar');
    expect(p.raiz.querySelector('[data-falta]')).toBeNull();
  });

  it('si ya se ha cobrado de más, no sale un pendiente negativo', async () => {
    const p = await montar(
      FichaBoda,
      {
        ficha: async () => ({
          ok: true,
          datos: ficha({
            agreedPriceCents: 0,
            pagos: [pago({ amountCents: 5000, status: 'paid' })],
          }),
        }),
      },
      { id: 'w1' },
    );
    expect(p.raiz.querySelector('[data-falta]')?.textContent).toContain('0,00');
  });

  it('enseña el teléfono de contacto si lo hay', async () => {
    const p = await montar(
      FichaBoda,
      { ficha: async () => ({ ok: true, datos: ficha({ contactPhone: '+34600112233' }) }) },
      { id: 'w1' },
    );
    expect(p.texto()).toContain('Teléfono de contacto: +34600112233');
  });
});
