#!/usr/bin/env node
/**
 * Siembra bodas de ejemplo en los emuladores.
 *
 * Cambio importante respecto a la primera versión: **ya no escribe los
 * documentos a mano, llama a `provisionWedding`**. Escribirlos a mano obligaba a
 * mantener aquí una copia del modelo de datos, y esa copia se quedó obsoleta en
 * cuanto el alta empezó a sembrar módulos, layout y proyección. Peor: unos datos
 * de ejemplo que no se parecen a los de verdad esconden justo los fallos que uno
 * quiere encontrar en local.
 *
 * Efecto secundario útil: sembrar es ahora una prueba del alta.
 *
 *   npm run emulators     en una terminal
 *   npm run seed          en otra
 *
 * Es idempotente: si una boda ya existe, se reutiliza y solo se ajusta su estado.
 */

import {
  comprobarEmuladores,
  cuentaConClaims,
  escribirDoc,
  esperarA,
  leerDoc,
  llamarFuncion,
} from './emulador.mjs';

/** Nueve meses vista: siempre futura, aunque este fichero envejezca. */
const FECHA_BODA = new Date(Date.now() + 275 * 86_400_000);

/**
 * Una boda por estado, para poder recorrer las cinco pantallas a mano.
 * Los nombres van con acentos y eñe a propósito: es lo que habrá de verdad.
 */
const BODAS = [
  {
    slug: 'mariaygabriel',
    partnerA: 'María',
    partnerB: 'Gabriel',
    plan: 'extended',
    status: 'active',
    slugStatus: 'active',
    plantilla: 'clasica',
    nota: 'publicada con la plantilla Clásica',
  },
  {
    slug: 'sofiayleo',
    partnerA: 'Sofía',
    partnerB: 'Leo',
    plan: 'extended',
    status: 'active',
    slugStatus: 'active',
    plantilla: 'botanica',
    nota: 'publicada con la plantilla Botánica — la misma boda, otro diseño',
  },
  {
    slug: 'anayjuan',
    partnerA: 'Ana',
    partnerB: 'Juan',
    plan: 'basic',
    status: 'draft',
    slugStatus: 'active',
    nota: 'en borrador — los novios aún no la han publicado',
  },
  {
    slug: 'lolaymanu',
    partnerA: 'Lola',
    partnerB: 'Manu',
    plan: 'basic',
    status: 'archived',
    slugStatus: 'active',
    // El alta rechaza fechas pasadas, con razón. Para una boda archivada la
    // fecha se retrasa después, que es lo que habría ocurrido con el tiempo.
    fechaPasada: true,
    nota: 'archivada — la boda ya pasó',
  },
  {
    slug: 'pepeypepa',
    partnerA: 'Pepe',
    partnerB: 'Pepa',
    plan: 'basic',
    status: 'active',
    slugStatus: 'quarantined',
    nota: 'en cuarentena — debe comportarse como INEXISTENTE, no como archivada',
  },
];

async function bodaExistente(slug) {
  const entrada = await leerDoc(`slugs/${slug}`);
  return entrada?.weddingId ?? null;
}

async function darDeAlta(boda, idToken) {
  const yaEstaba = await bodaExistente(boda.slug);
  if (yaEstaba) return { weddingId: yaEstaba, nueva: false };

  const alta = await llamarFuncion(
    'provisionWedding',
    {
      slug: boda.slug,
      partnerA: boda.partnerA,
      partnerB: boda.partnerB,
      weddingDate: FECHA_BODA.toISOString(),
      emails: [`${boda.slug}@ejemplo.test`],
      plan: boda.plan,
    },
    idToken,
  );

  if (!alta.ok) {
    throw new Error(`No se pudo dar de alta ${boda.slug}: ${JSON.stringify(alta.error)}`);
  }
  return { weddingId: alta.resultado.weddingId, nueva: true };
}

async function main() {
  await comprobarEmuladores();

  // El alta exige superadmin. Esta cuenta solo existe en el emulador.
  const jefe = await cuentaConClaims('superadmin@ejemplo.test', 'superadmin', {
    superadmin: true,
  });

  for (const boda of BODAS) {
    const { weddingId, nueva } = await darDeAlta(boda, jefe.idToken);

    // El alta deja toda boda en `draft`, que es lo correcto (D-24a). Los otros
    // estados se fuerzan aquí porque son precisamente lo que queremos mirar.
    const ajustes = { status: boda.status };
    if (boda.fechaPasada) ajustes.weddingDate = new Date(Date.now() - 30 * 86_400_000);
    // El alta siembra siempre la clásica; aquí se cambia para poder ver las dos
    // plantillas del catálogo una al lado de la otra.
    if (boda.plantilla) ajustes['theme.templateId'] = boda.plantilla;
    await escribirDoc(`weddings/${weddingId}`, ajustes);

    if (boda.slugStatus !== 'active') {
      await escribirDoc(`slugs/${boda.slug}`, { status: boda.slugStatus });
    }

    // Sin esta espera, `npm start` puede pillar la proyección a medio
    // actualizar y enseñar una pantalla que no toca.
    //
    // Se comprueba el estado **y los nombres**. Comprobar solo el estado dejó
    // pasar el fallo del `updateMask`: la proyección decía `active` mientras la
    // boda se había quedado sin nombres ni fecha, y la portada salía con un
    // rombo y una "y" suelta. Una semilla que no mira lo que ha sembrado no
    // sirve de nada.
    await esperarA(`la proyección de ${boda.slug}`, async () => {
      const sitio = await leerDoc(`weddings/${weddingId}/public/site`);
      const completa =
        sitio?.status === boda.status &&
        sitio?.coupleNames?.partnerA === boda.partnerA &&
        sitio?.coupleNames?.partnerB === boda.partnerB &&
        Boolean(sitio?.weddingDate);
      return completa ? sitio : null;
    });

    console.log(`  ${nueva ? 'alta' : 'ya estaba'}: ${boda.slug} → ${weddingId}`);
  }

  console.log('\nSembrado. Abre en el navegador:\n');
  for (const boda of BODAS) {
    console.log(`  http://${boda.slug}.localhost:4200`.padEnd(46) + `→ ${boda.nota}`);
  }
  console.log('  http://noexiste.localhost:4200'.padEnd(46) + '→ no encontrada');
  console.log('  http://localhost:4200/dev/ds'.padEnd(46) + '→ el catálogo del sistema visual\n');
}

main().catch((e) => {
  console.error(`\n${e.message}\n`);
  process.exit(1);
});
