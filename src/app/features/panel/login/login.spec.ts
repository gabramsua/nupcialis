import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';

import { PUERTA_AUTH, type PuertaAuth } from '../../../core/auth/auth-gateway';
import type { Sesion } from '../../../core/auth/session';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { Login } from './login';

/**
 * Regresión (D-54): la pareja entraba y volvía a la pantalla de acceso, porque
 * la navegación a `/panel` salía antes de que la sesión dejara de ser anónima
 * y el guarda del panel la echaba.
 */
describe('el acceso de la pareja', () => {
  it('no navega al panel hasta que la sesión está iniciada', async () => {
    let avisar: (sesion: Sesion) => void = () => undefined;
    const puerta = {
      observar(f: (sesion: Sesion) => void) {
        avisar = f;
        f({ rol: 'anonimo' } as Sesion);
        return () => undefined;
      },
      entrarConEmail: async () => undefined,
    } as unknown as PuertaAuth;

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideRouter([]),
        provideIconSprite('panel'),
        { provide: PUERTA_AUTH, useValue: puerta },
      ],
    });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const login = fixture.componentInstance as unknown as {
      form: { setValue(v: { email: string; password: string }): void };
      entrar(): Promise<void>;
    };
    login.form.setValue({ email: 'a@b.com', password: 'secreto1' });

    const entrando = login.entrar();
    await new Promise((listo) => setTimeout(listo, 20));
    expect(navegar).not.toHaveBeenCalled();

    avisar({ rol: 'pareja' } as unknown as Sesion);
    await entrando;
    expect(navegar).toHaveBeenCalledWith(['/panel']);
  });
});
