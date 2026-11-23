/**
 * Lo que el superadmin ve de una boda concreta: su ficha, sus cobros y sus
 * recordatorios (S1.6b, S1.7, S1.3e, S1.3f).
 *
 * Frontera de confianza (D-19): lo que llega de las funciones es `unknown` hasta
 * que pasa por los lectores de aquí, porque el despliegue de las funciones puede
 * ir por delante o por detrás de este código.
 */

export type EstadoBoda = 'draft' | 'active' | 'archived';

export const METODOS_PAGO = ['bizum', 'transferencia', 'efectivo', 'otro'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const ESTADOS_PAGO = ['pending', 'paid'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const CLAVES_RECORDATORIO = [
  'agradecimiento',
  'encuesta',
  'cierre-pareja',
  'cierre-superadmin',
] as const;
export type ClaveRecordatorio = (typeof CLAVES_RECORDATORIO)[number];

export type SituacionRecordatorio = 'vencido' | 'proximo' | 'enviado';

export interface Pareja {
  readonly partnerA: string;
  readonly partnerB: string;
}

export interface Contacto {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly phone: string | null;
  readonly disabled: boolean;
  readonly lastSignIn: Date | null;
}

export interface EntradaDeHistorial {
  readonly id: string;
  readonly action: string;
  readonly actorRole: string;
  readonly at: Date | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface Pago {
  readonly id: string;
  readonly weddingId: string;
  /** Céntimos: con euros en coma flotante, 0,1 + 0,2 no suma 0,3. */
  readonly amountCents: number;
  readonly concept: string;
  readonly method: MetodoPago;
  readonly status: EstadoPago;
  /** `'2026-11-20'` o `null` si está pendiente. */
  readonly paidOn: string | null;
  readonly invoiceNumber: string;
  readonly notes: string;
}

export type PagoEnEdicion = Omit<Pago, 'id'>;

export interface AccesoDeBoda {
  readonly pareja: number;
  readonly parejaUltima: Date | null;
  /** Veces que se ha abierto la web de la boda (contador agregado, D-55). */
  readonly visitasWeb: number;
  readonly visitasWebUltima: Date | null;
  readonly invitadosQueEntraron: number;
  readonly invitadosEntradas: number;
}

export interface FichaDeBoda {
  readonly weddingId: string;
  readonly slug: string;
  readonly status: EstadoBoda;
  readonly plan: string;
  readonly couple: Pareja;
  readonly weddingDay: string | null;
  readonly createdAt: Date | null;
  readonly authDomain: 'ok' | 'pending';
  readonly ceremonyType: 'civil' | 'religious';
  /** Teléfono de contacto de la pareja, o `''` si no se dio. */
  readonly contactPhone: string;
  /** Lo acordado con la pareja, en céntimos; `null` si no se ha fijado (D-56). */
  readonly agreedPriceCents: number | null;
  readonly invitados: number;
  readonly confirmados: number;
  readonly rechazados: number;
  readonly pendientes: number;
  readonly fotos: number;
  /** Cuántas veces ha entrado cada parte (D-53). */
  readonly acceso: AccesoDeBoda;
  readonly contactos: readonly Contacto[];
  readonly historial: readonly EntradaDeHistorial[];
  readonly pagos: readonly Pago[];
}

export interface BodaMinima {
  readonly weddingId: string;
  readonly slug: string;
  readonly couple: Pareja;
}

export interface DatosDeFinanzas {
  readonly pagos: readonly Pago[];
  readonly bodas: readonly BodaMinima[];
  readonly recortado: boolean;
}

export interface Recordatorio {
  readonly weddingId: string;
  readonly key: ClaveRecordatorio;
  readonly destino: 'pareja' | 'superadmin';
  readonly dueOn: string;
  readonly situacion: SituacionRecordatorio;
  readonly slug: string;
  readonly couple: Pareja;
  readonly weddingDay: string | null;
}

// ---------- lectores ----------

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function textoONull(valor: unknown): string | null {
  return typeof valor === 'string' && valor !== '' ? valor : null;
}

function entero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0, Math.floor(valor)) : 0;
}

function fecha(valor: unknown): Date | null {
  if (typeof valor !== 'string') return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function lista(valor: unknown): readonly unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function pareja(valor: unknown): Pareja {
  const o = objeto(valor);
  return { partnerA: texto(o['partnerA']), partnerB: texto(o['partnerB']) };
}

function estadoBoda(valor: unknown): EstadoBoda {
  // Ante un estado que no reconocemos, borrador: es el que menos promete.
  return valor === 'active' || valor === 'archived' ? valor : 'draft';
}

export function leerPago(valor: unknown): Pago | null {
  const o = objeto(valor);
  const id = texto(o['id']);
  const weddingId = texto(o['weddingId']);
  if (id === '' || weddingId === '') return null;

  const method = (METODOS_PAGO as readonly unknown[]).includes(o['method'])
    ? (o['method'] as MetodoPago)
    : 'otro';

  return {
    id,
    weddingId,
    amountCents: entero(o['amountCents']),
    concept: texto(o['concept']),
    method,
    status: o['status'] === 'paid' ? 'paid' : 'pending',
    paidOn: textoONull(o['paidOn']),
    invoiceNumber: texto(o['invoiceNumber']),
    notes: texto(o['notes']),
  };
}

function pagos(valor: unknown): readonly Pago[] {
  return lista(valor)
    .map(leerPago)
    .filter((p): p is Pago => p !== null);
}

export function leerFicha(valor: unknown): FichaDeBoda | null {
  const o = objeto(valor);
  const weddingId = texto(o['weddingId']);
  if (weddingId === '') return null;

  return {
    weddingId,
    slug: texto(o['slug']),
    status: estadoBoda(o['status']),
    plan: texto(o['plan']),
    couple: pareja(o['couple']),
    weddingDay: textoONull(o['weddingDay']),
    createdAt: fecha(o['createdAt']),
    authDomain: o['authDomain'] === 'ok' ? 'ok' : 'pending',
    ceremonyType: o['ceremonyType'] === 'religious' ? 'religious' : 'civil',
    contactPhone: texto(o['contactPhone']),
    agreedPriceCents:
      typeof o['agreedPriceCents'] === 'number' && o['agreedPriceCents'] >= 0
        ? Math.round(o['agreedPriceCents'])
        : null,
    invitados: entero(o['invitados']),
    confirmados: entero(o['confirmados']),
    rechazados: entero(o['rechazados']),
    pendientes: entero(o['pendientes']),
    fotos: entero(o['fotos']),
    acceso: {
      pareja: entero(objeto(o['acceso'])['pareja']),
      parejaUltima: fecha(objeto(o['acceso'])['parejaUltima']),
      visitasWeb: entero(objeto(o['acceso'])['visitasWeb']),
      visitasWebUltima: fecha(objeto(o['acceso'])['visitasWebUltima']),
      invitadosQueEntraron: entero(objeto(o['acceso'])['invitadosQueEntraron']),
      invitadosEntradas: entero(objeto(o['acceso'])['invitadosEntradas']),
    },
    contactos: lista(o['contactos']).flatMap((c) => {
      const x = objeto(c);
      const uid = texto(x['uid']);
      if (uid === '') return [];
      return [
        {
          uid,
          email: textoONull(x['email']),
          displayName: textoONull(x['displayName']),
          phone: textoONull(x['phone']),
          disabled: x['disabled'] === true,
          lastSignIn: fecha(x['lastSignIn']),
        },
      ];
    }),
    historial: lista(o['historial']).map((e) => {
      const x = objeto(e);
      return {
        id: texto(x['id']),
        action: texto(x['action']),
        actorRole: texto(x['actorRole']),
        at: fecha(x['at']),
        payload: objeto(x['payload']),
      };
    }),
    pagos: pagos(o['pagos']),
  };
}

export function leerFinanzas(valor: unknown): DatosDeFinanzas | null {
  const o = objeto(valor);
  if (!Array.isArray(o['pagos']) || !Array.isArray(o['bodas'])) return null;

  return {
    pagos: pagos(o['pagos']),
    bodas: lista(o['bodas']).flatMap((b) => {
      const x = objeto(b);
      const weddingId = texto(x['weddingId']);
      return weddingId === ''
        ? []
        : [{ weddingId, slug: texto(x['slug']), couple: pareja(x['couple']) }];
    }),
    recortado: o['recortado'] === true,
  };
}

export function leerRecordatorios(valor: unknown): readonly Recordatorio[] | null {
  const o = objeto(valor);
  if (!Array.isArray(o['recordatorios'])) return null;

  return lista(o['recordatorios']).flatMap((r) => {
    const x = objeto(r);
    const key = x['key'];
    const weddingId = texto(x['weddingId']);
    const dueOn = texto(x['dueOn']);
    if (weddingId === '' || dueOn === '') return [];
    if (!(CLAVES_RECORDATORIO as readonly unknown[]).includes(key)) return [];

    const situacion: SituacionRecordatorio =
      x['situacion'] === 'enviado'
        ? 'enviado'
        : x['situacion'] === 'proximo'
          ? 'proximo'
          : 'vencido';

    return [
      {
        weddingId,
        key: key as ClaveRecordatorio,
        destino: x['destino'] === 'superadmin' ? ('superadmin' as const) : ('pareja' as const),
        dueOn,
        situacion,
        slug: texto(x['slug']),
        couple: pareja(x['couple']),
        weddingDay: textoONull(x['weddingDay']),
      },
    ];
  });
}

// ---------- dinero ----------

// Viven en `shared/dinero` (los usa también el presupuesto de la pareja).
import { centimosATexto } from '../../../shared/dinero';
export { centimosAEuros, centimosATexto, eurosACentimos } from '../../../shared/dinero';

export interface TotalesDePagos {
  readonly cobrado: number;
  readonly pendiente: number;
  readonly cobros: number;
}

export function totalesDePagos(lista: readonly Pago[]): TotalesDePagos {
  let cobrado = 0;
  let pendiente = 0;
  for (const p of lista) {
    if (p.status === 'paid') cobrado += p.amountCents;
    else pendiente += p.amountCents;
  }
  return { cobrado, pendiente, cobros: lista.length };
}

// ---------- CSV ----------

/** Una celda de CSV. Las comillas se doblan, y lo que parece fórmula se neutraliza. */
export function celdaCsv(valor: string): string {
  // Una celda que empieza por `=`, `+`, `-` o `@` la abre Excel como fórmula: el
  // concepto de un cobro lo escribe una persona, y un CSV no puede ejecutarla.
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

const BOM = String.fromCharCode(0xfeff);

/**
 * El libro de cobros en CSV, con `;` como separador y coma decimal: es lo que
 * abre bien un Excel en español sin pasar por el asistente de importación.
 */
export function pagosACsv(
  filas: readonly Pago[],
  nombreDeBoda: (weddingId: string) => string,
  cabecera: readonly string[],
): string {
  const lineas = [cabecera.map(celdaCsv).join(';')];
  for (const p of filas) {
    lineas.push(
      [
        nombreDeBoda(p.weddingId),
        p.concept,
        centimosATexto(p.amountCents).replace(/^(\d+)$/, '$1,00'),
        p.method,
        p.status,
        p.paidOn ?? '',
        p.invoiceNumber,
        p.notes,
      ]
        .map(celdaCsv)
        .join(';'),
    );
  }
  // BOM: sin él, Excel abre el UTF-8 como si fuera Latin-1 y rompe las tildes.
  return `${BOM}${lineas.join('\r\n')}\r\n`;
}

/**
 * `'2026-11-20'` como fecha a mediodía **local**: formateada con cualquier zona
 * sigue siendo el mismo día, que no pasa con la medianoche UTC.
 */
export function diaAFecha(dia: string | null): Date | null {
  if (dia === null || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const d = new Date(`${dia}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Las acciones del registro de auditoría que tienen etiqueta propia. */
export const ACCIONES_CONOCIDAS = [
  'authorizeWeddingDomain',
  'createPayment',
  'deletePayment',
  'generateCoupleResetLink',
  'markReminderSent',
  'provisionWedding',
  'revokeUserClaims',
  'setCompanionQuota',
  'setGuestRsvp',
  'setGuestsRsvp',
  'setUserClaims',
  'setWeddingLimits',
  'setWeddingStatus',
  'unmarkReminderSent',
  'updatePayment',
] as const;

export function esAccionConocida(accion: string): boolean {
  return (ACCIONES_CONOCIDAS as readonly string[]).includes(accion);
}

/** El payload de una entrada como pares legibles, sin objetos anidados. */
export function resumenDePayload(payload: Readonly<Record<string, unknown>>): string {
  return Object.entries(payload)
    .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ');
}
