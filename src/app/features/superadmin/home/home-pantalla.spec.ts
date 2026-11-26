import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PUERTA_HOME_ADMIN, type PuertaHomeAdmin } from '../../../core/home/home-gateway';
import { HOME_DE_FABRICA, sanearHome, type ContenidoHome } from '../../home/home';
import { montarConLlamadas, puertaDePrueba } from '../llamadas.testing';
import { PantallaHome } from './home-pantalla';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

interface Registro {
  guardados: ContenidoHome[];
  restaurados: number;
  borradas: string[];
  subidas: number;
}

function puerta(inicial: ContenidoHome | null, r: Registro): PuertaHomeAdmin {
  return {
    async leer() {
      return { ok: true, datos: inicial };
    },
    async guardar(contenido) {
      r.guardados.push(contenido);
      return { ok: true, datos: sanearHome(contenido) };
    },
    async restaurar() {
      r.restaurados += 1;
      return { ok: true, datos: null };
    },
    async subirImagen() {
      r.subidas += 1;
      return {
        ok: true,
        datos: {
          path: `platform/home/${r.subidas}.jpg`,
          url: `https://firebasestorage.googleapis.com/v0/b/x/o/${r.subidas}`,
          alt: '',
        },
      };
    },
    async borrarImagen(ruta) {
      r.borradas.push(ruta);
    },
  };
}

async function montar(inicial: ContenidoHome | null = null) {
  const registro: Registro = { guardados: [], restaurados: 0, borradas: [], subidas: 0 };
  const p = await montarConLlamadas(ES, PantallaHome, puertaDePrueba({}), [
    { provide: PUERTA_HOME_ADMIN, useValue: puerta(inicial, registro) },
  ]);
  return { p, registro };
}

function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string): void {
  el.value = valor;
  el.dispatchEvent(new Event('input'));
}

describe('el editor de la web de inicio', () => {
  it('sin nada guardado enseña lo de fábrica y no deja publicar', async () => {
    const { p } = await montar();

    expect(p.texto()).toContain('se muestra lo de fábrica');
    expect(p.boton('Guardar y publicar')?.hasAttribute('disabled')).toBe(true);
  });

  it('editar un campo lo marca sin publicar y se ve en la vista previa', async () => {
    const { p } = await montar();

    await p.pulsar(p.boton('Portada'));
    const titulo = [...p.raiz.querySelectorAll('textarea')].find(
      (t) => t.value === HOME_DE_FABRICA.hero.title,
    )!;
    escribir(titulo, 'Un titular nuevo');
    await p.esperar();

    expect(p.texto()).toContain('Cambios sin publicar');
    expect(p.raiz.querySelector('np-home-pagina')?.textContent).toContain('Un titular nuevo');
    expect(p.boton('Guardar y publicar')?.hasAttribute('disabled')).toBe(false);
  });

  it('guardar manda el borrador y deja el editor al día', async () => {
    const { p, registro } = await montar();

    await p.pulsar(p.boton('SEO'));
    const entrada = p.raiz.querySelector<HTMLInputElement>('input[type=text]')!;
    escribir(entrada, 'Mi título');
    await p.esperar();
    await p.pulsar(p.boton('Guardar y publicar'));

    expect(registro.guardados).toHaveLength(1);
    expect(registro.guardados[0]!.seo.title).toBe('Mi título');
    expect(p.texto()).toContain('Publicado');
    expect(p.texto()).not.toContain('Cambios sin publicar');
  });

  it('descartar vuelve a lo guardado', async () => {
    const { p } = await montar();

    await p.pulsar(p.boton('SEO'));
    escribir(p.raiz.querySelector<HTMLInputElement>('input[type=text]')!, 'Otro');
    await p.esperar();
    await p.pulsar(p.boton('Descartar cambios'));

    expect(p.texto()).not.toContain('Cambios sin publicar');
  });

  it('añadir y quitar tarjetas respeta el tope', async () => {
    const { p } = await montar();

    await p.pulsar(p.boton('Lo que hace Nupcialis'));
    const antes = p.raiz.querySelectorAll('.ph__item').length;
    await p.pulsar(p.boton('Añadir'));
    expect(p.raiz.querySelectorAll('.ph__item')).toHaveLength(antes + 1);
    // Con cuatro (el máximo) ya no se ofrece añadir.
    expect(p.boton('Añadir')).toBeUndefined();

    await p.pulsar(p.raiz.querySelector('.ph__item button[aria-label="Quitar"]'));
    expect(p.raiz.querySelectorAll('.ph__item')).toHaveLength(antes);
  });

  it('restaurar pide confirmación y vuelve a lo de fábrica', async () => {
    const guardado = sanearHome({
      ...HOME_DE_FABRICA,
      seo: { title: 'Guardado', description: '' },
    });
    const { p, registro } = await montar(guardado);

    expect(p.texto()).toContain('Publicado y al día');
    await p.pulsar(p.boton('Restaurar de fábrica'));
    expect(registro.restaurados).toBe(0);
    await p.pulsar(p.boton('Sí, restaurar'));

    expect(registro.restaurados).toBe(1);
    expect(p.texto()).toContain('se muestra lo de fábrica');
  });

  it('borra de Storage la imagen subida que ya no se usa tras publicar', async () => {
    const { p, registro } = await montar();

    await p.pulsar(p.boton('Portada'));
    const fichero = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });
    const entrada = p.raiz.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(entrada, 'files', { value: [fichero] });
    entrada.dispatchEvent(new Event('change'));
    await p.esperar();
    await p.pulsar(p.boton('Quitar imagen'));
    await p.pulsar(p.boton('Guardar y publicar'));

    expect(registro.subidas).toBe(1);
    expect(registro.borradas).toEqual(['platform/home/1.jpg']);
  });
});
