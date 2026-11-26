import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  montarConLlamadas,
  puertaDePrueba,
  type LlamadaRegistrada,
} from '../../superadmin/llamadas.testing';
import { BodaStore } from '../boda.store';
import type { BodaDelPanel } from '../boda';
import { abrirDialogosEnPruebas, BODA_DE_PRUEBA } from '../boda.testing';
import { PublicarWeb } from './publicar-web';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

beforeAll(() => abrirDialogosEnPruebas());

function montar(
  boda: BodaDelPanel,
  registro: LlamadaRegistrada[] = [],
  posicion?: 'arriba' | 'abajo',
) {
  let recargas = 0;
  const puerta = puertaDePrueba(
    { setMyWebStatus: (d) => ({ status: (d as { status: string }).status }) },
    registro,
  );
  const montado = montarConLlamadas(ES, PublicarWeb, puerta, [
    {
      provide: BodaStore,
      useValue: {
        boda: () => boda,
        async cargar() {
          recargas += 1;
        },
        recargas: () => recargas,
      },
    },
  ]);
  if (posicion === undefined) return montado;
  return montado.then(async (p) => {
    p.fixture.componentRef.setInput('posicion', posicion);
    await p.esperar();
    return p;
  });
}

const BORRADOR: BodaDelPanel = { ...BODA_DE_PRUEBA, status: 'draft' };

describe('publicar la web desde el panel', () => {
  it('en borrador ofrece publicar', async () => {
    const p = await montar(BORRADOR);
    const boton = p.boton('Publicar') as HTMLButtonElement;
    expect(boton).toBeTruthy();
    expect(boton.disabled).toBe(false);
  });

  it('avisa de lo que falta y no deja publicar', async () => {
    const p = await montar({ ...BORRADOR, weddingDate: null });
    const boton = p.boton('Publicar') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(p.texto()).toContain('La fecha de la boda');
  });

  it('publica tras confirmar, pidiendo `active` al servidor', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montar(BORRADOR, registro);

    await p.pulsar(p.boton('Publicar'));
    expect(registro).toEqual([]); // todavía no: antes se confirma

    const confirmar = p.boton('Sí, publicar', document.body);
    await p.pulsar(confirmar);

    expect(registro).toEqual([{ nombre: 'setMyWebStatus', datos: { status: 'active' } }]);
  });

  it('en la confirmación de publicar avisa de que se borran las pruebas del quiz', async () => {
    const p = await montar({
      ...BORRADOR,
      modulos: { ...BORRADOR.modulos, quiz: { enabled: true, visibility: 'visible' } },
    });
    await p.pulsar(p.boton('Publicar'));
    expect(p.dialogo().toLowerCase()).toContain('prueba');
  });

  it('una web publicada enseña su dirección y ofrece volver a borrador', async () => {
    const p = await montar(BODA_DE_PRUEBA);
    expect(p.boton('Volver a borrador')).toBeTruthy();
    expect(p.raiz.querySelector('a[target="_blank"]')).not.toBeNull();
  });

  it('una boda archivada no enseña nada: eso es cosa del superadmin', async () => {
    const p = await montar({ ...BODA_DE_PRUEBA, status: 'archived' });
    expect(p.raiz.querySelector('section')).toBeNull();
  });

  // D-55: arriba solo el publicar (si está en borrador); abajo, pequeño, el volver a borrador.
  describe('según dónde se ponga', () => {
    it('arriba, en borrador sale el publicar', async () => {
      const p = await montar(BORRADOR, [], 'arriba');
      expect(p.boton('Publicar')).toBeTruthy();
    });

    it('arriba, con la web publicada no sale nada', async () => {
      const p = await montar(BODA_DE_PRUEBA, [], 'arriba');
      expect(p.raiz.querySelector('section')).toBeNull();
    });

    it('abajo, con la web publicada sale el volver a borrador, en pequeño', async () => {
      const p = await montar(BODA_DE_PRUEBA, [], 'abajo');
      expect(p.raiz.querySelector('section.pw--flota')).not.toBeNull();
      expect(p.boton('Volver a borrador')?.getAttribute('data-size')).toBe('sm');
    });

    it('abajo, en borrador no sale nada (el publicar está arriba)', async () => {
      const p = await montar(BORRADOR, [], 'abajo');
      expect(p.raiz.querySelector('section')).toBeNull();
    });
  });
});
