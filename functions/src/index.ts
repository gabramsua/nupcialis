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
export { completeWeddings } from './completar-bodas';
export { getTips, listTips, resetTip, saveTip } from './consejos';
export { recordOwnerLogin } from './entrada-pareja';
export { recordWebVisit } from './visitas-web';
export { deleteWedding, updateWedding } from './gestion-boda';
export { listPlans, savePlanModules } from './planes';
export {
  discardMailItem,
  listEmailTemplates,
  listMailQueue,
  previewEmail,
  resetEmailTemplate,
  saveEmailTemplate,
  sendCoupleAccessEmail,
} from './correos';
export { deleteGroup, reorderGroups, upsertGroup } from './groups';
export { guestLinkLogin, guestLogin, verifyGuest } from './guest-login';
export { getInviteLink } from './invite-links';
export { deleteGuest, listGuests, upsertGuest } from './guests';
export { importGuests } from './import-guests';
export { deleteCatalogItem, loadFactoryCatalog, saveCatalogItem } from './catalogo';
export { provisionWedding } from './provision-wedding';
export { getQuizHint, listQuizRanking, startQuiz, submitQuiz } from './quiz';
export { clearQuizRanking, listQuizPlays } from './quiz-admin';
export { assignGuestsToTable } from './tables';
export { clearGallery, deletePhoto, listPhotos, uploadPhoto } from './gallery';
export { getGifts, releaseGift, reserveGift } from './gifts';
export { getOpenGifts } from './gifts-abiertos';
export { listPlaylist, suggestSong, voteSong } from './playlist';
export { deleteGuestbookEntry, listGuestbook, signGuestbook } from './libro';
export { recomputeCounters } from './recompute-counters';
export { listRsvpAnswers } from './rsvp-answers';
export { getRsvpForm, submitRsvp } from './rsvp';
export { setGuestRsvp } from './rsvp-pareja';
export { setGuestsRsvp } from './respuesta-lote';
export { getAdminStats, setWeddingLimits } from './estadisticas';
export {
  deletePayment,
  generateCoupleResetLink,
  getReminders,
  getWeddingFile,
  listPayments,
  markReminderSent,
  savePayment,
} from './superadmin-boda';
export { setUserClaims } from './set-user-claims';
export { setMyWebStatus } from './publicar-pareja';
export { setWeddingStatus } from './set-wedding-status';
export {
  syncPublicAccommodations,
  syncPublicFaqs,
  syncPublicLocations,
  syncPublicParty,
  syncPublicProjection,
  syncPublicTimeline,
} from './sync-public-projection';
