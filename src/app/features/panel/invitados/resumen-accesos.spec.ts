import { describe, expect, it } from 'vitest';

import type { EntradaDeAcceso } from '../../../core/invitados/accesos-gateway';
import { AVISO_DISPOSITIVOS, agruparPorDia, quien, resumirAccesos } from './resumen-accesos';

/**
 * Lo que se vigila aquí, por orden de lo que costaría si se rompe:
 *
 * 1. **Que el aviso de «varios aparatos» no acuse a quien no toca.** Es lo
 *    único de esta pantalla que puede hacer que la pareja llame a alguien a
 *    preguntarle si ha reenviado su invitación.
 * 2. **Que el día se calcule en la hora del que mira.** Una entrada de las
 *    once y media de la noche tiene que salir en «hoy», no en «mañana».
 */

let contador = 0;

function entrada(parcial: Partial<EntradaDeAcceso> = {}): EntradaDeAcceso {
  contador += 1;
  return {
    id: `e${contador}`,
    guestId: 'g1',
    nombre: 'María José Pérez',
    mote: '',
    modo: 'enlace',
    dispositivo: 'Android · Chrome',
    cuando: '2026-11-13T10:00:00.000Z',
    ...parcial,
  };
}

describe('quien', () => {
  it('el mote manda: es como lo llama la pareja', () => {
    expect(quien(entrada({ mote: 'Marijose' }))).toBe('Marijose');
  });

  it('sin mote, el nombre', () => {
    expect(quien(entrada())).toBe('María José Pérez');
  });

  /** Un invitado borrado después de entrar deja su línea sin nombre. */
  it('de un invitado que ya no existe no se inventa un nombre', () => {
    expect(quien(entrada({ nombre: '', mote: '' }))).toBe('');
  });
});

describe('resumirAccesos', () => {
  it('cuenta entradas e invitados distintos, no una cosa por otra', () => {
    const resumen = resumirAccesos([
      entrada({ guestId: 'g1' }),
      entrada({ guestId: 'g1' }),
      entrada({ guestId: 'g2' }),
    ]);

    expect(resumen.entradas).toBe(3);
    expect(resumen.invitados).toBe(2);
  });

  it('avisa del invitado que entra desde tres aparatos distintos', () => {
    const resumen = resumirAccesos([
      entrada({ guestId: 'g1', dispositivo: 'iPhone · Safari' }),
      entrada({ guestId: 'g1', dispositivo: 'Android · Chrome' }),
      entrada({ guestId: 'g1', dispositivo: 'Windows · Edge' }),
    ]);

    expect(resumen.avisos).toEqual([
      {
        guestId: 'g1',
        nombre: 'María José Pérez',
        dispositivos: ['Android · Chrome', 'iPhone · Safari', 'Windows · Edge'],
      },
    ]);
  });

  /**
   * El móvil y el ordenador de casa son dos aparatos, y los tiene cualquiera.
   * Un aviso que salta siempre no lo lee nadie.
   */
  it('con dos aparatos no avisa de nada', () => {
    const resumen = resumirAccesos([
      entrada({ dispositivo: 'iPhone · Safari' }),
      entrada({ dispositivo: 'Windows · Edge' }),
      entrada({ dispositivo: 'Windows · Edge' }),
    ]);

    expect(resumen.avisos).toEqual([]);
    expect(AVISO_DISPOSITIVOS).toBe(3);
  });

  /**
   * Lo que no puede pasar: que un `user-agent` que no se deja reconocer cuente
   * como «otro aparato» y acabe acusando a alguien.
   */
  it('los aparatos sin reconocer no cuentan, por muchos que sean', () => {
    const resumen = resumirAccesos([
      entrada({ dispositivo: 'iPhone · Safari' }),
      entrada({ dispositivo: '' }),
      entrada({ dispositivo: '' }),
      entrada({ dispositivo: '' }),
    ]);

    expect(resumen.avisos).toEqual([]);
  });

  it('el mismo aparato veinte veces sigue siendo un aparato', () => {
    const veinte = Array.from({ length: 20 }, () => entrada({ dispositivo: 'iPhone · Safari' }));

    expect(resumirAccesos(veinte).avisos).toEqual([]);
    expect(resumirAccesos(veinte).entradas).toBe(20);
  });

  it('primero el que más aparatos acumula', () => {
    const resumen = resumirAccesos([
      entrada({ guestId: 'g1', dispositivo: 'iPhone · Safari' }),
      entrada({ guestId: 'g1', dispositivo: 'Android · Chrome' }),
      entrada({ guestId: 'g1', dispositivo: 'Windows · Edge' }),
      entrada({ guestId: 'g2', dispositivo: 'iPhone · Safari' }),
      entrada({ guestId: 'g2', dispositivo: 'Android · Chrome' }),
      entrada({ guestId: 'g2', dispositivo: 'Windows · Edge' }),
      entrada({ guestId: 'g2', dispositivo: 'Mac · Chrome' }),
    ]);

    expect(resumen.avisos.map((a) => a.guestId)).toEqual(['g2', 'g1']);
  });

  it('sin entradas no hay nada que contar y no revienta', () => {
    expect(resumirAccesos([])).toEqual({ entradas: 0, invitados: 0, avisos: [] });
  });
});

describe('agruparPorDia', () => {
  /** Las fechas se escriben en local a propósito: es lo que ve quien mira. */
  const ahora = new Date(2026, 10, 13, 12, 0, 0);
  const local = (dia: number, hora: number, minuto = 0) =>
    new Date(2026, 10, dia, hora, minuto).toISOString();

  it('hoy, ayer y el resto con su fecha', () => {
    const grupos = agruparPorDia(
      [
        entrada({ cuando: local(13, 9) }),
        entrada({ cuando: local(12, 20) }),
        entrada({ cuando: local(3, 18) }),
      ],
      ahora,
    );

    expect(grupos.map((g) => g.dia.cuando)).toEqual(['hoy', 'ayer', 'fecha']);
  });

  it('lo más reciente primero, dentro del día también', () => {
    const grupos = agruparPorDia(
      [
        entrada({ id: 'vieja', cuando: local(13, 9) }),
        entrada({ id: 'nueva', cuando: local(13, 11) }),
        entrada({ id: 'anteayer', cuando: local(11, 11) }),
      ],
      ahora,
    );

    expect(grupos[0].entradas.map((e) => e.id)).toEqual(['nueva', 'vieja']);
    expect(grupos[1].entradas.map((e) => e.id)).toEqual(['anteayer']);
  });

  /**
   * El día se parte por la medianoche **del que mira**. Calcularlo sobre la
   * cadena ISO, que es UTC, mandaría las entradas de última hora al día
   * siguiente para cualquiera al este de Greenwich.
   */
  it('las once y media de la noche siguen siendo hoy', () => {
    const grupos = agruparPorDia(
      [entrada({ cuando: local(13, 23, 30) })],
      new Date(2026, 10, 13, 23, 45),
    );

    expect(grupos).toHaveLength(1);
    expect(grupos[0].dia.cuando).toBe('hoy');
  });

  it('sin entradas, ningún grupo', () => {
    expect(agruparPorDia([], ahora)).toEqual([]);
  });
});
