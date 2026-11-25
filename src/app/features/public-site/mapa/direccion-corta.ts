/**
 * La dirección de un sitio, dicha como la diría una persona.
 *
 * El buscador del panel rellena la dirección con todo lo que sabe el mapa:
 * «Castillo de San Marcos, Plaza Alfonso X el Sabio, Sudamérica, El Puerto de
 * Santa María, Bahía de Cádiz, Cádiz, Andalucía, 11500, España». Para el
 * invitado sobra casi todo: lo que necesita es **el sitio, la calle y la
 * localidad**.
 *
 * Se quita lo de detrás (país, código postal y comunidad autónoma) y, de lo que
 * queda, se toma el nombre del sitio, la calle y el municipio. El municipio no
 * es siempre el último trozo: entre él y la comunidad suelen colarse la
 * comarca y la provincia («…, El Puerto de Santa María, **Bahía de Cádiz**,
 * Cádiz») y el barrio («…, Triana, Sevilla»). La pista que usa: una comarca
 * lleva dentro el nombre de la provincia, así que si el penúltimo trozo
 * contiene al último, esos dos sobran.
 *
 * Una dirección que no se reconoce —escrita a mano, corta, de fuera de
 * España— se deja tal cual: es mejor enseñarla entera que acortarla mal.
 */

const COMUNIDADES = [
  'andalucia',
  'aragon',
  'asturias',
  'principado de asturias',
  'illes balears',
  'islas baleares',
  'canarias',
  'cantabria',
  'castilla y leon',
  'castilla-la mancha',
  'castilla la mancha',
  'cataluna',
  'catalunya',
  'comunitat valenciana',
  'comunidad valenciana',
  'extremadura',
  'galicia',
  'la rioja',
  'comunidad de madrid',
  'madrid',
  'region de murcia',
  'murcia',
  'navarra',
  'comunidad foral de navarra',
  'pais vasco',
  'euskadi',
  'ceuta',
  'melilla',
];

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function direccionCorta(direccion: string): string {
  const original = direccion.trim();
  const partes = original
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '');

  if (partes.length < 4) return original;

  let fin = partes.length;
  if (['espana', 'spain'].includes(normalizar(partes[fin - 1]!))) fin--;
  if (/^\d{4,5}$/.test(partes[fin - 1]!)) fin--;
  if (!COMUNIDADES.includes(normalizar(partes[fin - 1]!))) return original;
  fin--;

  const cuerpo = partes.slice(0, fin);
  if (cuerpo.length <= 3) return cuerpo.join(', ');

  const [lugar, calle, ...resto] = cuerpo as [string, string, ...string[]];
  const ultimo = resto[resto.length - 1]!;
  const penultimo = resto[resto.length - 2];
  const hayComarca =
    resto.length >= 3 &&
    penultimo !== undefined &&
    normalizar(penultimo).includes(normalizar(ultimo));
  const localidad = hayComarca ? resto[resto.length - 3]! : ultimo;

  return [lugar, calle, localidad].join(', ');
}
