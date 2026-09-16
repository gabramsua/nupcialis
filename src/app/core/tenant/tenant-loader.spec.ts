import { describe, expect, it } from 'vitest';
import { cargarTenant, type ResultadoTenant } from './tenant-loader';
import { EntradaSlug, FuenteTenant, SitioPublico } from './tenant-source';

const SITIO: SitioPublico = {
  status: 'active',
  coupleNames: { partnerA: 'María', partnerB: 'Gabriel' },
  theme: { templateId: 'clasica', palette: null, heroImagePath: null, heroImageUrl: null },
  weddingDate: new Date('2027-06-12'),
  weddingTime: '17:00',
  timezone: 'Europe/Madrid',
  locale: 'es',
  secciones: [],
};

function fuente(
  slugs: Record<string, EntradaSlug>,
  sitios: Record<string, SitioPublico>,
  fallar = false,
): FuenteTenant {
  return {
    async buscarSlug(slug) {
      if (fallar) throw new Error('sin red');
      return slugs[slug] ?? null;
    },
    async leerSitio(weddingId) {
      if (fallar) throw new Error('sin red');
      return sitios[weddingId] ?? null;
    },
  };
}

const SLUGS = { mariaygabriel: { weddingId: 'w1', status: 'active' } } as const;

describe('cargarTenant', () => {
  it('resuelve una boda publicada', async () => {
    const r = await cargarTenant('mariaygabriel', fuente(SLUGS, { w1: SITIO }));
    expect(r).toEqual({
      tipo: 'ok',
      weddingId: 'w1',
      slug: 'mariaygabriel',
      sitio: SITIO,
    });
  });

  it('un slug inexistente no se encuentra', async () => {
    const r = await cargarTenant('anayjuan', fuente(SLUGS, { w1: SITIO }));
    expect(r.tipo).toBe('no-encontrada');
  });

  it('un slug con forma inválida ni siquiera consulta', async () => {
    let consultas = 0;
    const espia: FuenteTenant = {
      async buscarSlug() {
        consultas++;
        return null;
      },
      async leerSitio() {
        return null;
      },
    };
    const r = await cargarTenant('ab', espia);
    expect(r.tipo).toBe('no-encontrada');
    expect(consultas).toBe(0);
  });

  it('un slug en cuarentena se comporta como inexistente', async () => {
    // A propósito: decir "archivada" confirmaría a cualquiera que esa boda
    // existió, y eso es información que no le corresponde a un desconocido.
    const r = await cargarTenant(
      'mariaygabriel',
      fuente({ mariaygabriel: { weddingId: 'w1', status: 'quarantined' } }, { w1: SITIO }),
    );
    expect(r.tipo).toBe('no-encontrada');
  });

  it('una boda en borrador no está publicada', async () => {
    const r = await cargarTenant(
      'mariaygabriel',
      fuente(SLUGS, { w1: { ...SITIO, status: 'draft' } }),
    );
    expect(r.tipo).toBe('no-publicada');
  });

  it('una boda archivada lo dice', async () => {
    const r = await cargarTenant(
      'mariaygabriel',
      fuente(SLUGS, { w1: { ...SITIO, status: 'archived' } }),
    );
    expect(r.tipo).toBe('archivada');
  });

  it('un slug que apunta a una boda sin proyección pública es un error, no un 404', async () => {
    // Estado inconsistente: conviene distinguirlo para poder detectarlo.
    const r = await cargarTenant('mariaygabriel', fuente(SLUGS, {}));
    expect(r.tipo).toBe('error');
  });

  it('un fallo de red es error, no "no encontrada"', async () => {
    // La diferencia importa: con "error" tiene sentido reintentar; con
    // "no encontrada", no.
    const r = await cargarTenant('mariaygabriel', fuente(SLUGS, { w1: SITIO }, true));
    expect(r.tipo).toBe('error');
  });
});

describe('la landing no es una boda que falta', () => {
  // Confundirlas hacía que `nupcialis.com` —la página que vende el producto—
  // contestara «no encontramos esta boda». Lo resuelve `tenantResolver`, pero
  // el tipo tiene que existir para que no haya dónde volver a mezclarlas.
  it('el resultado de landing es un tipo propio', () => {
    const landing: ResultadoTenant = { tipo: 'landing' };
    expect(landing.tipo).not.toBe('no-encontrada');
  });
});
