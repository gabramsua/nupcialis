import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_INVITADOS,
  type FalloInvitado,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import { Invitados } from './invitados';

/**
 * Lo que un 401 le tiene que contar a la pareja.
 *
 * Este fichero nace de un fallo concreto: la pantalla enseñaba
 * «Unauthenticated [401]» tal cual, porque el listado era el único camino que
 * no traducía el error del SDK. Un mensaje así cuesta lo mismo que no tener
 * mensaje, y App Check sin configurar es **el** fallo más habitual mientras se
 * desarrolla contra el proyecto real.
 */
function puertaQueFalla(fallo: FalloInvitado): PuertaInvitados {
  return {
    async listar() {
      return { ok: false, fallo };
    },
    async guardar() {
      return { ok: false, fallo };
    },
    async borrar() {
      return { ok: false, fallo };
    },
  };
}

const TEXTOS = {
  panel: {
    invitados: {
      errorCargar: 'No se ha podido cargar la lista',
      sinPermiso: 'Tu sesión no tiene permiso sobre esta boda.',
    },
  },
  superadmin: {
    alta: { sinVerificar: 'Falta App Check. Revisa el token de depuración.' },
  },
};

async function montar(fallo: FalloInvitado) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: TEXTOS },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      { provide: PUERTA_INVITADOS, useValue: puertaQueFalla(fallo) },
    ],
  });

  const fixture = TestBed.createComponent(Invitados);
  fixture.detectChanges();
  // El listado se pide en el constructor: hay que dejar resolver la promesa.
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture.nativeElement.textContent ?? '';
}

describe('cuando el listado falla', () => {
  it('un 401 se cuenta como lo que es: falta App Check', async () => {
    const texto = await montar({ tipo: 'sin-verificar' });

    expect(texto).toContain('App Check');
    // Lo que no puede volver a pasar: el código crudo del SDK en pantalla.
    expect(texto).not.toContain('401');
    expect(texto).not.toContain('Unauthenticated');
  });

  it('un permiso denegado dice qué cuenta hace falta', async () => {
    const texto = await montar({ tipo: 'sin-permiso' });
    expect(texto).toContain('permiso');
  });

  it('un error de verdad enseña el mensaje del servidor, que sí informa', async () => {
    const texto = await montar({ tipo: 'error', mensaje: 'La base de datos no responde' });
    expect(texto).toContain('La base de datos no responde');
  });
});
