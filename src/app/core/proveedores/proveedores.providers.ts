import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import {
  crearAlmacenContratos,
  crearPuertaProveedoresFirestore,
} from '../firebase/proveedores-gateway.firestore';
import { ALMACEN_CONTRATOS, PUERTA_PROVEEDORES } from './proveedores-gateway';

/** Los proveedores, solo para la ruta del panel (D-18). */
export function provideProveedores(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_PROVEEDORES, useFactory: crearPuertaProveedoresFirestore },
    { provide: ALMACEN_CONTRATOS, useFactory: crearAlmacenContratos },
  ]);
}
