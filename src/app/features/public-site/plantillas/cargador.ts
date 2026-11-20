import type { Type } from '@angular/core';

import type { PlantillaId } from './catalogo';

/**
 * Carga el componente de una plantilla, y solo ese.
 *
 * Cada plantilla viaja en su propio trozo de JavaScript. Con dos apenas se nota;
 * con doce en el catálogo, importarlas todas metería once diseños que esta boda
 * no usa en el bundle que descarga el invitado. El presupuesto de la web pública
 * son 200 kB comprimidos y el arranque ya se lleva 76.
 *
 * El `switch` con rutas literales no es torpeza: el empaquetador necesita ver
 * cada `import()` escrito para poder separarlo. Un `import(\`./\${id}/\${id}\`)`
 * compila y luego falla en producción, cuando ya no hay quien lo mire.
 */
export function cargarPlantilla(id: PlantillaId): Promise<Type<unknown>> {
  switch (id) {
    case 'botanica':
      return import('./botanica/botanica').then((m) => m.PlantillaBotanica);
    case 'clasica':
    default:
      return import('./clasica/clasica').then((m) => m.PlantillaClasica);
  }
}
