import { entero, lista, objeto, texto } from '../../../core/llamadas/llamadas-gateway';

export type EstadoCorreo = 'en-cola' | 'enviando' | 'enviado' | 'error';

export const ESTADOS_CORREO: readonly EstadoCorreo[] = ['en-cola', 'enviando', 'enviado', 'error'];

export interface CorreoDeLaCola {
  readonly id: string;
  readonly para: readonly string[];
  readonly asunto: string;
  readonly plantilla: string;
  readonly weddingId: string;
  readonly estado: EstadoCorreo;
  readonly error: string;
  /** Milisegundos desde 1970, o `0` si no se sabe. */
  readonly creadoMs: number;
}

export interface ColaDeCorreos {
  readonly total: number;
  readonly porEstado: Readonly<Record<EstadoCorreo, number>>;
  readonly correos: readonly CorreoDeLaCola[];
}

function esEstado(valor: unknown): valor is EstadoCorreo {
  return (ESTADOS_CORREO as readonly unknown[]).includes(valor);
}

/** Lee la respuesta de `listMailQueue`. Lo que no cuadra se descarta, no rompe la pantalla. */
export function leerCola(valor: unknown): ColaDeCorreos | null {
  const o = objeto(valor);
  if (!Array.isArray(o['correos'])) return null;

  const correos = lista(o['correos']).flatMap((c): readonly CorreoDeLaCola[] => {
    const x = objeto(c);
    const id = texto(x['id']);
    if (id === '') return [];
    return [
      {
        id,
        para: lista(x['para']).filter((p): p is string => typeof p === 'string'),
        asunto: texto(x['asunto']),
        plantilla: texto(x['plantilla']),
        weddingId: texto(x['weddingId']),
        estado: esEstado(x['estado']) ? x['estado'] : 'en-cola',
        error: texto(x['error']),
        creadoMs: entero(x['creadoMs']),
      },
    ];
  });

  const por = objeto(o['porEstado']);
  return {
    total: entero(o['total']),
    porEstado: {
      'en-cola': entero(por['en-cola']),
      enviando: entero(por['enviando']),
      enviado: entero(por['enviado']),
      error: entero(por['error']),
    },
    correos,
  };
}
