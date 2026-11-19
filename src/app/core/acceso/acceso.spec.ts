import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  MODOS_ACCESO,
  NIVELES,
  esModoAcceso,
  esNivel,
  minutosDeEspera,
  pideIdentificarse,
  puedeHacer,
} from './acceso';

describe('los modos de acceso', () => {
  /**
   * La lista vive en dos paquetes, porque `functions/` es otro proyecto y el
   * cliente no importa de él. Si se separaran, la pareja podría elegir en el
   * panel un modo que el servidor rechaza, o al revés.
   */
  it('son exactamente los mismos que conoce el servidor', () => {
    const servidor = readFileSync('functions/src/dominio/acceso.ts', 'utf8');
    const declarados = servidor.match(/export type ModoAcceso =\s*([^;]+);/)?.[1] ?? '';
    const modos = [...declarados.matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);

    expect(modos).toEqual([...MODOS_ACCESO]);
  });

  it('solo esos tres valen', () => {
    expect(MODOS_ACCESO.every(esModoAcceso)).toBe(true);
    expect(esModoAcceso('abierta')).toBe(false);
    expect(esModoAcceso(null)).toBe(false);
  });

  it('solo la boda abierta deja pasar sin preguntar', () => {
    expect(pideIdentificarse('open')).toBe(false);
    expect(pideIdentificarse('name_phone4')).toBe(true);
    expect(pideIdentificarse('phone')).toBe(true);
  });
});

describe('minutosDeEspera', () => {
  it('redondea hacia arriba: decir un minuto y seguir bloqueado es peor que decir dos', () => {
    expect(minutosDeEspera(61_000)).toBe(2);
    expect(minutosDeEspera(300_000)).toBe(5);
  });

  it('nunca cero, que se leería como «ya puedes» justo cuando no', () => {
    expect(minutosDeEspera(1)).toBe(1);
    expect(minutosDeEspera(0)).toBe(1);
  });
});

describe('los niveles de sesión (D-34)', () => {
  /** Misma razón que los modos: la lista vive en dos paquetes. */
  it('son exactamente los mismos que conoce el servidor', () => {
    const servidor = readFileSync('functions/src/dominio/acceso.ts', 'utf8');
    const declarados = servidor.match(/export type NivelSesion =\s*([^;]+);/)?.[1] ?? '';
    const niveles = [...declarados.matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);

    expect(niveles).toEqual([...NIVELES]);
  });

  it('y la regla de quién puede actuar, también', () => {
    expect(puedeHacer('name_phone4', 'enlace')).toBe(false);
    expect(puedeHacer('name_phone4', 'verificado')).toBe(true);
    expect(puedeHacer('phone', 'enlace')).toBe(false);
    expect(puedeHacer('open', 'enlace')).toBe(true);
  });

  it('un nivel que no conocemos no vale', () => {
    expect(esNivel('verificado')).toBe(true);
    expect(esNivel('admin')).toBe(false);
    expect(esNivel(undefined)).toBe(false);
  });
});
