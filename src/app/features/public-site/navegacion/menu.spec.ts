import { describe, expect, it } from 'vitest';

import type { Seccion, TipoSeccion } from '../secciones/secciones';
import { MAX_EN_BARRA, elementosDeMenu, idDeAncla, partirMenu } from './menu';

let n = 0;
function seccion(type: TipoSeccion, extra: Partial<Seccion> & { titulo?: string } = {}): Seccion {
  n += 1;
  return {
    id: extra.id ?? `${type}-${n}`,
    type,
    enabled: extra.enabled ?? true,
    order: extra.order ?? n,
    fields: extra.titulo ? { titulo: extra.titulo } : {},
  };
}

describe('elementosDeMenu', () => {
  it('no lleva la portada ni lo apagado', () => {
    const e = elementosDeMenu([
      seccion('portada'),
      seccion('quiz', { enabled: false }),
      seccion('galeria'),
    ]);
    expect(e.map((x) => x.clave)).toEqual(['galeria']);
  });

  it('los módulos con página llevan a su ruta y el contenido, a un ancla de la portada', () => {
    const cron = seccion('cronologia', { id: 'dia' });
    const [programa, quiz] = elementosDeMenu([seccion('quiz'), cron]);
    expect(programa).toMatchObject({ ruta: '/', fragmento: idDeAncla('dia'), grupo: 'boda' });
    expect(quiz).toMatchObject({ ruta: '/quiz', fragmento: null, grupo: 'participa' });
  });

  it('marca como de identidad solo las páginas que la piden', () => {
    const e = elementosDeMenu([
      seccion('quiz'),
      seccion('galeria'),
      seccion('regalos'),
      seccion('playlist'),
      seccion('historia'),
      seccion('mapa'),
    ]);
    const conIdentidad = e.filter((x) => x.conIdentidad).map((x) => x.clave);
    expect(conIdentidad.sort()).toEqual(['galeria', 'playlist', 'quiz', 'regalos']);
  });

  it('pone la boda antes que participar y respeta el orden de la pareja dentro de cada grupo', () => {
    const e = elementosDeMenu([
      seccion('quiz', { order: 1 }),
      seccion('preguntas', { order: 3 }),
      seccion('regalos', { order: 2 }),
      seccion('cronologia', { order: 4 }),
    ]);
    expect(e.map((x) => x.clave)).toEqual(['preguntas', 'programa', 'quiz', 'regalos']);
  });

  it('un texto libre entra con su título, y sin título no entra', () => {
    const e = elementosDeMenu([seccion('texto', { titulo: 'Ceremonia' }), seccion('texto')]);
    expect(e).toHaveLength(1);
    expect(e[0]?.titulo).toBe('Ceremonia');
  });

  it('un evento sin título usa el nombre corto', () => {
    const [evento] = elementosDeMenu([seccion('evento')]);
    expect(evento).toMatchObject({ clave: 'evento', titulo: null });
  });

  it('una página propia no sale dos veces', () => {
    expect(elementosDeMenu([seccion('quiz'), seccion('quiz')])).toHaveLength(1);
  });
});

describe('partirMenu', () => {
  const de = (cuantos: number) =>
    elementosDeMenu(
      Array.from({ length: cuantos }, (_, i) => seccion('texto', { titulo: `T${i}`, order: i })),
    );

  it('si todo cabe, no hay «Más»', () => {
    const { enBarra, enMas } = partirMenu(de(MAX_EN_BARRA + 1));
    expect(enBarra).toHaveLength(MAX_EN_BARRA + 1);
    expect(enMas).toEqual([]);
  });

  it('si no cabe, deja los primeros en la barra y el resto tras «Más»', () => {
    const { enBarra, enMas } = partirMenu(de(MAX_EN_BARRA + 3));
    expect(enBarra).toHaveLength(MAX_EN_BARRA);
    expect(enMas).toHaveLength(3);
  });
});
