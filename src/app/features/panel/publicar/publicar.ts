import type { BodaDelPanel } from '../boda';

/** Lo que falta para poder publicar, con la clave de su texto. */
export type FaltaParaPublicar = 'nombres' | 'fecha' | 'direccion';

/**
 * Lo mismo que comprueba el servidor (`motivosParaNoPublicar`): el servidor es
 * quien decide, esto solo adelanta el aviso para no pulsar y que falle.
 */
export function faltaParaPublicar(boda: BodaDelPanel): readonly FaltaParaPublicar[] {
  const falta: FaltaParaPublicar[] = [];
  if (boda.pareja.partnerA.trim() === '' || boda.pareja.partnerB.trim() === '') {
    falta.push('nombres');
  }
  if (boda.weddingDate === null) falta.push('fecha');
  if (boda.slug.trim() === '') falta.push('direccion');
  return falta;
}
