import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_HOME_ADMIN, type FalloHome } from '../../../core/home/home-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  ACENTOS_HOME,
  FUENTES_HOME,
  HOME_DE_FABRICA,
  INFO_PLANTILLAS_HOME,
  MAX_ENLACES_PIE,
  MAX_ETIQUETA,
  MAX_FRASE,
  MAX_HTML,
  MAX_HTML_CORTO,
  MAX_ITEMS_LIBERTAD,
  MAX_ITEMS_PASOS,
  MAX_ITEMS_PROMESA,
  MAX_TITULO,
  MAX_VINETAS,
  type ContenidoHome,
  type ImagenHome,
  type PlantillaHome,
} from '../../home/home';
import { NpHomePagina } from '../../home/home-pagina';
import { NpHcHtml, NpHcIcono, NpHcImagen, NpHcTexto } from './home-campos';
import { cambiarLista, leerEn, moverEn, ponerEn, rutasDeImagenes } from './home-ruta';

type Carga = 'cargando' | 'lista' | 'error';
type Seccion =
  | 'estilo'
  | 'hero'
  | 'promesa'
  | 'pasos'
  | 'paneles'
  | 'libertad'
  | 'planes'
  | 'cierre'
  | 'pie'
  | 'seo';

const SECCIONES: readonly Seccion[] = [
  'estilo',
  'hero',
  'promesa',
  'pasos',
  'paneles',
  'libertad',
  'planes',
  'cierre',
  'pie',
  'seo',
];

/**
 * El editor de la HOME de `nupcialis.com` (la portada del producto).
 *
 * Todo lo que se ve en esa página se cambia desde aquí: plantilla, tipografías,
 * color, textos (con Jodit donde hay formato), iconos, imágenes y SEO. Se
 * trabaja sobre un **borrador**: la vista previa lo muestra al instante y no
 * llega a la web hasta pulsar «Guardar y publicar». «Restaurar de fábrica»
 * borra lo guardado y la HOME vuelve a lo que trae la aplicación.
 *
 * Solo está abierta la sección que se edita: Jodit es pesado y diez editores a
 * la vez harían la pantalla inutilizable.
 */
@Component({
  selector: 'np-superadmin-home',
  imports: [
    NgTemplateOutlet,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpIcon,
    NpInput,
    NpHomePagina,
    NpHcTexto,
    NpHcHtml,
    NpHcIcono,
    NpHcImagen,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-pantalla.html',
  styleUrl: './home-pantalla.scss',
})
export class PantallaHome {
  private readonly puerta = inject(PUERTA_HOME_ADMIN);

  protected readonly secciones = SECCIONES;
  protected readonly plantillas = INFO_PLANTILLAS_HOME;
  protected readonly acentos = ACENTOS_HOME;
  protected readonly titulos = FUENTES_HOME.filter((f) => f.tipo === 'titulo');
  protected readonly cuerpos = FUENTES_HOME.filter((f) => f.tipo === 'cuerpo');
  protected readonly fabrica = HOME_DE_FABRICA;

  protected readonly max = {
    titulo: MAX_TITULO,
    etiqueta: MAX_ETIQUETA,
    frase: MAX_FRASE,
    html: MAX_HTML,
    htmlCorto: MAX_HTML_CORTO,
    seoDescripcion: 300,
    promesa: MAX_ITEMS_PROMESA,
    pasos: MAX_ITEMS_PASOS,
    libertad: MAX_ITEMS_LIBERTAD,
    vinetas: MAX_VINETAS,
    enlacesPie: MAX_ENLACES_PIE,
  } as const;

  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloHome | null>(null);
  protected readonly borrador = signal<ContenidoHome>(HOME_DE_FABRICA);
  private readonly guardado = signal<ContenidoHome>(HOME_DE_FABRICA);
  /** `true` si hay algo guardado en Firestore; si no, la web usa lo de fábrica. */
  protected readonly hayGuardado = signal(false);

  protected readonly abierta = signal<Seccion>('estilo');
  protected readonly vista = signal<'escritorio' | 'movil'>('escritorio');
  protected readonly ocupado = signal<'guardando' | 'restaurando' | null>(null);
  protected readonly subiendo = signal<string | null>(null);
  protected readonly confirmando = signal(false);
  protected readonly publicado = signal(false);

  /** Hay cambios sin publicar. Compara el contenido, no la identidad. */
  protected readonly sucio = computed(
    () => JSON.stringify(this.borrador()) !== JSON.stringify(this.guardado()),
  );

  /** Las rutas de Storage que conocemos, para borrar las que ya no use nadie. */
  private conocidas: ReadonlySet<string> = new Set();

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const r = await this.puerta.leer();
    if (!r.ok) {
      this.fallo.set(r.fallo);
      this.carga.set('error');
      return;
    }
    const contenido = r.datos ?? HOME_DE_FABRICA;
    this.hayGuardado.set(r.datos !== null);
    this.borrador.set(contenido);
    this.guardado.set(contenido);
    this.conocidas = rutasDeImagenes(contenido);
    this.fallo.set(null);
    this.carga.set('lista');
  }

  // --- edición ---------------------------------------------------------

  protected alternar(s: Seccion): void {
    this.abierta.update((a) => (a === s ? ('' as Seccion) : s));
  }

  protected valor(ruta: string): string {
    const v = leerEn(this.borrador(), ruta);
    return typeof v === 'string' ? v : '';
  }

  protected activa(ruta: string): boolean {
    return leerEn(this.borrador(), ruta) === true;
  }

  protected poner(ruta: string, valor: unknown): void {
    this.publicado.set(false);
    this.borrador.update((b) => ponerEn(b, ruta, valor));
  }

  protected elegirPlantilla(id: PlantillaHome): void {
    this.poner('template', id);
  }

  protected alternarActiva(ruta: string, e: Event): void {
    this.poner(ruta, (e.target as HTMLInputElement).checked);
  }

  protected valorDe(e: Event): string {
    return (e.target as HTMLSelectElement).value;
  }

  protected anadir(ruta: string, nuevo: unknown, tope: number): void {
    this.publicado.set(false);
    this.borrador.update((b) =>
      cambiarLista(b, ruta, (l) => (l.length >= tope ? l : [...l, nuevo])),
    );
  }

  protected quitar(ruta: string, i: number): void {
    this.publicado.set(false);
    this.borrador.update((b) => cambiarLista(b, ruta, (l) => l.filter((_, n) => n !== i)));
  }

  protected mover(ruta: string, i: number, delta: -1 | 1): void {
    this.publicado.set(false);
    this.borrador.update((b) => cambiarLista(b, ruta, (l) => moverEn(l, i, i + delta)));
  }

  protected conIcono(): { icon: string; title: string; text: string } {
    return { icon: 'heart', title: '', text: '' };
  }

  // --- imágenes --------------------------------------------------------

  protected imagen(ruta: string): ImagenHome | null {
    return (leerEn(this.borrador(), ruta) as ImagenHome | null | undefined) ?? null;
  }

  protected imagenDeSerie(ruta: string): ImagenHome | null {
    return (leerEn(HOME_DE_FABRICA, ruta) as ImagenHome | null | undefined) ?? null;
  }

  protected async subir(ruta: string, fichero: File): Promise<void> {
    this.subiendo.set(ruta);
    this.fallo.set(null);
    const r = await this.puerta.subirImagen(fichero);
    this.subiendo.set(null);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    const alt = this.imagen(ruta)?.alt ?? this.imagenDeSerie(ruta)?.alt ?? '';
    this.conocidas = new Set([...this.conocidas, r.datos.path]);
    this.poner(ruta, { ...r.datos, alt });
  }

  protected cambiarAlt(ruta: string, alt: string): void {
    const actual = this.imagen(ruta);
    if (actual) this.poner(ruta, { ...actual, alt });
  }

  // --- publicar --------------------------------------------------------

  protected async guardar(): Promise<void> {
    this.ocupado.set('guardando');
    this.fallo.set(null);
    const r = await this.puerta.guardar(this.borrador());
    this.ocupado.set(null);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    this.borrador.set(r.datos);
    this.guardado.set(r.datos);
    this.hayGuardado.set(true);
    this.publicado.set(true);
    await this.limpiarHuerfanas(r.datos);
  }

  protected descartar(): void {
    this.borrador.set(this.guardado());
    this.publicado.set(false);
  }

  protected async restaurar(): Promise<void> {
    this.ocupado.set('restaurando');
    this.confirmando.set(false);
    this.fallo.set(null);
    const r = await this.puerta.restaurar();
    this.ocupado.set(null);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      return;
    }
    this.borrador.set(HOME_DE_FABRICA);
    this.guardado.set(HOME_DE_FABRICA);
    this.hayGuardado.set(false);
    await this.limpiarHuerfanas(HOME_DE_FABRICA);
  }

  /** Borra de Storage lo que se subió y ya no usa la HOME publicada. */
  private async limpiarHuerfanas(publicada: ContenidoHome): Promise<void> {
    const enUso = rutasDeImagenes(publicada);
    const sobran = [...this.conocidas].filter((p) => !enUso.has(p));
    this.conocidas = enUso;
    await Promise.all(sobran.map((p) => this.puerta.borrarImagen(p)));
  }

  protected textoDeFallo(f: FalloHome | null, t: (clave: string) => string): string {
    switch (f?.tipo) {
      case 'sin-permiso':
        return t('superadmin.home.fallo.sinPermiso');
      case 'red':
        return t('superadmin.home.fallo.red');
      case 'largo':
        return t('superadmin.home.fallo.largo');
      case 'error':
        return f.mensaje;
      default:
        return t('superadmin.home.fallo.otro');
    }
  }
}
