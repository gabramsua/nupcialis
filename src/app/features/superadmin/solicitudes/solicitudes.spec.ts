import { describe, expect, it } from 'vitest';

import { leerAviso, leerOk, leerSolicitudes, nuevas } from './solicitudes';

describe('leerSolicitudes', () => {
  it('lee la bandeja y el correo de aviso', () => {
    const r = leerSolicitudes({
      notifyEmail: 'g@ejemplo.com',
      solicitudes: [
        {
          id: 'a',
          names: 'Ana y Leo',
          email: 'a@b.com',
          plan: 'basic',
          status: 'new',
          createdAt: 5,
        },
        { id: 'b', names: 'Eva', email: 'e@b.com', plan: 'raro', status: 'inventado' },
      ],
    });
    expect(r?.notifyEmail).toBe('g@ejemplo.com');
    expect(r?.solicitudes).toHaveLength(2);
    expect(r?.solicitudes[1]).toMatchObject({ plan: 'undecided', status: 'new', createdAt: 0 });
    expect(nuevas(r!.solicitudes)).toBe(2);
  });

  it('descarta lo que no tiene id y rechaza una respuesta sin lista', () => {
    expect(leerSolicitudes({ solicitudes: [{ names: 'sin id' }, null, 3] })?.solicitudes).toEqual(
      [],
    );
    expect(leerSolicitudes({})).toBeNull();
    expect(leerSolicitudes(null)).toBeNull();
  });

  it('lee la confirmación de guardar el aviso', () => {
    expect(leerAviso({ ok: true, notifyEmail: 'x@y.com' })).toBe('x@y.com');
    expect(leerAviso({ ok: false })).toBeNull();
    expect(leerOk({ ok: true })).toBe(true);
    expect(leerOk({})).toBeNull();
  });
});
