/**
 * Utilidades compartidas para hablar con los emuladores de Firebase.
 *
 * Contra las API REST, sin `firebase-admin`: ese paquete arrastra medio Google
 * Cloud SDK para escribir seis documentos, y aquí solo hacemos de cliente.
 *
 * Todo lo de este fichero apunta **siempre** a los emuladores. Si alguna vez
 * alguien lo apunta a producción, `comprobarEmuladores` falla antes de escribir
 * nada: son puertos de `127.0.0.1`, no hay forma de que respondan desde fuera.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const { projects } = JSON.parse(readFileSync(join(RAIZ, '.firebaserc'), 'utf8'));
export const PROYECTO = projects.default;

export const HOST_FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
export const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
export const HOST_FUNCIONES = process.env.FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5001';
export const REGION = 'europe-west1';

const BASE_FIRESTORE = `http://${HOST_FIRESTORE}/v1/projects/${PROYECTO}/databases/(default)/documents`;
const BASE_AUTH = `http://${HOST_AUTH}/identitytoolkit.googleapis.com/v1`;

/** El emulador de Auth acepta cualquier clave: no valida credenciales de API. */
const CLAVE_FALSA = 'emulador';

// --- comprobación de que están levantados ----------------------------------

async function responde(host) {
  try {
    await fetch(`http://${host}/`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Aborta con un mensaje útil si falta algún emulador.
 *
 * El error de "connection refused" a secas hace perder diez minutos. Aquí se
 * dice cuál falta y cómo se arranca.
 */
export async function comprobarEmuladores(cuales = ['firestore', 'auth', 'functions']) {
  const hosts = { firestore: HOST_FIRESTORE, auth: HOST_AUTH, functions: HOST_FUNCIONES };
  const caidos = [];

  for (const cual of cuales) {
    if (!(await responde(hosts[cual]))) caidos.push(`${cual} (${hosts[cual]})`);
  }

  if (caidos.length > 0) {
    console.error(
      `\nNo responden estos emuladores: ${caidos.join(', ')}.\n\n` +
        `Arráncalos en otra terminal con:\n\n    npm run emulators\n\n` +
        `Si el de funciones es el que falta, lo más probable es que no esté\n` +
        `compilado: npm run functions:install && npm run functions:build\n`,
    );
    process.exit(1);
  }
}

// --- Firestore --------------------------------------------------------------

export function valor(v) {
  if (v === null || v === undefined) return { nullValue: null };
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

export function campos(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, valor(v)]));
}

/** Lo contrario: del formato de Firestore a algo que se pueda imprimir. */
export function plano(valorFirestore) {
  if (valorFirestore === undefined) return undefined;
  const [tipo, v] = Object.entries(valorFirestore)[0] ?? [];
  switch (tipo) {
    case 'nullValue':
      return null;
    case 'integerValue':
      return Number(v);
    case 'doubleValue':
      return v;
    case 'arrayValue':
      return (v.values ?? []).map(plano);
    case 'mapValue':
      return Object.fromEntries(Object.entries(v.fields ?? {}).map(([k, x]) => [k, plano(x)]));
    default:
      return v;
  }
}

/**
 * Escribe o actualiza un documento, saltándose las reglas: el emulador acepta
 * `Bearer owner` como administrador.
 *
 * **El `updateMask` no es opcional.** Un PATCH de la API REST de Firestore sin
 * máscara **reemplaza el documento entero** por los campos enviados, no los
 * fusiona. Cambiar el `status` de una boda sin máscara le borra los nombres, la
 * fecha y los módulos, y el trigger de la proyección publica después una boda
 * vacía. Pasó: la portada salía con un rombo y una "y" suelta.
 */
export async function escribirDoc(ruta, datos) {
  const mascara = Object.keys(datos)
    .map((campo) => `updateMask.fieldPaths=${encodeURIComponent(campo)}`)
    .join('&');

  const res = await fetch(`${BASE_FIRESTORE}/${ruta}?${mascara}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: campos(datos) }),
  });
  if (!res.ok) throw new Error(`${res.status} al escribir ${ruta}: ${await res.text()}`);
  return res.json();
}

export async function leerDoc(ruta) {
  const res = await fetch(`${BASE_FIRESTORE}/${ruta}`, {
    headers: { Authorization: 'Bearer owner' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} al leer ${ruta}: ${await res.text()}`);
  const cuerpo = await res.json();
  return Object.fromEntries(Object.entries(cuerpo.fields ?? {}).map(([k, v]) => [k, plano(v)]));
}

export async function contarColeccion(ruta) {
  const res = await fetch(`${BASE_FIRESTORE}/${ruta}?pageSize=300`, {
    headers: { Authorization: 'Bearer owner' },
  });
  if (!res.ok) throw new Error(`${res.status} al listar ${ruta}: ${await res.text()}`);
  const cuerpo = await res.json();
  return (cuerpo.documents ?? []).length;
}

// --- Auth -------------------------------------------------------------------

async function pedirAuth(ruta, cuerpo, conAdmin = false) {
  const res = await fetch(`${BASE_AUTH}/${ruta}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(conAdmin ? { Authorization: 'Bearer owner' } : {}),
    },
    body: JSON.stringify(cuerpo),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} en ${ruta}: ${JSON.stringify(json)}`);
  return json;
}

/**
 * Crea (o reutiliza) una cuenta en el emulador de Auth y le pone claims.
 *
 * Devuelve un **token recién emitido**, no el de la creación: los custom claims
 * viajan dentro del token, así que uno emitido antes de asignarlos no los lleva
 * y la función respondería `permission-denied` sin que se entienda por qué.
 */
export async function cuentaConClaims(email, password, claims) {
  let localId;
  try {
    ({ localId } = await pedirAuth(`accounts:signUp?key=${CLAVE_FALSA}`, {
      email,
      password,
      returnSecureToken: true,
    }));
  } catch (error) {
    if (!String(error.message).includes('EMAIL_EXISTS')) throw error;
    ({ localId } = await pedirAuth(`accounts:signInWithPassword?key=${CLAVE_FALSA}`, {
      email,
      password,
      returnSecureToken: true,
    }));
  }

  await pedirAuth(
    `projects/${PROYECTO}/accounts:update`,
    { localId, customAttributes: JSON.stringify(claims) },
    true,
  );

  const { idToken } = await pedirAuth(`accounts:signInWithPassword?key=${CLAVE_FALSA}`, {
    email,
    password,
    returnSecureToken: true,
  });

  return { uid: localId, idToken };
}

// --- Cloud Functions --------------------------------------------------------

/**
 * Invoca una función `onCall` del emulador.
 *
 * Devuelve `{ ok: true, resultado }` o `{ ok: false, error }` en vez de lanzar:
 * en estas pruebas el fallo suele ser el resultado que se quiere comprobar
 * —un slug ocupado, un permiso denegado— y no una excepción.
 */
export async function llamarFuncion(nombre, datos, idToken) {
  const res = await fetch(`http://${HOST_FUNCIONES}/${PROYECTO}/${REGION}/${nombre}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data: datos }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    return { ok: false, error: json.error ?? { message: `HTTP ${res.status}` } };
  }
  return { ok: true, resultado: json.result };
}

/** Los triggers son asíncronos: hay que darles un momento. */
export async function esperarA(descripcion, comprobar, intentos = 25, msEntre = 400) {
  for (let i = 0; i < intentos; i++) {
    const valor = await comprobar();
    if (valor) return valor;
    await new Promise((r) => setTimeout(r, msEntre));
  }
  throw new Error(
    `Se agotó la espera de: ${descripcion}.\n` +
      `Si el emulador de funciones no arrancó, los triggers no corren y esto ` +
      `nunca se cumple. Revisa la salida de "npm run emulators".`,
  );
}
