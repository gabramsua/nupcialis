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

export { listAccessLog } from './access-log';
export { authorizeWeddingDomain } from './authorize-wedding-domain';
export { addCompanion, deleteCompanion } from './companions';
export { setCompanionQuota } from './companion-quota';
export { deleteGroup, reorderGroups, upsertGroup } from './groups';
export { guestLinkLogin, guestLogin, verifyGuest } from './guest-login';
export { getInviteLink } from './invite-links';
export { deleteGuest, listGuests, upsertGuest } from './guests';
export { importGuests } from './import-guests';
export { provisionWedding } from './provision-wedding';
export { listQuizRanking, startQuiz, submitQuiz } from './quiz';
export { clearQuizRanking, listQuizPlays } from './quiz-admin';
export { assignGuestsToTable } from './tables';
export { recomputeCounters } from './recompute-counters';
export { listRsvpAnswers } from './rsvp-answers';
export { getRsvpForm, submitRsvp } from './rsvp';
export { setUserClaims } from './set-user-claims';
export { setWeddingStatus } from './set-wedding-status';
export { syncPublicFaqs, syncPublicProjection, syncPublicTimeline } from './sync-public-projection';
