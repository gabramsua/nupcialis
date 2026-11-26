import { describe, expect, it } from 'vitest';

import { GRUPOS_ESCAPARATE, INVITADOS_LISTA_ESCAPARATE } from './escaparate-panel';

describe('los invitados de muestra de la captura de la HOME', () => {
  const lista = INVITADOS_LISTA_ESCAPARATE;

  it('son al menos 160, sin nombres repetidos', () => {
    expect(lista.length).toBeGreaterThanOrEqual(160);
    expect(new Set(lista.map((i) => i.fullName)).size).toBe(lista.length);
  });

  it('hay invitados en cada grupo y los tres estados de respuesta', () => {
    for (const g of GRUPOS_ESCAPARATE) {
      expect(
        lista.filter((i) => i.groupIds.includes(g.id)).length,
        `sin invitados en ${g.name}`,
      ).toBeGreaterThan(10);
    }
    for (const estado of ['confirmed', 'pending', 'declined'] as const) {
      expect(lista.filter((i) => i.rsvpStatus === estado).length).toBeGreaterThan(10);
    }
  });

  it('los grupos tienen colores distintos, y los acompañantes cuelgan de un titular que existe', () => {
    expect(new Set(GRUPOS_ESCAPARATE.map((g) => g.color)).size).toBe(GRUPOS_ESCAPARATE.length);
    const ids = new Set(lista.map((i) => i.id));
    const acompanantes = lista.filter((i) => i.isCompanion);
    expect(acompanantes.length).toBeGreaterThan(5);
    for (const a of acompanantes) expect(ids.has(a.invitedById ?? '')).toBe(true);
  });
});
