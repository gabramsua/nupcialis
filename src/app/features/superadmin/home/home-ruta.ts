import type { ContenidoHome, ImagenHome } from '../../home/home';

/**
 * Lo mínimo para editar un árbol de contenido por «ruta con puntos»
 * (`hero.cta.label`, `promesa.items.2.title`) sin escribir un manejador por campo.
 *
 * Todo es inmutable: devuelve copias, no toca lo que recibe. Las pantallas
 * guardan el borrador en una señal, y mutarlo en sitio dejaría la señal sin
 * enterarse.
 */

type Nodo = Record<string, unknown> | unknown[];

function trozos(ruta: string): string[] {
  return ruta === '' ? [] : ruta.split('.');
}

export function leerEn(raiz: unknown, ruta: string): unknown {
  let actual: unknown = raiz;
  for (const t of trozos(ruta)) {
    if (actual === null || typeof actual !== 'object') return undefined;
    actual = (actual as Record<string, unknown>)[t];
  }
  return actual;
}

/** Una copia de `raiz` con `valor` puesto en `ruta`. Si la ruta no existe, devuelve la raíz intacta. */
export function ponerEn<T>(raiz: T, ruta: string, valor: unknown): T {
  const partes = trozos(ruta);
  if (partes.length === 0) return valor as T;

  const [cabeza, ...resto] = partes;
  if (raiz === null || typeof raiz !== 'object') return raiz;

  const nodo = raiz as Nodo;
  if (Array.isArray(nodo)) {
    const i = Number(cabeza);
    if (!Number.isInteger(i) || i < 0 || i >= nodo.length) return raiz;
    const nuevo = ponerEn(nodo[i], resto.join('.'), valor);
    if (nuevo === nodo[i]) return raiz;
    const copia = [...nodo];
    copia[i] = nuevo;
    return copia as T;
  }
  const clave = cabeza as string;
  if (!(clave in nodo)) return raiz;
  const nuevo = ponerEn(nodo[clave], resto.join('.'), valor);
  if (nuevo === nodo[clave]) return raiz;
  return { ...nodo, [clave]: nuevo } as T;
}

/** Cambia la lista que hay en `ruta` con `cambio`. Si no es una lista, no hace nada. */
export function cambiarLista<T>(
  raiz: T,
  ruta: string,
  cambio: (lista: readonly unknown[]) => readonly unknown[],
): T {
  const actual = leerEn(raiz, ruta);
  if (!Array.isArray(actual)) return raiz;
  return ponerEn(raiz, ruta, cambio(actual));
}

export function moverEn<E>(lista: readonly E[], desde: number, hacia: number): readonly E[] {
  if (desde === hacia || desde < 0 || hacia < 0 || desde >= lista.length || hacia >= lista.length) {
    return lista;
  }
  const copia = [...lista];
  const [uno] = copia.splice(desde, 1);
  copia.splice(hacia, 0, uno!);
  return copia;
}

/** Las imágenes de la HOME que están en Storage (las de serie no tienen `path`). */
export function rutasDeImagenes(contenido: ContenidoHome): ReadonlySet<string> {
  const imagenes: (ImagenHome | null)[] = [
    contenido.hero.image,
    contenido.paneles.basico.image,
    contenido.paneles.extendido.image,
  ];
  return new Set(imagenes.flatMap((i) => (i !== null && i.path !== '' ? [i.path] : [])));
}
