/**
 * Qué va a pasar al importar una lista de invitados.
 *
 * Esto es una función pura, y esa es la idea: **la previsualización y la
 * importación de verdad usan exactamente el mismo plan**. Lo que la pareja ve
 * antes de confirmar no es una aproximación de lo que ocurrirá, es lo que
 * ocurrirá. Si fueran dos cálculos distintos, se separarían el día que alguien
 * tocara uno, y la previsualización empezaría a mentir sin que nadie se entere.
 */

import {
  MAX_GRUPOS,
  PREFIJO_GRUPO_NUEVO,
  conGrupoPorDefecto,
  idGrupoPorDefecto,
  resolverNombresDeGrupo,
  validarAsignacion,
  type GrupoExistente,
} from './grupos';
import {
  duplicadoDe,
  validarInvitado,
  type EntradaInvitado,
  type Existente,
  type InvitadoValidado,
  type MotivoDuplicado,
  type MotivoInvitado,
  normalizarNombre,
} from './invitados';

/** Tope por boda. Una de más de mil invitados no es nuestro caso de uso. */
export const MAX_INVITADOS = 1000;

/** Tope por fichero, para que un pegado accidental no tumbe nada. */
export const MAX_FILAS = 1000;

export type EstadoFila =
  /** Entra. */
  | 'nuevo'
  /** Se parece a alguien que ya está, o a otra fila del propio fichero. */
  | 'duplicado'
  /** Le faltan datos o los tiene mal. */
  | 'invalido'
  /** La boda se queda sin sitio antes de llegar a esta fila. */
  | 'sin-sitio';

export interface FilaPlanificada {
  /** Fila del fichero, empezando en 1 sin contar la cabecera. Para señalarla. */
  readonly fila: number;
  /** Lo que se leyó, tal cual, para que la pareja reconozca de quién hablamos. */
  readonly nombre: string;
  readonly estado: EstadoFila;
  readonly motivos: readonly MotivoInvitado[];
  /** A quién se parece. Vacío si no se parece a nadie. */
  readonly duplicadoDe: string;
  readonly motivoDuplicado: MotivoDuplicado | null;
  /** Lo que se escribiría. `null` salvo que el estado sea `nuevo`. */
  readonly datos: InvitadoValidado | null;
}

export interface ResumenImportacion {
  readonly nuevos: number;
  readonly duplicados: number;
  readonly invalidos: number;
  readonly sinSitio: number;
}

/**
 * Un grupo que no existe y que la importación va a crear.
 *
 * `id` es provisional (`nuevo:<nombre normalizado>`); es lo que llevan en
 * `groupIds` las filas que lo usan hasta que la función lo sustituye por el
 * de verdad.
 */
export interface GrupoPorCrear {
  readonly id: string;
  readonly name: string;
}

export interface PlanImportacion {
  readonly filas: readonly FilaPlanificada[];
  readonly resumen: ResumenImportacion;
  /** Solo los que usa alguna fila que entra: una fila rechazada no crea nada. */
  readonly gruposNuevos: readonly GrupoPorCrear[];
}

/** Una fila tal como la manda el cliente: los grupos llegan por **nombre**. */
export interface EntradaImportada extends EntradaInvitado {
  readonly groupNames?: unknown;
}

/**
 * Decide qué entra y qué no.
 *
 * Los duplicados se buscan contra los invitados que ya están **y contra las
 * filas anteriores del propio fichero**. Lo segundo importa más de lo que
 * parece: una hoja que ha pasado por tres manos trae al mismo primo dos veces,
 * y sin esta comprobación entraría dos veces sin que nadie lo viera.
 *
 * Con `forzarDuplicados`, lo que se parece a alguien entra igual. Es para la
 * segunda pasada, cuando la pareja ya ha visto la lista y sabe que esos dos
 * Javier Ruiz son dos personas distintas.
 */
export function planificarImportacion(
  filas: readonly EntradaImportada[],
  yaEstan: readonly Existente[],
  opciones: {
    readonly forzarDuplicados?: boolean;
    readonly grupos?: readonly GrupoExistente[];
  } = {},
): PlanImportacion {
  const planificadas: FilaPlanificada[] = [];
  const gruposExistentes = opciones.grupos ?? [];
  const gruposNuevos = new Map<string, GrupoPorCrear>();

  // Los existentes crecen con lo que va entrando, para cazar los duplicados de
  // dentro del propio fichero.
  const existentes: Existente[] = [...yaEstan];
  let sitio = Math.max(0, MAX_INVITADOS - yaEstan.length);

  filas.slice(0, MAX_FILAS).forEach((entrada, indice) => {
    const fila = indice + 1;
    const nombre = typeof entrada.fullName === 'string' ? entrada.fullName.trim() : '';

    const validado = validarInvitado(entrada);
    if (!validado.ok) {
      planificadas.push({
        fila,
        nombre,
        estado: 'invalido',
        motivos: validado.motivos,
        duplicadoDe: '',
        motivoDuplicado: null,
        datos: null,
      });
      return;
    }

    // Los grupos se resuelven por nombre: la pareja escribe «Universidad», no
    // un id. Los que no existen se crean, **públicos**: un grupo restringido
    // cambia quién ve qué fotos, y eso no se decide por una celda de un Excel.
    const nombresGrupo = Array.isArray(entrada.groupNames)
      ? entrada.groupNames.filter((n): n is string => typeof n === 'string')
      : [];
    const groupIds = resolverNombresDeGrupo(nombresGrupo, gruposExistentes);
    const provisionales = groupIds.filter(
      (id) => id.startsWith(PREFIJO_GRUPO_NUEVO) && !gruposNuevos.has(id),
    );
    const caben = gruposExistentes.length + gruposNuevos.size + provisionales.length <= MAX_GRUPOS;

    const conocidos: GrupoExistente[] = [
      ...gruposExistentes,
      ...groupIds
        .filter((id) => id.startsWith(PREFIJO_GRUPO_NUEVO))
        .map((id) => ({ id, normalizedName: id, photoAudience: 'public' as const })),
    ];
    const motivosGrupo: MotivoInvitado[] = [
      ...validarAsignacion(groupIds, conocidos),
      ...(caben ? [] : [{ campo: 'groupIds', motivo: 'demasiados-grupos' } as const]),
    ];

    if (motivosGrupo.length > 0) {
      planificadas.push({
        fila,
        nombre,
        estado: 'invalido',
        motivos: motivosGrupo,
        duplicadoDe: '',
        motivoDuplicado: null,
        datos: null,
      });
      return;
    }

    const duplicado = duplicadoDe(validado.datos, existentes);
    if (duplicado && !opciones.forzarDuplicados) {
      planificadas.push({
        fila,
        nombre,
        estado: 'duplicado',
        motivos: [],
        duplicadoDe: duplicado.id,
        motivoDuplicado: duplicado.motivo,
        datos: null,
      });
      return;
    }

    if (sitio <= 0) {
      planificadas.push({
        fila,
        nombre,
        estado: 'sin-sitio',
        motivos: [],
        duplicadoDe: '',
        motivoDuplicado: null,
        datos: null,
      });
      return;
    }

    sitio--;

    // Se añade a los existentes con un id provisional: aún no tiene documento,
    // pero las filas siguientes tienen que poder chocar con él.
    existentes.push({
      id: `fila-${fila}`,
      phone: validado.datos.phone,
      normalizedName: validado.datos.normalizedName,
    });

    // El grupo se apunta para crearse solo ahora que la fila entra de verdad.
    // Con la primera grafía que aparezca: «universidad» y «Universidad» son el
    // mismo grupo, y se queda con como lo escribió la primera fila.
    for (const id of provisionales) {
      const original = nombresGrupo.find(
        (n) => `${PREFIJO_GRUPO_NUEVO}${normalizarNombre(n.trim().replace(/\s+/g, ' '))}` === id,
      );
      gruposNuevos.set(id, { id, name: (original ?? id).trim().replace(/\s+/g, ' ') });
    }

    planificadas.push({
      fila,
      nombre,
      estado: 'nuevo',
      motivos: [],
      duplicadoDe: '',
      motivoDuplicado: null,
      // Y el grupo de todos, como cualquier invitado nuevo (D-31).
      datos: {
        ...validado.datos,
        groupIds: conGrupoPorDefecto(groupIds, idGrupoPorDefecto(gruposExistentes)),
      },
    });
  });

  return {
    filas: planificadas,
    resumen: {
      nuevos: planificadas.filter((f) => f.estado === 'nuevo').length,
      duplicados: planificadas.filter((f) => f.estado === 'duplicado').length,
      invalidos: planificadas.filter((f) => f.estado === 'invalido').length,
      sinSitio: planificadas.filter((f) => f.estado === 'sin-sitio').length,
    },
    gruposNuevos: [...gruposNuevos.values()],
  };
}
