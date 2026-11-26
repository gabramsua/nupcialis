import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Ningún servicio de raíz puede depender de Firebase.
 *
 * Nace de una web pública en blanco. `SesionInvitado` llevaba
 * `providedIn: 'root'` e inyectaba `FIREBASE_FUNCTIONS`; como los servicios de
 * Firebase se proveen **por ruta** (ver CLAUDE.md), en el inyector de raíz ese
 * token no existe y Angular tiraba un `NG0201` que dejaba la página vacía. Ni
 * el `build` ni las 336 pruebas de entonces dijeron nada: la inyección se
 * resuelve en tiempo de ejecución, y los tests de pantalla doblaban el
 * servicio, así que nunca llegaba a construirse de verdad.
 *
 * Esto se comprueba leyendo el código y no montando nada, porque en un `TestBed`
 * los `providers` van al inyector de entorno —que hace de raíz—, así que un
 * servicio mal declarado se resuelve igual y el fallo no aparece.
 */

const RAIZ = 'src/app';

/** Los tokens que solo existen dentro de la ruta que los provee. */
const TOKENS_DE_RUTA = [
  'FIREBASE_APP',
  'FIREBASE_FUNCTIONS',
  'FIREBASE_AUTH',
  'FIRESTORE',
  'FIREBASE_STORAGE',
  'NP_ICON_SPRITE',
];

function ficheros(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return ficheros(ruta);
    return entrada.name.endsWith('.ts') && !entrada.name.endsWith('.spec.ts') ? [ruta] : [];
  });
}

/** Trocea el fichero por declaración de clase, para no mezclar unas con otras. */
function clases(codigo: string): { nombre: string; decorador: string; cuerpo: string }[] {
  const partes = codigo.split(/(?=@Injectable\()/g).slice(1);

  return partes.map((parte) => {
    const nombre = parte.match(/export class (\w+)/)?.[1] ?? '(anónima)';
    const decorador = parte.slice(0, parte.indexOf('export class'));
    const siguiente = parte.indexOf('export class');
    return { nombre, decorador, cuerpo: siguiente === -1 ? parte : parte.slice(siguiente) };
  });
}

describe('los servicios de raíz', () => {
  const sospechosos = ficheros(RAIZ).flatMap((fichero) => {
    const codigo = readFileSync(fichero, 'utf8');

    return clases(codigo)
      .filter((c) => c.decorador.includes("providedIn: 'root'"))
      .flatMap((c) =>
        TOKENS_DE_RUTA.filter((token) => new RegExp(`inject\\(\\s*${token}\\b`).test(c.cuerpo)).map(
          (token) => `${c.nombre} inyecta ${token} (${fichero})`,
        ),
      );
  });

  it('encuentra servicios que mirar (si no, la rota es esta prueba)', () => {
    const conRaiz = ficheros(RAIZ).filter((f) =>
      readFileSync(f, 'utf8').includes("providedIn: 'root'"),
    );
    expect(conRaiz.length).toBeGreaterThan(0);
  });

  it('no dependen de nada que se provea por ruta', () => {
    expect(sospechosos).toEqual([]);
  });
});
