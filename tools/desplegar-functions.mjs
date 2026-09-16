#!/usr/bin/env node
/**
 * Despliega las Cloud Functions con un margen de arranque decente.
 *
 * **Por qué existe este envoltorio.** Antes de desplegar, la CLI de Firebase
 * carga `functions/lib/index.js` en un proceso aparte para descubrir qué
 * funciones hay. Le da **10 segundos** por defecto, y si no responde aborta con
 * un mensaje que no dice nada de lo que pasa de verdad:
 *
 *   Error: User code failed to load. Cannot determine backend specification.
 *   Timeout after 10000.
 *
 * No es que el código falle. Cargar `firebase-admin` y `firebase-functions` son
 * cientos de ficheros, y justo antes la CLI ha hecho un `npm ci` que los ha
 * dejado todos fríos: en Windows, con el antivirus escaneando cada uno la
 * primera vez que se lee, pasar de diez segundos es lo normal. En Linux tarda
 * menos de un segundo.
 *
 * La variable `FUNCTIONS_DISCOVERY_TIMEOUT` (en segundos) es la solución que
 * documenta Firebase. Se pone aquí y no a mano en la terminal para que el
 * siguiente que despliegue no pierda la tarde que perdimos nosotros.
 *
 * Si aun con 120 segundos falla, el problema **sí** está en el código: algo en
 * el ámbito global de alguna función hace trabajo pesado o de red al cargarse.
 * Eso se arregla moviéndolo a `onInit()`, no subiendo más este número.
 * Ver https://firebase.google.com/docs/functions/tips
 */

import { spawn } from 'node:child_process';

const SEGUNDOS = process.env.FUNCTIONS_DISCOVERY_TIMEOUT ?? '120';

const hijo = spawn('firebase', ['deploy', '--only', 'functions', ...process.argv.slice(2)], {
  stdio: 'inherit',
  // En Windows `firebase` es un .cmd y no se puede ejecutar sin shell.
  shell: true,
  env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: SEGUNDOS },
});

hijo.on('exit', (codigo) => process.exit(codigo ?? 1));
