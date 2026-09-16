# Nupcialis — Decisiones pendientes

Decisiones abiertas que Claude **no debe resolver por su cuenta**. Si una tarea
tropieza con una de estas, se para y se pregunta.

Estados: `abierta` · `en estudio` · `decidida` (con fecha y resultado).

| ID   | Decisión                                                                   | Bloquea                          | Estado                                                       |
| ---- | -------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| D-01 | Ciclo de vida post-boda: cuánto vive la web y los datos, renovación, purga | F5, RGPD                         | abierta                                                      |
| D-02 | Precio y planes: qué módulos son `basic` y cuáles `premium`                | F5                               | abierta                                                      |
| D-03 | Librería del editor de texto enriquecido                                   | F1                               | **decidida 2026-09-08: Jodit con `ngx-jodit`**               |
| D-04 | Confirmar librería de mapas (Leaflet/MapLibre frente a Google Maps)        | F2                               | abierta                                                      |
| D-05 | Email transaccional: proveedor y si entra en el producto                   | F5                               | abierta                                                      |
| D-06 | WhatsApp Business API                                                      | F5                               | abierta                                                      |
| D-07 | Dominio propio de la pareja                                                | —                                | abierta                                                      |
| D-08 | PWA e instalación en el móvil del invitado                                 | —                                | abierta                                                      |
| D-09 | Comportamiento de los módulos con identidad en modo de acceso abierto      | F3                               | abierta                                                      |
| D-10 | Plano real de la finca                                                     | F5                               | abierta                                                      |
| D-11 | Repeticiones del quiz: valor por defecto y qué muestra el ranking          | F3                               | abierta                                                      |
| D-12 | Familia de iconos base                                                     | **F0**                           | **decidida 2026-09-08: Phosphor**                            |
| D-13 | Reserva de regalos sin identidad en modo abierto                           | F3                               | abierta                                                      |
| D-14 | Consentimiento para publicar fotos de terceros en Personas importantes     | F2, RGPD                         | abierta                                                      |
| D-15 | Dominio definitivo                                                         | **Bloque 1 de puesta en marcha** | **decidida 2026-09-08: `nupcialis.com`, comprado**           |
| D-16 | Dónde vive el panel de la pareja                                           | F0.3, F0.4                       | **decidida 2026-09-08: subdominio de la boda**               |
| D-17 | Acceso a Firebase desde el cliente: AngularFire o SDK directo              | F0.1                             | **decidida 2026-09-08: SDK modular directo**                 |
| D-18 | Cómo se cargan los servicios de Firebase                                   | F0.1                             | **decidida 2026-09-08: por ruta, en chunks diferidos**       |
| D-19 | Dónde se importa el SDK de Firestore                                       | F0.3                             | **decidida 2026-09-08: en ficheros `*.firestore.ts`**        |
| D-20 | Maquetación de la web pública según el plan                                | F0.6, F1                         | **decidida 2026-09-10: básico onepage, extendido multipage** |
| D-21 | Qué determina el precio                                                    | F5                               | **decidida 2026-09-10: el plan, no los módulos**             |
| D-22 | Borrador a nivel de módulo                                                 | F0.6, F1                         | **decidida 2026-09-10: `hidden` · `soon` · `visible`**       |
| D-23 | Dónde se configuran planes y precios                                       | F0.7                             | **decidida 2026-09-10: editables desde el superadmin**       |
| D-24 | Cinco decisiones tomadas al implementar el alta                            | F0.6                             | **pendiente de validar**                                     |
| D-25 | Cómo se cobra sin pasarela de pago                                         | F5, landing                      | **decidida 2026-09-14: Bizum y activación manual**           |
| D-26 | Proveedores que comercializan la web y liquidan aparte                     | F5                               | **decidida 2026-09-14: tarifa mayorista, sin acceso**        |

---

## Detalle

### D-01 · Ciclo de vida post-boda

Cuánto tiempo permanece viva la web y los datos tras la fecha, si se ofrece
renovación de pago y cuándo se purga todo. Afecta al plazo de conservación del
RGPD y al coste de almacenamiento, que es el único que escala de verdad.
Los registros de acceso deberían purgarse antes que el resto: 12 meses como
referencia.

### D-02 · Precio y planes

El campo `plan` ya está en el modelo. Candidatos naturales a `premium`: quiz,
galería con audiencias por grupo, mapa, cuota ampliada de almacenamiento.

### D-03 · Editor de texto enriquecido — **DECIDIDA 2026-09-08: Jodit con `ngx-jodit`**

Se usa el wrapper mantenido por la comunidad, no el oficial. Sigue vigente el
requisito de saneado en servidor y barra acotada. Si el peso en el bundle pone en
riesgo el presupuesto de 200 KB en la web pública, se carga solo en el panel, que
es donde de verdad hace falta.

Contexto original:
Jodit es MIT y sirve, pero su wrapper oficial de Angular está declarado sin
mantenimiento activo por su propio autor; el mantenido por la comunidad es
`ngx-jodit`. La versión 4.7.6 que se manejaba va varias menores por detrás de la
actual. Para una barra tan acotada como la que necesitamos puede pesar de más.

### D-04 · Librería de mapas

Recomendación: Leaflet o MapLibre sobre OpenStreetMap, sin clave ni facturación,
con enlaces profundos a Google Maps para navegar. La alternativa, Maps JavaScript
API, exige clave con facturación, se paga por carga y obliga a restringir por
_referrer_; con subdominios wildcard esa restricción sería `*.nupcialis.com/*`,
tan ancha que apenas protege.

### D-05 · Email transaccional

Hoy fuera de alcance: la comunicación con invitados se hace compartiendo el
enlace por WhatsApp manualmente, y solo se usan los correos propios de Firebase
Auth. Si se quieren recordatorios automáticos a quienes no han confirmado, hará
falta proveedor.

### D-06 · WhatsApp Business API

No descartado. Coste por mensaje, plantillas aprobadas por Meta y alta como
empresa. Previsto para F5.

### D-07 · Dominio propio de la pareja

`mariaygabriel.com` apuntando a su boda es técnicamente posible, pero
reintroduce trabajo manual de certificados, que es justo lo que la arquitectura
wildcard elimina. Evaluar como extra de pago.

### D-08 · PWA

Interesante para la galería y el quiz el día de la boda, con cobertura mala en la
finca. No decidido.

### D-09 · Módulos con identidad en modo abierto

Con entrada abierta no hay identidad. ¿Qué hacen entonces la galería con
audiencias, el ranking del quiz y el libro de firmas atribuido?
**Propuesta a validar:** en modo A esos módulos o se desactivan o funcionan en
modo anónimo, sin ranking nominal ni audiencias por grupo, porque ambas cosas
necesitan saber quién es quién.

### D-10 · Plano real de la finca

El lienzo de mesas de F2 es genérico a propósito. Reproducir el salón concreto de
cada hacienda es un módulo aparte y caro. Evaluar como extra de pago en F5.

### D-11 · Repeticiones del quiz

Está modelado como configurable y el historial guarda todas las partidas. Falta
decidir el valor por defecto y si el ranking muestra la mejor puntuación o la
primera.

### D-12 · Familia de iconos base — **DECIDIDA 2026-09-08: Phosphor**

**Resultado del spike S-2.** Se contrastaron Phosphor, Lucide y Tabler contra 50
conceptos reales del producto, buscando nombres exactos en cada librería:

|                               | Phosphor                                          | Lucide   | Tabler            |
| ----------------------------- | ------------------------------------------------- | -------- | ----------------- |
| Cobertura de los 50 conceptos | **50/50**                                         | 49/50    | 49/50             |
| Le falta                      | —                                                 | WhatsApp | un icono de baile |
| Iconos por peso               | 1.512                                             | 2.074    | 5.130             |
| Pesos disponibles             | **6** (thin, light, regular, bold, fill, duotone) | 1        | 2                 |
| Licencia                      | MIT                                               | ISC      | MIT               |

Dos motivos decisivos:

1. **Es la única con `dress`**, además de `cheers`, `taxi`, `disco-ball`,
   `confetti` y `whatsapp-logo`. Para un producto de bodas eso importa.
2. **Los seis pesos son un mecanismo de estado**, no decoración: `regular` para
   inactivo y `fill` para activo o seleccionado, con el mismo icono. Encaja
   directamente con la regla de §9.1 de que el color nunca viaja solo.

El tamaño de la librería es irrelevante: se curan 80-100 iconos y se compilan en
un sprite SVG propio, así que al bundle solo llega lo que se usa.

Contexto original:
Hace falta una familia con licencia comercial clara y cobertura de los conceptos
de boda. Candidatas: Phosphor, Lucide, Tabler. El set curado de 80-100 iconos se
dibuja encima, así que conviene fijarla antes de empezar el design system.

### D-13 · Reserva de regalos sin identidad

En modo de acceso abierto, una reserva anónima la puede deshacer cualquiera.
**Propuesta a validar:** en modo A la reserva se desactiva y la lista de regalos
es solo informativa.

### D-14 · Fotos de terceros en Personas importantes

Son fotos de personas identificables publicadas en una web. Decidir si basta con
el consentimiento verbal que gestiona la pareja o si conviene un aviso explícito
en el panel en el momento de subirlas.

### D-15 · Dominio definitivo — **DECIDIDA 2026-09-08: `nupcialis.com`**

**Comprado el 09/09/2026 en Hostalia.** 0,59 € el primer año, 12,99 € + IVA de
renovación. Queda registrar `nupcialis.es` de forma defensiva, que allí es gratis
el primer año.

Registrador elegido tras verificar que Hostalia permite apuntar los nameservers
a Vercel, que era el único requisito técnico duro. Ver `PUESTA-EN-MARCHA.md`.

Riesgo asumido y consciente: la cadena "nupci**alis**" contiene "cialis", marca
farmacéutica muy conocida. Es previsible que alguien haga la broma. Se acepta.

**Contexto de por qué se descartó el nombre original "SiQuiero"** (consultas al
registro el 07/09/2026): `siquiero.com` estaba registrado desde 2001 y aparcado en
ParkingCrew, es decir, en venta a precio de negociación desconocido.
`siquiero.app` lo había registrado alguien en febrero de 2026. `siquiero.net`
estaba libre y `siquiero.es` no se pudo verificar porque el `.es` no expone RDAP
público fiable. Se optó por cambiar de nombre en lugar de negociar un dominio
aparcado. `elsiquiero.com` también estaba libre y quedó como alternativa
descartada.

### D-16 · Dónde vive el panel de la pareja — **DECIDIDA 2026-09-08: subdominio de la boda**

Los requisitos dicen `<slug>.nupcialis.com/panel`. Firebase Auth mantiene una lista
de dominios autorizados para OAuth y no consta que admita comodines; si no los
admite, el acceso con Google se rompe en cada boda nueva. Los invitados no se ven
afectados porque entran con `signInWithCustomToken`.
**Alternativa segura:** panel en un host fijo `app.nupcialis.com`, resolviendo la
boda por el claim del token. Ventajas adicionales: un solo origen OAuth, cookies
del panel aisladas de los subdominios de las bodas (ver el aviso de Vercel sobre
la Public Suffix List) y el bundle del panel fuera del dominio de los invitados.
**Resultado del spike S-1 (08/09/2026):** Firebase Auth **no admite comodines** en
la lista de dominios autorizados, pero **sí permite añadirlos por API** con el
Identity Toolkit Admin API v2 (`PATCH admin/v2/projects/{projectId}/config`,
autenticado con una cuenta de servicio).

**Decisión:** el panel se queda en `<slug>.nupcialis.com/panel`, y
`provisionWedding` añade el subdominio a los dominios autorizados como un paso más
del alta. La intervención humana sigue siendo cero.

**Riesgo abierto:** no hay límite documentado de dominios autorizados. La
referencia de la API solo dice "List of domains authorized for OAuth redirects",
sin cifra. Google tiene topes no publicados en otras configuraciones, así que hay
que instrumentarlo: contar los dominios dados de alta, avisar al superadmin al
llegar a 500 y tener preparado el plan B, que es mover el panel a `app.nupcialis.com`.
Se recoge como riesgo en `REQUISITOS.md` §11.

**Nota adicional:** sigue vigente el aviso de Vercel sobre la Public Suffix List.
Sin entrada en la PSL, `boda1.nupcialis.com` puede escribir una cookie con
`Domain=nupcialis.com` que el navegador enviará a `boda2.nupcialis.com`. Mitigación
mientras tanto: cookies de sesión sin atributo `Domain`, prefijo `__Host-`,
`Secure`, `HttpOnly`, `Path=/` y validación de `Origin`.

### D-17 · Sin AngularFire — **DECIDIDA 2026-09-08**

Los requisitos preveían AngularFire. Al fijar versiones aparecieron dos conflictos
reales, no teóricos:

- **AngularFire 20.0.1 es la última publicada y declara `@angular/core: ^20.0.0`.**
  No hay versión para Angular 22.
- **`@firebase/rules-unit-testing` 5 exige `firebase ^12`, y AngularFire arrastra
  `firebase ^11`.** Los tests de reglas son requisito de release, así que ese
  conflicto no es negociable.

**Decisión: SDK modular de Firebase v12 directamente**, sin wrapper. Verificado:
Angular 22 + firebase 12 + rules-unit-testing 5 instalan sin conflictos y la
aplicación compila.

Lo que se pierde es poco en esta arquitectura: el valor principal de AngularFire
es la integración con zonas y los observables de conveniencia, y aquí la
aplicación es **zoneless** y la mayoría de los accesos sensibles van por Cloud
Functions, no por consultas directas a Firestore.

Lo que se gana: no depender del ritmo de publicación de un wrapper que ya va dos
versiones mayores por detrás de Angular.

**Regla derivada:** `firebase/*` solo se importa dentro de `src/app/core/firebase`.
Ningún componente ni servicio de funcionalidad importa el SDK directamente. Así, si
algún día aparece AngularFire para Angular 22 o se cambia de backend, hay un solo
sitio que tocar.

### D-18 · Firebase por ruta, no en el arranque — **DECIDIDA 2026-09-08**

Al montar la capa `core/firebase` con un único `provideFirebase()` en
`app.config.ts`, el bundle inicial pasó de **59,6 kB a 189,7 kB comprimidos**. El
presupuesto de la web pública son 200 kB, así que la infraestructura se comía el
95% antes de escribir una sola pantalla.

Medición por partes:

| Configuración               | Inicial comprimido |
| --------------------------- | ------------------ |
| Angular 22 zoneless a secas | 59,6 kB            |
| + HttpClient e i18n         | 67,9 kB            |
| + SDK de Firebase completo  | **189,7 kB**       |
| + SDK repartido por rutas   | **76,3 kB**        |

El SDK de Firebase cuesta 122 kB comprimidos. La primera solución —`providers` en
las rutas de `app.routes.ts`— **no funcionó**: ese fichero lo importa
`app.config.ts` de forma estática, así que el empaquetador arrastraba todo al
bundle inicial igualmente. Solo funcionó moviendo los `providers` **dentro de
ficheros de rutas cargados con `loadChildren`**.

Resultado: Firestore (96 kB) y Auth con Storage (18 kB) viajan en chunks
diferidos. La web pública carga Firestore bajo demanda, unos 172 kB en total,
dentro de presupuesto pero sin margen alegre. Si aprieta, la salida es servir la
proyección pública por una Cloud Function cacheada en CDN y no cargar Firestore
en la web pública en absoluto.

**Regla derivada, en `CLAUDE.md`:** ni `app.config.ts` ni `app.routes.ts` pueden
importar nada de `core/firebase` salvo `provideFirebaseApp`.

### D-19 · Los adaptadores de datos van en `*.firestore.ts` — **DECIDIDA 2026-09-08**

La regla de D-17 decía que `firebase/*` solo se importa en `core/firebase`. Al
escribir el primer adaptador de datos real se vio que no escala: cada módulo del
panel va a necesitar sus consultas, y meterlas todas en `core/firebase`
convertiría esa carpeta en un cajón de sastre que conoce el modelo de datos de
todo el producto.

**Regla nueva:** el SDK se importa en `core/firebase` y en cualquier fichero con
sufijo **`.firestore.ts`**. Se mantiene lo que de verdad prometía D-17 —que el
acoplamiento sea localizable de un `grep`— sin forzar una carpeta única. Y se
mantiene lo importante: ningún componente ni servicio de funcionalidad importa
el SDK.

Además, un `.firestore.ts` tiene un trabajo concreto: **es la frontera de
confianza**. Lo que llega de la base es `unknown` hasta que ahí se comprueba su
forma. Hacer un `as` y seguir es cómodo hasta el día en que un documento
antiguo no tiene un campo.

### D-20 · Plan básico en onepage, extendido en multipage — **DECIDIDA 2026-09-10 (Gabriel)**

Decisión de producto, no técnica, y es final: el plan **básico** sirve la web
como **una sola página** con las secciones apiladas; el **extendido**, como
**varias rutas**.

De ahí sale una consecuencia que no es negociable y conviene tener escrita: la
**galería** y el **quiz** solo existen en el plan extendido (`SOLO_EXTENDIDO` en
`functions/src/dominio/planes.ts`). No es un arancel comercial: las dos piden
ruta propia, y no se pueden meter trescientas fotos ni un juego interactivo
dentro de un scroll continuo sin arruinar la página para todos los demás.

El resto de módulos sí se pueden activar en el básico.

`layout` se deriva del plan y se guarda en el documento de la boda para que la
proyección pública no tenga que conocer los planes.

### D-21 · El precio va por plan, no por módulos — **DECIDIDA 2026-09-10 (Gabriel)**

Una pareja del plan básico puede activar todos los módulos que le quepan; paga
lo mismo. Se descarta el modelo de "cada módulo suma", que obliga a la pareja a
hacer cuentas mientras monta su boda y convierte cada activación en una decisión
de dinero.

Referencias aproximadas, pendientes de cerrar en D-02: **55 €** el básico,
**115 €** el extendido, pago único.

### D-22 · Visibilidad por módulo: `hidden`, `soon`, `visible` — **DECIDIDA 2026-09-10 (Gabriel)**

El concepto de borrador se extiende de la boda a cada módulo. Un módulo activo
puede estar:

| Estado    | Qué ve el invitado                       |
| --------- | ---------------------------------------- |
| `hidden`  | Nada. El módulo no existe para él.       |
| `soon`    | La sección, anunciada como "muy pronto". |
| `visible` | El módulo completo.                      |

Es lo que permite publicar la web meses antes de tener el menú decidido: los
invitados quieren la fecha y el sitio **ya**, y el resto puede esperar sin que la
web parezca abandonada.

Al crear una boda, todo lo que no está activo nace en `hidden`, nunca en `soon`:
una boda recién creada no debe anunciar seis secciones que quizá nunca lleguen.
Eso lo decide la pareja.

### D-23 · Planes y precios editables desde el superadmin — **DECIDIDA 2026-09-10 (Gabriel)**

Qué módulos trae cada plan y cuánto cuesta cada plan tienen que poder cambiarse
**sin desplegar**. Hoy viven en código (`functions/src/dominio/planes.ts`) porque
no hay panel todavía; en F0.7 pasan a documentos `plans/{planId}` y ese código se
queda como los valores con los que se siembra la colección.

Hasta entonces, cambiar un plan es un despliegue. Conviene no prometer otra cosa.

### D-24 · Decisiones tomadas al implementar el alta — **PENDIENTES DE VALIDAR**

Cinco cosas que hubo que decidir para que `provisionWedding` existiera y que no
estaban en los requisitos. Ninguna es irreversible, pero todas son visibles para
la pareja:

**a) La boda nace en `draft`, también si ha pagado.** La web no se publica hasta
que la pareja la da por buena. La alternativa —nacer publicada— significa que
una boda vacía, con las FAQ sin responder, es visible desde el minuto uno para
cualquiera que acierte el subdominio.

**b) El enlace de acceso se le devuelve al superadmin, no se envía por correo.**
No hay proveedor de email todavía (D-05). `provisionWedding` genera el enlace de
"establece tu contraseña" y lo devuelve en la respuesta para que el superadmin lo
reparta. Cuando haya correo, lo manda la función y el campo desaparece de la
respuesta. Mientras tanto: **ese enlace da acceso al panel de la boda**; no se
reenvía por canales que no controlemos.

**c) Se admite un solo email para la pareja.** Hay parejas que comparten
dirección, y obligarles a inventarse una segunda es peor que permitirlo. Lo que
no se admite es la misma dos veces.

**d) Las preguntas de fábrica del quiz nacen desactivadas.** Se siembran cinco
con la forma correcta pero sin respuestas, porque solo la pareja sabe dónde se
conocieron. Activas, un invitado jugaría a un quiz imposible de acertar y se
llevaría la impresión de que la web está rota.

**e) Si falla el alta del subdominio en Auth, la boda se crea igual.** Queda con
`setup.authDomain: 'pending'`, la respuesta trae un aviso y hay una función para
reintentarlo. La alternativa era tumbar el alta entera por un 503 del Identity
Toolkit. Lo que **no** se hace es seguir en silencio: ese es exactamente el fallo
que describe la regla 8 de `CLAUDE.md`.

### D-25 · Sin pasarela de pago: cobro por Bizum y activación manual — **DECIDIDA 2026-09-14 (Gabriel)**

No hay alta de autónomo, así que no se puede montar un cobro recurrente. El
dinero entra por **Bizum** y la boda la activa una persona desde el panel de
superadmin. Stripe sale del plan; el _self-service_ de la fase 5 se queda en
formulario de solicitud más activación manual.

Esto **no rompe nada de lo construido**: F0 ya asumía que `provisionWedding` lo
invoca el superadmin, no un webhook. Lo que se añade es la pieza que faltaba —la
solicitud— entre "una pareja quiere contratar" y "Gabriel da de alta la boda".

Lo que se decidió al detalle:

| Cuestión                       | Decisión                                                            |
| ------------------------------ | ------------------------------------------------------------------- |
| Slug entre solicitud y pago    | **No se reserva.** Se revalida al activar y se ofrecen alternativas |
| Datos fiscales en la solicitud | **No se piden** de momento                                          |
| Aviso de solicitud nueva       | **Telegram** al móvil del superadmin                                |
| Medios de cobro                | **Solo Bizum** (más el efectivo que liquidan los proveedores, D-26) |
| Precio                         | **Congelado** en el momento de crear la solicitud                   |
| Solicitudes que nunca cuajan   | **Purga a los seis meses**                                          |

Consecuencias que hay que respetar al implementar:

- El **número de Bizum no se publica en la web**: solo aparece en la pantalla de
  confirmación, después de enviar la solicitud. Un móvil personal en una landing
  es spam y suplantación garantizados.
- El **token del bot de Telegram es un secreto** y este repositorio es público:
  va en Secret Manager. No añade requisitos nuevos, porque desplegar cualquier
  Cloud Function ya exige el plan Blaze.
- **Conciliar es manual por definición.** Sin API del banco, nadie cruza un
  ingreso con una solicitud. El panel deja marcar cobrada una solicitud aunque la
  referencia no cuadre, y busca por importe y por nombre.
- `createWeddingRequest` es, junto a `guestLogin`, **la única escritura pública
  del sistema**. App Check y límite por IP no son opcionales ahí.

**Reversible:** el día que haya alta de autónomo, la pasarela se enchufa al mismo
flujo. La solicitud ya existe; solo cambia quién marca `paymentStatus: 'paid'`.

**Aviso, porque no es asesoramiento fiscal:** la obligación de declarar un ingreso
no depende del medio de cobro, y el alta censal en Hacienda es un trámite distinto
del alta en el RETA. Hay que contrastarlo con un gestor. La consecuencia de
producto es una: si hay que facturar, harán falta datos fiscales en la solicitud,
y hoy se ha decidido no pedirlos.

### D-26 · Proveedores comercializadores — **DECIDIDA 2026-09-14 (Gabriel)**

Una tienda de invitaciones, un fotógrafo o una finca pueden vender la web junto
con su propio producto: contratan ellos, cobran ellos a la pareja y liquidan con
nosotros aparte, en efectivo.

No es una variante de cobro: es un **actor nuevo**, y obliga al cambio de fondo
que ordena §4.1 — **el estado del servicio y el del cobro son dos ejes
independientes**. Una boda activa con el cobro pendiente pasa a ser un estado
normal del negocio.

| Cuestión                       | Decisión                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Quién se lleva el descuento    | **El proveedor: tarifa mayorista.** Lo que él cobre a la pareja no se guarda |
| ¿Activar antes de que liquide? | **Sí.** La pareja no espera a una liquidación entre terceros                 |
| ¿El proveedor ve sus bodas?    | **No ve nada.** Ni cuenta, ni panel, ni listado                              |

Cómo funciona sin construir un rol nuevo: el proveedor recibe un enlace con su
código (`/alta?ref=CODIGO`) que lleva al mismo formulario público y etiqueta la
solicitud. **El código es una etiqueta, no una credencial.** Cero superficie de
autenticación nueva.

Tres cosas que no se negocian:

- **Sin acceso a la boda.** Dentro están los teléfonos y las alergias de
  trescientos invitados. Si la pareja quiere ayuda, que le den acceso ellos.
- **El proveedor aporta datos de terceros.** Mismo problema que el acompañante de
  §5.5: el formulario advierte que debe haber informado a la pareja, y la
  finalidad consta en el aviso de privacidad.
- **El enlace de acceso va al email de la pareja**, nunca al proveedor. Es una
  credencial de la boda; al proveedor se le dice "ya está, avísales".

Lo que de verdad ahorra trabajo es la vista de saldo: _"Invitaciones Pepe: 3 bodas
activas, 165 € pendientes de liquidar"_, con un botón que cierra las tres de
golpe. Sin eso, esto se acaba llevando en una libreta.

El riesgo de impago se asume y tiene freno: `partners/{id}.active: false` corta
las altas nuevas de ese proveedor sin tocar las bodas ya entregadas, que son de
las parejas y no suyas.

### D-27 · Publicar una boda: quién puede, hacia dónde y con qué mínimo — **PENDIENTE DE VALIDAR**

Al construir el cambio de estado hubo que decidir tres cosas que los requisitos
no cierran. Van aquí para que Gabriel las confirme o las tumbe.

**1. Lo mueve el superadmin, no la pareja.** `status` es campo de sistema
(regla 6), así que pasa por `setWeddingStatus` y solo lo llama un superadmin.
Está alineado con D-25 —la activación es manual y va contra cobro—, pero deja
fuera un caso razonable: que la pareja decida cuándo se publica su propia web,
que es lo que dice `superadmin.alta.creadaDescripcion` en la pantalla de alta
("La boda nace en borrador. La pareja decide cuándo se publica"). **Hoy la
pareja no puede.** Si se quiere, es un botón en su panel llamando a la misma
función con permiso de owner.

**2. Saltos permitidos.**

| Desde      | Hacia                |
| ---------- | -------------------- |
| `draft`    | `active`, `archived` |
| `active`   | `draft`, `archived`  |
| `archived` | `active`             |

`archived` → `draft` queda fuera: no aparece ningún caso real en que una boda
archivada tenga que volver a estar a medio montar, y si lo hubiera se reactiva y
se despublica. Dos pasos conscientes en vez de uno que nadie sabe explicar.

**3. Mínimo para publicar: nombres, fecha y slug.** Publicar es lo único que
comprueba requisitos previos; despublicar y archivar funcionan siempre, porque
son las dos salidas de emergencia y una salida con condiciones no es una salida.

El mínimo sale de un fallo real: el 2026-09-14 se publicó una boda con la
proyección vacía y la portada enseñó un rombo de color y una inicial suelta. Con
esto, esa boda no se habría podido publicar. Queda la duda de si el mínimo
debería ser más exigente —al menos una sección de contenido, por ejemplo—, pero
eso espera a que existan las secciones.

### D-28 · La hora de la boda la pone la pareja, no el alta — **DECIDIDA 2026-09-16 (Gabriel)**

El alta de superadmin captura el **día** y nada más. La **hora de la ceremonia**
se fija desde el panel de la pareja, en «Datos de la boda».

Razón de negocio, dicha por Gabriel: _«yo no tengo por qué saber esa información
cuando contraten mi servicio»_. Y razón práctica: al contratar la web, muchas
parejas todavía no han cerrado la hora con la finca.

Consecuencias en el modelo (§5.2), que es donde de verdad se paga esta decisión:

- `weddingDate` guarda el **día**, como medianoche UTC. Nace de un
  `<input type="date">`, que produce `'2027-06-12'`, y `new Date()` lo interpreta
  en UTC. Ese invariante está escrito y probado en `shared/zona-horaria.ts`.
- `weddingTime` guarda la **hora de reloj** (`'17:00'`) o `null`.
- `timezone` ya existía y ahora se usa de verdad: el instante de la boda sale de
  combinar los tres.

**Por qué no un solo Timestamp.** Porque la hora de una boda es una hora de
reloj local, no un instante. Guardar el instante obliga a recalcularlo si cambia
la zona, se rompe en el fin de semana del cambio de hora, y convierte cualquier
consulta en aritmética de husos. Con día + hora + zona, el dato es lo que la
pareja diría en voz alta y el instante se deriva.

**Mientras no haya hora, la cuenta atrás enseña solo días.** No es una carencia:
las horas que quedan hasta la medianoche no son las que quedan hasta la boda, y
enseñarlas sería inventarse una precisión. Era, literalmente, el fallo que había:
se contaba hasta las 00:00 UTC, las dos de la madrugada en Madrid.

**Queda abierto:** la pareja tampoco puede cambiar el **día** desde su panel.
Mover la fecha arrastra las fechas de toda la checklist, así que merece su propia
pantalla con su aviso. Hoy, cambiar el día es cosa del superadmin.
