import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { abrirDialogosEnPruebas } from '../../panel/invitados/dobles.testing';
import { montarConLlamadas, puertaDePrueba, type LlamadaRegistrada } from '../llamadas.testing';
import { Component } from '@angular/core';
import { FichaAcciones } from './ficha-acciones';
import { ficha } from './gestion.testing';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

beforeAll(abrirDialogosEnPruebas);

/** Un anfitrión mínimo: `input.required` no se rellena montando el componente solo. */
@Component({
  imports: [FichaAcciones],
  template: `<np-ficha-acciones
    [ficha]="ficha"
    (editada)="editadas = editadas + 1"
    (borrada)="borradas = borradas + 1"
  />`,
})
class Anfitrion {
  ficha = ficha({ slug: 'maria-y-gabriel' });
  editadas = 0;
  borradas = 0;
}

function entrada(nombre: string): HTMLInputElement | HTMLSelectElement {
  return document.querySelector<HTMLInputElement>(`dialog [name="${nombre}"]`)!;
}

function escribir(el: HTMLInputElement, valor: string) {
  el.value = valor;
  el.dispatchEvent(new Event('input'));
}

describe('editar y borrar una boda', () => {
  it('editar manda solo lo que ha cambiado', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      Anfitrion,
      puertaDePrueba({ updateWedding: () => ({ ok: true }) }, registro),
    );
    await p.pulsar(p.boton('Editar datos'));

    escribir(entrada('a') as HTMLInputElement, 'Marta');
    await p.esperar();
    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));

    expect(registro.find((r) => r.nombre === 'updateWedding')?.datos).toEqual({
      weddingId: 'w1',
      cambios: { partnerA: 'Marta' },
    });
  });

  it('cambiar la dirección avisa de que rompe los enlaces y la manda', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      Anfitrion,
      puertaDePrueba({ updateWedding: () => ({ ok: true }) }, registro),
    );
    await p.pulsar(p.boton('Editar datos'));
    expect(document.querySelector('dialog')?.textContent).not.toContain('rompe los enlaces');

    escribir(entrada('slug') as HTMLInputElement, 'maria-y-gabriel-2027');
    await p.esperar();
    expect(document.querySelector('dialog')?.textContent).toContain('rompe los enlaces');

    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));
    expect(registro.find((r) => r.nombre === 'updateWedding')?.datos).toEqual({
      weddingId: 'w1',
      cambios: { slug: 'maria-y-gabriel-2027' },
    });
  });

  it('fija el precio acordado en céntimos (D-56)', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      Anfitrion,
      puertaDePrueba({ updateWedding: () => ({ ok: true }) }, registro),
    );
    await p.pulsar(p.boton('Editar datos'));

    escribir(entrada('precio') as HTMLInputElement, '149,90');
    await p.esperar();
    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));

    expect(registro.find((r) => r.nombre === 'updateWedding')?.datos).toEqual({
      weddingId: 'w1',
      cambios: { agreedPriceCents: 14990 },
    });
  });

  it('el precio 0 es válido: la boda se regala', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      Anfitrion,
      puertaDePrueba({ updateWedding: () => ({ ok: true }) }, registro),
    );
    await p.pulsar(p.boton('Editar datos'));

    escribir(entrada('precio') as HTMLInputElement, '0');
    await p.esperar();
    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));

    expect(registro.find((r) => r.nombre === 'updateWedding')?.datos).toEqual({
      weddingId: 'w1',
      cambios: { agreedPriceCents: 0 },
    });
  });

  it('un precio ilegible no se manda y se explica', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      Anfitrion,
      puertaDePrueba({ updateWedding: () => ({ ok: true }) }, registro),
    );
    await p.pulsar(p.boton('Editar datos'));

    escribir(entrada('precio') as HTMLInputElement, 'barato');
    await p.esperar();
    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));

    expect(registro.find((r) => r.nombre === 'updateWedding')).toBeUndefined();
    expect(document.querySelector('dialog')?.textContent).toContain('Escribe un importe en euros');
  });

  it('editar sin cambiar nada no llama al servidor', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(ES, Anfitrion, puertaDePrueba({}, registro));
    await p.pulsar(p.boton('Editar datos'));
    await p.pulsar(p.boton('Guardar', document.querySelector('dialog')!));
    expect(registro).toHaveLength(0);
  });

  it('borrar exige escribir la dirección exacta de la boda', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      Anfitrion,
      puertaDePrueba({ deleteWedding: () => ({ ok: true, avisos: [] }) }, registro),
    );
    await p.pulsar(p.boton('Eliminar la boda'));

    const boton = p.boton('Eliminar para siempre', document.querySelector('dialog')!)!;
    expect(boton.disabled).toBe(true);

    escribir(entrada('confirmar') as HTMLInputElement, 'otra-direccion');
    await p.esperar();
    expect(boton.disabled).toBe(true);

    escribir(entrada('confirmar') as HTMLInputElement, 'maria-y-gabriel');
    await p.esperar();
    expect(boton.disabled).toBe(false);

    await p.pulsar(boton);
    expect(registro.find((r) => r.nombre === 'deleteWedding')?.datos).toEqual({
      weddingId: 'w1',
      confirmarSlug: 'maria-y-gabriel',
    });
    expect((p.fixture.componentInstance as Anfitrion).borradas).toBe(1);
  });

  it('si el servidor falla al borrar, lo cuenta y no sale de la ficha', async () => {
    const p = await montarConLlamadas(
      ES,
      Anfitrion,
      puertaDePrueba({ deleteWedding: () => new Error('red') }),
    );
    await p.pulsar(p.boton('Eliminar la boda'));
    escribir(entrada('confirmar') as HTMLInputElement, 'maria-y-gabriel');
    await p.esperar();
    await p.pulsar(p.boton('Eliminar para siempre', document.querySelector('dialog')!));

    expect(p.dialogo()).toContain('No se ha podido eliminar');
    expect((p.fixture.componentInstance as Anfitrion).borradas).toBe(0);
  });
});
