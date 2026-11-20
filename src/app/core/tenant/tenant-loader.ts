import { FuenteTenant, SitioPublico } from './tenant-source';
import { validarSlug } from './slug';

/**
 * Qué se ha encontrado al resolver un subdominio.
 *
 * Cada caso tiene su pantalla, y ninguno es "error genérico". Un invitado que
 * teclea mal el enlace merece algo mejor que una página en blanco, y la pareja
 * que aún no ha publicado merece saber que su web existe pero no está visible.
 */
export type ResultadoTenant =
  | {
      readonly tipo: 'ok';
      readonly weddingId: string;
      readonly slug: string;
      readonly sitio: SitioPublico;
    }
  /** El slug no existe: enlace mal tecleado, o boda que nunca existió. */
  | { readonly tipo: 'no-encontrada' }
  /**
   * El host no es una boda: es el dominio raíz.
   *
   * Es un caso distinto de «no encontrada» y confundirlos tiene consecuencias:
   * quien entra en `nupcialis.com` a ver qué vendemos no puede encontrarse un
   * «no encontramos esta boda», que es lo que pasaba.
   */
  | { readonly tipo: 'landing' }
  /**
   * Existe pero está en borrador: la pareja aún no la ha publicado.
   *
   * Lleva el `weddingId` porque el **panel sí tiene que abrirse en borrador**:
   * es donde la pareja prepara la web antes de publicarla. La web pública usa
   * solo el `tipo`; el id no sale de aquí hacia ninguna pantalla pública.
   */
  | { readonly tipo: 'no-publicada'; readonly weddingId: string }
  /** Pasó el plazo de conservación y se archivó. Lleva el id por lo mismo. */
  | { readonly tipo: 'archivada'; readonly weddingId: string }
  /** Falló la lectura. Distinto de "no existe": aquí sí tiene sentido reintentar. */
  | { readonly tipo: 'error' };

export async function cargarTenant(slug: string, fuente: FuenteTenant): Promise<ResultadoTenant> {
  // Se valida antes de consultar: un slug con forma inválida no puede existir,
  // y así no se gasta una lectura ni se deja que basura llegue a la consulta.
  if (!validarSlug(slug).ok) {
    return { tipo: 'no-encontrada' };
  }

  try {
    const entrada = await fuente.buscarSlug(slug);

    // Un slug en cuarentena es de una boda cancelada. Se comporta como
    // inexistente a propósito: si dijera "archivada", estaría confirmando a
    // cualquiera que esa boda existió.
    if (!entrada || entrada.status !== 'active') {
      return { tipo: 'no-encontrada' };
    }

    const sitio = await fuente.leerSitio(entrada.weddingId);

    // El slug apunta a una boda cuya proyección pública no existe. Es un estado
    // inconsistente, no un "no encontrado": conviene distinguirlo para poder
    // detectarlo en los registros.
    if (!sitio) {
      return { tipo: 'error' };
    }

    switch (sitio.status) {
      case 'active':
        return { tipo: 'ok', weddingId: entrada.weddingId, slug, sitio };
      case 'draft':
        return { tipo: 'no-publicada', weddingId: entrada.weddingId };
      case 'archived':
        return { tipo: 'archivada', weddingId: entrada.weddingId };
      default:
        return { tipo: 'error' };
    }
  } catch {
    return { tipo: 'error' };
  }
}
