import { lista, objeto, texto } from '../../../core/llamadas/llamadas-gateway';

export interface PlantillaEditable {
  readonly id: string;
  readonly destinatario: 'novios' | 'invitados';
  readonly asunto: string;
  readonly cuerpo: string;
  readonly marcadores: readonly string[];
  readonly boton: string;
  readonly personalizada: boolean;
}

export interface VistaPrevia {
  readonly asunto: string;
  readonly html: string;
}

export function leerPlantillas(valor: unknown): readonly PlantillaEditable[] | null {
  const o = objeto(valor);
  if (!Array.isArray(o['plantillas'])) return null;

  return lista(o['plantillas']).flatMap((p): readonly PlantillaEditable[] => {
    const x = objeto(p);
    const id = texto(x['id']);
    if (id === '') return [];
    return [
      {
        id,
        destinatario: x['destinatario'] === 'invitados' ? 'invitados' : 'novios',
        asunto: texto(x['asunto']),
        cuerpo: texto(x['cuerpo']),
        marcadores: lista(x['marcadores']).filter((m): m is string => typeof m === 'string'),
        boton: texto(x['boton']),
        personalizada: x['personalizada'] === true,
      },
    ];
  });
}

export function leerVistaPrevia(valor: unknown): VistaPrevia | null {
  const o = objeto(valor);
  const html = texto(o['html']);
  return html === '' ? null : { asunto: texto(o['asunto']), html };
}

export function esOk(valor: unknown): true | null {
  return objeto(valor)['ok'] === true ? true : null;
}
