import { describe, expect, it } from 'vitest';

import type { Invitado } from '../../../core/invitados/invitados-gateway';
import { INVITADO_DE_PRUEBA } from '../invitados/dobles.testing';
import { BODA_DE_PRUEBA } from '../boda.testing';
import type { BodaDelPanel } from '../boda';
import { cifras, diasParaLaBoda, pendientes } from './pendientes';

/**
 * La primera pantalla del panel.
 *
 * Lo que se vigila:
 *
 * 1. **Que lo que falta salga en el orden en que hay que hacerlo.** Es una
 *    lista para actuar, no un inventario de quejas.
 * 2. **Que con la lista de invitados vacía no se amontonen avisos** que dicen
 *    lo mismo: nadie ha entrado, nadie ha contestado, nadie ha hecho nada.
 * 3. **Que las cifras cuenten lo que dicen contar**, que es lo único que la
 *    pareja va a mirar todos los días.
 */

function invitado(parcial: Partial<Invitado>): Invitado {
  return { ...INVITADO_DE_PRUEBA, ...parcial };
}

function boda(parcial: Partial<BodaDelPanel> = {}): BodaDelPanel {
  // Extendido por defecto: es el plan que lleva lista de invitados.
  return { ...BODA_DE_PRUEBA, plan: 'extended', ...parcial };
}

/** Una boda ya montada: con fecha, publicada, con portada y sin módulos ocultos. */
const LISTA = boda({ heroImageUrl: 'https://ejemplo/portada.jpg' });

describe('cifras', () => {
  it('cuenta confirmados, pendientes y cuántos han abierto la web', () => {
    const cuenta = cifras([
      invitado({ id: '1', rsvpStatus: 'confirmed', loginCount: 3 }),
      invitado({ id: '2', rsvpStatus: 'pending', loginCount: 1 }),
      invitado({ id: '3', rsvpStatus: 'declined', loginCount: 0 }),
    ]);

    expect(cuenta).toEqual({
      invitados: 3,
      confirmados: 1,
      sinContestar: 1,
      hanEntrado: 2,
      contestados: 2,
    });
  });

  it('sin invitados son ceros, no huecos', () => {
    expect(cifras([])).toEqual({
      invitados: 0,
      confirmados: 0,
      sinContestar: 0,
      hanEntrado: 0,
      contestados: 0,
    });
  });
});

describe('pendientes', () => {
  it('sin boda cargada todavía, nada que decir', () => {
    expect(pendientes(null, [])).toEqual([]);
  });

  /**
   * Con la lista vacía, lo único que hay que hacer es cargarla. Decir además
   * que nadie ha entrado y que nadie ha contestado es verdad y es ruido.
   */
  it('sin invitados, solo pide cargarlos', () => {
    const lista = pendientes(LISTA, []);

    expect(lista.map((p) => p.clave)).toEqual(['invitados']);
  });

  it('una boda sin fecha y en borrador pide primero eso', () => {
    const lista = pendientes(boda({ weddingDate: null, status: 'draft' }), []);

    expect(lista.map((p) => p.clave)).toEqual(['fecha', 'publicar', 'invitados']);
  });

  it('avisa de a cuántos les falta abrir la invitación y de cuántos no contestan', () => {
    const lista = pendientes(LISTA, [
      invitado({ id: '1', rsvpStatus: 'confirmed', loginCount: 2 }),
      invitado({ id: '2', rsvpStatus: 'pending', loginCount: 0 }),
      invitado({ id: '3', rsvpStatus: 'pending', loginCount: 0 }),
    ]);

    expect(lista.map((p) => [p.clave, p.cuantos])).toEqual([
      ['sin-entrar', 2],
      ['sin-contestar', 2],
    ]);
  });

  /** El aviso que explica por qué la web parece vacía. */
  it('cuenta los módulos encendidos que el invitado no ve', () => {
    const conOcultos = boda({
      heroImageUrl: 'https://ejemplo/portada.jpg',
      modulos: {
        publicSite: { enabled: true, visibility: 'visible' },
        rsvp: { enabled: true, visibility: 'hidden' },
        map: { enabled: true, visibility: 'soon' },
      },
    });

    const lista = pendientes(conOcultos, [invitado({ loginCount: 1, rsvpStatus: 'confirmed' })]);

    expect(lista.find((p) => p.clave === 'ocultos')?.cuantos).toBe(2);
  });

  it('sin portada lo dice, que es la primera pantalla de la web', () => {
    const lista = pendientes(boda({ heroImageUrl: null }), [
      invitado({ loginCount: 1, rsvpStatus: 'confirmed' }),
    ]);

    expect(lista.map((p) => p.clave)).toContain('portada');
  });

  /** Una boda hecha del todo no tiene por qué inventarse deberes. */
  it('cuando no falta nada, la lista se queda vacía', () => {
    const lista = pendientes(LISTA, [invitado({ loginCount: 1, rsvpStatus: 'confirmed' })]);

    expect(lista).toEqual([]);
  });

  it('todo lo que sale lleva a alguna pantalla', () => {
    const lista = pendientes(boda({ weddingDate: null, status: 'draft', heroImageUrl: null }), [
      invitado({ loginCount: 0, rsvpStatus: 'pending' }),
    ]);

    expect(lista.length).toBeGreaterThan(3);
    for (const pendiente of lista) {
      expect(pendiente.ruta.startsWith('/panel')).toBe(true);
    }
  });
});

describe('diasParaLaBoda', () => {
  const hoy = new Date(2026, 10, 13, 10, 0);

  it('cuenta días enteros, no horas', () => {
    expect(diasParaLaBoda(new Date('2026-11-20T00:00:00.000Z'), hoy)).toBe(7);
  });

  it('hoy es cero', () => {
    expect(diasParaLaBoda(new Date('2026-11-13T00:00:00.000Z'), hoy)).toBe(0);
  });

  /** El panel sigue abierto después de la boda: hay que saber decirlo. */
  it('una boda que ya pasó da negativo', () => {
    expect(diasParaLaBoda(new Date('2026-11-10T00:00:00.000Z'), hoy)).toBe(-3);
  });

  it('sin fecha, nada', () => {
    expect(diasParaLaBoda(null, hoy)).toBeNull();
    expect(diasParaLaBoda(new Date('no es una fecha'), hoy)).toBeNull();
  });

  /** El básico no tiene lista de invitados (D-66): nada de eso se le reclama. */
  it('en el plan básico no pide cargar invitados ni cuenta quién no ha entrado', () => {
    const basica = boda({ plan: 'basic', heroImageUrl: null });

    expect(pendientes(basica, []).map((p) => p.clave)).toEqual(['portada']);
    expect(
      pendientes(basica, [invitado({ loginCount: 0, rsvpStatus: 'pending' })]).map((p) => p.clave),
    ).toEqual(['portada']);
  });

  it('en el plan extendido sigue pidiendo la lista', () => {
    expect(pendientes(boda(), []).map((p) => p.clave)).toContain('invitados');
  });
});
