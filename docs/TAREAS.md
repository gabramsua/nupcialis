# Nupcialis — Tareas

> **Lo que necesita a Gabriel está en `docs/PARA-GABRIEL.md`**: instalar
> dependencias, desplegar, el CI, la batería de reglas, lo que hay que mirar en
> el navegador y las decisiones abiertas. Aquí abajo queda el trabajo.

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

## Lo siguiente, por valor para la pareja

_Escrito el 2026-11-16, a petición de Gabriel. **Esta lista manda sobre el orden
de las fases** mientras no se diga otra cosa._

**La crítica, y tiene razón.** Las cuatro últimas entregas —preguntas
frecuentes, cronología, alojamientos y dress code— son **módulos de contenido**:
la pareja escribe en un formulario y el invitado lo lee. Salieron rápido porque
las cuatro comparten el mismo patrón (dominio compartido, proyección pública,
colección cerrada), pero ninguna es la razón por la que alguien paga por esto.
Lo que vende son **la galería, el quiz y las mesas**, y las tres estaban detrás
en el plan porque el plan las había puesto en F2 y F3.

El plan se ordenó por dependencias técnicas —todo lo que necesita la web pública
antes que lo que necesita participación— y eso dejó lo vistoso al final. Se
reordena.

### Por qué cuestan lo que cuestan

Las tres grandes no son como las cuatro de contenido: cada una trae maquinaria
que todavía no existe en el proyecto.

| Módulo      | Lo que trae de nuevo                                                                                               | Riesgo                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Galería** | Subida a Storage desde el móvil, miniaturas, moderación, y **audiencia por grupo**: la foto que solo ve la familia | El coste de Storage y el aislamiento de lo restringido    |
| **Quiz**    | Banco de preguntas, corrección **en servidor** (regla 4), ranking con desempate por tiempo                         | Poco: el prototipo existe y se porta                      |
| **Mesas**   | Plano del banquete, arrastrar invitados, capacidad, incompatibilidades, y exportar para el catering                | El arrastre en un móvil de 360 px, que es donde se decide |

### Orden propuesto

1. **`F3.1` Galería (§8.8).** Es lo que miran los invitados al día siguiente y
   lo que hace que la web siga viva después de la boda. Entrega en dos partes:
   primero **ver** (la pareja sube, el invitado mira, con audiencia por grupo),
   después **subir desde el móvil** con moderación. Necesita decidir: quién
   puede subir, si las fotos salen publicadas o a cola de moderación, y el tope
   por boda.
2. **`F3.2` Quiz (§8.7).** El de mayor valor por hora de trabajo: el juego ya
   está escrito en el prototipo `wedding-quiz` y lo que falta es volverlo
   multi-tenant y corregir en servidor. **Bloqueado por `D-11`** (si se puede
   repetir partida y qué enseña el ranking), que es una decisión de dos
   minutos.
3. **`F2.8` Mesas (§8.5).** La herramienta interna que de verdad ahorra horas a
   la pareja. Arrastrar invitados a las mesas, avisos de capacidad y de grupos
   separados, y la hoja para el catering. Es la más grande de las tres.
4. ~~**`F2.3` Mapa (§8.6).**~~ **Hecho** con Leaflet y OpenStreetMap, y con los
   enlaces `locationId` de la cronología y de los alojamientos (`F2.2b`,
   `F2.4b`).
5. **`F3.3` Regalos (§8.14).** Pequeña y con valor directo: cuenta, Bizum y la
   lista de lo recibido, que **no sale nunca de la sesión de la pareja**
   (regla 7).
6. ~~**`F3.4` Lista de reproducción**~~ **hecha**. Queda **`F3.5` libro de
   firmas**, pequeño y de participación; va después porque se disfruta en la
   boda, no antes.
7. **`F2.6` Personas importantes (§8.12)** y lo que quede de contenido:
   moodboard del dress code (`F2.5b`), contacto de referencia (`F2.1c`).

### Lo que desbloquea más, si quieres adelantar trabajo

Tres decisiones de un minuto cada una, por lo que abren:

- **`D-11`** (quiz) → desbloquea entero el módulo con mejor relación
  valor/esfuerzo.
- **`D-09`** (módulos con identidad en una boda en modo abierto) → la galería y
  el libro de firmas necesitan saber **quién** sube o escribe, y en una boda sin
  puerta no hay sesión.
- ~~**`D-04`** (librería de mapas)~~ → elegida (Leaflet + OSM), pendiente de que la valides.

---

## F0.1 · Proyecto y entornos

- [x] `F0.1.1` Proyecto Angular 22.1.7: enrutado, SCSS, estricto, **zoneless**, Vitest. Compila en 59,6 kB comprimidos
- [x] `F0.1.2` Prettier, ESLint (angular-eslint 22) con regla que prohíbe importar `firebase/*` fuera de `core/firebase`, husky y lint-staged
- [ ] `F0.1.3` Crear los tres proyectos de Firebase (`dev`, `staging`, `prod`) en región europea
- [x] `F0.1.4` `src/environments` con los tres entornos y `fileReplacements` en angular.json. Valores de Firebase pendientes de crear los proyectos
- [x] `F0.1.5` Capa `core/firebase` sobre el SDK modular v12, repartida por rutas (D-17, D-18)
- [x] `F0.1.6` Levantar emuladores de Firestore, Auth, Functions y Storage
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
- [-] `F0.3.5b` ~~Semilla del emulador: cuatro bodas, una por estado.~~ Retirada con D-33 junto al emulador. Las bodas de prueba se dan de alta desde `/superadmin` y se quedan.
- [x] `F0.3.6` Cinco estados con su pantalla propia: publicada, no publicada, archivada, no encontrada y error
- [ ] `F0.3.7` Configurar el hosting con wildcard `*.nupcialis.com` en `dev`

## F0.4 · Autenticación

- [x] `F0.4.1` Firebase Auth con email y contraseña, y Google
- [x] `F0.4.2` Cloud Function `setUserClaims` con Admin SDK (ver `F0.6.9`)
- [x] `F0.4.3` Dos cuentas de owner por boda sobre `ownerUids`
- [x] `F0.4.4` Claim `superadmin` y lista blanca de UIDs (ver `RE.2`)
- [x] `F0.4.5` Guardas de ruta por rol y por tenant
- [x] `F0.4.6` App Check en cliente, Firestore, Storage y Functions
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
- [-] `F0.6.V` ~~Verificación de extremo a extremo del alta contra el emulador.~~
  **Retirada con D-33**: `tools/probar-alta.mjs` y `npm run probar:alta` vivían
  del emulador y se han borrado con él. Lo que comprobaba —permisos, alta,
  semillas, proyección, los dos triggers, slug repetido y validación— se cubre
  ahora dando de alta una boda de verdad desde `/superadmin`, que es lo que
  cierra `RE.5`.
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

## F3 — Participación de invitados

- [x] `F3.2` **Quiz de la boda** (§8.7). Hecho el lado del invitado de punta a
      punta: dominio compartido, `startQuiz` / `submitQuiz` / `listQuizRanking`
      con la corrección **en servidor** (regla de oro 4), la pantalla de juego
      —una pregunta por pantalla, sin volver atrás, correcciones de golpe al
      final—, su página propia en `/quiz` para poder mandarla por WhatsApp, y
      la sección «El juego de la boda» que lleva hasta ella desde la web.
      **Falta el panel**: banco de preguntas, ranking con teléfono para la
      pareja, quién ha jugado y vaciar el ranking (`F3.2b`).
- [x] `F3.2b` El quiz en el **panel de la pareja**. Dos pantallas:
  - `/panel/quiz`, el banco: alta, edición, duplicado y borrado. Dice **cuántas
    se pueden jugar**, que no es cuántas hay —el servidor solo pregunta las
    enteras— y avisa si no llegan para una partida, que es el fallo que si no se
    avisa se descubre el día de la boda.
  - `/panel/quiz/ranking`: el ranking **con el teléfono** (`D-11`), para
    distinguir a dos que se llamen igual, y vaciarlo con confirmación. No lista
    a los invitados que no han jugado.
- [x] `F2.8c` Al sentar a alguien que viene acompañado, las mesas **preguntan**
      si sientan también a los suyos, y si no caben ofrecen **ampliar la mesa**
      o dejarlos fuera. El máximo sigue siendo un aviso (§8.4).
- [ ] `F3.2c` Del quiz quedan fuera, apuntados: **importar el banco desde CSV**,
      el **banco de ejemplo** sembrado al crear la boda, la **vista previa** de
      la partida desde el panel y las **estadísticas** de preguntas más falladas
      (§8.7). Ninguna bloquea jugar.
- [x] `F3.1` **Galería** (§8.5), lado invitado. Sube el móvil y reduce el móvil:
      cada foto se pasa por un `canvas` antes de salir, y viajan la grande (1600
      px) y la miniatura (480 px) en la misma llamada, de tres en tres. El
      servidor las guarda con el SDK de administrador y las sirve con token de
      descarga, así el bucket no queda abierto. Rejilla de miniaturas con carga
      diferida, visor a pantalla completa con teclado y botones en las esquinas
      —donde cae el pulgar—, paginación de 24 por cursor, y borrar la suya cada
      invitado y cualquiera la pareja. Subir exige invitado **verificado**;
      mirar, no.
- [x] `F3.4` **Playlist colaborativa** (§8.14). Invitado: `/playlist` con
      proponer (duplicados detectados por título y artista normalizados, que
      suman el voto en vez de repetir) y votar (un voto por invitado y canción,
      un toque, con el corazón y su texto). Funciones `listPlaylist`,
      `suggestSong` y `voteSong`; la colección se cierra a los invitados porque
      guarda quién votó qué. La canción del RSVP entra sola. Panel `/panel/playlist`:
      pestañas «Por decidir / Suena / Descartada / Vetada» con recuento,
      aceptar, descartar y vetar en un toque, y la lista para el DJ en XLSX.
      Decisiones en `D-41`.
- [ ] `F3.4b` De la playlist quedan fuera: **agrupar por momento** de la boda
      para el DJ, **moderación previa** opcional y **enlace a Spotify o
      YouTube** para escuchar. Ninguna está en el MVP.
- [x] `F3.3` **Regalos** (§8.8), la mitad pública: cómo aportar y la lista.
      Ni el IBAN ni el Bizum viajan en la proyección pública —los sirve
      `getGifts` a quien está identificado—, el IBAN se comprueba con el módulo
      97 en el panel mientras se escribe, y en el móvil los dos son botones que
      copian. Reservar es una transacción y la reserva es **anónima de verdad**:
      `reservedBy` no sale de la función, viajan dos booleanos.
- [x] `F3.3b` **Regalos recibidos** (§8.8), el panel privado de la pareja:
      registro rápido con buscador de invitado, totales por método, agradecer
      **de un toque** (con fecha), filtros «sin agradecer» y «no es dinero», y
      el cruce con la lista: quién vino y no tiene nada apuntado, y quién tiene
      algo apuntado sin haber venido, sin totales por invitado. Habla con
      Firestore directo, solo la pareja (`giftsReceived`, regla 7).
- [-] `F3.3d` ~~Exportación a XLSX de lo recibido.~~ Retirada por decisión de
  Gabriel (D-40): lo recibido no sale del panel en ningún fichero.
- [ ] `F3.3c` Del regalo queda fuera la **imagen propia** (hoy es una URL, con
      la misma maquinaria de subida que la foto de portada) y el enlace a
      `locationId`.
- [ ] `F3.1b` De la galería quedan fuera, apuntadas: **audiencias por grupo**
      (toda foto nace con `audienceGroupId: null`, que es pública; falta quién
      lo pone al subir y el filtro de `listPhotos`), **denuncia**, **descarga en ZIP** para la pareja y `srcset` en
      WebP (§8.5).
- [x] `F3.1e` **Tope de 500 fotos por boda** (D-39): `limits.maxPhotos`, campo
      de sistema con su test de reglas; `uploadPhoto` lo mira antes de tocar
      Storage y el invitado ve «la galería está llena».
- [x] `F3.1d` **Panel de superadmin con estadísticas y límites por boda**
      (§8.18, D-42): `/superadmin/estadisticas`, con `getAdminStats` y
      `setWeddingLimits`. Arriba, los totales; debajo, una fila por boda con
      su galería frente a su tope (barra + chip «Con espacio / Cerca del
      tope / Galería llena») y el botón de cambiar el tope. Las más llenas
      salen primero. Queda para después: otros límites (invitados, mesas) y
      el peso exacto de las fotos (hoy es una estimación).
- [x] `F4.1` **Tareas de la pareja** (§8.17, D-43), en `/panel/checklist`. La
      plantilla ya se sembraba al crear la boda; faltaba toda la pantalla.
      Cada tarea tiene **estado calculado** (vencida · esta semana · próxima ·
      sin fecha · hecha), **responsable** (uno, el otro o los dos, con los
      nombres de la pareja), prioridad, categoría y notas. Filtro por persona
      (lo suyo y lo de los dos), marcar con un toque, las hechas escondidas, y
      en el **inicio** un aviso con las que queman. Sin funciones nuevas ni
      cambio de reglas: la colección ya era de la pareja.
- [ ] `F4.1b` **Recalcular las fechas de la plantilla** si la pareja cambia la
      fecha de la boda. Hoy las fechas se calculan al dar de alta y se quedan.
      Hace falta guardar en cada tarea sembrada cuántos días antes de la boda
      va (`offsetDays`) para poder moverlas sin pisar las que la pareja haya
      tocado a mano.
- [ ] `F4.1c` **Vincular tarea con proveedor y partida de presupuesto**: los
      campos `vendorId` y `budgetItemId` ya se guardan y se respetan al
      editar, pero no hay pantalla que los rellene hasta que existan
      proveedores y presupuesto (`F4`).
- [ ] `F4.1d` Un estado **«en curso»** entre pendiente y hecha, si la pareja lo
      echa en falta. El modelo (§8.17) solo tiene `done`; añadirlo es un campo
      más y no se ha hecho sin que lo pidan.
- [x] `F3.1c` La galería **en el panel**, en `/panel/gallery`: la pareja ve la
      rejilla entera con **el nombre de quien subió cada foto debajo** —que es
      el dato que convierte «esta sobra» en «hablo con mi primo»—, borra
      cualquiera con confirmación, y puede **vaciarla entera escribiendo
      VACIAR**. Lo de escribir la palabra no es ceremonia: son las fotos de
      todos sus invitados y no hay papelera. `listPhotos` sirve a los dos
      lados: la pareja ve la galería sin filtrar por estado y el invitado solo
      lo aprobado, y así el día que lleguen las audiencias por grupo el cambio
      sigue estando en un sitio.

## F2 — Banquete, ubicaciones y día

- [x] `F2.8` **Reparto de mesas** (§8.4), con arrastrar y soltar. Tantas mesas
      como haga falta, redondas o rectangulares, con mínimo y máximo **que
      vienen puestos y la pareja cambia**: una redonda nace de 8 a 12 y una
      rectangular de 12 a 50. Dos formas de sentar a alguien —arrastrar la
      ficha, o tocarla y tocar la mesa— porque arrastrar en un móvil a través
      de una lista con scroll es una pelea, y el panel se diseña primero para
      móvil. Avisos y no bloqueos: mesa corta, mesa pasada y **acompañante
      separado de quien lo apuntó**, que es el error que se descubre cuando ya
      están sentados. Borrar una mesa devuelve a los suyos a la lista de
      pendientes en vez de perderlos.
- [x] `F2.8d` **XLSX para el catering** desde la pantalla de mesas: resumen por
      mesa con los menús contados, quién se sienta dónde, y los que aún no
      tienen sitio. Sin teléfonos ni notas. De paso se corrige un fallo de las
      hojas de invitados: la columna «Mesa» llevaba el identificador de Firestore
      y ahora lleva el nombre.
- [ ] `F2.8b` De las mesas quedan fuera, apuntadas: **colocar las mesas en el
      lienzo** (el campo `position` está en el modelo y no se usa todavía),
      **colorear por grupo** para ver mesas mal mezcladas, y la **exportación
      a PDF** (§8.4).

- [x] `F2.1` **Preguntas frecuentes** (§8.9), de punta a punta: las semillas de
      fábrica ya existían y no se veían. Ahora viajan en la proyección pública
      —cerradas al invitado en las reglas, con su batería de aislamiento—, se
      publican solo las que tienen pregunta **y** respuesta, y en la web son
      `<details>` agrupados por categoría, con buscador a partir de diez. En el
      panel, `/panel/faqs`: lista con el aviso de las que están sin contestar,
      editor con formato para la respuesta, grupo con sugerencias de los ya
      usados, icono del set, encender y apagar, reordenar y borrar.
- [x] `F2.1b` Las cuatro listas de contenido, en la **vista previa** del editor
      de la web. Salían con el hueco vacío —la pareja encendía «Preguntas
      frecuentes», no veía nada y no sabía si estaba roto o vacío—; ahora llegan
      con sus datos de verdad y **pasadas por el saneador de la proyección**, así
      que lo que no se publicaría tampoco se ve: una pregunta sin respuesta, un
      hito interno, un alojamiento apagado. De paso, la portada de la vista
      previa ya enseña los nombres de la pareja, que estaban en blanco.
- [x] `F2.7` **Página de muestra de la web pública** (`/dev/previa`, solo en
      desarrollo, como el catálogo del sistema visual). Las dos plantillas con
      una boda entera de muestra —secciones, preguntas, cronología,
      alojamientos y dress code— y con el caso de **boda recién creada**, sin
      Firebase y sin gastar un dominio autorizado de Auth. Mirándola a 360 px
      aparecieron cuatro fallos que no veía ninguno de los 747 tests, porque
      ninguno mira píxeles. Los cuatro, arreglados en la misma entrega:
  - **`link-simple` y `lock-simple` no estaban en el sprite público.** El enlace
    «Ver la web» de cada alojamiento y el candado de la pantalla de
    verificación salían en blanco. Ahora `iconos-publicos.spec.ts` falla si se
    usa en la web pública un icono que no está en su sprite.
  - **El icono se iba solo a una línea** en la ficha de alojamiento: el plazo de
    las habitaciones y el código de reserva.
  - **Una sección de evento sin rellenar dibujaba una caja vacía** debajo de su
    título.
  - **Una boda sin nombres pintaba un «&» suelto** (clásica) o una «y» sola
    (botánica) en mitad de la portada. Es el primer estado de todas las bodas.
- [x] `F2.7b` **Lo mismo para el panel** (`/dev/panel`): las cuatro pantallas de
      contenido con datos de muestra **que se pueden tocar**, porque los dobles
      guardan en memoria. Dos arreglos salieron de mirarlas a 360 px:
  - **Las dos paletas del dress code van plegadas.** Desplegadas son sesenta
    filas: la pantalla medía 2.580 px en un móvil. El resumen enseña los colores
    elegidos con su muestra y su nombre —que es la información que importa— y la
    rejilla se abre cuando se va a tocar. 1.105 px.
  - **Los avisos de hueco de la cronología saltaban en una boda normal.** Casi
    ningún hito lleva hora de fin, y suponer que acaban en cuanto empiezan
    convertía en «hueco» todo rato entre dos cosas: cuatro avisos en una agenda
    corriente. Ahora un hueco solo cuenta si el hito dice cuándo acaba. Un aviso
    que salta siempre no lo lee nadie.
- [ ] `F2.1c` **Contacto de referencia** de las preguntas frecuentes (§8.9): un
      teléfono y un WhatsApp pulsables, normalmente de la wedding planner y no
      de los novios el día de la boda. Falta decidir dónde se configura: es un
      dato de la boda, no de una pregunta.
- [ ] `F2.1d` `linkTo`: que una pregunta enlace a otro módulo —la del bus a la
      cronología, la del parking al mapa—. Está en el modelo y no en la
      pantalla, porque los módulos a los que enlazaría todavía no existen.
- [x] `F2.2` **Cronología del día** (§8.13), de punta a punta: hitos con hora,
      hora de fin opcional, icono del set y color de la paleta; los **internos**
      —el montaje, cuándo llega el fotógrafo— se quedan fuera de la proyección
      pública, que es lo único que de verdad lo protege; avisos de **solapes y
      huecos** con los nombres de los hitos, calculados también sobre lo
      interno; y en la web, línea de tiempo vertical con la hora destacada.
      Entiende que **la boda acaba de madrugada**: «04:00» va al final.
- [x] `F2.2b` Enlazar un hito con una **ubicación del mapa** (§8.13). Selector
      en la pantalla de la cronología (`selector-de-ubicacion.ts`, compartido
      con alojamientos); en la web, «Cómo llegar» con el enlace de navegación.
      La proyección deja `locationId` en `null` si esa ubicación no se publica,
      y los enlaces se validan en servidor (`conEnlaceValido`).
- [x] `F2.4` **Alojamientos** (§8.10), de punta a punta: fichas con tipo,
      precio por noche, distancia, teléfono, web, código de reserva,
      habitaciones bloqueadas y plazo. Viajan en la proyección pública con la
      colección cerrada al invitado, como las otras dos listas. En la web, el
      recomendado primero, el plazo con su urgencia contada en días y los
      enlaces de llamar y reservar. En el panel, `/panel/accommodation`: avisa
      de lo que el invitado va a notar —ficha sin nombre que no se publica,
      plazo vencido o a punto de vencer, habitaciones bloqueadas sin fecha, y
      ficha sin teléfono ni web— y guarda el teléfono y la web ya normalizados
      con las mismas funciones que usa el servidor.
- [x] `F2.4b` Enlazar un alojamiento con una **ubicación del mapa** (§8.10). Igual
      que `F2.2b`: selector en el panel y «Cómo llegar» en la web.
- [x] `F2.5` **Dress code** (§8.11): descripción con texto enriquecido, paleta de
      colores sugeridos y a evitar —ids de una lista cerrada de 30 con nombre,
      ver `D-38`— y avisos prácticos. En la web, las muestras con su nombre al
      lado y las de «evitar» tachadas; en el panel, `/panel/dress-code`, con
      aviso del color que está en las dos listas y de la sección que saldría con
      el título solo. Se publica desde `modules.dressCode.config`, construido
      campo a campo: ninguna configuración de módulo se copia a la proyección.
- [ ] `F2.5b` **Moodboard** del dress code (§8.11): imágenes de referencia en
      Storage. Comparte la maquinaria de subida con la foto de portada.
- [ ] `F2.5c` **Indicaciones por rol o por grupo** en el dress code (§8.11):
      distinto para el cortejo que para el resto. Espera a `F2.6` (personas
      importantes), que es donde viven los roles.
- [x] `F2.3` **Mapa y ubicaciones** (§8.6). Con **Leaflet y OpenStreetMap**
      (`D-04`, elegida por mí y a validar por Gabriel). Panel `/panel/map`:
      lista ordenable, alta y edición con selector de pin (buscar la dirección
      con Nominatim o tocar y arrastrar el marcador), avisos de «sin pin» y de
      «interno». Web pública `/mapa` con mapa, marcadores por tipo (icono +
      color + texto), lista que funciona sin mapa y botones «Cómo llegar» y
      «Abrir en Google Maps» (enlaces profundos, sin clave). Sección `mapa`
      como cartel en las dos plantillas. Las ubicaciones internas **no salen
      de la sesión de la pareja** (regla de lectura propia de `locations`).
- [ ] `F2.3b` Pendiente del mapa: **geocodificación propia** si el uso de las
      teselas y de Nominatim públicos de OSM se queda corto (ver `D-04`), y
      **ruta entre sitios** (hoy solo «cómo llegar» a cada uno).

## F1 · Invitados

- [x] `F1.1` **Lista de invitados**: dominio (normalización de nombre y teléfono,
      duplicados), `listGuests`, `upsertGuest` y `deleteGuest`, y la pantalla del
      panel con alta manual, búsqueda y resumen. Todo por función invocable: la
      colección está cerrada a lectura directa (regla 2).
- [x] `F1.2` **Importación**: plantilla descargable, subir un CSV o pegar las
      celdas, reconocimiento y ajuste de columnas, previsualización y
      `importGuests`. La previsualización **es la misma llamada** que la
      importación con una bandera, para que lo que se ve antes de confirmar sea
      exactamente lo que va a pasar. Falta `.xlsx`: se abre de nuevo en F1.6,
      con la exportación, para no meter una librería de 400 kB por una pantalla.
- [x] `F1.2b` **Aceptar `.xlsx` directamente al subir**, con la misma librería
      que la exportación. Se lee la primera hoja, las fechas llegan legibles y
      las filas vacías del final no cuentan.
- [x] `F1.3` **Grupos de invitados**: pantalla de grupos (color de la paleta
      categórica, lado, audiencia de fotos con candado), asignación en la ficha
      del invitado con aviso antes de guardar si quedan dos restringidos, y
      columnas «Grupos» y «De quién» en la importación, que crea los grupos
      que falten. `upsertGroup` y `deleteGroup`; la escritura directa desde el
      cliente queda cerrada en las reglas (D-31).
- [x] `F1.3a` **Arreglo de paso**: editar un invitado le borraba el mote, lo
      pasaba a adulto y lo sacaba de sus grupos, porque el formulario no
      llevaba esos campos y `upsertGuest` sobrescribe lo que valida.
- [x] `F1.3b2` **Filtrar por confirmación y por quién no ha entrado**: las
      cifras de la cabecera son los filtros. La pareja mira «pendientes: 84» y
      lo que quiere es ver esos 84.
- [x] `F1.3b` **Filtrar la lista por grupo**: los grupos, en chips debajo de
      las cifras, con cuántos hay en cada uno. Se cruza con la cifra que esté
      puesta —«sin contestar» + «Primos» es la lista con la que se ponen a
      llamar—, y el número de cada chip cuenta dentro de ese filtro para que no
      haya dos cifras que se contradigan.
- [x] `F1.3c` **Ordenar los grupos**: subir y bajar con botones —no
      arrastrando, que es PL.7c y otra discusión (D-29)—, y el orden entero se
      guarda de una vez con `reorderGroups`. El orden se ve antes de que
      conteste el servidor y se deshace si falla. Importa porque esa lista es
      la que se mira al dar de alta a cada invitado, y por orden de creación
      «Familia» acababa la sexta.
- [ ] `F1.3d` **Gabriel**: la batería nueva de `guestGroups` corre sola en el
      job `reglas` del CI al hacer push. En el contenedor de Claude no se puede:
      el emulador de Firestore se descarga de un dominio que su red no alcanza.
- [x] `F1.3e` **El grupo de todos** (D-31): todo invitado nuevo entra en
      «Invitados», por alta manual o importación. Ese grupo no se borra ni lleva
      candado. Los invitados que ya existían no se tocan.
- [x] `F1.7` **Acceso de invitados**: modo elegible en «Datos de la boda» (A
      abierta, B nombre y cuatro dígitos, C teléfono); `guestLogin` con App
      Check, límite de intentos por boda e IP con espera creciente y una sola
      respuesta de fallo (regla 3); `loginCount`, primera y última entrada y
      `guestAccessLog`; y la puerta en la web pública, en un trozo diferido que
      una boda abierta no descarga. Ver D-32.
- [x] `F1.7b` **Quién eres y cómo salir**: barra «Estás viendo esto como
      <nombre>» con «¿No eres tú?» encima de la portada, que cierra la sesión y
      devuelve la puerta sin recargar. El nombre viaja en el claim `nombre` del
      token, así que aguanta la recarga. D-34 lo hizo necesario: con un enlace
      que entra solo, quien recibe uno reenviado está dentro como otra persona.
- [x] `F1.7c` / `F0.7.4` **Quién ha entrado**: registro de accesos para la
      pareja en `/panel/guests/accesos`, por días, con quién entró, a qué hora,
      cómo (enlace o sus datos) y desde qué aparato. Arriba, el aviso de
      invitaciones que circulan: tres tipos de aparato distintos o más para el
      mismo invitado (D-34). Ni la IP ni el `user-agent` entero salen del
      servidor.
- [x] `F1.8f` La pantalla de respuestas **no tenía ruta**: se enlazaba desde
      «Preguntas» y llevaba a una página en blanco. Arreglado, y con guardia
      permanente (`src/app/rutas-enlazadas.spec.ts`) que comprueba que todo
      `routerLink` escrito a mano lleva a una ruta declarada.
- [ ] `F1.9b` **Gabriel**: esta entrega añade **tres dependencias**: `jodit` y
      `ngx-jodit` en la raíz y `sanitize-html` en `functions/`. Hace falta
      `npm install` **y** `npm run functions:install` antes de arrancar, y
      `npm run deploy:functions` para que el saneado llegue a la proyección.
- [ ] `F1.5d` **Gabriel**: `npm run deploy:functions` lleva `setCompanionQuota`,
      `listAccessLog` y `reorderGroups`, que son las últimas en entrar.
- [ ] `F1.7d` **Gabriel**: `npm run deploy:rules` lleva ahora un índice nuevo
      (`guests` por `normalizedName` + `phoneLast4`). Sin él, el modo B falla
      con un error de índice la primera vez que alguien intenta entrar.
- [x] `F1.4` **Enlace por invitado y compartir por WhatsApp**: enlace con el
      nombre en `?n=` —y nada más: el secreto no viaja (D-34)—, plantilla de
      mensaje de la boda con marcadores, retoque por persona, botones de
      WhatsApp y de copiar, aviso a quien no tiene teléfono, y la puerta
      pública trayendo el nombre ya escrito.
- [x] `D-34` **Acceso mixto**: el enlace abre la web, los cuatro dígitos
      autorizan. `guestLinkLogin`, `verifyGuest`, `getInviteLink`, dos niveles en
      el claim, el paso de «confirma que eres tú» en el formulario y el botón de
      cambiar el enlace en el panel. Decidido por Gabriel el 2026-11-12.
- [ ] `D-34b` **Gabriel**: hay tres funciones nuevas (`guestLinkLogin`,
      `verifyGuest`, `getInviteLink`), así que toca `npm run deploy:functions`.
      Los enlaces que ya hayas mandado con `?n=` siguen funcionando.
- [ ] `F1.4c` **Comprobar F1.4 en tu navegador.** Es lo que me pediste y esta vez
      no he podido: a las 22:55 tu `npm start` no estaba levantado, así que
      `mms.localhost:4200` daba página de error. Lo que sí está cubierto, con
      pruebas que fallan si se rompe: el enlace no lleva el secreto, la puerta
      trae el nombre escrito y deja los dígitos vacíos, el mensaje se rehace al
      cambiar la plantilla. Lo que no he visto con mis ojos: cómo queda el modal
      en 360 px y que WhatsApp abra de verdad desde tu móvil.
- [ ] `F1.4b` «¿A quién le falta el enlace?»: la lista no distingue a quién ya
      se le ha compartido. Se sabrá de verdad con los contadores de acceso
      (`F1.7c`), no apuntando el clic.
- [x] `F1.8` **Formulario de confirmación (RSVP)**: dominio del formulario
      (visibilidad condicional, validación por tipo, `mapsTo` con lista blanca,
      fecha límite), `getRsvpForm` y `submitRsvp`, la pantalla del invitado con
      los ocho tipos de campo y la entrada desde la web. Las preguntas de
      sistema quedan protegidas en las reglas. Ver D-35.
- [x] `F1.8b` **Editor de preguntas en el panel** (`/panel/rsvp`): la lista con
      lo que ya hay, encender y apagar en un toque, reetiquetar, reordenar,
      añadir y borrar las que no son de sistema. Las opciones se escriben una
      por línea. En lugar de un constructor de condiciones, una casilla:
      «preguntar solo a quien confirme que viene», que es la única condición que
      se da en una boda de verdad.
- [x] `F1.8c` **Fecha límite configurable**, en esa misma pantalla y no en
      «Datos de la boda»: es donde la pareja la busca.
- [x] `F1.8f` **Aviso al cambiar el tipo de una pregunta contestada**: antes de
      guardar se cuenta cuántos la han contestado y, si hay alguno, el botón
      pasa a «Cambiar de todas formas» con el número delante. No se borra nada:
      las respuestas viejas se siguen viendo tal cual en «Lo que han
      contestado», que ya sabe enseñar valores que no están en las opciones.
- [x] `F1.8d` **Lo que han contestado** (`/panel/rsvp/respuestas`): los menús y
      los autobuses contados, y **los mensajes y las canciones leídos uno a uno
      con quién los escribió**. Eso último no se veía en ninguna parte: vivía en
      `rsvpAnswers` y no salía ni en la lista, ni en la ficha, ni en la
      exportación.
- [x] `F1.8g` **Lo escrito, en la hoja de cálculo**: tercera hoja
      «Respuestas», una columna por pregunta de texto y solo las filas de quien
      escribió algo. No va en la del catering. Se pide al pulsar exportar, no
      al abrir la pantalla, y si falla esa llamada el fichero sale igual con
      sus dos hojas de siempre.
- [x] `F1.8h` **Del recuento a los nombres**: pulsar «vegano, 23» abre los
      nombres de esos 23, debajo de la barra. Un número suelto no sirve para
      hacer nada; con los nombres se avisa al catering o se mueve una mesa. Uno
      abierto cada vez, y lo que está a cero no se puede abrir.
- [ ] `F1.8e` **Gabriel**: `npm run deploy:functions` lleva dos funciones nuevas
      (`getRsvpForm`, `submitRsvp`) y `npm run deploy:rules`, la regla que
      protege las preguntas de sistema.
- [x] `F1.5` **Acompañantes añadidos por el invitado**: dominio del cupo y de la
      herencia, `addCompanion` y `deleteCompanion`, la sección en la web del
      invitado, el interruptor en «Datos de la boda» y, en la lista del panel,
      quién trae a quién.
- [ ] `F1.5d` **Gabriel**: `.github/workflows/ci.yml` es el único fichero que no
      te puedo escribir (el puente a tu disco lo protege, y me parece bien). El
      cambio es un paso más en el job de functions, justo después de
      «Compilar»: `- name: Lint` con `run: npm --prefix functions run lint`.
      Está en mi commit; en tu copia hay que pegarlo a mano.
- [x] `F1.5b` **Cupo de acompañantes en lote**: se le pone a todos los que se
      estén viendo, aprovechando los filtros —«los amigos, uno cada uno» es
      filtrar por ese grupo y elegir 1—. El botón dice a cuántos afecta antes
      de pulsarlo; los acompañantes se omiten y bajar el cupo no echa a nadie.
      Nueva invocable `setCompanionQuota`.
- [x] `F1.5c` **Aviso de quién ha apuntado a quién**: encima de la lista, un
      aviso con los nombres cuando los invitados han apuntado a alguien **en
      los últimos siete días**, y un botón que deja la lista con ellos. La
      cifra «Los han apuntado» se queda en la cabecera mientras haya alguno.
      Una semana y no «desde tu última visita»: esa marca habría que escribirla
      en cada entrada al panel y con dos novios uno pisa la del otro.
- [x] `F1.6` **Exportación a XLSX**: dos hojas, la lista entera de la pareja y
      una para el catering sin teléfonos ni notas. Se monta en el navegador y la
      librería se carga al pulsar.
- [ ] `F1.6b` **Gabriel**: esta entrega añade dos dependencias
      (`write-excel-file` y `read-excel-file`), así que en tu copia hace falta
      un `npm install` antes de `npm start`. Ver D-37.
- [x] `F1.9` **Texto enriquecido en la web pública**, con Jodit en el panel y
      el saneado en el servidor (regla de oro 5). Confirmado D-03 el
      2026-11-13 y cerrada la contradicción con §12.3. - **El saneado vive en el servidor**, en `functions/src/dominio/html.ts`,
      y se aplica en la proyección pública justo antes de publicar: lo que
      decida el navegador de la pareja no protege a nadie. Lista blanca
      corta: párrafos, negrita, cursiva, subrayado, tachado, listas, `h3`,
      `h4`, cita y enlaces. Los enlaces salen con `target="_blank"` y
      `rel="noopener noreferrer"`, y solo con `http`, `https`, `mailto` y
      `tel`. - **Lo que ya estaba escrito en texto plano no se rompe**: si no trae ni
      una etiqueta, los saltos de línea se convierten en párrafos. - **El editor se carga aparte**: Jodit pesa 600 kB y vive en su propio
      chunk, detrás de un `@defer` en el editor de secciones. Si no cargara,
      queda el área de texto de siempre. - **La barra del editor no ofrece nada que el servidor vaya a tirar**: lo
      cruza `editor-rico.spec.ts` leyendo las dos listas. - Las reglas de estilo del texto enriquecido son globales
      (`design-system/components/rich-text.scss`): son iguales para todas las
      plantillas y así no se come el presupuesto de 4 kB por componente. - De camino: el cupo en lote y el filtro por grupos salen a sus propios
      componentes, que es lo que devolvió a `invitados.ts` por debajo de ese
      presupuesto.
- [ ] `PL.7c` Reordenar **arrastrando**, que es lo que pide REQUISITOS §8.1. Hoy
      son botones de subir y bajar: accesibles y buenos en móvil, pero no es lo
      acordado. Ver D-29.
- [x] `F0.7.4` Vista de registro de accesos de los novios — hecha con `F1.7c`
- [x] `F0.7.5` **Resumen del panel**: cuenta atrás, cuántos han dicho que
      vienen y cuántos han abierto la web —cada cifra lleva a su lista—, la
      lista de lo que falta (calculada, no mantenida a mano) y los atajos a las
      respuestas del formulario y a los invitados. De camino se arregló que el
      menú enlazaba los dieciocho módulos del catálogo a `/panel/<modulo>`:
      los que no tienen pantalla llevaban a una página en blanco y ahora salen
      apagados con «En camino». Lo vigila `rutas-enlazadas.spec.ts`.
- [x] `F0.7.6` **Carga diferida verificada**: `src/app/arranque-publico.spec.ts`
      recorre los `import` alcanzables desde la raíz pública —sin seguir los
      `import()` diferidos, que son justo lo que separa los chunks— y falla si
      alguno llega al panel o al superadmin. Encontró uno de verdad: la
      envoltura pública importaba `features/panel/invitados/invitacion` solo
      para leer el nombre del enlace. Eso vive ahora en `core/acceso`.
- [x] `F0.7.7` **Datos de cobro en el alta de boda** (D-67): casilla «Apuntar ya el cobro»
      con proveedor, importe (con la tarifa mayorista del plan si hay proveedor), método
      (`bizum`, transferencia, efectivo, `partner_cash`…), estado y fecha. Se apunta
      **después** de crear la boda; si falla, la boda queda y se avisa. Ver D-25.
- [x] `F0.7.8` Colección `partners` y su alta desde `/superadmin/proveedores`, con tarifa
      mayorista por plan e interruptor `active`. Sin cuenta ni acceso para el proveedor.
      Funciones `listPartners` y `savePartner`; reglas con test de aislamiento.
- [x] `F0.7.9` Saldo por proveedor: bodas, pendiente y liquidado, y **liquidación en bloque**
      (`settlePartnerPayments`, todo o nada, auditada).

---

## Cerrar el alta contra Firebase de verdad

Antes que plantillas, paletas y resúmenes. Ver `PUESTA-EN-MARCHA.md` bloque 7.

- [x] `RE.1` Entorno para levantar la app contra el proyecto real (`npm run start:real`)
- [x] `RE.2` Script para conceder el claim de superadmin, con las protecciones de la clave
- [x] `RE.3` **Activar Blaze.** Hecho el 2026-09-16
- [x] `RE.4` `npm run deploy:rules` y `npm run deploy:functions` — **G**
      Vuelve a hacer falta: `setWeddingStatus` es una función nueva y hasta que
      no se despliegue, los botones de publicar responden `not-found`.
- [x] `RE.4b` **Configurar App Check en el cliente**: clave de **reCAPTCHA
      Enterprise** (de tipo web y basada en puntuación) en `appCheckSiteKey`, y
      token de depuración para `localhost`. No confundirla con el `apiKey` ni el
      `appId` de Firebase, que son otra cosa y ya están puestos. Sin esto toda
      invocable responde 401. Ver `PUESTA-EN-MARCHA.md` bloque 7 — **G**
- [x] `RE.5` Alta real de una boda desde `/superadmin` contra el proyecto (`mms`) — **G**
- [ ] `RE.6` Comprobar el subdominio en Authentication → Authorized domains (cierra `F0.6.X`) — **G**
- [ ] `RE.7` Proyecto de Firebase aparte para producción, antes de la primera pareja que pague
- [x] `RE.8` **Servir `Cross-Origin-Opener-Policy: same-origin-allow-popups` en producción**
      (`headers` de `vercel.json`, ya en el repositorio con las reescrituras de la SPA y
      las cabeceras de seguridad). Sin esa cabecera el acceso con Google se queda
      colgado sin dar error, igual que pasaba en local. **Falta una CSP** (primero en modo
      _report-only_; ver `PUESTA-EN-MARCHA.md`, Bloque 8). Se comprobará en el despliegue real.

---

## Surgido de F0.7 · Catálogo de plantillas

- [x] `PL.1` Catálogo de plantillas en código, con id, nombre, descripción y sus tipografías
- [x] `PL.2` Dos primeras plantillas: **Clásica** y **Botánica**, cada una en su propio chunk
- [x] `PL.3` La paleta de marca de la boda llega como variables CSS `--np-marca-*`
- [x] `PL.4` Solo se descarga la tipografía de la plantilla elegida
- [x] `PL.5` Selector de plantilla en el panel, con miniatura viva de cada una
- [x] `PL.8` Test de aislamiento: la pareja **sí** puede escribir lo suyo
      —`theme`, la paleta, la portada, `content.sections`, `guestAccessMode`,
      `indexable`, la configuración de un módulo y el plazo del RSVP— y sigue sin
      poder tocar los campos de sistema. Lo que estaba probado era solo la mitad
      de abajo: si alguien endureciera la regla de más, el panel dejaría de
      guardar y no había nada que lo dijera. Corre en el job `reglas` del CI.
- [ ] `PL.9` **El interruptor de un módulo no debería ser de la pareja.** Decide
      lo que entra en su plan y lo mueve el superadmin, pero hoy las reglas lo
      dejan escribir (`modules.<x>.enabled` no es campo de sistema). Hay un test
      en `campos-de-sistema.spec.ts` que lo documenta como deuda; al cerrarlo,
      pasa de `assertSucceeds` a `assertFails`. Ojo al cerrarlo: la pareja **sí**
      tiene que poder escribir `modules.<x>.config`, que es donde vive el
      contenido del dress code y el plazo del RSVP.

---

## Smoke test 1 · arreglos y backlog (17/11/2026)

El primer recorrido completo salió mal. Arreglado en esta tanda:

- [x] `S1.3` **Superadmin: el acceso te llevaba a `/`.** El login siempre navegaba a
      `/panel` y, en el dominio raíz, la guarda lo manda a `/`. La ruta
      `/superadmin/acceso` declara ahora `data.destino = '/superadmin'` y el login lo respeta.
- [x] `S1.3b` **Listado del superadmin con filtros**: texto (nombres y slug, sin
      acentos), estado, momento (próximas / ya celebradas / sin fecha), cuenta
      «n de total» y «Quitar filtros». Lógica pura en `filtrarBodas` (con tests).
- [x] `S1.3c` **«Nueva boda» es una acción**: botón en la cabecera que abre un modal
      con el alta; la columna lateral desaparece y el listado ocupa todo el ancho.
- [x] `S1.5` **El enlace para fijar la contraseña llevaba a la web pública.** El
      enlace de acceso continúa ahora en `/panel/acceso`. **Hay que redesplegar
      `provisionWedding`.**
- [x] `S1.6` _(ya existía)_ «He olvidado la contraseña» en el login de la pareja.
- [x] `S1.8` **App Check 403 en el panel.** No es un fallo de código: el token de
      depuración de ese origen no está registrado (o la clave de API restringe
      `*.localhost:4200` / la API de App Check). El código ahora lo dice en
      claro con un `console.error` en desarrollo.

- [x] `S1.9` **El panel no se abría con la boda en borrador**: la guarda solo
      aceptaba bodas publicadas y mandaba a la pareja a `/`, donde se ve «todavía
      no está publicada». Ahora el panel abre en borrador y archivada; solo la web
      pública se cierra. `cargarTenant` devuelve el `weddingId` en esos dos casos.

- [x] `S1.10` **Campos de formulario iguales en todo el panel** y el superadmin:
      filtros, mesas, tareas, regalos… usaban `<input>`/`<select>` sin estilo y
      pisaban el del design system con reglas propias. Ahora todos llevan `npInput`
      y se han quitado las reglas duplicadas. La web pública de los invitados
      conserva sus campos con los colores de la pareja (a propósito).
- [x] `F1.8h` **La pareja contesta por el invitado** (`setGuestRsvp`, D-45):
      botón «Respuesta» en cada invitado con viene / no viene / sin contestar y el
      resto del formulario. Función nueva: **hay que desplegar functions**.
- [x] `S2` **Tanda de 18 puntos** (D-47): iconos de la cronología, pista del quiz
      a mitad de precio con aviso, respuesta correcta nunca visible, estadística por
      pregunta con etiqueta fácil/difícil, «Cómo funciona» corregido, sin email de
      invitado, grupos sin lado ni publicación por invitados, grupo general
      siempre, scroll arriba, «Confirmaciones de asistencia», mesas con todos los
      invitados en color + acompañantes + quitar + CDK, y filtros y autor/fecha de
      completado en Tareas. Lo apartado para Gabriel está en `D-47`.
- [ ] `S2b` **Apartado (D-47)**: desempate del ranking, lista de preguntas de demo
      del superadmin, preguntas por grupo de invitados, `doneBy` blindado por regla.
- [x] `F1.5d` **Acompañantes desde el panel** (D-46): «Añadir acompañante» desde
      un titular, «Viene con» en la ficha, y navegación titular ↔ familia.
      `upsertGuest` acepta `invitedById`. Pulido de timeline/FAQ (selector visual
      de iconos y colores, vista previa) y Jodit con su hoja de estilos.
      Quiz sin preguntas de fábrica, con explicación y buscador.
      Vista previa de la galería hecha (ver `F3.1e`).
- [x] `F1.8i` **Respuesta en lote**: «viene», «no viene» o «sin contestar» para
      todos los invitados que se están viendo en la lista (`np-respuesta-en-lote`,
      función `setGuestsRsvp`, hasta 500 por llamada, con confirmación que dice a
      cuántos afecta). Sin casillas: se apoya en los filtros, como el cupo en lote.
- [x] `F1.8j` **Marcar a todo un grupo**, y la familia de un titular: son los
      mismos filtros de la lista (por grupo, o por titular) aplicados a la acción
      anterior. Solo toca el estado, no las respuestas del formulario.
- [x] `F3.1e` **Vista previa de la galería** en el panel: maqueta con las mismas
      fotos, rejilla y visor, sin subir ni borrar.

- [x] `S3` **Tanda 20** (D-49): **civil/religiosa** y **lugares de ceremonia y
      celebración** en el alta (búsqueda OSM o enlace de Google Maps) y editables
      en el panel; **catálogos del superadmin** de tareas, presupuesto y preguntas
      del quiz (`/superadmin/catalogos`) que se vuelcan a cada boda nueva;
      **presupuesto de la pareja** (`/panel/budget`); sugerencias del quiz con
      «Añadir a nuestro quiz»; **«Nuestra historia»** (cinco apartados con Jodit y
      hasta dos fotos, `/panel/story` y `/historia`); **cerrar sesión** en ambos
      paneles; filtros estables en el superadmin. **Funciones nuevas, reglas de
      Firestore y de Storage: hay que desplegar.**
- [ ] `S3b` **Apartado (D-49)**: qué más cambia civil/religiosa (tareas propias de
      la civil: sin prisa), posición de las fotos de la historia (lo prueba
      Gabriel), enlaces cortos de Google Maps. Resueltos en D-50: casilla «mismo
      sitio» y módulos nuevos en bodas existentes.
- [x] `S3c` **Tanda 21** (D-50): **lista de invitados en acordeón** (fila
      numerada, detalles y acciones al abrir), **orden** por nombre, respuesta,
      grupo o alta en ambos sentidos y filtro por grupos mantenido; casilla
      **«mismo sitio»** (solo civil) en el alta; botón y función
      **`completeWeddings`** para añadir los módulos nuevos a las bodas ya
      creadas. **Función nueva: hay que desplegar functions.**

- [x] `S4a` **Tanda 22** (D-51, D-52): sin cupo de acompañantes (y sin
      `setCompanionQuota`), acompañantes que siguen la asistencia del titular,
      «Ver acompañantes», grupo «Invitados» oculto, WhatsApp único en «Vuestra
      web», sin «Viene con» al añadir, lote de viene/no viene solo en
      familia/grupo e importación solo con la plantilla `.xlsx`. **Hay que
      desplegar functions.**

- [x] `S4b` **Tanda 23** (D-53): menú lateral plegable del superadmin; correos
      con plantillas editables y cola `mail` (extensión Trigger Email); alta con
      enlace de Google Maps y correo de acceso automático; planes y módulos
      editables con confirmación al quitar; catálogos siempre activos y tareas
      sin categoría; consejos por módulo en el panel (gestionados desde el
      superadmin); editar y borrar boda; contadores de entradas y resumen en la
      ficha. **Hay que desplegar functions y reglas, e instalar Trigger Email.**
- [x] `S4c` **Tanda 24** (D-54): arreglo del acceso de la pareja al panel; la
      pareja publica su web (`setMyWebStatus`) y se borran las partidas de prueba
      del quiz al publicar; sugerencias del quiz sin las ya añadidas; «Nuestra
      historia» con dos botones y fotos sin recortar; menú con apartado activo
      marcado y sin ojo duplicado; reparación de secciones de historia
      duplicadas; aviso de primera vez para las tareas; botones de cámara;
      galería del invitado con «Mis fotos» y borrado propio; plantillas
      Romántica y Moderna y seis paletas nuevas. **Hay que desplegar functions.**
- [x] `S4d` **Tanda 25** (D-55): panel protegido con guardas endurecidos; publicar
      arriba en el Resumen y «Volver a borrador» pequeño al final; tareas de
      catálogo sin categoría obligatoria y selector de icono; quiz y módulos
      públicos recuperan la sesión de invitado; tema de la pareja en todos los
      módulos públicos; cola de correos del superadmin (`listMailQueue`,
      `discardMailItem`); teléfono de contacto; slug editable por el superadmin;
      «Apuntar cobro»; contador de visitas a la web (`recordWebVisit`); CSV en la
      importación; orden por grupo corregido. **Hay que desplegar functions.**
- [x] `S4e` **Tanda 26** (D-56): quiz, galería, regalos y playlist piden identificarse
      también con la web abierta (`guestLogin` en boda abierta, guarda y puerta
      `/entrar`), con avisos a los novios; precio acordado por boda en la ficha del
      superadmin (`billing/{weddingId}`). **Hay que desplegar functions.**
- [x] `S4f` **Tanda 27** (D-57): cabecera de navegación del plan completo (barra con
      «Más» en escritorio, cajón agrupado en móvil), con el tema de la boda; los
      módulos con página propia salen del apilado de la portada; velo de foto con el
      color del fondo (arregla Romántica con paletas oscuras); 4 paletas nuevas
      (Tinto y rosa, Burdeos y oro, Grafito y oro, Perla y oro).
- [x] `S4g` **Tanda 28** (D-58): mesas con lista lateral y filtros (nombre/apellidos,
      grupo, ocultar a quien no viene); «Lo que han contestado» cuenta y nombra a los
      acompañantes y avisa de quién falta por contestar; teléfonos sin `+34` en toda la
      app (se guardan en E.164 y se admite prefijo de otro país); filtros de fechas en
      finanzas; fuera los atajos del Resumen y «Volver a borrador» flotante en una fila;
      el error de publicar enseña un detalle técnico; plantilla **Barroca**.
      **Hay que desplegar functions** (`listRsvpAnswers`, `exigirPareja`).
- [x] `S4h` **Tanda 29** (D-59): «Cambiar de plan» en la ficha de superadmin (vista previa
      de módulos, aviso de bajada, nuevo precio, sin cobro automático); **libro de
      firmas** completo (funciones `listGuestbook`/`signGuestbook`/`deleteGuestbookEntry`,
      sección `libro`, página pública y moderación en el panel); galería con dos álbumes
      («El día» y «Nuestro camino»). **Hay que desplegar functions y reglas.**
- [x] `S4i` **Tanda 30** (D-60): `/panel/web` y la web pública solo ofrecen las secciones
      de los módulos del plan de la boda (cliente, proyección y guardas de `quiz`, `gallery`
      y `libro`); plantillas **Sevillana** y **Cottage**; consejos de superadmin a todo el
      ancho. **Hay que desplegar functions.**
- [x] `S4j` **Tanda 31** (D-61): **proveedores** (`F4`, `/panel/vendors`: fichas con contacto
      pulsable, presupuesto y precio acordado, pagos, contratos en PDF, valoración,
      comparativa de candidatos por categoría con el más barato marcado) y **personas
      importantes** (`F2.6`, `/panel/party`: foto, nombre, papel, lado, bio, teléfono
      interno, visibilidad por persona, orden; sección `cortejo` en la web). **Foto =
      casilla de consentimiento obligatoria** (D-14 → D-61). Solo plan extendido. **Hay que
      desplegar functions y reglas.**
- [x] `S4k` **Tanda 32** (D-62): los tres enlaces que faltaban. **Tarea ↔ proveedor y
      partida** (selectores en la tarea; la ficha del proveedor y la de la partida listan sus
      tareas, enlazan una existente, quitan el enlace o crean una nueva ya enlazada),
      **partida ↔ proveedor** (selector, y botones «usar presupuesto / precio acordado» que
      solo proponen) y **persona ↔ invitado** (selector y chip de respuesta). Sin desplegar
      nada: no cambian reglas ni functions.
- [x] `S4l` **Tanda 33** (D-63): lo que pediste tras validar la 32. **Plan básico**: ahora trae
      también regalos, alojamiento y autobuses (y `completeWeddings` los enciende una vez en
      las bodas básicas ya creadas). **Autobuses**: módulo nuevo en los dos planes (rutas de
      ida y vuelta con nombre, salida, hora, destino y nota; solo información, sin reservas;
      viven en `modules.buses.config.rutas`, sin colección ni regla nueva). **Mismo sitio**:
      dato `sameVenue` de la boda (casilla del alta, solo civil, e interruptor en
      `/panel/web`) → la web publica una sola tarjeta «Ceremonia y banquete» y la hora del
      banquete como «a continuación» o «a las HH:MM». **Aviso de cambios sin guardar** como
      tarjeta fija con título y botón. **Tema «Acuarela»** (ambos planes, con huecos de imagen).
      **Hay que desplegar functions** (proyección con `buses` y `sameVenue`, y `completeWeddings`).
- [x] `S4m` **Tanda 34** (D-64): repaso tras probar la 33. `buses` faltaba en la visibilidad
      pública (el catálogo del superadmin sale de `getPlans`: hay que **desplegar functions**).
      «Cómo llegar» pinta los sitios del mapa dentro de la web (con «Ceremonia y banquete»
      fusionados si coinciden) y la vista previa los trae. Retiradas las tarjetas Ceremonia y
      Banquete (y el interruptor «mismo sitio» de la tanda 33). Nueva sección «Confirmad vuestra
      asistencia» que lleva a `/confirmar`.
- [x] `S4n` Guardar de Autobuses y Dress code: faltaba el icono de check (que es lo que gira al
      cargar) y el «Guardado» de confirmación que ya tienen Datos de la boda y las demás.
- [x] `S4o` D-65: módulos añadidos a un plan ya nacen visibles; «Añadir módulos nuevos» repara
      los que quedaron encendidos y ocultos y deja de escribir el módulo entero (borraba su `config`).
- [x] `S4p` Botones Guardar: el check que gira en los 16 que no lo tenían (panel y superadmin), el
      «Guardado» en historia, aportación de regalos y consejos, y un test que vigila que no vuelva
      a faltar (`guardar-con-icono.spec.ts`).
- [x] `S4q` **Bug de raíz de la web pública:** el navegador volvía a sanear lo ya publicado y los
      sitios del mapa (`lat`/`lng` planos, se leían de `coords`) y las personas importantes
      (`name`, se leía `displayName`) se caían todos: «Todavía no hay sitios». Saneador de
      ubicaciones válido para las dos formas, lector propio del cortejo publicado y un test del
      ciclo completo servidor → navegador para todas las listas (`proyeccion-ciclo.spec.ts`).
- [x] `S4r` D-66: regalos del básico dentro de la web sin identificarse (`getOpenGifts`),
      plazo del formulario por defecto a 7 días de la boda (servidor y panel) y «Volver al
      plazo por defecto» alineado con el campo.
- [x] `S4s` Web pública: el color de fondo de las 8 plantillas llega de borde a borde en escritorio
      (las secciones siguen centradas) y «Cómo llegar» enseña la dirección corta del buscador
      —sitio, calle y localidad— en vez de la cadena completa (`direccion-corta.ts`).
- [x] `S4t` Web pública: «Cómo llegar» pasa de lista apretada a tarjetas centradas por sitio
      (icono en círculo, tipo, nombre, hora en pastilla, dirección y nota tras un filtro,
      botón al pie); en escritorio caben en rejilla y los botones quedan alineados abajo.
- [x] `S4u` Panel: «Qué os falta» ya no pide cargar invitados ni cuenta quién no ha entrado o
      contestado en el plan básico (sin lista de invitados, D-66); queda fecha, publicar,
      módulos ocultos y portada (`pendientes.ts` + spec).
- [x] `S4v` Panel: en el plan básico el resumen cambia «vienen/han abierto la web» por
      «Confirmaciones recibidas» y «Han dicho que vienen», con botón «Ver las respuestas»
      (`/panel/rsvp/respuestas`). El extendido no cambia.
- [x] `S4w` Web pública (plan básico): si `getOpenGifts` dice «no disponible» (not-found), la
      sección de regalos desaparece entera —título incluido— en vez de enseñar «Algo ha ido
      mal». La portada y la sección comparten una sola llamada por boda (caché en la puerta).
      La fecha ya es obligatoria al dar de alta (formulario y `alta.ts`) y el panel no deja
      vaciarla, así que «Poned la fecha» solo sale en bodas antiguas.
- [x] `S4x` Panel · Diseño: el aviso «Autoguardado. El cambio se ve en vuestra web en unos
      segundos.» sube justo debajo de «Elegid una plantilla…», en verde y con check, para que
      se vea que no hay botón de guardar.
- [x] `S4y` Panel · Diseño: el aviso «Autoguardado» también en paleta y foto de portada; la
      vista previa de la portada baja a 14 rem de ancho para que los botones de acción queden
      a la vista sin hacer scroll.
- [ ] `S4k.b` Pendiente tras la tanda 32: presupuesto objetivo y exportación de proveedores;
      que «pagada» de la partida salga del proveedor (descartado, ver D-62); vista de
      «tareas de proveedores» en el resumen.
- [ ] `F3.5b` Exportar el libro de firmas a PDF maquetado (segunda pasada).

## Auditoría del plan básico (2026-11-24) — lo que falta para venderlo

Comprobado en el código, no de memoria. **A** = sin esto no se puede vender; **B** = lo
que hace que el básico se sienta completo; **C** = segunda ola. **G** = lo hace Gabriel.

- [ ] `B-A1` **El botón «Confirmar asistencia» no sale en bodas abiertas**, que es el modo
      por defecto del alta: `puedeConfirmar` exige sesión identificada
      (`public-shell.ts`, `cabecera-boda.ts`). `/confirmar` ya sabe pedir los dígitos.
- [ ] `B-A2` **Embudo de contratación**: landing real (hoy es un rótulo), formulario de
      solicitud (`weddingRequests`, no existe), bandeja en superadmin y pantalla con la
      referencia de Bizum (D-25). Une con `S1.1`, `F0.7.7` y la bandeja de F5.
- [ ] `B-A3` **RGPD mínimo**: aviso de privacidad y términos visibles (hoy una sola línea
      en acompañantes), aviso de almacenamiento local, contrato de encargo aceptado en el
      alta, botón de supresión de un invitado (§9.4, no existe) y retención + purga (D-01).
- [ ] `B-A4` **G** Correo transaccional: instalar «Trigger Email» y un SMTP (D-05). Sin él,
      el acceso de la pareja y los avisos solo salen copiando el enlace.
- [ ] `B-A5` **G** Producción: proyecto aparte (`RE.7`), hosting con wildcard (`F0.3.7`),
      cabecera COOP (`RE.8`), App Check en modo exigente.
- [ ] `B-A6` **G** Decidir qué incluye el plan básico y su precio (D-02). Hoy un básico
      puede activar todos los módulos salvo galería, quiz e historia.
- [ ] `B-A7` **G** Prueba de punta a punta en navegador y en móvil de 360 px (`F1.4c`).
- [ ] `B-A8` Fiabilidad: copia diaria de Firestore, monitorización de errores y alerta de
      coste. No hay ninguna función programada ni reporte de errores (§9.5).
- [ ] `B-B1` **Vista previa al compartir** (Open Graph) y título por boda: hoy WhatsApp
      enseña «Nupcialis» sin foto. Pide una función en el hosting (depende de `B-A5`).
- [ ] `B-B2` **Añadir al calendario** (`.ics` y enlace de Google) en la portada.
- [ ] `B-B3` **Recordatorio a quien no ha contestado** (WhatsApp en lote con plantilla) y
      `F1.4b`.
- [ ] `B-B4` **Personas importantes** (§8.12, sin construir).
- [ ] `B-B5` **«¿En qué mesa estoy?»** para el invitado, y exportar el esquema de mesas a
      PDF (§8.4, no existe).
- [ ] `B-B6` Navegación ligera de la página única del básico (hoy solo el botón flotante).
- [ ] `B-B7` Sesión de validación de las ~30 decisiones «pendiente de validar» (D-24…D-59).
- [ ] `B-C1` Segunda ola: moodboard del dress code, PDF del libro (`F3.5b`), inglés y
      catalán, PWA (D-08), reserva de regalos en modo abierto (D-13), endurecer cookies
      (`F0.4.8`), registro de accesos de la pareja (`F0.4.7`), reordenar arrastrando
      (`PL.7c`), lint de `functions/` en el CI.

Backlog recogido, pendiente de ordenar con Gabriel (ver D-44):

- [~] `S1.1` **Landing pública de venta** (D-65): **hecha la HOME** (una página vertical sin
  menú, tres plantillas, capturas del panel básico y extendido, sección de libertad de
  los novios) y su **editor en `/superadmin/home`**. Falta lo que depende de ti: el destino
  real de la llamada a la acción (hoy `mailto:`), el texto definitivo y los precios (D-02).
- [ ] `S1.3d` **Estadísticas por landing**: visitas y conversión.
- [x] `S1.3e` **Módulo financiero del superadmin** (D-48): `/superadmin/finanzas`,
      libro de cobros por boda (importe en céntimos, método, estado, fecha, número
      de factura, notas), totales, filtros y exportación a CSV. Colección
      `payments`, solo superadmin, escrita por funciones. Sin pasarela y sin
      precios inventados.
- [x] `S1.3f` **Recordatorios** (D-48): `/superadmin/recordatorios`. A los 60 días
      de la boda salen cuatro avisos —agradecimiento, encuesta, aviso de fotos y
      cierre para la pareja, y tarea de cierre para Gabriel— con el texto listo
      para copiar y «marcar como enviado» (`reminderMarks`). **No envía nada.**
- [ ] `S1.3g` **Notificaciones** push / correo. **Parcial** (D-53): ya hay cola `mail`
      y plantillas editables para los correos de acceso; faltan los recordatorios
      automáticos y el envío a invitados. (Antes apartada, D-48: necesitaba
      decidir proveedor de correo, REQUISITOS §11.5.) La pantalla de recordatorios
      ya tiene el texto y el estado; solo faltaría quién aprieta el botón.
- [x] `S1.6b` **Recuperación desde el superadmin** (D-48): ficha de la pareja
      (correos, teléfono si lo hay, último acceso) y botón «enlace de
      restablecimiento» (`generateCoupleResetLink`): genera el enlace y lo enseña
      para copiarlo y pasarlo por WhatsApp. No se envía correo: el Admin SDK solo
      genera enlaces.
- [x] `S1.7` **Historial de actividad** (`auditLog`) y **ficha de boda** en el
      superadmin (D-48): `/superadmin/bodas/:id` con resumen, contactos, cobros y
      las últimas 100 entradas del registro de esa boda (índice nuevo en
      `auditLog`).
- [x] `S1.4` **Repaso de seguridad** (HTTPS, auth, datos sensibles): recopilado en
      `docs/REVISION-SEGURIDAD.md`, con lo que falta por orden (CSP en modo informe,
      App Check exigente, Dependabot, copia de Firestore).

---

## La web de inicio (HOME) — 2026-11-25

- [x] `H.1` **Modelo y saneado** (`dominio/home.ts`, copia literal en `features/home/home.ts`):
      plantillas, fuentes, acentos, iconos, límites, contenido de fábrica y `sanearHome`
      (nunca lanza, idempotente, URL solo `https`/`mailto`/`tel`/ancla/ruta). 26 tests.
- [x] `H.2` **Servidor**: `saveHome` y `resetHome` (superadmin, auditadas, HTML saneado) sobre
      `platform/home`; reglas de Firestore (lectura pública, nadie escribe) y de Storage
      (`platform/home/`, solo superadmin) con `tests/rules/home.spec.ts`.
- [x] `H.3` **Página pública**: `np-home-pagina` (hero, promesa, pasos, capturas del panel,
      libertad, planes, cierre y pie), tres plantillas por variables CSS, container queries
      (la vista previa estrecha se ve en móvil), sprite de iconos `home` propio, carga de
      Google Fonts solo aquí. `np-home-landing` la monta en `/` con espera máxima de 2,5 s y
      respaldo de fábrica.
- [x] `H.4` **Editor `/superadmin/home`**: borrador + vista previa (escritorio/móvil), plantilla,
      tipografías, acento, Jodit en los textos con formato, selector de iconos, subida/cambio/
      quitado de imágenes con limpieza de Storage, SEO, publicar, descartar y restaurar.
- [x] `H.5` **Imágenes de serie** (`public/home/`): portada (panel + móvil) y capturas del
      panel básico y extendido, generadas del panel real con datos de muestra
      (`/dev/panel-basico`, `/dev/panel-extendido`).
- [ ] `H.6` **Iterar plantillas** (lo dijiste): más plantillas, otra paleta, animaciones, vídeo.
- [ ] `H.7` **Estadísticas de la HOME** (`S1.3d`) y formulario de solicitud (`B-A2`): hoy la
      llamada final es un `mailto:`.
- [ ] `H.8` **Alojar las tipografías** en vez de Google Fonts, si prefieres (RGPD, D-65.8).

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
- [x] **Reglas de aislamiento de `partners`**, con su batería (`contabilidad.spec.ts`).
      **`weddingRequests` no existe aún**: sin regla, la colección raíz está cerrada por
      defecto. Cuando llegue la bandeja (B-A2) traerá su regla y su test; sin test, no se mergea.
- [ ] **Ruta `/alta?ref=CODIGO`** del proveedor: el código ya se guarda y es único, pero la
      ruta pública que lo usa pertenece a la bandeja de solicitudes (F5).
- [x] **Lint de `functions/` en el CI.** El job `funciones` (compilar, lint, tests de
      dominio) estaba **mal sangrado, anidado dentro de `reglas`**, así que no corría por
      su cuenta; corregido.

---

## Registro de sesiones

| Fecha      | Qué se hizo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-25 | **La HOME de `nupcialis.com`** (D-65): una página vertical sin menú con tres plantillas, capturas reales del panel básico y extendido y la sección «vosotros sois los dueños», y su editor completo en `/superadmin/home` (borrador, vista previa, Jodit, iconos, imágenes, SEO, restaurar). El test de contraste cazó que el acento «oro» no se leía sobre fondos tintados. Arreglado además el job `funciones` del CI, que estaba anidado dentro de `reglas`.                                                  |
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
