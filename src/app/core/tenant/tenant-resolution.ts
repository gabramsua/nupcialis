import { SLUGS_RESERVADOS, validarSlug } from './slug';

/**
 * Qué superficie del producto corresponde a un host.
 *
 * Una sola aplicación sirve cuatro cosas distintas y esto es lo que las
 * distingue. Ver docs/REQUISITOS.md §2.4.
 */
export type Superficie =
  /** `mariaygabriel.nupcialis.com` — la web de una boda. */
  | 'boda'
  /** `nupcialis.com` y `www` — la landing comercial. */
  | 'landing'
  /** `admin.nupcialis.com` — el panel de superadmin. */
  | 'superadmin'
  /** Un subdominio reservado que no es ninguna de las anteriores. */
  | 'reservado'
  /** Un host que no cuelga del dominio raíz. No debería pasar. */
  | 'desconocido';

export interface Tenant {
  readonly superficie: Superficie;
  /** Solo cuando la superficie es `boda`. */
  readonly slug: string | null;
}

const SUBDOMINIO_SUPERADMIN = 'admin';

/**
 * Resuelve el host a una superficie y, si procede, a un slug de boda.
 *
 * Función pura: recibe el host, no lo lee de `window`. Así se puede probar sin
 * navegador, que es justo lo que hace falta para no equivocarse aquí.
 *
 * `localhost` se trata como dominio raíz para que en desarrollo funcione
 * `mariaygabriel.localhost:4200`, que los navegadores resuelven solos sin tocar
 * el fichero hosts.
 */
export function resolverTenant(hostname: string, dominioRaiz: string): Tenant {
  const host = normalizarHost(hostname);
  const raiz = normalizarHost(dominioRaiz);

  if (host === raiz || host === `www.${raiz}`) {
    return { superficie: 'landing', slug: null };
  }

  if (!host.endsWith(`.${raiz}`)) {
    return { superficie: 'desconocido', slug: null };
  }

  const etiqueta = host.slice(0, -(raiz.length + 1));

  // Solo un nivel. `a.b.nupcialis.com` no es la boda `a`: es un host que nadie
  // ha configurado y tratarlo como boda sería inventarse un tenant.
  if (etiqueta.includes('.')) {
    return { superficie: 'desconocido', slug: null };
  }

  if (etiqueta === SUBDOMINIO_SUPERADMIN) {
    return { superficie: 'superadmin', slug: null };
  }

  if (SLUGS_RESERVADOS.has(etiqueta)) {
    return { superficie: 'reservado', slug: null };
  }

  const validacion = validarSlug(etiqueta);
  if (!validacion.ok) {
    return { superficie: 'desconocido', slug: null };
  }

  return { superficie: 'boda', slug: validacion.slug };
}

/** Quita el puerto, el punto final y las mayúsculas. */
function normalizarHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '').replace(/:\d+$/, '');
}
