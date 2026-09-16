/**
 * Preparar una foto antes de subirla.
 *
 * Una foto de portada sale del móvil de la pareja con 4000 px de ancho y seis
 * megas. Esa foto la descarga **cada invitado**, muchos con datos móviles y mala
 * cobertura, para verla a 400 px de ancho en una pantalla de teléfono. Subirla
 * tal cual es cobrarle a doscientas personas un peaje que no hacía falta.
 *
 * Se reduce en el navegador antes de subir, no en el servidor: así no se sube
 * nunca el original, que es donde está el gasto de verdad —el de la pareja, en
 * su conexión, mientras mira una barra de progreso—.
 */

/** Ancho máximo del lado largo. Suficiente para una portada a pantalla completa. */
export const LADO_MAXIMO = 2000;

/** Calidad del JPEG. Por encima de 0,85 el fichero crece y el ojo no lo nota. */
export const CALIDAD = 0.82;

/**
 * A qué tamaño hay que dejar una imagen de `ancho`×`alto`.
 *
 * Nunca la agranda: una foto pequeña se sube tal cual. Estirarla no añade
 * detalle, solo peso y desenfoque.
 */
export function dimensionesDestino(
  ancho: number,
  alto: number,
  maximo = LADO_MAXIMO,
): { ancho: number; alto: number } {
  if (ancho <= 0 || alto <= 0) return { ancho: 0, alto: 0 };

  const lado = Math.max(ancho, alto);
  if (lado <= maximo) return { ancho: Math.round(ancho), alto: Math.round(alto) };

  const factor = maximo / lado;
  return { ancho: Math.round(ancho * factor), alto: Math.round(alto * factor) };
}

/** Extensión de fichero para el tipo con el que se sube. */
export const TIPO_SALIDA = 'image/jpeg';

/**
 * Reduce la imagen y la devuelve como JPEG.
 *
 * Si algo falla —un formato que el navegador no sabe decodificar, por
 * ejemplo— devuelve el fichero original. Las reglas de Storage ya limitan tipo
 * y tamaño, así que el peor caso es una foto grande, no un fallo en la cara de
 * la pareja.
 */
export async function reducir(fichero: File, maximo = LADO_MAXIMO): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(fichero);
    const destino = dimensionesDestino(bitmap.width, bitmap.height, maximo);

    if (destino.ancho === bitmap.width && destino.alto === bitmap.height) {
      bitmap.close();
      return fichero;
    }

    const lienzo = document.createElement('canvas');
    lienzo.width = destino.ancho;
    lienzo.height = destino.alto;

    const contexto = lienzo.getContext('2d');
    if (!contexto) {
      bitmap.close();
      return fichero;
    }

    contexto.drawImage(bitmap, 0, 0, destino.ancho, destino.alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, TIPO_SALIDA, CALIDAD),
    );
    return blob ?? fichero;
  } catch {
    return fichero;
  }
}
