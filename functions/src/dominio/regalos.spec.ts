import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  bizumValido,
  hayAportacion,
  ibanEnGrupos,
  ibanValido,
  puedeReservar,
  puedeSoltar,
  resumenDeRegalos,
  sanearAportacion,
  sanearRegalos,
  sanearRegalosServidos,
} from './regalos';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de los regalos', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./regalos.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/regalos/regalos.ts'),
    );
  });
});

/**
 * El IBAN con módulo 97.
 *
 * Es la comprobación que más puede llegar a ahorrar de todo el fichero: un
 * dígito mal en el IBAN publicado y el dinero de la boda acaba rebotado o, con
 * mala suerte, en la cuenta de otro.
 */
describe('el IBAN', () => {
  it('acepta uno bueno y lo deja sin espacios', () => {
    expect(ibanValido('ES91 2100 0418 4502 0005 1332')).toBe('ES9121000418450200051332');
  });

  it('acepta uno escrito en minúsculas y con guiones', () => {
    expect(ibanValido('es91-2100-0418-4502-0005-1332')).toBe('ES9121000418450200051332');
  });

  it('rechaza uno con un dígito cambiado', () => {
    expect(ibanValido('ES91 2100 0418 4502 0005 1333')).toBeNull();
  });

  it('rechaza lo que ni siquiera tiene forma de IBAN', () => {
    expect(ibanValido('mi cuenta de siempre')).toBeNull();
    expect(ibanValido('')).toBeNull();
    expect(ibanValido(42)).toBeNull();
  });

  it('se lee en grupos de cuatro, que es como se teclea', () => {
    expect(ibanEnGrupos('ES9121000418450200051332')).toBe('ES91 2100 0418 4502 0005 1332');
  });
});

describe('el Bizum', () => {
  it('se queda con los nueve dígitos, venga como venga', () => {
    expect(bizumValido('+34 666 11 22 33')).toBe('666112233');
    expect(bizumValido('0034666112233')).toBe('666112233');
    expect(bizumValido('666112233')).toBe('666112233');
  });

  it('rechaza un fijo y un número a medias', () => {
    expect(bizumValido('954112233')).toBeNull();
    expect(bizumValido('66611223')).toBeNull();
  });
});

describe('la aportación', () => {
  it('se queda con lo que vale y tira lo que no', () => {
    const a = sanearAportacion({
      iban: 'ES91 2100 0418 4502 0005 1332',
      titular: '  María Pérez  ',
      bizum: 'no tengo',
      mensaje: 'Si queréis regalarnos algo…',
    });

    expect(a.iban).toBe('ES9121000418450200051332');
    expect(a.titular).toBe('María Pérez');
    expect(a.bizum).toBeNull();
    expect(a.mensaje).toBe('Si queréis regalarnos algo…');
  });

  it('vacía no se enseña', () => {
    expect(hayAportacion(sanearAportacion({}))).toBe(false);
    expect(hayAportacion(sanearAportacion({ mensaje: 'Gracias por venir' }))).toBe(true);
  });
});

function regalo(parcial: Record<string, unknown> = {}) {
  return {
    id: 'cafetera',
    titulo: 'Una cafetera decente',
    descripcion: 'La nuestra tiene quince años.',
    precio: 120,
    enlace: 'tienda.example/cafetera',
    enabled: true,
    order: 1,
    ...parcial,
  };
}

describe('la lista de regalos', () => {
  it('se cae lo que no tiene título o está apagado', () => {
    const lista = sanearRegalos([
      regalo(),
      regalo({ id: 'sin-titulo', titulo: '' }),
      regalo({ id: 'apagado', enabled: false }),
    ]);

    expect(lista.map((r) => r.id)).toEqual(['cafetera']);
  });

  it('un enlace que no es http no se publica', () => {
    const [r] = sanearRegalos([regalo({ enlace: 'javascript:alert(1)' })]);
    expect(r.enlace).toBeNull();
  });

  /** Lo que §8.8 pide: la reserva es anónima para el resto de invitados. */
  it('dice que está reservado, pero nunca quién', () => {
    const [r] = sanearRegalos([regalo({ reservedBy: 'g9' })], 'g1');

    expect(r.reservado).toBe(true);
    expect(r.esMio).toBe(false);
    expect(JSON.stringify(r)).not.toContain('g9');
  });

  it('a cada uno le marca la suya', () => {
    const [mia] = sanearRegalos([regalo({ reservedBy: 'g1' })], 'g1');
    expect(mia.esMio).toBe(true);
  });

  it('sin saber quién pregunta, nada es de nadie', () => {
    const [r] = sanearRegalos([regalo({ reservedBy: 'g1' })]);
    expect(r.reservado).toBe(true);
    expect(r.esMio).toBe(false);
  });

  /**
   * Quien entra a elegir regalo quiere ver lo que puede coger, no una lista
   * que empieza con cuatro cosas tachadas.
   */
  it('pone lo libre delante y lo cogido al final', () => {
    const lista = sanearRegalos(
      [
        regalo({ id: 'a', order: 1, reservedBy: 'g9' }),
        regalo({ id: 'b', order: 2 }),
        regalo({ id: 'c', order: 3, reservedBy: 'g1' }),
      ],
      'g1',
    );

    expect(lista.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('cuenta cuántos quedan libres', () => {
    const lista = sanearRegalos([regalo({ id: 'a' }), regalo({ id: 'b', reservedBy: 'g9' })]);

    expect(resumenDeRegalos(lista)).toEqual({ total: 2, libres: 1, reservados: 1 });
  });

  /**
   * La otra forma: lo que vuelve del servidor, que ya no lleva `reservedBy`.
   * Si el cliente saneara con la del documento, vería toda la lista libre.
   */
  it('lo servido conserva reservado y esMio, que es lo único que trae', () => {
    const [r] = sanearRegalosServidos([
      { id: 'a', titulo: 'Una cafetera', reservado: true, esMio: true, precio: 120 },
    ]);

    expect(r.reservado).toBe(true);
    expect(r.esMio).toBe(true);
    expect(r.precio).toBe(120);
  });

  it('lo servido no deja que nada sea mío sin estar reservado', () => {
    const [r] = sanearRegalosServidos([{ id: 'a', titulo: 'Una cafetera', esMio: true }]);

    expect(r.reservado).toBe(false);
    expect(r.esMio).toBe(false);
  });

  it('lo servido también tira un enlace que no es http', () => {
    const [r] = sanearRegalosServidos([
      { id: 'a', titulo: 'Una cafetera', enlace: 'javascript:alert(1)' },
    ]);

    expect(r.enlace).toBeNull();
  });

  it('no deja reservar lo cogido ni soltar lo ajeno', () => {
    expect(puedeReservar({ reservado: false })).toBe(true);
    expect(puedeReservar({ reservado: true })).toBe(false);
    expect(puedeSoltar({ reservado: true, esMio: true })).toBe(true);
    expect(puedeSoltar({ reservado: true, esMio: false })).toBe(false);
    expect(puedeSoltar({ reservado: false, esMio: false })).toBe(false);
  });
});
