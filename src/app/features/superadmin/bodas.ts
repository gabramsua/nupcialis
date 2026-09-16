/**
 * Lo que el superadmin necesita saber de una boda, y nada más.
 *
 * No es el documento de Firestore: es la vista. El documento trae cuarenta
 * campos —módulos, tema, contenido— que este listado no usa, y arrastrarlos
 * hasta la plantilla convierte cualquier cambio del modelo en un cambio de la
 * pantalla.
 */

export type EstadoBoda = 'draft' | 'active' | 'archived';
export type Plan = 'basic' | 'extended';
export type EstadoDominio = 'ok' | 'pending';

export interface NombresPareja {
  readonly partnerA: string;
  readonly partnerB: string;
}

export interface BodaEnListado {
  readonly weddingId: string;
  readonly slug: string;
  readonly status: EstadoBoda;
  readonly plan: Plan;
  /**
   * Los dos nombres, separados.
   *
   * No se monta "María y Gabriel" aquí por lo mismo que en la web pública: la
   * conjunción es texto visible y vive en los ficheros de traducción.
   */
  readonly pareja: NombresPareja;
  readonly weddingDate: Date | null;
  readonly invitados: number;
  readonly confirmados: number;
  /**
   * Si el subdominio no se autorizó en Firebase Auth, el acceso con Google de
   * esa boda está roto y **nadie se entera hasta que la pareja lo intenta**.
   * Por eso viaja hasta el listado y se pinta en rojo. Ver regla 8 de CLAUDE.md.
   */
  readonly authDomain: EstadoDominio;
}

/** Clave de ordenación por nombre. Ordenar por el objeto no significa nada. */
export function claveDeNombre(boda: BodaEnListado): string {
  return `${boda.pareja.partnerA} ${boda.pareja.partnerB}`.trim();
}

/**
 * Ordena por lo que de verdad busca uno al abrir esta pantalla.
 *
 * Primero lo que reclama atención —un subdominio sin autorizar—, después las
 * bodas que están por delante, y las archivadas al final. Ordenar por fecha de
 * alta dejaría el problema enterrado en la página tres.
 */
export function ordenPorDefecto(a: BodaEnListado, b: BodaEnListado): number {
  const urgencia = (boda: BodaEnListado) => {
    if (boda.authDomain === 'pending') return 0;
    if (boda.status === 'archived') return 2;
    return 1;
  };

  const diferencia = urgencia(a) - urgencia(b);
  if (diferencia !== 0) return diferencia;

  const fechaA = a.weddingDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const fechaB = b.weddingDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return fechaA - fechaB;
}

/**
 * Qué se puede hacer con una boda según su estado.
 *
 * Vive aquí, y no en la plantilla, porque es la clase de cosa que se cuela: un
 * `@if` anidado en HTML acaba ofreciendo «archivar» en una boda ya archivada.
 * Los saltos permitidos los decide el servidor (`dominio/estados.ts` en las
 * funciones); esto es su reflejo en la pantalla, y el test lo ata.
 *
 * Cada acción lleva icono y texto además del color, que es la regla del sistema
 * visual: un botón rojo sin etiqueta no dice qué hace.
 */
export type AccionEstado = 'publicar' | 'despublicar' | 'archivar' | 'reactivar';

export interface AccionSobreBoda {
  readonly accion: AccionEstado;
  readonly destino: EstadoBoda;
  readonly variante: 'primary' | 'secondary' | 'danger';
  readonly icono: 'eye' | 'eye-slash' | 'archive' | 'check-circle';
}

const ACCIONES: Record<EstadoBoda, readonly AccionSobreBoda[]> = {
  draft: [
    { accion: 'publicar', destino: 'active', variante: 'primary', icono: 'eye' },
    { accion: 'archivar', destino: 'archived', variante: 'secondary', icono: 'archive' },
  ],
  active: [
    { accion: 'despublicar', destino: 'draft', variante: 'secondary', icono: 'eye-slash' },
    { accion: 'archivar', destino: 'archived', variante: 'danger', icono: 'archive' },
  ],
  archived: [
    { accion: 'reactivar', destino: 'active', variante: 'primary', icono: 'check-circle' },
  ],
};

export function accionesDe(status: EstadoBoda): readonly AccionSobreBoda[] {
  return ACCIONES[status] ?? [];
}

/** Cuántas piden atención. Es el número del encabezado. */
export function conIncidencias(bodas: readonly BodaEnListado[]): number {
  return bodas.filter((boda) => boda.authDomain === 'pending').length;
}
