#!/usr/bin/env node
/**
 * Concede o retira el claim `superadmin` a una cuenta del proyecto real.
 *
 * Este claim es la llave de todo: quien lo tiene puede dar de alta bodas y leer
 * los datos de cualquiera de ellas —nombres, teléfonos y alergias de cientos de
 * invitados—. Por eso **no se concede desde ninguna pantalla del producto**:
 * ninguna ruta de la aplicación lo otorga, y esta es la única forma de darlo.
 * Ver REQUISITOS §3.2.
 *
 *   node functions/tools/dar-superadmin.mjs gabriel@ejemplo.com
 *   node functions/tools/dar-superadmin.mjs gabriel@ejemplo.com --crear
 *   node functions/tools/dar-superadmin.mjs gabriel@ejemplo.com --quitar
 *
 * Con `--crear`, si la cuenta no existe la crea y devuelve un enlace para que
 * pongas tu contraseña. Nadie teclea una contraseña en la terminal: acabaría en
 * el historial del shell, que es un fichero de texto plano que nadie recuerda
 * limpiar.
 *
 * Hace falta una **clave de cuenta de servicio** del proyecto: consola de
 * Firebase → Configuración → Cuentas de servicio → Generar nueva clave privada.
 *
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\ruta\fuera\del\repo\clave.json   (Windows)
 *   export GOOGLE_APPLICATION_CREDENTIALS=/ruta/fuera/del/repo/clave.json  (macOS y Linux)
 *
 * Esa clave es la llave maestra del proyecto entero: no caduca, no pide segundo
 * factor y no distingue producción de pruebas. **Guárdala fuera del repositorio
 * —que además es público— y bórrala cuando termines.** Este script se niega a
 * arrancar si la encuentra dentro del repositorio, que es el despiste que
 * acaba publicándola.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const RAIZ_REPO = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));

function abortar(mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

const email = process.argv[2];
const quitar = process.argv.includes('--quitar');
const crear = process.argv.includes('--crear');

if (!email || email.startsWith('--')) {
  abortar(
    'Uso: node functions/tools/dar-superadmin.mjs <email> [--crear] [--quitar]\n\n' +
      'Concede el claim de superadmin a esa cuenta en el proyecto real.\n' +
      '--crear  la crea si no existe y devuelve un enlace para poner contraseña.',
  );
}

// const rutaClave = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const rutaClave = 'C:\\Users\\gabra\\Downloads\\nupcialis-2220d-firebase-adminsdk-fbsvc-83f64ebba0.json';
if (!rutaClave) {
  abortar(
    'Falta GOOGLE_APPLICATION_CREDENTIALS.\n\n' +
      'Descarga una clave de cuenta de servicio desde la consola de Firebase\n' +
      '(Configuración → Cuentas de servicio → Generar nueva clave privada),\n' +
      'guárdala FUERA de este repositorio y apunta la variable a ella.',
  );
}

const claveAbsoluta = resolve(rutaClave);
if (!existsSync(claveAbsoluta)) {
  abortar(`No existe el fichero de clave: ${claveAbsoluta}`);
}

// La comprobación que de verdad importa. Una clave de cuenta de servicio dentro
// de un repositorio público es el fallo de seguridad más caro y más fácil de
// cometer de todo este proyecto: basta un `git add .` distraído.
if (claveAbsoluta.startsWith(RAIZ_REPO)) {
  abortar(
    `La clave está dentro del repositorio:\n  ${claveAbsoluta}\n\n` +
      'Este repositorio es PÚBLICO. Muévela fuera antes de seguir: un `git add .`\n' +
      'distraído la publica, y esa clave abre el proyecto entero sin caducidad\n' +
      'ni segundo factor.',
  );
}

const credencial = JSON.parse(readFileSync(claveAbsoluta, 'utf8'));
initializeApp({ credential: cert(credencial) });

const auth = getAuth();

let usuario = await auth.getUserByEmail(email).catch(() => null);

if (!usuario) {
  if (!crear) {
    abortar(
      `No hay ninguna cuenta con el email ${email} en el proyecto ${credencial.project_id}.\n\n` +
        'Dos caminos:\n\n' +
        '  a) Repite con --crear y te devuelvo un enlace para poner la contraseña.\n' +
        '  b) Levanta la app con "npm run start:real", entra en\n' +
        '     localhost:4200/superadmin/acceso y pulsa "Entrar con Google".\n' +
        '     Eso crea la cuenta; luego vuelve a ejecutar esto.',
    );
  }

  // Sin contraseña conocida por nadie, ni por este script. La cuenta se abre
  // con el enlace que se imprime al final, igual que hace `provisionWedding`
  // con las cuentas de la pareja.
  usuario = await auth.createUser({
    email,
    emailVerified: false,
    password: `${randomUUID()}${randomUUID()}`,
  });
  console.log(`\nCuenta creada: ${email}`);
}

// `setCustomUserClaims` reemplaza el objeto entero, así que lo que ya tuviera
// —el weddingId y el rol de una boda, si además es de una pareja— se conserva
// a mano. Perderlo dejaría a esa persona fuera de su propio panel.
const claims = { ...(usuario.customClaims ?? {}) };
if (quitar) delete claims.superadmin;
else claims.superadmin = true;

await auth.setCustomUserClaims(usuario.uid, claims);

console.log(
  `\n${quitar ? 'Retirado' : 'Concedido'} el superadmin a ${email} (${usuario.uid})\n` +
    `en el proyecto ${credencial.project_id}.`,
);

if (crear) {
  const enlace = await auth.generatePasswordResetLink(email).catch(() => null);

  console.log(
    enlace
      ? `\nAbre esto para poner tu contraseña:\n\n${enlace}\n`
      : '\nNo se pudo generar el enlace de contraseña. Entra con Google, o usa\n' +
          '«he olvidado mi contraseña» desde la pantalla de acceso.\n',
  );
}

console.log(
  'El claim viaja dentro del token, que dura una hora: cierra sesión y vuelve\n' +
    'a entrar para que haga efecto.\n\n' +
    'Y ahora borra la clave de cuenta de servicio.\n',
);
