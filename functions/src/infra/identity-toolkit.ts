/**
 * Adaptador del Identity Toolkit Admin API v2.
 *
 * El Admin SDK no expone la lista de dominios autorizados de Auth, así que este
 * paso se hace a mano contra el API REST, con el token de la cuenta de servicio
 * del propio runtime de Functions.
 *
 * Toda la lógica de decisión —si hay que escribir o no, qué lista queda— vive
 * en `dominio/dominios.ts` y se prueba sin red. Aquí solo está la fontanería.
 */

import { avisoDeCupo, conDominio, sinDominio, type CambioDominios } from '../dominio/dominios';
import { app, projectId } from '../firebase';

const BASE = 'https://identitytoolkit.googleapis.com/admin/v2';

/** El emulador de Auth no tiene este API: no hay dominios que autorizar. */
export function hayEmuladorDeAuth(): boolean {
  return Boolean(process.env['FIREBASE_AUTH_EMULATOR_HOST']);
}

async function token(): Promise<string> {
  const credencial = app().options.credential;
  if (!credencial) throw new Error('La app de Admin no tiene credencial.');
  const { access_token } = await credencial.getAccessToken();
  return access_token;
}

async function pedir(ruta: string, init: RequestInit): Promise<Record<string, unknown>> {
  const respuesta = await fetch(`${BASE}/projects/${projectId()}${ruta}`, {
    ...init,
    headers: {
      authorization: `Bearer ${await token()}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!respuesta.ok) {
    // El cuerpo del error trae el motivo real (permiso, cuota, dominio
    // inválido) y sin él este fallo es imposible de diagnosticar a posteriori.
    const cuerpo = await respuesta.text();
    throw new Error(`Identity Toolkit ${respuesta.status}: ${cuerpo.slice(0, 500)}`);
  }

  return (await respuesta.json()) as Record<string, unknown>;
}

export async function dominiosAutorizados(): Promise<readonly string[]> {
  const config = await pedir('/config', { method: 'GET' });
  const dominios = config['authorizedDomains'];
  return Array.isArray(dominios) ? dominios.filter((d): d is string => typeof d === 'string') : [];
}

async function escribirDominios(dominios: readonly string[]): Promise<void> {
  await pedir('/config?updateMask=authorizedDomains', {
    method: 'PATCH',
    body: JSON.stringify({ authorizedDomains: dominios }),
  });
}

export interface ResultadoDominio {
  readonly cambiado: boolean;
  readonly total: number;
  /** Aviso de cupo para el superadmin, o `null` si aún sobra sitio. */
  readonly aviso: string | null;
}

async function aplicar(
  dominio: string,
  transformar: (actuales: readonly string[], dominio: string) => CambioDominios,
): Promise<ResultadoDominio> {
  if (hayEmuladorDeAuth()) return { cambiado: false, total: 0, aviso: null };

  const actuales = await dominiosAutorizados();
  const cambio = transformar(actuales, dominio);
  const total = cambio.dominios.length;

  if (!cambio.cambia) return { cambiado: false, total, aviso: avisoDeCupo(total) };

  await escribirDominios(cambio.dominios);
  return { cambiado: true, total, aviso: avisoDeCupo(total) };
}

/**
 * Autoriza `<slug>.nupcialis.com` en Firebase Auth.
 *
 * Sin esto, el acceso con Google de esa boda devuelve `auth/unauthorized-domain`
 * y nadie se entera hasta que la pareja intenta entrar. Es idempotente: si el
 * dominio ya estaba, no escribe.
 */
export function autorizarDominio(dominio: string): Promise<ResultadoDominio> {
  return aplicar(dominio, conDominio);
}

/** Retira el dominio de una boda archivada. */
export function desautorizarDominio(dominio: string): Promise<ResultadoDominio> {
  return aplicar(dominio, sinDominio);
}
