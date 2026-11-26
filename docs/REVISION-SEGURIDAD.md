# Revisión de seguridad (S1.4)

> Recopilación, **no auditoría externa**: reúne lo que ya está en el código, dónde está y qué test
> lo vigila, y deja explícito lo que falta. Se hizo leyendo el repositorio el 2026-11-25. Lo que
> pone «sin comprobar en producción» solo se puede verificar con el proyecto de producción
> desplegado (`RE.7`).

## 1. Transporte y navegador

| Qué                                                         | Estado                                                                                                                                                                  | Dónde         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| HTTPS en todo el dominio y los subdominios                  | Lo da Vercel con el wildcard; HSTS en cabecera                                                                                                                          | `vercel.json` |
| `X-Content-Type-Options: nosniff`                           | Hecho                                                                                                                                                                   | `vercel.json` |
| `X-Frame-Options: DENY` (anti-clickjacking)                 | Hecho                                                                                                                                                                   | `vercel.json` |
| `Referrer-Policy`, `Permissions-Policy`                     | Hecho                                                                                                                                                                   | `vercel.json` |
| `Cross-Origin-Opener-Policy: same-origin-allow-popups`      | Hecho (sin ella el acceso con Google se cuelga)                                                                                                                         | `vercel.json` |
| Caché: `index.html` sin caché, ficheros con hash inmutables | Hecho                                                                                                                                                                   | `vercel.json` |
| **Content-Security-Policy**                                 | **Falta.** Plan: primero `Content-Security-Policy-Report-Only`, mirar qué rompe (Firebase, Google Fonts de la HOME, teselas del mapa, Storage) y solo entonces exigirla | —             |

## 2. Autenticación y sesiones

- **Pareja y superadmin**: Firebase Auth. El rol y el `weddingId` viajan en **custom claims** del
  token; el `weddingId` nunca sale de un campo del cliente ni de la URL (regla de oro 1).
- **Superadmin**: toda función del panel pasa por `exigirSuperadmin` (`functions/src/infra/permisos.ts`).
- **Invitados**: `guestLogin` con App Check, límite de intentos y respuestas genéricas que no
  distinguen «no existe» de «no coincide» (regla de oro 3). Dos niveles de sesión (`enlace` y
  `verificado`); toda función del invitado exige `verificado`, y `verificacion.spec.ts` lo vigila.
- **App Check**: `EXIGIR_APP_CHECK = true` en todas las funciones callable (`functions/src/firebase.ts`).
  Falta, ya en producción, **activarlo en modo exigente en la consola** tras comprobar que nada
  legítimo falla (paso 7 de `PUESTA-EN-MARCHA.md`, Bloque 8).
- **Recuperación**: el superadmin genera enlaces de restablecimiento; no se envían ni se guardan.
- **Registro de accesos** de la pareja (IP, agente) y **`auditLog`** de toda escritura del
  superadmin (alta, cobros, proveedores, liquidaciones, HOME…), visible en la ficha de la boda.

## 3. Aislamiento entre bodas y datos sensibles

- Una sola base multi-tenant; el aislamiento lo dan **las reglas** (`firestore.rules`,
  `storage.rules`) y lo comprueba la batería `tests/rules/*.spec.ts` (requisito de release; corre
  en el CI porque necesita emulador).
- `guests` y `photos`: cerradas a lectura directa; todo por Cloud Function (regla de oro 2).
- Quiz corregido en servidor (4). `giftsReceived` no sale nunca de la sesión de la pareja (7).
- La pareja **no escribe campos de sistema** (`plan`, `status`, `slug`, `ownerUids`, contadores…) (6).
- Contabilidad (`payments`), proveedores comercializadores (`partners`) y `reminderMarks`:
  **solo lectura del superadmin, escritura solo desde funciones**, con test de aislamiento
  (`tests/rules/contabilidad.spec.ts`).
- Una boda en cuarentena se comporta como inexistente (no confirma que existió).
- **Datos personales**: las bodas de prueba llevan invitados inventados; producción debe vivir en su
  proyecto propio (`RE.7`) antes de que haya datos reales (RGPD, REQUISITOS §9.4).

## 4. Contenido que ve el público

- **Todo HTML del editor se sanea en servidor** (`functions/src/dominio/html.ts`, sobre
  `sanitize-html`, regla de oro 5), incluido el de la HOME en `saveHome`. Lo vigila `editor-rico.spec.ts`.
- Los enlaces de la HOME y de las secciones solo admiten `https`, `mailto`, `tel`, anclas y rutas.
- Storage: la HOME (`platform/home/`) solo la escribe el superadmin; las rutas de cada boda, solo su
  pareja; lo demás, cerrado (`match /{allPaths=**}`).

## 5. Dinero

- No hay pasarela (D-25): no se guardan datos de tarjeta en ningún sitio.
- Los importes se manejan en **céntimos enteros** y se validan en servidor; la liquidación a un
  proveedor es **todo o nada** y queda auditada.
- Nada de esto lo puede escribir el navegador, ni siquiera el superadmin (reglas `write: if false`).

## 6. Cadena de suministro y despliegue

- Dependencias fijadas por `package-lock.json`; `functions/` es un paquete aparte con el suyo.
- El CI (`.github/workflows/ci.yml`) corre lint, formato, tests de unidad, tests de funciones y la
  batería de reglas. **Falta** un `npm audit` / Dependabot: ver abajo.
- Secretos: no se commitean (`environment*.ts` con credenciales, claves de servicio).

## 7. Lo que falta, por orden

1. **CSP** en modo `Report-Only`, luego exigente (`vercel.json`). _Quién: C, con tu prueba en navegador._
2. **App Check exigente** en la consola de producción. _G._
3. **Dependabot** y `npm audit` en el CI (aviso, no bloqueo). _C, 10 minutos._
4. **Alerta de presupuesto** en Firebase y **copia diaria de Firestore** (`B-A8`). _G._
5. **Prueba de aislamiento real** contra producción con dos bodas de prueba y una sesión de cada
   rol (lo que el emulador no puede demostrar). _G + C._
6. **Revisión externa** antes de la primera venta con datos reales, si el presupuesto lo permite.
