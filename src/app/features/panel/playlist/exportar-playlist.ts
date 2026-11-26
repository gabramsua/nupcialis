import type { Hoja } from '../invitados/exportacion';
import type { CancionDelPanel } from '../../../core/playlist/playlist-panel-gateway';

/**
 * La playlist, en filas de hoja de cálculo, para el DJ (§8.14).
 *
 * Dos hojas, y las dos importan por motivos distintos: **«Suena»** es lo que
 * se va a pinchar, de más a menos votada, y **«No poner»** es la lista de veto,
 * que es lo que un DJ no puede saltarse por un descuido. Se descarta lo que la
 * pareja no ha decidido: «pendiente» no es una instrucción.
 *
 * Aquí no se escribe ningún fichero. Quien lo monta es `exportar-xlsx.ts`, que
 * carga la librería solo al pulsar el botón.
 */

export interface EtiquetasDePlaylist {
  readonly hojaSuena: string;
  readonly hojaNoPoner: string;
  readonly puesto: string;
  readonly cancion: string;
  readonly artista: string;
  readonly votos: string;
}

export function hojasDePlaylist(
  canciones: readonly CancionDelPanel[],
  etiquetas: EtiquetasDePlaylist,
): readonly Hoja[] {
  const suena = canciones.filter((c) => c.status === 'accepted');
  const vetadas = canciones.filter((c) => c.status === 'vetoed');

  const hojas: Hoja[] = [
    {
      nombre: etiquetas.hojaSuena,
      columnas: [
        { titulo: etiquetas.puesto, ancho: 6 },
        { titulo: etiquetas.cancion, ancho: 40 },
        { titulo: etiquetas.artista, ancho: 30 },
        { titulo: etiquetas.votos, ancho: 8 },
      ],
      filas: suena.map((c, i) => [i + 1, c.title, c.artist, c.votos]),
    },
  ];

  // Solo sale si hay algo: una hoja «No poner» vacía parece un olvido.
  if (vetadas.length > 0) {
    hojas.push({
      nombre: etiquetas.hojaNoPoner,
      columnas: [
        { titulo: etiquetas.cancion, ancho: 40 },
        { titulo: etiquetas.artista, ancho: 30 },
      ],
      filas: vetadas.map((c) => [c.title, c.artist]),
    });
  }

  return hojas;
}

export function nombreDelFicheroDePlaylist(slug: string, hoy: Date): string {
  const limpio = slug.replace(/[^a-z0-9-]/gi, '') || 'boda';
  return `playlist-${limpio}-${hoy.toISOString().slice(0, 10)}.xlsx`;
}
