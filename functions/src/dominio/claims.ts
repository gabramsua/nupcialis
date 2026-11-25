/**
 * Los claims de una cuenta cuando cambia su boda.
 *
 * `setCustomUserClaims` **reemplaza el objeto entero**. Si la cuenta de Gabriel
 * es la del superadmin y además se usa como correo de una pareja de pruebas, dar
 * de alta esa boda dejaba `{ weddingId, role }` y se llevaba el `superadmin`
 * por delante; borrar la boda lo ponía a `null`, o directamente borraba la
 * cuenta. El síntoma era «Esta cuenta no tiene permiso de superadmin» tras
 * haberlo concedido cinco veces.
 *
 * El claim de superadmin solo se concede y se retira fuera de banda
 * (`tools/dar-superadmin.mjs`), así que ninguna otra ruta puede quitarlo.
 */

type Claims = Readonly<Record<string, unknown>> | undefined;

export function esSuperadmin(actuales: Claims): boolean {
  return actuales?.['superadmin'] === true;
}

/** Los claims de una cuenta que pasa a ser de una boda. */
export function claimsDeBoda(actuales: Claims, weddingId: string): Record<string, unknown> {
  return {
    ...(esSuperadmin(actuales) ? { superadmin: true } : {}),
    weddingId,
    role: 'owner',
  };
}

/** Los claims de una cuenta que deja de tener boda: `null` si no queda nada. */
export function claimsSinBoda(actuales: Claims): Record<string, unknown> | null {
  return esSuperadmin(actuales) ? { superadmin: true } : null;
}
