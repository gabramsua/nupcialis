/**
 * Punto de entrada de las Cloud Functions.
 *
 * Un fichero por función, y aquí solo la reexportación. El nombre exportado es
 * el nombre desplegado: cambiarlo borra la función vieja y crea otra, así que
 * no se renombran a la ligera.
 *
 * Las funciones son **pegamento, no backend**: validan, escriben lo que el
 * cliente no puede escribir, y hablan con lo que el SDK del navegador no
 * alcanza. Toda la lógica que se pueda decidir sin red vive en `dominio/`.
 */

export { authorizeWeddingDomain } from './authorize-wedding-domain';
export { provisionWedding } from './provision-wedding';
export { recomputeCounters } from './recompute-counters';
export { setUserClaims } from './set-user-claims';
export { syncPublicProjection } from './sync-public-projection';
