import { describe, expect, it } from 'vitest';

import {
  ID_PLANTILLAS,
  PLANTILLAS_DE_FABRICA,
  enlaceSeguro,
  esCorreoValido,
  escaparHtml,
  montarCorreo,
  estadoDeCorreo,
  plantillaEfectiva,
  sustituir,
  validarPlantilla,
} from './correos';

describe('plantillas de fábrica', () => {
  it('hay una por cada id y las dos de los novios no hablan de invitados', () => {
    expect(ID_PLANTILLAS.every((id) => PLANTILLAS_DE_FABRICA[id].id === id)).toBe(true);
    expect(PLANTILLAS_DE_FABRICA.parejaAcceso.destinatario).toBe('novios');
    // No hay correo de invitación a los invitados (D-55): solo escriben a los novios.
    expect(ID_PLANTILLAS).toEqual(['parejaAcceso', 'parejaRestablecer']);
  });

  it('todas son válidas como si las hubiera guardado el superadmin', () => {
    for (const id of ID_PLANTILLAS) {
      expect(validarPlantilla(PLANTILLAS_DE_FABRICA[id]).ok).toBe(true);
    }
  });
});

describe('sustituir', () => {
  it('rellena lo conocido y deja a la vista lo que no reconoce', () => {
    expect(sustituir('Hola {novios} {nombres}', { novios: 'Ana y Leo' })).toBe(
      'Hola Ana y Leo {nombres}',
    );
  });

  it('un marcador conocido sin valor se queda vacío', () => {
    expect(sustituir('Fecha{fecha}.', {})).toBe('Fecha.');
  });
});

describe('montarCorreo', () => {
  const plantilla = { asunto: 'Hola {novios}', cuerpo: 'Hola {novios}\n\nEntra aquí.\nGracias' };

  it('escapa lo que viene de fuera: un nombre no puede meter HTML', () => {
    const c = montarCorreo(plantilla, 'Entrar', { novios: '<script>alert(1)</script>' });

    expect(c.html).not.toContain('<script>');
    expect(c.html).toContain('&lt;script&gt;');
  });

  it('el enlace va como botón y no dentro del texto', () => {
    const c = montarCorreo({ asunto: 'a', cuerpo: 'Pulsa {enlace}' }, 'Entrar', {
      enlace: 'https://ana-y-leo.nupcialis.com/panel',
    });

    expect(c.html).toContain('href="https://ana-y-leo.nupcialis.com/panel"');
    expect(c.html).toContain('Entrar');
    expect(c.texto).toContain('Entrar: https://ana-y-leo.nupcialis.com/panel');
    expect(c.texto.startsWith('Pulsa')).toBe(true);
  });

  /** Si no, un `javascript:` en un botón convierte esto en un correo malicioso. */
  it('un enlace que no es https no se pinta', () => {
    const c = montarCorreo(plantilla, 'Entrar', { enlace: 'javascript:alert(1)' });

    expect(c.html).not.toContain('javascript:');
    expect(c.html).not.toContain('<a ');
  });

  it('los párrafos son párrafos y un salto simple es un salto', () => {
    const c = montarCorreo(plantilla, 'Entrar', { novios: 'Ana y Leo' });

    expect(c.html).toContain('<p style="margin:0 0 16px">Entra aquí.<br>Gracias</p>');
    expect(c.asunto).toBe('Hola Ana y Leo');
  });

  it('el asunto no lleva saltos de línea', () => {
    const c = montarCorreo({ asunto: 'a\nb', cuerpo: 'x' }, 'Entrar', {});
    expect(c.asunto).toBe('a b');
  });
});

describe('enlaceSeguro', () => {
  it('solo https, o localhost en desarrollo', () => {
    expect(enlaceSeguro('https://x.com/a?b=1')).toBe('https://x.com/a?b=1');
    expect(enlaceSeguro('http://localhost:4200/panel')).toBe('http://localhost:4200/panel');
    expect(enlaceSeguro('http://x.com')).toBeNull();
    expect(enlaceSeguro('https://x.com/a b')).toBeNull();
    expect(enlaceSeguro(undefined)).toBeNull();
  });
});

describe('validarPlantilla', () => {
  it('exige asunto y cuerpo con un tope', () => {
    expect(validarPlantilla({ asunto: '', cuerpo: 'x' })).toEqual({ ok: false, motivo: 'asunto' });
    expect(validarPlantilla({ asunto: 'a', cuerpo: ' ' })).toEqual({ ok: false, motivo: 'cuerpo' });
    expect(validarPlantilla({ asunto: 'a', cuerpo: 'x'.repeat(5000) }).ok).toBe(false);
    expect(validarPlantilla(null)).toEqual({ ok: false, motivo: 'formato' });
  });
});

describe('plantillaEfectiva', () => {
  it('usa lo guardado si vale y la de fábrica si no', () => {
    expect(plantillaEfectiva('parejaAcceso', { asunto: 'Mío', cuerpo: 'Texto' }).asunto).toBe(
      'Mío',
    );
    expect(plantillaEfectiva('parejaAcceso', { asunto: '' }).asunto).toBe(
      PLANTILLAS_DE_FABRICA.parejaAcceso.asunto,
    );
    expect(plantillaEfectiva('parejaAcceso', undefined).cuerpo).toBe(
      PLANTILLAS_DE_FABRICA.parejaAcceso.cuerpo,
    );
  });
});

describe('esCorreoValido y escaparHtml', () => {
  it('reconoce lo básico', () => {
    expect(esCorreoValido('ana@ejemplo.com')).toBe(true);
    expect(esCorreoValido('ana@')).toBe(false);
    expect(esCorreoValido('a b@c.com')).toBe(false);
    expect(esCorreoValido(7)).toBe(false);
  });

  it('escapa las comillas', () => {
    expect(escaparHtml(`"'<&>`)).toBe('&quot;&#39;&lt;&amp;&gt;');
  });
});

describe('estadoDeCorreo', () => {
  it('sin `delivery` el correo sigue en la cola (la extensión no lo ha tocado)', () => {
    expect(estadoDeCorreo(undefined)).toBe('en-cola');
    expect(estadoDeCorreo({})).toBe('en-cola');
    expect(estadoDeCorreo({ state: 'PENDING' })).toBe('en-cola');
  });

  it('traduce lo que escribe la extensión', () => {
    expect(estadoDeCorreo({ state: 'PROCESSING' })).toBe('enviando');
    expect(estadoDeCorreo({ state: 'RETRY' })).toBe('enviando');
    expect(estadoDeCorreo({ state: 'SUCCESS' })).toBe('enviado');
    expect(estadoDeCorreo({ state: 'ERROR' })).toBe('error');
  });
});
