/**
 * Tipos de `comprueba-plantillas.mjs`, para poder usarlo desde la batería.
 *
 * El script es JavaScript a propósito: corre con Node antes de que nada
 * compile, que es justo cuando hace falta.
 */
export declare function ficheros(directorio: string): string[];
export declare function sospechosos(codigo: string): number[];
export declare function cuantosComentarios(codigo: string): number;
export declare function revisar(raiz?: string): string[];
