import { describe, expect, it } from 'vitest';

import { direccionCorta } from './direccion-corta';

describe('direccionCorta', () => {
  it('el sitio, la calle y el municipio, sin comarca, provincia ni comunidad', () => {
    expect(
      direccionCorta(
        'Castillo de San Marcos, Plaza Alfonso X el Sabio, Sudamérica, El Puerto de Santa María, Bahía de Cádiz, Cádiz, Andalucía, 11500, España',
      ),
    ).toBe('Castillo de San Marcos, Plaza Alfonso X el Sabio, El Puerto de Santa María');
  });

  it('el barrio no es la localidad: Triana es de Sevilla', () => {
    expect(
      direccionCorta(
        'Bar Tribuna, Calle Granaderos, Triana Este, Triana, Sevilla, Andalucía, 41010, España',
      ),
    ).toBe('Bar Tribuna, Calle Granaderos, Sevilla');
  });

  it('cuando el municipio y la provincia se llaman igual, sale una sola vez', () => {
    expect(
      direccionCorta(
        'Iglesia de San Agustín, Plaza de San Agustín, El Pópulo, Cádiz, Bahía de Cádiz, Cádiz, Andalucía, 11004, España',
      ),
    ).toBe('Iglesia de San Agustín, Plaza de San Agustín, Cádiz');
  });

  it('una dirección corta o escrita a mano se deja como está', () => {
    expect(direccionCorta('Calle Mayor 5, Madrid')).toBe('Calle Mayor 5, Madrid');
    expect(direccionCorta('  Finca Los Olivos, Carretera de Arcos km 3  ')).toBe(
      'Finca Los Olivos, Carretera de Arcos km 3',
    );
    expect(direccionCorta('')).toBe('');
  });

  it('si no se reconoce la comunidad —una dirección de fuera— no se corta', () => {
    const fuera = 'Torre Eiffel, Avenue Anatole France, Paris, Île-de-France, 75007, France';
    expect(direccionCorta(fuera)).toBe(fuera);
  });

  it('con pocos trozos tras quitar lo de detrás, los deja todos', () => {
    expect(direccionCorta('Calle Mayor, Madrid, Comunidad de Madrid, 28013, España')).toBe(
      'Calle Mayor, Madrid',
    );
  });
});
