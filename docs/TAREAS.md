# Nupcialis — Tareas

Lista viva. Se amplía en cada sesión de trabajo.

**Convención:** `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[!]` bloqueada
(indicar por qué). Las tareas bloqueadas por una decisión abierta llevan su ID de
`PENDIENTES.md`.

**Fase actual: puesta en marcha.** Las tareas de infraestructura previas a F0
están en `PUESTA-EN-MARCHA.md`: cuentas, dominio, Firebase, hosting y spikes.
F0.1 se puede empezar en paralelo, solo necesita el repositorio.

**Fase de desarrollo: F0 — Fundaciones**
**Progreso F0: 12 / 46**

---

## F0.1 · Proyecto y entornos

- [x] `F0.1.1` Proyecto Angular 22.1.7: enrutado, SCSS, estricto, **zoneless**, Vitest. Compila en 59,6 kB comprimidos
- [x] `F0.1.2` Prettier, ESLint (angular-eslint 22) con regla que prohíbe importar `firebase/*` fuera de `core/firebase`, husky y lint-staged
- [ ] `F0.1.3` Crear los tres proyectos de Firebase (`dev`, `staging`, `prod`) en región europea
- [x] `F0.1.4` `src/environments` con los tres entornos y `fileReplacements` en angular.json. Valores de Firebase pendientes de crear los proyectos
- [x] `F0.1.5` Capa `core/firebase` sobre el SDK modular v12, repartida por rutas (D-17, D-18)
- [ ] `F0.1.6` Levantar emuladores de Firestore, Auth, Functions y Storage
- [x] `F0.1.7` Estructura de carpetas con READMEs de intención en core, design-system, features y tests/rules
- [x] `F0.1.8` i18n en runtime con Transloco y `public/i18n/es.json`. Descartado el i18n nativo: compila un bundle por idioma
- [x] `F0.1.9` CI en GitHub Actions: lint, formato, tests unitarios, build de producción y batería de reglas contra el emulador, en dos jobs
- [x] `F0.1.10` Budgets en angular.json a 600 kB de aviso y 800 kB de error en bruto. Estado actual: 76,3 kB comprimidos

## F0.2 · Sistema visual

> `F0.2.1` está bloqueada por **D-12** (familia de iconos base).

- [x] `F0.2.1` Familia de iconos base: **Phosphor** (MIT), elegida con el spike S-2
- [ ] `F0.2.2` Tokens de la paleta semántica fija del panel
- [ ] `F0.2.3` Estructura de la paleta de marca por boda, con variables CSS por tenant
- [ ] `F0.2.4` Paleta categórica de 12-16 colores con contraste verificado en claro y oscuro
- [ ] `F0.2.5` Escala tipográfica y de espaciado
- [ ] `F0.2.6` Set curado de 80-100 iconos de Phosphor, agrupados por categoría, compilados en sprite SVG propio
- [ ] `F0.2.12` Convención de pesos como estado: `regular` inactivo, `fill` activo o seleccionado
- [ ] `F0.2.7` Componente `<sq-icon>` con búsqueda y selector para el panel
- [ ] `F0.2.8` Componentes base: botón, campo, tarjeta, chip de estado, tabla, modal, aviso, estado vacío
- [ ] `F0.2.9` Chip de estado con la regla color + icono + texto aplicada por construcción
- [ ] `F0.2.10` Catálogo del design system en `/dev/ds`, fuera de producción
- [ ] `F0.2.11` Verificación automática de contraste sobre todas las combinaciones ofrecidas

## F0.3 · Multi-tenant

- [ ] `F0.3.1` Servicio de resolución de tenant por `hostname`
- [ ] `F0.3.2` Normalización y validación de slug, con lista de reservados
- [ ] `F0.3.3` Índice `slugs/{slug}` y su lectura pública
- [ ] `F0.3.4` Servicio de contexto de boda accesible en toda la aplicación
- [ ] `F0.3.5` Fallback por ruta `nupcialis.com/<slug>` para local y plan B
- [ ] `F0.3.6` Estados `draft`, `active` y `archived` con su efecto en la web pública
- [ ] `F0.3.7` Configurar el hosting con wildcard `*.nupcialis.com` en `dev`

## F0.4 · Autenticación

- [ ] `F0.4.1` Firebase Auth con email y contraseña, y Google
- [ ] `F0.4.2` Cloud Function `setUserClaims` con Admin SDK
- [ ] `F0.4.3` Dos cuentas de owner por boda sobre `ownerUids`
- [ ] `F0.4.4` Claim `superadmin` y lista blanca de UIDs
- [ ] `F0.4.5` Guardas de ruta por rol y por tenant
- [ ] `F0.4.6` App Check en cliente, Firestore, Storage y Functions
- [ ] `F0.4.8` Endurecer cookies de sesión: sin atributo `Domain`, prefijo `__Host-`, `Secure`, `HttpOnly`, `Path=/` y validación de `Origin`
- [ ] `F0.4.7` Registro de accesos de los novios en `auditLog`

## F0.5 · Reglas de seguridad y sus tests

- [x] `F0.5.1` `firestore.rules` completo, denegando por defecto, con `guests` y `photos` cerradas
- [x] `F0.5.2` `storage.rules` con límites de tamaño y tipos MIME
- [ ] `F0.5.3` `firestore.indexes.json` con los índices previstos
- [~] `F0.5.4` Escrito: 14 colecciones × 4 casos, más el documento de la boda. **Sin ejecutar todavía**
- [~] `F0.5.5` Escrito, junto con photos, quizResults, giftsReceived y guestAccessLog. **Sin ejecutar**
- [~] `F0.5.6` Escrito. **Sin ejecutar**
- [~] `F0.5.7` Escrito, incluido el caso de colar un campo de sistema junto a uno legítimo. **Sin ejecutar**
- [~] `F0.5.8` Escrito. **Sin ejecutar**
- [x] `F0.5.9` Job `reglas` en CI, bloqueante

## F0.6 · Provisioning

- [ ] `F0.6.1` `provisionWedding` con transacción de slug y documento
- [ ] `F0.6.2` Creación o localización de cuentas y asignación de claims
- [ ] `F0.6.7` `authorizeWeddingDomain`: alta del subdominio en los dominios autorizados de Firebase Auth vía Identity Toolkit Admin API, idempotente
- [ ] `F0.6.8` Contador de dominios autorizados con aviso al superadmin al llegar a 500
- [ ] `F0.6.3` Semillas: RSVP de fábrica, quiz de ejemplo, checklist con fechas relativas, FAQ de fábrica, grupo por defecto
- [ ] `F0.6.4` Trigger `syncPublicProjection`
- [ ] `F0.6.5` Trigger `recomputeCounters`
- [ ] `F0.6.6` Log de auditoría de las acciones de superadmin

## F0.7 · Esqueletos de panel

- [ ] `F0.7.1` `panel-shell` con navegación por módulos activos
- [ ] `F0.7.2` `admin-shell` de superadmin con listado de bodas
- [ ] `F0.7.3` Formulario de alta de boda que invoca `provisionWedding`
- [ ] `F0.7.4` Vista de registro de accesos de los novios
- [ ] `F0.7.5` Resumen inicial del panel de la pareja
- [ ] `F0.7.6` Carga diferida verificada: el bundle público no arrastra código del panel

---

## Fases siguientes

Se detallarán al cerrar la fase anterior. El alcance de cada una está en
`PLAN-IMPLEMENTACION.md`.

- **F1 — Núcleo vendible:** invitados, grupos, acompañantes, modos de acceso, RSVP dinámico, web pública, WhatsApp, exportación.
- **F2 — Banquete, ubicaciones y contenidos:** mesas, mapa, timeline, FAQ, alojamientos, dress code, personas importantes.
- **F3 — Participación:** galería con audiencias, quiz, playlist, libro de firmas, regalos.
- **F4 — Gestión interna:** presupuesto, proveedores, checklist, regalos recibidos.
- **F5 — Escala comercial:** self-service con pago, WhatsApp Business, plano de finca, landing.

---

## Bloqueadas por el entorno

- [!] `F0.5.V` **Ejecutar la batería de reglas.** _Primer intento fallido: el push
  fue a una rama y el workflow solo disparaba en `main` y en pull requests, así
  que no llegó a correr. Corregido para que dispare en cualquier rama._ Los tests están escritos y pasan
  la comprobación de tipos, pero **no se han ejecutado nunca**. El emulador de
  Firestore descarga su JAR de `storage.googleapis.com`, y ese host está
  bloqueado por la política de egreso tanto en el contenedor como en la máquina
  de Gabriel. Se desbloquea solo: en el primer push, el job `reglas` del CI los
  ejecuta en GitHub Actions, que sí tiene salida libre. Hasta entonces, la
  batería es una promesa, no una garantía.

## Surgidas durante el desarrollo

Tareas que no estaban en el plan. Al cerrar cada fase se revisan y se colocan
donde toque.

_(vacío)_

---

## Registro de sesiones

| Fecha      | Qué se hizo                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-07 | Requisitos cerrados. Creados `CLAUDE.md`, `PLAN-IMPLEMENTACION.md`, `PENDIENTES.md` y `TAREAS.md`. Repositorio inicializado.                                                                                                                                                                                                          |
| 2026-09-08 | Batería de aislamiento escrita: 4 ficheros, ~90 casos entre las 14 colecciones parametrizadas y los casos sueltos. CI en GitHub Actions con job de reglas bloqueante. No he podido ejecutarla: el JAR del emulador vive en un host bloqueado por la política de egreso. La ejecuta el CI en el primer push.                           |
| 2026-09-08 | F0.1 casi cerrado: ESLint, husky, estructura, entornos, i18n en runtime, `firestore.rules` y `storage.rules`, config de emuladores y capa `core/firebase`. Build, lint y tests en verde. Hallazgo gordo: el SDK de Firebase costaba 122 kB comprimidos en el arranque; repartido por rutas el inicial baja de 189,7 a 76,3 kB (D-18). |
| 2026-09-08 | F0.1 arrancado: andamiaje Angular 22 zoneless, compila y cabe de sobra en el presupuesto. Descubierto que AngularFire no soporta Angular 22 (D-17): se usa el SDK modular directo. Node ≥ 22.22.3 y npm ≥ 11 como requisito; `firebase-tools` pasa a instalación global.                                                              |
| 2026-09-08 | Cambio de nombre a **Nupcialis** (`nupcialis.com`, libre). Cerradas D-03, D-12, D-15 y D-16. Spikes S-1, S-2 y S-3 resueltos. Dos riesgos nuevos en §11: tope no documentado de dominios autorizados y aislamiento de cookies entre subdominios.                                                                                      |
| 2026-09-07 | `PUESTA-EN-MARCHA.md`. Cloudflare Pages descartado (sin wildcard). Vercel elegido. `nupcialis.com` resulta estar registrado y aparcado: nueva decisión D-15. Riesgo detectado en los dominios autorizados de Firebase Auth: nueva decisión D-16 y spike S-1.                                                                          |
