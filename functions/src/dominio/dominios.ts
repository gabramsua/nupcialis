/**
 * Dominios autorizados de Firebase Auth.
 *
 * Firebase Auth mantiene una lista blanca de dominios desde los que acepta un
 * inicio de sesión, y **no admite comodines**: `*.nupcialis.com` no vale ahí,
 * aunque el DNS y el certificado sí sean wildcard. Cada boda nueva estrena
 * subdominio, así que cada alta tiene que añadir el suyo a esa lista.
 *
 * Si este paso falla en silencio, el alta parece correcta: la web carga, el
 * panel carga, y el fallo solo aparece cuando la pareja pulsa "entrar con
 * Google" —posiblemente días después—. Ver la regla 8 de CLAUDE.md.
 */

export function dominioDeBoda(slug: string, dominioBase: string): string {
  return `${slug}.${dominioBase}`;
}

/**
 * Umbral de aviso del número de dominios autorizados.
 *
 * Firebase **no publica** el límite de esta lista, así que no sabemos dónde
 * está el muro; solo que existe. El día que se alcance, el alta de bodas nuevas
 * dejará de funcionar, y será un fallo silencioso como el de la regla 8. Por
 * eso se cuenta y se avisa mucho antes, con tiempo para ejecutar el plan B
 * —mover el panel a `app.nupcialis.com` y resolver la boda por el claim—.
 * Ver REQUISITOS §11.
 */
export const AVISO_DOMINIOS = 500;

/** Aviso para el superadmin cuando la lista se acerca al tope. `null` si sobra sitio. */
export function avisoDeCupo(total: number): string | null {
  if (total < AVISO_DOMINIOS) return null;
  return (
    `Hay ${total} dominios autorizados en Firebase Auth. El límite no está ` +
    'documentado: toca ejecutar el plan B antes de que el alta de bodas empiece a fallar.'
  );
}

export interface CambioDominios {
  readonly cambia: boolean;
  readonly dominios: readonly string[];
}

/**
 * Añade el dominio a la lista si falta. Idempotente a propósito.
 *
 * El API de Identity Toolkit no tiene "añadir": solo sabe reemplazar la lista
 * entera. Eso convierte cualquier reintento en una carrera —dos altas
 * simultáneas leen la misma lista y la segunda escribe sin el dominio de la
 * primera—, así que la escritura solo se hace si algo cambia y el reintento de
 * un alta que ya pasó por aquí no toca nada.
 */
export function conDominio(actuales: readonly string[], dominio: string): CambioDominios {
  const normalizado = dominio.trim().toLowerCase();
  const lista = actuales.map((d) => d.trim().toLowerCase()).filter((d) => d !== '');

  if (normalizado === '' || lista.includes(normalizado)) {
    return { cambia: false, dominios: lista };
  }
  return { cambia: true, dominios: [...lista, normalizado] };
}

/** Quita el dominio de una boda archivada. Misma prudencia que al añadir. */
export function sinDominio(actuales: readonly string[], dominio: string): CambioDominios {
  const normalizado = dominio.trim().toLowerCase();
  const lista = actuales.map((d) => d.trim().toLowerCase()).filter((d) => d !== '');

  if (!lista.includes(normalizado)) return { cambia: false, dominios: lista };
  return { cambia: true, dominios: lista.filter((d) => d !== normalizado) };
}
