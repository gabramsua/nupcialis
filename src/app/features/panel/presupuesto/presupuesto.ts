/**
 * El presupuesto de la pareja (§5.8 `budgetItems`).
 *
 * Una partida es «qué», cuánto se calculaba (`estimatedCents`), cuánto ha
 * costado de verdad (`actualCents`, 0 mientras no se sepa) y si ya está pagada.
 * Todo en céntimos enteros.
 *
 * Frontera de confianza (D-19): `leerPartida` comprueba lo que viene de
 * Firestore. Las partidas que siembra el servidor al crear la boda y las que
 * escribe la pareja tienen que leerse igual.
 */

export const MAX_PARTIDAS = 300;
export const MAX_CONCEPTO = 120;
export const MAX_CATEGORIA = 40;
export const MAX_NOTAS = 500;
/** 1 000 000 € en céntimos: más es casi seguro un cero de más. */
export const MAX_IMPORTE = 100_000_000;

export interface PartidaDelPanel {
  readonly id: string;
  readonly category: string;
  readonly concept: string;
  readonly estimatedCents: number;
  /** 0 mientras no se sepa lo que va a costar de verdad. */
  readonly actualCents: number;
  readonly paid: boolean;
  /** Día límite de pago, `'2027-05-01'`, o `null`. */
  readonly dueOn: string | null;
  readonly notes: string;
  /** El proveedor al que corresponde la partida (F4), o `null`. */
  readonly vendorId: string | null;
  readonly order: number;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function importe(valor: unknown): number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= MAX_IMPORTE
    ? valor
    : 0;
}

/** `'2027-05-01'` si es un día que existe; `null` si no. */
export function esDiaIso(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function leerPartida(
  id: string,
  crudo: unknown,
  /** El día límite ya convertido de Timestamp a `'AAAA-MM-DD'`, o `null`. */
  dueOn: string | null,
): PartidaDelPanel | null {
  if (crudo === null || typeof crudo !== 'object') return null;
  const d = crudo as Record<string, unknown>;

  const concept = texto(d['concept']);
  if (concept === '') return null;

  const orden = d['order'];
  return {
    id,
    category: texto(d['category']) || 'Otros',
    concept,
    estimatedCents: importe(d['estimatedCents']),
    actualCents: importe(d['actualCents']),
    paid: d['paid'] === true,
    dueOn,
    notes: texto(d['notes']),
    vendorId: typeof d['vendorId'] === 'string' && d['vendorId'] !== '' ? d['vendorId'] : null,
    order: typeof orden === 'number' && Number.isFinite(orden) ? orden : 0,
  };
}

export type MotivoPartida = 'concepto' | 'categoria' | 'estimado' | 'real' | 'fecha' | 'notas';

export interface BorradorDePartida {
  readonly category: string;
  readonly concept: string;
  readonly estimado: string;
  readonly real: string;
  readonly paid: boolean;
  readonly dueOn: string;
  readonly notes: string;
  /** `''` si no tiene proveedor. */
  readonly vendorId: string;
}

export interface DatosDePartida {
  readonly category: string;
  readonly concept: string;
  readonly estimatedCents: number;
  readonly actualCents: number;
  readonly paid: boolean;
  readonly dueOn: string | null;
  readonly notes: string;
  readonly vendorId: string | null;
}

/**
 * De lo que escribe la pareja a lo que se guarda, o el campo que falla.
 *
 * `parsear` convierte «1.200,50» en céntimos y devuelve `null` si no se
 * entiende; llega como parámetro para que este fichero no dependa de nada y se
 * pueda probar con dos líneas.
 */
export function validarBorrador(
  b: BorradorDePartida,
  parsear: (texto: string) => number | null,
):
  | { readonly ok: true; readonly datos: DatosDePartida }
  | { readonly ok: false; readonly motivo: MotivoPartida } {
  const concept = b.concept.replace(/\s+/g, ' ').trim();
  if (concept === '' || concept.length > MAX_CONCEPTO) return { ok: false, motivo: 'concepto' };

  const category = b.category.replace(/\s+/g, ' ').trim() || 'Otros';
  if (category.length > MAX_CATEGORIA) return { ok: false, motivo: 'categoria' };

  const estimatedCents = parsear(b.estimado);
  if (estimatedCents === null || estimatedCents > MAX_IMPORTE) {
    return { ok: false, motivo: 'estimado' };
  }
  const actualCents = parsear(b.real);
  if (actualCents === null || actualCents > MAX_IMPORTE) return { ok: false, motivo: 'real' };

  const dueOn = b.dueOn.trim();
  if (dueOn !== '' && !esDiaIso(dueOn)) return { ok: false, motivo: 'fecha' };

  const notes = b.notes.trim();
  if (notes.length > MAX_NOTAS) return { ok: false, motivo: 'notas' };

  return {
    ok: true,
    datos: {
      category,
      concept,
      estimatedCents,
      actualCents,
      paid: b.paid,
      dueOn: dueOn === '' ? null : dueOn,
      notes,
      vendorId: b.vendorId.trim() === '' ? null : b.vendorId.trim(),
    },
  };
}

export interface TotalesDePresupuesto {
  readonly estimado: number;
  readonly real: number;
  /** Lo ya pagado: el coste real de las partidas marcadas como pagadas. */
  readonly pagado: number;
  /** Lo que queda por pagar de lo que ya tiene un coste real. */
  readonly pendiente: number;
  /** Real menos estimado, solo de las partidas con las dos cifras. Negativo = por debajo. */
  readonly desviacion: number;
  readonly partidas: number;
}

export function totales(partidas: readonly PartidaDelPanel[]): TotalesDePresupuesto {
  let estimado = 0;
  let real = 0;
  let pagado = 0;
  let desviacion = 0;

  for (const p of partidas) {
    estimado += p.estimatedCents;
    real += p.actualCents;
    if (p.paid) pagado += p.actualCents;
    if (p.estimatedCents > 0 && p.actualCents > 0) desviacion += p.actualCents - p.estimatedCents;
  }

  return {
    estimado,
    real,
    pagado,
    pendiente: real - pagado,
    desviacion,
    partidas: partidas.length,
  };
}

export interface GrupoDePartidas {
  readonly category: string;
  readonly partidas: readonly PartidaDelPanel[];
  readonly totales: TotalesDePresupuesto;
}

/**
 * Las partidas por categoría, en el orden en que aparece cada categoría por
 * primera vez (según el orden de las partidas): así «Lugar» sigue arriba aunque
 * se añada otra partida de «Lugar» al final.
 */
export function agruparPorCategoria(
  partidas: readonly PartidaDelPanel[],
): readonly GrupoDePartidas[] {
  const ordenadas = [...partidas].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const mapa = new Map<string, PartidaDelPanel[]>();

  for (const p of ordenadas) {
    const lista = mapa.get(p.category);
    if (lista) lista.push(p);
    else mapa.set(p.category, [p]);
  }

  return [...mapa.entries()].map(([category, lista]) => ({
    category,
    partidas: lista,
    totales: totales(lista),
  }));
}

/** El CSV del presupuesto, para abrirlo en Excel (`;` y coma decimal, como en España). */
export function presupuestoACsv(
  partidas: readonly PartidaDelPanel[],
  cabecera: readonly string[],
  si: string,
  no: string,
): string {
  const celda = (valor: string): string => {
    // Un texto que empieza por `=`, `+`, `-` o `@` lo interpreta Excel como fórmula.
    const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
    return /[;"\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  const euros = (c: number): string => (c / 100).toFixed(2).replace('.', ',');

  const lineas = [cabecera.map(celda).join(';')];
  for (const p of [...partidas].sort((a, b) => a.order - b.order)) {
    lineas.push(
      [
        p.category,
        p.concept,
        euros(p.estimatedCents),
        euros(p.actualCents),
        p.paid ? si : no,
        p.dueOn ?? '',
        p.notes,
      ]
        .map(celda)
        .join(';'),
    );
  }
  return lineas.join('\r\n');
}
