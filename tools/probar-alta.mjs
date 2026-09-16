#!/usr/bin/env node
/**
 * Prueba de extremo a extremo del alta de una boda (F0.6.V).
 *
 * Las 86 pruebas de `functions/` son de dominio puro: comprueban que el slug se
 * normaliza y que la proyección no filtra campos, pero **ninguna ejecuta la
 * transacción real, ni crea cuentas, ni dispara un trigger**. Esto sí.
 *
 *     npm run emulators      en una terminal
 *     npm run probar:alta    en otra
 *
 * Lo que comprueba, en orden:
 *
 * 1. Un usuario sin el claim de superadmin no puede dar de alta una boda.
 * 2. Un alta válida crea slug, boda, proyección y las cinco semillas.
 * 3. Las cuentas de la pareja existen y llevan los claims correctos.
 * 4. `syncPublicProjection` mantiene la proyección al día al cambiar la boda.
 * 5. `recomputeCounters` recuenta al aparecer un invitado.
 * 6. Repetir el alta con el mismo slug falla y devuelve alternativas.
 *
 * No toca nada fuera de los emuladores.
 */

import {
  comprobarEmuladores,
  contarColeccion,
  cuentaConClaims,
  escribirDoc,
  esperarA,
  leerDoc,
  llamarFuncion,
} from './emulador.mjs';

const VERDE = '[32m';
const ROJO = '[31m';
const GRIS = '[90m';
const FIN = '[0m';

let fallos = 0;

function comprobar(descripcion, condicion, detalle) {
  if (condicion) {
    console.log(`  ${VERDE}✓${FIN} ${descripcion}`);
  } else {
    fallos++;
    console.log(`  ${ROJO}✗${FIN} ${descripcion}`);
    if (detalle !== undefined) console.log(`    ${GRIS}${JSON.stringify(detalle)}${FIN}`);
  }
}

function paso(titulo) {
  console.log(`\n${titulo}`);
}

/** Slug distinto en cada ejecución: así el script se puede repetir sin limpiar. */
const SUFIJO = Date.now().toString(36).slice(-4);
const SLUG = `prueba-alta-${SUFIJO}`;

const ALTA = {
  slug: SLUG,
  partnerA: 'María',
  partnerB: 'Gabriel',
  weddingDate: new Date(Date.now() + 300 * 86_400_000).toISOString(),
  emails: [`novia-${SUFIJO}@ejemplo.test`, `novio-${SUFIJO}@ejemplo.test`],
  plan: 'extended',
};

async function main() {
  await comprobarEmuladores();

  paso('1. Permisos: quien no es superadmin no da de alta bodas');
  const cualquiera = await cuentaConClaims('cualquiera@ejemplo.test', 'sinpermiso', {});
  const denegado = await llamarFuncion('provisionWedding', ALTA, cualquiera.idToken);
  comprobar('se rechaza sin el claim de superadmin', !denegado.ok, denegado.resultado);
  comprobar(
    'el motivo es permission-denied, no otro',
    denegado.error?.status === 'PERMISSION_DENIED',
    denegado.error,
  );

  const sinSesion = await llamarFuncion('provisionWedding', ALTA, null);
  comprobar('y sin sesión tampoco', !sinSesion.ok, sinSesion.resultado);

  paso('2. Alta de la boda');
  const jefe = await cuentaConClaims('jefe@ejemplo.test', 'superadmin', { superadmin: true });
  const alta = await llamarFuncion('provisionWedding', ALTA, jefe.idToken);

  if (!alta.ok) {
    console.error(`\n${ROJO}El alta ha fallado y sin ella no se puede seguir:${FIN}`);
    console.error(JSON.stringify(alta.error, null, 2));
    process.exit(1);
  }

  const { weddingId, slug, cuentas, avisos } = alta.resultado;
  comprobar('devuelve un weddingId', typeof weddingId === 'string' && weddingId.length > 0);
  comprobar('el slug es el pedido', slug === SLUG, { slug, esperado: SLUG });
  comprobar('crea las dos cuentas de la pareja', cuentas?.length === 2, cuentas);
  comprobar(
    'genera el enlace de acceso de cada una',
    cuentas?.every((c) => typeof c.enlaceAcceso === 'string' && c.enlaceAcceso.length > 0),
    cuentas?.map((c) => ({ email: c.email, tieneEnlace: Boolean(c.enlaceAcceso) })),
  );

  // En el emulador no hay dominios autorizados que dar de alta, así que ese
  // paso se salta y `setup.authDomain` se queda como 'ok'. Que esto pase aquí
  // no demuestra nada sobre producción: ver F0.6.X en TAREAS.md.
  console.log(`  ${GRIS}avisos: ${avisos?.length ? avisos.join(' | ') : 'ninguno'}${FIN}`);

  paso('3. Lo que ha quedado escrito');
  const entradaSlug = await leerDoc(`slugs/${slug}`);
  comprobar('el slug apunta a la boda', entradaSlug?.weddingId === weddingId, entradaSlug);
  comprobar('y está activo', entradaSlug?.status === 'active', entradaSlug);

  const boda = await leerDoc(`weddings/${weddingId}`);
  comprobar('la boda nace en borrador', boda?.status === 'draft', { status: boda?.status });
  comprobar('con el plan contratado', boda?.plan === 'extended', { plan: boda?.plan });
  comprobar('y en multipágina, que es lo que trae el extendido', boda?.layout === 'multipage', {
    layout: boda?.layout,
  });
  comprobar(
    'los dos uids quedan como propietarios',
    boda?.ownerUids?.length === 2,
    boda?.ownerUids,
  );
  comprobar(
    'la galería está activa en el plan extendido',
    boda?.modules?.gallery?.enabled === true,
  );
  comprobar('los contadores arrancan a cero', boda?.counters?.guestsTotal === 0, boda?.counters);

  paso('4. Las semillas');
  const semillas = [
    ['formQuestions', 7],
    ['faqs', 7],
    ['quizQuestions', 5],
    ['guestGroups', 1],
  ];
  for (const [coleccion, esperado] of semillas) {
    const total = await contarColeccion(`weddings/${weddingId}/${coleccion}`);
    comprobar(`${coleccion}: ${esperado} documentos`, total === esperado, { total });
  }
  const tareas = await contarColeccion(`weddings/${weddingId}/checklistItems`);
  comprobar('checklistItems: se siembran tareas', tareas > 0, { tareas });

  const menu = await leerDoc(`weddings/${weddingId}/formQuestions/menu`);
  comprobar('la pregunta del menú se vincula a guests.menu', menu?.mapsTo === 'menu', menu?.mapsTo);
  comprobar(
    'y depende de la de asistencia, que existe de verdad',
    menu?.visibleIf?.questionId === 'asistencia' &&
      (await leerDoc(`weddings/${weddingId}/formQuestions/asistencia`)) !== null,
    menu?.visibleIf,
  );

  paso('5. La proyección pública');
  const sitio = await leerDoc(`weddings/${weddingId}/public/site`);
  comprobar('existe', sitio !== null);
  comprobar('con los nombres separados, no montados', sitio?.coupleNames?.partnerA === 'María', {
    coupleNames: sitio?.coupleNames,
  });
  comprobar('y refleja el borrador', sitio?.status === 'draft', { status: sitio?.status });

  // Lo que de verdad importa de la proyección: que no se escape nada.
  for (const prohibido of ['counters', 'plan', 'ownerUids', 'modules', 'setup']) {
    comprobar(`no publica "${prohibido}"`, sitio?.[prohibido] === undefined);
  }

  paso('6. syncPublicProjection reacciona a un cambio');
  await escribirDoc(`weddings/${weddingId}`, { status: 'active' });
  const publicada = await esperarA('que la proyección pase a active', async () => {
    const s = await leerDoc(`weddings/${weddingId}/public/site`);
    return s?.status === 'active' ? s : null;
  });
  comprobar('la proyección se pone al día sola', publicada.status === 'active');
  // Un cambio de estado no puede llevarse por delante el resto de la boda. Es
  // exactamente lo que pasó con el `updateMask`: el trigger publicaba después
  // una boda vacía y la portada salía sin nombres.
  comprobar(
    'y el cambio de estado no se lleva por delante los nombres',
    publicada.coupleNames?.partnerA === 'María' && Boolean(publicada.weddingDate),
    publicada.coupleNames,
  );
  const bodaTrasCambio = await leerDoc(`weddings/${weddingId}`);
  comprobar(
    'ni los módulos de la boda',
    bodaTrasCambio?.modules?.gallery?.enabled === true,
    bodaTrasCambio?.modules === undefined ? 'la boda se ha quedado sin modules' : 'ok',
  );

  paso('7. recomputeCounters recuenta al aparecer un invitado');
  await escribirDoc(`weddings/${weddingId}/guests/invitada-1`, {
    fullName: 'Tía Consuelo',
    rsvpStatus: 'confirmed',
    active: true,
    tableId: 'mesa-1',
    loginCount: 3,
    quizPlayCount: 2,
  });
  const contados = await esperarA('que los contadores se actualicen', async () => {
    const b = await leerDoc(`weddings/${weddingId}`);
    return b?.counters?.guestsTotal === 1 ? b.counters : null;
  });
  comprobar('cuenta el invitado', contados.guestsTotal === 1, contados);
  comprobar('lo cuenta como confirmado', contados.guestsConfirmed === 1, contados);
  comprobar('cuenta su silla asignada', contados.seatsAssigned === 1, contados);
  comprobar('suma sus partidas al quiz', contados.quizPlays === 2, contados);
  comprobar('y lo cuenta una vez pese a tres entradas', contados.uniqueLogins === 1, contados);

  paso('8. El mismo slug no se puede dar de alta dos veces');
  const repetida = await llamarFuncion('provisionWedding', ALTA, jefe.idToken);
  comprobar('la segunda alta falla', !repetida.ok);
  comprobar(
    'y propone alternativas en vez de dejar a la pareja sin dirección',
    Array.isArray(repetida.error?.details?.alternativas) &&
      repetida.error.details.alternativas.length > 0,
    repetida.error?.details,
  );

  paso('9. Validación de la entrada');
  const enElPasado = await llamarFuncion(
    'provisionWedding',
    { ...ALTA, slug: `${SLUG}-x`, weddingDate: '2020-01-01' },
    jefe.idToken,
  );
  comprobar('rechaza una boda en el pasado', !enElPasado.ok);
  comprobar(
    'y dice qué campo está mal',
    enElPasado.error?.details?.motivos?.some((m) => m.campo === 'fecha'),
    enElPasado.error?.details,
  );

  console.log(
    fallos === 0
      ? `\n${VERDE}Todo en verde.${FIN} La boda de prueba es ${slug} (${weddingId}).\n` +
          `Míralas en la consola del emulador: http://127.0.0.1:4000/firestore\n`
      : `\n${ROJO}${fallos} comprobaciones han fallado.${FIN}\n`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\n${ROJO}${error.message}${FIN}\n`);
  process.exit(1);
});
