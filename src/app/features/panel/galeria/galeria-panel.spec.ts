import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_GALERIA_PANEL,
  type FotoPublica,
  type PuertaGaleriaPanel,
} from '../../../core/galeria/galeria-panel-gateway';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PanelGaleria } from './galeria-panel';
import { GaleriaPanelStore } from './galeria.store';

/**
 * La galería en el panel de la pareja (§8.5).
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que vaciar pida escribir la palabra.** Son las fotos de la boda de
 *    todos sus invitados y no hay papelera; un toque de más en un móvil no
 *    puede bastar.
 * 2. **Que borrar quite la foto sin recargar la galería entera.** Con cien
 *    fotos cargadas, recargar es tirar el trabajo y perder el sitio.
 * 3. **Que salga el nombre de quien subió cada foto**, que es el dato que
 *    convierte «esta sobra» en «hablo con mi primo».
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function foto(parcial: Partial<FotoPublica> & { id: string }): FotoPublica {
  return {
    url: `https://ejemplo/${parcial.id}.jpg`,
    urlMiniatura: `https://ejemplo/${parcial.id}-mini.jpg`,
    guestId: 'g1',
    autor: 'Ana Ruiz',
    pie: '',
    creadoEn: '2027-06-12T18:00:00.000Z',
    ...parcial,
  };
}

function montar(iniciales: readonly FotoPublica[], enLugarDe?: PuertaGaleriaPanel) {
  let fotos = [...iniciales];
  const llamadas: string[] = [];

  const doble: PuertaGaleriaPanel = enLugarDe ?? {
    async listar() {
      llamadas.push('listar');
      return { ok: true, fotos, cursor: null };
    },
    async borrar(photoId: string) {
      llamadas.push(`borrar:${photoId}`);
      fotos = fotos.filter((f) => f.id !== photoId);
      return { ok: true };
    },
    async vaciar() {
      llamadas.push('vaciar');
      const borradas = fotos.length;
      fotos = [];
      return { ok: true, borradas };
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      provideRouter([]),
      { provide: PUERTA_GALERIA_PANEL, useValue: doble },
      GaleriaPanelStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelGaleria);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  const asentar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };

  return {
    raiz,
    llamadas,
    asentar,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    fotos: () => [...raiz.querySelectorAll('.pg__foto')] as HTMLImageElement[],
    borradores: () => [...raiz.querySelectorAll('.pg__borrar')] as HTMLButtonElement[],
    boton(texto: string) {
      return [...raiz.querySelectorAll('button')].find((b) =>
        b.textContent?.includes(texto),
      ) as HTMLButtonElement;
    },
    enDialogo(texto: string) {
      return [...raiz.querySelectorAll('dialog button')].find((b) =>
        b.textContent?.includes(texto),
      ) as HTMLButtonElement;
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await asentar();
    },
    async escribir(valor: string) {
      const campo = raiz.querySelector('dialog input') as HTMLInputElement;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      await asentar();
    },
  };
}

describe('la galería en el panel', () => {
  it('pinta las miniaturas, no las fotos grandes', async () => {
    const p = montar([foto({ id: 'f1' }), foto({ id: 'f2' })]);
    await p.asentar();

    expect(p.fotos().map((i) => i.getAttribute('src'))).toEqual([
      'https://ejemplo/f1-mini.jpg',
      'https://ejemplo/f2-mini.jpg',
    ]);
  });

  it('dice de quién es cada foto', async () => {
    const p = montar([foto({ id: 'f1', autor: 'Pepe García', pie: 'Qué guapos' })]);
    await p.asentar();

    expect(p.texto()).toContain('Pepe García');
    expect(p.texto()).toContain('Qué guapos');
  });

  /** Un «1 fotos» en la cabecera de una pantalla canta como una falta. */
  it('con una foto, dice «1 foto»', async () => {
    const p = montar([foto({ id: 'f1' })]);
    await p.asentar();

    expect(p.texto()).toContain('1 foto');
  });

  it('con dos, dice «2 fotos»', async () => {
    const p = montar([foto({ id: 'f1' }), foto({ id: 'f2' })]);
    await p.asentar();

    expect(p.texto()).toContain('2 fotos');
  });

  it('sin fotos, lo dice en vez de enseñar una rejilla vacía', async () => {
    const p = montar([]);
    await p.asentar();

    expect(p.texto()).toContain('Todavía no hay fotos');
    expect(p.boton('Vaciar la galería')).toBeUndefined();
  });

  it('borrar pregunta antes, y al confirmar quita solo esa', async () => {
    const p = montar([foto({ id: 'f1' }), foto({ id: 'f2' })]);
    await p.asentar();

    await p.pulsar(p.borradores()[0]);
    expect(p.texto()).toContain('Se borra la foto que subió');

    await p.pulsar(p.enDialogo('Borrar'));

    expect(p.llamadas).toContain('borrar:f1');
    // Y sin volver a listar: la rejilla se queda donde estaba.
    expect(p.llamadas.filter((l) => l === 'listar')).toHaveLength(1);
    expect(p.fotos()).toHaveLength(1);
  });

  /**
   * El que importa. Vaciar borra las fotos de todos los invitados y no hay
   * papelera: hasta que no está escrita la palabra, el botón no vale.
   */
  it('vaciar no se puede hasta escribir la palabra', async () => {
    const p = montar([foto({ id: 'f1' }), foto({ id: 'f2' })]);
    await p.asentar();

    await p.pulsar(p.boton('Vaciar la galería'));
    expect(p.texto()).toContain('Escribid VACIAR');

    const confirmar = p.enDialogo('Vaciar la galería');
    expect(confirmar.disabled).toBe(true);

    await p.escribir('vaciat');
    expect(p.enDialogo('Vaciar la galería').disabled).toBe(true);

    await p.escribir('vaciar');
    expect(p.enDialogo('Vaciar la galería').disabled).toBe(false);

    await p.pulsar(p.enDialogo('Vaciar la galería'));

    expect(p.llamadas).toContain('vaciar');
    expect(p.texto()).toContain('Todavía no hay fotos');
  });

  it('si la llamada falla, lo dice y no se inventa la galería', async () => {
    const p = montar([], {
      async listar() {
        return { ok: false, fallo: { tipo: 'red' } };
      },
      async borrar() {
        return { ok: true };
      },
      async vaciar() {
        return { ok: true, borradas: 0 };
      },
    });
    await p.asentar();

    expect(p.texto()).toContain('No hay conexión');
  });
});
