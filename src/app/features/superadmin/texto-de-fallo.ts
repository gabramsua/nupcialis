import type { FalloGestion } from '../../core/superadmin/gestion-gateway';

/** El mensaje de un fallo de gestión, con las claves comunes del superadmin. */
export function textoDeFalloSuperadmin(
  fallo: FalloGestion | null,
  t: (clave: string) => string,
): string {
  switch (fallo?.tipo) {
    case 'sin-permiso':
      return t('superadmin.estadisticas.falloPermiso');
    case 'sin-verificar':
      return t('superadmin.estadisticas.falloVerificar');
    case 'red':
      return t('superadmin.estadisticas.falloRed');
    case 'no-existe':
      return t('superadmin.ficha.noExiste');
    case 'invalido':
      return t(`superadmin.ficha.motivo.${fallo.motivo}`);
    case 'error':
      return fallo.mensaje;
    default:
      return t('superadmin.estadisticas.falloOtro');
  }
}
