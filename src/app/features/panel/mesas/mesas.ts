/**
 * Las mesas del banquete (§8.4).
 *
 * **COPIA LITERAL** de `functions/src/dominio/mesas.ts`.
 * Si tocas una, toca la otra: lo vigila su `.spec.ts`.
 *
 * Esto no es un plano de la finca y no pretende serlo: es un esquema de
 * agrupación. Lo que de verdad resuelve el módulo es **quién se sienta con
 * quién**, y los avisos son la mitad del valor, porque el error de sentar a
 * trece en una mesa de doce no se ve mirando una lista.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const FORMAS = ['round', 'rect'] as const;
export type FormaMesa = (typeof FORMAS)[number];

export function esFormaMesa(valor: unknown): valor is FormaMesa {
  return typeof valor === 'string' && (FORMAS as readonly string[]).includes(valor);
}

/**
 * Con cuántos asientos nace una mesa según su forma.
 *
 * Son el **punto de partida**, no un límite del producto: la pareja los sube o
 * los baja mesa a mesa, porque quien conoce la finca y lo que cobra el catering
 * por cubierto es ella. Una redonda de doce es lo normal en España; una mesa
 * imperial rectangular puede sentar a cincuenta.
 */
export const TOPES_INICIALES: Record<FormaMesa, { readonly min: number; readonly max: number }> = {
  round: { min: 8, max: 12 },
  rect: { min: 12, max: 50 },
};

/** Más de esto en una sola mesa ya no es una mesa, es el salón entero. */
export const MAXIMO_ASIENTOS = 200;
export const MAX_NOMBRE_MESA = 40;
export const MAX_NOTAS_MESA = 200;

export interface Mesa {
  readonly id: string;
  readonly name: string;
  readonly shape: FormaMesa;
  readonly minSeats: number;
  readonly maxSeats: number;
  readonly order: number;
  readonly notes: string;
}

/** Lo que el reparto necesita saber de un invitado. Nada más. */
export interface InvitadoSentado {
  readonly id: string;
  readonly fullName: string;
  readonly rsvpStatus: string;
  readonly tableId: string | null;
  readonly isCompanion: boolean;
  readonly invitedById: string | null;
  readonly groupIds: readonly string[];
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, ' ').trim().slice(0, maximo);
}

/**
 * Un número de asientos utilizable, o el de partida.
 *
 * Nunca lanza y nunca deja una mesa sin topes: una mesa con `maxSeats` a cero
 * no admitiría a nadie y la pantalla la pintaría llena desde el primer
 * invitado.
 */
function asientos(valor: unknown, porDefecto: number): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return porDefecto;
  return Math.min(MAXIMO_ASIENTOS, Math.max(0, Math.round(valor)));
}

export function sanearMesas(valor: unknown): readonly Mesa[] {
  if (!Array.isArray(valor)) return [];

  const salida: Mesa[] = [];
  const vistas = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const m = crudo as Record<string, unknown>;
    const id = texto(m['id'], 60);
    if (id === '' || vistas.has(id)) continue;

    const shape = esFormaMesa(m['shape']) ? m['shape'] : 'round';
    const topes = TOPES_INICIALES[shape];
    const minSeats = asientos(m['minSeats'], topes.min);
    const maxSeats = asientos(m['maxSeats'], topes.max);

    vistas.add(id);
    salida.push({
      id,
      name: texto(m['name'], MAX_NOMBRE_MESA),
      shape,
      minSeats,
      // Un mínimo por encima del máximo deja la mesa imposible de cuadrar: se
      // respeta el que la pareja tocó último, que es el máximo.
      maxSeats: Math.max(minSeats, maxSeats),
      order: typeof m['order'] === 'number' && Number.isFinite(m['order']) ? m['order'] : 0,
      notes: texto(m['notes'], MAX_NOTAS_MESA),
    });
  }

  return salida.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * Quién se sienta en cada mesa.
 *
 * Solo los que **vienen**: sentar a quien ha dicho que no es ocupar una silla
 * que el catering va a cobrar. Los que no han contestado tampoco se sientan
 * todavía, y por eso salen en su propio aviso.
 */
export function sentadosEn(
  mesaId: string,
  invitados: readonly InvitadoSentado[],
): readonly InvitadoSentado[] {
  return invitados.filter(
    (invitado) => invitado.tableId === mesaId && invitado.rsvpStatus === 'confirmed',
  );
}

/** Los confirmados que todavía no tienen mesa. Son los que hay que repartir. */
export function sinMesa(invitados: readonly InvitadoSentado[]): readonly InvitadoSentado[] {
  return invitados.filter(
    (invitado) => invitado.rsvpStatus === 'confirmed' && invitado.tableId === null,
  );
}

export type AvisoDeMesa =
  /** Menos gente de la que la mesa necesita para no quedar desangelada. */
  | { readonly tipo: 'corta'; readonly mesaId: string; readonly faltan: number }
  /** Más gente que sillas. No se impide: el día de la boda se añade una silla. */
  | { readonly tipo: 'pasada'; readonly mesaId: string; readonly sobran: number }
  /** Un acompañante lejos de quien lo apuntó. */
  | {
      readonly tipo: 'separado';
      readonly invitadoId: string;
      readonly titularId: string;
    };

/**
 * Lo que la pareja no puede ver mirando el lienzo.
 *
 * **Avisos, no bloqueos** (§8.4). Una mesa con trece en una redonda de doce se
 * marca y se deja: el día de la boda se añade una silla, y un producto que lo
 * impidiera obligaría a la pareja a mentirle para poder seguir.
 */
export function avisosDeMesas(
  mesas: readonly Mesa[],
  invitados: readonly InvitadoSentado[],
): readonly AvisoDeMesa[] {
  const avisos: AvisoDeMesa[] = [];

  for (const mesa of mesas) {
    const cuantos = sentadosEn(mesa.id, invitados).length;

    // Una mesa vacía no está «corta»: está sin montar, y eso ya se ve.
    if (cuantos > 0 && cuantos < mesa.minSeats) {
      avisos.push({ tipo: 'corta', mesaId: mesa.id, faltan: mesa.minSeats - cuantos });
    }
    if (cuantos > mesa.maxSeats) {
      avisos.push({ tipo: 'pasada', mesaId: mesa.id, sobran: cuantos - mesa.maxSeats });
    }
  }

  const porId = new Map(invitados.map((invitado) => [invitado.id, invitado]));

  for (const invitado of invitados) {
    if (!invitado.isCompanion || invitado.invitedById === null) continue;
    if (invitado.rsvpStatus !== 'confirmed' || invitado.tableId === null) continue;

    const titular = porId.get(invitado.invitedById);
    if (!titular || titular.tableId === null) continue;

    if (titular.tableId !== invitado.tableId) {
      avisos.push({
        tipo: 'separado',
        invitadoId: invitado.id,
        titularId: titular.id,
      });
    }
  }

  return avisos;
}

/** Cuántos quedan por sentar y cuántas sillas sobran en total. */
export function resumenDeMesas(
  mesas: readonly Mesa[],
  invitados: readonly InvitadoSentado[],
): {
  readonly sentados: number;
  readonly porSentar: number;
  readonly sillas: number;
} {
  const sentados = invitados.filter(
    (invitado) => invitado.rsvpStatus === 'confirmed' && invitado.tableId !== null,
  ).length;

  return {
    sentados,
    porSentar: sinMesa(invitados).length,
    sillas: mesas.reduce((suma, mesa) => suma + mesa.maxSeats, 0),
  };
}

/** El nombre que se enseña cuando la pareja no le ha puesto ninguno. */
export function nombreDeMesa(mesa: Mesa, n: number): string {
  return mesa.name !== '' ? mesa.name : `Mesa ${n}`;
}

/**
 * Los acompañantes de alguien que **vienen y aún no están en su mesa**.
 *
 * Al sentar a un titular, lo que casi siempre quiere la pareja es sentar
 * también a quien venga con él: nadie trae a su pareja a una boda para dejarla
 * en otra mesa. Pero no se hace solo, se pregunta, porque el caso contrario
 * existe —los novios sientan a un amigo en la mesa de los de la uni y a su
 * pareja en la de al lado— y deshacerlo a mano es peor que confirmarlo.
 */
export function acompanantesDe(
  titularId: string,
  mesaId: string,
  invitados: readonly InvitadoSentado[],
): readonly InvitadoSentado[] {
  return invitados.filter(
    (invitado) =>
      invitado.isCompanion &&
      invitado.invitedById === titularId &&
      invitado.rsvpStatus === 'confirmed' &&
      invitado.tableId !== mesaId,
  );
}

/**
 * Qué pasa si se sienta a este grupo en esta mesa.
 *
 * `cabenTodos` es `false` cuando se pasaría del máximo, y entonces la pantalla
 * ofrece salida en vez de impedirlo: ampliar la mesa o dejar fuera a los
 * acompañantes. El máximo sigue siendo un aviso (§8.4).
 */
export function cabida(
  mesa: Mesa,
  cuantosEntran: number,
  invitados: readonly InvitadoSentado[],
): { readonly ocupados: number; readonly libres: number; readonly cabenTodos: boolean } {
  const ocupados = sentadosEn(mesa.id, invitados).length;
  const libres = Math.max(0, mesa.maxSeats - ocupados);

  return { ocupados, libres, cabenTodos: cuantosEntran <= libres };
}
