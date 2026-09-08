# Nupcialis — Documento de requisitos

**Producto:** plataforma SaaS multi-tenant de organización de bodas, operada por los propios novios.
**Dominio:** `nupcialis.com`, con una web por boda en `<slug>.nupcialis.com`.
**Fecha del documento:** 2026-09-07
**Estado:** requisitos cerrados para Fase 1–4. Las decisiones marcadas como *pendientes* no bloquean el arranque.

---

## 1. Visión

Cada pareja que contrata Nupcialis recibe:

1. Una **web pública de su boda** en su propio subdominio, personalizable dentro de plantillas prediseñadas.
2. Un **panel de administración privado** donde activan y configuran los módulos que quieren usar.
3. Un conjunto de **herramientas de gestión** (invitados, mesas, presupuesto, proveedores, checklist) que solo ven ellos.

El principio rector del sistema es que **la intervención humana del operador sea cero en el ciclo de vida normal de una boda**. Dar de alta una boda, crear su espacio de datos, publicar su subdominio y sembrar su configuración inicial son operaciones automáticas.

### 1.1 Actores

| Actor | Descripción | Acceso |
|---|---|---|
| **Superadmin** | El operador de la plataforma (Gabriel). Da de alta bodas, ve el estado global, resuelve incidencias. | Panel de superadmin en `admin.nupcialis.com` |
| **Pareja (owner)** | Los dos miembros de la pareja. Cada uno con su propia cuenta, ambas sobre la misma boda. | Panel en `<slug>.nupcialis.com/panel` |
| **Invitado** | Persona invitada a la boda. Puede ser identificada o anónima según el modo de acceso configurado. | Web pública en `<slug>.nupcialis.com` |
| **Visitante anónimo** | Cualquiera con la URL, cuando el modo de acceso es abierto. | Web pública, solo lectura de contenido público |

---

## 2. Arquitectura

### 2.1 Decisiones cerradas

| Área | Decisión |
|---|---|
| Frontal | Angular (última versión estable), SPA, componentes standalone y signals |
| Datos | **Una sola base de datos Firestore** multi-tenant, raíz `weddings/{weddingId}` |
| Aislamiento | Reglas de seguridad de Firestore + custom claims en el token, **no** bases separadas |
| Autenticación | Firebase Auth (email/contraseña y Google para la pareja; custom tokens para invitados) |
| Ficheros | Firebase Storage, particionado por `weddings/{weddingId}/...` |
| Lógica de servidor | Cloud Functions for Firebase, solo como pegamento. **Sin backend con framework.** |
| Hosting del frontal | Plataforma con soporte de **dominio wildcard `*.nupcialis.com`** (Cloudflare Pages o Vercel) |
| Alta de bodas | Manual por el superadmin en Fase 1; self-service con pago en Fase 5 |
| i18n | Infraestructura de traducción desde el primer día, arrancando solo con español |
| Protección | Firebase App Check obligatorio en Firestore, Storage y Functions |
| Mapas | Mapa interactivo con Leaflet/MapLibre sobre OpenStreetMap; navegación por enlace profundo a Google Maps |
| Edición de contenidos | Secciones prediseñadas editadas sobre vista previa en vivo, con texto enriquecido acotado. **Sin maquetador libre.** |
| Formularios | El RSVP se construye a partir de preguntas configurables por la pareja, no de campos fijos |

### 2.2 Decisiones rechazadas y por qué

**Una base de datos por boda.** Descartado. Firestore admite 100 bases de datos por proyecto (ampliable solo por petición a soporte), lo que impone un techo de crecimiento con fricción administrativa. Firestore no degrada por volumen de datos: es horizontal y su límite relevante es ~1 escritura por segundo *por documento*, no por base. En cambio, cada base adicional multiplica el coste operativo permanente: reglas, índices, copias de seguridad y migraciones de esquema se ejecutan N veces. El aislamiento buscado se obtiene con reglas de seguridad verificables mediante tests automatizados sobre el emulador.

**Firebase Hosting para los subdominios.** Descartado. Firebase Hosting limita a **20 subdominios por dominio apex** por restricciones de emisión de certificados SSL, y exige dar de alta cada dominio manualmente — justo la intervención humana que el producto quiere eliminar. El frontal se sirve desde una plataforma con wildcard; Firestore, Auth, Storage y Functions siguen siendo de Firebase. No están acoplados.

### 2.3 Resolución de tenant

1. La aplicación lee `window.location.hostname` en el arranque.
2. Extrae el primer segmento como **slug** (`mariaygabriel.nupcialis.com` → `mariaygabriel`).
3. Consulta el índice público `slugs/{slug}` para obtener el `weddingId`.
4. Carga la proyección pública de la boda y arranca con ese tenant en contexto.

Reglas del slug:
- Minúsculas, dígitos y guiones. Sin acentos ni `ñ` (se normalizan: `maríaygabriel` → `mariaygabriel`).
- Entre 3 y 40 caracteres.
- Unicidad garantizada por transacción sobre la colección `slugs`.
- **Reservados** y no asignables: `www`, `admin`, `api`, `app`, `panel`, `static`, `cdn`, `mail`, `blog`, `soporte`, `ayuda`, `demo`, `test`, `staging`.
- Un slug liberado (boda cancelada) queda en cuarentena y no se reasigna automáticamente.

Entornos: `*.dev.nupcialis.com` para desarrollo y `*.staging.nupcialis.com` para preproducción, cada uno contra su propio proyecto de Firebase.

### 2.4 Aplicaciones

Un único proyecto Angular que sirve tres experiencias, resueltas por el host y la ruta:

| Superficie | URL | Contenido |
|---|---|---|
| Web pública de la boda | `<slug>.nupcialis.com/` | Plantilla configurada por la pareja, módulos públicos activos |
| Panel de la pareja | `<slug>.nupcialis.com/panel` | Configuración y herramientas de gestión, requiere sesión de owner |
| Panel de superadmin | `admin.nupcialis.com` | Alta y supervisión de bodas, requiere claim de superadmin |
| Landing comercial | `nupcialis.com` y `www.nupcialis.com` | Página de venta del producto |

El bundle del panel se carga de forma diferida: un invitado que abre la web de la boda no debe descargar el código de administración.

---

## 3. Autenticación y autorización

### 3.1 Pareja

- Métodos: **email y contraseña** y **Google**.
- **Dos cuentas por boda.** El documento de la boda mantiene `ownerUids: string[]`. Ambas cuentas tienen permisos idénticos; no hay jerarquía entre los miembros de la pareja.
- Custom claims en el token: `{ weddingId: string, role: 'owner' }`.
- Los claims los asigna una Cloud Function con el Admin SDK. Nunca se escriben desde el cliente.
- Un usuario pertenece a una sola boda. Si en el futuro alguien organizara dos bodas, se resolverá con una lista de membresías; hoy no es un requisito.

### 3.2 Superadmin

- Claim `{ superadmin: true }`, asignado manualmente fuera de banda a una lista blanca de UIDs.
- Acceso a todas las bodas, exclusivamente desde `admin.nupcialis.com`.
- Toda acción del superadmin sobre una boda queda registrada en un log de auditoría.

### 3.3 Invitados — modos de acceso configurables

El modo de acceso lo elige la pareja en la configuración de su boda. Es una propiedad de la boda, no del módulo.

**Modo A — Entrada abierta.** Cualquiera con la URL ve la web. No hay identificación. Los módulos que requieren identidad (RSVP nominal, libro de firmas atribuido, subida de fotos) quedan deshabilitados o pasan a modo anónimo según su propia configuración.

**Modo B — Nombre + últimos 4 dígitos del teléfono.** El invitado escribe su nombre y los cuatro últimos dígitos de su móvil. Se contrastan contra la lista de invitados cargada por la pareja.

**Modo C — Teléfono completo.** El invitado escribe su número de móvil y se contrasta contra la lista de invitados.

**Requisito de seguridad innegociable para los modos B y C:** la verificación se resuelve **íntegramente en una Cloud Function** que devuelve un *custom token* de Firebase con claims `{ weddingId, guestId, role: 'guest' }`. El cliente **nunca** consulta teléfonos ni nombres contra Firestore, porque una regla que permita esa consulta permite descargar la lista de invitados completa.

Controles sobre la función de acceso de invitados:
- App Check obligatorio.
- Límite de intentos por IP y por boda (por ejemplo, 10 intentos en 15 minutos), con retardo creciente.
- Respuesta genérica en caso de fallo: no se distingue entre "ese invitado no existe" y "los dígitos no coinciden", para evitar enumeración.
- Los teléfonos se almacenan normalizados en E.164 y se indexa además `phoneLast4` para el modo B.
- El token de invitado es de vida corta (24 h) y renovable repitiendo la verificación.
- Se registra cada acceso concedido en un log por boda, visible para la pareja.

**Acompañantes con acceso propio.** Cuando la pareja lo permite, un invitado puede añadir acompañantes desde su propia sesión, y esos acompañantes **acceden a la web con identidad propia**. No son un campo del titular: son invitados de pleno derecho, con su sesión, su mesa, su menú, su respuesta al formulario y su contador de accesos. Consecuencias: en los modos B y C el titular debe aportar el teléfono del acompañante para que este pueda identificarse, y el acompañante **hereda los grupos del titular**, incluido el grupo de audiencia restringida de la galería si lo hubiera. Ver §5.5.

**Riesgo aceptado y documentado:** los modos B y C son *identificación*, no autenticación fuerte. Quien conozca el nombre y el teléfono de un invitado puede suplantarlo. Es proporcionado al contexto (una boda), pero debe constar en la política de privacidad que se presenta a la pareja.

---

## 4. Provisioning: alta de una boda

Operación atómica, ejecutada por una Cloud Function `provisionWedding` invocada por el superadmin (Fase 1) o por el webhook de pago (Fase 5).

Entrada: nombres de la pareja, slug deseado, fecha de la boda, emails de las dos cuentas, plan contratado.

Pasos:
1. Validar y normalizar el slug; comprobar que no está reservado.
2. En una **transacción**: crear `slugs/{slug}` y el documento `weddings/{weddingId}`. Si el slug ya existe, la operación falla completa y se propone una alternativa.
3. Sembrar la configuración por defecto: plantilla, paleta, módulos activos según el plan, modo de acceso `open`.
   Además se siembran: las **preguntas de fábrica del formulario de RSVP**, un **banco de preguntas de ejemplo del quiz**, la **plantilla de checklist** con fechas relativas a la fecha de la boda y un **grupo por defecto** de audiencia pública.
4. Crear la proyección pública `weddings/{weddingId}/public/site`.
5. Crear o localizar las cuentas de Firebase Auth de los dos emails y asignarles los claims.
6. **Dar de alta `<slug>.nupcialis.com` en los dominios autorizados de Firebase Auth**, mediante el Identity Toolkit Admin API v2 (`PATCH admin/v2/projects/{projectId}/config`) con cuenta de servicio. Firebase Auth no admite comodines ahí, así que sin este paso el acceso con Google no funcionaría en la boda nueva. Es una lectura del listado actual, más el dominio, y un patch del conjunto completo.
7. Enviar a cada miembro de la pareja su enlace de acceso inicial.
8. Registrar la operación en el log de auditoría.

**No se toca DNS,** pero sí se toca la configuración de Auth. El registro wildcard y
el certificado ya cubren cualquier subdominio nuevo; lo que no cubre nadie
automáticamente es la lista de dominios autorizados de Firebase Auth, y por eso el
paso 6 existe.

**Original:** El registro wildcard `*.nupcialis.com` ya cubre cualquier subdominio nuevo, y el certificado wildcard también. Este es el motivo de la decisión de hosting de la sección 2.2.

Estados de una boda: `draft` → `active` → `archived`. Una boda en `draft` no es visible públicamente aunque su slug resuelva.

---

## 5. Modelo de datos (Firestore)

Todo dato de una boda cuelga de `weddings/{weddingId}`. No existe ninguna colección de nivel raíz que mezcle datos de bodas distintas, salvo los índices globales explícitos.

### 5.1 Colecciones raíz globales

```
slugs/{slug}
  weddingId: string
  status: 'active' | 'quarantined'
```
Lectura pública, escritura solo desde Cloud Functions. Es el único documento que un visitante anónimo puede leer antes de resolver el tenant.

```
auditLog/{entryId}
  actorUid, actorRole, action, weddingId, payload, createdAt
```
Solo superadmin. Recoge tanto las acciones del superadmin como los **accesos de los novios al panel**.

### 5.2 Documento de la boda

```
weddings/{weddingId}
  slug: string
  status: 'draft' | 'active' | 'archived'
  plan: 'basic' | 'premium'
  couple: { partnerA: string, partnerB: string }
  weddingDate: Timestamp
  timezone: string            // 'Europe/Madrid'
  locale: string              // 'es'
  ownerUids: string[]
  guestAccessMode: 'open' | 'name_phone4' | 'phone'
  allowGuestAddedCompanions: bool     // el invitado puede añadir acompañantes
  theme: {
    templateId: string
    palette: { primary, secondary, background, surface, text, accent }
    fonts: { heading: string, body: string }
    heroImagePath: string | null
  }
  modules: {
    publicSite:  { enabled, config }
    rsvp:        { enabled, config }
    guests:      { enabled, config }
    tables:      { enabled, config }
    map:         { enabled, config }
    gallery:     { enabled, config }
    quiz:        { enabled, config }
    gifts:       { enabled, config }
    playlist:    { enabled, config }
    guestbook:   { enabled, config }
    timeline:    { enabled, config }
    faqs:        { enabled, config }
    accommodation: { enabled, config }
    dressCode:   { enabled, config }
    weddingParty:{ enabled, config }
    budget:      { enabled, config }
    vendors:     { enabled, config }
    checklist:   { enabled, config }
  }
  counters: {
    guestsTotal, guestsConfirmed, guestsDeclined, guestsPending,
    seatsAssigned, photosPending, quizPlays, uniqueLogins
  }
  createdAt, updatedAt
```

Los `counters` los mantiene un trigger de servidor, nunca el cliente. Evitan agregados costosos en el panel.

### 5.3 Proyección pública

```
weddings/{weddingId}/public/site
  status, coupleNames, weddingDate, theme, locale
  guestAccessMode
  publicModules: { gallery, gifts, playlist, guestbook, timeline, rsvp, map, quiz }
  content: { sections: [...] }
```

Es el **único** documento de la boda legible sin autenticación. Existe para que la regla de lectura pública no exponga contadores, plan ni configuración interna. La mantiene sincronizada un trigger cuando cambia la boda.

### 5.4 Grupos de invitados

Los grupos dejan de ser una etiqueta de texto libre y pasan a ser entidades con comportamiento propio, porque de ellos depende la visibilidad de la galería.

```
weddings/{weddingId}/guestGroups/{groupId}
  name: string                          // 'Universidad', 'Familia de la novia'
  side: 'A' | 'B' | 'both'
  photoAudience: 'public' | 'restricted'
  allowPublicOptIn: bool                // si es restricted, ¿puede un miembro publicar para todos?
  color: string                         // para distinguirlo en el plano de mesas
  order: number
```

**`photoAudience: 'restricted'` es el mecanismo de partición de audiencia de la galería.** Ver §8.5.

### 5.5 Invitados

Cambio importante respecto a la primera versión: **los acompañantes dejan de estar embebidos y pasan a ser documentos de invitado de pleno derecho.** El motivo: un acompañante añadido por un invitado también accede a la web, y por tanto necesita identidad propia, sesión propia, mesa propia, menú propio y contador de accesos propio. Mantenerlos embebidos obligaría a duplicar toda esa lógica.

```
weddings/{weddingId}/guests/{guestId}
  fullName: string
  normalizedName: string          // minúsculas, sin acentos, para el matching del modo B
  nickname: string                // mote, es lo que se muestra en la mesa
  phone: string | null            // E.164
  phoneLast4: string | null
  email: string | null
  side: 'A' | 'B' | 'both'
  groupIds: string[]              // referencias a guestGroups
  ageGroup: 'adult' | 'child' | 'baby'

  // Relación titular / acompañante
  isCompanion: bool
  invitedById: string | null      // guestId del titular que lo añadió
  addedBy: 'owner' | 'guest'      // quién lo dio de alta
  maxCompanions: number           // solo en titulares; 0 = no puede añadir

  // RSVP
  rsvpStatus: 'pending' | 'confirmed' | 'declined'
  rsvpAt: Timestamp | null
  rsvpAnswers: { [questionId: string]: any }   // respuestas al formulario dinámico

  // Banquete
  menu: string
  allergies: string
  tableId: string | null

  // Acceso
  active: bool
  loginCount: number              // nº de entradas a la web
  firstLoginAt: Timestamp | null
  lastLoginAt: Timestamp | null
  quizPlayCount: number           // nº de partidas jugadas al quiz
  quizBestPoints: number | null

  isOwnerGuest: bool              // los propios novios como invitados (permisos extra en galería)
  notes: string                   // privado de la pareja
  createdAt, updatedAt
```

Reglas del alta de acompañantes por parte del invitado:

- Solo si `allowGuestAddedCompanions` está activo en la boda **y** el titular tiene `maxCompanions > 0`.
- El alta la ejecuta una Cloud Function, nunca el cliente: valida el cupo restante contando los acompañantes ya creados y crea el documento con `addedBy: 'guest'`.
- El acompañante **hereda los `groupIds` del titular**. Si el titular es del grupo "Universidad", su acompañante también lo es, y por tanto ve y publica con esa misma audiencia. Esto es deliberado: si no, el acompañante de un miembro del grupo restringido se convertiría en una fuga.
- En modos de acceso B y C el titular debe aportar el teléfono del acompañante para que este pueda entrar. En modo A no hace falta.
- La pareja ve en el panel qué invitados fueron añadidos por otros invitados y puede eliminarlos.
- **RGPD:** el titular está facilitando datos de un tercero. El formulario debe informarlo expresamente y la finalidad debe constar en el aviso de privacidad.

### 5.6 Mesas

```
weddings/{weddingId}/tables/{tableId}
  name: string
  shape: 'round' | 'rect'
  minSeats: number
  maxSeats: number
  position: { x: number, y: number, rotation: number }
  order: number
  notes: string
```

`position` se usa desde el principio: las mesas se colocan en un lienzo genérico, no en el plano de ninguna finca concreta. Ver §8.4.

### 5.7 Ubicaciones (mapa)

```
weddings/{weddingId}/locations/{locationId}
  type: 'preboda' | 'ceremonia' | 'banquete' | 'alojamiento' | 'parking' | 'otro'
  name: string
  address: string
  coords: { lat: number, lng: number }
  description: string
  time: Timestamp | null
  icon: string
  order: number
  visibleToGuests: bool
```

### 5.8 Formulario dinámico de RSVP

```
weddings/{weddingId}/formQuestions/{questionId}
  label: string
  helpText: string
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'boolean'
  options: [ { value: string, label: string } ]     // select, radio, checkbox
  required: bool
  target: 'guest' | 'companion' | 'both'            // a quién se le pregunta
  mapsTo: string | null      // 'menu', 'allergies'... vincula la respuesta a un campo del invitado
  visibleIf: { questionId: string, equals: any } | null   // visibilidad condicional
  order: number
  enabled: bool
  isSystem: bool             // las precargadas de fábrica; se pueden desactivar pero no borrar
```

`mapsTo` es lo que evita que el formulario dinámico rompa el resto del producto: la respuesta a la pregunta de menú sigue aterrizando en `guests.menu`, y por tanto la exportación al catering y los filtros del panel siguen funcionando aunque la pareja reordene o reetiquete las preguntas.

### 5.9 Quiz

```
weddings/{weddingId}/quizQuestions/{questionId}
  question: string
  correctAnswer: string
  wrongAnswers: [string, string, string]
  difficulty: 1 | 2 | 3           // 10, 20 o 30 puntos
  hint: string | null
  enabled: bool
  order: number

weddings/{weddingId}/quizResults/{resultId}
  guestId: string
  displayName: string             // mote del invitado
  points: number
  elapsedMs: number               // desempate: a igual puntuación gana el más rápido
  answeredCount: number
  playedAt: Timestamp
```

### 5.10 Resto de colecciones por boda

```
photos/{photoId}
  storagePath, thumbPath, width, height
  uploadedBy: { guestId, displayName }
  audienceGroupId: string | null    // null = visible para todos
  caption
  status: 'pending' | 'approved' | 'rejected'
  createdAt, moderatedAt, moderatedBy

gifts/{giftId}                 // lo que la pareja pide (público)
giftsReceived/{id}             // lo que la pareja recibe (privado)   -> §8.8
faqs/{id}                                                             -> §8.9
accommodations/{id}                                                   -> §8.10
weddingParty/{id}                                                     -> §8.12
timelineEvents/{id}                                                   -> §8.13
vendors/{id}                                                          -> §8.16
checklistItems/{id}                                                   -> §8.17
playlistSuggestions/{id}   title, artist, suggestedBy, votes[], status
guestbookEntries/{id}      guestId, authorName, message, status, createdAt
budgetItems/{id}           category, concept, estimatedCost, actualCost, paid, dueDate, vendorId, icon, color, notes

guestAccessLog/{id}
  guestId, mode, ip, userAgent, createdAt
```

El dress code no tiene colección propia: vive en `modules.dressCode.config`, con su moodboard en Storage, porque es un contenido único por boda y no una lista.

`guestAccessLog` guarda el detalle de cada entrada; el contador agregado vive en `guests.loginCount` para que el panel no tenga que agregar nada al pintarse.

### 5.11 Índices

Declarados en `firestore.indexes.json`. Los previsibles:
- `guests` por `rsvpStatus` + `fullName`, por `tableId` + `fullName`, por `groupIds` (array-contains) + `fullName`, por `invitedById`
- `photos` por `status` + `audienceGroupId` + `createdAt`
- `quizResults` por `points` desc + `elapsedMs` asc, y por `guestId` + `playedAt`
- `giftsReceived` por `thanked` + `receivedAt`; `checklistItems` por `vendorId` + `dueDate`
- `faqs`, `accommodations`, `weddingParty`, `timelineEvents` por `enabled` / `visibleToGuests` + `order`
- `formQuestions` por `enabled` + `order`
- `budgetItems` por `category` + `dueDate`; `checklistItems` por `done` + `dueDate`

### 5.12 Almacenamiento

```
weddings/{weddingId}/hero/...
weddings/{weddingId}/gallery/{photoId}/original.jpg
weddings/{weddingId}/gallery/{photoId}/thumb.webp
weddings/{weddingId}/vendors/{vendorId}/{contrato}.pdf
```

Cuotas por boda según plan: espacio total, tamaño máximo por fichero (10 MB por foto de invitado) y tipos MIME permitidos, aplicados en reglas de Storage y verificados en el trigger de subida.

---

## 6. Reglas de seguridad

Principios:

1. **Denegar por defecto.** La última regla es `match /{document=**} { allow read, write: if false; }`.
2. **El `weddingId` viene siempre del token**, nunca de un campo que el cliente pueda falsear.
3. **La pareja no puede escribir campos de sistema**: `counters`, `plan`, `status`, `ownerUids`, `slug`, `loginCount`.
4. **El invitado solo toca su propio documento** y solo los campos de su respuesta.
5. **Todo lo que dependa de la identidad de otros invitados se resuelve en Cloud Function.** Las colecciones `guests` y `photos` están cerradas a lectura directa desde el cliente, sin excepción.

El punto 5 merece detalle, porque es donde está el riesgo real del producto:

- `guests` cerrada: si el cliente pudiera consultar invitados, podría descargarse nombres y dígitos de teléfono de toda la boda.
- `photos` cerrada: la visibilidad depende del grupo del invitado que pregunta, y eso solo se puede evaluar con fiabilidad en servidor. Una regla que dejara leer `photos` filtrando por `audienceGroupId` seguiría permitiendo pedir explícitamente las fotos del grupo restringido.

Esqueleto:

```
function isOwner(wid) {
  return request.auth != null
      && request.auth.token.weddingId == wid
      && request.auth.token.role == 'owner';
}
function isGuestOf(wid) {
  return request.auth != null
      && request.auth.token.weddingId == wid
      && request.auth.token.role == 'guest';
}
function isSuperadmin() {
  return request.auth != null && request.auth.token.superadmin == true;
}

match /slugs/{slug}        { allow read: if true;  allow write: if false; }

match /weddings/{wid} {
  allow read:   if isOwner(wid) || isSuperadmin();
  allow update: if isOwner(wid) && onlyEditableFields();
  allow create, delete: if false;

  match /public/site       { allow read: if true;  allow write: if false; }

  match /guests/{g}        { allow read, write: if false; }   // siempre por Cloud Function
  match /photos/{p}        { allow read, write: if false; }   // siempre por Cloud Function

  match /guestGroups/{g}   { allow read: if isOwner(wid) || isGuestOf(wid);
                             allow write: if isOwner(wid); }

  match /quizQuestions/{q} { allow read: if isGuestOf(wid) || isOwner(wid);
                             allow write: if isOwner(wid); }
  match /quizResults/{r}   { allow read: if isGuestOf(wid) || isOwner(wid);
                             allow create: if false; }        // lo escribe la función, para que nadie se invente puntos
  ...
}
```

**Requisito de calidad:** las reglas se prueban con `@firebase/rules-unit-testing` contra el emulador. La batería mínima, para cada colección: el owner de la boda A no puede leer ni escribir nada de la boda B; un invitado no puede leer la lista de invitados; un invitado no puede leer fotos de un grupo restringido al que no pertenece; un anónimo solo puede leer `slugs` y `public/site`. **Esta batería es lo que sustituye al aislamiento por bases de datos separadas: es requisito de release, no opcional.**

---

## 7. Cloud Functions

Solo como pegamento. Todas con App Check activado.

| Función | Tipo | Responsabilidad |
|---|---|---|
| `provisionWedding` | callable (superadmin) | Alta atómica: slug, documento, cuentas, claims, semillas (checklist, preguntas de formulario, quiz de ejemplo) |
| `setUserClaims` | callable (superadmin) | Asignar o revocar `weddingId` y `role` |
| `authorizeWeddingDomain` | interna, usada por `provisionWedding` | Añadir `<slug>.nupcialis.com` a los dominios autorizados de Firebase Auth vía Identity Toolkit Admin API. Idempotente: lee el listado, añade si falta, hace patch |
| `guestLogin` | callable (público) | Verificar identidad en modos B y C, emitir custom token, **incrementar `loginCount` y escribir en `guestAccessLog`** |
| `addCompanion` | callable (guest) | Alta de acompañante validando cupo, heredando grupos y registrando `addedBy: 'guest'` |
| `submitRsvp` | callable (guest) | Validar respuestas contra `formQuestions`, aplicar `mapsTo`, guardar y recalcular contadores |
| `listPhotos` | callable (guest) | Devolver solo las fotos que ese invitado puede ver según su grupo |
| `uploadPhoto` | callable (guest) | Asignar `audienceGroupId` según el grupo del que sube, aplicar política de moderación |
| `deletePhoto` | callable (guest/owner) | Borrado propio; los novios pueden borrar cualquiera |
| `submitQuizResult` | callable (guest) | Corregir el cuestionario **en servidor** y guardar la puntuación |
| `logOwnerAccess` | trigger / callable | Registrar en `auditLog` cada entrada de un novio al panel |
| `syncPublicProjection` | trigger Firestore | Mantener `public/site` al día |
| `recomputeCounters` | trigger Firestore | Mantener `counters` |
| `onPhotoUploaded` | trigger Storage | Miniatura, validación de MIME y tamaño |
| `sanitizeRichContent` | trigger Firestore | Limpiar el HTML de los contenidos editados por la pareja antes de publicarlos |
| `exportGuests` | callable (owner) | XLSX de invitados con menús, alergias y mesas |
| `archiveWeddings` / `scheduledBackup` | programadas | Ciclo de vida y copias |

**Nota sobre `submitQuizResult`:** la corrección tiene que ocurrir en servidor. Si el cliente envía "he sacado 300 puntos", cualquiera gana el ranking desde la consola del navegador. El cliente envía las respuestas elegidas; la función las compara con `correctAnswer` y calcula la puntuación. El prototipo actual corrige en cliente y escribe el ranking directamente; esto es una mejora consciente sobre él.

---

## 8. Módulos

Todos comparten el mismo contrato: se activan desde el panel, tienen su bloque `config` en el documento de la boda y su código se carga de forma diferida.

### 8.1 Web pública y edición de contenidos

- Selección entre **varias plantillas prediseñadas**. La pareja elige plantilla y configura; no maqueta desde cero.
- Tokens de diseño: paleta (6 colores), pareja de tipografías, imagen de portada.
- Secciones activables y reordenables: portada con cuenta atrás, nuestra historia, ceremonia, banquete, cómo llegar, alojamiento, dress code, preguntas frecuentes, contacto.
- Estados borrador y publicado, con vista previa.
- `noindex` por defecto, con interruptor.

**Modelo de edición .** Se descarta construir un maquetador libre tipo WordPress y se adopta un modelo intermedio:

1. **Edición sobre vista previa en vivo.** El panel muestra la web real de la boda a un lado. La pareja pulsa sobre una sección y edita sus campos; el resultado se refleja al instante. Se percibe como edición visual sin serlo: no se arrastran bloques por un lienzo, se rellenan campos de secciones prediseñadas.
2. **Activar, desactivar y reordenar secciones** mediante arrastre en una lista lateral.
3. **Editor de texto enriquecido acotado** solo en los campos que lo merecen (nuestra historia, respuestas de FAQ, textos de bienvenida). Barra limitada a negrita, cursiva, enlaces, listas y encabezados de nivel bajo. Nada de HTML libre ni de estilos en línea que rompan la plantilla.

Motivo: un maquetador libre es el módulo más caro del producto y el que más fácil produce webs feas, que es justo lo contrario de lo que vende plantillas prediseñadas. El modelo propuesto da la sensación de edición visual a una fracción del coste y garantiza que ninguna boda quede mal.

**Sobre Jodit.** Es MIT y sirve. Dos avisos: la versión 4.7.6 que mencionaste está bastante por detrás de la actual (4.13.x), y el wrapper oficial de Angular (`jodit-angular`) está declarado sin mantenimiento activo por su propio autor, que advierte en el repositorio que no usa Angular y no puede corregir fallos con agilidad; el wrapper mantenido por la comunidad es `ngx-jodit`. Para una barra tan acotada como la que necesitamos, Jodit puede ser más peso del necesario. Decisión pendiente de una prueba comparativa (§12).

**Requisito de seguridad innegociable:** todo HTML producido por el editor se **sanea en servidor** antes de publicarse, en el trigger `sanitizeRichContent`. Ese contenido lo van a ver cientos de invitados; renderizarlo en Angular exige saltarse el sanitizador del framework, y confiar solo en el saneado de cliente convierte el editor en un XSS almacenado.

### 8.2 RSVP con formulario dinámico

- El formulario se construye a partir de `formQuestions`. La pareja **mantiene, edita, reordena, desactiva o añade** preguntas desde el panel.
- **Preguntas precargadas de fábrica** al crear la boda: asistencia, acompañantes, menú, alergias e intolerancias, necesita autobús, necesita alojamiento, canción que pedirías, mensaje para la pareja.
- Tipos disponibles: texto corto, texto largo, desplegable, opción única (radio), selección múltiple, número, fecha y sí/no.
- **Visibilidad condicional**: una pregunta puede mostrarse solo si otra tiene cierto valor (el menú solo se pregunta a quien confirma asistencia).
- **Destinatario configurable**: hay preguntas que se hacen al titular y otras a cada comensal, incluidos los acompañantes.
- Las preguntas de sistema se pueden desactivar y reetiquetar, pero no borrar, porque otras partes del producto dependen de su `mapsTo`.
- Validación de obligatoriedad y de tipo, tanto en cliente como en la función `submitRsvp`.
- Fecha límite configurable; el invitado puede modificar su respuesta hasta entonces.
- En modos B y C el formulario llega pre-rellenado con el nombre del invitado.
- Panel de control para la pareja con confirmados, declinados y pendientes, filtros y exportación.

### 8.3 Invitados y acompañantes

- Alta manual e **importación desde CSV/Excel** con previsualización, mapeo de columnas y detección de duplicados por teléfono.
- Asignación de **grupos** (§5.4), con indicación visual de cuáles son de audiencia restringida.
- **Enlace de invitación por invitado y botón de compartir por WhatsApp** con mensaje predefinido y editable.
- **Acompañantes añadidos por el propio invitado** cuando la pareja lo permite: cupo por titular, herencia de grupos, teléfono obligatorio en modos B y C, y visibilidad en el panel de quién añadió a quién.
- **Contador de accesos por invitado**: número de entradas, primera y última. Lista ordenable por accesos, con vista de quién no ha entrado nunca — útil para saber a quién hay que reenviar el enlace.
- Exportación a XLSX con menús, alergias y mesas para el catering.

### 8.4 Mesas

Confirmado el enfoque de arrastrar y soltar, sin plano de finca.

- Mesas **redondas y rectangulares**, cada una con **mínimo y máximo de comensales**.
- Disposición sobre un **lienzo genérico**: la pareja coloca y ordena las mesas libremente, pero el lienzo **no representa el salón de ninguna hacienda concreta**. Sin fondo de plano, sin paredes, sin escenario. Es un esquema de agrupación, no un plano de arquitectura.
- **Arrastrar invitados** desde la lista de confirmados sin asignar hasta una mesa, y entre mesas.
- Avisos, no bloqueos: mesa por debajo del mínimo, mesa por encima del máximo, invitado confirmado sin mesa, acompañante separado de su titular.
- Coloreado por grupo para detectar de un vistazo mesas mal mezcladas.
- Exportación del esquema a PDF y de la asignación a XLSX.
- Fuera del alcance: plano real de la finca, sillas individuales, dimensiones a escala. Se valorará como extra más adelante.

### 8.5 Galería con audiencias por grupo

Es el módulo con la lógica de permisos más delicada del producto.

**Comportamiento.** Cada grupo tiene una `photoAudience`:

- **`public`** — lo que suben sus miembros lo ve todo el mundo.
- **`restricted`** — lo que suben sus miembros **solo lo ven los miembros de ese mismo grupo** y la pareja.

La visibilidad es **asimétrica y deliberada**: quien pertenece a un grupo restringido ve las fotos de su grupo **y** todas las públicas; quien no pertenece no ve nada de ese grupo. En el ejemplo de la boda: los del grupo "Universidad" ven todo, y la tía Consuelo ve todo menos lo que ha subido la peña de la universidad.

**Implementación.** Cada foto guarda `audienceGroupId`. Al subir, el servidor lo calcula a partir del grupo restringido del que sube; el cliente no lo elige. Si el grupo tiene `allowPublicOptIn`, quien sube puede marcar una foto concreta como pública, pero nunca al revés desde el cliente.

**La visibilidad se resuelve siempre en `listPhotos`, en servidor.** La colección está cerrada en las reglas. El prototipo ya lo hace así con su flag `tsf`, y esa decisión se mantiene; lo que cambia es que el flag booleano de un único grupo se generaliza a N grupos configurables por la pareja.

**Restricción de modelo:** un invitado puede pertenecer a varios grupos, pero **a lo sumo a uno restringido**. La validación va en el momento de asignar grupos. Sin ella, el destino de una foto sería ambiguo.

Además:
- **Moderación opcional** por interruptor: publicación inmediata o cola de aprobación. Es independiente de las audiencias: una cosa es *quién puede verla* y otra *si está aprobada*.
- La pareja lo ve absolutamente todo, de todos los grupos, y puede borrar cualquier foto.
- Miniaturas en servidor, WebP con `srcset`, límite de tamaño por fichero y cuota por boda.
- Descarga masiva en ZIP para la pareja.
- Botón de denuncia para cualquier invitado.

### 8.6 Mapa interactivo

- La pareja da de alta **ubicaciones** con tipo (preboda, ceremonia, banquete, alojamiento, parking, otro), nombre, dirección, descripción y hora.
- **Selector de coordenadas**: buscar la dirección y ajustar el marcador arrastrándolo, para que el pin caiga en la entrada correcta de la finca y no en mitad del campo.
- La web pública muestra un **mapa con todos los marcadores visibles**, cada uno con su icono por tipo, y una ficha al pulsar con la descripción, la hora y los botones **"Abrir en Google Maps"** y **"Cómo llegar"**, que abren la app nativa de mapas del móvil.
- Lista de ubicaciones bajo el mapa, ordenable, para quien prefiera leer.
- Las ubicaciones se enlazan con los eventos del timeline (§8.10), de modo que la agenda del día sabe dónde ocurre cada cosa.

**Elección técnica.** Recomendación: **Leaflet o MapLibre con teselas de OpenStreetMap** para el mapa interactivo, y **enlaces profundos a Google Maps** para la navegación. Motivo: no requiere clave de API ni facturación, no hay coste por carga de mapa, y el invitado acaba igualmente en Google Maps cuando pulsa "Cómo llegar", que es lo que realmente pide el requisito. La alternativa —Maps JavaScript API— exige clave con facturación activada, se paga por carga y obliga a restringir por *referrer*; con subdominios wildcard la restricción tendría que ser `*.nupcialis.com/*`, que es tan amplia que protege poco. Si se decide usarla igualmente, la clave debe vivir en configuración de servidor y no en el bundle.

### 8.7 Quiz de la boda

Se replica el juego del prototipo `wedding-quiz` y se convierte en módulo multi-tenant.

**Mecánica heredada del prototipo:**
- Preguntas de respuesta única con **una correcta y tres falsas**, presentadas en orden aleatorio.
- **Tres niveles de dificultad** que valen 10, 20 y 30 puntos, representados con estrellas.
- Cada partida toma **N preguntas al azar** del banco (10 por defecto, configurable).
- Barra de progreso y avance pregunta a pregunta, sin volver atrás.
- **Ranking** de las mejores puntuaciones (10 por defecto, configurable), con **desempate por tiempo**: a igual puntuación, gana quien lo resolvió más rápido. El tiempo no se muestra al jugador.
- Pantalla final con puntuación y posición en el ranking.

**Añadidos respecto al prototipo:**
- **Corrección en servidor** (§7). El prototipo corrige y puntúa en cliente y escribe el ranking directamente contra Firestore; en un producto vendido eso permite falsear la puntuación desde la consola del navegador.
- **Identificación del jugador por su sesión de invitado**, no escribiendo el nombre. El ranking muestra el mote.
- Configurable por la pareja: número de preguntas por partida, tamaño del ranking, si se permite repetir partida y si el ranking es visible para los invitados.
- Pista opcional por pregunta.

**Gestión en el panel privado:**
- Alta, edición, duplicado, activación y borrado de preguntas, con la correcta y las tres falsas y el nivel de dificultad.
- Importación de un banco de preguntas desde CSV y **banco de ejemplo sembrado al crear la boda**, para que la pareja tenga de dónde partir.
- Vista previa de la partida tal como la verá el invitado.
- Consulta y **vaciado del ranking**, útil para dejarlo limpio antes del día de la boda.
- **Partidas por invitado**: cada invitado acumula `quizPlayCount` y `quizBestPoints`. La pareja ve una tabla de quién ha jugado y cuántas veces, ordenable, con los que no han jugado nunca destacados. Sirve para dos cosas: medir si el juego está funcionando durante el banquete y, si el ranking premia con algo, saber quién se lo está trabajando.
- Cada partida se guarda como un `quizResults` propio, no se sobrescribe: así el historial por invitado es real y el ranking puede mostrar la mejor o la primera según se configure.
- Estadísticas globales: partidas jugadas, jugadores únicos, preguntas más falladas y preguntas que nadie falla (candidatas a retirar por fáciles).

### 8.8 Regalos: lista, aportación y regalos recibidos

Tres piezas distintas que conviene no confundir: lo que la pareja **pide**, lo que el invitado **reserva** y lo que la pareja **recibe**. Solo la tercera es privada.

**Aportación (público).** La pareja publica su IBAN y su Bizum con un mensaje personalizado. **El dinero va directo a su cuenta; la plataforma no intermedia ni custodia fondos en ningún momento.**

**Lista de regalos (público).** Productos con título, descripción, imagen, enlace externo y precio orientativo. Un invitado puede reservar uno para evitar duplicados; la reserva es anónima para el resto de invitados. Los dos modos pueden convivir.

**Regalos recibidos (privado, solo la pareja).**

```
weddings/{weddingId}/giftsReceived/{id}
  guestId: string | null          // vinculado a la lista de invitados
  fromLabel: string               // texto libre cuando no se puede vincular ('Los vecinos del 3ºB')
  amount: number | null
  currency: 'EUR'
  method: 'cash' | 'bizum' | 'transfer' | 'gift' | 'other'
  giftDescription: string         // cuando no es dinero
  receivedAt: Timestamp
  thanked: bool
  thankedAt: Timestamp | null
  notes: string
```

- Cada ingreso se **vincula a un invitado** de la lista mediante buscador, o se deja como texto libre si no se puede identificar.
- Registro rápido pensado para la resaca del día siguiente: buscador de invitado, importe, método y guardar.
- Vista de totales **por método de pago** y total general.
- **Control de agradecimientos:** marca de agradecido con fecha, y filtro de "pendientes de agradecer". Es el trabajo real de la semana siguiente a la boda y nadie lo tiene resuelto.
- **Cruce con la lista de invitados:** quién asistió y no tiene regalo registrado, y quién tiene regalo registrado sin haber asistido. Se presenta como información, nunca como reproche: sin totales por invitado a la vista ni rankings.
- Exportación a XLSX.
- **Este panel no aparece jamás en la web pública ni en la proyección `public/site`.** Es el dato más sensible del producto: importes de dinero asociados a personas con nombre y apellidos.

### 8.9 Preguntas frecuentes

- Preguntas y respuestas con **categoría, icono y color**, agrupadas y plegables en la web pública.
- **Set precargado de fábrica** que la pareja mantiene, edita o borra: ¿hay parking?, ¿puedo llevar niños?, ¿hay autobús y a qué hora sale?, ¿hasta qué hora dura?, ¿cuál es el dress code?, ¿a quién pregunto si tengo una duda?, ¿hay opciones vegetarianas?, ¿se pueden hacer fotos en la ceremonia?
- **Contacto de referencia** configurable (normalmente la wedding planner o un familiar, no los novios el día de la boda), con teléfono y WhatsApp pulsables.
- Respuestas con el editor de texto enriquecido acotado, y posibilidad de **enlazar a otro módulo**: la pregunta del bus enlaza al timeline, la del parking al mapa, la del dress code a su panel.
- Buscador cuando hay más de diez preguntas.

```
weddings/{weddingId}/faqs/{id}
  question, answer (HTML saneado)
  category, icon, color
  linkTo: { module: string, itemId: string | null } | null
  order, enabled
```

### 8.10 Alojamientos

- Fichas de hoteles y casas rurales con nombre, categoría, **precio orientativo por noche**, distancia al banquete, teléfono, web, y **código de descuento o mención para la reserva** ("di que vas a la boda de María y Gabriel").
- **Plazas o habitaciones bloqueadas** por la pareja y fecha límite para reservarlas, que es lo que de verdad angustia al invitado de fuera.
- Cada alojamiento **enlaza con una ubicación del mapa** (§8.6), de modo que aparece como marcador y hereda el botón "Cómo llegar".
- Orden configurable y destacado de los recomendados.

```
weddings/{weddingId}/accommodations/{id}
  name, category, description
  pricePerNight, distanceKm, phone, website
  discountCode, blockedRooms, bookingDeadline
  locationId: string | null
  featured: bool, order, icon, color
```

### 8.11 Dress code

- Descripción del código de vestimenta con texto enriquecido.
- **Paleta de colores sugeridos y colores a evitar**, mostrada como muestras. Cada muestra lleva su nombre escrito: el color solo no comunica "verde oliva" a nadie.
- **Moodboard de imágenes de referencia**, que es como se entiende de verdad un dress code.
- Indicaciones diferenciadas opcionales por rol o por grupo (por ejemplo, distinto para el cortejo que para el resto).
- Avisos prácticos: si la ceremonia es en exterior sobre hierba, el aviso sobre tacones vale más que tres párrafos de estilo.

### 8.12 Personas importantes

El cortejo y quien tiene un papel el día de la boda, con foto.

```
weddings/{weddingId}/weddingParty/{id}
  guestId: string | null          // vinculado a la lista si es invitado
  displayName: string
  role: string                    // 'Madrina', 'Padrino', 'Portaanillos', 'Chófer de la novia'...
  roleIcon, roleColor
  side: 'A' | 'B' | 'both'
  photoPath: string | null
  bio: string                     // 'Amiga de María desde el colegio'
  phone: string | null            // visible solo para la pareja
  order, visibleToGuests
```

- **Roles precargados** y editables: madrina, padrino, testigos, damas de honor, portaanillos, arras, chófer de la novia, chófer del novio, lectores, música, wedding planner.
- Foto por persona, recortada a un formato único para que la cuadrícula quede limpia.
- **Vinculación opcional con la lista de invitados**: si la madrina ya está como invitada, se enlaza y no se duplican datos.
- Vista pública en cuadrícula agrupada por lado, con el rol y el icono de cada uno.
- Cada persona puede marcarse como interna: el chófer y la wedding planner con su teléfono son datos de coordinación de la pareja, no contenido para la web.

### 8.13 Timeline del día

- Eventos con hora, título, descripción, **icono y color propios**, y **ubicación enlazada al módulo de mapa** (§8.6).
- Set de iconos pensado para el día de la boda: ceremonia, autobús, cóctel, banquete, tarta, primer baile, barra libre, recena, fotomatón, fin de fiesta.
- Presentación en **línea de tiempo vertical con la hora destacada**, cada hito con su color, pensada para consultarse en el móvil a las tres de la mañana con poca batería y peor cobertura.
- Cada evento se marca como visible para invitados o **solo interno**, de modo que la misma agenda sirve para la web pública y para la coordinación con proveedores. La hora a la que llega el fotógrafo no es asunto de los invitados.
- **Aviso de solapes y huecos** al editar, que es donde se detectan los errores de planificación.

```
weddings/{weddingId}/timelineEvents/{id}
  time, endTime, title, description
  icon, color
  locationId: string | null
  visibleToGuests: bool
  order
```

### 8.14 Playlist colaborativa

Módulo completo e independiente, además de la pregunta del RSVP.

- Los invitados **sugieren canciones** (título y artista) y **votan** las de otros. Un voto por invitado y canción.
- Las canciones pedidas en el RSVP **entran automáticamente** en la lista, sin que la pareja tenga que copiarlas.
- Detección de duplicados por título y artista normalizados al sugerir.
- Vista para la pareja ordenada por votos, con marcado de aceptada, descartada y **lista de veto** para las canciones que no quieren oír bajo ningún concepto.
- Exportación de la lista definitiva para el DJ, ordenada o agrupada por momento.
- Moderación opcional, igual que la galería.

### 8.15 Libro de firmas

- Mensajes de los invitados a la pareja, con moderación opcional.
- En modos B y C el mensaje queda atribuido al invitado identificado, con su mote.
- Exportación a PDF maquetado, para imprimirlo y encuadernarlo como recuerdo.

### 8.16 Presupuesto y proveedores

**Presupuesto**
- Partidas con categoría, concepto, coste estimado, coste real, vencimiento y estado de pago.
- Totales por categoría, desviación entre estimado y real, y calendario de pagos pendientes.
- Presupuesto objetivo global con aviso al superarse.
- Cada categoría con su **color e icono**, consistentes en toda la aplicación.
- Exportación a XLSX.

**Proveedores**
```
weddings/{weddingId}/vendors/{id}
  name, category, contactName, phone, email, website
  quotedPrice, agreedPrice
  status: 'candidate' | 'contracted' | 'paid' | 'discarded'
  contractPaths: string[]
  payments: [ { amount, date, concept } ]
  rating: number | null
  notes
  color, icon
```
- Ficha por proveedor con contacto pulsable, presupuesto, precio acordado, contratos en PDF y registro de pagos y señales.
- Comparativa de candidatos por categoría, para decidir entre los tres fotógrafos a los que se pidió presupuesto.
- **Asignación a tareas del checklist** (§8.17): una tarea puede colgar de un proveedor, y la ficha del proveedor muestra sus tareas abiertas. Es lo que convierte la lista de proveedores en una herramienta de seguimiento y no en una agenda de teléfonos.
- Estado de cada proveedor con su color, visible de un vistazo.

### 8.17 Checklist

```
weddings/{weddingId}/checklistItems/{id}
  title, description, category
  dueDate, done, doneAt
  assignedTo: 'A' | 'B' | 'both'
  vendorId: string | null         // tarea vinculada a un proveedor
  budgetItemId: string | null
  priority: 'low' | 'normal' | 'high'
  icon, color, order
```

- Tareas con categoría, fecha límite, responsable y prioridad, **sembradas al crear la boda** con fechas relativas calculadas desde la fecha del enlace.
- **Vinculación a proveedor y a partida de presupuesto**, de modo que "pagar la señal del catering" enlaza con las dos cosas.
- Vista de próximas y vencidas en el resumen del panel, con **semáforo de color por urgencia** acompañado siempre de la fecha escrita.
- Filtro por responsable, para repartir el trabajo entre los dos sin discutirlo dos veces.

### 8.18 Panel de superadmin

- Listado de bodas con slug, estado, fecha, plan, invitados y última actividad.
- Alta de boda mediante `provisionWedding`.
- Suspender, archivar y reactivar.
- Acceso de soporte al panel de una boda, siempre registrado.
- **Registro de accesos de los novios**: qué cuenta entró, cuándo, desde qué IP y con qué agente, con vista por boda y vista global. Sirve para soporte y para detectar cuentas compartidas o abandonadas.
- Métricas agregadas: bodas activas, altas del mes, almacenamiento consumido, partidas de quiz, accesos de invitados.

---

## 9. Requisitos no funcionales

### 9.1 Sistema visual: color e iconografía

Pediste que todo sea extremadamente visual e intuitivo por colores. Eso solo funciona si el color significa siempre lo mismo, y si además **nunca es lo único que comunica**. Un sistema de color inconsistente es peor que no tener color.

**Dos paletas separadas, que no se mezclan nunca.**

1. **Paleta de marca de la boda.** Los 6 colores que elige la pareja. Mandan en la **web pública**: portada, secciones, tipografías, botones.
2. **Paleta semántica del panel.** Fija, idéntica en todas las bodas, no configurable. Es la que da significado al estado de las cosas y por eso no puede depender del gusto cromático de cada pareja: si en una boda "confirmado" es verde y en otra es burdeos porque pegaba con las flores, el sistema deja de ser intuitivo.

**Vocabulario semántico fijo:**

| Significado | Se usa en |
|---|---|
| Confirmado / hecho / pagado | RSVP, checklist, presupuesto, proveedores, agradecimientos |
| Pendiente / sin respuesta | RSVP, tareas abiertas, regalos sin agradecer |
| Rechazado / descartado / vencido | RSVP declinado, tareas vencidas, proveedores descartados |
| Atención / requiere revisión | Mesa fuera de mínimo o máximo, presupuesto desviado, fotos en moderación |
| Informativo / neutro | Notas, elementos desactivados |

**Regla innegociable: el color nunca viaja solo.** Todo estado se comunica con **color + icono + texto**. Un punto verde sin más no es información: es un punto verde. Además de ser lo correcto en accesibilidad (WCAG 2.1, criterio 1.4.1), es lo práctico — alrededor del 8% de los hombres tiene alguna deficiencia en la visión del color, así que en una boda de 150 invitados hay varias personas que no distinguen tu verde de tu rojo. Y la pareja consulta el panel en el móvil, a veces al sol.

**Paleta categórica.** Para lo que no es estado sino categoría —grupos de invitados, categorías de gasto, tipos de proveedor, colores del timeline— hay una paleta de **12 a 16 colores** distinguibles entre sí y con contraste suficiente sobre fondo claro y oscuro. La pareja elige de esa paleta; no hay selector hexadecimal libre. El motivo es el mismo de siempre: el catálogo de plantillas vende que ninguna boda queda mal.

**Iconografía.** Un **set curado de 80 a 100 iconos** elegidos para bodas, agrupados por categoría y con buscador:

- Momentos del día: ceremonia, cóctel, banquete, tarta, primer baile, barra libre, recena, fotomatón, castillo de fuegos, fin de fiesta.
- Logística: autobús, coche, parking, taxi, hotel, tren, avión, accesibilidad.
- Personas y roles: madrina, padrino, testigo, portaanillos, arras, dama de honor, niños, chófer.
- Proveedores y gasto: fotógrafo, vídeo, flores, música, catering, vestido, traje, joyería, invitaciones, decoración.
- Estados y utilidades: confirmado, pendiente, aviso, alergia, vegetariano, sin gluten, regalo, mensaje.

Nada de librería genérica completa: un selector de 1.500 iconos con lupas, servidores y carritos de la compra se usa peor que 80 bien escogidos. Si falta un icono, se añade al set curado en la siguiente versión, que además es una señal útil de qué necesita la gente.

**Consistencia entre módulos.** El mismo concepto lleva el mismo color y el mismo icono en toda la aplicación, en la web pública y en el panel. Un invitado confirmado se ve igual en la lista, en el plano de mesas, en el panel de regalos recibidos y en la exportación.

**Densidad.** El panel se diseña primero para móvil. La pareja no va a abrir el portátil para marcar una tarea; lo va a hacer en el sofá con el teléfono.

### 9.2 Rendimiento

- La web pública de la boda debe alcanzar **Lighthouse ≥ 90 en móvil** en rendimiento y accesibilidad.
- Presupuesto de carga inicial de la web pública: **< 200 KB de JavaScript comprimido**. El código del panel no entra nunca en ese bundle.
- Imágenes servidas en WebP con tamaños responsivos y carga diferida.
- Objetivo: la web debe ser usable con conexión móvil pobre, porque se consulta en la finca el mismo día de la boda.

### 9.3 Accesibilidad

- WCAG 2.1 nivel AA en la web pública. Muchos invitados serán personas mayores: contraste suficiente, tamaños de fuente legibles, áreas de pulsación amplias.
- Navegación completa por teclado en el panel.
- **Criterio 1.4.1 (uso del color):** ningún estado se comunica solo con color. Ver §9.1.
- Contraste mínimo 4.5:1 en texto y 3:1 en elementos de interfaz, verificado también sobre las paletas que puede elegir la pareja: si una combinación no pasa, no se ofrece.

### 9.4 Protección de datos (RGPD)

Esto no es un adorno: la lista de invitados contiene nombres, teléfonos, alergias y datos de salud potenciales.

- La pareja es **responsable del tratamiento**; la plataforma es **encargada del tratamiento**. Hace falta un contrato de encargo de tratamiento aceptado en el alta.
- Base legal, finalidad y plazo de conservación documentados y visibles para el invitado en el formulario de RSVP.
- Las alergias e intolerancias se tratan con la cautela de un dato de salud: visibles solo para la pareja y para la exportación al catering.
- Derecho de supresión: un invitado puede solicitar la eliminación de sus datos; la pareja dispone de un botón para ello.
- **Retención:** los datos de una boda se conservan hasta *(pendiente, ver sección 12)* meses después de la fecha, tras los cuales la boda se archiva y después se purga, previo aviso a la pareja.
- Todos los datos residen en región **europea** (`eur3` o `europe-west1`).
- **Datos de terceros aportados por invitados:** cuando un invitado añade a un acompañante está facilitando el nombre y el teléfono de otra persona. El formulario debe informarlo expresamente y el aviso de privacidad debe cubrir esa finalidad.
- **Registro de accesos:** se guardan accesos de invitados (con IP y agente), accesos de los novios al panel y acciones del superadmin. Son datos personales con su propio plazo de conservación, que debe ser más corto que el del resto: 12 meses como referencia.
- **Regalos recibidos:** importes de dinero asociados a personas identificadas. Es el dato más sensible del producto. Nunca sale de la sesión de la pareja, nunca entra en la proyección pública y no se incluye en ninguna exportación compartida con proveedores.
- La partición de audiencias de la galería **no es una medida de seguridad frente a la pareja**: los novios ven todas las fotos de todos los grupos, y así debe constar.

### 9.5 Fiabilidad

- Exportación diaria automática de Firestore a Cloud Storage, con retención de 30 días.
- Reglas de seguridad y funciones críticas cubiertas por tests contra el emulador.
- Entornos separados: desarrollo, preproducción y producción, cada uno con su proyecto de Firebase.
- Monitorización de errores en cliente y en funciones.

### 9.6 Coste

- La arquitectura de una sola base de datos mantiene el coste marginal por boda prácticamente en cero fuera del almacenamiento de fotos.
- Las fotos son el único gasto que escala de verdad: cuota por boda según plan y política de compresión en la subida.
- Los contadores precalculados evitan lecturas masivas al abrir el panel.

### 9.7 Internacionalización

- Toda cadena visible vive en ficheros de traducción desde el primer commit. Ninguna cadena literal en plantillas.
- Idioma de arranque: español. Estructura preparada para añadir inglés y catalán sin refactor.
- Fechas, horas y moneda formateadas por locale; zona horaria `Europe/Madrid` por defecto y configurable por boda.

---

## 10. Fases de entrega

| Fase | Contenido | Resultado |
|---|---|---|
| **F0 — Fundaciones** | Proyecto Angular, resolución de tenant por hostname, Firebase configurado, auth de la pareja, reglas de seguridad con su batería de tests, `provisionWedding`, panel de superadmin mínimo con registro de accesos, esqueleto del panel | Se puede dar de alta una boda y entrar a su panel vacío |
| **F1 — Núcleo vendible** | Web pública con plantillas y edición sobre vista previa, invitados con grupos e importación, acompañantes con acceso propio, RSVP con formulario dinámico, los tres modos de acceso, contadores de acceso, compartir por WhatsApp | **Una boda real puede usarse de principio a fin.** Es el mínimo comercializable |
| **F2 — Banquete, ubicaciones y contenidos del día** | Mesas con arrastrar y soltar con mínimos y máximos, mapa interactivo con marcadores y cómo llegar, timeline con iconos y colores, **preguntas frecuentes**, **alojamientos**, **dress code**, **personas importantes**, exportaciones a XLSX y PDF | El invitado tiene resuelto todo lo que pregunta antes de una boda: dónde es, cómo llego, dónde duermo, cómo voy vestido y a qué hora es cada cosa |
| **F3 — Participación de invitados** | Galería con audiencias por grupo y moderación, **quiz** con gestión, ranking y partidas por invitado, **playlist colaborativa** con votos, libro de firmas, lista de regalos y aportación | Diferenciación frente a la competencia. El quiz y la galería por grupos son los dos módulos que nadie más tiene |
| **F4 — Gestión interna de la pareja** | Presupuesto, proveedores con tareas asignadas, checklist, **regalos recibidos y agradecimientos** | La pareja organiza toda la boda dentro de la herramienta, y la semana siguiente también |
| **F5 — Escala comercial** | Alta self-service con pago, WhatsApp Business API, plano real de finca | Crecimiento sin intervención del operador |

**Notas sobre el orden.**

- El quiz sube a F3 y no espera al final: es material ya escrito y probado en el prototipo `wedding-quiz`, así que su coste marginal es portarlo al modelo multi-tenant, no diseñarlo.
- **El sistema visual (§9.1) se construye en F0**, antes que ningún módulo. Los colores semánticos, la paleta categórica y el set de iconos son infraestructura compartida: si se dejan para el final, cada módulo inventa los suyos y el resultado es exactamente lo contrario de lo que pediste.
- FAQ, alojamientos, dress code y personas importantes están en F2 y no antes porque, siendo baratos de construir, no son lo que hace vendible el producto: son contenido que la pareja rellena. F1 sigue siendo el mínimo comercializable.

---

## 11. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un fallo en las reglas de seguridad expone datos entre bodas | Crítico, reputacional | Batería de tests de aislamiento como requisito de release; revisión de reglas en cada PR que toque el modelo |
| Fuerza bruta sobre los últimos 4 dígitos del teléfono | Medio | Límite de intentos, App Check, respuestas genéricas, log de accesos |
| Coste de almacenamiento disparado por la galería | Medio | Cuotas por plan, compresión en subida, límites de tamaño en reglas |
| Alcance del MVP demasiado ancho (los cuatro grupos de módulos entran) | Alto, en plazo | Las fases F1–F4 secuencian la entrega; F1 ya es vendible por sí sola |
| Tope no documentado de dominios autorizados en Firebase Auth | Alto si se alcanza: rompe el alta de bodas nuevas | La API no publica límite. Contar los dominios dados de alta, avisar al superadmin en 500 y tener listo el plan B: mover el panel a `app.nupcialis.com` y resolver la boda por el claim |
| Cookie de un subdominio de boda visible en otro | Medio | Cookies de sesión sin atributo `Domain`, prefijo `__Host-`, `Secure`, `HttpOnly`, `Path=/` y validación de `Origin`. Valorar entrada en la Public Suffix List |
| Dependencia del wildcard del proveedor de hosting | Bajo | El modelo de datos no depende del subdominio; el fallback de rutas `nupcialis.com/<slug>` funciona sin migración |
| Fuga del plano de mesas o notas privadas a invitados | Alto | `notes` y datos de gestión nunca entran en la proyección pública |
| Una foto de un grupo restringido llega a quien no debe | Alto, es una promesa explícita al invitado | `photos` cerrada en reglas; la visibilidad la resuelve siempre `listPhotos`; test de aislamiento por grupo en la batería de reglas |
| Puntuaciones de quiz falseadas desde la consola | Bajo, pero arruina el juego | Corrección y puntuación en servidor; `quizResults` no admite escritura desde cliente |
| XSS almacenado a través del editor de contenidos | Alto: lo verían todos los invitados | Saneado en servidor antes de publicar, barra de edición acotada, sin HTML libre |
| El panel de regalos recibidos se filtra | Crítico, reputacional | Colección privada, fuera de la proyección pública, sin exportaciones compartidas; test de aislamiento propio |
| Cada módulo inventa sus colores e iconos | Medio, pero destruye la promesa de producto | Sistema visual construido en F0 como infraestructura, no por módulo |
| Un invitado añade acompañantes sin límite | Medio | Cupo por titular validado en `addCompanion` contando los ya creados, no confiando en el cliente |
| El teléfono de un acompañante lo aporta un tercero | Medio, RGPD | Aviso expreso en el formulario y finalidad recogida en la política de privacidad |

---

## 12. Decisiones pendientes

Ninguna bloquea el arranque del desarrollo.

1. **Ciclo de vida post-boda.** Cuánto tiempo permanece viva la web y los datos tras la fecha, si se ofrece renovación y cuándo se purga. Afecta a retención RGPD y a coste. Los registros de acceso deberían purgarse antes que el resto.
2. **Precio y planes.** Qué módulos entran en `basic` y cuáles en `premium`. El campo `plan` ya está en el modelo. Candidatos naturales a premium: quiz, galería con audiencias, mapa.
3. **Librería del editor de texto enriquecido.** Jodit es MIT y sirve, pero su wrapper oficial de Angular está sin mantenimiento activo y la versión que manejabas (4.7.6) va varias menores por detrás de la actual. Para una barra tan acotada puede pesar de más. Pendiente de una prueba comparativa rápida contra una alternativa ligera antes de fijarlo.
4. **Confirmar la librería de mapas.** La recomendación es Leaflet o MapLibre sobre OpenStreetMap para evitar clave y facturación de Google. Si prefieres el aspecto de Google Maps, hay que asumir clave con facturación y restricción por *referrer* poco estrecha por el wildcard.
5. **Email transaccional.** Hoy fuera de alcance: la comunicación se hace compartiendo el enlace por WhatsApp manualmente, y solo se usan los correos propios de Firebase Auth. Si se quieren recordatorios automáticos a quienes no han confirmado, hará falta proveedor de email.
6. **WhatsApp Business API.** No descartado. Coste por mensaje, plantillas aprobadas por Meta y alta como empresa. Previsto para F5.
7. **Dominio propio de la pareja** (`mariaygabriel.com`). Técnicamente posible, pero reintroduce trabajo manual de certificados. Evaluar como extra de pago.
8. **PWA e instalación en el móvil del invitado.** Interesante para la galería y el quiz el día de la boda; no decidido.
9. **Autenticación adicional para módulos sensibles en modo A.** Con entrada abierta, ¿qué hacen la galería, el quiz y el libro de firmas? Propuesta a validar: en modo A esos módulos o se desactivan o funcionan en modo anónimo sin ranking nominal ni audiencias por grupo, porque ambas cosas necesitan saber quién es quién.
10. **Plano real de la finca.** El lienzo de mesas de F2 es genérico a propósito. Reproducir el salón concreto de cada hacienda es un módulo aparte y caro; evaluar como extra de pago en F5.
11. **¿Puede un invitado jugar al quiz más de una vez?** Está modelado como configurable y el historial guarda todas las partidas; falta decidir el valor por defecto y si el ranking muestra la mejor puntuación o la primera.
12. ~~Origen del set de iconos.~~ **Decidido: Phosphor** (MIT). Única de las tres candidatas que cubre los 50 conceptos del producto, y sus seis pesos sirven como mecanismo de estado: `regular` inactivo, `fill` activo.
13. **¿La lista de regalos permite reservar sin identificarse?** En modo de acceso abierto no hay identidad, así que una reserva anónima la puede deshacer cualquiera. Propuesta a validar: en modo A la reserva se desactiva y la lista es solo informativa.
14. **Fotos de personas importantes.** Son fotos de terceros publicadas en una web. Hace falta decidir si basta con el consentimiento verbal que gestiona la pareja o si conviene un aviso explícito en el panel al subirlas.

---

## 13. Referencias

- Prototipo `wedding-quiz` (Angular 20 + AngularFire + Cloud Functions), de donde se portan el quiz, la validación de invitado por nombre y cuatro dígitos, y la partición de audiencia de la galería. Su decisión de cerrar `invitados` y `fotos` en las reglas y resolverlo todo en Cloud Functions se adopta tal cual.
