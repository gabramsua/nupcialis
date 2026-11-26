/**
 * Cuándo se sirven los regalos **sin identificar al invitado** (D-66).
 *
 * El plan básico no tiene lista de invitados: nadie va a escribir «nombre y
 * cuatro dígitos» porque no hay nada contra lo que comprobarlos. Pedírselo
 * solo para enseñar un IBAN no protege nada y estorba. Así que en esas bodas
 * `getOpenGifts` sirve la aportación y la lista a quien llegue con el slug.
 *
 * Lo que **no** cambia: el IBAN sigue sin viajar en `public/site` —la
 * proyección la lee y la indexa cualquiera—; llega por invocable, con App
 * Check, y solo si se cumplen **todas** estas condiciones. La reserva de
 * regalos sigue exigiendo sesión: sin invitado no hay a quién apuntársela.
 */

export function regalosAbiertosPermitidos(boda: Record<string, unknown> | undefined): boolean {
  if (!boda) return false;
  if (boda['plan'] !== 'basic') return false;
  if (boda['status'] !== 'active') return false;

  const modulos = boda['modules'];
  if (modulos === null || typeof modulos !== 'object') return false;
  const gifts = (modulos as Record<string, unknown>)['gifts'];
  return (
    gifts !== null &&
    typeof gifts === 'object' &&
    (gifts as Record<string, unknown>)['enabled'] === true
  );
}
