import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { abrirDialogosEnPruebas } from '../../panel/invitados/dobles.testing';
import { FichaBoda } from './ficha-boda';
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

  it('copiar manda el enlace al portapapeles', async () => {
    const escribir = vi.fn<(texto: string) => Promise<void>>(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText: escribir } });

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
