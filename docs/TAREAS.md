# Nupcialis — Tareas

Lista viva. Se amplía en cada sesión de trabajo.

**Convención:** `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[!]` bloqueada
(indicar por qué). Las tareas bloqueadas por una decisión abierta llevan su ID de
`PENDIENTES.md`.

**Fase actual: puesta en marcha.** Las tareas de infraestructura previas a F0
están en `PUESTA-EN-MARCHA.md`: cuentas, dominio, Firebase, hosting y spikes.
F0.1 se puede empezar en paralelo, solo necesita el repositorio.

**Fase de desarrollo: F0 — Fundaciones**
**Progreso F0: 32 / 46**

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
- [x] `F0.2.2` Paleta semántica fija: confirmado, pendiente, rechazado, atención e informativo, cada una con `fg`, `bg`, `border` y `solid` en claro y oscuro, y con su icono asociado
- [!] `F0.2.3` Paleta de marca por boda — _se hace con F0.3, cuando exista el contexto de tenant del que colgar las variables_
- [x] `F0.2.4` Paleta categórica de 13 tonos equiespaciados en LCh, generados y no elegidos a ojo. ΔE mínimo 19,1 en claro y 20,0 en oscuro
- [x] `F0.2.5` Escala tipográfica fluida y espaciado en base 4, con área de pulsación mínima de 44 px
- [x] `F0.2.6` 99 iconos de Phosphor en 8 categorías, compilados en **dos** sprites: 73 para la web pública, 99 para el panel
- [x] `F0.2.12` Pesos como estado: `regular` inactivo, `fill` activo, ambos en el sprite
- [x] `F0.2.7` Componente `<np-icon>`, con nombres tipados: un icono mal escrito no compila. Falta el selector visual del panel
- [x] `F0.2.8` Componentes base: chip de estado, botón, campo con su control, tarjeta, aviso, estado vacío, diálogo, tabla y **ordenación de tablas** con comparador de español
- [x] `F0.2.9` `<np-status-chip>`: `label` es obligatorio y el icono lo decide el mapa generado desde `palette.json`. No se puede pintar un estado sin texto
- [x] `F0.2.10` Catálogo en `/dev/ds` con paleta, chips, los 99 iconos y la escala tipográfica, y conmutador de tema claro/oscuro
- [x] `F0.2.11` `tools/tokens.mjs`: 74 comprobaciones de contraste más la distancia perceptual entre categóricos. Bloqueante en CI, junto con la comprobación de que el SCSS generado está al día

## F0.3 · Multi-tenant

- [x] `F0.3.1` `resolverTenant()` puro y enchufado a la aplicación con un resolver de ruta
- [x] `F0.3.2` `normalizarSlug` y `validarSlug` con 29 casos, y 60 reservados en tres familias: superficies, infraestructura y palabras que dan pie a suplantación
- [x] `F0.3.3` Lectura de `slugs/{slug}` y de la proyección pública, tras un puerto que permite probar la lógica sin emulador
- [~] `F0.3.4` La web pública recibe el tenant resuelto por la ruta. El contexto compartido llega con el panel
- [ ] `F0.3.5` Fallback por ruta `nupcialis.com/<slug>` para local y plan B
- [x] `F0.3.5b` Semilla del emulador: cuatro bodas, una por estado, con la de cuarentena incluida para poder comprobar a mano que se comporta como inexistente
- [x] `F0.3.6` Cinco estados con su pantalla propia: publicada, no publicada, archivada, no encontrada y error
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
- [x] `F0.5.4` 14 colecciones × 4 casos, más el documento de la boda. Verde en CI
- [x] `F0.5.5` Junto con photos, quizResults, giftsReceived y guestAccessLog. Verde en CI
- [x] `F0.5.6` Verde en CI
- [x] `F0.5.7` Incluido el caso de colar un campo de sistema junto a uno legítimo. Verde en CI
- [x] `F0.5.8` Verde en CI
- [x] `F0.5.9` Job `reglas` en CI, bloqueante

## F0.6 · Provisioning

- [x] `F0.6.0` Paquete `functions/`: TypeScript propio, Vitest, bloque en `firebase.json` y job de CI
- [x] `F0.6.1` `provisionWedding` con transacción de slug y documento
- [x] `F0.6.2` Creación o localización de cuentas y asignación de claims
- [x] `F0.6.7` `authorizeWeddingDomain`: alta del subdominio en los dominios autorizados de Firebase Auth vía Identity Toolkit Admin API, idempotente
- [x] `F0.6.8` Contador de dominios autorizados con aviso al superadmin al llegar a 500
- [x] `F0.6.3` Semillas: RSVP de fábrica, quiz de ejemplo, checklist con fechas relativas, FAQ de fábrica, grupo por defecto
- [x] `F0.6.4` Trigger `syncPublicProjection`
- [x] `F0.6.5` Trigger `recomputeCounters`
- [x] `F0.6.6` Log de auditoría de las acciones de superadmin
- [x] `F0.6.9` `setUserClaims`: asignar y revocar acceso a una boda
- [~] `F0.6.V` **Verificación de extremo a extremo del alta contra el emulador.**
  Escrita en `tools/probar-alta.mjs` (`npm run probar:alta`): permisos, alta,
  semillas, proyección, los dos triggers, slug repetido y validación de
  entrada. **Ejecutada solo a medias**: en el contenedor se pudieron levantar
  Auth y Functions —y ahí pasan los pasos de permisos y validación— pero no
  Firestore, cuyo JAR vive en un host bloqueado por la política de egreso.
  Los pasos que tocan datos los tiene que correr Gabriel en su máquina.
- [ ] `F0.6.X` Alta real contra el proyecto de Firebase para comprobar el
      Identity Toolkit. **El emulador de Auth no implementa los dominios
      autorizados**, así que esta parte no se puede probar en local por
      definición: que funcione en el emulador no demuestra nada sobre ella.

## F0.7 · Esqueletos de panel

- [x] `F0.7.1` `panel-shell` con navegación por módulos activos, con la visibilidad
      de cada uno a la vista y diseñado primero para móvil
- [x] `F0.7.2` `admin-shell` de superadmin con listado de bodas, ordenable y con
      el aviso de subdominio sin autorizar pegado a la fila que lo sufre
- [x] `F0.7.3` Formulario de alta de boda que invoca `provisionWedding`, con
      validación de slug y fecha en cliente y alternativas si el slug está cogido
- [x] `F0.7.3b` **Publicar, despublicar y archivar una boda** desde el listado de
      superadmin, vía `setWeddingStatus`. Antes no existía: se daban de alta bodas
      que el producto no sabía publicar. Publicar comprueba un mínimo —nombres,
      fecha y dirección— para que no se repita la portada con un rombo y una
      inicial. Ver D-27, pendiente de validar.
- [x] `F0.7.3c` **Hora de la ceremonia en el panel de la pareja** («Datos de la
      boda»), y cuenta atrás calculada con día + hora + zona. Antes contaba hasta
      las 00:00 UTC, que en Madrid son las dos de la madrugada. Ver D-28.
- [x] `PL.7` **Secciones de la web pública**: modelo compartido, semillas, saneado
      por lista blanca en la proyección y las dos plantillas pintándolas.
- [x] `PL.7b` **Editor de secciones con vista previa en vivo** en el panel de la
      pareja: encender, apagar, reordenar y rellenar, con la plantilla real al
      lado. Pestañas en móvil, dos columnas a partir de 64rem.
- [x] `PL.6` **Selector de paleta**: catálogo cerrado de ocho paletas, cada una
      con su test de contraste WCAG AA. Cuál está elegida se deduce comparando
      los colores, no se guarda un id que pueda divergir.
- [x] `PL.8` **Foto de portada**: subida a Storage con reducción en el navegador,
      velo sobre la foto para que los nombres se lean, y borrado del fichero
      viejo **después** de apuntar al nuevo.
- [x] `PL.9` **`noindex` por defecto con interruptor** en el panel. La etiqueta
      va en el HTML servido, no la pone el arranque.
- [x] `PL.10` **Humo del panel**: las siete pantallas se montan, con datos y sin
      ellos. Ninguna se había ejecutado nunca: la guarda lo impedía.

## F1 · Invitados

- [x] `F1.1` **Lista de invitados**: dominio (normalización de nombre y teléfono,
      duplicados), `listGuests`, `upsertGuest` y `deleteGuest`, y la pantalla del
      panel con alta manual, búsqueda y resumen. Todo por función invocable: la
      colección está cerrada a lectura directa (regla 2).
- [ ] `F1.2` **Importación CSV/Excel** con previsualización, mapeo de columnas y
      duplicados por teléfono (§8.3). Sin esto, doscientos invitados se teclean
      a mano.
- [ ] `F1.3` Grupos de invitados y asignación, con aviso de los restringidos
- [ ] `F1.4` Enlace por invitado y compartir por WhatsApp
- [ ] `F1.5` Acompañantes añadidos por el invitado (`addCompanion`)
- [ ] `F1.6` Exportación a XLSX para el catering

- [ ] `PL.7c` Reordenar **arrastrando**, que es lo que pide REQUISITOS §8.1. Hoy
      son botones de subir y bajar: accesibles y buenos en móvil, pero no es lo
      acordado. Ver D-29.
- [ ] `F0.7.4` Vista de registro de accesos de los novios
- [ ] `F0.7.5` Resumen inicial del panel de la pareja
- [ ] `F0.7.6` Carga diferida verificada: el bundle público no arrastra código del panel
- [ ] `F0.7.7` **Datos de cobro en el alta de boda**: plan, importe cobrado, método
      (`bizum` o `partner_cash`), fecha y proveedor. Hace falta desde la primera
      venta; si se deja para F5 hay que rellenar a mano lo ya vendido. Ver D-25.
- [ ] `F0.7.8` Colección `partners` y su alta desde el panel, con tarifa mayorista
      por plan e interruptor `active`. Sin cuenta ni acceso para el proveedor.
- [ ] `F0.7.9` Vista de saldo por proveedor: bodas activas y pendiente de liquidar,
      con cierre de varias de una vez.

---

## Cerrar el alta contra Firebase de verdad

Antes que plantillas, paletas y resúmenes. Ver `PUESTA-EN-MARCHA.md` bloque 7.

- [x] `RE.1` Entorno para levantar la app contra el proyecto real (`npm run start:real`)
- [x] `RE.2` Script para conceder el claim de superadmin, con las protecciones de la clave
- [x] `RE.3` **Activar Blaze.** Hecho el 2026-09-16
- [ ] `RE.4` `npm run deploy:rules` y `npm run deploy:functions` — **G**
      Vuelve a hacer falta: `setWeddingStatus` es una función nueva y hasta que
      no se despliegue, los botones de publicar responden `not-found`.
- [ ] `RE.4b` **Configurar App Check en el cliente**: clave de **reCAPTCHA
      Enterprise** (de tipo web y basada en puntuación) en `appCheckSiteKey`, y
      token de depuración para `localhost`. No confundirla con el `apiKey` ni el
      `appId` de Firebase, que son otra cosa y ya están puestos. Sin esto toda
      invocable responde 401. Ver `PUESTA-EN-MARCHA.md` bloque 7 — **G**
- [ ] `RE.5` Alta real de una boda desde `/superadmin` contra el proyecto — **G**
- [ ] `RE.6` Comprobar el subdominio en Authentication → Authorized domains (cierra `F0.6.X`) — **G**
- [ ] `RE.7` Proyecto de Firebase aparte para producción, antes de la primera pareja que pague
- [ ] `RE.8` **Servir `Cross-Origin-Opener-Policy: same-origin-allow-popups` en producción**
      (`headers` de `vercel.json`). Sin esa cabecera el acceso con Google se queda
      colgado sin dar error, igual que pasaba en local.

---

## Surgido de F0.7 · Catálogo de plantillas

- [x] `PL.1` Catálogo de plantillas en código, con id, nombre, descripción y sus tipografías
- [x] `PL.2` Dos primeras plantillas: **Clásica** y **Botánica**, cada una en su propio chunk
- [x] `PL.3` La paleta de marca de la boda llega como variables CSS `--np-marca-*`
- [x] `PL.4` Solo se descarga la tipografía de la plantilla elegida
- [x] `PL.5` Selector de plantilla en el panel, con miniatura viva de cada una
- [ ] `PL.6` Selector de paleta de marca, de la paleta categórica y sin hexadecimal libre
- [ ] `PL.8` Test de aislamiento: la pareja puede escribir `theme` y sigue sin poder
      tocar los campos de sistema. El panel ya escribe ahí; la batería no lo cubre.
- [ ] `PL.7` Secciones de la portada más allá de nombres, fecha y cuenta atrás

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

_(ninguna)_

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

- [ ] **Bandeja de solicitudes y cobro manual (F5).** Cambio de regla de negocio
      del 14/09: no hay pasarela de pago (D-25) y aparecen los proveedores
      comercializadores (D-26). Trae `weddingRequests`, `createWeddingRequest`,
      `activateRequest`, `settleRequests`, el aviso por Telegram y
      `purgeOldRequests`. **No bloquea la primera venta**: con `provisionWedding`
      y el panel de F0.7 ya se puede dar de alta una boda cobrada por Bizum.
- [ ] **Reglas de aislamiento de `weddingRequests` y `partners`**, con su batería.
      Son colecciones raíz nuevas y solo el superadmin puede leerlas; la escritura,
      solo desde Cloud Function. Sin test, no se mergea.
- [ ] **Lint de `functions/` en el CI.** Hoy `ng lint` solo mira `src/**`, así que
      el paquete de funciones lo revisa únicamente el hook de pre-commit. Si
      alguien comitea con `--no-verify`, nadie más lo mira.

---

## Registro de sesiones

| Fecha      | Qué se hizo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-07 | Requisitos cerrados. Creados `CLAUDE.md`, `PLAN-IMPLEMENTACION.md`, `PENDIENTES.md` y `TAREAS.md`. Repositorio inicializado.                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-16 | Primer contacto con Firebase de verdad, y dos fallos que solo aparecen ahí. El acceso con Google se colgaba por la política de ventanas emergentes del servidor de desarrollo (`RE.8`: hay que servir esa cabecera también en producción). Y entrar sin el claim de superadmin mandaba a la raíz, que contestaba «no encontramos esta boda»: el dominio raíz se confundía con una boda inexistente, así que `nupcialis.com` habría dicho eso mismo a quien fuera a ver qué vendemos.                             |
| 2026-09-14 | Preparado el salto a Firebase de verdad, que era lo que tocaba antes que seguir con paletas: `npm run start:real` levanta la app contra el proyecto sin emuladores, y `functions/tools/dar-superadmin.mjs` concede el claim que ninguna pantalla otorga. El script se niega a arrancar si la clave de cuenta de servicio está dentro del repositorio, que es público. A partir de ahí todo depende de activar Blaze.                                                                                             | \n  | 2026-09-14 | Panel de la pareja y selector de plantilla. La navegación la dibujan los módulos activos de esa boda, no una lista fija: un módulo apagado no sale en gris con un candado, no sale. Cada entrada enseña su visibilidad, que es lo que explica por qué la web parece vacía con ocho módulos encendidos. El selector dibuja cada plantilla con sus colores y su letra de verdad, no con una captura que envejece. Arreglado además el `theme.templateId` de la semilla, que borraba la plantilla en vez de cambiarla. 118 tests. | \n  | 2026-09-14 | Catálogo de plantillas. Las dos portadas del boceto no eran dos direcciones a elegir: son las dos primeras **plantillas** del catálogo, que es lo que `theme.templateId` dice desde el primer día. Cada una viaja en su propio chunk —1,5 y 1,3 kB comprimidos— y solo se descarga la de esa boda, tipografías incluidas. La paleta de la pareja entra como variables CSS con reserva por plantilla, así que una boda sin paleta elegida se ve bien igual. 109 tests. | \n  | 2026-09-14 | F0.7.2 y F0.7.3: el superadmin deja de ser un `<h1>`. Listado de bodas ordenable y alta por formulario, así que dar de alta una boda ya no pasa por un script. El listado ordena por urgencia, no por fecha de alta: primero las bodas con el subdominio sin autorizar, con su botón de reintentar en la propia fila. Los enlaces de acceso se enseñan una sola vez y con su advertencia. 95 tests. | \n  | 2026-09-14 | Prueba de extremo a extremo del alta (`npm run probar:alta`) y semilla reescrita para que **llame a `provisionWedding`** en vez de escribir documentos a mano: mantener aquí una copia del modelo ya se había quedado obsoleta. Cazado un desajuste real que F0.6 había introducido: la proyección escribe `coupleNames` como objeto y la web pública lo leía como cadena, así que la portada habría salido sin nombres. De paso, la conjunción "y" pasa a los ficheros de traducción, donde debía estar. App Check deja de exigirse dentro del emulador. |
| 2026-09-14 | Cambio de regla de negocio: sin pasarela de pago (D-25) y proveedores que comercializan y liquidan aparte (D-26). Lo de fondo no es el medio de cobro, es que **el estado del servicio y el del cobro pasan a ser dos ejes independientes**: una boda activa con el cobro pendiente es un estado normal del negocio, no una incidencia. Reescritos §4, §5.1, §7, §10 y §11 de REQUISITOS, y la fase 5 del plan. No se toca código: F0 ya asumía alta manual por superadmin.                                      |
| 2026-09-11 | F0.6 entera: paquete `functions/`, `provisionWedding` con transacción y semillas, `setUserClaims`, `authorizeWeddingDomain`, los dos triggers y el log de auditoría. 86 tests de dominio. Cuatro decisiones de negocio que solo estaban en el chat pasan a D-20…D-23, y cinco que he tomado yo al implementar quedan en D-24 esperando validación. Arreglado `firebase.json` (faltaba el bloque `functions`, que era lo que rompía `npm run emulators`) y `.firebaserc`, que apuntaba a un proyecto inexistente. |
| 2026-09-09 | Semilla del emulador y ciclo de trabajo en local documentado. `nupcialis.com` comprado en Hostalia.                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-08 | Tenant resuelto de punta a punta, con 51 tests. Nueva decisión D-19: los adaptadores de datos van en ficheros `*.firestore.ts`, porque meterlos todos en `core/firebase` no escala.                                                                                                                                                                                                                                                                                                                              |
| 2026-09-08 | Arrancado F0.3: slug y resolución de tenant como funciones puras, 43 tests en verde. Los tests cazaron una rama muerta en mi código (la comprobación de punycode, inalcanzable) y una suposición falsa en mi propio test.                                                                                                                                                                                                                                                                                        |
| 2026-09-08 | Tablas ordenables como directiva, sin componente de tabla. Comparador con reglas de español: sin `localeCompare('es')`, "Álvarez" se va detrás de "Zurita". Los nombres tipados de iconos cazaron dos que faltaban en el set.                                                                                                                                                                                                                                                                                    |
| 2026-09-08 | Componentes base terminados. F0.2 cerrado salvo la paleta de marca por boda, que espera al contexto de tenant. `<np-field>` usaba `::ng-deep`, obsoleto y capaz de escaparse a todo el árbol; cambiado por la directiva `npInput`.                                                                                                                                                                                                                                                                               |
| 2026-09-08 | Escala tipográfica y de espaciado, `<np-status-chip>` y catálogo del sistema visual en `/dev/ds`. El mapa de estado a icono se genera desde `palette.json`, así que ningún módulo puede decidir que en su pantalla "confirmado" es otro icono.                                                                                                                                                                                                                                                                   |
| 2026-09-08 | Sprites de iconos con nombres tipados y `<np-icon>`. Dos sprites, público y panel, con la misma disciplina de reparto que los chunks de JS. Añadido `.nvmrc`.                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-08 | Arrancado F0.2. Paleta en `palette.json` como fuente única, con generador y verificador de contraste. Primer intento de regla para los categóricos era erróneo —pedía separación de luminancia, imposible con 13 tonos— y se cambió por distancia perceptual ΔE en CIELAB. Los colores se generan equiespaciados en LCh, no a ojo.                                                                                                                                                                               |
| 2026-09-08 | **CI run #1: el job `reglas` pasa.** Los ~90 casos de aislamiento verdes contra el emulador real. El job `calidad` falló solo por formato: 13 ficheros anteriores a la instalación de husky nunca habían pasado por Prettier. Corregido.                                                                                                                                                                                                                                                                         |
| 2026-09-08 | Batería de aislamiento escrita: 4 ficheros, ~90 casos entre las 14 colecciones parametrizadas y los casos sueltos. CI en GitHub Actions con job de reglas bloqueante. No he podido ejecutarla: el JAR del emulador vive en un host bloqueado por la política de egreso. La ejecuta el CI en el primer push.                                                                                                                                                                                                      |
| 2026-09-08 | F0.1 casi cerrado: ESLint, husky, estructura, entornos, i18n en runtime, `firestore.rules` y `storage.rules`, config de emuladores y capa `core/firebase`. Build, lint y tests en verde. Hallazgo gordo: el SDK de Firebase costaba 122 kB comprimidos en el arranque; repartido por rutas el inicial baja de 189,7 a 76,3 kB (D-18).                                                                                                                                                                            |
| 2026-09-08 | F0.1 arrancado: andamiaje Angular 22 zoneless, compila y cabe de sobra en el presupuesto. Descubierto que AngularFire no soporta Angular 22 (D-17): se usa el SDK modular directo. Node ≥ 22.22.3 y npm ≥ 11 como requisito; `firebase-tools` pasa a instalación global.                                                                                                                                                                                                                                         |
| 2026-09-08 | Cambio de nombre a **Nupcialis** (`nupcialis.com`, libre). Cerradas D-03, D-12, D-15 y D-16. Spikes S-1, S-2 y S-3 resueltos. Dos riesgos nuevos en §11: tope no documentado de dominios autorizados y aislamiento de cookies entre subdominios.                                                                                                                                                                                                                                                                 |
| 2026-09-07 | `PUESTA-EN-MARCHA.md`. Cloudflare Pages descartado (sin wildcard). Vercel elegido. `nupcialis.com` resulta estar registrado y aparcado: nueva decisión D-15. Riesgo detectado en los dominios autorizados de Firebase Auth: nueva decisión D-16 y spike S-1.                                                                                                                                                                                                                                                     |
