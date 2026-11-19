import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_RSVP,
  type Formulario,
  type Pregunta,
  type PuertaRsvp,
  type Respuestas,
  type DatosAcompanante,
  type ResultadoAcompanante,
  type ResultadoEnvio,
  type ResultadoFormulario,
} from '../../../core/rsvp/rsvp-gateway';
import { SesionInvitado } from '../../../core/firebase/sesion-invitado';
import { Confirmar } from './confirmar';

/**
 * El formulario de confirmación, visto como lo ve el invitado.
 *
 * Lo que se vigila aquí, por orden de lo que costaría si se rompe:
 *
 * 1. **Que al decir «no voy» desaparezca el menú**, en el mismo instante. Si no,
 *    alguien que no va elige menú y el catering cuenta un comensal de más.
 * 2. **Que solo se mande lo que está a la vista.** Lo que se esconde no viaja.
 * 3. **Que el fallo salga pegado a su pregunta.** En un móvil, un aviso
 *    genérico arriba obliga a buscar cuál de las ocho falta.
 * 4. **Que ningún mensaje del SDK llegue a la pantalla.** Ya pasó una vez con
 *    «Unauthenticated [401]» en el panel.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

/**
 * Deja que terminen las promesas pendientes.
 *
 * Un par de `await Promise.resolve()` no basta: enviar puede encadenar una
 * recarga, y entonces hay dos saltos de cola por detrás. Un `setTimeout` de
 * cero se pone al final de todo lo que haya.
 */
function vaciarCola(): Promise<void> {
  return new Promise((listo) => setTimeout(listo, 0));
}

function pregunta(parcial: Partial<Pregunta> & { id: string }): Pregunta {
  return {
    label: parcial.id,
    helpText: '',
    type: 'text',
    options: [],
    required: false,
    visibleIf: null,
    order: 1,
    ...parcial,
  };
}

const ASISTENCIA = pregunta({
  id: 'asistencia',
  label: '¿Vendrás a la boda?',
  type: 'boolean',
  required: true,
});

const MENU = pregunta({
  id: 'menu',
  label: 'Menú',
  type: 'select',
  required: true,
  options: [
    { value: 'normal', label: 'Normal' },
    { value: 'vegano', label: 'Vegano' },
  ],
  visibleIf: { questionId: 'asistencia', equals: true },
  order: 2,
});

function formulario(parcial: Partial<Formulario> = {}): Formulario {
  return {
    preguntas: [ASISTENCIA, MENU],
    respuestas: {},
    estado: 'pending',
    nombre: 'Majo',
    limite: null,
    abierto: true,
    yaContestado: false,
    acompanantes: [],
    puedeAnadirAcompanantes: false,
    quedanAcompanantes: 0,
    exigeTelefonoDelAcompanante: false,
    ...parcial,
  };
}

function puertaFalsa(
  lectura: ResultadoFormulario,
  envio: ResultadoEnvio = { ok: true, estado: 'confirmed' },
  altaAcompanante: ResultadoAcompanante = { ok: true, id: 'nuevo', quedan: 0 },
) {
  const enviados: Respuestas[] = [];
  const apuntados: DatosAcompanante[] = [];
  const quitados: string[] = [];
  /** Lo que devuelve `leer`, para poder cambiarlo entre llamadas. */
  const lecturas = [lectura];

  const doble: PuertaRsvp = {
    async leer() {
      return lecturas[lecturas.length - 1]!;
    },
    async enviar(respuestas) {
      enviados.push(respuestas);
      return envio;
    },
    async anadirAcompanante(datos) {
      apuntados.push(datos);
      return altaAcompanante;
    },
    async quitarAcompanante(id) {
      quitados.push(id);
      return { ok: true };
    },
  };

  return { enviados, apuntados, quitados, lecturas, doble };
}

async function montar(
  lectura: ResultadoFormulario = { ok: true, formulario: formulario() },
  envio?: ResultadoEnvio,
  altaAcompanante?: ResultadoAcompanante,
) {
  const puerta = puertaFalsa(lectura, envio, altaAcompanante);

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('public'),
      { provide: PUERTA_RSVP, useValue: puerta.doble },
      // El paso de «confirma que eres tú» (D-34) usa la sesión para subir de
      // nivel. Aquí basta con que exista.
      {
        provide: SesionInvitado,
        useValue: {
          async verificar() {
            return { ok: true as const, guestId: 'g1' };
          },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(Confirmar);
  fixture.detectChanges();
  // La carga es asíncrona: se pide en el constructor y hay que dejarla llegar.
  await vaciarCola();
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    puerta,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    etiquetas: () => [...raiz.querySelectorAll('legend')].map((l) => l.textContent?.trim() ?? ''),
    pulsar(selector: string) {
      raiz.querySelector<HTMLElement>(selector)!.click();
      fixture.detectChanges();
    },
    elegir(questionId: string, valor: string) {
      const select = raiz.querySelector<HTMLSelectElement>(`select`)!;
      select.value = valor;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      return questionId;
    },
    escribirEn(selector: string, valor: string) {
      const campo = raiz.querySelector<HTMLInputElement>(selector)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    },
    async pulsarEn(selector: string) {
      raiz.querySelector<HTMLElement>(selector)!.click();
      await vaciarCola();
      fixture.detectChanges();
    },
    async enviar() {
      raiz
        .querySelector<HTMLFormElement>('form')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await vaciarCola();
      fixture.detectChanges();
    },
  };
}

/** Los dos botones de sí/no de la pregunta de asistencia. */
const SI = '.cf__opcion--si';
const NO = '.cf__opcion--no';

describe('el formulario de confirmación', () => {
  it('saluda por su nombre y pregunta lo que toca', async () => {
    const p = await montar();

    expect(p.texto()).toContain('Hola, Majo');
    expect(p.etiquetas()[0]).toContain('¿Vendrás a la boda?');
  });

  /** **La que importa.** Lo que no se le pregunta, no se le enseña. */
  it('al decir que no viene, el menú desaparece en el acto', async () => {
    const p = await montar();
    p.pulsar(SI);
    expect(p.etiquetas().join(' ')).toContain('Menú');

    p.pulsar(NO);

    expect(p.etiquetas().join(' ')).not.toContain('Menú');
  });

  it('de entrada tampoco: nadie elige menú antes de decir si va', async () => {
    const p = await montar();

    expect(p.etiquetas().join(' ')).not.toContain('Menú');
  });

  it('solo manda lo que está a la vista y contestado', async () => {
    const p = await montar();
    p.pulsar(SI);
    p.elegir('menu', 'vegano');
    p.pulsar(NO);
    await p.enviar();

    expect(p.puerta.enviados).toEqual([{ asistencia: false }]);
  });

  it('lo que falta se dice sin salir a la red', async () => {
    const p = await montar();
    await p.enviar();

    expect(p.texto()).toContain('Esta respuesta hace falta');
    expect(p.puerta.enviados).toEqual([]);
  });

  it('el fallo se borra al contestar esa pregunta', async () => {
    const p = await montar();
    await p.enviar();
    p.pulsar(NO);

    expect(p.texto()).not.toContain('Esta respuesta hace falta');
  });

  it('el fallo del servidor sale en su pregunta, no en un aviso genérico', async () => {
    const p = await montar(
      { ok: true, formulario: formulario() },
      {
        ok: false,
        fallo: { tipo: 'respuestas', fallos: [{ questionId: 'menu', motivo: 'opcion' }] },
      },
    );
    p.pulsar(SI);
    p.elegir('menu', 'vegano');
    await p.enviar();

    const campoDelMenu = [...p.raiz.querySelectorAll('fieldset')].find((f) =>
      f.textContent?.includes('Menú'),
    )!;
    expect(campoDelMenu.textContent).toContain('Elige una de las opciones');
    expect(campoDelMenu.classList.contains('cf__campo--mal')).toBe(true);
  });

  it('al salir bien, lo primero que dice es que ha salido', async () => {
    const p = await montar();
    p.pulsar(SI);
    p.elegir('menu', 'normal');
    await p.enviar();

    expect(p.texto()).toContain('Contamos contigo');
    expect(p.texto()).toContain('Puedes volver a entrar y cambiarla');
  });

  it('quien dice que no, recibe una respuesta a la altura', async () => {
    const p = await montar(
      { ok: true, formulario: formulario() },
      { ok: true, estado: 'declined' },
    );
    p.pulsar(NO);
    await p.enviar();

    expect(p.texto()).toContain('Sentimos que no puedas venir');
  });

  it('con el plazo cerrado no hay formulario, y se dice hasta cuándo se podía', async () => {
    const p = await montar({
      ok: true,
      formulario: formulario({
        abierto: false,
        limite: '2027-06-01',
        yaContestado: true,
        respuestas: { asistencia: true, menu: 'vegano' },
      }),
    });

    expect(p.raiz.querySelector('form')).toBeNull();
    expect(p.texto()).toContain('1 de junio de 2027');
    // Y lo que contestó se queda a la vista, con la etiqueta de la opción.
    expect(p.texto()).toContain('Vegano');
  });

  it('quien ya contestó ve sus respuestas puestas y un botón de guardar', async () => {
    const p = await montar({
      ok: true,
      formulario: formulario({
        yaContestado: true,
        respuestas: { asistencia: true, menu: 'vegano' },
      }),
    });

    expect(p.raiz.querySelector<HTMLSelectElement>('select')!.value).toBe('vegano');
    expect(p.raiz.querySelector<HTMLButtonElement>('button[type="submit"]')!.textContent).toContain(
      'Guardar los cambios',
    );
  });

  /** Ni un código, ni un «INTERNAL»: eso ya pasó una vez en el panel. */
  it('un fallo al cargar se cuenta en castellano', async () => {
    const p = await montar({ ok: false, fallo: { tipo: 'sin-sesion' } });

    expect(p.texto()).toContain('Tu sesión ha caducado');
    expect(p.texto()).not.toContain('permission-denied');
  });

  it('si el plazo se cierra mientras lo rellenaba, se recarga y lo dice', async () => {
    const p = await montar(
      { ok: true, formulario: formulario({ abierto: true }) },
      { ok: false, fallo: { tipo: 'plazo-cerrado', limite: '2027-06-01' } },
    );
    p.pulsar(NO);
    await p.enviar();

    expect(p.texto()).toContain('1 de junio de 2027');
  });
});

/**
 * D-34: el enlace abre la web, los dígitos autorizan.
 *
 * Quien llega por un enlace reenviado no ve ni lo que contestó esa persona ni
 * su menú: antes de enseñar el formulario se le pide algo que solo tenga él.
 */
describe('cuando hace falta verificarse', () => {
  it('no enseña el formulario: pide los dígitos y explica por qué', async () => {
    const p = await montar({
      ok: false,
      fallo: { tipo: 'pide-verificar', modo: 'name_phone4' },
    });

    expect(p.raiz.querySelector('form')).not.toBeNull();
    expect(p.texto()).toContain('Confirma que eres tú');
    expect(p.texto()).toContain('Estos enlaces se reenvían');
    // Y nada de lo que contestó: ni las preguntas ni sus respuestas.
    expect(p.texto()).not.toContain('¿Vendrás a la boda?');
  });

  it('en modo teléfono le pide el teléfono', async () => {
    const p = await montar({ ok: false, fallo: { tipo: 'pide-verificar', modo: 'phone' } });

    expect(p.raiz.querySelector('input[type="tel"]')).not.toBeNull();
  });

  it('al verificarse, carga el formulario', async () => {
    const p = await montar({
      ok: false,
      fallo: { tipo: 'pide-verificar', modo: 'name_phone4' },
    });
    // Lo que contestaría el servidor la segunda vez, ya verificado.
    p.puerta.lecturas.push({ ok: true, formulario: formulario() });

    p.fixture.debugElement
      .query((n) => n.name === 'np-verificar')
      .componentInstance.verificado.emit();
    await vaciarCola();
    p.fixture.detectChanges();

    expect(p.texto()).toContain('¿Vendrás a la boda?');
  });
});

describe('los acompañantes', () => {
  const CON_CUPO = formulario({
    puedeAnadirAcompanantes: true,
    quedanAcompanantes: 2,
    exigeTelefonoDelAcompanante: true,
  });

  it('no se mencionan si la pareja no los ha abierto', async () => {
    const p = await montar();

    expect(p.texto()).not.toContain('¿Vienes con alguien?');
  });

  it('con cupo, se dice cuántos quedan y se piden sus datos', async () => {
    const p = await montar({ ok: true, formulario: CON_CUPO });

    expect(p.texto()).toContain('¿Vienes con alguien?');
    expect(p.texto()).toContain('2 persona(s) más');
    expect(p.raiz.querySelector('input[type="tel"]')).not.toBeNull();
  });

  /** En una boda abierta el teléfono no hace falta: no hay puerta que pasar. */
  it('en una boda abierta no se le pide el móvil', async () => {
    const p = await montar({
      ok: true,
      formulario: formulario({ puedeAnadirAcompanantes: true, exigeTelefonoDelAcompanante: false }),
    });

    expect(p.raiz.querySelector('input[type="tel"]')).toBeNull();
  });

  it('apunta a alguien con lo que se ha escrito', async () => {
    const p = await montar({ ok: true, formulario: CON_CUPO });
    p.escribirEn('.ac__nuevo input[type="text"]', 'Ana Ruiz');
    p.escribirEn('.ac__nuevo input[type="tel"]', '600112233');
    await p.pulsarEn('.ac__nuevo button[type="submit"]');

    expect(p.puerta.apuntados).toEqual([
      { fullName: 'Ana Ruiz', phone: '600112233', ageGroup: 'adult' },
    ]);
  });

  it('sin nombre no sale a la red, y lo dice', async () => {
    const p = await montar({ ok: true, formulario: CON_CUPO });
    await p.pulsarEn('.ac__nuevo button[type="submit"]');

    expect(p.puerta.apuntados).toEqual([]);
    expect(p.texto()).toContain('Hace falta su nombre');
  });

  /**
   * El cupo lo cuenta el servidor: dos pestañas abiertas pueden haber apuntado
   * a alguien más mientras esta rellenaba el nombre.
   */
  it('después de apuntar, recarga para traer el cupo de verdad', async () => {
    const p = await montar({ ok: true, formulario: CON_CUPO });
    p.puerta.lecturas.push({
      ok: true,
      formulario: formulario({
        puedeAnadirAcompanantes: true,
        quedanAcompanantes: 1,
        acompanantes: [{ id: 'a1', fullName: 'Ana Ruiz', ageGroup: 'adult', yaEntro: false }],
      }),
    });
    p.escribirEn('.ac__nuevo input[type="text"]', 'Ana Ruiz');
    await p.pulsarEn('.ac__nuevo button[type="submit"]');

    expect(p.texto()).toContain('Ana Ruiz');
    expect(p.texto()).toContain('1 persona(s) más');
  });

  it('el fallo del cupo se cuenta con sus palabras, no con un código', async () => {
    const p = await montar({ ok: true, formulario: CON_CUPO }, undefined, {
      ok: false,
      fallo: { tipo: 'sin-cupo', motivo: 'cupo-lleno' },
    });
    p.escribirEn('.ac__nuevo input[type="text"]', 'Ana Ruiz');
    await p.pulsarEn('.ac__nuevo button[type="submit"]');

    expect(p.texto()).toContain('Ya has apuntado a todas las personas');
  });

  it('a quien ya ha entrado en la web no se le ofrece quitarlo', async () => {
    const p = await montar({
      ok: true,
      formulario: formulario({
        acompanantes: [
          { id: 'a1', fullName: 'Ana Ruiz', ageGroup: 'adult', yaEntro: true },
          { id: 'a2', fullName: 'Leo', ageGroup: 'child', yaEntro: false },
        ],
      }),
    });

    const filas = [...p.raiz.querySelectorAll('.ac__traidos li')];
    expect(filas[0]!.querySelector('.ac__quitar')).toBeNull();
    expect(filas[1]!.querySelector('.ac__quitar')).not.toBeNull();
    // Y se ve que Leo es un niño: el catering cuenta menús infantiles.
    expect(filas[1]!.textContent).toContain('Niño');
  });

  it('quitar a alguien manda su id', async () => {
    const p = await montar({
      ok: true,
      formulario: formulario({
        acompanantes: [{ id: 'a2', fullName: 'Leo', ageGroup: 'child', yaEntro: false }],
      }),
    });
    await p.pulsarEn('.ac__quitar');

    expect(p.puerta.quitados).toEqual(['a2']);
  });

  /** Está dando datos de un tercero: el aviso es un requisito, no un adorno. */
  it('avisa de que está dando datos de otra persona', async () => {
    const p = await montar({ ok: true, formulario: CON_CUPO });

    expect(p.texto()).toContain('estás dando sus datos a los novios');
  });
});

describe('los ocho tipos de campo', () => {
  it('se pintan todos, cada uno con su control', async () => {
    const todos: readonly Pregunta[] = [
      pregunta({ id: 'texto', type: 'text', order: 1 }),
      pregunta({ id: 'largo', type: 'textarea', order: 2 }),
      pregunta({ id: 'lista', type: 'select', order: 3, options: [{ value: 'a', label: 'A' }] }),
      pregunta({ id: 'una', type: 'radio', order: 4, options: [{ value: 'a', label: 'A' }] }),
      pregunta({ id: 'varias', type: 'checkbox', order: 5, options: [{ value: 'a', label: 'A' }] }),
      pregunta({ id: 'numero', type: 'number', order: 6 }),
      pregunta({ id: 'fecha', type: 'date', order: 7 }),
      pregunta({ id: 'sino', type: 'boolean', order: 8 }),
    ];
    const p = await montar({ ok: true, formulario: formulario({ preguntas: todos }) });

    expect(p.raiz.querySelectorAll('fieldset').length).toBe(8);
    expect(p.raiz.querySelectorAll('input[type="text"]').length).toBe(1);
    expect(p.raiz.querySelectorAll('textarea').length).toBe(1);
    expect(p.raiz.querySelectorAll('select').length).toBe(1);
    expect(p.raiz.querySelectorAll('input[type="radio"]').length).toBe(1);
    expect(p.raiz.querySelectorAll('input[type="checkbox"]').length).toBe(1);
    expect(p.raiz.querySelectorAll('input[type="number"]').length).toBe(1);
    expect(p.raiz.querySelectorAll('input[type="date"]').length).toBe(1);
    expect(p.raiz.querySelectorAll(SI).length).toBe(1);
  });

  it('una selección múltiple suma y quita opciones', async () => {
    const varias = pregunta({
      id: 'varias',
      type: 'checkbox',
      options: [
        { value: 'bus', label: 'Autobús' },
        { value: 'taxi', label: 'Taxi' },
      ],
    });
    const p = await montar({ ok: true, formulario: formulario({ preguntas: [varias] }) });
    const casillas = [...p.raiz.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

    casillas[0]!.click();
    casillas[1]!.click();
    p.fixture.detectChanges();
    casillas[0]!.click();
    p.fixture.detectChanges();
    await p.enviar();

    expect(p.puerta.enviados).toEqual([{ varias: ['taxi'] }]);
  });

  /** Vaciar un campo es borrar la respuesta, no mandar una cadena vacía. */
  it('un texto que se vacía no viaja', async () => {
    const texto = pregunta({ id: 'cancion', type: 'text' });
    const p = await montar({
      ok: true,
      formulario: formulario({ preguntas: [texto], respuestas: { cancion: 'Despacito' } }),
    });

    const campo = p.raiz.querySelector<HTMLInputElement>('input[type="text"]')!;
    campo.value = '';
    campo.dispatchEvent(new Event('input'));
    p.fixture.detectChanges();
    await p.enviar();

    expect(p.puerta.enviados).toEqual([{}]);
  });
});
