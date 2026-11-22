# Nupcialis — Documento de requisitos

**Producto:** plataforma SaaS multi-tenant de organización de bodas, operada por los propios novios.
**Dominio:** `nupcialis.com`, con una web por boda en `<slug>.nupcialis.com`.
**Fecha del documento:** 2026-09-07
**Estado:** requisitos cerrados para Fase 1–4. Las decisiones marcadas como _pendientes_ no bloquean el arranque.

---

## 1. Visión

Cada pareja que contrata Nupcialis recibe:

1. Una **web pública de su boda** en su propio subdominio, personalizable dentro de plantillas prediseñadas.
2. Un **panel de administración privado** donde activan y configuran los módulos que quieren usar.
3. Un conjunto de **herramientas de gestión** (invitados, mesas, presupuesto, proveedores, checklist) que solo ven ellos.

El principio rector del sistema es que **la intervención humana del operador sea cero en el ciclo de vida normal de una boda**. Dar de alta una boda, crear su espacio de datos, publicar su subdominio y sembrar su configuración inicial son operaciones automáticas.

### 1.1 Actores

| Actor                 | Descripción                                                                                          | Acceso                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Superadmin**        | El operador de la plataforma (Gabriel). Da de alta bodas, ve el estado global, resuelve incidencias. | Panel de superadmin en `admin.nupcialis.com`   |
| **Pareja (owner)**    | Los dos miembros de la pareja. Cada uno con su propia cuenta, ambas sobre la misma boda.             | Panel en `<slug>.nupcialis.com/panel`          |
| **Invitado**          | Persona invitada a la boda. Puede ser identificada o anónima según el modo de acceso configurado.    | Web pública en `<slug>.nupcialis.com`          |
| **Visitante anónimo** | Cualquiera con la URL, cuando el modo de acceso es abierto.                                          | Web pública, solo lectura de contenido público |

---

## 2. Arquitectura

### 2.1 Decisiones cerradas

| Área                  | Decisión                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Frontal               | Angular 22, SPA **zoneless**, componentes standalone y signals                                                       |
| Datos                 | **Una sola base de datos Firestore** multi-tenant, raíz `weddings/{weddingId}`                                       |
| Aislamiento           | Reglas de seguridad de Firestore + custom claims en el token, **no** bases separadas                                 |
| Autenticación         | Firebase Auth (email/contraseña y Google para la pareja; custom tokens para invitados)                               |
| Ficheros              | Firebase Storage, particionado por `weddings/{weddingId}/...`                                                        |
| Lógica de servidor    | Cloud Functions for Firebase, solo como pegamento. **Sin backend con framework.**                                    |
| Hosting del frontal   | Plataforma con soporte de **dominio wildcard `*.nupcialis.com`** (Cloudflare Pages o Vercel)                         |
| Alta de bodas         | Manual por el superadmin en Fase 1; self-service con pago en Fase 5                                                  |
| i18n                  | Infraestructura de traducción desde el primer día, arrancando solo con español                                       |
| Protección            | Firebase App Check obligatorio en Firestore, Storage y Functions                                                     |
| Mapas                 | Mapa interactivo con Leaflet/MapLibre sobre OpenStreetMap; navegación por enlace profundo a Google Maps              |
| Edición de contenidos | Secciones prediseñadas editadas sobre vista previa en vivo, con texto enriquecido acotado. **Sin maquetador libre.** |
| Formularios           | El RSVP se construye a partir de preguntas configurables por la pareja, no de campos fijos                           |

### 2.2 Decisiones rechazadas y por qué

**Una base de datos por boda.** Descartado. Firestore admite 100 bases de datos por proyecto (ampliable solo por petición a soporte), lo que impone un techo de crecimiento con fricción administrativa. Firestore no degrada por volumen de datos: es horizontal y su límite relevante es ~1 escritura por segundo _por documento_, no por base. En cambio, cada base adicional multiplica el coste operativo permanente: reglas, índices, copias de seguridad y migraciones de esquema se ejecutan N veces. El aislamiento buscado se obtiene con reglas de seguridad verificables mediante tests automatizados sobre el emulador.

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

| Superficie             | URL                                   | Contenido                                                         |
| ---------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| Web pública de la boda | `<slug>.nupcialis.com/`               | Plantilla configurada por la pareja, módulos públicos activos     |
| Panel de la pareja     | `<slug>.nupcialis.com/panel`          | Configuración y herramientas de gestión, requiere sesión de owner |
| Panel de superadmin    | `admin.nupcialis.com`                 | Alta y supervisión de bodas, requiere claim de superadmin         |
| Landing comercial      | `nupcialis.com` y `www.nupcialis.com` | Página de venta del producto                                      |

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

**En los modos B y C la identificación va delante de todo.** No es que haya módulos que pidan identidad y otros no: según §1.1 solo existe «visitante anónimo» cuando el modo es abierto, así que ni los nombres, ni la fecha, ni las secciones se pintan antes de saber quién entra. La puerta vive en un trozo de código diferido: una boda en modo A no descarga ni el formulario ni Firebase Auth.

**Modo A — Entrada abierta.** Cualquiera con la URL ve la web. No hay identificación. Los módulos que requieren identidad (RSVP nominal, libro de firmas atribuido, subida de fotos) quedan deshabilitados o pasan a modo anónimo según su propia configuración.

**Modo B — Nombre + últimos 4 dígitos del teléfono.** El invitado escribe su nombre y los cuatro últimos dígitos de su móvil. Se contrastan contra la lista de invitados cargada por la pareja.

**Modo C — Teléfono completo.** El invitado escribe su número de móvil y se contrasta contra la lista de invitados.

**Dos niveles de sesión en los modos B y C (D-34, decidido).** El enlace que la pareja manda por WhatsApp lleva un token por invitado y **abre la web**; para confirmar, elegir menú, apuntar acompañantes o ver fotos de audiencia restringida se le piden además los cuatro dígitos de su móvil (o el teléfono, en modo C).

| Nivel        | Cómo se consigue                         | Qué permite                                                  |
| ------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `enlace`     | Abrir el enlace de la pareja (`?k=`)     | Ver la web. Nada más                                         |
| `verificado` | Escribir los cuatro dígitos (o el móvil) | Todo lo del invitado: RSVP, acompañantes, fotos restringidas |

El motivo de la partición: **estos enlaces se reenvían**. El primo lo pasa al grupo de la familia «por si alguien no lo tiene», y un enlace que autorizara convertiría a doce personas en el mismo invitado —su confirmación, su menú, su grupo de fotos—. Lo cómodo es cómodo y lo que tiene consecuencias sigue pidiendo algo que solo tiene él.

Sobre el token del enlace:

- Lo **genera el servidor**: 24 bytes de azar (32 caracteres base64url) guardados en `guests/{id}.inviteToken`. No se deriva del `guestId`, porque un id viaja en cualquier captura de pantalla del panel.
- Se crea la primera vez que la pareja comparte y **se reutiliza**, para que el enlace que ya mandó siga valiendo. La pareja puede **cambiarlo** desde el panel: es la única forma de invalidar uno que se haya ido donde no debía.
- Sale de la barra de direcciones en cuanto se usa (`replaceState`): no tiene por qué quedarse en el historial del móvil ni en lo que se comparta desde el navegador.
- **Un token de enlace no pisa una sesión ya verificada.** Quien se identificó con sus dígitos y vuelve a abrir el enlace del WhatsApp —que es lo que hace todo el mundo— no pierde el nivel.
- `?n=` (el nombre pre-rellenado de los enlaces anteriores a D-34) se sigue leyendo: una pareja pudo mandar doscientos.

**Quién cree la web que eres, y cómo decir que no.** Encima de la portada, la web enseña «Estás viendo esto como <nombre>» con un «¿No eres tú?» que cierra la sesión y devuelve la puerta ahí mismo, sin recargar. Es la otra mitad de D-34: si el enlace entra solo, quien recibe uno reenviado está dentro como otra persona sin haber hecho nada, y tiene que poder darse cuenta y salir. El nombre viaja en el claim `nombre` del custom token —el mote si lo tiene, y si no el nombre completo—, así que sobrevive a una recarga sin consultar nada. Sin nombre se dice «como invitado»: dejar el hueco en blanco parece un fallo.

**Requisito de seguridad innegociable para los modos B y C:** la verificación se resuelve **íntegramente en una Cloud Function** que devuelve un _custom token_ de Firebase con claims `{ weddingId, guestId, role: 'guest', nivel }`. El cliente **nunca** consulta teléfonos ni nombres contra Firestore, porque una regla que permita esa consulta permite descargar la lista de invitados completa.

Controles sobre la función de acceso de invitados:

- App Check obligatorio.
- Límite de intentos por IP y por boda: **10 intentos en 15 minutos**, y a partir de ahí bloqueo creciente de 1, 5, 15 y 60 minutos, que se queda en 60 y no vuelve a empezar. Entrar bien lo borra todo. Vive en `loginAttempts/{hashDeIp}`, cerrada incluso a la pareja: poder vaciarla desde el navegador sería poder quitarse el límite de encima.
- **La boda llega por slug, no por `weddingId`.** Aquí todavía no hay token del que sacarlo, y el slug ya es público —está en la URL—, así que se resuelve contra `slugs/{slug}` igual que hace la web. Aceptar un `weddingId` escrito por el cliente sería dar por bueno un identificador interno.
- **Dos invitados que encajan a la vez no entran.** Pasa con dos personas del mismo nombre y los mismos cuatro dígitos. Dejar entrar a la primera le daría a una la identidad de la otra —su mesa, su menú, su grupo de fotos—, así que se trata como un fallo más y la pareja lo arregla en su lista.
- Un invitado dado de baja (`active: false`) no entra, y la respuesta es la misma que si no existiera.
- **Las tres puertas comparten el límite de intentos**: `guestLogin` (nombre y dígitos), `guestLinkLogin` (el token del enlace) y `verifyGuest` (subir de `enlace` a `verificado`). Cuatro dígitos son diez mil combinaciones, así que subir de nivel se cuenta igual que entrar.
- **El `guestId` de `verifyGuest` sale del token, nunca de la petición.** Si fuera un parámetro, cualquiera con un enlace podría probar los cuatro dígitos de otro invitado.
- **Cada función del invitado comprueba el nivel.** Lo vigila `functions/src/verificacion.spec.ts`, que lee el código y falla si una invocable nueva se olvida: el fallo realista no es escribir mal la comprobación, es no ponerla.
- Respuesta genérica en caso de fallo: no se distingue entre "ese invitado no existe" y "los dígitos no coinciden", para evitar enumeración.
- Los teléfonos se almacenan normalizados en E.164 y se indexa además `phoneLast4` para el modo B.
- El token de invitado es de vida corta (24 h) y renovable repitiendo la verificación.
- Se registra cada acceso concedido en un log por boda, visible para la pareja.

**Acompañantes con acceso propio.** Cuando la pareja lo permite, un invitado puede añadir acompañantes desde su propia sesión, y esos acompañantes **acceden a la web con identidad propia**. No son un campo del titular: son invitados de pleno derecho, con su sesión, su mesa, su menú, su respuesta al formulario y su contador de accesos. Consecuencias: en los modos B y C el titular debe aportar el teléfono del acompañante para que este pueda identificarse, y el acompañante **hereda los grupos del titular**, incluido el grupo de audiencia restringida de la galería si lo hubiera. Ver §5.5.

**Riesgo aceptado y documentado:** los modos B y C son _identificación_, no autenticación fuerte. Quien conozca el nombre y el teléfono de un invitado puede suplantarlo. Es proporcionado al contexto (una boda), pero debe constar en la política de privacidad que se presenta a la pareja.

---

## 4. Contratación, cobro y alta de una boda

### 4.1 Cómo se contrata y cómo se cobra

**No hay pasarela de pago, y no la va a haber a corto plazo.** No es una decisión
técnica: sin alta de autónomo no se puede montar un cobro recurrente, así que el
dinero entra por **Bizum** o a través de un **proveedor comercializador**, y la
activación la hace una persona. Todo lo demás alrededor de esa frase está
automatizado. Ver D-25 y D-26.

De ahí sale la regla que ordena todo este apartado: **el estado del servicio y el
estado del cobro son dos ejes independientes.**

| Eje      | Estados                                 | Quién lo sufre  |
| -------- | --------------------------------------- | --------------- |
| Servicio | `solicitada` → `activa`, o `descartada` | La pareja       |
| Cobro    | `pendiente` → `cobrado`                 | La contabilidad |

Mezclarlos parece más simple y es un error: con un proveedor que liquida a fin de
mes, **una boda activa con el cobro pendiente es un estado normal del negocio**,
no una incidencia. Si el alta dependiera del cobro, una pareja que contrata el
día 2 esperaría cuatro semanas por una liquidación entre terceros de la que no
sabe nada.

**Dos orígenes.**

- **Directo.** La pareja rellena la solicitud, paga por Bizum y el superadmin
  activa. El número de Bizum **no aparece en la web pública**: se muestra solo en
  la pantalla de confirmación, después de enviar la solicitud, para no publicar un
  móvil personal a merced de cualquier rastreador.
- **Por proveedor.** Una tienda de invitaciones, un fotógrafo o una finca venden
  la web junto con su propio producto. Entran por un enlace con su código
  (`/alta?ref=CODIGO`), cobran ellos a la pareja y liquidan con nosotros aparte.
  **Tarifa mayorista:** al proveedor se le factura menos que a la pareja directa, y
  lo que él le cobre a la pareja es asunto suyo y no se guarda.

**Conciliar un Bizum es manual por definición.** No hay API del banco, así que
nadie puede cruzar un ingreso con una solicitud. Se genera una referencia corta y
dictable, pero el panel asume que la gente escribirá "boda" en el concepto: se
puede marcar una solicitud como cobrada aunque la referencia no cuadre, y se busca
por importe y por nombre, no solo por código.

**El proveedor no tiene acceso a nada.** Ni cuenta, ni panel, ni vista de sus
bodas. Dentro de una boda están los teléfonos y las alergias de trescientas
personas; si la pareja quiere que les eche una mano, que le den acceso ellos. El
código de referencia es una etiqueta en la solicitud, no una credencial.

**El proveedor aporta datos de terceros.** Nombres y emails de una pareja que no
ha rellenado nada. Es el mismo problema del acompañante de §5.5: el formulario
debe advertir expresamente que el proveedor tiene que haber informado a la pareja,
y la finalidad debe constar en el aviso de privacidad.

**El enlace de acceso va siempre al email de la pareja**, aunque el alta la haya
pedido el proveedor. Al proveedor se le dice "ya está, avísales". Un enlace de
"establece tu contraseña" es una credencial de la boda: no viaja por un tercero.

**El precio se congela en la solicitud.** Si mañana suben las tarifas, quien pidió
ayer paga lo de ayer.

### 4.2 El alta

Operación atómica, ejecutada por una Cloud Function `provisionWedding` invocada por el superadmin desde la ficha de una solicitud.

Entrada: nombres de la pareja, slug deseado, fecha de la boda, **tipo de ceremonia (civil o religiosa, obligatorio)**, emails de las dos cuentas, plan contratado y, opcionalmente, **el lugar de la ceremonia y el de la celebración** (nombre y dirección, con pin si se buscaron en el mapa o se pegó un enlace de Google Maps; si no, se pone el pin después desde el panel).

Pasos:

1. Validar y normalizar el slug; comprobar que no está reservado.
2. En una **transacción**: crear `slugs/{slug}` y el documento `weddings/{weddingId}`. Si el slug ya existe, la operación falla completa y se propone una alternativa.
3. Sembrar la configuración por defecto: plantilla, paleta, módulos activos según el plan, modo de acceso `open`.
   Además se siembran: las **preguntas de fábrica del formulario de RSVP**, la **plantilla de checklist** con fechas relativas a la fecha de la boda, las **partidas de presupuesto** de la plantilla, las **ubicaciones** `ceremonia` y `banquete` si se dieron en el alta, y un **grupo por defecto** de audiencia pública. Las tareas y las partidas salen del **catálogo del superadmin** (`catalog/{tipo}/items`, §8.17) y, si está vacío, de las de fábrica; son una **copia de la pareja**: editarlas no afecta a otras bodas, y la siguiente boda vuelve a recibir las originales.
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

### 4.3 Estados de una boda

`draft` → `active` → `archived`. Una boda en `draft` no es visible públicamente
aunque su slug resuelva.

**El slug no se reserva** entre la solicitud y el alta: la solicitud guarda el
slug _deseado_ y se vuelve a validar al activar. Si para entonces se lo han
llevado, el panel ofrece las alternativas en el momento (`mariaygabriel-2027`,
`mariaygabriel-boda`) en vez de fallar y dejar a una pareja pagada sin dirección.
Reservarlo exigiría un estado con caducidad, su liberador programado y la
disciplina de que un slug reservado se comporte como inexistente; con el volumen
previsto no compensa. Ver D-25.

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

```
payments/{paymentId}
  weddingId, amountCents (entero), concept, method: 'bizum' | 'transferencia' | 'efectivo' | 'otro'
  status: 'pending' | 'paid', paidOn: 'YYYY-MM-DD' | null, invoiceNumber, notes
  createdAt, updatedAt

reminderMarks/{weddingId}__{key}
  weddingId, key: 'agradecimiento' | 'encuesta' | 'cierre-pareja' | 'cierre-superadmin'
  sentBy, sentAt
```

`payments` es el libro de cobros de Nupcialis a las parejas y `reminderMarks` recuerda qué avisos de después de la boda se han enviado. Las dos: **solo lectura del superadmin, escritura solo desde funciones** (`savePayment`, `deletePayment`, `markReminderSent`), con test de aislamiento. Ver §8.18.

```
weddingRequests/{requestId}
  origin: 'couple' | 'partner'
  partnerId: string | null        // solo si origin = 'partner'
  coupleNames: { partnerA, partnerB }
  emails: string[]                // 1 o 2
  contactPhone: string | null
  weddingDate: Timestamp
  desiredSlug: string             // deseado, NO reservado
  plan: 'basic' | 'extended'
  amountDue: number               // congelado al crear; tarifa mayorista si viene de partner
  paymentRef: string              // referencia corta y dictable
  serviceStatus: 'requested' | 'active' | 'discarded'
  paymentStatus: 'pending' | 'paid'
  paymentMethod: 'bizum' | 'partner_cash' | null
  paidAt: Timestamp | null
  paymentNote: string             // lo que de verdad venía en el concepto
  weddingId: string | null        // una vez activada
  notes: string
  createdAt, updatedAt
```

Solo superadmin. **La crea una Cloud Function, nunca el cliente**: si las reglas
permitieran escribir aquí desde el navegador, cualquiera llena la bandeja de
basura en una tarde. App Check obligatorio y límite por IP.

Las solicitudes que se quedan en `requested` o `discarded` **se purgan a los seis
meses**: son datos personales de gente que no llegó a ser cliente.

```
partners/{partnerId}
  name: string                    // 'Invitaciones Pepe'
  code: string                    // el del enlace /alta?ref=CODIGO
  contactName, email, phone
  wholesalePrice: { basic: number, extended: number }
  active: bool
  createdAt
```

Los **proveedores comercializadores**, que no tienen nada que ver con los
proveedores de una boda concreta (`weddings/{id}/vendors`, §8.16): estos venden
Nupcialis, aquellos los contrata la pareja para su boda. Solo superadmin, sin
cuenta ni acceso propio. Ver §4.1.

### 5.2 Documento de la boda

```
weddings/{weddingId}
  slug: string
  status: 'draft' | 'active' | 'archived'
  plan: 'basic' | 'premium'
  couple: { partnerA: string, partnerB: string }
  weddingDate: Timestamp      // medianoche UTC del día; lo fija el alta
  weddingTime: string | null  // '17:00', hora de reloj; la fija la pareja
  ceremonyType: 'civil' | 'religious'  // se elige en el alta; la pareja lo edita (D-49)
  timezone: string            // 'Europe/Madrid'
  locale: string              // 'es'
  ownerUids: string[]
  guestAccessMode: 'open' | 'name_phone4' | 'phone'
  allowGuestAddedCompanions: bool     // el invitado puede añadir acompañantes
  theme: {
    templateId: string
    palette: { primary, secondary, background, surface, text, accent }
    fonts: { heading: string, body: string }
    heroImagePath: string | null   // ruta en Storage, para poder borrarla
    heroImageUrl: string | null    // URL ya resuelta, para no cargar el SDK
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
    story:       { enabled, config }   // «Nuestra historia», solo plan extendido (§8.19)
    budget:      { enabled, config }
    vendors:     { enabled, config }
    checklist:   { enabled, config }
  }
  counters: {
    guestsTotal, guestsConfirmed, guestsDeclined, guestsPending,
    seatsAssigned, photosPending, quizPlays, uniqueLogins
  }
  limits: { maxPhotos }              // techos por boda; campo de sistema (§8.5)
  createdAt, updatedAt
```

**La fecha son tres campos, no uno.** Una boda no ocurre en un instante
universal: ocurre **a las cinco de la tarde en Cádiz**. `weddingDate` guarda el
día (medianoche UTC), `weddingTime` la hora de reloj y `timezone` la zona; el
instante contra el que corre la cuenta atrás se calcula con los tres. Guardar un
solo Timestamp obligaría a rehacer la cuenta cada vez que cambia el horario de
verano, y dejaría la hora de la ceremonia a merced de la zona del invitado.

Los dos los rellena gente distinta y en momentos distintos: **el día lo fija el
alta** —lo necesita el superadmin para la checklist y para no publicar una boda
sin fecha—, y **la hora la fija la pareja** desde su panel, porque quien vende el
servicio no tiene por qué conocerla y al contratar rara vez está decidida. Ver
D-28.

Los `counters` los mantiene un trigger de servidor, nunca el cliente. Evitan agregados costosos en el panel.

### 5.3 Proyección pública

```
weddings/{weddingId}/public/site
  status, coupleNames, weddingDate, weddingTime, timezone, theme, locale
  guestAccessMode
  publicModules: { gallery, gifts, playlist, guestbook, timeline, rsvp, map, quiz }
  content: { sections: [...] }
  indexable: bool             // false por defecto; ver §8.1
```

Es el **único** documento de la boda legible sin autenticación. Existe para que la regla de lectura pública no exponga contadores, plan ni configuración interna. La mantiene sincronizada un trigger cuando cambia la boda.

### 5.4 Grupos de invitados

Los grupos dejan de ser una etiqueta de texto libre y pasan a ser entidades con comportamiento propio, porque de ellos depende la visibilidad de la galería.

```
weddings/{weddingId}/guestGroups/{groupId}
  name: string                          // 'Universidad', 'Familia de la novia'
  normalizedName: string                // minúsculas y sin tildes; único por boda
  photoAudience: 'public' | 'restricted'
  color: string                         // id de la paleta categórica (§9.1), nunca un hexadecimal
  order: number
  isDefault: bool                       // el grupo de todos: solo uno, lo crea el alta
  createdAt, updatedAt
```

**El grupo de todos** («Invitados», `isDefault: true`) se crea con la boda y **todo invitado nuevo entra en él**, por alta manual o por importación (D-31). No se puede borrar ni llevar candado. **Todo invitado pertenece siempre a él** (D-47): no se puede sacar al editarlo y quien confirma asistencia entra aunque no estuviera.

**`photoAudience: 'restricted'` es el mecanismo de partición de audiencia de la galería.** Ver §8.5.

**Se leen desde el cliente, se escriben por función** (`upsertGroup`, `deleteGroup`). Dos invariantes lo obligan, y ninguna se puede comprobar en una regla porque ambas miran a los invitados, que están cerrados:

- **Nadie está en dos grupos restringidos.** Se valida al asignar (en `upsertGuest` e `importGuests`) y también **al pasar un grupo a restringido**: si algún miembro ya está en otro restringido, se rechaza diciendo cuántos son.
- **Borrar un grupo suelta primero a sus miembros** (`arrayRemove` por lotes) y después borra el documento, para no dejar `groupIds` que apunten a la nada.

El nombre es único por boda (comparado normalizado) porque la importación resuelve la columna «Grupos» por nombre. Los grupos que no existen se crean al importar, siempre **públicos**: restringir decide quién ve qué fotos y no se hace desde una celda de una hoja. Tope: 50 grupos por boda.

### 5.5 Invitados

Cambio importante respecto a la primera versión: **los acompañantes dejan de estar embebidos y pasan a ser documentos de invitado de pleno derecho.** El motivo: un acompañante añadido por un invitado también accede a la web, y por tanto necesita identidad propia, sesión propia, mesa propia, menú propio y contador de accesos propio. Mantenerlos embebidos obligaría a duplicar toda esa lógica.

```
weddings/{weddingId}/guests/{guestId}
  fullName: string
  normalizedName: string          // minúsculas, sin acentos, para el matching del modo B
  nickname: string                // mote, es lo que se muestra en la mesa
  phone: string | null            // E.164
  phoneLast4: string | null
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
  needsTransport: bool            // lo pone la respuesta del RSVP (mapsTo)
  needsAccommodation: bool        // idem
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
- **Y se le avisa**: encima de la lista sale un aviso con los nombres de los que han apuntado sus invitados en los últimos siete días, con un botón que filtra la lista a esos. Sin eso, un acompañante nuevo no se distingue de los doscientos que ya estaban. El listado (`listGuests`) lleva para ello dos campos más: si lo apuntó un invitado y cuándo se dio de alta.
- **El cupo se pone a varios a la vez** (`setCompanionQuota`): la pareja filtra la lista —por grupo, por estado— y le pone el mismo cupo a todos los que está viendo. En una boda son doscientos invitados y el cupo se decide por tandas («los amigos, uno cada uno»), así que de uno en uno es una tarde. Los acompañantes se omiten, porque un acompañante con cupo encadenaría las invitaciones, y **bajar el cupo no echa a nadie**: quien ya apuntó a dos sigue con dos y solo deja de poder apuntar a un tercero.
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
  text: string                    // el enunciado
  correctAnswer: string
  wrongAnswers: [string, string, string]
  difficulty: 1 | 2 | 3           // 10, 20 o 30 puntos
  hint: string | null
  enabled: bool
  order: number

weddings/{weddingId}/quizResults/{resultId}
  guestId: string
  fullName: string                // copia del nombre al jugar; el ranking público solo enseña esto
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
budgetItems/{id}           category, concept, estimatedCents, actualCents (céntimos, enteros), paid, dueDate, vendorId, icon, color, notes, order

guestAccessLog/{id}
  guestId, mode, ip, userAgent, createdAt

loginAttempts/{hashDeIp}       // lo lleva guestLogin; cerrado a todos, pareja incluida
  intentos, desde, bloqueos, bloqueadoHasta, actualizadoEn
```

**Catálogos del superadmin** (raíz): `catalog/{tipo}/items/{id}` con `tipo` ∈ `tasks`, `budget`, `quiz`. Lectura solo del superadmin (y de los `owner`, únicamente `quiz`, para las sugerencias); escritura solo por funciones (`saveCatalogItem`, `deleteCatalogItem`, `loadFactoryCatalog`).

**Nuestra historia** no tiene colección: vive en el documento de la boda, `content.story.{conocemos|beso|recuerdo|viaje|pedida} = { html, fotos: [{ url, path }] }` (§8.19).

El dress code no tiene colección propia: vive en `modules.dressCode.config`, con su moodboard en Storage, porque es un contenido único por boda y no una lista.

`guestAccessLog` guarda el detalle de cada entrada; el contador agregado vive en `guests.loginCount` para que el panel no tenga que agregar nada al pintarse.

La pareja lo lee en «Quién ha entrado» (`/panel/guests/accesos`), que contesta dos preguntas: si a alguien le ha llegado la invitación, y si un enlace está circulando. Lo segundo se ve en que una misma invitación se abre desde **tres o más tipos de aparato distintos**, que es el aviso que sale arriba; con dos no se dice nada, porque el móvil y el ordenador de casa los tiene cualquiera y un aviso que salta siempre no lo lee nadie. Dos cosas no suben a esa pantalla: la **IP**, que se guarda porque sostiene el límite de intentos y no le dice nada a la pareja, y el **`user-agent` entero**, que el servidor reduce a dos palabras antes de mandarlo (§9.4). Se devuelven las **300 entradas más recientes**, y cuando se llega al tope la pantalla lo dice.

### 5.11 Índices

Declarados en `firestore.indexes.json`. Los previsibles:

- `guests` por `rsvpStatus` + `fullName`, por `tableId` + `fullName`, por `groupIds` (array-contains) + `fullName`, por `invitedById`
- `photos` por `status` + `createdAt` desc (el que usa `listPhotos` hoy) y, cuando entren las audiencias, por `status` + `audienceGroupId` + `createdAt`
- `quizResults` por `points` desc + `elapsedMs` asc, y por `guestId` + `playedAt`
- `giftsReceived` por `thanked` + `receivedAt`; `checklistItems` por `vendorId` + `dueDate`
- `faqs`, `accommodations`, `weddingParty`, `timelineEvents` por `enabled` / `visibleToGuests` + `order`
- `formQuestions` por `enabled` + `order`
- `budgetItems` por `category` + `dueDate`; `checklistItems` por `done` + `dueDate`

### 5.12 Almacenamiento

```
weddings/{weddingId}/hero/...
weddings/{weddingId}/story/{fichero}.jpg      // fotos de «Nuestra historia»: lectura pública, escribe y borra solo el owner (≤10 MB, imagen)
weddings/{weddingId}/gallery/{photoId}/original.jpg
weddings/{weddingId}/gallery/{photoId}/thumb.jpg
weddings/{weddingId}/vendors/{vendorId}/{contrato}.pdf
```

Los ficheros de la galería **no los escribe el navegador**: los escribe `uploadPhoto` con el SDK de administrador, y se sirven por URL con `firebaseStorageDownloadTokens`, no con `makePublic()`. Así el bucket no necesita lectura abierta y una foto borrada deja de servirse al borrar el fichero.

Cuotas por boda según plan: espacio total, tamaño máximo por fichero (8 MB por foto de invitado, comprobado en `uploadPhoto` antes de convertir el base64 a bytes) y tipos MIME permitidos.

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
                             allow write: if false; }         // por upsertGroup / deleteGroup, ver §5.4

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

| Función                                                      | Tipo                                  | Responsabilidad                                                                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createWeddingRequest`                                       | callable (público)                    | Crear una solicitud desde el formulario de contratación. App Check y límite por IP: es la única escritura pública del sistema junto a `guestLogin`                                 |
| `activateRequest`                                            | callable (superadmin)                 | Revalidar el slug de una solicitud y lanzar `provisionWedding` con sus datos. Si el slug se ha ocupado, devuelve alternativas en vez de fallar                                     |
| `settleRequests`                                             | callable (superadmin)                 | Marcar como cobradas una o varias solicitudes. Con un proveedor, cierra su liquidación de golpe                                                                                    |
| `notifyNewRequest`                                           | trigger Firestore                     | Aviso por Telegram al superadmin cuando entra una solicitud. El token del bot vive en Secret Manager, **nunca en el repositorio, que es público**                                  |
| `purgeOldRequests`                                           | programada                            | Borrar a los seis meses las solicitudes que nunca llegaron a boda                                                                                                                  |
| `provisionWedding`                                           | callable (superadmin)                 | Alta atómica: slug, documento, cuentas, claims, semillas (checklist, preguntas de formulario, quiz de ejemplo)                                                                     |
| `setUserClaims`                                              | callable (superadmin)                 | Asignar o revocar `weddingId` y `role`                                                                                                                                             |
| `getWeddingFile`                                             | callable (superadmin)                 | Ficha de una boda: resumen, correos de la pareja (de Firebase Auth), últimas 100 entradas de `auditLog` y cobros                                                                   |
| `generateCoupleResetLink`                                    | callable (superadmin)                 | Genera el enlace de restablecimiento de una cuenta **de esa boda**; no envía nada y no guarda el enlace                                                                            |
| `listPayments`, `savePayment`, `deletePayment`               | callable (superadmin)                 | Libro de cobros (S1.3e); importe en céntimos, todo auditado                                                                                                                        |
| `getReminders`, `markReminderSent`                           | callable (superadmin)                 | Avisos de después de la boda y su marca de enviado (S1.3f)                                                                                                                         |
| `saveCatalogItem`, `deleteCatalogItem`, `loadFactoryCatalog` | callable (superadmin)                 | CRUD de los catálogos de tareas, presupuesto y preguntas del quiz (D-49); `loadFactoryCatalog` solo si el catálogo está vacío                                                      |
| `completeWeddings`                                           | callable (superadmin)                 | Añade a las bodas ya creadas los `modules.*` y el cartel de «Nuestra historia» que les falten, sin pisar lo que la pareja decidió (D-50). Idempotente                              |
| `setGuestsRsvp`                                              | callable (pareja)                     | Respuesta en lote (F1.8i/j): estado de hasta 500 invitados a la vez                                                                                                                |
| `authorizeWeddingDomain`                                     | interna, usada por `provisionWedding` | Añadir `<slug>.nupcialis.com` a los dominios autorizados de Firebase Auth vía Identity Toolkit Admin API. Idempotente: lee el listado, añade si falta, hace patch                  |
| `guestLogin`                                                 | callable (público)                    | Verificar identidad en modos B y C, emitir custom token, **incrementar `loginCount` y escribir en `guestAccessLog`**                                                               |
| `listAccessLog`                                              | callable (owner)                      | Registro de accesos para la pareja: une los nombres (que `guests` no se lee de fuera), baja el `user-agent` a «Android · Chrome» y **no devuelve la IP**. Las últimas 300 entradas |
| `upsertGroup` / `deleteGroup`                                | callable (owner)                      | Crear, editar y borrar grupos cuidando que nadie quede en dos restringidos y que un borrado no deje invitados apuntando a la nada. Ver §5.4                                        |
| `reorderGroups`                                              | callable (owner)                      | El orden de los grupos que decide la pareja, en una sola escritura. Ignora ids que ya no existen y no pierde los que no venían en la lista                                         |
| `addCompanion`                                               | callable (guest)                      | Alta de acompañante validando cupo, heredando grupos y registrando `addedBy: 'guest'`                                                                                              |
| `setCompanionQuota`                                          | callable (owner)                      | Poner el mismo cupo de acompañantes a una lista de invitados, en lotes. Omite acompañantes; bajar el cupo no borra a nadie                                                         |
| `submitRsvp`                                                 | callable (guest)                      | Validar respuestas contra `formQuestions`, aplicar `mapsTo`, guardar y recalcular contadores                                                                                       |
| `listPhotos`                                                 | callable (guest)                      | Una página de 24 fotos, de la última a la primera, con el cursor en el `createdAt` de la última servida. Devuelve solo lo que ese invitado puede ver                               |
| `uploadPhoto`                                                | callable (guest verificado)           | Guarda grande y miniatura (las dos vienen ya reducidas del navegador) y escribe el documento. Asignará `audienceGroupId` cuando entren los grupos                                  |
| `deletePhoto`                                                | callable (guest/owner)                | Borrado propio; los novios pueden borrar cualquiera. Borra también los dos ficheros de Storage                                                                                     |
| `clearGallery`                                               | callable (owner)                      | Vaciar la galería entera. Solo la pareja, y pidiendo confirmación escrita en el panel                                                                                              |
| `submitQuizResult`                                           | callable (guest)                      | Corregir el cuestionario **en servidor** y guardar la puntuación                                                                                                                   |
| `logOwnerAccess`                                             | trigger / callable                    | Registrar en `auditLog` cada entrada de un novio al panel                                                                                                                          |
| `syncPublicProjection`                                       | trigger Firestore                     | Mantener `public/site` al día                                                                                                                                                      |
| `recomputeCounters`                                          | trigger Firestore                     | Mantener `counters`                                                                                                                                                                |
| ~~`onPhotoUploaded`~~                                        | —                                     | No existe: la miniatura la hace el **navegador** con un `canvas` y la manda en la misma llamada que la grande. Ver §8.5                                                            |
| ~~`sanitizeRichContent`~~                                    | —                                     | No existe como función aparte: el saneado del HTML vive en `dominio/html.ts` y lo aplica `syncPublicProjection`, que ya reconstruye `content` con lista blanca. Ver §8.1           |
| `exportGuests`                                               | callable (owner)                      | XLSX de invitados con menús, alergias y mesas                                                                                                                                      |
| `archiveWeddings` / `scheduledBackup`                        | programadas                           | Ciclo de vida y copias                                                                                                                                                             |

**Nota sobre `submitQuizResult`:** la corrección tiene que ocurrir en servidor. Si el cliente envía "he sacado 300 puntos", cualquiera gana el ranking desde la consola del navegador. El cliente envía las respuestas elegidas; la función las compara con `correctAnswer` y calcula la puntuación. El prototipo actual corrige en cliente y escribe el ranking directamente; esto es una mejora consciente sobre él.

---

## 8. Módulos

Todos comparten el mismo contrato: se activan desde el panel, tienen su bloque `config` en el documento de la boda y su código se carga de forma diferida.

### 8.1 Web pública y edición de contenidos

- Selección entre **varias plantillas prediseñadas**. La pareja elige plantilla y configura; no maqueta desde cero.

  El catálogo es **cerrado y vive en código** (`features/public-site/plantillas`):
  cada plantilla es un componente con su diseño entero y su tipografía, y
  `theme.templateId` guarda cuál usa la boda. Cada una viaja en su propio trozo
  de JavaScript y **solo se descarga la elegida**, tipografías incluidas: con
  doce plantillas en el catálogo, cargarlas todas metería once diseños que esa
  boda no usa en el bundle que abre el invitado desde WhatsApp.

  Un `templateId` que ya no existe en el catálogo —una plantilla retirada— cae a
  la clásica. Feo, pero el invitado ya está delante con el enlace abierto: una
  página en blanco es mucho peor.

  Los colores de la pareja llegan como variables CSS `--np-marca-*` y cada
  plantilla los usa con su propia reserva, así que una boda que aún no ha
  elegido paleta se ve con los colores de su plantilla y no a medio pintar. La
  paleta se aplica **entera o nada**: media paleta mezcla tres colores de la
  boda con tres de la plantilla, que es peor que ninguno.

- Tokens de diseño: paleta (6 colores), pareja de tipografías, imagen de portada.

  El **catálogo de paletas es cerrado**, por el mismo motivo que el de
  plantillas: seis selectores de color sueltos producen texto gris claro sobre
  fondo beige con una fiabilidad asombrosa, y esa web la abre un invitado de pie
  en la calle. Cada paleta pasa un test de contraste (WCAG AA, §9.3) antes de
  entrar en el catálogo; la que no lo pase no se mergea.

  De la **imagen de portada** se guardan dos cosas: `heroImagePath`, para poder
  borrar el fichero, y `heroImageUrl`, la URL de descarga ya resuelta. La
  segunda existe para que la web pública no tenga que cargar el SDK de Storage
  solo para averiguar una URL que ya se conocía al subir. Se reduce en el
  navegador antes de subirla: sale del móvil con 4000 px y seis megas, y la
  descarga cada invitado para verla en una pantalla de teléfono.

- Secciones activables y reordenables: portada con cuenta atrás, nuestra historia, ceremonia, banquete, cómo llegar, alojamiento, dress code, preguntas frecuentes, contacto.
- Estados borrador y publicado, con vista previa.
- **`noindex` por defecto, con interruptor.** La etiqueta viene **en el HTML
  servido**, no la pone la aplicación al arrancar: si dependiera del JavaScript,
  un rastreador que no lo ejecute —o que lea la página antes de que arranque—
  indexaría una boda que no quería salir en Google. El fallo seguro es no
  aparecer. La boda que sí quiera aparecer lo dice, y entonces el código
  **quita** la etiqueta.

  Se indexa solo si la boda está **publicada** y el interruptor está puesto. Una
  boda en borrador no se indexa aunque el interruptor esté encendido de antes, y
  una archivada tampoco: lo último que quiere una pareja es que su boda del año
  pasado siga saliendo la primera al buscar sus nombres.

**Modelo de edición .** Se descarta construir un maquetador libre tipo WordPress y se adopta un modelo intermedio:

1. **Edición sobre vista previa en vivo.** El panel muestra la web real de la boda a un lado. La pareja pulsa sobre una sección y edita sus campos; el resultado se refleja al instante. Se percibe como edición visual sin serlo: no se arrastran bloques por un lienzo, se rellenan campos de secciones prediseñadas.
2. **Activar, desactivar y reordenar secciones** mediante arrastre en una lista lateral.
3. **Editor de texto enriquecido acotado** solo en los campos que lo merecen (nuestra historia, respuestas de FAQ, textos de bienvenida). Barra limitada a negrita, cursiva, enlaces, listas y encabezados de nivel bajo. Nada de HTML libre ni de estilos en línea que rompan la plantilla.

Motivo: un maquetador libre es el módulo más caro del producto y el que más fácil produce webs feas, que es justo lo contrario de lo que vende plantillas prediseñadas. El modelo propuesto da la sensación de edición visual a una fracción del coste y garantiza que ninguna boda quede mal.

**Sobre Jodit.** Es MIT y sirve. Dos avisos: la versión 4.7.6 que mencionaste está bastante por detrás de la actual (4.13.x), y el wrapper oficial de Angular (`jodit-angular`) está declarado sin mantenimiento activo por su propio autor, que advierte en el repositorio que no usa Angular y no puede corregir fallos con agilidad; el wrapper mantenido por la comunidad es `ngx-jodit`. Para una barra tan acotada como la que necesitamos, Jodit puede ser más peso del necesario. Decisión pendiente de una prueba comparativa (§12).

**Requisito de seguridad innegociable:** todo HTML producido por el editor se **sanea en servidor** antes de publicarse. Ese contenido lo van a ver cientos de invitados, y confiar en el saneado del navegador de la pareja convierte el editor en un XSS almacenado.

Cómo está hecho (implementado el 2026-11-13):

- El saneador es `functions/src/dominio/html.ts`, sobre `sanitize-html`. **No se escribe un parseador propio**: las cien formas de colar un `javascript:` en un atributo las mantiene al día una librería, no nosotros.
- Se aplica **en la proyección pública** (`proyeccionPublica`), que es el único sitio por el que el contenido pasa antes de llegar al documento que lee un anónimo. No hace falta un trigger aparte: la proyección ya es un trigger y ya reconstruye `content` con lista blanca.
- **Lista blanca de etiquetas:** `p`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, `a`, `ul`, `ol`, `li`, `h3`, `h4`, `blockquote`. Atributos solo en los enlaces (`href`, `target`, `rel`), y solo con los esquemas `http`, `https`, `mailto` y `tel`. Todo enlace sale con `target="_blank"` y `rel="noopener noreferrer"`.
- **La barra del editor no ofrece nada que esa lista no admita**, y lo comprueba un test que lee las dos listas: un botón de tabla haría que la pareja maquetara algo que desaparece al publicar, y el fallo aparecería en la web de los invitados y no donde se cometió.
- El contenido escrito **antes** de que existiera el editor es texto plano con saltos de línea: si no trae ni una etiqueta, se convierte a párrafos, para que nadie pierda su texto por un cambio nuestro.
- En la web pública se pinta con `innerHTML`, así que Angular lo sanea otra vez al renderizarlo. Es la segunda red, no la primera.

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
- **Pantalla de lo que han contestado** (`/panel/rsvp/respuestas`), pregunta a pregunta. Dos formas, porque son dos preguntas distintas: lo de opciones **se cuenta** —«vegano, 23» es lo primero que pregunta el catering— y lo escrito **se lee**, una respuesta por tarjeta y con quién la escribió. Esto último cubre un agujero: las respuestas sin campo propio en el invitado —la canción que pediría, el mensaje para los novios— vivían en `rsvpAnswers` y no se veían en ninguna parte, ni en la lista, ni en la ficha, ni en la exportación. Son peticiones de los invitados y alguna importa.
  - Van **todas** las preguntas, también las que la pareja haya apagado: si desactiva una después de recibir cien respuestas, esas cien siguen ahí y tienen que poder leerse. Lo mismo con una opción retirada, que se enseña con su valor en bruto para que el total cuadre.
  - Los recuentos cuentan **solo a quien ha contestado esa pregunta**. Incluir a los pendientes haría que todo pareciera minoritario.
  - Va por una invocable aparte (`listRsvpAnswers`), porque `listGuests` recorta `rsvpAnswers` a propósito: con trescientos invitados y ocho preguntas, mandarlo para pintar la lista multiplica por cinco lo que viaja.
  - La pareja puede cambiar el tipo de una pregunta suya aunque ya esté contestada, pero **se le dice cuántas respuestas hay** antes de hacerlo. No se borra ninguna: se siguen viendo tal cual, porque el recuento ya sabe enseñar valores que no están entre las opciones de ahora.
- Panel de control para la pareja con confirmados, declinados y pendientes, filtros y exportación. **Las cifras de la cabecera de la lista son los filtros**: se pulsa «pendientes» y la lista se queda con esos; se vuelve a pulsar y vuelve entera. «Sin entrar» no es un estado del RSVP, es a quién hay que reenviarle el enlace. **Los grupos filtran igual**, en chips debajo de las cifras y con cuántos hay en cada uno; se cruzan con la cifra puesta, y el número del chip cuenta ya dentro de ella, para que no haya dos cifras contradiciéndose en la misma pantalla.

  Cómo se resolvió (F1.8):

  - **El formulario pasa por función invocable** (`getRsvpForm`, `submitRsvp`), no por lectura directa de `formQuestions`. Podría leerse con las reglas —son preguntas, no datos de nadie— pero entonces la web pública tendría que cargar Firestore para pintarlo, y el presupuesto de 200 kB no da. Llega ya filtrado por destinatario y ordenado.
  - **La boda y el invitado salen del token** (regla 1). Con el `guestId` como parámetro, cambiar un número en la petición bastaría para elegirle el menú al primo.
  - **`mapsTo` no se aplica, se traduce.** `formQuestions` lo escribe la pareja, así que una pregunta con `mapsTo: 'active'` dejaría a alguien fuera de la web al contestar, y una con `mapsTo: 'groupIds'` lo metería en el grupo de las fotos restringidas. Solo llegan al invitado los cinco campos de la lista blanca —`rsvpStatus`, `menu`, `allergies`, `needsTransport`, `needsAccommodation`—, cada uno con su tipo.
  - **Lo oculto no se exige ni se guarda.** Quien dice que no viene no elige menú, y el menú que eligiera antes no sobrevive: las respuestas se reemplazan, no se mezclan. Si no, el catering contaría un comensal que no va.
  - **La visibilidad condicional está escrita dos veces**, en el navegador y en el servidor: el formulario tiene que esconder el menú en el mismo instante en que alguien marca que no va, y el servidor no puede creerse nada de lo que llega. Las dos implementaciones se ejecutan sobre la misma tabla de casos en una prueba que falla si se separan.
  - **La fecha límite vive en `modules.rsvp.config.deadline`** y el día cuenta entero: «hasta el 1 de junio» incluye el 1. Pasado el plazo, el formulario no se enseña y lo contestado se queda a la vista.
  - **Las preguntas de sistema no se borran**, y eso lo defienden las reglas: se pueden reetiquetar y desactivar, pero no borrar ni quitarles el `isSystem` para borrarlas en dos pasos.
  - **Primero móvil**: una pregunta por bloque, el sí y el no como dos botones grandes con icono y color, y el fallo pegado a su pregunta en vez de un aviso genérico arriba.
  - **El editor de la pareja** (`/panel/rsvp`) parte de las ocho preguntas de fábrica y las ajusta: encender y apagar en un toque, reetiquetar, reordenar, añadir y borrar las propias. Se ve en la lista qué está apagado y qué no se puede borrar, y a las de sistema no se les ofrece el botón de borrar en vez de dejar que choquen contra las reglas. Las opciones se escriben una por línea, y su `value` no cambia al reetiquetarlas porque las respuestas guardadas apuntan a él.
  - **No hay constructor de condiciones**, sino una casilla: «preguntar solo a quien confirme que viene». El modelo aguanta cualquier condición; el editor escribe esa.
  - **La fecha límite se pone en esa misma pantalla**, no en «Datos de la boda»: es donde se busca.
  - **En modo abierto (A) no hay formulario**: sin identidad no hay a quién apuntar la respuesta. Qué hacer ahí es D-09 y está sin decidir.

- **La pareja asigna acompañantes** (D-46). Desde la tarjeta de un titular, «Añadir acompañante» abre el alta ya enlazada; en la ficha de cualquiera, «Viene con» lo cuelga de un titular o lo suelta. El acompañante hereda los grupos del titular. Sin cadenas: un acompañante no puede traer a nadie, y quien trae gente no puede pasar a ser acompañante. «Trae a N» y «Lo trae X» llevan a la familia entera.

- **La pareja contesta por el invitado** (`setGuestRsvp`, D-45). Hay gente mayor que no entra en la web y gente que no contesta aunque se le insista: lo dicen por teléfono o por WhatsApp y lo tiene que poder apuntar quien organiza la boda. Desde cada invitado de la lista, botón «Respuesta»: tres botones —viene, no viene, sin contestar— con color, icono y texto, y debajo el resto de preguntas del formulario.
- **Respuesta en lote** (`setGuestsRsvp`, F1.8i/j). Con los mismos filtros de la lista (por grupo, por titular, por búsqueda), «Respuesta» marca **viene / no viene / sin contestar** a todos los que se ven, hasta 500 por llamada. Pide confirmar y dice a cuántos afecta. Solo cambia el estado, nunca las respuestas del formulario; quien pasa a «viene» entra en el grupo de todos. Queda en el registro de auditoría.
  - **Solo el estado, solo el estado.** Si únicamente se cambia si viene o no, es lo único que se guarda: el resto de lo que el invitado hubiera contestado no se toca. Si se toca alguna pregunta, se mandan las respuestas y **se reemplazan**, como cuando contesta el invitado.
  - **Se validan igual que las del invitado** —tipos, opciones, largos, visibilidad condicional—, con una diferencia: **no se exigen las obligatorias**, porque la pareja apunta lo que sabe («viene», y el menú ya se verá). Y **no hay plazo**: el plazo es para el invitado.
  - **Deja el documento igual que `submitRsvp`**: `rsvpAnswers`, los campos mapeados y `rsvpStatus`, así que contadores, mesas y exportación al catering lo ven. «Sin contestar» devuelve el invitado a pendiente y vacía `rsvpAt`.
  - Solo la pareja y solo de su boda (regla 1); queda en el log de auditoría sin nombre ni respuestas.

### 8.3 Invitados y acompañantes

- Alta manual e **importación desde CSV/Excel** con previsualización, mapeo de columnas y detección de duplicados por teléfono.

  Cómo se resolvió (F1.2):

  - **Tres entradas**: plantilla descargable, subir un fichero, o pegar las celdas copiadas de la hoja. La plantilla es para quien empieza de cero; el reconocimiento de columnas, para quien ya tiene su lista, que son la mayoría.
  - La plantilla se genera con **punto y coma y BOM**. Excel en español usa la coma como separador decimal y abre en ANSI si no encuentra el BOM: sin las dos cosas, el doble clic enseña una sola columna con «MarÃ­a» dentro.
  - Al leer, el separador se **detecta** (`;`, `,` o tabulador) contando apariciones fuera de comillas en la primera línea no vacía. Pegar desde Excel produce tabuladores, no comas.
  - **Las columnas se reconocen por alias** y la pareja puede corregir cualquiera. Un campo no se asigna dos veces: una hoja con «Teléfono» y «Teléfono 2» deja la segunda sin asignar en vez de pisar la primera.
  - **La previsualización es la misma llamada que la importación**, con una bandera `soloPrevisualizar`. No son dos cálculos: lo que se ve antes de confirmar es literalmente lo que va a pasar.
  - Los duplicados se buscan contra los invitados que ya están **y contra las filas anteriores del propio fichero**: una hoja que ha pasado por tres manos trae al mismo primo dos veces.
  - **Tope de 1000 invitados por boda y 1000 filas por fichero.** La detección de duplicados lee la colección entera en cada importación; con decenas de miles no saldría a cuenta.
  - **También se puede subir el `.xlsx` tal cual** (F1.2b), que es como la mitad de las parejas tiene su lista. Se lee **solo la primera hoja**: en la hoja de una boda las demás son el reparto de mesas a medias o una copia vieja, e importarlas metería duplicados. Las fechas llegan en ISO y no como número de serie, y las decenas de filas vacías que Excel arrastra al final se descartan antes de contar.

- Asignación de **grupos** (§5.4), con indicación visual de cuáles son de audiencia restringida.
- **La lista del panel es un acordeón numerado (D-50).** Una línea por invitado —número, nombre, grupos, respuesta— y, al abrirla, teléfono, mote, lado, edad, cupo, menú, alergias, notas y las acciones. Se ordena por nombre, respuesta, grupo o fecha de alta (en los dos sentidos; sin grupo, siempre al final) y se filtra por grupo, por cifra y por texto. El número es la posición en lo que se ve.
- **Enlace de invitación por invitado y botón de compartir por WhatsApp** con mensaje predefinido y editable.
  - **El enlace abre la web, y solo eso** (D-34, opción 3): lleva un token por invitado y entra con nivel `enlace`. Para confirmar, elegir menú o apuntar acompañantes se le piden los cuatro dígitos. Ver §3.3 para el detalle del token y de los dos niveles.
  - **A quien llega por un enlace reenviado no se le enseña nada de esa persona**: ni sus respuestas, ni su menú, ni lo que escribió a los novios. El formulario no se lee sin verificarse.
  - La pareja puede **cambiar el enlace** de una persona desde el panel, que es lo que invalida uno que haya acabado en un grupo donde no debía.
  - El mensaje es una **plantilla de la boda**, con `{nombre}`, `{novios}`, `{fecha}` y `{enlace}`. Se guarda con los marcadores dentro, no montado, porque sirve para doscientos invitados. Lo que no se reconoce se queda escrito tal cual: así se ve el error en la vista previa en vez de mandar doscientos mensajes con un hueco.
  - Se puede retocar el mensaje **de esa persona** antes de mandarlo, y se usa el mote si lo tiene: en un WhatsApp, «Hola Majo» se lee mejor que «Hola María José Pérez».
  - A quien no tenga teléfono en la lista se le avisa **antes** de compartir, porque con puerta recibiría un enlace que no puede abrir.
- **Acompañantes añadidos por el propio invitado** cuando la pareja lo permite: cupo por titular, herencia de grupos, teléfono obligatorio en modos B y C, y visibilidad en el panel de quién añadió a quién.

  Cómo se resolvió (F1.5):

  - **El cupo se cuenta en el servidor**, con los documentos que existen, y el formulario se recarga después de cada alta. Dos pestañas abiertas mandarían el mismo alta dos veces, y eso son comensales de más que se descubren el día del banquete.
  - **Un acompañante no añade acompañantes.** Sin esa regla el cupo de uno se vuelve una cadena: invito a mi pareja, mi pareja invita a su hermana, y la pareja se encuentra treinta personas que no conoce.
  - **El acompañante hereda los `groupIds` del titular** y entra con `side: 'both'`. La herencia es de seguridad, no comodidad: los grupos deciden quién ve qué fotos.
  - **Al invitado se le piden tres datos**: nombre, edad y —solo donde hace falta para entrar— teléfono. Ni correo ni notas: está dando datos de un tercero, y el formulario lo dice expresamente (RGPD).
  - **La fecha límite cierra también esto**: dejar añadir comensales después de dar el número al catering sería darlo dos veces.
  - **El titular puede quitar a quien apuntó, mientras no haya entrado en la web.** A partir de ahí tiene sesión, confirmación y puede tener fotos subidas, así que lo quita la pareja, que ve el conjunto.
  - **En el panel**, cada acompañante lleva el nombre de quien lo trae y cada titular, a cuántos trae. «Es acompañante» a secas obligaba a adivinar de quién, que es justo lo que hace falta para sentarlos juntos.
  - El interruptor de la boda (`allowGuestAddedCompanions`) está en «Datos de la boda»; el cupo, en la ficha de cada invitado.

- **Contador de accesos por invitado**: número de entradas, primera y última. Lista ordenable por accesos, con vista de quién no ha entrado nunca — útil para saber a quién hay que reenviar el enlace.
- Exportación a XLSX con menús, alergias y mesas para el catering.

  Cómo se resolvió (F1.6):

  - **Tres hojas en el mismo fichero** —dos siempre y la tercera cuando hay algo escrito—. «Invitados» es la lista entera de la pareja —con teléfonos, correos y sus notas—, y «Para el catering» solo los que vienen, con nombre, edad, menú, alergias y mesa. Ese segundo fichero sale por correo a una empresa de fuera: los teléfonos de trescientas personas no tienen por qué ir dentro, y las notas son privadas de la pareja (§9.4). La tercera, «Respuestas», lleva **lo que los invitados han escrito a mano** en el formulario —una canción, una alergia que no cabía en su casilla, un mensaje—, una columna por pregunta de texto y solo las filas de quien escribió algo; no va en la del catering, y si la llamada que la trae falla, el fichero sale igual con las dos de siempre.
  - **Se monta en el navegador**, con la lista que el panel ya tiene cargada. No pasa por el servidor, no se guarda en Storage y no deja copias.
  - **La librería se carga al pulsar el botón**, en su propio trozo (20 kB comprimidos). El presupuesto de 200 kB es de la web pública y esto no la toca.
  - Los códigos del modelo no salen a la hoja: «Confirmado» y «De María», no `confirmed` ni `A`. Los teléfonos van como texto, porque como número Excel se come el `+34`.
  - El fichero se llama `invitados-<slug>-<fecha>.xlsx`: en la carpeta de descargas va a haber cinco.

### 8.4 Mesas

Confirmado el enfoque de arrastrar y soltar, sin plano de finca.

- **Tantas mesas como haga falta**, redondas o rectangulares, cada una con su **mínimo y su máximo de comensales**.
- Los topes **vienen puestos y la pareja los cambia**: una redonda nace con mínimo 8 y máximo 12; una rectangular, con mínimo 12 y máximo 50. Son el punto de partida de la mesa recién creada, no un límite del producto: la pareja puede subirlos o bajarlos mesa a mesa, porque quien conoce la finca y el catering es ella.
- El mínimo y el máximo son para **avisar, no para impedir**: una mesa con trece en una redonda de doce se marca, y se deja. El día de la boda las sillas se añaden.
- Disposición sobre un **lienzo genérico**: la pareja coloca y ordena las mesas libremente, pero el lienzo **no representa el salón de ninguna hacienda concreta**. Sin fondo de plano, sin paredes, sin escenario. Es un esquema de agrupación, no un plano de arquitectura.
- **Arrastrar invitados** (Angular CDK) desde la lista hasta una mesa y entre mesas. La lista enseña **a todos** con color y texto según su respuesta (confirmado, no viene, sin contestar). Al sentar a un titular se pregunta si sus acompañantes van a la misma mesa; si no, quedan visibles como pendientes. Se puede **quitar** a un invitado de su mesa (D-47).
- Avisos, no bloqueos: mesa por debajo del mínimo y mesa por encima del máximo. (El aviso global de «mesas incompletas» se retiró en D-47.)
- Coloreado por grupo para detectar de un vistazo mesas mal mezcladas.
- Exportación del esquema a PDF y de la asignación a XLSX.
- **XLSX para el catering (hecho, F2.8d):** el botón «Exportar para el catering» de la pantalla de mesas monta en el navegador un fichero de tres hojas: **Resumen** (una fila por mesa con forma, mínimo, máximo, sentados, estado corta/pasada/vacía, **cuántos hay de cada menú** y cuántos con alergias, más una fila de totales), **Por mesa** (quién se sienta dónde, con menú, alergias y a quién acompaña) y **Sin mesa** (los confirmados sin sitio; solo sale si los hay, para que un reparto sin terminar no se mande como terminado). No lleva teléfonos, correos ni notas (§9.4). Solo se sientan los confirmados. La columna «Mesa» de las hojas de invitados lleva el **nombre de la mesa**, no su identificador de Firestore.- Fuera del alcance: plano real de la finca, sillas individuales, dimensiones a escala. Se valorará como extra más adelante.

### 8.5 Galería con audiencias por grupo

Es el módulo con la lógica de permisos más delicada del producto, y además el que más se mira: las fotos son lo que trae de vuelta a los invitados al día siguiente.

**Se diseña con la plantilla de la boda, no aparte.** La galería hereda el tema de la pareja como cualquier otra sección —tipografía, paleta y aire—, y se diseña **primero para el móvil**, que es por donde la van a abrir casi todos. Una rejilla que se ve bien en un portátil y apretada en un móvil está mal hecha, no al revés.

**Comportamiento.** Cada grupo tiene una `photoAudience`:

- **`public`** — lo que suben sus miembros lo ve todo el mundo.
- **`restricted`** — lo que suben sus miembros **solo lo ven los miembros de ese mismo grupo** y la pareja.

La visibilidad es **asimétrica y deliberada**: quien pertenece a un grupo restringido ve las fotos de su grupo **y** todas las públicas; quien no pertenece no ve nada de ese grupo. En el ejemplo de la boda: los del grupo "Universidad" ven todo, y la tía Consuelo ve todo menos lo que ha subido la peña de la universidad.

**Implementación.** Cada foto guarda `audienceGroupId`. Al subir, el servidor lo calcula a partir del grupo restringido del que sube; el cliente no lo elige. **Quien sube no decide nunca que una foto sea para todos**: el grupo no tiene opción de publicación pública y solo la pareja puede publicarla (D-47).

**La visibilidad se resuelve siempre en `listPhotos`, en servidor.** La colección está cerrada en las reglas. El prototipo ya lo hace así con su flag `tsf`, y esa decisión se mantiene; lo que cambia es que el flag booleano de un único grupo se generaliza a N grupos configurables por la pareja.

**Restricción de modelo:** un invitado puede pertenecer a varios grupos, pero **a lo sumo a uno restringido**. La validación va en el momento de asignar grupos. Sin ella, el destino de una foto sería ambiguo.

Además:

- **Moderación opcional** por interruptor: publicación inmediata o cola de aprobación. Es independiente de las audiencias: una cosa es _quién puede verla_ y otra _si está aprobada_.
- La pareja lo ve absolutamente todo, de todos los grupos, y puede borrar cualquier foto.
- Miniaturas en servidor, WebP con `srcset`, límite de tamaño por fichero y cuota por boda.
- **Publicadas al subir (D-39, decidido):** la pareja modera a posteriori, borrando; no hay cola de aprobación por defecto.
- **Tope de 500 fotos por boda (D-39, decidido)**, en `weddings/{id}.limits.maxPhotos`. Es un campo de sistema: lo escribe el servidor y las reglas impiden que lo toque la pareja (regla de oro 6). Sin el campo, 500. Cuando se alcanza, `uploadPhoto` responde `resource-exhausted` y el invitado ve «la galería está llena». El tope es blando: dos subidas simultáneas en la foto 499 pueden pasarse en una. Se pensó para cambiarse **desde el panel de superadmin** cuando éste tenga sus estadísticas (`F3.1d`).
- Descarga masiva en ZIP para la pareja.
- Botón de denuncia para cualquier invitado.

**Lo que ya está hecho (F3.1).** La galería de invitados funciona de punta a punta, con las audiencias por grupo **fuera** a propósito: toda foto nace con `audienceGroupId: null`, que es «la ve todo el mundo». El día que entren los grupos, lo único que cambia es quién pone ese campo al subir y qué filtra `listPhotos`; ni el cliente ni el almacenamiento se tocan.

- **Reduce el móvil, no el servidor.** El navegador pasa cada foto por un `canvas` y manda dos JPEG en la misma llamada: la grande a 1600 px de lado largo y la miniatura a 480, las dos al 82 %. Una foto de cámara de ocho megas viaja en menos de uno, la función no necesita ninguna librería de imagen y la rejilla carga miniaturas de verdad, no fotos grandes encogidas con CSS. De tres en tres, que es lo que aguanta una barra de cobertura en una finca.
- **HEIC no entra.** El `canvas` de ningún navegador lo pinta. El `accept="image/*"` del selector deja que el móvil lo ofrezca —y iOS convierte a JPEG al seleccionar—, pero si llegara igual, se rechaza con un mensaje que dice qué pasa.
- **Subir exige invitado verificado** (`exigirVerificado`, regla de oro 3). Mirar, no: en modo A cualquiera que tenga el enlace ve la galería.
- **Borrar**: la suya cada invitado, cualquiera la pareja (`puedeBorrar`). Se borran también los dos ficheros de Storage, no solo el documento.
- **Paginación por cursor** de 24 en 24 sobre `createdAt`, sin `offset`: una galería de dos mil fotos cuesta lo mismo que una de veinte.
- **El visor** ocupa la pantalla, se cierra con `Escape` o con la equis, y pasa de foto con las flechas del teclado y con los dos botones de las esquinas, que en el móvil caen justo donde está el pulgar.
- **En el panel**, `/panel/gallery`: la misma rejilla, con el nombre de quien subió cada foto debajo, borrado de cualquiera y vaciado de la galería entera escribiendo la palabra `VACIAR`. Es moderación **a posteriori**: se publica y se quita si hace falta.
- Quedan para después: la cola de aprobación, la denuncia, la descarga en ZIP, `srcset` en WebP y las audiencias por grupo.

- **Vista previa (hecha, F3.1e):** en el panel de la galería, un botón enseña cómo la ve un invitado: rejilla de miniaturas y visor con flechas, con las mismas fotos, **sin subir ni borrar**. Es una maqueta, no la página pública montada (esa necesita sesión de invitado).

### 8.6 Mapa interactivo

- La pareja da de alta **ubicaciones** con tipo (preboda, ceremonia, banquete, alojamiento, parking, otro), nombre, dirección, descripción y hora.
- **Selector de coordenadas**: buscar la dirección y ajustar el marcador arrastrándolo, para que el pin caiga en la entrada correcta de la finca y no en mitad del campo.
- La web pública muestra un **mapa con todos los marcadores visibles**, cada uno con su icono por tipo, y una ficha al pulsar con la descripción, la hora y los botones **"Abrir en Google Maps"** y **"Cómo llegar"**, que abren la app nativa de mapas del móvil.
- Lista de ubicaciones bajo el mapa, ordenable, para quien prefiera leer.
- Las ubicaciones se enlazan con los eventos del timeline (§8.10), de modo que la agenda del día sabe dónde ocurre cada cosa.

**Lo que hay hecho (F2.3).** Colección `locations/{id}` con `type`, `name`, `address`, `coords: {lat, lng}`, `description`, `time` (**hora `HH:mm`**, o `null`), `order` y `visibleToGuests`. Lo decidido al construirlo:

- **El invitado lee la proyección, no la colección.** `locations` es de lectura solo para la pareja (una regla no puede filtrar por `visibleToGuests` en una consulta de lista, y un sitio interno —dónde aparcan los proveedores— no debe estar al alcance de una consulta directa). El trigger `syncPublicLocations` publica en `public/site.content.ubicaciones` solo lo **visible, con nombre y con coordenadas de verdad**.
- **`0, 0` no es un pin**: es el golfo de Guinea, a donde va a parar lo que no se geolocalizó. Una ficha sin pin se guarda con `coords: null`, no sale en el mapa y el panel lo dice con texto («Sin pin: no sale en el mapa») y con un aviso arriba.
- **La lista es la red de seguridad.** Bajo el mapa, cada sitio con su tipo, hora, dirección y dos botones grandes —«Cómo llegar» y «Abrir en Google Maps»— que sacan la app de mapas. Si el mapa no carga (sin cobertura en la finca) la lista sigue entera.
- **El color nunca va solo**: el marcador lleva el icono de su tipo y la ficha su nombre escrito.
- **Selector de pin**: se busca la dirección (solo al pulsar «Buscar», por la política de Nominatim) y se elige un resultado, o se toca el mapa; el pin se arrastra para afinar. Máximo 30 sitios.
- Elección técnica: Leaflet + OpenStreetMap (ver `D-04`).

**Elección técnica.** Recomendación: **Leaflet o MapLibre con teselas de OpenStreetMap** para el mapa interactivo, y **enlaces profundos a Google Maps** para la navegación. Motivo: no requiere clave de API ni facturación, no hay coste por carga de mapa, y el invitado acaba igualmente en Google Maps cuando pulsa "Cómo llegar", que es lo que realmente pide el requisito. La alternativa —Maps JavaScript API— exige clave con facturación activada, se paga por carga y obliga a restringir por _referrer_; con subdominios wildcard la restricción tendría que ser `*.nupcialis.com/*`, que es tan amplia que protege poco. Si se decide usarla igualmente, la clave debe vivir en configuración de servidor y no en el bundle.

### 8.7 Quiz de la boda

Se replica el juego del prototipo `wedding-quiz` y se convierte en módulo multi-tenant.

**Mecánica heredada del prototipo:**

- Preguntas de respuesta única con **una correcta y tres falsas**, presentadas en orden aleatorio.
- **Tres niveles de dificultad** que valen 10, 20 y 30 puntos, representados con estrellas.
- Cada partida toma **N preguntas al azar** del banco (10 por defecto, configurable).
- Barra de progreso y avance pregunta a pregunta, sin volver atrás.
- **Ranking** de las mejores puntuaciones (**20**, configurable), con **desempate por tiempo** (_provisional, pendiente de validar en D-47_): a igual puntuación, gana quien lo resolvió más rápido. El tiempo no se muestra al jugador.
- Pantalla final con puntuación y, si ha entrado, posición en el ranking. **Nunca se enseña cuál era la respuesta correcta** (D-47).

**Añadidos respecto al prototipo:**

- **Corrección en servidor** (§7). El prototipo corrige y puntúa en cliente y escribe el ranking directamente contra Firestore; en un producto vendido eso permite falsear la puntuación desde la consola del navegador.
- **Identificación del jugador por su sesión de invitado**, no escribiendo el nombre.
- **Se juega las veces que se quiera** y el ranking se queda con la **mejor** partida de cada invitado (`D-11`).
- **El ranking público enseña solo el nombre** —«Pepe García · 120 puntos»—, nunca los dígitos del móvil: en el modo B esos dígitos son la contraseña del invitado (§3.3), y publicarlos junto al nombre sería publicar la credencial entera. El teléfono lo ve **la pareja en su panel**, que es quien necesita saber quién es quién. A cada invitado se le destaca además **su mejor puntuación**, esté o no entre los veinte.
- Configurable por la pareja: número de preguntas por partida, tamaño del ranking, si se permite repetir partida y si el ranking es visible para los invitados.
- Pista opcional por pregunta. **Pedirla cuesta la mitad de los puntos de esa pregunta** y la pantalla avisa antes. No hay «dejar en blanco».
- **Estadística por pregunta** (`quizStats`): cuántas veces se contestó, se acertó y se pidió pista. Con 10 respuestas o más, ≥ 90 % de aciertos = «pregunta fácil» y ≤ 10 % = «pregunta difícil».

**Gestión en el panel privado:**

- Alta, edición, duplicado y borrado de preguntas, con la correcta y las tres falsas y el nivel de dificultad. **No se encienden ni se apagan**: una pregunta que no se quiere, se borra.
- **El banco nace vacío** (D-46): ni importación CSV ni preguntas de ejemplo. El panel explica cómo funciona el juego y avisa de que una pregunta fácil para la familia no lo es para otros grupos de invitados.
- Vista previa de la partida tal como la verá el invitado.
- Consulta y **vaciado del ranking**, útil para dejarlo limpio antes del día de la boda.
- **Partidas por invitado**: cada invitado acumula `quizPlayCount` y `quizBestPoints`. La pareja ve **el ranking con el teléfono** de cada jugador, que es lo que le permite distinguir a dos que se llamen igual. No se listan los invitados que no han jugado.
- **Solo se guarda lo que está en el ranking.** Tras cada partida se podan los `quizResults` que se han quedado fuera de los veinte mejores (`D-11`). Guardar todas las partidas de todos los invitados llenaría la colección de datos que nadie va a mirar, y obligaría a tratar como dato personal una puntuación que a nadie le importa.
- Estadísticas: partidas jugadas, jugadores únicos y, por pregunta, porcentaje de aciertos y etiqueta fácil/difícil. La lista de preguntas de demo en el superadmin está **apartada** (D-47).

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
- **Sin exportación (D-40, decidido):** es el dato más sensible del producto y nada de él sale del panel en ningún fichero.
- **Este panel no aparece jamás en la web pública ni en la proyección `public/site`.** Es el dato más sensible del producto: importes de dinero asociados a personas con nombre y apellidos.

**Lo que ya está hecho (F3.3).** La aportación y la lista, de punta a punta. Lo recibido —el panel privado— queda para `F3.3b`.

- **Ni el IBAN ni el Bizum viajan en la proyección pública**, y eso cambia lo que decía arriba. `public/site` lo lee cualquiera que sepa el slug: un número de cuenta con su titular ahí dentro es exactamente lo que necesita un tercero para levantar la misma web y pedir el dinero en su nombre. Los sirve `getGifts` a invitados identificados, y en la web solo hay un cartel que lleva a `/regalos`. La sección se llama `regalos` y funciona como la del quiz y la de la galería: es una puerta, no un contenido.
- **El IBAN se comprueba con el módulo 97**, en el panel y mientras se escribe. Es el único dato del producto donde un dígito cambiado significa dinero rebotado o en la cuenta de otro, y el momento de decirlo es cuando la pareja todavía tiene el papel del banco delante. El Bizum se comprueba como móvil español y se guarda sin prefijo ni espacios.
- **En el móvil, el IBAN y el Bizum son botones que copian.** El invitado abre esto con la aplicación del banco en la otra mano; seleccionar veinticuatro caracteres con el dedo sin pasarse no es un gesto que se le pueda pedir a nadie.
- **La reserva es anónima de verdad.** `reservedBy` no sale nunca de la función: lo que viaja son dos booleanos, `reservado` y `esMio`. Por eso `gifts` está cerrada a la lectura del invitado —una regla puede negar una escritura, no esconder un campo— y por eso reservar es una **transacción**: dos invitados abriendo la lista a la vez es el caso normal, y lo que no puede pasar es que el segundo pise al primero.
- Lo libre sale primero y lo cogido al final; lo propio sube con lo libre, que es donde el invitado va a buscarlo si quiere soltarlo. Soltar, solo lo suyo.
- Quedan para después: **imagen propia** del regalo (hoy es una URL) y el enlace a `locationId`.

**Lo que ya está hecho (F3.3b).** El cuaderno de lo recibido, en `/panel/gifts/recibidos`, enlazado desde la pantalla de regalos.

- **Agradecer es un toque**, sin abrir ficha: es el gesto que se repite cincuenta veces la semana siguiente, y por eso el botón mide 44 px y va a la izquierda de cada fila. Marca `thanked` y `thankedAt` (el día en que se marca).
- **El total suma solo lo que lleva importe.** Un regalo en especie no tiene precio y no se le inventa uno; sale aparte («Y 1 regalo que no es dinero») y en su fila el importe es «—», nunca «0 €».
- **El cruce con la lista se presenta como repaso, no como reproche**: dos listas de nombres, sin importes ni totales por invitado. «Vinieron y no tenéis nada apuntado» (confirmados, sin contar acompañantes) y «Tenéis algo apuntado y no vinieron».
- Se puede apuntar a un invitado de la lista (buscador) o escribir un nombre suelto; si el invitado vinculado se borra, la anotación conserva el texto.
- Habla con Firestore directo y solo desde la sesión de la pareja (regla 7); la regla y su test de aislamiento ya existían.
- **No hay exportación a XLSX**: lo decidió Gabriel (D-40). Lo recibido no sale del panel.

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

Cómo está hecho (implementado el 2026-11-13):

- **Las publicables viajan en la proyección pública**, no en su colección, y las reglas cierran `faqs` al invitado. En una boda abierta no hay sesión de invitado con la que leer nada, así que una regla con `isGuestOf` dejaría sin preguntas justo al modo por defecto; y una pregunta apagada o a medio escribir es trabajo en curso de la pareja, que no tiene por qué estar al alcance de una consulta directa. Va con su batería de aislamiento (`tests/rules/faqs.spec.ts`).
- **Solo se publican las que tienen pregunta y respuesta.** La semilla de fábrica nace con la respuesta vacía, y publicarla sería prometerle al invitado algo que no está. La pantalla del panel avisa de cuántas quedan así.
- La respuesta pasa por el **mismo saneador** que las secciones (regla de oro 5).
- En la web son `<details>` agrupados por categoría: HTML y no JavaScript, así que se abren antes de que arranque Angular y con el teclado. Buscador solo a partir de **diez** preguntas, que busca también dentro de las respuestas y sin acentos.
- La **categoría es texto libre** —cada boda agrupa como quiere— pero el panel sugiere las ya usadas, para que no acaben existiendo «Cómo llegar» y «como llegar».
- Los **iconos son una lista cerrada** y presente en los dos sprites: uno que solo estuviera en el del panel se pintaría como un hueco en la web del invitado.
- Lo que **todavía no está**: el `color` por pregunta (el icono y el grupo ya distinguen bastante; se verá si hace falta), el **contacto de referencia** y el `linkTo` a otro módulo, que espera a que esos módulos existan.

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
  recommended: bool, order, enabled: bool
```

`category` es una de `hotel`, `rural`, `apartamento`, `camping` u `otro`, y es
la que decide el icono: no hay icono ni color por ficha. Un color por hotel no
le dice nada al invitado —no significa nada, y el color que no significa nada
está prohibido (§9.1)—, y el icono se deduce de lo que es: `tent` para el
camping y `bed` para todo lo demás.

El campo del destacado se llama **`recommended`**, no `featured`: es la palabra
que usa la pantalla («el que recomendáis») y la que entiende la pareja. Ausente
es `false`.

`enabled` ausente es **activo**, como en las demás listas: una ficha que la
pareja apaga desaparece de la web y sigue en su panel. Lo publicable se queda
además en **20 fichas**, que es lo que una web de boda puede enseñar sin
convertirse en un buscador de hoteles.

**Lo que decide si se publica.** Una ficha sin nombre no se publica —no es una
ficha—, y el resto de los campos son opcionales a propósito: la pareja apunta
el hotel con lo que sabe y lo completa después. El panel avisa de lo que el
invitado va a notar: una ficha que no se publica, un plazo de reserva vencido o
a punto de vencer, habitaciones bloqueadas sin fecha hasta la que valen, y una
ficha sin teléfono ni web, con la que no se puede reservar.

**El plazo cuenta el día entero**: «hasta el 1 de junio» incluye el 1, y a una
semana o menos la web lo marca como urgente. Un plazo vencido **se dice**, no se
esconde: el invitado que mira la web el día 2 necesita saber que ya no hay
bloqueo, no quedarse esperando una tarifa que ya no existe.

**El teléfono y la web se guardan normalizados** con las mismas funciones que
usa el servidor (`telefonoValido`, `webValida`), y el formulario marca en rojo
lo que el servidor va a rechazar. De la web solo se admiten `http` y `https`:
un `javascript:` en el sitio donde la web pública pinta un enlace es el mismo
agujero que el saneador evita en los textos (§9.3).

- **Enlace con el mapa (hecho, F2.4b):** cada alojamiento puede apuntar a una ubicación del mapa (`locationId`, §8.6), con el mismo selector que la cronología. En la web sale «Cómo llegar» con el enlace de navegación; si la ubicación no es pública, se publica sin enlace.

### 8.11 Dress code

- Descripción del código de vestimenta con texto enriquecido.
- **Paleta de colores sugeridos y colores a evitar**, mostrada como muestras. Cada muestra lleva su nombre escrito: el color solo no comunica "verde oliva" a nadie.
- **Moodboard de imágenes de referencia**, que es como se entiende de verdad un dress code.
- Indicaciones diferenciadas opcionales por rol o por grupo (por ejemplo, distinto para el cortejo que para el resto).
- Avisos prácticos: si la ceremonia es en exterior sobre hierba, el aviso sobre tacones vale más que tres párrafos de estilo.

```
weddings/{weddingId}
  modules.dressCode.config
    description: string            // texto enriquecido, saneado en servidor
    suggestedColors: string[]      // ids de la lista cerrada, 8 como máximo
    avoidColors: string[]          // ids, 8 como máximo
    tips: string[]                 // avisos prácticos, 6 de 140 caracteres
```

No tiene colección propia porque es un contenido único por boda y no una lista
(§5.10). Eso obliga a un cuidado que los demás módulos no necesitan: la
**configuración de un módulo nunca se copia a la proyección pública** —suele
traer datos internos—, así que lo que se publica se **construye** campo a campo
a partir de estos cuatro, como el resto de la proyección.

**Los colores son ids de una lista cerrada, no hexadecimales.** Es lo que hace
cumplible el requisito de que cada muestra lleve su nombre: el nombre sale de la
misma lista que el color y no pueden discrepar. Y es lo que evita que un valor
del documento acabe dentro de un atributo de estilo de la web pública: el
dominio vuelve a resolver cada id contra la lista en los dos lados, y un id que
no existe se cae. La lista, los treinta colores y el por qué están en `D-38`.

**Quien decide si el invitado lo ve es su sección**, en `content.sections`,
igual que con las preguntas frecuentes, la cronología y los alojamientos. El
interruptor del módulo no entra: si entrara, una pareja podría escribir su dress
code, verlo en su panel y no entender por qué no sale en la web.

**El panel avisa de lo que el invitado no puede resolver**: un color que está a
la vez en «nos encantan» y en «a evitar», y una sección que saldría con el
título solo porque no hay nada escrito.

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

Cómo está hecho (implementado el 2026-11-13):

- **Lo interno se queda fuera de la proyección pública**, que es lo único que de verdad cumple «la hora a la que llega el fotógrafo no es asunto de los invitados»: el documento público es lo que el invitado lee, y las reglas cierran `timelineEvents` igual que `faqs` —una regla no puede filtrar por `visibleToGuests` en una consulta de lista—.
- **El orden es la hora, no un campo `order`.** En una cronología el orden _es_ la hora, y dejar que un número escrito a mano la contradiga solo serviría para que la pareja viera su día desordenado. `order` queda como desempate.
- **La boda acaba de madrugada.** Las horas anteriores a las 6:00 cuentan como del día siguiente: «04:00» va después de «23:30», no antes. Sin esto, la barra libre aparecería antes de la ceremonia y los avisos dirían cualquier cosa.
- **Avisos de solapes y huecos** (§8.13) con los nombres de los hitos, y calculados **también sobre los internos**: un solape entre el montaje y la ceremonia es justo el error que hay que cazar. Un hueco es un rato de **dos horas o más**: hora y media entre el cóctel y el banquete es la vida normal de una boda. Son avisos, no errores: una boda tiene cosas que pasan a la vez.
- Los **iconos son una lista cerrada** del set curado, presentes en los dos sprites, y los **colores salen de la paleta de categorías** del sistema visual: aquí no se inventa ninguno. El color nunca viaja solo —al lado van el icono, la hora y, si es interno, su etiqueta—.
- **Enlace con el mapa (hecho, F2.2b):** cada hito puede apuntar a una ubicación del mapa (`locationId`, §8.6). En la web sale «Cómo llegar» con el enlace de navegación. Si esa ubicación no es pública, la proyección deja `locationId` en `null` y el hito se publica sin enlace; el servidor valida el id.

### 8.14 Playlist colaborativa

Módulo completo e independiente, además de la pregunta del RSVP.

- Los invitados **sugieren canciones** (título y artista) y **votan** las de otros. Un voto por invitado y canción.
- Las canciones pedidas en el RSVP **entran automáticamente** en la lista, sin que la pareja tenga que copiarlas.
- Detección de duplicados por título y artista normalizados al sugerir.
- Vista para la pareja ordenada por votos, con marcado de aceptada, descartada y **lista de veto** para las canciones que no quieren oír bajo ningún concepto.
- Exportación de la lista definitiva para el DJ, ordenada o agrupada por momento.
- Moderación opcional, igual que la galería.

**Lo que hay hecho (F3.4).** Colección `playlistSuggestions/{id}` con `title`, `artist`, `suggestedBy`, `source` (`guest`, `rsvp` o `couple`), `votes` (conjunto de `guestId`) y `status` (`pending`, `accepted`, `discarded`, `vetoed`). Lo decidido al construirlo está en `D-41`; lo esencial:

- **La colección es solo de la pareja.** El invitado la lee con `listPlaylist`, que devuelve cada canción con su recuento y si la ha votado él, **sin ningún `guestId`**. Proponer (`suggestSong`) y votar (`voteSong`) son transacciones con sesión verificada.
- **Duplicados**: el título y el artista se comparan sin tildes, mayúsculas, signos ni paréntesis; proponer algo que ya está suma el voto en vez de repetirlo. Un voto por invitado y canción por construcción (es un conjunto). Máximo 5 canciones nuevas por invitado y 300 en total.
- **Vetada o descartada** sale de la vista del invitado y no se puede volver a proponer; el invitado solo ve «no está disponible».
- **RSVP**: la respuesta a la pregunta `cancion` entra sola, con su voto, sin gastar el tope de propuestas y sin poder romper la confirmación.
- **Panel** `/panel/playlist`: «Por decidir» primero, cada estado con su recuento, y la exportación XLSX para el DJ («Suena» por votos y «No poner»).
- Sin moderación previa y sin agrupar por momento (`F3.4b`).

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

**Lo que hay hecho (D-49):** `/panel/budget` (plan extendido): partidas agrupadas por categoría con estimado, real, vencimiento y «pagada» (se refleja al tocar y se deshace si falla), totales y desviación, y exportación a CSV con `;` y BOM para Excel. Todo en **céntimos**. Nace con las partidas del **catálogo del superadmin** (mismo comportamiento que las tareas, §8.17). No hay aún presupuesto objetivo, colores por categoría ni proveedores.

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
- Filtro por responsable, para repartir el trabajo entre los dos sin discutirlo dos veces, y por **estado, categoría y texto**.
- Al completar una tarea se guardan **cuándo y quién** (`doneAt`, `doneByUid`, `doneByEmail`) y la pantalla los enseña.

**Lo que hay hecho (F4.1):** la pantalla `/panel/checklist` y el aviso del inicio. El **estado no se guarda**: se calcula contra «hoy» a partir de `done` y `dueDate` (vencida si el día ya pasó, «esta semana» hasta siete días, próxima, sin fecha, hecha). El filtro por persona enseña **las suyas y las de los dos**. Quedan para después las vinculaciones a proveedor y partida (no hay aún pantalla de proveedores ni de presupuesto) y recalcular las fechas de la plantilla si cambia la boda.

**Catálogo de originales (D-49):** el superadmin gestiona en `/superadmin/catalogos` las tareas originales (CRUD), que se **vuelcan a cada boda nueva** y luego cada pareja edita a su gusto. Cambiar el catálogo **no toca las bodas ya creadas**. Con el catálogo sin tocar se usan las de fábrica; un catálogo con todo desactivado siembra nada.

### 8.18 Panel de superadmin

- Listado de bodas con slug, estado, fecha, plan, invitados y última actividad.
- Alta de boda mediante `provisionWedding`.
- Suspender, archivar y reactivar.
- Acceso de soporte al panel de una boda, siempre registrado.
- **Registro de accesos de los novios**: qué cuenta entró, cuándo, desde qué IP y con qué agente, con vista por boda y vista global. Sirve para soporte y para detectar cuentas compartidas o abandonadas.
- Métricas agregadas: bodas activas, altas del mes, almacenamiento consumido, partidas de quiz, accesos de invitados.
- **Estadísticas y límites por boda** (`/superadmin/estadisticas`): los totales de arriba y una fila por boda con fotos frente a su tope, invitados, partidas de quiz y accesos. El superadmin fija el **tope de fotos** de una boda (entero de 1 a 5000, o «por defecto»), que se escribe por `setWeddingLimits` —nunca desde el navegador: `limits` es campo de sistema— y queda en el registro de auditoría con el valor anterior y el nuevo. El almacenamiento es una **estimación** (fotos × 0,3 MB). Se miden como mucho 200 bodas por consulta, y los conteos son por agregación (`count()`) para que mirar esto cueste céntimos.

- **Ficha de boda** (`/superadmin/bodas/:id`, S1.7): resumen, **contacto de la pareja** (correos de Firebase Auth, último acceso), cobros y las **últimas 100 entradas** del registro de auditoría de esa boda.
- **Recuperar el acceso de la pareja** (S1.6b): desde la ficha, «Enlace de restablecimiento» (`generateCoupleResetLink`) genera el enlace de Firebase Auth y lo enseña para copiarlo. **No se envía ningún correo** (no hay proveedor, §11.5): lo pasa Gabriel. Solo vale para cuentas que sean de esa boda; el enlace no se guarda ni se escribe en el log.
- **Cobros** (`/superadmin/finanzas`, S1.3e): libro por boda con importe en céntimos, método, estado, fecha de cobro, número de factura y notas; totales de cobrado y pendiente, filtros por boda y estado, y **exportación a CSV** de lo que se ve. No hay pasarela de pago, no emite facturas y no fija precios (D-02).
- **Recordatorios** (`/superadmin/recordatorios`, S1.3f): a los **60 días** de la boda, para cada boda activa, el correo de agradecimiento, la encuesta de satisfacción, el aviso a la pareja de que puede bajar las fotos y de que la web se cierra, y la tarea de cierre para el superadmin. Se enseñan dos semanas antes, con el texto listo para copiar, y se **marcan como enviados** a mano. No se envía nada.

**Lo que hay hecho (F3.1d, S1.3e/f, S1.6b, S1.7):** estadísticas y tope de fotos, ficha de boda, restablecimiento, cobros y recordatorios. Otros límites por boda (invitados, mesas) y las notificaciones automáticas (S1.3g) no existen todavía.

### 8.19 Nuestra historia

Solo plan extendido (`modules.story`), con página propia `/historia` en la web pública y cartel en la home (sección de tipo `historia`, en el sitio de la antigua sección de texto «Nuestra historia»).

Cinco apartados **fijos**, en este orden: _Nos conocemos desde_, _El primer beso_, _Nuestro mejor recuerdo_, _Nuestro mejor viaje_ y _La pedida_. Cada uno lleva un texto enriquecido (el mismo Jodit acotado del resto de la web, hasta 4 000 caracteres) y **hasta dos fotos**, que se pintan debajo del texto, entre un apartado y el siguiente.

```
weddings/{weddingId}.content.story.{clave} = { html, fotos: [ { url, path } ] }
```

- El HTML se sanea **en el servidor** al proyectarlo (regla de oro 5). Las fotos solo pueden ser URLs de descarga de Firebase Storage (lista blanca) y a la web pública **no llega la `path`**.
- La proyección publica `content.historia` como lista de los cinco apartados, o `[]` si no hay nada escrito ni subido. Un apartado vacío no se pinta.
- Las fotos van a `weddings/{id}/story/` (§5.12), se reducen en el navegador antes de subir, y al quitarlas se borra primero la referencia y después el fichero.
- Panel: `/panel/story`, cada apartado se guarda por separado.

---

## 9. Requisitos no funcionales

### 9.1 Sistema visual: color e iconografía

Pediste que todo sea extremadamente visual e intuitivo por colores. Eso solo funciona si el color significa siempre lo mismo, y si además **nunca es lo único que comunica**. Un sistema de color inconsistente es peor que no tener color.

**Dos paletas separadas, que no se mezclan nunca.**

1. **Paleta de marca de la boda.** Los 6 colores que elige la pareja. Mandan en la **web pública**: portada, secciones, tipografías, botones.
2. **Paleta semántica del panel.** Fija, idéntica en todas las bodas, no configurable. Es la que da significado al estado de las cosas y por eso no puede depender del gusto cromático de cada pareja: si en una boda "confirmado" es verde y en otra es burdeos porque pegaba con las flores, el sistema deja de ser intuitivo.

**Vocabulario semántico fijo:**

| Significado                      | Se usa en                                                                |
| -------------------------------- | ------------------------------------------------------------------------ |
| Confirmado / hecho / pagado      | RSVP, checklist, presupuesto, proveedores, agradecimientos               |
| Pendiente / sin respuesta        | RSVP, tareas abiertas, regalos sin agradecer                             |
| Rechazado / descartado / vencido | RSVP declinado, tareas vencidas, proveedores descartados                 |
| Atención / requiere revisión     | Mesa fuera de mínimo o máximo, presupuesto desviado, fotos en moderación |
| Informativo / neutro             | Notas, elementos desactivados                                            |

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
- **Retención:** los datos de una boda se conservan hasta _(pendiente, ver sección 12)_ meses después de la fecha, tras los cuales la boda se archiva y después se purga, previo aviso a la pareja.
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

| Fase                                                | Contenido                                                                                                                                                                                                                                          | Resultado                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F0 — Fundaciones**                                | Proyecto Angular, resolución de tenant por hostname, Firebase configurado, auth de la pareja, reglas de seguridad con su batería de tests, `provisionWedding`, panel de superadmin mínimo con registro de accesos, esqueleto del panel             | Se puede dar de alta una boda y entrar a su panel vacío                                                                                           |
| **F1 — Núcleo vendible**                            | Web pública con plantillas y edición sobre vista previa, invitados con grupos e importación, acompañantes con acceso propio, RSVP con formulario dinámico, los tres modos de acceso, contadores de acceso, compartir por WhatsApp                  | **Una boda real puede usarse de principio a fin.** Es el mínimo comercializable                                                                   |
| **F2 — Banquete, ubicaciones y contenidos del día** | Mesas con arrastrar y soltar con mínimos y máximos, mapa interactivo con marcadores y cómo llegar, timeline con iconos y colores, **preguntas frecuentes**, **alojamientos**, **dress code**, **personas importantes**, exportaciones a XLSX y PDF | El invitado tiene resuelto todo lo que pregunta antes de una boda: dónde es, cómo llego, dónde duermo, cómo voy vestido y a qué hora es cada cosa |
| **F3 — Participación de invitados**                 | Galería con audiencias por grupo y moderación, **quiz** con gestión, ranking y partidas por invitado, **playlist colaborativa** con votos, libro de firmas, lista de regalos y aportación                                                          | Diferenciación frente a la competencia. El quiz y la galería por grupos son los dos módulos que nadie más tiene                                   |
| **F4 — Gestión interna de la pareja**               | Presupuesto, proveedores con tareas asignadas, checklist, **regalos recibidos y agradecimientos**                                                                                                                                                  | La pareja organiza toda la boda dentro de la herramienta, y la semana siguiente también                                                           |
| **F5 — Escala comercial**                           | Formulario público de solicitud, enlaces de proveedor, aviso por Telegram, liquidación por proveedor, WhatsApp Business API, plano real de finca                                                                                                   | El alta deja de empezar por un WhatsApp. **La activación sigue siendo manual**: sin pasarela no hay self-service (D-25)                           |

**Notas sobre el orden.**

- El quiz sube a F3 y no espera al final: es material ya escrito y probado en el prototipo `wedding-quiz`, así que su coste marginal es portarlo al modelo multi-tenant, no diseñarlo.
- **El sistema visual (§9.1) se construye en F0**, antes que ningún módulo. Los colores semánticos, la paleta categórica y el set de iconos son infraestructura compartida: si se dejan para el final, cada módulo inventa los suyos y el resultado es exactamente lo contrario de lo que pediste.
- FAQ, alojamientos, dress code y personas importantes están en F2 y no antes porque, siendo baratos de construir, no son lo que hace vendible el producto: son contenido que la pareja rellena. F1 sigue siendo el mínimo comercializable.

---

## 11. Riesgos

| Riesgo                                                                | Impacto                                           | Mitigación                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Un fallo en las reglas de seguridad expone datos entre bodas          | Crítico, reputacional                             | Batería de tests de aislamiento como requisito de release; revisión de reglas en cada PR que toque el modelo                                                                               |
| Fuerza bruta sobre los últimos 4 dígitos del teléfono                 | Medio                                             | Límite de intentos, App Check, respuestas genéricas, log de accesos                                                                                                                        |
| Coste de almacenamiento disparado por la galería                      | Medio                                             | Cuotas por plan, compresión en subida, límites de tamaño en reglas                                                                                                                         |
| Alcance del MVP demasiado ancho (los cuatro grupos de módulos entran) | Alto, en plazo                                    | Las fases F1–F4 secuencian la entrega; F1 ya es vendible por sí sola                                                                                                                       |
| Tope no documentado de dominios autorizados en Firebase Auth          | Alto si se alcanza: rompe el alta de bodas nuevas | La API no publica límite. Contar los dominios dados de alta, avisar al superadmin en 500 y tener listo el plan B: mover el panel a `app.nupcialis.com` y resolver la boda por el claim     |
| Un proveedor no liquida lo que ha vendido                             | Medio, económico                                  | La boda se activa antes de cobrar por decisión consciente (D-26). Vista de saldo por proveedor, y `active: false` en el proveedor corta las altas nuevas sin tocar las bodas ya entregadas |
| Cobrar por Bizum con número personal publicado                        | Medio, privacidad del operador                    | El número no aparece en la web pública, solo en la pantalla de confirmación tras enviar la solicitud                                                                                       |
| Un ingreso sin referencia reconocible                                 | Bajo, operativo                                   | El panel permite marcar cobrada una solicitud sin que cuadre la referencia, y busca por importe y nombre                                                                                   |
| Cookie de un subdominio de boda visible en otro                       | Medio                                             | Cookies de sesión sin atributo `Domain`, prefijo `__Host-`, `Secure`, `HttpOnly`, `Path=/` y validación de `Origin`. Valorar entrada en la Public Suffix List                              |
| Dependencia del wildcard del proveedor de hosting                     | Bajo                                              | El modelo de datos no depende del subdominio; el fallback de rutas `nupcialis.com/<slug>` funciona sin migración                                                                           |
| Fuga del plano de mesas o notas privadas a invitados                  | Alto                                              | `notes` y datos de gestión nunca entran en la proyección pública                                                                                                                           |
| Una foto de un grupo restringido llega a quien no debe                | Alto, es una promesa explícita al invitado        | `photos` cerrada en reglas; la visibilidad la resuelve siempre `listPhotos`; test de aislamiento por grupo en la batería de reglas                                                         |
| Puntuaciones de quiz falseadas desde la consola                       | Bajo, pero arruina el juego                       | Corrección y puntuación en servidor; `quizResults` no admite escritura desde cliente                                                                                                       |
| XSS almacenado a través del editor de contenidos                      | Alto: lo verían todos los invitados               | Saneado en servidor antes de publicar, barra de edición acotada, sin HTML libre                                                                                                            |
| El panel de regalos recibidos se filtra                               | Crítico, reputacional                             | Colección privada, fuera de la proyección pública, sin exportaciones compartidas; test de aislamiento propio                                                                               |
| Cada módulo inventa sus colores e iconos                              | Medio, pero destruye la promesa de producto       | Sistema visual construido en F0 como infraestructura, no por módulo                                                                                                                        |
| Un invitado añade acompañantes sin límite                             | Medio                                             | Cupo por titular validado en `addCompanion` contando los ya creados, no confiando en el cliente                                                                                            |
| El teléfono de un acompañante lo aporta un tercero                    | Medio, RGPD                                       | Aviso expreso en el formulario y finalidad recogida en la política de privacidad                                                                                                           |

---

## 12. Decisiones pendientes

Ninguna bloquea el arranque del desarrollo. **El registro vivo es `docs/PENDIENTES.md`** (las `D-xx`): esta lista es el contexto con el que nacieron, y cuando una se decide se anota aquí también, para que las dos no digan cosas distintas.

1. **Ciclo de vida post-boda.** Cuánto tiempo permanece viva la web y los datos tras la fecha, si se ofrece renovación y cuándo se purga. Afecta a retención RGPD y a coste. Los registros de acceso deberían purgarse antes que el resto.
2. **Precio y planes.** El reparto de módulos vive en `functions/src/dominio/planes.ts`: el básico es de **una sola página** con seis módulos, y galería y quiz son solo del extendido porque las dos necesitan ruta propia. **El catálogo de dieciocho módulos se mantiene** (decidido el 2026-11-13): lo que todavía no está construido sale en el panel diciendo «En camino», no escondido. Queda por decidir el **precio** de cada plan.
3. **Librería del editor de texto enriquecido. Decidida: Jodit con `ngx-jodit`** (ver `D-03`, confirmada el 2026-11-13). Ya no hay prueba comparativa pendiente. Siguen en pie el saneado en servidor y la barra acotada, y se carga **solo en el panel**: en la web pública no hace falta y ahí hay 200 kB de presupuesto que defender.
4. **Confirmar la librería de mapas.** La recomendación es Leaflet o MapLibre sobre OpenStreetMap para evitar clave y facturación de Google. Si prefieres el aspecto de Google Maps, hay que asumir clave con facturación y restricción por _referrer_ poco estrecha por el wildcard.
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
