import { describe, expect, it } from 'vitest';

import { horaDeReloj, instanteDeBoda } from './zona-horaria';

/** Medianoche UTC del día, que es como se guarda `weddingDate`. */
function dia(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe('horaDeReloj', () => {
  it('entiende una hora normal', () => {
    expect(horaDeReloj('17:30')).toEqual({ horas: 17, minutos: 30 });
    expect(horaDeReloj('09:05')).toEqual({ horas: 9, minutos: 5 });
    expect(horaDeReloj('0:00')).toEqual({ horas: 0, minutos: 0 });
  });

  it('rechaza lo que no es una hora', () => {
    for (const basura of ['', '17', '17:5', '25:00', '12:60', 'las cinco', null, 17, {}]) {
      expect(horaDeReloj(basura)).toBeNull();
    }
  });
});

describe('instanteDeBoda', () => {
  it('interpreta la hora en la zona de la boda, no en UTC', () => {
    // 12 de junio: Madrid está en horario de verano, UTC+2.
    const instante = instanteDeBoda(dia('2027-06-12'), '17:00', 'Europe/Madrid');
    expect(instante?.toISOString()).toBe('2027-06-12T15:00:00.000Z');
  });

  it('aplica el horario de invierno cuando toca', () => {
    // 12 de diciembre: Madrid en UTC+1.
    const instante = instanteDeBoda(dia('2027-12-12'), '17:00', 'Europe/Madrid');
    expect(instante?.toISOString()).toBe('2027-12-12T16:00:00.000Z');
  });

  it('acierta también el fin de semana del cambio de hora', () => {
    // En 2027 el cambio en la UE es el 28 de marzo: a las 02:00 se pasa a las
    // 03:00. Una boda a las 17:00 ese día ya va en horario de verano.
    const instante = instanteDeBoda(dia('2027-03-28'), '17:00', 'Europe/Madrid');
    expect(instante?.toISOString()).toBe('2027-03-28T15:00:00.000Z');
  });

  it('funciona en otra zona, que es lo que hace útil guardar la zona', () => {
    expect(instanteDeBoda(dia('2027-06-12'), '17:00', 'America/New_York')?.toISOString()).toBe(
      '2027-06-12T21:00:00.000Z',
    );
    expect(instanteDeBoda(dia('2027-06-12'), '17:00', 'Atlantic/Canary')?.toISOString()).toBe(
      '2027-06-12T16:00:00.000Z',
    );
  });

  it('sin hora fijada cae a la medianoche local, no a la UTC', () => {
    // Este era el fallo: la cuenta atrás contaba hasta las 00:00 UTC, que en
    // Madrid en junio son las dos de la madrugada del día de la boda.
    const instante = instanteDeBoda(dia('2027-06-12'), null, 'Europe/Madrid');
    expect(instante?.toISOString()).toBe('2027-06-11T22:00:00.000Z');
  });

  it('no lanza con una zona inventada: la trata como UTC', () => {
    const instante = instanteDeBoda(dia('2027-06-12'), '17:00', 'Marte/Olympus');
    expect(instante?.toISOString()).toBe('2027-06-12T17:00:00.000Z');
  });

  it('devuelve null sin día', () => {
    expect(instanteDeBoda(null, '17:00', 'Europe/Madrid')).toBeNull();
    expect(instanteDeBoda(new Date('vaya'), '17:00', 'Europe/Madrid')).toBeNull();
  });
});
