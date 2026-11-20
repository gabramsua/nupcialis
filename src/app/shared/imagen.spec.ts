import { describe, expect, it } from 'vitest';

import { LADO_MAXIMO, dimensionesDestino } from './imagen';

describe('dimensionesDestino', () => {
  it('reduce una foto de móvil manteniendo la proporción', () => {
    // 4032×3024 es lo que da un iPhone en 4:3.
    expect(dimensionesDestino(4032, 3024)).toEqual({ ancho: 2000, alto: 1500 });
  });

  it('usa el lado largo, sea el ancho o el alto', () => {
    expect(dimensionesDestino(3024, 4032)).toEqual({ ancho: 1500, alto: 2000 });
  });

  it('no agranda una foto pequeña', () => {
    // Estirarla no añade detalle: solo peso y desenfoque.
    expect(dimensionesDestino(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });

  it('deja intacta una que ya está en el límite', () => {
    expect(dimensionesDestino(LADO_MAXIMO, 1000)).toEqual({ ancho: LADO_MAXIMO, alto: 1000 });
  });

  it('no devuelve nunca un lado a cero por redondeo', () => {
    // Un panorama muy alargado: el lado corto no puede desaparecer.
    const salida = dimensionesDestino(20000, 200);
    expect(salida.ancho).toBe(2000);
    expect(salida.alto).toBeGreaterThanOrEqual(1);
  });

  it('aguanta medidas absurdas sin lanzar', () => {
    expect(dimensionesDestino(0, 0)).toEqual({ ancho: 0, alto: 0 });
    expect(dimensionesDestino(-5, 10)).toEqual({ ancho: 0, alto: 0 });
  });
});
