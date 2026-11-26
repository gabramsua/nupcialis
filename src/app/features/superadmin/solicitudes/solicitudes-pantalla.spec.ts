import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { montarConLlamadas, puertaDePrueba, type LlamadaRegistrada } from '../llamadas.testing';
import { PantallaSolicitudes } from './solicitudes-pantalla';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const LISTA = {
  notifyEmail: 'gabriel@ejemplo.com',
  solicitudes: [
    {
      id: 's1',
      names: 'Ana y Leo',
      email: 'ana@ejemplo.com',
      phone: '600 00 00 00',
      weddingDate: 'Junio de 2027',
      plan: 'extended',
      message: 'Nos casamos en una finca',
      status: 'new',
      note: '',
      createdAt: 1_790_000_000_000,
    },
    {
      id: 's2',
      names: 'Eva y Pol',
      email: 'eva@ejemplo.com',
      plan: 'undecided',
      status: 'discarded',
    },
  ],
};

describe('solicitudes de la HOME', () => {
  it('enseña cada solicitud con sus datos y cuántas hay sin atender', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaSolicitudes,
      puertaDePrueba({ listHomeRequests: () => LISTA }),
    );
    expect(p.texto()).toContain('Ana y Leo');
    expect(p.texto()).toContain('ana@ejemplo.com');
    expect(p.texto()).toContain('Extendido');
    expect(p.texto()).toContain('Nos casamos en una finca');
    expect(p.texto()).toContain('2 solicitudes, 1 sin atender.');
    expect((p.raiz.querySelector('input[name=notifyEmail]') as HTMLInputElement).value).toBe(
      'gabriel@ejemplo.com',
    );
  });

  it('sin solicitudes dice que todavía no ha llegado ninguna', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaSolicitudes,
      puertaDePrueba({ listHomeRequests: () => ({ notifyEmail: '', solicitudes: [] }) }),
    );
    expect(p.texto()).toContain('Todavía no ha llegado ninguna');
  });

  it('cambiar el estado lo manda al servidor y lo deja marcado', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      PantallaSolicitudes,
      puertaDePrueba(
        { listHomeRequests: () => LISTA, updateHomeRequest: () => ({ ok: true }) },
        registro,
      ),
    );
    const selector = p.raiz.querySelector('.so__item select') as HTMLSelectElement;
    selector.value = 'contacted';
    selector.dispatchEvent(new Event('change'));
    await p.esperar();

    const llamada = registro.find((r) => r.nombre === 'updateHomeRequest');
    expect(llamada?.datos).toEqual({ id: 's1', status: 'contacted', note: '' });
    expect(p.texto()).toContain('2 solicitudes, 0 sin atender.');
  });

  it('guardar el correo de aviso lo manda recortado', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      PantallaSolicitudes,
      puertaDePrueba(
        {
          listHomeRequests: () => LISTA,
          saveHomeRequestSettings: (d) => ({
            ok: true,
            notifyEmail: (d as { notifyEmail: string }).notifyEmail,
          }),
        },
        registro,
      ),
    );
    const campo = p.raiz.querySelector('input[name=notifyEmail]') as HTMLInputElement;
    campo.value = '  otro@ejemplo.com ';
    campo.dispatchEvent(new Event('input'));
    p.fixture.detectChanges();
    await p.pulsar(p.boton('Guardar'));

    expect(registro.find((r) => r.nombre === 'saveHomeRequestSettings')?.datos).toEqual({
      notifyEmail: 'otro@ejemplo.com',
    });
    expect(p.texto()).toContain('Guardado.');
  });

  it('si el servidor rechaza el correo, lo dice', async () => {
    const p = await montarConLlamadas(ES, PantallaSolicitudes, {
      async llamar<T>(nombre: string, _d: unknown, leer: (c: unknown) => T | null) {
        if (nombre === 'listHomeRequests') return { ok: true as const, datos: leer(LISTA) as T };
        return { ok: false as const, fallo: { tipo: 'invalido' as const, motivo: 'correo' } };
      },
    });
    const campo = p.raiz.querySelector('input[name=notifyEmail]') as HTMLInputElement;
    campo.value = 'no-es-correo';
    campo.dispatchEvent(new Event('input'));
    p.fixture.detectChanges();
    await p.pulsar(p.boton('Guardar'));
    expect(p.texto()).toContain('Ese correo no es válido.');
  });
});
