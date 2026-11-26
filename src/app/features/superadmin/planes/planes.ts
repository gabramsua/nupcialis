import { entero, lista, objeto, texto } from '../../../core/llamadas/llamadas-gateway';

export interface PlanEditable {
  readonly id: 'basic' | 'extended';
  readonly modulos: readonly string[];
  readonly porDefecto: boolean;
  readonly bodas: number;
}

export interface DatosDePlanes {
  readonly planes: readonly PlanEditable[];
  readonly catalogo: readonly string[];
}

export interface ModuloAfectado {
  readonly modulo: string;
  readonly bodas: number;
}

/** Lo que devuelve `savePlanModules`: aplicado, o pide confirmación. */
export type RespuestaDeGuardado =
  | { readonly aplicado: true; readonly bodasActualizadas: number }
  | { readonly aplicado: false; readonly afectadas: readonly ModuloAfectado[] };

function cadenas(valor: unknown): readonly string[] {
  return lista(valor).filter((v): v is string => typeof v === 'string');
}

export function leerPlanes(valor: unknown): DatosDePlanes | null {
  const o = objeto(valor);
  if (!Array.isArray(o['planes']) || !Array.isArray(o['catalogo'])) return null;

  const planes = lista(o['planes']).flatMap((p): readonly PlanEditable[] => {
    const x = objeto(p);
    const id = x['id'];
    if (id !== 'basic' && id !== 'extended') return [];
    return [
      {
        id,
        modulos: cadenas(x['modulos']),
        porDefecto: x['porDefecto'] === true,
        bodas: entero(x['bodas']),
      },
    ];
  });

  return { planes, catalogo: cadenas(o['catalogo']) };
}

export function leerGuardado(valor: unknown): RespuestaDeGuardado | null {
  const o = objeto(valor);
  if (o['aplicado'] === true) {
    return { aplicado: true, bodasActualizadas: entero(o['bodasActualizadas']) };
  }
  if (o['requiereConfirmacion'] === true) {
    return {
      aplicado: false,
      afectadas: lista(o['afectadas']).map((a) => ({
        modulo: texto(objeto(a)['modulo']),
        bodas: entero(objeto(a)['bodas']),
      })),
    };
  }
  return null;
}
