import { sanearHistoria, type ApartadoPublicoDeHistoria } from './historia';

/**
 * Lo que la proyección pública trae de «Nuestra historia», con la forma
 * comprobada. El HTML ya viene saneado del servidor (regla de oro 5); aquí solo
 * se asegura que sean los cinco apartados y que las fotos sean URLs de Storage.
 *
 * Si no hay nada que enseñar devuelve `[]`: la página lo trata como «aún no».
 */
export function historiaPublicada(valor: unknown): readonly ApartadoPublicoDeHistoria[] {
  if (!Array.isArray(valor) || valor.length === 0) return [];

  // La proyección es una lista; `sanearHistoria` espera un objeto por clave.
  const porClave: Record<string, unknown> = {};
  for (const elemento of valor) {
    if (elemento !== null && typeof elemento === 'object') {
      const e = elemento as Record<string, unknown>;
      if (typeof e['clave'] === 'string') porClave[e['clave']] = e;
    }
  }

  return sanearHistoria(porClave).map((a) => ({
    clave: a.clave,
    html: a.html,
    fotos: a.fotos.map((f) => ({ url: f.url })),
  }));
}
