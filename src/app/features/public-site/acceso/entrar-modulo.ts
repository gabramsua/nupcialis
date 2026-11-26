import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { SesionInvitado, esPaginaConIdentidad } from '../../../core/firebase/sesion-invitado';
import { modoDeIdentificacion } from '../../../core/acceso/acceso';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import { usarTemaDeLaBoda } from '../tema';
import { Entrar } from './entrar';

/**
 * La puerta de los módulos que necesitan saber quién es el invitado (D-56).
 *
 * El quiz (ranking con nombre), la galería (quién subió cada foto), los regalos
 * (qué ha reservado cada uno) y la playlist (votos) **no funcionan sin
 * identidad**. En una boda abierta la portada no pide nada, así que quien toca
 * «Jugar» llega aquí: escribe su nombre y los cuatro últimos dígitos de su móvil
 * —lo mismo que en el modo B— y vuelve a la página a la que iba.
 *
 * El destino viaja como un nombre de página (`?volver=quiz`), no como una ruta:
 * un parámetro que acabara en `navigateByUrl` sería un redireccionamiento
 * abierto, y esto se comparte por WhatsApp.
 */
@Component({
  selector: 'np-entrar-modulo',
  imports: [TranslocoDirective, Entrar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style]': 'tema()' },
  template: `
    <ng-container *transloco="let t">
      <np-entrar
        [modo]="modo()"
        [slug]="slug()"
        [nombres]="nombres()"
        [motivo]="motivo()"
        [nombrePrevio]="''"
      />
    </ng-container>
  `,
})
export class EntrarModulo {
  private readonly sesion = inject(SesionInvitado);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslocoService);

  readonly tenant = input<ResultadoTenant | null>(null);
  /** La página a la que volver; solo vale una de la lista. */
  readonly volver = input('');

  protected readonly tema = usarTemaDeLaBoda(this.tenant);

  private readonly sitio = computed(() => {
    const t = this.tenant();
    return t?.tipo === 'ok' ? t.sitio : null;
  });

  /** Una boda abierta se identifica como el modo B; las demás, como siempre. */
  protected readonly modo = computed(() =>
    modoDeIdentificacion(this.sitio()?.guestAccessMode ?? 'open'),
  );
  protected readonly slug = computed(() => {
    const t = this.tenant();
    return t?.tipo === 'ok' ? t.slug : '';
  });
  protected readonly nombres = computed(() => {
    const n = this.sitio()?.coupleNames;
    return n ? [n.partnerA, n.partnerB].filter(Boolean).join(' & ') : '';
  });

  protected readonly destino = computed(() => {
    const pagina = this.volver();
    return esPaginaConIdentidad(pagina) ? `/${pagina}` : '/';
  });

  protected readonly motivo = computed(() => {
    const pagina = this.volver();
    return esPaginaConIdentidad(pagina)
      ? this.i18n.translate(`publico.acceso.motivo.${pagina}`)
      : '';
  });

  constructor() {
    // En cuanto la sesión es de verdad (no basta el enlace), se vuelve.
    effect(() => {
      if (this.sesion.verificado()) void this.router.navigateByUrl(this.destino());
    });
  }
}
