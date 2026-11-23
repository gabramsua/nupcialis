import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registrarVisitaWeb } from './visita-web';

describe('registrarVisitaWeb', () => {
  const llamar = vi.fn(async (...datos: { slug: string }[]) => ({ data: datos.length }));
  const crear = vi.fn(() => llamar);

  beforeEach(() => {
    llamar.mockClear();
    crear.mockClear();
    // Un almacén propio: otros ficheros de pruebas tocan el global.
    const datos = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('cuenta una vez por pestaña, aunque se recargue', async () => {
    await registrarVisitaWeb({} as never, 'ana-y-leo', crear);
    await registrarVisitaWeb({} as never, 'ana-y-leo', crear);

    expect(llamar).toHaveBeenCalledTimes(1);
    expect(llamar).toHaveBeenCalledWith({ slug: 'ana-y-leo' });
  });

  it('un fallo del contador no rompe nada', async () => {
    llamar.mockRejectedValueOnce(new Error('sin red'));
    await expect(registrarVisitaWeb({} as never, 'ana-y-leo', crear)).resolves.toBeUndefined();
  });

  it('sin dirección no llama', async () => {
    await registrarVisitaWeb({} as never, '', crear);
    expect(llamar).not.toHaveBeenCalled();
  });
});
