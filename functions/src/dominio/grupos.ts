/**
 * Grupos de invitados.
 *
 * Parecen una etiqueta y no lo son: de ellos depende **quién ve qué fotos** en
 * la galería (§8.5). Un grupo `restricted` parte la audiencia: lo que suben sus
 * miembros solo lo ven ellos y la pareja. Por eso hay dos invariantes que se
 * vigilan aquí y no se dejan al cliente:
 *
 * 1. **Un invitado está a lo sumo en un grupo restringido.** Si estuviera en
 *    dos, no habría forma de decidir con qué audiencia se publica una foto
 *    suya. La validación va en el momento de asignar, como pide §8.5.
 * 2. **Un grupo que desaparece no deja referencias colgando** en los
 *    invitados. Un `groupId` huérfano en `listPhotos` es, en el mejor caso, un
 *    invitado que no ve fotos que debería ver.
 *
 * Las dos piden mirar a la vez el grupo y los invitados, que están cerrados al
 * cliente. Por eso los grupos se escriben por función y no desde el navegador.
 */

import { normalizarNombre } from './invitados';

/**
 * Los colores que se pueden elegir. **Copia de la paleta categórica** del
 * sistema visual (`palette.json`).
 *
 * Duplicada a propósito —`functions/` es otro paquete y no importa del
 * cliente—, y vigilada: `grupos.spec.ts` la compara con el JSON y falla si se
 * separan.
 */
export const COLORES_GRUPO = [
  'rosa',
  'coral',
  'teja',
  'mostaza',
  'oliva',
  'verde',
  'esmeralda',
  'turquesa',
  'cian',
  'celeste',
  'azul',
  'indigo',
  'ciruela',
] as const;

export type ColorGrupo = (typeof COLORES_GRUPO)[number];
export type Audiencia = 'public' | 'restricted';

/** Más de cincuenta grupos en una boda no organizan nada: son la lista otra vez. */
export const MAX_GRUPOS = 50;
export const MAX_NOMBRE_GRUPO = 60;

export interface EntradaGrupo {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly photoAudience?: unknown;
  readonly color?: unknown;
}

export interface GrupoValidado {
  readonly name: string;
  readonly normalizedName: string;
  readonly photoAudience: Audiencia;
  readonly color: ColorGrupo;
}

/** Lo que hace falta saber de un grupo que ya existe. */
export interface GrupoExistente {
  readonly id: string;
  readonly normalizedName: string;
  readonly photoAudience: Audiencia;
  readonly color?: string;
  /** El grupo en el que entra todo invitado nuevo. Ver `idGrupoPorDefecto`. */
  readonly isDefault?: boolean;
}

export type MotivoGrupo =
  | { readonly campo: 'name'; readonly motivo: 'ausente' | 'demasiado-largo' | 'repetido' }
  | { readonly campo: 'color'; readonly motivo: 'no-existe' }
  | { readonly campo: 'photoAudience'; readonly motivo: 'por-defecto' };

/** Cómo se llama, normalizado, el grupo que se crea con cada boda. */
export const NOMBRE_GRUPO_POR_DEFECTO = 'invitados';

/**
 * El grupo en el que entra todo invitado nuevo, o `null` si no hay.
 *
 * Decisión de Gabriel (D-31): **todo invitado nuevo entra en él**, para que
 * nadie se quede sin grupo y por tanto sin sitio en la galería. Se marca con
 * `isDefault` desde el alta; las bodas dadas de alta antes no lo llevan, y en
 * ellas vale el que se llame «Invitados».
 */
export function idGrupoPorDefecto(grupos: readonly GrupoExistente[]): string | null {
  const marcado = grupos.find((g) => g.isDefault === true);
  if (marcado) return marcado.id;
  return grupos.find((g) => g.normalizedName === NOMBRE_GRUPO_POR_DEFECTO)?.id ?? null;
}

/** Los grupos de un invitado nuevo, con el de por defecto delante si falta. */
export function conGrupoPorDefecto(
  groupIds: readonly string[],
  idPorDefecto: string | null,
): readonly string[] {
  if (!idPorDefecto || groupIds.includes(idPorDefecto)) return groupIds;
  return [idPorDefecto, ...groupIds];
}

export type ResultadoGrupo =
  | { readonly ok: true; readonly datos: GrupoValidado }
  | { readonly ok: false; readonly motivos: readonly MotivoGrupo[] };

/**
 * El primer color que no usa ningún grupo; si están todos, se vuelve a empezar.
 *
 * Para que crear cinco grupos seguidos sin elegir color no los deje a los cinco
 * en rosa, que es exactamente lo contrario de para qué sirve el color.
 */
export function colorLibre(usados: readonly (string | undefined)[]): ColorGrupo {
  const libre = COLORES_GRUPO.find((c) => !usados.includes(c));
  return libre ?? (COLORES_GRUPO[usados.length % COLORES_GRUPO.length] as ColorGrupo);
}

/**
 * Valida un grupo contra los que ya hay.
 *
 * `idPropio` es el del grupo que se edita: un grupo no choca consigo mismo al
 * guardarse sin cambiarle el nombre.
 */
export function validarGrupo(
  entrada: EntradaGrupo,
  existentes: readonly GrupoExistente[],
  idPropio: string | null = null,
): ResultadoGrupo {
  const motivos: MotivoGrupo[] = [];
  const otros = existentes.filter((g) => g.id !== idPropio);

  const name = typeof entrada.name === 'string' ? entrada.name.trim().replace(/\s+/g, ' ') : '';
  const normalizedName = normalizarNombre(name);

  if (name === '') motivos.push({ campo: 'name', motivo: 'ausente' });
  else if (name.length > MAX_NOMBRE_GRUPO)
    motivos.push({ campo: 'name', motivo: 'demasiado-largo' });
  // Dos «Universidad» son un problema de verdad: al importar, la columna Grupo
  // se resuelve por nombre, y con dos iguales no se sabe a cuál va nadie.
  else if (otros.some((g) => g.normalizedName === normalizedName)) {
    motivos.push({ campo: 'name', motivo: 'repetido' });
  }

  const colorPedido = entrada.color;
  const colorValido = COLORES_GRUPO.includes(colorPedido as ColorGrupo);
  if (colorPedido !== undefined && colorPedido !== null && colorPedido !== '' && !colorValido) {
    motivos.push({ campo: 'color', motivo: 'no-existe' });
  }

  const photoAudience: Audiencia = entrada.photoAudience === 'restricted' ? 'restricted' : 'public';

  // El grupo de todos no puede llevar candado: todo invitado nuevo entra en él,
  // así que restringirlo dejaría a la boda entera en un grupo cerrado y a nadie
  // en condiciones de estar en otro restringido.
  const esElDeTodos = idPropio !== null && idPropio === idGrupoPorDefecto(existentes);
  if (esElDeTodos && photoAudience === 'restricted') {
    motivos.push({ campo: 'photoAudience', motivo: 'por-defecto' });
  }

  if (motivos.length > 0) return { ok: false, motivos };

  return {
    ok: true,
    datos: {
      name,
      normalizedName,
      photoAudience,
      color: colorValido ? (colorPedido as ColorGrupo) : colorLibre(otros.map((g) => g.color)),
    },
  };
}

export interface MotivoAsignacion {
  readonly campo: 'groupIds';
  readonly motivo: 'no-existe' | 'dos-restringidos';
}

/**
 * ¿Se puede poner a este invitado en estos grupos?
 *
 * Un id que no existe se rechaza en vez de ignorarse: el cliente tiene una
 * lista de grupos vieja, y guardar en silencio sin ese grupo deja a la pareja
 * creyendo que lo ha asignado.
 */
export function validarAsignacion(
  groupIds: readonly string[],
  grupos: readonly GrupoExistente[],
): readonly MotivoAsignacion[] {
  const motivos: MotivoAsignacion[] = [];
  const porId = new Map(grupos.map((g) => [g.id, g]));

  if (groupIds.some((id) => !porId.has(id))) {
    motivos.push({ campo: 'groupIds', motivo: 'no-existe' });
  }

  const restringidos = groupIds.filter((id) => porId.get(id)?.photoAudience === 'restricted');
  if (restringidos.length > 1) {
    motivos.push({ campo: 'groupIds', motivo: 'dos-restringidos' });
  }

  return motivos;
}

/**
 * Cuántos invitados quedarían en dos grupos restringidos si `grupoId` pasara a
 * serlo.
 *
 * Es el agujero que deja validar solo al asignar: alguien de «Universidad» y
 * «Pádel», los dos públicos, es perfectamente válido. Si luego los dos pasan a
 * restringidos, sin esta comprobación ese invitado queda en un estado que la
 * galería no sabe resolver, y nadie ha tocado a ese invitado.
 */
export function conflictosAlRestringir(
  grupoId: string,
  invitados: readonly { readonly groupIds: readonly string[] }[],
  grupos: readonly GrupoExistente[],
): number {
  const otrosRestringidos = new Set(
    grupos.filter((g) => g.id !== grupoId && g.photoAudience === 'restricted').map((g) => g.id),
  );

  return invitados.filter(
    (i) => i.groupIds.includes(grupoId) && i.groupIds.some((id) => otrosRestringidos.has(id)),
  ).length;
}

/** Prefijo de los ids provisionales de los grupos que crea una importación. */
export const PREFIJO_GRUPO_NUEVO = 'nuevo:';

/**
 * Resuelve los nombres de grupo de una fila importada.
 *
 * Los que existen se convierten en su id; los que no, en un id provisional
 * `nuevo:<nombre normalizado>` que la importación sustituye al crear el grupo.
 * Así el plan sigue siendo una función pura y la previsualización puede decir
 * «se crearán estos grupos» antes de tocar nada.
 */
export function resolverNombresDeGrupo(
  nombres: readonly string[],
  grupos: readonly GrupoExistente[],
): readonly string[] {
  const porNombre = new Map(grupos.map((g) => [g.normalizedName, g.id]));

  const ids = nombres
    .map((n) => n.trim().replace(/\s+/g, ' '))
    .filter((n) => n !== '' && n.length <= MAX_NOMBRE_GRUPO)
    .map(
      (n) => porNombre.get(normalizarNombre(n)) ?? `${PREFIJO_GRUPO_NUEVO}${normalizarNombre(n)}`,
    );

  return [...new Set(ids)];
}

/**
 * El orden definitivo de los grupos a partir del que pide la pareja (F1.3c).
 *
 * Dos cosas que no se pueden dar por hechas cuando el orden llega del
 * navegador:
 *
 * - **Un id que no existe se ignora.** Si no, un grupo borrado en otra
 *   pestaña dejaría un hueco en la numeración.
 * - **Un grupo que no venía en la lista no desaparece**: se queda al final,
 *   detrás de los ordenados. Pasa en cuanto hay dos pestañas abiertas y en
 *   una se crea un grupo; perderlo del listado sería peor que verlo el último.
 */
export function ordenPedido(pedidos: readonly unknown[], existentes: readonly string[]): string[] {
  const hay = new Set(existentes);
  const ordenados = [
    ...new Set(pedidos.filter((id): id is string => typeof id === 'string' && hay.has(id))),
  ];

  const sueltos = existentes.filter((id) => !ordenados.includes(id));
  return [...ordenados, ...sueltos];
}
