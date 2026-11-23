import { lista, objeto, texto } from '../../../core/llamadas/llamadas-gateway';

export interface ConsejoEditable {
  readonly modulo: string;
  readonly texto: string;
  readonly personalizado: boolean;
}

export interface DatosDeConsejos {
  readonly max: number;
  readonly consejos: readonly ConsejoEditable[];
}

export function leerConsejos(valor: unknown): DatosDeConsejos | null {
  const o = objeto(valor);
  if (!Array.isArray(o['consejos'])) return null;

  return {
    max: typeof o['max'] === 'number' ? o['max'] : 800,
    consejos: lista(o['consejos']).flatMap((c): readonly ConsejoEditable[] => {
      const x = objeto(c);
      const modulo = texto(x['modulo']);
      return modulo === ''
        ? []
        : [{ modulo, texto: texto(x['texto']), personalizado: x['personalizado'] === true }];
    }),
  };
}

/** Lo que lee el panel de la pareja: módulo → texto, sin los vacíos. */
export function leerConsejosDelPanel(valor: unknown): Readonly<Record<string, string>> | null {
  const o = objeto(valor);
  if (o['consejos'] === undefined) return null;
  const crudos = objeto(o['consejos']);
  const salida: Record<string, string> = {};
  for (const [modulo, t] of Object.entries(crudos)) {
    if (typeof t === 'string' && t.trim() !== '') salida[modulo] = t;
  }
  return salida;
}

export function leerOk(valor: unknown): true | null {
  return objeto(valor)['ok'] === true ? true : null;
}
