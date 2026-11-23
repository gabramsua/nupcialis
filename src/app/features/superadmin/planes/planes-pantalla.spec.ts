import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { abrirDialogosEnPruebas } from '../../panel/invitados/dobles.testing';
import { montarConLlamadas, puertaDePrueba, type LlamadaRegistrada } from '../llamadas.testing';
import { PantallaPlanes } from './planes-pantalla';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

beforeAll(abrirDialogosEnPruebas);

const PLANES = {
  planes: [
    { id: 'basic', modulos: ['publicSite', 'rsvp'], porDefecto: true, bodas: 3 },
    { id: 'extended', modulos: ['publicSite', 'rsvp', 'quiz'], porDefecto: false, bodas: 1 },
  ],
  catalogo: ['publicSite', 'rsvp', 'quiz'],
};

function casilla(raiz: HTMLElement, plan: number, nombre: string): HTMLInputElement {
  const seccion = raiz.querySelectorAll('.pl__plan')[plan]!;
  const label = [...seccion.querySelectorAll('label')].find((l) => l.textContent?.includes(nombre));
  return label!.querySelector('input')!;
}

describe('planes y módulos', () => {
  it('enseña cada plan con sus módulos marcados y cuántas bodas lo tienen', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaPlanes,
      puertaDePrueba({ listPlans: () => PLANES }),
    );

    expect(p.texto()).toContain('Plan básico');
    expect(p.texto()).toContain('3 bodas');
    expect(casilla(p.raiz, 0, 'Confirmaciones').checked).toBe(true);
    expect(casilla(p.raiz, 0, 'Juego').checked).toBe(false);
    expect(casilla(p.raiz, 1, 'Juego').checked).toBe(true);
  });

  it('la web pública no se puede quitar', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaPlanes,
      puertaDePrueba({ listPlans: () => PLANES }),
    );
    expect(casilla(p.raiz, 0, 'Vuestra web').disabled).toBe(true);
  });

  it('añadir un módulo se guarda sin confirmar', async () => {
    const registro: LlamadaRegistrada[] = [];
    const p = await montarConLlamadas(
      ES,
      PantallaPlanes,
      puertaDePrueba(
        {
          listPlans: () => PLANES,
          savePlanModules: () => ({ aplicado: true, bodasActualizadas: 3 }),
        },
        registro,
      ),
    );

    casilla(p.raiz, 0, 'Juego').click();
    p.fixture.detectChanges();
    await p.pulsar(p.boton('Guardar cambios'));

    const guardado = registro.find((r) => r.nombre === 'savePlanModules');
    expect(guardado?.datos).toMatchObject({ plan: 'basic', confirmar: false });
    expect((guardado?.datos as { modules: string[] }).modules).toContain('quiz');
    expect(p.texto()).toContain('Se han actualizado 3 bodas');
  });

  it('quitar un módulo en uso pide confirmación con cuántas bodas lo usan', async () => {
    const registro: LlamadaRegistrada[] = [];
    let confirmadas = 0;
    const p = await montarConLlamadas(
      ES,
      PantallaPlanes,
      puertaDePrueba(
        {
          listPlans: () => PLANES,
          savePlanModules: (datos) => {
            if ((datos as { confirmar: boolean }).confirmar) {
              confirmadas++;
              return { aplicado: true, bodasActualizadas: 3 };
            }
            return {
              aplicado: false,
              requiereConfirmacion: true,
              afectadas: [{ modulo: 'rsvp', bodas: 3 }],
            };
          },
        },
        registro,
      ),
    );

    casilla(p.raiz, 0, 'Confirmaciones').click();
    p.fixture.detectChanges();
    await p.pulsar(p.boton('Guardar cambios'));

    expect(confirmadas).toBe(0);
    expect(p.dialogo()).toContain('Confirmaciones de asistencia: 3 bodas');
    expect(p.dialogo()).toContain('No se borra nada');

    await p.pulsar(p.boton('Sí, quitar', document.querySelector('dialog')!));
    expect(confirmadas).toBe(1);
  });

  it('un fallo al leer se cuenta, sin pantalla en blanco', async () => {
    const p = await montarConLlamadas(
      ES,
      PantallaPlanes,
      puertaDePrueba({ listPlans: () => new Error('red') }),
    );
    expect(p.texto()).toContain('No se han podido leer o guardar los planes');
  });
});
