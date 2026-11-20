import { describe, expect, it } from 'vitest';

import { ordenarCancionesDelPanel, type CancionDelPanel } from '../playlist/playlist-panel-gateway';
import { traducirPlaylist } from './playlist-gateway.firebase';
import { traducirPlaylistPanel } from './playlist-panel-gateway.firestore';

describe('los fallos de la playlist del invitado', () => {
  it('lee el motivo que manda el servidor en los detalles', () => {
    for (const motivo of [
      'sin-verificar',
      'no-disponible',
      'incompleta',
      'tope-invitado',
      'tope-lista',
    ]) {
      expect(
        traducirPlaylist({ code: 'functions/failed-precondition', details: { motivo } }),
      ).toEqual({
        tipo: motivo,
      });
    }
  });

  it('una canción que ya no está es «no existe»', () => {
    expect(traducirPlaylist({ code: 'functions/not-found' })).toEqual({ tipo: 'no-existe' });
  });

  it('sin red es «red», y lo desconocido, «error»', () => {
    expect(traducirPlaylist({ code: 'functions/unavailable' })).toEqual({ tipo: 'red' });
    expect(traducirPlaylist({ code: 'functions/internal' })).toEqual({ tipo: 'error' });
    expect(traducirPlaylist(undefined)).toEqual({ tipo: 'error' });
  });

  /** Un motivo inventado no puede colar un tipo de fallo que la pantalla no conoce. */
  it('ignora un motivo que no conoce', () => {
    expect(traducirPlaylist({ code: 'x', details: { motivo: 'hackeado' } })).toEqual({
      tipo: 'error',
    });
  });
});

describe('la playlist del panel', () => {
  it('traduce los fallos de Firestore', () => {
    expect(traducirPlaylistPanel({ code: 'permission-denied' })).toEqual({ tipo: 'sin-permiso' });
    expect(traducirPlaylistPanel({ code: 'unavailable' })).toEqual({ tipo: 'red' });
    expect(traducirPlaylistPanel({ code: 'raro', message: 'x' })).toEqual({
      tipo: 'error',
      mensaje: 'x',
    });
  });

  it('ordena por votos y, a igualdad, por título', () => {
    const c = (id: string, title: string, votos: number): CancionDelPanel => ({
      id,
      title,
      artist: '',
      votos,
      status: 'pending',
      source: 'guest',
    });

    expect(
      ordenarCancionesDelPanel([c('a', 'Zeta', 1), c('b', 'Beta', 3), c('c', 'Alfa', 3)]).map(
        (x) => x.id,
      ),
    ).toEqual(['c', 'b', 'a']);
  });
});
