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
| D-11 | Repeticiones del quiz: valor por defecto y qué muestra el ranking          | F3                               | **decidida 2026-11-16**                                      |
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
| D-27 | Publicar una boda: quién puede, hacia dónde y con qué mínimo               | F0.7                             | **pendiente de validar**                                     |
| D-28 | La hora de la boda la pone la pareja, no el alta                           | F0.7                             | **decidida 2026-09-16**                                      |
| D-29 | Secciones: lo que se implementó y lo que se dejó fuera                     | PL.7                             | **pendiente de validar**                                     |
| D-30 | Importación: lo que se dejó fuera a propósito                              | F1.2                             | **pendiente de validar**                                     |
| D-31 | Grupos: escritura por función, doble pertenencia y grupo de todos          | F1.3                             | **resuelta 2026-09-21**                                      |
| D-32 | Acceso de invitados: lo decidido al implementarlo                          | F1.7                             | **pendiente de validar**                                     |
| D-33 | Se quitan los emuladores: todo se prueba contra Firebase                   | —                                | **decidida 2026-11-10**                                      |
| D-34 | Enlaces de invitación que entren solos, sin teclear nada                   | F1.4                             | **decidida 2026-11-12: opción 3, acceso mixto**              |
| D-35 | RSVP: lo decidido al implementarlo                                         | F1.8                             | **pendiente de validar**                                     |
| D-36 | Acompañantes: lo decidido al implementarlo                                 | F1.5                             | **pendiente de validar**                                     |
| D-37 | Librería de hojas de cálculo                                               | F1.6                             | **pendiente de validar**                                     |

---

## Detalle

### D-01 · Ciclo de vida post-boda

Cuánto tiempo permanece viva la web y los datos tras la fecha, si se ofrece
renovación de pago y cuándo se purga todo. Afecta al plazo de conservación del
RGPD y al coste de almacenamiento, que es el único que escala de verdad.
Los registros de acceso deberían purgarse antes que el resto: 12 meses como
referencia.

### D-02 · Precio y planes — **el catálogo se mantiene (2026-11-13); el precio sigue abierto**

Los dieciocho módulos del catálogo **se quedan**. Lo que todavía no está
construido no se esconde: sale en el panel diciendo «En camino», que es la
verdad y es lo que la pareja ha contratado.

El reparto entre planes vive en `functions/src/dominio/planes.ts`: `basic` es de
una sola página con seis módulos; `extended` es multipágina y lo demás. Galería
y quiz son solo del extendido porque las dos necesitan ruta propia.

Lo que sigue abierto es el **precio** de cada plan.

### D-03 · Editor de texto enriquecido — **DECIDIDA 2026-09-08: Jodit con `ngx-jodit`**

**Confirmada el 2026-11-13**, después de que §12.3 de REQUISITOS siguiera
pidiendo una prueba comparativa que ya no se va a hacer: se tira con Jodit. Esa
contradicción entre los dos documentos queda cerrada, y el bloque 10 de F1
desbloqueado.

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

### D-11 · Repeticiones del quiz y qué enseña el ranking — **DECIDIDA 2026-11-16 (Gabriel)**

- **Se juega las veces que se quiera.** Sin tope. El historial guarda todas las
  partidas y el ranking se queda con **la mejor de cada invitado**, no con la
  primera: si no, la repetición no serviría de nada.
- **Veinte puestos** en el ranking, no diez.
- **Quién aparece y con qué nombre**, que es donde hubo que pararse:

| Quién mira             | Qué ve                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Un invitado, en la web | **Solo el nombre** y los puntos: «Pepe García · 120 puntos»     |
| Ese mismo invitado     | Su fila **con el color de la pareja** y la palabra «tú» al lado |
| La pareja, en su panel | El nombre **y el teléfono**, para distinguir a dos homónimos    |

**Lo que no entra en el ranking no se guarda** (2026-11-16). `submitQuiz` poda
`quizResults` después de cada partida y deja solo lo que está entre los veinte.
De ahí se siguen dos cosas: a quien se queda fuera se le dice en la pantalla
final «esta vez no», sin inventarle una marca histórica que no existe; y la
tabla del panel **no lista a los invitados que no han jugado**, porque una tabla
llena de ceros no es información, es ruido con nombres y teléfonos dentro.

**Las preguntas no se encienden ni se apagan** (2026-11-16). Estaba en el modelo
y no hacía falta: se editan o se borran. El campo `enabled` sigue existiendo y se
escribe siempre a `true`; quitarlo del documento es una migración que no merece
la pena hoy.

**Por qué el ranking público no lleva los dígitos del móvil**, que fue la idea
de partida («Pepe \*\*\*\*\*3663»): en el modo de acceso B un invitado entra con su
**nombre + los cuatro últimos dígitos** (§3.3). Un ranking con las dos cosas
publica la credencial entera de cada jugador a todos los invitados que abran el
quiz, y cualquiera podría entrar como él, confirmar por él o ver sus fotos
restringidas. §12 ya listaba «fuerza bruta sobre los cuatro dígitos» como
amenaza; esto la habría hecho innecesaria. El nombre completo de la lista
desambigua a dos Pepes igual de bien y no publica nada que sea secreto.

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

### D-29 · Secciones: qué se implementó y qué se dejó fuera — **PENDIENTE DE VALIDAR**

REQUISITOS §8.1 enumera nueve secciones: portada, nuestra historia, ceremonia,
banquete, cómo llegar, alojamiento, dress code, preguntas frecuentes y contacto.
Se han implementado **tres tipos**, no nueve secciones:

| Tipo      | Campos                               | Cubre                      |
| --------- | ------------------------------------ | -------------------------- |
| `portada` | ninguno: usa nombres, fecha y foto   | Portada                    |
| `texto`   | título, texto                        | Nuestra historia, contacto |
| `evento`  | título, hora, lugar, dirección, nota | Ceremonia, banquete        |

**Por qué tipos y no secciones con nombre.** Las otras cuatro —cómo llegar,
alojamiento, dress code y preguntas frecuentes— no son contenido suelto: son la
cara pública de módulos que todavía no existen (mapa, alojamientos, dress code,
FAQ, todos en F2). Inventarles ahora un tipo con campos propios sería crear un
sitio donde escribir la dirección del hotel que luego habría que migrar al
módulo. Cuando esos módulos existan, cada uno traerá su tipo de sección, que
leerá **sus** datos en vez de tener los suyos.

Mientras tanto, una pareja que quiera anunciar el dress code puede hacerlo con
una sección de texto. No es lo definitivo; es mejor que nada y no crea deuda.

**Reordenar es con botones, no arrastrando.** Los requisitos piden arrastre.
Los botones de subir y bajar funcionan con teclado y con lector de pantalla, y
en un móvil son bastante más fiables que un arrastre. Propuesta: que el arrastre
llegue **además**, no en lugar de (tarea PL.7c). Si prefieres arrastre ya, dilo.

**Todo es texto plano.** El editor de texto enriquecido espera a
`sanitizeRichContent` (regla 5). Publicar HTML sin sanear a trescientos
invitados es un XSS almacenado, y ese saneado es trabajo de servidor.

**Hallazgo de seguridad, ya corregido.** La proyección pública copiaba `content`
tal cual desde el documento de la boda. `content` **no** es campo de sistema: lo
escribe la pareja desde su panel, y la proyección es el único documento que lee
un anónimo. Cualquier cosa metida ahí —por la pareja o por quien le robara la
sesión— se publicaba sin mirar. Ahora se reconstruye por lista blanca, campo a
campo, igual que el resto de la proyección.

### D-30 · Importación: lo que se dejó fuera a propósito — **PENDIENTE DE VALIDAR**

**No se aceptan ficheros `.xlsx`.** Hay que guardar como CSV, o pegar las celdas
(que es lo que hace casi todo el mundo, y funciona sin tocar nada). Leer xlsx de
verdad son unos 400 kB de librería; merece la pena meterlos una vez, cuando haya
que **escribir** xlsx para el catering (F1.6), no antes. Queda como `F1.2b`.

~~**La plantilla no trae «Grupo» ni «Lado».**~~ Resuelto en F1.3: las columnas
se llaman «Grupos» y «De quién», y la plantilla se genera con los nombres de la
pareja en los ejemplos.

**Los duplicados no se importan, ni siquiera avisando.** La pantalla los enseña
y los deja fuera, y no hay todavía un «mételo igualmente» fila a fila como sí
tiene el alta manual. La función ya lo soporta (`forzarDuplicados`), pero es
todo o nada y eso me parece peor que nada: quien lo active se traga también los
duplicados de verdad. Si te parece necesario, lo suyo es una casilla por fila en
la previsualización. Dime si lo ves.

**El aviso de acentos rotos solo avisa.** Si el fichero viene en ANSI (lo que
Excel guarda por defecto), «María» llega como «MarÃ­a» y se dice antes de
importar, pero no se arregla: el navegador ya ha leído el fichero como UTF-8 y
adivinar la codificación acierta a veces. La salida buena es pegar las celdas,
y eso es lo que sugiere el aviso.

**Tope de 1000 invitados por boda.** Está en `MAX_INVITADOS` y también limita el
alta manual. No es un límite de negocio pensado contigo: es el punto donde
detectar duplicados leyendo la colección entera deja de salir a cuenta. Si
alguna boda real se acerca, hay que cambiar el mecanismo, no el número.

### D-31 · Grupos: escritura por función y dos dudas — **RESUELTA** (2026-09-21)

**Respuesta de Gabriel:** de acuerdo con la escritura por función. Una persona
puede estar en varios grupos y sigue en todos; si se borra un grupo, se le quita
de él. **Todo invitado nuevo entra automáticamente en «Invitados»**, para que
tenga acceso. Hecho: ese grupo no se puede borrar ni llevar candado, porque
entonces los siguientes invitados se quedarían sin él o la boda entera en un
grupo cerrado.

Sigue vigente de §8.5 que nadie está en **dos grupos con candado** a la vez: es
lo único que impide estar en varios, y solo afecta a los que tienen candado.

_Lo que se preguntó:_

**Los grupos ya no se escriben desde el navegador.** El esqueleto de reglas de
§6 dejaba a la pareja escribir `guestGroups` directamente. Lo he cerrado y he
puesto `upsertGroup` y `deleteGroup`, porque había dos agujeros que una regla no
puede tapar (los dos necesitan mirar a los invitados, que están cerrados):

1. Alguien en «Universidad» y «Pádel», los dos públicos, es válido. Si luego la
   pareja pone candado a los dos, ese invitado queda en dos restringidos sin que
   nadie lo haya tocado, y la galería no sabría con quién comparte sus fotos.
   Ahora pasar un grupo a restringido se rechaza si pasa eso, diciendo a
   cuántos afecta.
2. Borrar un grupo dejaba a sus miembros apuntando a un id que ya no existe.
   Ahora se les suelta primero.

Es más estricto que lo que decía §6, no menos. REQUISITOS ya está actualizado;
si prefieres otra cosa, dilo.

**Duda 1: ¿todo invitado nuevo entra en «Invitados»?** El grupo que se crea al
dar de alta la boda dice en su comentario que «pertenece todo el mundo» porque
«sin grupo no es una respuesta que la galería sepa contestar». Pero ni el alta
manual ni la importación metían a nadie ahí, y sigo sin hacerlo: me parece que
eso se decide al diseñar la galería (F2), y un invitado sin grupos puede ver lo
público igualmente. ¿Lo metemos automáticamente, o lo dejamos así?

**Duda 2: ¿«De quién» o «Lado»?** He puesto «De quién es» con los nombres de
la pareja («De María», «De Gabriel», «De los dos») en vez de «Lado A / Lado B».
Se entiende sin explicar, pero es un cambio de vocabulario respecto a los
requisitos.

### D-32 · Acceso de invitados: lo que he decidido al implementarlo — **PENDIENTE DE VALIDAR**

**En los modos B y C se tapa la web entera.** §3.3 no lo dice con esas
palabras, pero §1.1 sí: «visitante anónimo» solo existe «cuando el modo de
acceso es abierto». Así que no se pinta nada —ni nombres, ni fecha, ni
secciones— hasta saber quién entra. La otra lectura posible era dejar la web a
la vista y pedir identificación solo en lo que la necesita (confirmar, subir
fotos); si es lo que quieres, dilo y es un cambio pequeño.

**Dos invitados que encajan a la vez no entran ninguno.** Mismo nombre y mismos
cuatro dígitos. Dejar pasar al primero le daría a uno la identidad del otro: su
mesa, su menú y su grupo de fotos. Se trata como un fallo normal, con el mismo
mensaje, y la pareja lo arregla en su lista. Es raro, pero con doscientos
invitados y dos primos tocayos deja de serlo.

**Los números del límite de intentos.** 10 intentos en 15 minutos, y después
bloqueos de 1, 5, 15 y 60 minutos, que se quedan en 60. Entrar bien lo borra
todo, incluida la escalada: quien ha demostrado estar invitado no arrastra el
castigo de la IP del hotel donde se aloja media boda. Los requisitos decían «por
ejemplo, 10 en 15 minutos», así que los he fijado; si te parecen duros o
blandos, se cambian en un sitio.

**La sesión del invitado dura 24 h y no hay forma de cerrarla desde la web.**
Falta el botón de salir y el «¿no eres tú?» (tarea `F1.7b`). En un móvil
compartido —el de los padres de la novia— eso importa.

**Una boda sin teléfonos en la lista no puede usar los modos B y C.** El panel
avisa de cuántos invitados se quedarían fuera antes de que la pareja lo elija,
pero **no lo impide**: hay bodas que cargan los teléfonos después. Si prefieres
que no deje seleccionarlo mientras falte alguno, se cambia.

**Lo que sigue sin probarse de verdad:** la batería de reglas de `loginAttempts`
está escrita pero aquí no se puede ejecutar —el emulador de Firestore se
descarga de un dominio que esta red no alcanza—; corre sola en el CI al hacer
push.

### D-33 · Se quitan los emuladores: todo se prueba contra Firebase — **DECISIÓN DE GABRIEL** (2026-11-10)

«De ahora en adelante, déjate de seed, de emulators y de cosas. Todas las
pruebas las haremos siempre contra Firebase directamente».

Quitado: `npm run emulators`, `npm run seed`, `npm run start:real`,
`npm run probar:alta`, los tres scripts de `tools/` que vivían de ellos, el
token `EMULATORS` y las llamadas `connect*Emulator`, el campo `useEmulators` de
los entornos y la configuración `real` de Angular. `npm start` habla con
Firebase. `EXIGIR_APP_CHECK` pasa a ser `true` siempre, porque ya no hay un
sitio donde no se exija.

**Lo que NO he quitado, y por qué.** `npm run test:rules` sigue levantando un
emulador de Firestore. No es que se me haya pasado: `@firebase/rules-unit-testing`
**solo** sabe hablar con un emulador, no existe forma de probar reglas contra el
proyecto de verdad. Levanta uno efímero contra un id de usar y tirar
(`nupcialis-rules-test`), no toca nuestro proyecto, lo ejecuta el CI solo y tú
no lo corres nunca a mano. Y es lo que sustituye al aislamiento por bases de
datos separadas, que §6 marca como requisito de release. Si aun así lo quieres
fuera, dímelo: se puede borrar, pero perdemos la única prueba de que la pareja
de una boda no puede leer los invitados de otra.

**Lo que esta decisión trae, y conviene tener delante:**

- **Cada boda de prueba consume un dominio autorizado de Firebase Auth**, y ese
  es justo el recurso cuyo límite Firebase no documenta (§11, riesgo abierto).
  Reutilizar bodas en vez de crear una por prueba deja de ser higiene y pasa a
  ser necesario.
- **Las bodas de prueba llevan teléfonos y alergias inventados** en la misma
  base donde vivirán las reales. Esto hace que `RE.7` —proyecto de Firebase
  aparte para producción— deje de ser una tarea de la lista y pase a ser lo que
  separa los datos de prueba de los de clientes. **Es lo que te pediría hacer
  antes de la primera pareja que pague.**
- **Un trigger que se llame a sí mismo cuesta dinero**, no un Ctrl+C.
- Ya no hay nada que reinicie la basura de las pruebas.

### D-34 · ¿Enlaces de invitación que entren solos? — **DECIDIDA 2026-11-12 (Gabriel): opción 3**

**Lo decidido: el enlace abre la web; los cuatro dígitos autorizan.** Implementado
el 2026-11-12. Cómo quedó, en §3.3 de REQUISITOS; en corto:

- El enlace lleva un token por invitado y da nivel `enlace`: ver la web y nada
  más.
- Confirmar, elegir menú, apuntar acompañantes y —cuando exista— ver fotos
  restringidas piden los cuatro dígitos, y suben la sesión a `verificado`.
- **Leer el formulario también los pide.** No estaba en la decisión, pero
  dentro están sus alergias, su menú y lo que escribió a los novios: un enlace
  reenviado no tiene por qué enseñar eso. Si prefieres que se vea, es quitar una
  línea.
- La pareja puede cambiar el enlace de una persona, que es lo único que
  invalida uno que haya acabado en un grupo donde no debía.

Lo que sigue siendo verdad y conviene no perder de vista: **un enlace reenviado
deja ver la web de la boda** a quien no está invitado. Eso es lo que la opción 3
acepta a cambio de la comodidad, y es la parte barata; lo que tiene consecuencias
sigue cerrado.

El razonamiento original, por si hay que volver a él:

---

### D-34 (original) · ¿Enlaces de invitación que entren solos?

Hoy el enlace que la pareja manda por WhatsApp lleva **solo el nombre**
(`?n=María%20José%20Pérez`). La puerta lo trae escrito y el invitado teclea sus
cuatro dígitos. Es un paso, en el móvil, andando por la calle.

La alternativa es un enlace con una credencial dentro —`?k=<token>`— que entre
solo. Un toque y está dentro: es **mucho** más cómodo, y es lo que hacen casi
todas las webs de boda que hay.

**Por qué no lo he hecho.** Un enlace que entra solo vale lo mismo en la mano de
cualquiera. Y estos enlaces se reenvían: el primo lo pasa al grupo de WhatsApp
de la familia «por si alguien no lo tiene», y entonces doce personas son María
José Pérez. No es un fallo teórico, es lo que pasa con un grupo de familia. Lo
que se mezcla:

- Su confirmación y su menú, que cualquiera puede cambiar.
- Su grupo, y con él las **fotos de audiencia restringida** que solo debería ver
  la gente de ese grupo.
- Los contadores de acceso, que dejan de servir para saber a quién hay que
  reenviarle el enlace.

Y no hay forma de deshacerlo: un token que circula por un grupo de WhatsApp no
se recupera, solo se puede invalidar y volver a mandar doscientos mensajes.

**Lo que se podría hacer si lo quieres.** No es todo o nada:

1. **Como está** (hoy): nombre pre-rellenado, cuatro dígitos a mano.
2. **Enlace que entra solo, con el tope corto**: un token por invitado, válido
   para una sola sesión y caducado a las 48 h. Reduce el daño, no lo quita.
3. **Mixto**: entra solo para ver la web, y pide los cuatro dígitos para
   confirmar, elegir menú o ver fotos restringidas. Es lo que yo elegiría si
   quieres la comodidad: la parte cómoda es cómoda y lo que tiene consecuencias
   sigue pidiendo algo que solo tiene el invitado.

**Mi recomendación: la 3, cuando esté el RSVP** (F1.8), que es cuando hay algo
que proteger de verdad. Mientras no exista el formulario, la 1 no le cuesta nada
a nadie. Dime cuál quieres y lo cambio: son dos sitios, el que escribe el enlace
y la puerta.

### D-35 · RSVP: lo que he decidido al implementarlo — **PENDIENTE DE VALIDAR**

Ocho decisiones que no estaban escritas en §8.2 y que he tomado para poder
cerrar el bloque. Ninguna es difícil de cambiar; todas están donde se ven.

1. **El formulario pasa por función invocable, no por lectura directa.** Las
   reglas ya permiten que el invitado lea `formQuestions`, y aun así la web lo
   pide a `getRsvpForm`. Motivo: leerlo desde el cliente obligaría a cargar
   Firestore en el trozo público, y ahí hay 200 kB contados. Si algún día la web
   pública ya carga Firestore por otra cosa, esta función se puede tirar.

2. **La fecha límite vive en `modules.rsvp.config.deadline`.** Es el sitio que
   §5.1 reserva para la configuración de cada módulo, y así no se añade un campo
   más al documento de la boda. El día cuenta entero: «hasta el 1 de junio»
   incluye el 1 hasta las 23:59 UTC, porque es lo que esperaría cualquiera.
   **Todavía no hay campo en el panel para ponerla** (`F1.8c`): hoy se escribe a
   mano o no hay plazo.

3. **Si no hay pregunta de asistencia, enviar el formulario confirma.** La
   pareja puede desactivarla; en ese caso, mandar el formulario cuenta como un
   sí, porque nadie rellena el menú de una boda a la que no va.

4. **Las respuestas se reemplazan, no se mezclan**, y lo que ha quedado oculto
   no se guarda. Quien dijo que sí, eligió vegano y luego dice que no, se queda
   sin menú guardado. Lo contrario deja al catering contando un comensal que no
   va.

5. **La canción y el mensaje a los novios no tienen campo propio** en el
   invitado: viven en `rsvpAnswers`. La lista blanca de `mapsTo` está al mínimo
   —cinco campos— porque es la que decide qué puede cambiar un invitado desde su
   móvil. Cuando la lista de reproducción (F3) necesite leer las canciones, se
   añade entonces.

6. **`needsTransport` y `needsAccommodation` no estaban en §5.5** y las
   preguntas de fábrica ya los usaban como `mapsTo`. Los he dejado como campos
   del invitado y los he documentado. Si no quieres esos dos campos, lo que se
   cambia es la semilla.

7. **En modo abierto (A) no hay formulario.** Sin identidad no hay a quién
   apuntar la respuesta, y una confirmación anónima no sirve ni para contar
   comensales ni para pedir un menú. **Esto es D-09 y no lo decido yo**: hoy la
   web en modo A simplemente no enseña la entrada al formulario. Ver la pregunta
   al final.

8. **La entrada al formulario es una barra fija abajo**, con icono y texto. No
   dice el estado del invitado —«ya has confirmado»— porque eso costaría una
   llamada a la función en cada visita a la web. El estado se ve al entrar en el
   formulario. Si lo prefieres en la barra, se puede, pagando esa llamada.

**Añadido al cerrar el editor de preguntas (F1.8b):** el editor **no** ofrece un
constructor de condiciones. Ofrece una casilla, «preguntar solo a quien confirme
que viene». El modelo aguanta cualquier `visibleIf`; el editor escribe solo ese,
porque es el único que se usa en una boda —el menú, las alergias, el autobús— y
un constructor genérico es una pantalla entera para un caso que no se da. Si
alguna pareja pide condiciones cruzadas, se añade entonces.

### D-36 · Acompañantes: lo que he decidido al implementarlo — **PENDIENTE DE VALIDAR**

Cinco decisiones que §8.3 no fijaba. Las tres primeras son de fondo; las otras
dos se cambian en un rato si no te convencen.

1. **Un acompañante no puede apuntar acompañantes.** Sin esto, el cupo deja de
   ser un cupo: invito a mi pareja, mi pareja invita a su hermana y la cuenta no
   la cierra nadie. Si alguna vez quieres cadenas, hay que poner un tope global
   por boda, no por invitado.

2. **La fecha límite del RSVP cierra también los acompañantes.** El plazo existe
   para poder dar un número al catering; dejar apuntar gente después sería darlo
   dos veces. Si prefieres que los acompañantes sigan abiertos más tiempo,
   harían falta dos fechas y creo que no compensa.

3. **El titular puede quitar a quien apuntó, pero solo si esa persona no ha
   entrado todavía en la web.** En cuanto entra tiene sesión, confirmación suya
   y, más adelante, fotos subidas: borrarla entonces es cosa vuestra, que veis
   el conjunto. El invitado recibe un mensaje que lo explica.

4. **Al acompañante se le ponen tres datos y ya**: nombre, edad y teléfono
   —este último solo en los modos que lo piden para entrar—. Nada de correo ni
   de notas: quien lo apunta está dando datos de otra persona, y el formulario
   lo dice. Si el catering necesita algo más, lo pregunta el formulario de
   confirmación del propio acompañante, que entra con su sesión.

5. **El acompañante entra con `side: 'both'`.** El lado es contabilidad vuestra
   —de quién es cada invitado— y no me parecía que lo eligiera quien lo apunta.
   Si prefieres que herede el lado del titular, es una línea.

**Lo que hace falta de ti para que esto se vea:** el interruptor de «Datos de la
boda» viene apagado, y el cupo de cada invitado, a cero. Mientras los dos estén
así, en la web del invitado no aparece nada de acompañantes, que es lo correcto:
una boda no abre esto sin querer.

### D-37 · Qué librería lee y escribe las hojas de cálculo — **PENDIENTE DE VALIDAR**

Elegidas **`write-excel-file`** (4.1.1) para escribir y **`read-excel-file`**
(9.3.14) para leer, las dos del mismo autor.

**Por qué no SheetJS (`xlsx`)**, que es la que todo el mundo usa: su versión
pública en npm se quedó en 0.18.5 y las nuevas se distribuyen desde su propio
servidor, lo que convierte una actualización de seguridad en un trámite manual.
Para un fichero que va a abrir una empresa de catering en su Excel no necesito
el 90 % de lo que trae.

**Lo que esto cuesta**, medido: el trozo de la escritura son **20 kB
comprimidos** y se carga al pulsar el botón, no al abrir el panel. El bundle
inicial no se mueve (96,8 kB comprimidos, igual que antes), y el presupuesto de
200 kB es de la web pública, que no toca nada de esto.

**Lo que hace falta de ti:** un `npm install` en tu copia antes del siguiente
`npm start`, porque son dos dependencias nuevas.

Si prefieres no añadir dependencias, la alternativa es escribir el `.xlsx` a
mano —es un ZIP con XML dentro— o volver al CSV para exportar. Lo segundo
funciona, pero el CSV con acentos y punto y coma es exactamente el problema que
la importación ya tiene que explicar a las parejas, y no quería tenerlo también
en la salida.

### D-38 · Dress code: lo que he decidido al implementarlo — **PENDIENTE DE VALIDAR**

El módulo está hecho (§8.11) y con él tres decisiones que no estaban en los
requisitos. Ninguna cambia el producto, pero todas se ven en pantalla.

**1. Los colores salen de una lista cerrada de 30, con nombre.** No hay
selector de color. Los requisitos piden que «cada muestra lleve su nombre
escrito», y eso con un selector no se puede cumplir: de un `#7a9b4e` nadie sabe
si es verde oliva o verde salvia, y pedirle a la pareja que lo escriba a mano es
pedirle que escriba treinta nombres. Con la lista, cada muestra tiene nombre por
construcción.

Hay además una razón de seguridad: la web pública pinta la muestra con un color
en línea. Un hexadecimal que viniera del documento sería un valor del cliente
dentro de un atributo de estilo, y lo que se guarda son **ids** (`verde-oliva`),
que el dominio vuelve a resolver contra la lista en los dos lados. Un id que no
exista se cae y no se pinta nada.

La lista está en `functions/src/dominio/dress-code.ts` (y su copia literal en el
cliente): blanco, marfil, beige, arena, camel, marrón, chocolate, negro, gris
marengo, gris perla, plata, dorado, azul marino, azul, celeste, turquesa, verde
botella, verde oliva, verde salvia, amarillo, mostaza, naranja, coral, rojo,
burdeos, rosa palo, rosa, malva, lila y morado. **Si falta alguno que tus
parejas vayan a pedir, dilo y se añade**: es una línea y aparece en los dos
lados a la vez. El tope es de 8 colores por lista, que es lo que cabe de un
vistazo en un móvil.

**2. Se publica aunque el módulo esté apagado.** Lo que decide si el invitado lo
ve es el interruptor de **su sección** en «Vuestra web», igual que con las
preguntas frecuentes, la cronología y los alojamientos. Atarlo además al
interruptor del módulo daría el caso de una pareja que escribe su dress code, lo
ve en su panel y no sale en la web sin ninguna pista de por qué. Hoy, además, el
interruptor del módulo no se puede tocar desde el panel: lo mueve el superadmin.

**3. Faltan dos cosas de §8.11, a propósito.** El **moodboard** de imágenes
(tarea `F2.5b`) y las **indicaciones distintas por rol o por grupo** (`F2.5c`).
El moodboard comparte toda la maquinaria de subida con la foto de portada y es
media pantalla más; preferí entregar el módulo funcionando —texto con formato,
colores y avisos prácticos— antes que las tres cosas a medias. Dime si lo
prefieres al revés.
