import { describe, expect, it } from 'vitest';

import { destinoDePareja } from './publicar-pareja';

describe('destinoDePareja', () => {
  it('puede publicar desde borrador y volver a borrador desde publicada', () => {
    expect(destinoDePareja('draft', 'active')).toBe('active');
    expect(destinoDePareja('active', 'draft')).toBe('draft');
  });

  it('pedir el estado en el que ya está no es un error (doble clic)', () => {
    expect(destinoDePareja('active', 'active')).toBe('active');
  });

  it('una boda archivada no la toca la pareja', () => {
    expect(destinoDePareja('archived', 'active')).toBeNull();
    expect(destinoDePareja('archived', 'draft')).toBeNull();
  });

  it('no puede archivar ni inventarse un estado', () => {
    expect(destinoDePareja('active', 'archived')).toBeNull();
    expect(destinoDePareja('draft', 'otro')).toBeNull();
    expect(destinoDePareja('draft', undefined)).toBeNull();
  });
});
