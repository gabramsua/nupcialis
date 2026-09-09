#!/usr/bin/env node
/**
 * Siembra bodas de ejemplo en el emulador de Firestore.
 *
 * Contra la API REST del emulador, sin firebase-admin. Ese paquete arrastra
 * medio Google Cloud SDK para escribir seis documentos, y ya nos costó seis
 * minutos de instalación con firebase-tools.
 *
 *   npm run emulators          en una terminal
 *   npm run seed               en otra
 *   npm run seed -- --dry-run  imprime lo que escribiría, sin emulador
 *
 * Es idempotente: se puede lanzar las veces que haga falta.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const { projects } = JSON.parse(readFileSync(join(raiz, '.firebaserc'), 'utf8'));
const PROYECTO = projects.default;
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const BASE = `http://${HOST}/v1/projects/${PROYECTO}/databases/(default)/documents`;

const seco = process.argv.includes('--dry-run');

// --- conversión al formato de valores de Firestore -------------------------

function valor(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valor) } };
  if (typeof v === 'object') return { mapValue: { fields: campos(v) } };
  throw new Error(`Tipo no soportado: ${typeof v}`);
}

function campos(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, valor(v)]));
}

// --- los datos -------------------------------------------------------------

const FECHA = new Date('2027-06-12T11:30:00.000Z');

/**
 * Una boda por estado, para poder recorrer las cinco pantallas a mano.
 * Los nombres van con acentos y eñe a propósito: es lo que habrá de verdad.
 */
const BODAS = [
  {
    slug: 'mariaygabriel',
    slugStatus: 'active',
    weddingId: 'boda-maria-gabriel',
    status: 'active',
    coupleNames: 'María y Gabriel',
    nota: 'publicada — la pantalla normal',
  },
  {
    slug: 'anayjuan',
    slugStatus: 'active',
    weddingId: 'boda-ana-juan',
    status: 'draft',
    coupleNames: 'Ana y Juan',
    nota: 'en borrador — los novios aún no la han publicado',
  },
  {
    slug: 'lolaymanu',
    slugStatus: 'active',
    weddingId: 'boda-lola-manu',
    status: 'archived',
    coupleNames: 'Lola y Manu',
    nota: 'archivada — la boda ya pasó',
  },
  {
    slug: 'pepeypepa',
    slugStatus: 'quarantined',
    weddingId: 'boda-pepe-pepa',
    status: 'active',
    coupleNames: 'Pepe y Pepa',
    nota: 'en cuarentena — debe comportarse como INEXISTENTE, no como archivada',
  },
];

// --- escritura -------------------------------------------------------------

async function escribir(ruta, datos) {
  const url = `${BASE}/${ruta}`;
  if (seco) {
    console.log(`\nPATCH ${ruta}`);
    console.log(JSON.stringify({ fields: campos(datos) }, null, 2));
    return;
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: campos(datos) }),
  });
  if (!res.ok) {
    throw new Error(`${res.status} al escribir ${ruta}: ${await res.text()}`);
  }
}

async function main() {
  if (!seco) {
    try {
      await fetch(`http://${HOST}/`);
    } catch {
      console.error(
        `\nNo hay emulador escuchando en ${HOST}.\n` +
          `Arráncalo con "npm run emulators" en otra terminal.\n`,
      );
      process.exit(1);
    }
  }

  for (const boda of BODAS) {
    await escribir(`slugs/${boda.slug}`, {
      weddingId: boda.weddingId,
      status: boda.slugStatus,
    });

    await escribir(`weddings/${boda.weddingId}`, {
      slug: boda.slug,
      status: boda.status,
      plan: 'basic',
      couple: { partnerA: boda.coupleNames.split(' y ')[0], partnerB: boda.coupleNames.split(' y ')[1] },
      weddingDate: FECHA,
      timezone: 'Europe/Madrid',
      locale: 'es',
      ownerUids: [],
      guestAccessMode: 'open',
      counters: { guestsTotal: 0, guestsConfirmed: 0, guestsDeclined: 0, guestsPending: 0 },
    });

    await escribir(`weddings/${boda.weddingId}/public/site`, {
      status: boda.status,
      coupleNames: boda.coupleNames,
      weddingDate: FECHA,
      locale: 'es',
    });
  }

  if (seco) return;

  console.log('\nSembrado. Abre en el navegador:\n');
  for (const boda of BODAS) {
    console.log(`  http://${boda.slug}.localhost:4200`.padEnd(46) + `→ ${boda.nota}`);
  }
  console.log('  http://noexiste.localhost:4200'.padEnd(46) + '→ no encontrada\n');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
