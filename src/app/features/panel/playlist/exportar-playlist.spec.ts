import { describe, expect, it } from 'vitest';

import type { CancionDelPanel } from '../../../core/playlist/playlist-panel-gateway';
import { hojasDePlaylist, nombreDelFicheroDePlaylist } from './exportar-playlist';

const ETIQUETAS = {
  hojaSuena: 'Suena',
  hojaNoPoner: 'No poner',
  puesto: 'Puesto',
  cancion: 'Canción',
  artista: 'Artista',
  votos: 'Votos',
};

function c(parcial: Partial<CancionDelPanel> & { id: string }): CancionDelPanel {
  return {
    title: `Canción ${parcial.id}`,
    artist: '',
    votos: 0,
    status: 'pending',
    source: 'guest',
    ...parcial,
  };
}

describe('la playlist para el DJ', () => {
  it('«Suena» lleva solo lo aceptado, en el orden que traiga la lista', () => {
    const [suena] = hojasDePlaylist(
      [
        c({ id: 'a', title: 'Alegría', artist: 'X', votos: 9, status: 'accepted' }),
        c({ id: 'b', title: 'Bailando', votos: 4, status: 'accepted' }),
        c({ id: 'c', status: 'pending', votos: 50 }),
        c({ id: 'd', status: 'discarded' }),
      ],
      ETIQUETAS,
    );

    expect(suena?.nombre).toBe('Suena');
    expect(suena?.filas).toEqual([
      [1, 'Alegría', 'X', 9],
      [2, 'Bailando', '', 4],
    ]);
  });

  /** Lo pendiente no es una instrucción para quien pincha. */
  it('no incluye lo que la pareja aún no ha decidido', () => {
    const hojas = hojasDePlaylist([c({ id: 'a', status: 'pending', votos: 99 })], ETIQUETAS);

    expect(hojas[0]?.filas).toEqual([]);
  });

  it('«No poner» lleva la lista de veto y solo sale si hay algo', () => {
    const con = hojasDePlaylist(
      [c({ id: 'a', title: 'La Macarena', artist: 'Los del Río', status: 'vetoed' })],
      ETIQUETAS,
    );
    expect(con.map((h) => h.nombre)).toEqual(['Suena', 'No poner']);
    expect(con[1]?.filas).toEqual([['La Macarena', 'Los del Río']]);

    const sin = hojasDePlaylist([c({ id: 'a', status: 'accepted' })], ETIQUETAS);
    expect(sin.map((h) => h.nombre)).toEqual(['Suena']);
  });

  it('el fichero lleva el nombre de la boda y la fecha', () => {
    expect(nombreDelFicheroDePlaylist('maria-y-gabriel', new Date('2027-06-12T10:00:00Z'))).toBe(
      'playlist-maria-y-gabriel-2027-06-12.xlsx',
    );
    expect(nombreDelFicheroDePlaylist('../raro', new Date('2027-06-12T10:00:00Z'))).toBe(
      'playlist-raro-2027-06-12.xlsx',
    );
  });
});
