import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Toda función del invitado comprueba el nivel de su sesión (D-34).
 *
 * Desde D-34 hay dos niveles: quien ha abierto el enlace y quien ha escrito sus
 * cuatro dígitos. El primero solo puede mirar. Eso lo decide
 * `exigirVerificado`, y el fallo que importa no es que esté mal escrita —tiene
 * su propia prueba— sino **olvidarse de llamarla en la función siguiente**.
 *
 * Esto se comprueba leyendo el código porque no hay otra forma: una función
 * invocable no se puede ejecutar sin Firebase, y el día que alguien añada
 * `submitSongRequest` y no lo compruebe, no habrá ninguna prueba roja.
 *
 * Si una función del invitado de verdad no necesita verificación, se añade a
 * `SIN_VERIFICAR` **con el motivo escrito**. Es una decisión, no un descuido.
 */

const RAIZ = 'src';

/**
 * Funciones del invitado que a propósito no exigen nivel verificado.
 *
 * `guest-login.ts` es el único: ahí se *emiten* las sesiones, así que no puede
 * exigir una que todavía no existe.
 */
const SIN_VERIFICAR: Readonly<Record<string, string>> = {
  'guest-login.ts': 'es quien emite las sesiones: no puede exigir una que aún no existe',
};

function ficheros(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return ficheros(ruta);
    return entrada.name.endsWith('.ts') && !entrada.name.endsWith('.spec.ts') ? [ruta] : [];
  });
}

/** Los ficheros que abren una sesión de invitado y hacen algo con ella. */
const delInvitado = ficheros(RAIZ).filter((fichero) => {
  const codigo = readFileSync(fichero, 'utf8');
  return codigo.includes('exigirInvitado(');
});

describe('las funciones del invitado', () => {
  it('hay alguna que mirar (si no, la rota es esta prueba)', () => {
    expect(delInvitado.length).toBeGreaterThan(0);
  });

  it('comprueban el nivel de la sesión, o dicen por qué no', () => {
    const sinComprobar = delInvitado.filter((fichero) => {
      const nombre = fichero.split('/').pop() ?? '';
      if (nombre in SIN_VERIFICAR) return false;
      return !readFileSync(fichero, 'utf8').includes('exigirVerificado(');
    });

    expect(sinComprobar).toEqual([]);
  });

  /**
   * Una por **puerta**, no una por fichero.
   *
   * La puerta es `exigirInvitado(`: cada vez que una función abre una sesión
   * de invitado, ahí mismo tiene que decidir qué nivel pide. Contar puertas y
   * no invocables es lo correcto por dos motivos: un fichero puede tener
   * invocables que no son del invitado —`clearGallery` es de la pareja y se
   * guarda con `exigirPareja`— y la comprobación puede vivir en un ayudante
   * compartido por dos invocables, como el `quienBorra` de la galería. Lo que
   * no puede pasar nunca es abrir una sesión de invitado y seguir adelante sin
   * mirar su nivel.
   */
  it('una comprobación por cada puerta de invitado', () => {
    const descuadres = delInvitado.flatMap((fichero) => {
      const nombre = fichero.split('/').pop() ?? '';
      if (nombre in SIN_VERIFICAR) return [];

      const codigo = readFileSync(fichero, 'utf8');
      const puertas = [...codigo.matchAll(/exigirInvitado\(/g)].length;
      const comprobaciones = [...codigo.matchAll(/exigirVerificado\(/g)].length;

      return comprobaciones >= puertas ? [] : [`${fichero}: ${comprobaciones}/${puertas}`];
    });

    expect(descuadres).toEqual([]);
  });
});
