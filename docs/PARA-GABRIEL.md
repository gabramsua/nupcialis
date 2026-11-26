# Lo que no puedo hacer yo

Escrito el 2026-11-13, al día el 2026-11-16. **Esta lista es lo que bloquea avanzar**, y está en un
fichero aparte porque hasta ahora vivía repartida por `TAREAS.md` y se perdía
entre lo hecho.

Tres clases de cosas: las que **solo se pueden hacer desde tu ordenador o con
tus credenciales**, las que **necesitan tus ojos** y las **decisiones** que no
me corresponden. Debajo de cada una está por qué no puedo yo, para que no haya
que preguntarlo.

---

**LO PRIMERO: el despliegue a producción (D-71).** Sigue **`docs/DESPLIEGUE.md`** de arriba abajo:
Vercel Pro, el dominio y el wildcard, el Firebase de producción, desplegar reglas y funciones,
hacerte superadmin y la prueba de humo. **Empieza por el DNS** (es lo que más espera). Cuando
tengas el Firebase de producción, **pásame el ID del proyecto, el `firebaseConfig` y la clave de
sitio de App Check** (no son secretos) y te devuelvo el parche con `environment.prod.ts` rellenado.
Antes de nada, mira **tu zona DNS en Hostalia** y dime si el correo `hola@nupcialis.com` vive ahí:
decide qué opción de wildcard te conviene.

---

## 1. Antes de arrancar (cinco minutos, y bloquea todo lo demás)

```bash
npm install                 # jodit, ngx-jodit, write-excel-file, read-excel-file, leaflet
npm run functions:install   # sanitize-html
```

**Por qué no puedo:** sí instalo en mi contenedor —de hecho ahí están, y por eso
compila y pasan los tests—, pero `node_modules` no viaja a tu disco. En tu copia
hay `package.json` nuevo y `node_modules` viejo, y eso da un `TS2307: Cannot
find module` que parece un fallo mío y no lo es. Ya nos pasó con las dos de
Excel.

## 2. Desplegar (sin esto, media aplicación habla con funciones que no existen)

```bash
npm run deploy:functions
npm run deploy:rules
```

**Tanda D-70 (escaparate: visibilidad por pantalla y captura de «Diseño»).** Sin funciones nuevas ni
reglas; **una imagen nueva** `public/home/diseno.webp`. Cambia el modelo de la HOME (`show` en
mosaico y carrusel, y `design` nuevo) y la copia de `functions/src/dominio/home.ts`:
`npm run deploy:functions` para que `saveHome` conozca la forma nueva.

1. **`/superadmin/home`** → «Plantillas y paletas (mosaico, diseño y carrusel)»: cada pieza tiene
   «Mostrar» y «Dónde se ve». La captura de Diseño (debajo del mosaico) tiene su imagen y su pie.
2. Si ya guardaste la HOME, el escaparate guardado no trae la captura de Diseño y toma la de fábrica;
   el mosaico y el carrusel conservan su comportamiento de siempre.
3. La cuarta captura del extendido (`galeria-extendido-4.webp`) es ahora la **lista de invitados**
   (162 ficticios, siete grupos de colores, los tres estados de respuesta): se ve en «Dos formas de
   vivirlo». Si ya habías guardado la HOME con las capturas de serie, la imagen cambia sola; el pie
   y el texto alternativo guardados se quedan: edítalos o «Restaurar de fábrica».
4. Mira **PENDIENTES D-70** (qué entiendo por «visibilidad» y que en móvil la captura se ve pequeña).

**Tanda D-69 (capturas, galería con flechas y precios en los paneles de la HOME).** Sin funciones
ni reglas nuevas, sin dependencias. **Imágenes nuevas** en `public/home/` (`galeria-basico-1..3`,
`galeria-extendido-1..4`, y regeneradas `hero`, `mosaico`, `movil-*` y `muestra-portada`);
**se borran** `panel-basico.webp` y `panel-extendido.webp`. Cambia el modelo de la HOME (ya no hay
sección `planes`; cada panel lleva `price`, `priceNote`, `cta` y `shots`) y la copia de
`functions/src/dominio/home.ts`: `npm run deploy:functions` para que `saveHome` conozca la forma
nueva.

1. Abre **`/superadmin/home`** → **«Capturas del panel y precios»**: precio, letra pequeña, botón y
   las capturas de cada plan. La sección «Planes y precios» ya no existe. Si ya habías guardado la
   HOME, **tu título y subtítulo de los paneles se quedan** (lo guardado manda): para ver el
   subtítulo nuevo («…Podéis empezar con el básico y pasar al extendido cuando lo necesitéis.»)
   edítalo, o «Restaurar de fábrica».
2. En **«Estilo»**, los selectores de tipografía enseñan cada una en su letra.
3. **Valida la ilustración de la playa** (no es una foto real) y las insignias/cifras de la portada
   (solo están en la imagen). Mira **PENDIENTES D-69**.
4. Para regenerar las capturas: `npx ng serve --port 4300`, `node tools/capturas-escaparate.cjs
<carpeta>` y `python3 tools/componer-escaparate.py <carpeta> public/home` (Playwright y Pillow,
   que no son dependencias del proyecto).

**Tanda D-68 (TRIVIAL, escaparate, precios y formulario de la HOME).** Sin dependencias nuevas.
**Cuatro funciones nuevas**, **`createHomeRequest`** (pública), **`listHomeRequests`**,
**`updateHomeRequest`** y **`saveHomeRequestSettings`**, y **regla nueva de Firestore
(`homeRequests` y `homeRequestLimits`)**: `npm run deploy:functions` y `npm run deploy:rules`.
También cambia `guest-login` (solo se movieron dos funciones auxiliares a `infra/ip.ts`, sin
cambio de comportamiento), así que el despliegue de funciones lo incluye.
**Iconos:** hay dos nuevos (`tray`, y `caret-left` ahora también en la HOME): `npm run icons` si
tu copia no los trae. **Imágenes nuevas** en `public/home/` (`movil-*.webp`, `mosaico.webp`,
`muestra-portada.webp`) y **regeneradas** las del panel y la portada.

1. Abre **`/superadmin/home`**: hay secciones nuevas (**«Plantillas y paletas»** con interruptores
   para el mosaico y el carrusel, y **«Formulario de contacto»**), y los **precios** de «Planes y
   precios». Si ya habías guardado una HOME, **no cambia sola**: lo guardado manda. Para ver lo
   nuevo sin perder tus textos, enciende/añade a mano, o «Restaurar de fábrica» (borra lo tuyo).
2. Abre **`/superadmin/solicitudes`** y **pon el correo de aviso**. Sin la extensión «Trigger
   Email» los avisos no salen: mira la bandeja.
3. **Prueba el formulario** en `nupcialis.com` (con App Check real; en local con el token de
   depuración) y comprueba que la solicitud aparece en la bandeja.
4. Decide lo que dejé apuntado en **PENDIENTES D-68**: marca «Trivial», fotos reales para el
   escaparate, texto legal de la casilla de aceptación, y cuánto tiempo guardar las solicitudes.
5. Para regenerar las capturas móviles (si cambias una plantilla o paleta): `npx ng serve --port
4300`, `node tools/capturas-home.cjs <carpeta>` y `python3 tools/capturas-home.py <carpeta>
public/home` (necesitan Playwright y Pillow, que no son dependencias del proyecto).

**Tanda D-67 (proveedores y cobro en el alta).** Tres funciones nuevas, **`listPartners`**,
**`savePartner`** y **`settlePartnerPayments`**, y **regla nueva de Firestore (`partners`)**:
`npm run deploy:functions` y `npm run deploy:rules`. Sin las funciones, `/superadmin/proveedores`
y la casilla de cobro del alta no cargan proveedores; sin la regla no pasa nada visible (la
colección ya estaba cerrada por defecto) pero queda explícita. `savePayment` y `provisionWedding`
no cambian de firma, pero `savePayment` ahora acepta `partnerId` y el método `partner_cash`:
**hay que redesplegarla**. Mira también `docs/REVISION-SEGURIDAD.md` (S1.4) para lo que falta
de seguridad antes de vender.

**Tanda D-65 (la HOME).** Dos funciones nuevas, **`saveHome`** y **`resetHome`**, y **reglas
nuevas de Firestore (`platform/home`) y de Storage (`platform/home/`)**:
`npm run deploy:functions` y `npm run deploy:rules`. Sin las funciones el editor
`/superadmin/home` no puede guardar; sin las reglas, la portada no puede leer lo guardado
(pinta lo de fábrica) y no se pueden subir imágenes. No hay dependencias nuevas; el sprite
`public/icons/home.svg` ya va en el commit (`npm run icons` lo regenera).

**Tras el smoke test 1** hay que redesplegar `provisionWedding` (el enlace de alta
ahora continúa en `/panel/acceso`) con `npm run deploy:functions`.

**App Check 403 en `localhost`**: el token de depuración de cada origen
(`localhost`, `<slug>.localhost`) tiene que estar registrado en Firebase → App
Check → Apps → tu app → ⋮ → _Administrar tokens de depuración_. Más rápido:
abre el panel con `?appcheck=<uuid-ya-registrado>` y se guarda para ese
subdominio. Si sigue el 403, revisa las restricciones de la clave de API
(Google Cloud → Credenciales): tienen que permitir `*.localhost:4200` y la API
«Firebase App Check».

**Función nueva: `setGuestRsvp`** (la pareja contesta por un invitado, D-45).
Sin desplegarla, el botón «Respuesta» de la lista de invitados avisa de que no
se ha podido guardar.

**`upsertGuest` cambia** (acepta `invitedById`, para enlazar acompañantes desde
el panel, D-46): hay que **desplegar functions** otra vez. Y reinicia `ng serve`
(se ha tocado `angular.json` para el Jodit).

**Tanda D-50 (la 21).** Sin dependencias nuevas ni iconos. **`npm run deploy:functions`**:
función nueva **`completeWeddings`**. Sin desplegarla, el botón «Añadir módulos
nuevos» del superadmin falla. Después, en `/superadmin`, pulsa **«Añadir módulos
nuevos»** una vez: las bodas extendidas ya creadas ganan `Nuestra historia` y
`Presupuesto` en su menú (y el cartel de la historia, apagado). Pruébalo en la
lista de invitados: abre una fila, ordena por grupo o por respuesta y filtra por
un grupo; y en el alta, con ceremonia civil, la casilla «mismo sitio».

**Tanda D-56 (la 26).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions`.** Cambian `guestLogin` (acepta bodas abiertas),
   `updateWedding` (precio acordado) y la ficha de boda. Reglas: sin cambios
   (`billing` queda cerrada por defecto).
2. Pruébalo: en una boda con la web abierta y el quiz activo, entra en `/quiz` sin
   haber entrado antes: debe salir «Entra» con nombre y 4 dígitos y, al acertar,
   volver al juego. Repite con `/galeria`. En la ficha de una boda, «Editar datos» →
   «Precio acordado», y mira acordado / cobrado / falta.
3. **Pregunta pendiente:** ver el punto 6 de D-56 en PENDIENTES.

**Tanda D-66.** El 401 de «publicar/borrador» y del formulario RSVP **no es un fallo del código**:
en `carnivale.localhost:4200` el token de depuración de App Check no está registrado (cada subdominio
tiene el suyo; el superadmin va en otro origen y sí lo tiene). Abre
`http://carnivale.localhost:4200/?appcheck=<el uuid que ya registraste>` (se guarda para ese
subdominio) o registra el que sale en la consola (`4bca3e8d-…`) en Firebase → App Check → Administrar
tokens de depuración. Hay que hacerlo **una vez por subdominio**.

Despliega **solo lo que cambia**, para no chocar otra vez con la cuota de Cloud Run:

`firebase deploy --only functions:getOpenGifts,functions:getRsvpForm,functions:submitRsvp,functions:addCompanion`

Con eso
funcionan los regalos directos del básico y el plazo por defecto. Valida las dos decisiones de D-66,
sobre todo que el IBAN ya no exige identificarse en el básico.

**Arreglo D-65.** `npm run deploy:functions` y, en el **superadmin** (cabecera, junto al
selector de bodas), pulsa **«Añadir módulos nuevos»**: es lo que añade la sección Autobuses a
`/panel/web`, quita el «Oculta» de Autobuses y el aviso azul. Es un botón del superadmin, no del
panel de la pareja.

**Tanda D-64 (la 34).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions`** — **es lo que hace que veas `Autobuses` en `/superadmin/planes`**
   (el catálogo lo devuelve la función, no el cliente) y la proyección pública deja de publicar
   las tarjetas de ceremonia/banquete y publica el estado de `buses`. No cambian reglas.
2. Pulsa **«Añadir módulos nuevos»** en las bodas existentes: añade la sección «Confirmad vuestra
   asistencia» tras la portada, apagada. Enciéndela en `/panel/web` si la quieres.
3. Pruébalo: «Cómo llegar» debe enseñar los sitios de `/panel/map` (solo los que tienen pin y
   están visibles para invitados). Mira que el aviso del panel de mapa «sin pin» coincide con lo
   que falta en la web.
4. Mis supuestos están en D-64 de PENDIENTES; el 3 (retirar Ceremonia y Banquete) es el que
   cambia algo que ya había escrito, así que dime si no era eso.

**Tanda D-63 (la 33).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions`** (la proyección pública publica `buses` y respeta `sameVenue`, y
   `completeWeddings` enciende los módulos nuevos del básico). **No cambian las reglas**: los
   autobuses viven dentro del documento de la boda, como el dress code.
2. En `/superadmin`, abre las bodas **ya creadas** y pulsa **«Añadir módulos nuevos»**: añade la
   sección «Autobuses» y, en las bodas básicas, enciende regalos, alojamiento y autobuses.
   Si en Firestore tienes `plans/basic` personalizado, añade `gifts`, `accommodation` y `buses`
   a mano (esa lista manda sobre el código).
3. Pruébalo: en una boda **básica**, `/panel/web` debe ofrecer cronología, preguntas, mapa,
   regalos, alojamientos y autobuses (y no quiz, galería, historia…). Rellena `/panel/buses`,
   enciende la sección y mira la web. Marca «ceremonia y banquete en el mismo sitio» en
   `/panel/web`: la vista previa debe enseñar una sola tarjeta. Cambia algo y comprueba que el
   aviso de «cambios sin guardar» se ve bien (también en el móvil). Elige el tema «Acuarela»
   en `/panel/diseno` y mírala con y sin foto de portada.
4. Mis supuestos están en D-63 de PENDIENTES; el 1 (qué entra en el básico) y el 3 (cómo se
   combina la tarjeta) son los que más me interesa que valides.
5. Las fuentes de Acuarela (Pinyon Script, Cormorant Garamond) vienen de Google Fonts: en mi
   contenedor no hay red hacia ellas, así que **no he podido ver la letra real**, solo la
   maqueta con la tipografía de reserva. Mírala tú.

**Tanda D-62 (la 32).** Sin dependencias ni iconos nuevos, **y nada que desplegar**: no cambian
reglas ni functions, solo el panel.

1. Pruébalo en una boda **extendida**: en `/panel/vendors` abre un proveedor y mira los bloques
   «Tareas» y «Partidas del presupuesto» (crea una tarea desde ahí y comprueba que sale en
   `/panel/checklist` con el nombre del proveedor). En una partida de `/panel/budget`, elige
   proveedor y pulsa «Usar el precio acordado como real»: solo rellena el campo, no guarda hasta
   que pulsas Guardar. En `/panel/party`, enlaza a la madrina con su ficha de invitados y mira el
   chip de «Confirmado / Pendiente».
2. En una boda **básica** no debe aparecer ninguno de esos bloques (no tiene proveedores ni
   presupuesto) y las tareas siguen como siempre.
3. Mis supuestos están en D-62 de PENDIENTES; el 7 (pagada a mano) es el que más me interesa que
   valides.

**Tanda D-61 (la 31).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions` y `npm run deploy:rules`, las dos.** Functions: trigger nuevo
   **`syncPublicParty`** y la proyección pública cambia (publica `cortejo`). Reglas: `weddingParty`
   (la pareja guarda foto solo con consentimiento; los invitados ya no la leen) y Storage
   (`vendors/` para contratos PDF, `party/` para las fotos).
2. Después, en `/superadmin`, pulsa **«Añadir módulos nuevos»** una vez: las bodas ya creadas
   ganan el cartel `Personas importantes` (apagado).
3. Pruébalo en una boda **extendida**: `/panel/vendors` (crea dos fotógrafos de la misma
   categoría con precio: sale «el más barato»; añade un pago y un contrato PDF) y `/panel/party`
   (crea una persona con foto: **no te deja guardar sin marcar la casilla**; apágala con
   «visible» y mira que desaparece de la web). El teléfono nunca sale en la web.
4. En el plan básico ninguno de los dos módulos aparece (lo controlas en «Planes y módulos»).
5. **La batería de reglas nueva** (`tests/rules/personas-importantes.spec.ts`) no la he podido
   ejecutar en mi entorno: que la pase el CI y dime si falla algo.
6. Decisión D-14 cerrada con tu respuesta (casilla obligatoria); el detalle y mis supuestos
   están en D-61 de PENDIENTES.

**Tanda D-60 (la 30).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions`.** Cambian la proyección pública (una boda solo publica
   las secciones de los módulos de su plan) y `quiz`, `gallery` y `libro` (rechazan a una
   boda sin ese módulo). Sin reglas nuevas.
2. Pruébalo: en una boda del plan básico, `/panel/web` solo debe ofrecer texto, eventos,
   preguntas, cronología, alojamientos y dress code **si el plan los incluye**; en una
   extendida salen todas. Cambia de plan una boda de prueba y mira que aparecen o
   desaparecen. Los módulos de cada plan los controlas tú en superadmin → «Planes y módulos».
3. Plantillas nuevas **Sevillana** y **Cottage**: elígelas en `/panel/diseno` y mira la web
   en móvil. **Cottage** es inspirada en el estilo de la página que me pasaste, no copiada:
   desde mi entorno no pude abrir trantanestudio.com. Si quieres que se parezca más,
   pásame capturas.
4. Los consejos de superadmin ocupan ya todo el ancho.
5. **Si pierdes el superadmin**, era un fallo mío: dar de alta o borrar una boda con tu
   propio correo te quitaba el claim. Arreglado; tras desplegar, concédelo una última vez
   con `dar-superadmin.mjs`, sal y vuelve a entrar.
6. En el despliegue, a la pregunta de borrar `setCompanionQuota`: **sí** (está retirada).

**Tanda D-59 (la 29).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions` y `npm run deploy:rules`.** Funciones nuevas:
   `listGuestbook`, `signGuestbook`, `deleteGuestbookEntry`. Cambian `listPhotos` y
   `uploadPhoto` (álbumes) y `completeWeddings`. Regla nueva: `guestbookEntries`
   (solo la pareja).
2. En superadmin pulsa **«Añadir módulos nuevos»** para que las bodas que ya existen
   reciban la sección del libro de firmas.
3. Pruébalo: «Cambiar de plan» en una boda de prueba (sube y baja); firma el libro
   como invitado y modéralo desde `/panel/guestbook`; sube una foto en «Nuestro
   camino» y mira que no sale en «El día».
4. El muro del libro es público y las firmas llevan solo el nombre de pila (o el mote): ya decidido.

**Tanda D-58 (la 28).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions`.** Cambian `listRsvpAnswers` (acompañantes) y las
   comprobaciones de pareja (`exigirPareja` añade el motivo). Reglas: sin cambios.
2. Publica una web: si vuelve a fallar, **copia el «Detalle técnico»** del aviso.
3. Mira Mesas con muchos invitados, «Lo que han contestado» con acompañantes, los
   filtros de fechas en Finanzas y la plantilla Barroca en Diseño.

**Tanda D-55 (la 25).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions`** (sin reglas nuevas). Funciones nuevas:
   `listMailQueue`, `discardMailItem`, `recordWebVisit`. Cambian `provisionWedding`,
   `updateWedding` (teléfono y slug), `fichaBoda`. Y **comprueba que `setMyWebStatus`
   (de la tanda 24) está desplegada**: si no, publicar da «No se ha podido hacer el cambio».
2. **Los correos no salen**: la extensión Trigger Email no está instalada. Mira
   `/superadmin/cola-correos`: ahí verás cuántos hay en cola y cuáles.
3. Pruébalo: cambia el slug de una boda de prueba (los enlaces viejos dejan de
   funcionar), apunta un cobro, importa un CSV de invitados, abre el quiz desde un
   enlace directo con acceso por enlace o teléfono, y mira los módulos públicos con
   la plantilla Romántica.
4. **Decisión pendiente:** acceso «abierto» y quiz/fotos (ver D-55 en PENDIENTES).

**Tanda D-54 (la 24).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions`.** Función nueva: `setMyWebStatus`. Cambian
   `setWeddingStatus` (borra las partidas de prueba del quiz al publicar),
   `completeWeddings` (repara «Nuestra historia» duplicada) y `listPhotos`
   (devuelve `miGuestId`). Sin esto, publicar desde el panel y el borrado de fotos
   propias no funcionan. Reglas: sin cambios.
2. En `/superadmin`, pulsa **«Añadir módulos nuevos»** una vez para reparar las
   bodas que tenían «Nuestra historia» duplicada.
3. Pruébalo: entra como pareja (debe llevarte al panel), publica y vuelve a
   borrador desde el Resumen; en una boda con quiz, juega una partida de prueba y
   mira que desaparece al publicar. En la galería, sube una foto como invitado y
   bórrala desde la rejilla. En Diseño, prueba las plantillas Romántica y Moderna
   y las paletas nuevas.

**Tanda D-53 (la 23).** Sin dependencias ni iconos nuevos.

1. **`npm run deploy:functions` y `npm run deploy:rules`.** Funciones nuevas:
   `listEmailTemplates`, `saveEmailTemplate`, `resetEmailTemplate`,
   `previewEmail`, `sendCoupleAccessEmail`, `listPlans`, `savePlanModules`,
   `getTips`, `listTips`, `saveTip`, `resetTip`, `updateWedding`,
   `deleteWedding` y `recordOwnerLogin`; cambian `provisionWedding`,
   `completeWeddings` y `getWeddingFile`. Las reglas añaden `access` a los campos
   de sistema.
2. **Instala la extensión «Trigger Email from Firestore»** (Firebase → Extensiones):
   colección **`mail`**, un SMTP (el de tu dominio, SendGrid, Brevo…) y el
   remitente que quieras. **Sin ella los correos se quedan en `mail` y no salen**
   (el alta funciona igual y el enlace sigue saliendo en pantalla). Para probarlo:
   da de alta una boda con un correo tuyo.
3. Entra en **`/superadmin/planes`** y mira qué módulos trae cada plan: el básico
   tiene la lista corta de antes. Lo que marques se aplica a las bodas existentes.
4. Lee los textos de **`/superadmin/correos`** y **`/superadmin/consejos`** (los de
   fábrica los he escrito yo) y cámbialos a tu gusto.
5. **Mira la ficha de una boda de prueba:** el resumen, «Editar datos» y «Eliminar
   la boda» (¡borra de verdad! úsalo con una de prueba).

**Tanda D-51/D-52 (la 22).** Sin dependencias nuevas. **`npm run deploy:functions`**
(cambian `upsertGuest`, `addCompanion`, `getRsvpForm`, `submitRsvp`,
`setGuestRsvp`, `setGuestsRsvp`, `importGuests`) y, para limpiar, borra la que ya
no existe: `firebase functions:delete setCompanionQuota --region <la tuya>`
(si no la borras no pasa nada: nadie la llama). Reinicia `ng serve`. Pruébalo
así: apunta un acompañante a alguien que ya ha confirmado (tiene que nacer
confirmado), pon al titular en «no viene» (el acompañante también) y baja el
Excel de la plantilla desde Importar.

**Tanda D-49 (la 20).** `npm install` no hace falta (sin dependencias nuevas);
`npm run icons` por si acaso (entra `book-open` en el sprite público) y reinicia
`ng serve`. Después **`npm run deploy:rules`** (reglas de Firestore con
`catalog/{tipo}/items` **y de Storage** con `weddings/{id}/story/`) y
**`npm run deploy:functions`**: funciones nuevas `saveCatalogItem`,
`deleteCatalogItem` y `loadFactoryCatalog`, y cambian `provisionWedding` (tipo de
ceremonia, lugares, plantillas de tareas y partidas) y la proyección pública
(`content.historia`). Sin funciones, el alta con civil/religiosa falla.
Tras desplegar: entra en `/superadmin/catalogos` y, si quieres editar las
originales, pulsa **«Cargar los de fábrica»** en cada pestaña (sin esto se usan
las de fábrica igualmente). Las bodas ya creadas ganan `Nuestra historia` y
`Presupuesto` con el botón «Añadir módulos nuevos» (D-50).

**Tanda D-47 (la de los 18 puntos).** Antes de nada: `npm install` (entra
`@angular/cdk` para arrastrar en las mesas), `npm run icons` (hay iconos nuevos;
el sprite ya viene en el parche, pero no sobra) y reinicia `ng serve`. Después
**`npm run deploy:rules`** (`quizStats`) y **`npm run deploy:functions`**: tocan
`upsertGuest`, `setGuestRsvp`, `submitRsvp`, `importGuests`, `startQuiz`,
`submitQuiz`, la nueva **`getQuizHint`** y `provisionWedding`. Sin
`getQuizHint` desplegada, pedir una pista en el juego falla. Las respuestas
viejas del quiz siguen valiendo. Las decisiones que he apartado para ti están
al final de `D-47` en `PENDIENTES.md`.

**Funciones nuevas acumuladas**, por orden de entrada:

| Función                                        | Para qué                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `getRsvpForm`, `submitRsvp`                    | El formulario de confirmación del invitado                             |
| `guestLinkLogin`                               | Entrar con el enlace de la pareja (D-34)                               |
| `verifyGuest`                                  | Subir de «enlace» a «verificado» con los cuatro dígitos                |
| `getInviteLink`                                | El token del enlace de cada invitado                                   |
| `listRsvpAnswers`                              | Lo que han contestado, para la pareja                                  |
| `listAccessLog`                                | «Quién ha entrado»                                                     |
| `reorderGroups`                                | El orden de los grupos                                                 |
| `startQuiz`, `submitQuiz`                      | Jugar al quiz, con la corrección en servidor                           |
| `listQuizRanking`                              | El ranking que ve el invitado                                          |
| `listQuizPlays`                                | Quién ha jugado, con teléfono, para vuestro panel                      |
| `clearQuizRanking`                             | Vaciar el ranking antes del día de la boda                             |
| `assignGuestsToTable`                          | Sentar invitados en una mesa, en lote                                  |
| `uploadPhoto`                                  | Subir foto a la galería (grande y miniatura)                           |
| `listPhotos`                                   | Una página de la galería                                               |
| `deletePhoto`                                  | Borrar una foto (la suya, o cualquiera si sois vosotros)               |
| `clearGallery`                                 | Vaciar la galería entera                                               |
| `listPlaylist`                                 | La lista de canciones que ve el invitado, sin ids                      |
| `suggestSong`, `voteSong`                      | Proponer y votar una canción (con duplicados detectados)               |
| `getGifts`                                     | La página de regalos del invitado                                      |
| `getAdminStats`                                | Las estadísticas del superadmin (solo con el claim)                    |
| `getWeddingFile`, `generateCoupleResetLink`    | La ficha de una boda y el enlace de restablecimiento (solo superadmin) |
| `listPayments`, `savePayment`, `deletePayment` | El libro de cobros (solo superadmin)                                   |
| `getReminders`, `markReminderSent`             | Los avisos de después de la boda (solo superadmin)                     |
| `setGuestsRsvp`                                | La pareja marca la respuesta de varios invitados a la vez              |
| `setWeddingLimits`                             | Fijar el tope de fotos de una boda (solo superadmin)                   |
| `reserveGift`, `releaseGift`                   | Coger y soltar un regalo de la lista                                   |

**Las reglas cambian**: `playlistSuggestions` pasa a ser **solo de la pareja**
(antes un invitado podía leerla, y con ella quién había votado qué). Sin
desplegar las reglas, la playlist sigue funcionando pero esa fuga queda abierta.
Y `submitRsvp` ahora añade a la playlist la canción que el invitado escribe al
confirmar: hasta que se despliegue, esa canción se guarda en su respuesta y no
entra en la lista.

Y `listGuests` devuelve dos campos más (si lo apuntó un invitado y cuándo), y
`syncPublicProjection` ahora **sanea el HTML** del texto enriquecido. Hasta que
no se despliegue, el aviso de acompañantes nuevos no sale y el texto con formato
se publica sin sanear.

**Reglas e índices:** hay dos índices nuevos. Uno en `guests` por
`normalizedName` + `phoneLast4`: sin él, el modo B de acceso falla con un error
de índice la primera vez que alguien intenta entrar. Otro en `photos` por
`status` + `createdAt` descendente: sin él, la galería no lista nada y la
consola de Firebase te ofrece el enlace para crearlo con un clic.

**Lo recibido no necesita despliegue de funciones**: el cuaderno de la pareja
habla con Firestore directo, y la regla de `giftsReceived` (solo la pareja) y su
test de aislamiento ya estaban. Para mirarlo: panel → Regalos → «Lo recibido».
Apunta un par de cosas, marca una como agradecida y mira que, con un regalo en
especie, el importe sale «—» y no «0 €».

**Las reglas cambian otra vez, para `gifts`.** El invitado ya no lee esa
colección: se la sirve `getGifts`. Es lo que mantiene anónima la reserva —el id
de quien ha cogido cada cosa vive en el documento, y una regla puede negar una
escritura pero no esconder un campo de una lectura—. Hasta que se desplieguen
las reglas, un invitado identificado podría consultar la colección y ver quién
ha cogido qué.

**Tanda D-48 (superadmin, respuesta en lote, ubicaciones).** Hay que
**desplegar reglas, índices y funciones**: `npm run deploy:rules` (colecciones
`payments` y `reminderMarks`, cerradas salvo lectura del superadmin, y el
**índice nuevo de `auditLog`** — `weddingId` + `createdAt`—; sin él la ficha de
boda da error al cargar el historial y Firestore tarda unos minutos en
construirlo) y `npm run deploy:functions`: funciones nuevas **`setGuestsRsvp`**
(respuesta en lote), **`getWeddingFile`**, **`generateCoupleResetLink`**,
**`listPayments`**, **`savePayment`**, **`deletePayment`**, **`getReminders`** y
**`markReminderSent`**, y cambian los triggers de proyección (los enlaces de
ubicación de la cronología y de los alojamientos). Sin `setGuestsRsvp` el botón
de la lista avisa de que no se ha podido guardar. Después, en
`/superadmin`, pulsa el nombre de una pareja para abrir su ficha. El enlace de
restablecimiento **no se envía**: lo copias y se lo pasas tú. Las decisiones
que he apartado están en `D-48`.

**El IBAN.** Lo que la pareja escribe se comprueba con el módulo 97 antes de
publicarse, y **no sube a la proyección pública** ni el número de cuenta ni el
Bizum. Lo confirmaste el 2026-11-17 (`D-40`).

**El tope de fotos (500 por boda, `D-39`) toca las reglas otra vez**: `limits`
pasa a ser un campo de sistema que la pareja no puede escribir. Hasta que se
desplieguen las reglas, una pareja podría subirse el tope a sí misma desde la
consola del navegador. Para cambiar el tope de una boda, mientras no exista el
panel de superadmin (`F3.1d`), hay que escribir `limits.maxPhotos` a mano en el
documento de la boda.

**La galería escribe en Storage.** Los ficheros los escribe `uploadPhoto` con el
SDK de administrador y se sirven por URL con token de descarga, así que el
bucket **no** necesita lectura pública y no hay que tocar las reglas de Storage.
Si vuestro bucket no se llama `<proyecto>.firebasestorage.app`, hay que ponerlo
en la variable `NUPCIALIS_BUCKET` de las funciones.

Y **las reglas han cambiado** para `faqs`, `timelineEvents` y `accommodations`:
el invitado ya no las lee directamente, porque lo publicable le llega por la
proyección pública. Hasta que se despliegue, un invitado identificado podría
leer una pregunta a medio escribir, la hora a la que llega el fotógrafo o un
hotel que todavía no habéis decidido, con una consulta directa.

**Cuatro triggers nuevos** de proyección, uno por lista: `syncPublicFaqs`,
`syncPublicTimeline`, `syncPublicAccommodations` y `syncPublicLocations` (el
del mapa). **Ojo: `syncPublicAccommodations` existía pero no estaba exportado en
`functions/src/index.ts`, así que los alojamientos nunca se habrían publicado
solos.** Ya está arreglado, y un test nuevo (`triggers-exportados.spec.ts`)
falla si cualquier función con trigger se queda sin exportar. Los cinco —con el
de siempre— llaman a la misma función (`reconstruirProyeccion`), que compara antes
de escribir, así que no se llaman entre ellos. Hasta que no se despliegue, las
preguntas, la cronología y los alojamientos **no aparecen en la web**: se
guardan bien en el panel y la proyección no se entera.

**Por qué no puedo:** desplegar necesita tus credenciales de Firebase. No las
tengo ni las quiero tener.

## 3. El CI

`.github/workflows/ci.yml` es el único fichero que el puente a tu disco se
niega a escribir, y me parece bien que lo proteja. Falta un paso en el job de
`functions`, justo después de «Compilar»:

```yaml
- name: Lint
  run: npm --prefix functions run lint
```

Está en mi commit `F1.5`; en tu copia hay que pegarlo a mano.

## 4. La batería de reglas de Firestore

```bash
npm run test:rules
```

**Por qué no puedo:** es la única cosa del proyecto que necesita el emulador de
Firestore (D-33), y el emulador se descarga de un dominio que la red de mi
contenedor no alcanza. Corre sola en el job `reglas` del CI al hacer push, así
que basta con no ignorar ese job. Sigue siendo **requisito de release**: es lo
que sustituye al aislamiento por bases de datos separadas.

---

## 5. Lo que necesita tus ojos

**La HOME (D-65), sin desplegar nada para verla:** `localhost:4200/dev/home` enseña la portada
con las tres plantillas, y `localhost:4200/dev/home-editor` el editor con guardado en memoria
(también `/dev/panel-basico` y `/dev/panel-extendido`, de donde salen las capturas). **Lee el
texto de fábrica entero** —es lo que va a ver quien llegue— y dime a dónde debe llevar el botón
«Quiero mi web de boda» (hoy `mailto:hola@nupcialis.com`). Ya con las funciones desplegadas,
abre `/superadmin/home`, cambia un título, sube una imagen, publica y mira `/` en el móvil; y
«Restaurar de fábrica». Los fallos de Google Fonts que veas en mi sandbox no existen en la tuya.

**Tanda 27 (D-57), plan completo:** abre una boda con plan extendido y mira (a) la
cabecera en escritorio y móvil con tus plantillas y paletas, (b) que «Más» se abre y
cierra, (c) que desde el quiz o la galería los enlaces del menú te llevan a la
portada con ancla, (d) Romántica con foto de portada y las paletas Vino, Tinto y
rosa, Burdeos y oro, Grafito y oro y Perla y oro.

Esto es lo que convierte «los tests pasan» en «esto funciona», y es lo único que
queda para dar **F1 por terminada**. Con `npm start` levantado y entrando por
`<slug>.localhost:4200`, no por `localhost` a secas:

1. **Una boda de prueba de principio a fin**: cargar ~100 invitados (importando
   una hoja), mandarte el enlace a ti mismo, abrirlo en el móvil, entrar,
   confirmar con un acompañante y exportar para el catering.
2. **El modal de compartir en 360 px** y que WhatsApp abra de verdad desde el
   móvil (`F1.4c`). Esto me lo pediste y no lo he podido ver.
3. **El editor de texto enriquecido**: que la barra salga donde toca, que pegar
   desde WhatsApp no meta basura y que lo escrito se vea igual en la web.
4. **«Quién ha entrado»** con entradas de verdad: las mías son inventadas.
5. **El resumen del panel** con una boda a medio montar: es la primera pantalla
   que ve la pareja y la he visto solo en pruebas.
6. **Las tareas** (`/panel/checklist`): que la plantilla sembrada al dar de alta
   la boda aparezca con fechas razonables, que marcar una sea un toque, y que
   el aviso del inicio salga. No hay nada que desplegar para esto: sin
   funciones nuevas ni cambio de reglas. Mírala también con una boda
   **dada de alta con una fecha cercana**, que es donde la plantilla se ancla
   a hoy (D-43, punto 4).

**Cuatro páginas nuevas que te ahorran parte de esto**, todas solo en
desarrollo y sin tocar Firebase: `localhost:4200/dev/previa` enseña las dos
plantillas de la web con una boda entera de muestra y con el caso de boda recién
creada, `localhost:4200/dev/panel` monta las pantallas de contenido del panel
con datos de muestra que se pueden tocar, `localhost:4200/dev/quiz` juega una
partida entera con un banco de ejemplo, y `localhost:4200/dev/galeria` abre la
galería del invitado con fotos de mentira para ver la rejilla y el visor (y la
de la pareja está dentro de `/dev/panel`, en el selector de pantalla). Abriéndolas a 360 px salieron seis fallos
que no veía ningún test; están en `TAREAS.md`, `F2.7` y `F2.7b`. **Los
alojamientos y el dress code en un móvil ya los he mirado yo ahí**: lo que sigue
necesitando tus ojos es lo de arriba, que depende de datos y de aparatos de
verdad.

**Por qué no puedo:** mi contenedor no abre tu navegador, y la web pública
necesita el subdominio de la boda para resolver el tenant. Lo que sí está
cubierto son los 737 tests de cliente y 410 de funciones, pero un test no te
dice si un botón se sale de la pantalla en un móvil de 360 px.

---

## 6. Decisiones que me bloquean

No las resuelvo por mi cuenta (regla de `CLAUDE.md`). Ordenadas por lo que
desbloquean:

| Decisión                                                       | Qué bloquea                                                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **D-04 · Librería de mapas**: la he elegido yo (Leaflet + OSM) | **Valídala**: el mapa ya funciona; el riesgo es el uso de las teselas públicas de OSM a escala |
| **D-02 · Precio** de cada plan                                 | La landing comercial y el alta con datos de cobro (`F0.7.7`)                                   |
| **D-09 · Módulos con identidad en modo abierto**               | Galería, quiz y libro de firmas en una boda sin puerta (F3)                                    |
| **D-11 · Repeticiones del quiz** y qué enseña el ranking       | El quiz (F3)                                                                                   |
| **D-01 · Ciclo de vida post-boda**: cuánto se conserva         | El archivado y la purga, y lo que hay que contar en la política de privacidad                  |

## 7. Infraestructura, cuando toque vender

- `F0.1.3` Los tres proyectos de Firebase (`dev`, `staging`, `prod`) en región europea.
- `F0.3.7` Hosting con wildcard `*.nupcialis.com`.
- `RE.7` **Proyecto de producción aparte, antes de la primera pareja que pague.**
  Hoy las bodas de prueba tienen invitados inventados con teléfonos y alergias;
  en cuanto haya una boda real al lado, eso es un asunto de datos personales.
- `RE.8` ~~Servir `Cross-Origin-Opener-Policy`~~ **Hecho** en `vercel.json` (con las
  reescrituras de la SPA y las cabeceras de seguridad). El análisis del pase a producción
  (por qué Vercel y no Firebase Hosting, pasos y la decisión de dos o tres proyectos de
  Firebase) está en `PUESTA-EN-MARCHA.md`, **Bloque 8**: es lo que hablamos mañana.
- `RE.6` Comprobar el subdominio en Authentication → Authorized domains.

---

## Lo que sí puedo seguir haciendo sin ti

Para que no haya dudas de en qué gasto el tiempo mientras: todo lo que sea
dominio, funciones, pantallas y pruebas de los módulos que **no** dependen de
una decisión abierta.

Hechos ya, los cuatro del plan básico que salían «En camino» en el menú:

- **Preguntas frecuentes** (`F2.1`), de punta a punta.
- **Cronología del día** (`F2.2`), de punta a punta.
- **Alojamientos** (`F2.4`), de punta a punta.
- **Dress code** (`F2.5`), sin el moodboard ni las indicaciones por grupo, que
  quedan apuntadas como `F2.5b` y `F2.5c`.

**El orden cambia a partir de aquí.** Me dijiste, con razón, que las cuatro
últimas son módulos de contenido y que lo que vende son la galería, el quiz y
las mesas. La lista reordenada, con el porqué de cada una, está arriba del todo
de `TAREAS.md`, en «Lo siguiente, por valor para la pareja». En corto:
**galería → quiz → mesas → mapa → regalos**.

De esas, **tres decisiones tuyas de un minuto adelantan trabajo de días**:
`D-11` (el quiz: si se repite partida y qué enseña el ranking), `D-09` (quién
sube una foto o firma en una boda en modo abierto, donde no hay sesión). `D-04`
(mapas) ya la elegí yo —Leaflet + OSM— y solo necesita tu visto bueno.

### Dos cosas del dress code para que las mires

1. **Los colores son una lista cerrada de 30, con nombre**, y no un selector de
   color. El por qué está en `D-38`, y lo importante para ti es esto: **si
   falta un color que tus parejas vayan a pedir, dilo y se añade en una línea.**
2. **Falta el moodboard** de imágenes (`F2.5b`) y las indicaciones distintas por
   rol o por grupo (`F2.5c`). Entregué el módulo funcionando antes que las tres
   cosas a medias; dime si lo prefieres al revés.

### Una cosa de los alojamientos que quiero que valides

En `REQUISITOS.md` §8.10 el campo del destacado se llamaba `featured` y había un
`icon` y un `color` por ficha. Lo he implementado como **`recommended`**, sin
icono ni color: el icono sale de lo que es el alojamiento (`tent` para el
camping, `bed` para el resto) y un color por hotel no significa nada para el
invitado, que es justo lo que §9.1 prohíbe. He actualizado §8.10 para que diga
lo que hay. Es un cambio de nombre y de dos campos que nunca se usaron, no de
producto, pero está aquí para que lo veas y no te lo encuentres.
