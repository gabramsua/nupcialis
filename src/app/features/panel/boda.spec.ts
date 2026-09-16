import { describe, expect, it } from 'vitest';

import { ICONO_MODULO, MODULOS, menuDeModulos, modulosNoVisibles, type BodaDelPanel } from './boda';

function boda(modulos: BodaDelPanel['modulos']): BodaDelPanel {
  return {
    weddingId: 'id',
    slug: 'mariaygabriel',
    status: 'draft',
    plan: 'extended',
    templateId: 'clasica',
    modulos,
  };
}

describe('menuDeModulos', () => {
  it('solo entran los módulos activos', () => {
    const menu = menuDeModulos(
      boda({
        rsvp: { enabled: true, visibility: 'visible' },
        gallery: { enabled: false, visibility: 'hidden' },
      }),
    );
    expect(menu.map((e) => e.modulo)).toEqual(['rsvp']);
  });

  // Un módulo desactivado en gris con un candado le recuerda a la pareja lo que
  // no ha comprado cada vez que abre el panel. Mejor que no esté.
  it('un módulo apagado no aparece en gris: no aparece', () => {
    const menu = menuDeModulos(boda({ quiz: { enabled: false, visibility: 'visible' } }));
    expect(menu).toHaveLength(0);
  });

  // El orden de las claves que devuelve Firestore no está garantizado. Un menú
  // que se recoloca entre dos cargas es un menú que no se aprende nunca.
  it('el orden es el del catálogo, no el del documento', () => {
    const menu = menuDeModulos(
      boda({
        checklist: { enabled: true, visibility: 'visible' },
        rsvp: { enabled: true, visibility: 'visible' },
        guests: { enabled: true, visibility: 'visible' },
      }),
    );
    expect(menu.map((e) => e.modulo)).toEqual(['rsvp', 'guests', 'checklist']);
  });

  it('cada entrada lleva su icono del set curado', () => {
    const menu = menuDeModulos(boda({ guests: { enabled: true, visibility: 'visible' } }));
    expect(menu[0]?.icono).toBe('users');
  });

  it('y arrastra la visibilidad, que es lo que ve el invitado', () => {
    const menu = menuDeModulos(boda({ gallery: { enabled: true, visibility: 'soon' } }));
    expect(menu[0]?.visibilidad).toBe('soon');
  });

  it('una boda con el documento a medias no rompe el menú', () => {
    expect(menuDeModulos(boda({}))).toEqual([]);
  });

  it('todos los módulos del catálogo tienen icono', () => {
    for (const modulo of MODULOS) {
      expect(ICONO_MODULO[modulo], modulo).toBeTruthy();
    }
  });
});

describe('modulosNoVisibles', () => {
  // Es el número que explica por qué la web parece vacía.
  it('cuenta los activos que el invitado todavía no ve', () => {
    const cuantos = modulosNoVisibles(
      boda({
        rsvp: { enabled: true, visibility: 'visible' },
        gallery: { enabled: true, visibility: 'soon' },
        gifts: { enabled: true, visibility: 'hidden' },
        quiz: { enabled: false, visibility: 'hidden' },
      }),
    );
    expect(cuantos).toBe(2);
  });

  it('con todo publicado, cero', () => {
    expect(modulosNoVisibles(boda({ rsvp: { enabled: true, visibility: 'visible' } }))).toBe(0);
  });
});
