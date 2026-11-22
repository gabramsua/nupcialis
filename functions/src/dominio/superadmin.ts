/**
 * Lo que el superadmin lleva por boda: los cobros y los recordatorios de después
 * de la boda (S1.3e, S1.3f).
 *
 * Solo de servidor. El cliente recibe ya validado y calculado lo que pinta; lo
 * único que repite son los totales de la pantalla, que son una suma.
 */

// ---------- pagos ----------

export const METODOS_PAGO = ['bizum', 'transferencia', 'efectivo', 'otro'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const ESTADOS_PAGO = ['pending', 'paid'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const MAX_CONCEPTO = 120;
export const MAX_FACTURA = 40;
export const MAX_NOTAS = 500;
/** 100 000 € en céntimos. Más es casi seguro un cero de más. */
export const MAX_IMPORTE_CENTIMOS = 10_000_000;

export interface PagoValido {
  readonly weddingId: string;
  /** Céntimos: con euros en coma flotante, 0,1 + 0,2 no suma 0,3. */
  readonly amountCents: number;
  readonly concept: string;
  readonly method: MetodoPago;
  readonly status: EstadoPago;
  /** `'2026-11-20'`. Un texto y no una fecha, para que no cambie de día con la zona. */
  readonly paidOn: string | null;
  readonly invoiceNumber: string;
  readonly notes: string;
}

export type MotivoPagoInvalido =
  'boda' | 'importe' | 'concepto' | 'metodo' | 'estado' | 'fecha' | 'factura' | 'notas';

export type ResultadoPago =
  | { readonly ok: true; readonly pago: PagoValido }
  | { readonly ok: false; readonly motivo: MotivoPagoInvalido };

function texto(valor: unknown, maximo: number): string | null {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string') return null;
  const limpio = valor.replace(/\r\n/g, '\n').trim();
  return limpio.length > maximo ? null : limpio;
}

/** `'2026-02-30'` no existe, y `Date` lo aceptaría corriéndolo a marzo. */
export function esFechaISO(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function validarPago(valor: unknown): ResultadoPago {
  if (valor === null || typeof valor !== 'object') return { ok: false, motivo: 'importe' };
  const p = valor as Record<string, unknown>;

  const weddingId = typeof p['weddingId'] === 'string' ? p['weddingId'].trim() : '';
  if (weddingId === '' || weddingId.includes('/')) return { ok: false, motivo: 'boda' };

  const importe = p['amountCents'];
  if (
    typeof importe !== 'number' ||
    !Number.isInteger(importe) ||
    importe <= 0 ||
    importe > MAX_IMPORTE_CENTIMOS
  ) {
    return { ok: false, motivo: 'importe' };
  }

  const concept = texto(p['concept'], MAX_CONCEPTO);
  if (concept === null || concept === '') return { ok: false, motivo: 'concepto' };

  const method = p['method'];
  if (!(METODOS_PAGO as readonly unknown[]).includes(method)) {
    return { ok: false, motivo: 'metodo' };
  }

  const status = p['status'];
  if (!(ESTADOS_PAGO as readonly unknown[]).includes(status)) {
    return { ok: false, motivo: 'estado' };
  }

  // Un cobro pendiente no tiene fecha de cobro; uno cobrado, sí.
  const paidOn = p['paidOn'] ?? null;
  if (status === 'paid') {
    if (!esFechaISO(paidOn)) return { ok: false, motivo: 'fecha' };
  } else if (paidOn !== null && paidOn !== '') {
    return { ok: false, motivo: 'fecha' };
  }

  const invoiceNumber = texto(p['invoiceNumber'], MAX_FACTURA);
  if (invoiceNumber === null) return { ok: false, motivo: 'factura' };

  const notes = texto(p['notes'], MAX_NOTAS);
  if (notes === null) return { ok: false, motivo: 'notas' };

  return {
    ok: true,
    pago: {
      weddingId,
      amountCents: importe,
      concept,
      method: method as MetodoPago,
      status: status as EstadoPago,
      paidOn: status === 'paid' ? (paidOn as string) : null,
      invoiceNumber,
      notes,
    },
  };
}

// ---------- recordatorios ----------

/**
 * A quién va dirigido cada recordatorio.
 *
 * `pareja`: hay que decirle algo a la pareja. `superadmin`: es una tarea de
 * Gabriel sobre esa boda.
 */
export type DestinoRecordatorio = 'pareja' | 'superadmin';

export const CLAVES_RECORDATORIO = [
  'agradecimiento',
  'encuesta',
  'cierre-pareja',
  'cierre-superadmin',
] as const;
export type ClaveRecordatorio = (typeof CLAVES_RECORDATORIO)[number];

export function esClaveRecordatorio(valor: unknown): valor is ClaveRecordatorio {
  return typeof valor === 'string' && (CLAVES_RECORDATORIO as readonly string[]).includes(valor);
}

export const DESTINO_DE: Readonly<Record<ClaveRecordatorio, DestinoRecordatorio>> = {
  agradecimiento: 'pareja',
  encuesta: 'pareja',
  'cierre-pareja': 'pareja',
  'cierre-superadmin': 'superadmin',
};

/**
 * Cuánto después de la boda toca (S1.3f: «a los 2 meses»).
 *
 * Sesenta días y no «dos meses de calendario»: la fecha tiene que salir igual
 * en cualquier mes y un test lo puede fijar. Está apartado en D-48 si lo que se
 * quiere es otro plazo, o plazos distintos por recordatorio.
 */
export const DIAS_HASTA_RECORDATORIO = 60;

/** Con cuántos días de antelación se enseña lo que está por llegar. */
export const DIAS_DE_AVISO = 14;

export type SituacionRecordatorio = 'vencido' | 'proximo' | 'enviado';

export interface BodaParaRecordatorios {
  readonly weddingId: string;
  readonly status: string;
  /** `'2026-06-20'` o `null` si la boda no tiene fecha. */
  readonly weddingDay: string | null;
}

export interface Recordatorio {
  readonly weddingId: string;
  readonly key: ClaveRecordatorio;
  readonly destino: DestinoRecordatorio;
  /** `'2026-08-19'`. */
  readonly dueOn: string;
  readonly situacion: SituacionRecordatorio;
}

const DIA_MS = 86_400_000;

function dia(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function sumarDias(iso: string, dias: number): string {
  return new Date(dia(iso) + dias * DIA_MS).toISOString().slice(0, 10);
}

/**
 * Los recordatorios que hay que enseñar hoy, de más urgente a menos.
 *
 * - Una boda en **borrador o archivada** no genera ninguno: la primera no ha
 *   llegado a existir para nadie, y la segunda ya se cerró.
 * - Lo **marcado como enviado** se queda en la lista (con su situación), porque
 *   desmarcar un clic equivocado tiene que ser posible.
 * - Lo que aún está a más de `DIAS_DE_AVISO` días no sale: una lista con las
 *   cuatro tareas de cada boda del próximo año no la mira nadie.
 */
export function calcularRecordatorios(
  bodas: readonly BodaParaRecordatorios[],
  enviados: ReadonlySet<string>,
  hoy: string,
): readonly Recordatorio[] {
  const salida: Recordatorio[] = [];

  for (const boda of bodas) {
    if (boda.weddingDay === null || !esFechaISO(boda.weddingDay)) continue;
    if (boda.status !== 'active') continue;

    const dueOn = sumarDias(boda.weddingDay, DIAS_HASTA_RECORDATORIO);

    for (const key of CLAVES_RECORDATORIO) {
      const enviado = enviados.has(claveDeMarca(boda.weddingId, key));
      const falta = (dia(dueOn) - dia(hoy)) / DIA_MS;

      if (!enviado && falta > DIAS_DE_AVISO) continue;

      salida.push({
        weddingId: boda.weddingId,
        key,
        destino: DESTINO_DE[key],
        dueOn,
        situacion: enviado ? 'enviado' : falta <= 0 ? 'vencido' : 'proximo',
      });
    }
  }

  const rango: Record<SituacionRecordatorio, number> = { vencido: 0, proximo: 1, enviado: 2 };
  return salida.sort(
    (a, b) =>
      rango[a.situacion] - rango[b.situacion] ||
      a.dueOn.localeCompare(b.dueOn) ||
      a.weddingId.localeCompare(b.weddingId) ||
      CLAVES_RECORDATORIO.indexOf(a.key) - CLAVES_RECORDATORIO.indexOf(b.key),
  );
}

/** El id del documento que marca un recordatorio como enviado. */
export function claveDeMarca(weddingId: string, key: ClaveRecordatorio): string {
  return `${weddingId}__${key}`;
}
