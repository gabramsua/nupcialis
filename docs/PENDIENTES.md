# Nupcialis — Decisiones pendientes

Decisiones abiertas que Claude **no debe resolver por su cuenta**. Si una tarea
tropieza con una de estas, se para y se pregunta.

Estados: `abierta` · `en estudio` · `decidida` (con fecha y resultado).

| ID   | Decisión                                                                            | Bloquea                          | Estado                                                       |
| ---- | ----------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| D-01 | Ciclo de vida post-boda: cuánto vive la web y los datos, renovación, purga          | F5, RGPD                         | abierta                                                      |
| D-02 | Precio y planes: qué módulos son `basic` y cuáles `premium`                         | F5                               | abierta                                                      |
| D-03 | Librería del editor de texto enriquecido                                            | F1                               | **decidida 2026-09-08: Jodit con `ngx-jodit`**               |
| D-04 | Confirmar librería de mapas (Leaflet/MapLibre frente a Google Maps)                 | F2                               | **elegida: Leaflet + OSM; pendiente de validar**             |
| D-05 | Email transaccional: proveedor y si entra en el producto                            | F5                               | abierta                                                      |
| D-06 | WhatsApp Business API                                                               | F5                               | abierta                                                      |
| D-07 | Dominio propio de la pareja                                                         | —                                | abierta                                                      |
| D-08 | PWA e instalación en el móvil del invitado                                          | —                                | abierta                                                      |
| D-09 | Comportamiento de los módulos con identidad en modo de acceso abierto               | F3                               | **decidida 2026-11-23: se exige identificarse (D-56)**       |
| D-10 | Plano real de la finca                                                              | F5                               | abierta                                                      |
| D-11 | Repeticiones del quiz: valor por defecto y qué muestra el ranking                   | F3                               | **decidida 2026-11-16**                                      |
| D-12 | Familia de iconos base                                                              | **F0**                           | **decidida 2026-09-08: Phosphor**                            |
| D-13 | Reserva de regalos sin identidad en modo abierto                                    | F3                               | abierta                                                      |
| D-14 | Consentimiento para publicar fotos de terceros en Personas importantes              | F2, RGPD                         | **decidida 2026-11-24: casilla obligatoria (D-61)**          |
| D-15 | Dominio definitivo                                                                  | **Bloque 1 de puesta en marcha** | **decidida 2026-09-08: `nupcialis.com`, comprado**           |
| D-16 | Dónde vive el panel de la pareja                                                    | F0.3, F0.4                       | **decidida 2026-09-08: subdominio de la boda**               |
| D-17 | Acceso a Firebase desde el cliente: AngularFire o SDK directo                       | F0.1                             | **decidida 2026-09-08: SDK modular directo**                 |
| D-18 | Cómo se cargan los servicios de Firebase                                            | F0.1                             | **decidida 2026-09-08: por ruta, en chunks diferidos**       |
| D-19 | Dónde se importa el SDK de Firestore                                                | F0.3                             | **decidida 2026-09-08: en ficheros `*.firestore.ts`**        |
| D-20 | Maquetación de la web pública según el plan                                         | F0.6, F1                         | **decidida 2026-09-10: básico onepage, extendido multipage** |
| D-21 | Qué determina el precio                                                             | F5                               | **decidida 2026-09-10: el plan, no los módulos**             |
| D-22 | Borrador a nivel de módulo                                                          | F0.6, F1                         | **decidida 2026-09-10: `hidden` · `soon` · `visible`**       |
| D-23 | Dónde se configuran planes y precios                                                | F0.7                             | **decidida 2026-09-10: editables desde el superadmin**       |
| D-24 | Cinco decisiones tomadas al implementar el alta                                     | F0.6                             | **pendiente de validar**                                     |
| D-25 | Cómo se cobra sin pasarela de pago                                                  | F5, landing                      | **decidida 2026-09-14: Bizum y activación manual**           |
| D-26 | Proveedores que comercializan la web y liquidan aparte                              | F5                               | **decidida 2026-09-14: tarifa mayorista, sin acceso**        |
| D-27 | Publicar una boda: quién puede, hacia dónde y con qué mínimo                        | F0.7                             | **pendiente de validar**                                     |
| D-28 | La hora de la boda la pone la pareja, no el alta                                    | F0.7                             | **decidida 2026-09-16**                                      |
| D-29 | Secciones: lo que se implementó y lo que se dejó fuera                              | PL.7                             | **pendiente de validar**                                     |
| D-30 | Importación: lo que se dejó fuera a propósito                                       | F1.2                             | **pendiente de validar**                                     |
| D-31 | Grupos: escritura por función, doble pertenencia y grupo de todos                   | F1.3                             | **resuelta 2026-09-21**                                      |
| D-32 | Acceso de invitados: lo decidido al implementarlo                                   | F1.7                             | **pendiente de validar**                                     |
| D-33 | Se quitan los emuladores: todo se prueba contra Firebase                            | —                                | **decidida 2026-11-10**                                      |
| D-34 | Enlaces de invitación que entren solos, sin teclear nada                            | F1.4                             | **decidida 2026-11-12: opción 3, acceso mixto**              |
| D-35 | RSVP: lo decidido al implementarlo                                                  | F1.8                             | **pendiente de validar**                                     |
| D-36 | Acompañantes: lo decidido al implementarlo                                          | F1.5                             | **pendiente de validar**                                     |
| D-37 | Librería de hojas de cálculo                                                        | F1.6                             | **pendiente de validar**                                     |
| D-41 | Playlist: lo decidido al implementarla                                              | F3.4                             | **pendiente de validar**                                     |
| D-42 | Estadísticas y límites del superadmin: lo decidido al implementarlos                | F3.1d                            | **pendiente de validar**                                     |
| D-43 | Tareas de la pareja: lo decidido al implementarlas                                  | F4.1                             | **pendiente de validar**                                     |
| D-44 | Smoke test 1: arreglos y orden del backlog                                          | S1                               | **pendiente de validar**                                     |
| D-45 | La pareja contesta por el invitado: lo decidido al implementarlo                    | F1.8h                            | **pendiente de validar**                                     |
| D-46 | Acompañantes desde el panel y pulido del timeline/FAQ/editor                        | F1.5d                            | **pendiente de validar**                                     |
| D-47 | Tanda de 18 puntos (quiz, grupos, mesas, tareas…) y lo que he apartado              | S2                               | **pendiente de validar**                                     |
| D-48 | Superadmin (ficha, restablecimiento, cobros, recordatorios) y lo apartado           | S1.3e/f/g, S1.6b, S1.7           | **pendiente de validar**                                     |
| D-49 | Tanda 20: civil/religiosa, lugares, catálogos, presupuesto, historia                | S3                               | **pendiente de validar**                                     |
| D-50 | Tanda 21: lista de invitados en acordeón, «mismo sitio», módulos a bodas viejas     | S3b, F1.3f                       | **pendiente de validar**                                     |
| D-51 | Tanda 22: sin cupo de acompañantes; acompañantes siguen al titular                  | F1.5, S4                         | **pendiente de validar**                                     |
| D-52 | Tanda 22: lista, grupo oculto, WhatsApp único e importación solo Excel              | F1.3, F1.5d, S4                  | **pendiente de validar**                                     |
| D-53 | Tanda 23: superadmin (menú, correos, planes, consejos, editar/borrar, accesos)      | S1, S1.3g, S1.7, S4              | **pendiente de validar**                                     |
| D-54 | Tanda 24: panel y web (publicar, historia, galería propia, plantillas, colores)     | S4c, F1                          | **pendiente de validar**                                     |
| D-55 | Tanda 25: panel protegido, teléfono, dirección editable, cola de correos, CSV, tema | S4d, F1                          | **pendiente de validar**                                     |
| D-56 | Tanda 26: identificarse para quiz/galería con web abierta; precio acordado          | S4e, F3                          | **pendiente de validar**                                     |
| D-57 | Tanda 27: cabecera de navegación del plan completo y paletas nuevas                 | S4f, F1                          | **pendiente de validar**                                     |

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

**Elegida por mí para no parar (2026-11-17), pendiente de que la valides:**
**Leaflet 1.9.4 sobre teselas de OpenStreetMap**, cargada solo al abrir un mapa
(trozo aparte de 38 kB comprimidos; la portada no paga nada), con búsqueda de
direcciones en **Nominatim** y enlaces profundos a Google Maps para navegar.
Sin clave ni facturación. Si prefieres otra, cambiarla toca un solo fichero
(`features/public-site/mapa/leaflet.ts`) y el buscador (`geocodificador.ts`).

**Riesgo que debes conocer:** los servidores públicos de teselas y de Nominatim
de OpenStreetMap tienen una política de uso razonable (sin tráfico masivo ni
autocompletado, atribución visible, y buscar solo al pulsar «Buscar»). Para una
boda va sobrada; **con muchas bodas a la vez, o antes de vender a escala, hay que
pasar a un proveedor de teselas con plan** (MapTiler, Stadia, etc.) o alojar las
propias. Está apuntado como `F2.3b`.

Recomendación original: Leaflet o MapLibre sobre OpenStreetMap, sin clave ni facturación,
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

### D-09 · Módulos con identidad en modo abierto — **DECIDIDA 2026-11-23 (Gabriel): se exige login**

**Respuesta de Gabriel:** para jugar y para subir fotos hay que identificarse, y
hay que avisar a los novios cuando activen esos módulos. Hecho en D-56: quiz,
galería, regalos y playlist piden nombre y 4 últimos dígitos también con la web
abierta, y el panel avisa. _Pregunta original:_

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

### D-14 · Fotos de terceros en Personas importantes — **DECIDIDA 2026-11-24: casilla obligatoria al subir la foto (D-61)**

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

**d) ~~Las preguntas de fábrica del quiz nacen desactivadas.~~ Ya no se
siembran (D-46).** El quiz nace vacío: cinco preguntas sin respuestas eran ruido
que la pareja tenía que borrar. En su lugar, el panel explica cómo funciona el
juego (partida, puntos, ranking) y trae un buscador.

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

---

### D-39 · Galería: lo que he decidido al implementarla — **RESUELTA (2026-11-17)**

> **Respuestas de Gabriel:** (1) las fotos salen **publicadas**, con borrado
> inmediato para la pareja; no hay cola de aprobación por defecto. (2) **Tope de
> 500 fotos por boda**, pero **configurable** desde un panel de superadmin donde
> acabarán todas las estadísticas. Hecho: `limits.maxPhotos` (campo de sistema,
> defecto 500) y `F3.1d` para el panel. Las cinco decisiones de abajo siguen en
> pie.

La galería de invitados está hecha (§8.5) y con ella cinco decisiones que no
estaban escritas. Ninguna es irreversible, pero las cinco se notan.

**1. Reduce el móvil, no el servidor.** El navegador pasa cada foto por un
`canvas` y manda dos JPEG en la misma llamada: la grande a 1600 px de lado
largo y la miniatura a 480, las dos al 82 %. Los requisitos pedían miniaturas
«en servidor» con un trigger de Storage, y lo he cambiado a propósito: una foto
de cámara son ocho megas y así viaja en menos de uno, que es la diferencia entre
que la galería funcione o no en una finca con una barra de cobertura. De paso
nos ahorra el trigger, la librería de imagen y el segundo rebote por Storage.
**Lo que se pierde:** si alguien se salta nuestro cliente, puede mandar una
miniatura que no se parezca a la grande. No es un agujero —sigue siendo una
imagen suya en su propia galería— pero conviene que lo sepas.

**2. Los ficheros se sirven con token de descarga, no con `makePublic()`.** Es
lo que deja revocar el acceso a una foto concreta cambiándole el token, y es
justo lo que van a necesitar las audiencias por grupo. Las reglas de Storage
siguen cerradas a todo el mundo.

**3. Subir exige invitado verificado; mirar, no.** En modo A (enlace sin
dígitos) cualquiera con el enlace ve la galería, que es lo que quiere una pareja
que manda el enlace por WhatsApp. Para **subir** hace falta haber escrito los
cuatro dígitos, porque una foto lleva un nombre detrás y ese nombre tiene que
significar algo.

**4. Las audiencias por grupo quedan fuera, a propósito.** Toda foto nace con
`audienceGroupId: null`, que es «la ve todo el mundo». Dijiste que de grupos
hablamos después, y el módulo está escrito para que ese día solo cambien dos
cosas: quién pone ese campo al subir y qué filtra `listPhotos`. Ni el cliente ni
el almacenamiento se tocan.

**5. La moderación es a posteriori, no una cola.** La pareja tiene su pantalla
en `/panel/gallery`: ve la galería entera con el nombre de quien subió cada
foto, quita cualquiera y puede vaciarla escribiendo `VACIAR`. Lo que no hay es
cola de aprobación, denuncia ni ZIP; las tres están apuntadas en `F3.1b`. La moderación en concreto tiene una pregunta que es tuya y no mía:
**¿las fotos salen publicadas o a cola de aprobación por defecto?** Mi
recomendación es publicadas, con borrado inmediato para la pareja: una cola que
nadie mira es una galería vacía el día de la boda. Dime si lo ves al revés.

**Y una pregunta abierta:** falta el **tope por boda** (número de fotos o
megas). Hoy no hay ninguno más allá de los 8 MB por fichero, y eso es una
factura de Storage sin techo. Hace falta una cifra por plan.

---

### D-40 · Regalos: lo que he decidido al implementarlos — **RESUELTA (2026-11-17)**

> **Respuestas de Gabriel:** (1) el IBAN y el Bizum **siguen fuera de la
> proyección pública** y solo los ve el invitado identificado. (2) **No hay
> exportación a XLSX de lo recibido**: nada de eso sale del panel en un fichero.
> `F3.3d` retirada.

La mitad pública está hecha (§8.8): cómo aportar y la lista. Con ella, cuatro
decisiones que no estaban escritas, y la primera es de seguridad.

**1. Ni el IBAN ni el Bizum viajan en la proyección pública.** Los requisitos
los llaman «público», y en el sentido de «lo ven los invitados» lo siguen
siendo. Pero `public/site` no es eso: lo lee **cualquiera que sepa el slug**,
sin identificarse, y la web de una boda está en un dominio que se adivina. Un
número de cuenta con su titular ahí dentro es justo lo que necesita un tercero
para levantar una copia de la web y pedir el dinero en nombre de la pareja, y
el invitado que pica no tiene forma de notarlo.

Así que la sección de la web es un **cartel** que lleva a `/regalos`, y esa
página la sirve `getGifts` a quien está identificado como invitado. Es el mismo
patrón que el quiz y la galería, por un motivo distinto. **Si lo prefieres al
revés** —número de cuenta a la vista de cualquiera que abra la web— es un
cambio de un sitio, pero antes de hacerlo dime que lo has pensado.

**2. El IBAN se comprueba con el módulo 97**, en el panel y mientras se
escribe. Son diez líneas y la pareja escribe esto una vez, de memoria, el día
que monta su web; un dígito cambiado es dinero rebotado o en la cuenta de otro.
El Bizum se comprueba como móvil español. Ninguno de los dos es obligatorio: se
puede publicar solo el mensaje, solo el Bizum, o nada.

**3. La reserva es anónima de verdad, no «anónima en pantalla».** `reservedBy`
no sale nunca de la función: lo que viaja al navegador son dos booleanos,
`reservado` y `esMio`. Por eso la colección `gifts` queda cerrada a la lectura
del invitado, y por eso reservar es una **transacción**: dos invitados abriendo
la lista a la vez es el caso normal el día que se manda el recordatorio, y lo
que no puede pasar es que el segundo pise al primero y los dos se queden
pensando que llevan la cafetera.

**4. La imagen del regalo es una URL, no una subida.** Es lo único que he
dejado a medias a propósito: subir imágenes es la maquinaria de la foto de
portada otra vez, y con un enlace a la tienda la lista ya es útil. Está
apuntado en `F3.3c`.

**Y el panel de regalos recibidos (`F3.3b`) ya está hecho**, con todo menos la
exportación: es el dato más sensible del producto y el trabajo de verdad de la
semana siguiente a la boda. Ahí sigue una pregunta tuya: **¿se puede exportar a
XLSX con los importes dentro?** §8.8 dice que sí, pero es un fichero con nombres, apellidos
y cantidades que acaba en Descargas y en WhatsApp. Yo lo haría, con un aviso
claro al descargar; dime si lo ves.

### D-41 · Playlist: lo que he decidido al implementarla — **pendiente de validar**

Los requisitos (§8.14) dicen qué hace la playlist, no cómo se resuelven sus
bordes. Lo que he decidido, para que lo veas y lo cambies si no te cuadra:

**1. La colección es solo de la pareja y el invitado la lee por `listPlaylist`.**
Cada canción guarda los `guestId` de quien la votó; una regla puede negar una
lectura pero no esconder un campo de ella, así que con la colección abierta
cualquier invitado sabría quién ha votado qué. Es el mismo motivo por el que
`reservedBy` no sale de `getGifts`. Antes la regla dejaba leer a los invitados:
**la he cerrado** (hay que desplegar las reglas).

**2. Duplicados: «Mr. Brightside», «mr brightside» y «Mr Brightside (Live)» son la
misma.** Se compara título y artista sin tildes, mayúsculas, signos ni lo que va
entre paréntesis o corchetes; el artista solo cuenta si **los dos** lo tienen.
Proponer algo que ya está **no lo duplica: suma el voto** y se le dice al
invitado, para que no crea que su petición se ha perdido.

**3. Vetar es silencioso para el invitado.** Si propone una canción vetada o
descartada, ve «no está disponible», sin decir cuál de las dos ni por qué: no
tiene por qué saber qué no queréis oír. Y si la pareja veta algo que ya habían
propuesto, **se cambia su estado en vez de duplicarla**.

**4. Topes: 5 canciones nuevas por invitado y 300 en la lista.** Votar es
ilimitado. Lo que entra por el RSVP **no gasta** el tope de propuestas, y sumar
un voto a una existente tampoco. Son constantes en `dominio/playlist.ts`; si
prefieres otros números, es una línea.

**5. La canción del RSVP entra sola**, al enviar la confirmación, desde la
pregunta con id `cancion` (la de la semilla). Es texto libre: se acepta «Título»,
«Título - Artista» y «Título by Artista», y varias por líneas o con punto y coma
(hasta tres). **«de» no separa**: está dentro de demasiados títulos. Entra con el
voto de quien la escribió y **sin poder romper la confirmación**: si falla, se
registra y el invitado ve su confirmación hecha. Si una pareja renombra esa
pregunta, deja de entrar sola.

**6. No hay moderación previa.** §8.14 la llama «opcional, como la galería» y,
como en la galería (D-39), la he dejado **posterior**: las canciones salen
publicadas y la pareja las descarta o veta desde «Por decidir». Es lo que cuesta
menos al invitado y lo que no obliga a la pareja a entrar para que algo aparezca.

**7. La exportación para el DJ** es un XLSX con «Suena» (lo aceptado, por votos) y
«No poner» (la lista de veto, solo si hay). Lo pendiente no sale: no es una
instrucción. **No agrupa por momento** (§8.14 lo menciona) porque no hay forma
de asignar un momento a una canción; si lo quieres, hay que decidir cómo.

### D-42 · Estadísticas y límites del superadmin: lo que he decidido — **pendiente de validar**

§8.18 lista las métricas pero no cómo se miden ni qué se puede cambiar. Lo que
he decidido, para que lo veas:

**1. El almacenamiento es una estimación: fotos × 0,3 MB.** Las fotos no
guardan su peso, y la pantalla lo marca como «estimado». Si quieres el dato
exacto, hay que guardar el tamaño al subir (y rellenar las que ya hay).

**2. Solo se puede cambiar el tope de fotos.** Rango de 1 a 5000, o volver al de
por defecto (500). Es lo único que existe como límite; invitados o mesas no
tienen tope hoy, así que no hay nada que fijar.

**3. Quién cuenta como «alta del mes».** El mes natural **en UTC**, por la fecha
de creación de la boda.

**4. Como mucho 200 bodas por consulta.** Cada boda son tres conteos; a partir
de ahí la pantalla avisa de que los totales no incluyen el resto. Con el volumen
que se espera es holgado; si algún día no lo es, hay que pasar a contadores
mantenidos por trigger.

**5. Orden por urgencia, no por fecha:** las galerías más llenas primero, y el
aviso se enciende desde el 80 %.

**6. Cada cambio de tope queda en el registro de auditoría** con el valor
anterior y el nuevo.

### D-43 · Tareas de la pareja: lo que he decidido — **pendiente de validar**

§8.17 describe el modelo y no los bordes de la pantalla. Lo que he decidido:

**1. El estado no se guarda, se calcula.** Cinco estados contra «hoy»: vencida,
esta semana (hoy y los siete días siguientes), próxima, sin fecha y hecha. Pides
«estados» y el documento solo tiene `done`; lo calculado cubre lo que importa
(qué quema) sin añadir un campo que haya que mantener. Si quieres además un
**«en curso»** manual, es un campo más (`F4.1d`).

**2. «Lo de María» incluye lo de los dos.** El filtro por persona enseña sus
tareas y las compartidas: a quien le toca «contratar el catering» entre los dos
la tiene que ver al mirar lo suyo. Las cuentas de cada filtro lo reflejan.

**3. Las hechas se esconden** detrás de «Ver las hechas (n)». Una lista que
crece con lo tachado deja de enseñar lo que falta.

**4. Las fechas de la plantilla no se recalculan** si cambias la fecha de la
boda (`F4.1b`). Es lo que más puede morder: una pareja que da de alta con una
fecha provisional y la corrige después se queda con las tareas en las fechas
viejas hasta que las edite una a una.

**5. Tope de 300 tareas** por boda y 120 caracteres de título. Son constantes en
`features/panel/checklist/tareas.ts`.

**6. El aviso del inicio** enseña como mucho tres tareas —vencidas primero— y
cuenta las que quedan. Si no hay ninguna urgente, dice cuántas lleva hechas.

---

### D-44 · Smoke test 1: lo que he decidido — **pendiente de validar**

**1. El destino tras el login es dato de la ruta**, no una constante: el mismo
componente sirve a la pareja (`/panel`) y al superadmin (`/superadmin`).

**2. El enlace de alta continúa en `/panel/acceso`**, no en `/panel`: tras fijar la
contraseña, la pareja cae en el login del panel de su boda, nunca en la web pública.

**3. El 403 de App Check no se «arregla» en código.** Un token de depuración
registrado salta App Check entero; no puede ir en el repositorio. Solo se avisa.

**3b. El panel abre con la boda en borrador o archivada.** Es donde la pareja la
prepara antes de publicar; la guarda lo impedía. La seguridad no cambia: sigue
mandando el claim `weddingId` y las reglas de Firestore.

**4. Filtros y alta del superadmin** como se describen en `S1.3b/c`.

**5. Backlog propuesto, por orden** (cámbialo si quieres): primero lo que bloquea
vender (recuperación de contraseña desde el superadmin, ficha de boda + auditoría),
luego el módulo financiero con facturas, después landing y estadísticas de
conversión, y al final recordatorios y notificaciones (necesitan un proveedor de
correo y decidir si hay push). **Necesito los precios de los planes básico y extendido.**

---

### D-45 · La pareja contesta por el invitado: lo que he decidido — **pendiente de validar**

Lo pediste porque habrá gente que no entre en la web. Esto es lo que he decidido
yo y conviene que mires:

**1. Es una función aparte (`setGuestRsvp`), no `upsertGuest`.** El servidor mueve
`rsvpStatus` y `rsvpAnswers` (regla 6): la pareja no los escribe en la ficha del
invitado. Esta función es la única forma de que lo haga, y valida como el invitado.

**2. No se exigen las obligatorias.** La pareja apunta lo que sabe. Si te parece
mejor que el menú sea obligatorio al marcar «viene» —para que el catering no se
quede con huecos— es un cambio de una línea, pero obliga a rellenar algo que quizá
no sabes aún. Las mesas ya
muestran «Sin menú» para quien confirma sin elegirlo (`exportar-mesas.ts`).

**3. No hay plazo.** El plazo del RSVP es para el invitado; la pareja puede
corregir hasta el último día.

**4. «Sin contestar» vuelve a pendiente** y vacía la fecha de respuesta. No borra
las respuestas escritas.

**5. Lo que no hay todavía:** marcar a varios a la vez (`F1.8i`, `F1.8j`). Va en
cuanto la lista tenga selección múltiple; es lo que más tiempo ahorra con una
familia que confirma por teléfono.

**6. Un invitado que declina conserva su menú anterior** en el documento, igual
que cuando declina él por sí mismo. No lo he cambiado: si quieres que al marcar
«no viene» se vacíen menú y alergias, es un cambio aparte que también afectaría
al formulario del invitado, y conviene mirarlo antes contra lo que cuenta el
catering.

### D-46 · Acompañantes desde el panel y pulido de contenido — **pendiente de validar**

**1. La pareja decide quién viene con quién** (`validarVinculo`, en
`upsertGuest` con `invitedById`). Se puede dar de alta a alguien ya como
acompañante de un titular («Añadir acompañante» en su tarjeta) o enlazar a uno
que ya estaba con el selector «Viene con» de la ficha. Reglas: nadie viene
consigo mismo, un acompañante no puede ser titular (sin cadenas) y quien ya trae
gente no pasa a ser acompañante. Hereda los grupos del titular y no tiene cupo
propio.

**2. La pareja no está sujeta al cupo del titular.** El cupo (`maxCompanions`)
limita lo que apunta el invitado desde la web; la pareja puede enlazar más. Si
prefieres que también lo respete, es una línea en `upsertGuest`.

**3. Navegar:** «Trae a N» y «Lo trae X» son botones que abren la **familia**
(titular primero y sus acompañantes). Mientras se mira una familia los demás
filtros se ignoran, para que ninguno esconda a alguien. «Ver toda la lista»
vuelve.

**4. Todavía no hay:** desenlazar sin editar (se hace con «Viene por su cuenta»
en la ficha), ni crear varios acompañantes de una vez.

**5. Timeline y FAQ:** selector de iconos visual (rejilla con icono y nombre) y
de colores con muestra, vista previa de «cómo lo verá el invitado» en el
timeline, casillas en una sola línea, icono alineado en la web pública.

**6. Jodit:** el aspecto cutre era porque no se cargaba su hoja de estilos.
Ahora se enlaza (como Leaflet) y se viste con los tokens del panel. **Hay que
reiniciar `ng serve`**: se ha tocado `angular.json`.

**6b. Quiz:** ya no se siembran preguntas de ejemplo; el panel trae un bloque
«Cómo funciona el juego» (abierto mientras no hay preguntas) y un buscador por
enunciado, respuestas y pista (aparece desde 6 preguntas). **Las bodas ya
creadas conservan las 5 vacías**: bórralas desde el panel del juego.

**7. Lo que NO está hecho de lo que pediste:** la vista previa en la **galería**.
Hoy el panel de galería es solo moderación. Propuesta: botón «Cómo lo ven los
invitados» que abra la galería pública con las mismas fotos, como el timeline.

### D-47 · Tanda de 18 puntos: lo que he decidido y lo que he apartado — **pendiente de validar**

Hecha mientras Gabriel no estaba, con la instrucción de **apartar lo que
necesitara su respuesta**. Primero lo que he decidido yo; después, lo apartado.

**Decidido y hecho**

1. **Iconos de la cronología:** 17 más (cóctel, discursos, llegada de invitados,
   aplausos, entrada, primer baile, llegada, final, música en directo, viaje de
   novios, traje del novio, pareja, coche, globos, vídeo, testigos, descanso).
   «Llegada del novio» y «Llegada de la novia» se cubren con _Traje del novio_ y
   _Vestido_ (Phosphor no trae un traje), o con _Llegada_ y _Coche_.
2. **Pista del quiz:** cuesta **la mitad de los puntos de esa pregunta**
   (10/20/30 → 5/10/15) y la pantalla **avisa antes** de enseñarla
   («Pedir una pista (cuesta N puntos)» → confirmar). El servidor la apunta al
   entregarla (`getQuizHint`), no al corregir, y el texto de la pista solo sale
   por esa función. Se quita «dejarla en blanco» del texto: no existe.
3. **Nunca se enseña la respuesta correcta.** Al terminar solo salen los puntos
   y, si se ha entrado, el puesto en el ranking. Se retira el bloque «era…».
4. **Estadística por pregunta** (`quizStats/{id}`: contestada, acertada, pistas
   pedidas; la escribe el servidor al corregir, solo la lee la pareja). Con **al
   menos 10 respuestas**, ≥ 90 % de aciertos = _Pregunta fácil_ y ≤ 10 % =
   _Pregunta difícil_. Menos muestra no etiqueta: con tres jugadores, que los
   tres acierten no prueba nada. El panel enseña el porcentaje y la etiqueta.
5. **«Cómo funciona el juego»** lleva flecha de acordeón, y el texto deja de
   prometer lo que no hay (en blanco, pista gratis, «ve cuál era la correcta») y
   avisa de que **una pregunta fácil para la familia no lo es para los
   amigos** (el colegio de la novia): hay que elegir las que pueda contestar
   el grupo que juega o que salgan de información pública.
6. **No se guarda el email del invitado** para nada: campo, columna de
   importación, plantilla, exportación y funciones. Los invitados que ya lo
   tenían conservan el dato en su documento hasta que se limpie (no se lee).
7. **Grupos sin lado** (novio/novia) y **sin «los invitados pueden publicar una
   foto para todos»**: solo decide la pareja. Se quitan `side` y
   `allowPublicOptIn` del modelo y del formulario (quedan en documentos viejos,
   sin leerse). El `side` **del invitado** se mantiene.
8. **Todo invitado pertenece siempre al grupo general «Invitados»**: al crearlo,
   al importar, al editarlo (la casilla va marcada y bloqueada) y al
   **confirmar asistencia** (por la web y por la pareja).
9. **Menú «Confirmaciones de asistencia»**.
10. **Mesas:** la lista enseña a **todos** los invitados con color y texto
    (verde = confirmado, rojo = no viene, ámbar = sin contestar). Al sentar a
    un titular se pregunta por sus acompañantes; si no van con él **no hace
    falta elegir otra mesa** y los que quedan sin sitio se ven aparte. Se puede
    **quitar a alguien de su mesa**. Se quita el aviso de «mesas incompletas».
    Arrastrar usa **Angular CDK** (`@angular/cdk`, ya instalado en el patch):
    vista previa que sigue al dedo, retardo corto en táctil para no romper el
    scroll.
11. **El scroll vuelve arriba en cada navegación** (y conserva la posición al
    volver atrás): `withInMemoryScrolling`.
12. **Tareas:** filtros por **estado** (pendientes/vencidas/hechas), **categoría**
    y **texto**, además del de responsable. Al completar una tarea se guarda
    **cuándo** (hora del servidor) y **quién** (`doneByUid`, `doneByEmail`); se
    muestra «Completada el … por …». Las anteriores no tienen autor y solo
    enseñan la fecha.

**Apartado: necesita tu respuesta**

- **Desempate del ranking (punto 4 de tu lista).** Hoy gana quien tardó menos
  (§8.7 lo decía así, y el servidor lo hace). Tú dices que no lo hablamos. He
  **retirado esa frase del texto del panel** y no he tocado el comportamiento.
  Opciones: (a) más rápido gana, (b) empate compartido, (c) gana quien jugó
  antes. Mientras decides, el ranking sigue con (a) sin enseñar el tiempo.
- **Lista del superadmin de preguntas fáciles/difíciles para demos.** Se
  recoge la estadística por boda, pero **no** he montado la lista global: hace
  falta decidir (i) si las preguntas de una pareja pueden salir de su boda
  hacia otras (consentimiento, privacidad: suelen hablar de gente real), y (ii)
  qué pasa con la estadística cuando la pareja **edita** el enunciado (hoy se
  arrastraría). Propuesta: botón «Proponer como pregunta de demo» por pregunta,
  que la copia sin estadística a una colección del superadmin.
- **Preguntas por grupo de invitados (punto 6, más allá del aviso).** He
  añadido el consejo al texto. Etiquetar cada pregunta con los grupos a los que
  se dirige, y que cada invitado solo reciba las de su grupo, es un cambio de
  modelo y de reparto de la partida: dime si lo quieres.
- **Umbrales de la estadística:** 90 %, 10 % y mínimo 10 respuestas son míos.
- **Los «no viene» salen en rojo en mesas** pero no ocupan plaza. ¿Prefieres
  ocultarlos?
- **`doneBy` lo escribe el navegador** (la regla es «la pareja escribe sus
  tareas»): el otro miembro de la pareja podría falsearlo. Si importa, se mueve
  a una función o se añade una regla `doneByUid == request.auth.uid` con su
  test.
- Siguen sin respuesta: vista previa de la **galería** y confirmación **masiva**
  (F1.8i/j). Las bodas viejas conservan las 5 preguntas vacías del quiz.

### D-48 · Superadmin: ficha de boda, restablecimiento, cobros y recordatorios — **pendiente de validar**

Hecho mientras Gabriel no estaba, con la instrucción de **apartar lo que
necesitara su respuesta**. Va junto con la vista previa de la galería, la
respuesta en lote y los enlaces de ubicación, que no abrían decisiones.

**Decidido y hecho**

1. **Restablecimiento (`S1.6b`).** El Admin SDK **solo genera** el enlace, no lo
   envía, y la fase 1 no tiene proveedor de correo. Por eso el botón _genera y
   enseña_ el enlace para copiarlo y pasarlo por WhatsApp (el alta ya hacía lo
   mismo). Solo se acepta una cuenta que esté en `ownerUids` de esa boda; sin eso
   la función sería «el enlace de cualquier cuenta». El enlace **no se guarda ni
   entra en el log**: en el log queda quién lo pidió y para quién. Los correos
   salen de Firebase Auth, no se copian a Firestore. El teléfono solo sale si la
   cuenta lo tiene (hoy las cuentas de pareja no lo piden).
2. **Ficha de boda (`S1.7`).** `/superadmin/bodas/:id`, al pulsar el nombre de la
   pareja en el listado. Una sola función (`getWeddingFile`) junta resumen,
   contactos, cobros y las **últimas 100 entradas** de `auditLog` de esa boda.
   Necesita un **índice compuesto nuevo** (`auditLog`: `weddingId` + `createdAt`),
   que va en `firestore.indexes.json`. Una acción que la pantalla no conoce se
   enseña con su nombre técnico, no se esconde.
3. **Cobros (`S1.3e`).** Colección raíz `payments`: importe **en céntimos**
   (entero, 1 a 10 000 000), concepto, método (`bizum`, `transferencia`,
   `efectivo`, `otro`), estado (`pending`/`paid`), fecha de cobro (obligatoria si
   está cobrado, prohibida si no), número de factura y notas. Lo valida y lo
   escribe el servidor y deja rastro en el log; las reglas la cierran a todo el
   mundo salvo lectura del superadmin (con test de aislamiento). **No inventa
   precios** (D-02 sigue abierta) y **no emite facturas**: solo guarda el número
   de la que emites tú fuera. CSV con `;` y coma decimal, con BOM para Excel, y
   las celdas que parecen fórmula se neutralizan.
4. **Recordatorios (`S1.3f`).** Cuatro avisos por boda **activa**, a los **60
   días** de la fecha: _agradecimiento_ y _encuesta_ (a la pareja), _aviso de
   fotos y cierre_ (a la pareja) y _cerrar la boda_ (tarea tuya). Salen dos
   semanas antes de que toquen y se quedan hasta marcarlos. Las marcas viven en
   `reminderMarks` (solo superadmin). Las bodas en borrador, archivadas o sin
   fecha no generan nada. **No se envía nada**: la pantalla da el texto con los
   nombres y la dirección de la boda para copiar.

**Apartado: necesita tu respuesta**

- **Plazo exacto de los recordatorios.** «A los 2 meses» lo he fijado en 60 días
  y los cuatro el mismo día. ¿Quieres que el cierre llegue más tarde que el
  agradecimiento (p. ej. agradecimiento a las 2 semanas, cierre a los 2 meses)?
  Está en una constante (`DIAS_HASTA_RECORDATORIO`).
- **Textos de los avisos.** Los he redactado yo (tono cercano, tuteo en plural
  a la pareja). Revísalos; están en `superadmin.recordatorios.texto.*`. La
  encuesta no lleva enlace porque no hay formulario: ¿Google Forms, Typeform?
- **Cuánto se conservan los datos tras el cierre** (qué pasa con fotos e
  invitados al archivar). El texto de «cierre» no promete un plazo; sin la
  decisión (REQUISITOS §9.4) no puedo escribirlo ni automatizarlo.
- **`S1.3g` Notificaciones push/correo:** apartada hasta elegir proveedor de
  correo (§11.5). Con él, el envío automático de estos avisos es pequeño: el
  texto y el estado ya existen.
- **Cobros:** ¿hace falta distinguir IVA/base imponible, o un cobro por plan
  basta? Hoy es un único importe. Y, como el límite es 2 000 cobros por
  consulta, si llegas a más hay que paginar.
- **Cuentas de pareja con varios correos o sin correo:** la ficha las lista todas;
  quien no tiene correo no tiene botón de enlace.

### D-49 · Tanda 20: civil o religiosa, lugares, catálogos, presupuesto y «Nuestra historia» — **pendiente de validar**

Hecha mientras Gabriel no estaba. Todo lo de abajo lo he **supuesto yo**; nada
bloquea, pero quiero que lo valides.

**Civil o religiosa y lugares**

1. **Civil/religiosa** es un dato **obligatorio** del alta (por defecto, civil),
   se guarda en `ceremonyType`, la pareja lo edita en «Datos de la boda» y se
   muestra. **No cambia nada más** (ni tareas, ni textos): ver pregunta 1.
2. **Lugares en el alta, opcionales.** Ceremonia y celebración se buscan con
   **OpenStreetMap/Nominatim** (el mapa del producto es OSM, D-04) o **pegando un
   enlace largo de Google Maps** (saco las coordenadas del enlace; los enlaces
   cortos `maps.app.goo.gl` **no** se resuelven). Sin buscar, se pone el pin
   después desde `/panel/map`. Se crean como ubicaciones `ceremonia` y
   `banquete`, visibles para invitados.
3. **Editable desde el panel de la pareja:** nombres, fecha (la fecha **no mueve**
   las fechas de las tareas ya sembradas), tipo de ceremonia, hora y los lugares.
   **No editables:** correos, slug y plan.

**Catálogos del superadmin (tareas, presupuesto, quiz)**

4. `/superadmin/catalogos` con tres pestañas y CRUD. **Catálogo sin tocar =
   usar las de fábrica**; con elementos, manda el catálogo (aunque estén todos
   desactivados, que entonces siembra nada). «Cargar los de fábrica» solo
   funciona con el catálogo vacío.
5. **Cambiar el catálogo no toca las bodas ya creadas**: es una copia al alta.
6. **Presupuesto** no existía en el panel de la pareja: he hecho uno básico
   (`/panel/budget`, solo plan extendido): partidas por categoría, estimado/real,
   pagada, totales, CSV. Dinero en céntimos. Las 17 partidas de fábrica las he
   escrito yo; cantidades orientativas, **revísalas**.
7. **Sugerencias del quiz:** las preguntas del catálogo **no se copian solas**;
   en el panel salen con «Añadir a nuestro quiz». Se añaden **desactivadas y con
   la etiqueta «Por revisar»** hasta que la pareja edita las respuestas y las
   activa (una sugerencia con la respuesta correcta puesta por nosotros no debe
   jugarse sin mirar).

**Nuestra historia**

8. Cinco apartados fijos con Jodit y hasta **dos fotos por apartado**, que van
   **debajo del texto** de cada uno (mi lectura de «entre cada sección los novios
   podrán subir una o dos fotos»). Solo plan extendido. Página propia `/historia`.
9. El apartado 4 lo he titulado **«Nuestro mejor viaje»**; «nuestro lugar para
   estar juntos» queda en la ayuda de la pantalla.
10. La sección «Nuestra historia» de texto libre que nacía con cada boda pasa a
    ser el **cartel** que lleva a esta página (solo en bodas nuevas).
11. **Las bodas extendidas que ya existen no tienen `modules.story`** (los
    módulos se fijan en el alta): hay que añadírselo a mano. Ver pregunta 3.

**Otros arreglos de la tanda**

12. **Cerrar sesión** en los dos paneles (vuelve al acceso de su panel).
13. **Filtros del superadmin** ya no cambian el ancho (`scrollbar-gutter: stable`
    y filtros con tamaño fijo).

**Apartado: necesita tu respuesta**

1. ¿**Civil o religiosa** debe cambiar algo más? Por ejemplo, la plantilla de
   tareas (cursillo prematrimonial, papeles del juzgado) o el texto de la
   portada. Hoy solo se guarda y se muestra.
2. ¿Casilla **«la ceremonia y la celebración son en el mismo sitio»** en el alta,
   para no escribirlo dos veces?
3. ¿Cómo activo **«Nuestra historia» y el presupuesto en las bodas extendidas
   ya creadas**? Propongo un botón en la ficha del superadmin «Añadir módulos
   nuevos», o un script único. Mientras tanto no salen en su menú.
4. ¿Las fotos de la historia, **debajo del texto** de cada apartado, o prefieres
   un bloque de fotos aparte entre apartados?

---

### D-50 · Tanda 21: lista de invitados en acordeón, «mismo sitio» y módulos nuevos en bodas ya creadas — **pendiente de validar**

Respuestas de Gabriel a las preguntas de D-49 (1: algunas tareas serán de la
civil, **sin prisa**; 2: la casilla, sí, **solo civil**; 3: **añadirlos
directamente**; 4: probará él las fotos; 5: «Nuestro mejor viaje» vale) y el
rediseño de la lista de invitados que pidió.

**Lista de invitados**

1. **Una línea por invitado**, no una tarjeta: número, nombre, grupos (chips de
   color con su nombre) y respuesta (chip con color y texto). Con unos 200 por
   boda, la tarjeta grande obligaba a desplazarse mucho.
2. **Acordeón** (botón con `aria-expanded` y `aria-controls`): al abrir una fila
   salen teléfono, mote, lado, edad, acompañantes que puede traer, menú,
   alergias, notas, «no ha entrado», los enlaces a su familia y las cinco
   acciones (acompañante, respuesta, compartir, editar, borrar). **Se pueden
   tener varias abiertas** y hay «Plegar todos». Es un componente propio
   (`np-lista-invitados`), no un componente del design system: si otra pantalla
   lo pide, se promueve.
3. **Numeración** = posición en **lo que se ve** (1..N tras filtros y orden), no
   un identificador fijo del invitado. Si lo quieres fijo (el «nº 37» siempre el
   mismo), es otro dato; pregunta 1.
4. **Orden**: por nombre, respuesta (confirmados, pendientes, no vienen), grupo
   (en el orden de grupos de la pareja; **quien no tiene grupo va siempre al
   final**) y fecha de alta (los anteriores a ese dato, como más antiguos); en
   los dos sentidos. Al cambiar de criterio vuelve a ascendente. Los empates se
   deshacen por nombre.
5. **Filtro por grupos**: ya existía (`np-filtro-grupos`, con cuántos hay en cada
   uno) y se mantiene tal cual; se combina con las cifras de arriba, el buscador
   y el orden. En la vista de **una familia** (titular + acompañantes) el orden y
   el filtro se ignoran, como antes, y el selector de orden se esconde.
6. En la fila cerrada, un acompañante lleva «Lo trae Ana» como **texto**; el
   enlace que lleva a la familia está dentro de la fila abierta («Ver su
   familia»). Un botón dentro de otro botón no es HTML válido.
7. No se guarda qué filas estaban abiertas al recargar.

**Casilla «ceremonia y celebración en el mismo sitio»**

8. Solo sale con ceremonia **civil**. Marcada, se pide **un solo lugar** y viaja
   a las **dos** fichas del mapa (`ceremonia` y `banquete`) con los mismos datos.
   Si luego se elige religiosa, se ignora. **Consecuencia que conviene que
   mires:** en el mapa público saldrán dos tarjetas iguales; la pareja puede
   borrar una desde `/panel/map`. Pregunta 2.

**Módulos nuevos en las bodas ya creadas**

9. Función `completeWeddings` (solo superadmin, con auditoría) y botón **«Añadir
   módulos nuevos»** en la cabecera del superadmin. Revisa todas las bodas y
   **añade solo lo que falta**: los `modules.*` ausentes con el valor inicial de
   su plan (en extendido, `story` y `budget` entran **activos y visibles**; en
   básico, apagados) y el cartel de «Nuestra historia» en las secciones
   (**apagado**: la pareja decide anunciarlo). **No pisa nada** de lo que ya
   decidió la pareja y se puede repetir sin miedo (si no hay nada que añadir
   dice «ya tienen todos los módulos»).
10. **No toca las tareas ni las partidas** de las bodas viejas: el catálogo se
    copia al alta (D-49.5) y meterlo después duplicaría lo que la pareja ya
    haya hecho a mano.

**Apartado: necesita tu respuesta**

1. ¿Quieres un **número fijo** por invitado (que no cambie al filtrar u
   ordenar), por ejemplo para cruzar con una hoja de papel? Hoy es la posición
   en la lista que ves.
2. Con «mismo sitio», ¿prefieres **una sola ficha** en el mapa público (la de la
   ceremonia, con el nombre de los dos) en vez de dos tarjetas iguales?
3. Tareas propias de la civil («buscar maestro de ceremonias»): quedan para
   cuando lo pidas, como dijiste.

### D-51 · Tanda 22: sin cupo de acompañantes y acompañantes que siguen a su titular — **pendiente de validar**

Cambio pedido por Gabriel tras el smoke test: «"Acompañantes que pueden traer"
no me gusta esa funcionalidad ni ese límite. Vamos a quitarlo» y «los
acompañantes tienen, como norma general, la misma asistencia que el invitado que
los trae».

1. **Cupo fuera, entero.** Se quita `maxCompanions` del modelo, de la ficha, de
   la importación, de la plantilla, de la lista y del cupo en lote (la callable
   `setCompanionQuota` y `np-cupo-en-lote` desaparecen). Los documentos viejos
   conservan el campo sin que nadie lo lea. El interruptor por boda
   (`allowGuestAddedCompanions`) **se queda**: es lo que decide si los invitados
   pueden apuntar a gente. _Decisión mía:_ queda un **tope técnico de 10
   acompañantes por titular** (`MAX_ACOMPANANTES`), invisible salvo que se
   alcance (`cupo-lleno`), para que un enlace reenviado no pueda crear mil
   comensales. En la web del invitado ya no sale «puedes apuntar a N más».
2. **Asistencia heredada.** Un acompañante nace con el estado de su titular
   (también si se añade después) y lo **sigue** cuando el titular confirma o
   declina: por el formulario del invitado, por `setGuestRsvp` o por el lote
   `setGuestsRsvp`. Solo se mueve el **estado** (no el menú ni las alergias, que
   son suyos). Si alguien cambia a mano el estado de un acompañante (el propio
   acompañante o la pareja), se marca `rsvpFollowsTitular: false` y deja de
   seguirlo; ausente o `true` = sigue. Un acompañante marcado en lote **junto a**
   su titular sigue siéndolo.
3. **Pendiente de tu validación:** si el titular vuelve a «sin contestar», los
   acompañantes que lo seguían también vuelven a «sin contestar».
4. El mensaje de auditoría `setCompanionQuota` se conserva en las etiquetas
   para los registros viejos.

### D-52 · Tanda 22: lista de invitados, grupo «Invitados» oculto, WhatsApp único e importación solo Excel — **pendiente de validar**

1. **«Ver acompañantes»** sustituye a «Trae a N» y a «Ver su familia»: un solo
   enlace, en el titular que trae a alguien y en cada acompañante. Al entrar o
   salir de la vista de familia la pantalla sube al principio (antes quedaba un
   hueco en blanco).
2. **El grupo «Invitados» (el de todos) se oculta** en filtros, chips de cada
   fila, casillas del formulario y pantalla de grupos. **Sigue existiendo por
   debajo** (todo invitado está en él, D-47: lo usan la galería y la audiencia
   de las fotos). Lo he dejado visible solo donde se elige audiencia, por si
   quieres «para todos». Si prefieres borrarlo del todo, es un cambio de
   modelo: dímelo.
3. **WhatsApp:** se quita el botón y el modal por invitado. En «Vuestra web» hay
   **un solo bloque «Mandar vuestra web»** (mensaje editable, WhatsApp, copiar
   mensaje, copiar enlace) con el enlace de la boda, sin `{nombre}`. _Consecuencia
   a mirar:_ los enlaces personales con token por invitado (`getInviteLink`) ya
   no los pide ninguna pantalla; el invitado entra con el enlace general y se
   identifica con nombre y cuatro dígitos. Si quieres recuperar el enlace
   personal para alguien, es volver a ponerlo.
4. **Al añadir un invitado** ya no sale «Viene con» (se rellena solo al usar
   «Añadir acompañante» desde su titular); al **editar** sí, por si hay que
   recolocarlo.
5. **«Viene / no viene» en lote** solo aparece al mirar **una familia o un
   grupo**; sobre la lista suelta se quita.
6. **Importación solo con nuestra plantilla `.xlsx`.** Se descarga un Excel
   (no CSV) con las cabeceras y tres ejemplos, ya sin «Acompañantes». Ya no se
   sube CSV ni se pegan celdas; un Excel sin la fila de cabeceras o sin
   «Nombre y apellidos» se rechaza explicando qué hacer. El paso intermedio ya
   no es un formulario de asignación: es un resumen de qué se ha entendido de
   cada columna («Se ignora» si no encaja). Textos de la página reescritos en
   tres pasos (descargar, rellenar, subir).

### D-53 · Tanda 23: superadmin (menú lateral, correos, planes y módulos, consejos, editar y borrar boda, contadores de acceso) — **pendiente de validar**

Decisiones que tomé yo, sin poder preguntarte, y que quiero que mires:

1. **Correo = cola `mail` + extensión «Trigger Email».** Es lo más sencillo de
   mantener estando en Firebase: el servidor **no manda nada por SMTP**, solo
   escribe un documento en la colección `mail` (destinatario, asunto, texto y
   HTML) y la extensión oficial lo envía. _Mientras no esté instalada, los
   correos se quedan en `mail` y no salen_: el alta sigue funcionando y el
   enlace de acceso se enseña igualmente en pantalla para copiarlo. Los textos
   viven en `emailTemplates/{id}` (si no hay documento, vale el de fábrica) y se
   editan en `/superadmin/correos` con vista previa. Hay tres plantillas:
   bienvenida a los novios (**la sustituye al correo «horrible» de Firebase**,
   que nunca se manda), restablecer contraseña e invitación a invitados.
   _La plantilla de invitados existe y es editable, pero **no hay nada que la
   envíe todavía**_: los invitados se identifican por teléfono y no guardamos su
   correo. Queda para cuando decidamos si lo pedimos.
2. **Alta de boda.** Se quita el buscador de direcciones (Nominatim). Ahora: un
   botón abre Google Maps con el nombre ya buscado, y se **pega el enlace**. Si
   es un enlace largo, se leen las coordenadas y la ficha nace con su pin; si es
   corto (`maps.app.goo.gl`) no se pueden leer sin llamar a Google, así que
   queda sin pin y la pareja lo coloca. Al crear, el correo de acceso sale solo
   y el enlace se puede **copiar** además. En la ficha hay «Enviar por correo»
   para reenviarlo.
3. **Planes y módulos editables** (`plans/{plan}`, pantalla «Planes y módulos»).
   Lo marcado se aplica a **todas las bodas de ese plan**: _añadir = inmediato_
   (el módulo se activa; si la pareja nunca lo tuvo, nace oculto para los
   invitados); _quitar = pide confirmación con cuántas bodas lo usan_ y **solo lo
   desactiva**, sin borrar nada, tal como dijiste. Las bodas nuevas nacen con lo
   que diga el plan. «Vuestra web» (`publicSite`) no se puede quitar. Cambiar el
   plan de una boda (en «Editar datos») aplica la diferencia entre los dos
   planes. **Aviso:** hoy los dos planes empiezan con la lista que había en
   código, que es corta en el básico (web, confirmaciones, invitados, mapa,
   cronología, FAQ): si quieres que el básico traiga más, se marca ahí.
4. **Catálogos siempre activos.** Se quita el interruptor «activo»: lo que está
   en el catálogo se vuelca; lo que no quieras, se borra. Las **tareas ya no
   llevan categoría ni icono** (se pueden crear sin ellos).
5. **Consejos (`tips/{módulo}`).** Un desplegable «Consejo» arriba de cada módulo
   del panel de la pareja, con texto plano gestionado en `/superadmin/consejos`
   (vacío = sin consejo; «Volver al original» recupera el de fábrica). **Los
   textos de fábrica los he escrito yo** (16, uno por módulo): léelos y cámbialos
   a tu gusto. El desplegable se pinta una sola vez en el marco del panel, no en
   cada pantalla.
6. **Editar y borrar boda** desde su ficha. Editar: nombres, fecha, ceremonia y
   plan (la web pública se actualiza sola); **el slug no se edita** (es la
   dirección, está autorizada en Auth y puede estar ya repartida). Borrar:
   **definitivo e inmediato** (tú lo pediste), escribiendo la dirección para
   confirmar. Se llevan el documento y todo lo que cuelga, los ficheros de
   Storage, el registro de la dirección (queda libre), el dominio autorizado en
   Auth y las cuentas de la pareja **si no tienen otra boda**. **Se conservan**
   los cobros y el historial de auditoría.
7. **Contadores de acceso.** Entradas de la pareja al panel (`access.ownerLogins`
   y última entrada; se cuenta una vez por pestaña y el servidor ignora
   recargas con menos de media hora) e invitados: cuántos han entrado y cuántas
   entradas en total (suma de `loginCount`). **No se registran las visitas
   anónimas a la web ni la «conversión»** (visita → confirmación): para eso
   habría que medir al público sin identificar y tiene implicaciones de
   privacidad/cookies que no quiero decidir yo. La ficha lo dice. `access` es
   campo de sistema (regla 6) y tiene su test de reglas.
8. **Resumen en la ficha:** confirmados / rechazados / sin contestar, fotos,
   entradas y lo cobrado de esa boda.
9. **Menú lateral del superadmin** vertical y plegable (se acuerda), con las
   secciones Bodas, Estadísticas, Finanzas, Recordatorios, Catálogos, Planes y
   módulos, Correos y Consejos. «Cerrar sesión» está ahora al pie del menú.
10. **Nuevas colecciones cerradas al cliente** (`plans`, `emailTemplates`, `tips`,
    `mail`): sin reglas = denegado, y hay test que lo comprueba para los cuatro.

---

### D-54 · Tanda 24: panel y web de la pareja (publicar, historia, galería propia, cámara, plantillas y colores) — **pendiente de validar**

Cosas que arreglé y decisiones que tomé yo, para que las mires:

1. **Entrar al panel.** La pareja entraba y volvía a la pantalla de acceso: la
   navegación salía antes de que la sesión se actualizase con sus claims y el
   guarda la echaba. Ahora el acceso espera a que la sesión deje de ser anónima
   (con tope de 5 s). Test de regresión incluido.
2. **Publicar lo hace la pareja** («Publicar mi web» / «Volver a borrador», en el
   Resumen), como pediste. Pide lo mínimo: los dos nombres, la fecha y la
   dirección; el servidor (`setMyWebStatus`) lo vuelve a comprobar. La pareja
   **no puede archivar ni reactivar una archivada**: eso sigue siendo del
   superadmin. El superadmin sigue pudiendo cambiar el estado.
3. **Datos de prueba del quiz.** Al publicar por primera vez (de borrador a
   activa), por cualquier camino, **se borran las partidas de prueba del quiz**
   (partidas, ranking y contador); las preguntas no se tocan. El modal de
   confirmación lo avisa y en el módulo del quiz hay un aviso. _Decisión mía:_ lo
   borro **cada vez** que una boda pasa de borrador a activa, también si el
   superadmin la vuelve a abrir tras un borrador.
4. **Preguntas sugeridas del quiz:** las que ya están añadidas desaparecen de la
   lista de sugerencias (se compara el texto normalizado).
5. **«Nuestra historia»:** dos botones de guardar (arriba y abajo) que guardan
   todos los apartados con cambios de una vez; las fotos ya no se recortan
   (`object-fit: contain`, también en la web pública).
6. **Otras tipografías.** No he añadido un selector de fuentes suelto (iría
   contra el catálogo cerrado): cada plantilla trae su pareja de fuentes y hay
   dos nuevas, **Romántica** (caligrafía Great Vibes + Lora, tonos rosados) y
   **Moderna** (Montserrat en mayúsculas, blanca). _Si lo que querías era poder
   cambiar la fuente del texto de la historia, dímelo y lo hago aparte._
7. **Más colores:** seis paletas nuevas (Lavanda, Terracota, Cereza, Salvia,
   Marino y Vino), todas con el test de contraste AA.
8. **Menú del panel:** el apartado activo se marca con negrita y una barra de
   color (`aria-current="page"`); «Vuestra web» salía dos veces con el mismo ojo
   (el módulo `publicSite` y el enlace fijo): queda solo el fijo.
9. **Secciones de historia duplicadas:** el backfill (`completeWeddings`) las
   creaba otra vez. Ahora convierte las antiguas, repara las duplicadas y es
   idempotente. Hay que pulsar «Añadir módulos nuevos» una vez para reparar las
   bodas existentes.
10. **Aviso de primera vez** en el Resumen («repasad vuestras tareas»), solo si
    el módulo de tareas está activo; se descarta y se recuerda en el navegador.
11. **Botones «Hacer una foto»** (cámara del móvil, `capture`) junto a las
    subidas de la galería, la portada y la historia.
12. **Galería del invitado:** había un fallo —el navegador nunca sabía quién era,
    así que **ningún invitado podía borrar sus fotos**—. Ahora `listPhotos`
    devuelve `miGuestId`; sus fotos llevan una papelera en la rejilla y hay filtro
    «Todas / Mis fotos». Las reglas no cambian (`photos` sigue cerrada).

Sin resolver / para ti: no hay vista de «mis fotos» pendientes de aprobar (el
invitado solo ve las aprobadas); y el filtro es del lado del navegador.

---

### D-55 · Tanda 25: panel protegido, publicar, teléfono, dirección editable, cola de correos, CSV y tema en los módulos públicos — **pendiente de validar**

Lo que hice y lo que decidí yo, para que lo mires:

1. **`/panel` protegido.** No he conseguido reproducir que entrara sin sesión.
   Endurecí los guardas (`guardaPanel` ya no deja pasar ante un fallo de lectura,
   `guardaHijosDelPanel` en las rutas hijas) y el panel redirige solo si pierde la
   sesión o los claims. _Sospecha:_ Firebase Auth comparte el estado por origen
   entre ventanas de incógnito del mismo navegador. **Dime en qué boda y navegador
   lo viste y si había alguna sesión abierta.**
2. **Error al publicar** («No se ha podido hacer el cambio»): casi seguro es
   `setMyWebStatus` sin desplegar. Ahora el modal enseña el motivo concreto.
3. **Publicar**: el botón sale arriba del Resumen cuando la web es borrador; con la
   web publicada queda un «Volver a borrador» pequeño al final.
4. **Catálogos del superadmin**: las tareas no se guardaban porque la categoría era
   obligatoria sin decirlo; ahora es opcional. Selector de icono en la tarea.
5. **El quiz no cargaba desde un enlace directo**: la sesión de invitado no estaba
   inicializada. Ahora las rutas del quiz, galería, regalos y playlist la
   recuperan antes de pintarse; sin sesión se dice con un mensaje claro.
6. **Módulos públicos con el tema de la pareja** (colores y tipografías de su
   plantilla): quiz, galería, regalos, playlist, historia, mapa y confirmar.
7. **Correo**: la plantilla de acceso pasa a llamarse «Correo de reestablecer
   contraseña». **Trigger Email no está instalada**, así que los correos solo
   quedan en cola: nunca han salido. Nueva pantalla **Cola de correos** en el
   superadmin (cuántos, cuáles, estado, descartar).
8. **Teléfono de contacto opcional** de la pareja en el alta y en la ficha.
9. **Dirección (slug) editable** desde la ficha del superadmin: reserva la nueva,
   libera la vieja y mueve la autorización del dominio. _Los enlaces antiguos dejan
   de funcionar al instante._
10. **Cobro en mano**: «Apuntar cobro» en la ficha crea un pago ya cobrado
    (efectivo por defecto). _Suposición mía:_ si querías un único total editable
    por boda, dímelo.
11. **Visitas a la web**: solo contador agregado (`access.webVisits`) y última
    visita, una por pestaña y sesión, solo con la web activa. Sin conversión.
12. **Lista de invitados**: ordenar por grupo respeta el grupo oculto; «Importar
    lista» es un enlace; **importación de CSV** además de Excel (`;`, `,` o tabulador, BOM, comillas).
13. **Sin correo de invitación a invitados**: no existe ese flujo ni plantilla.
    Cómo eligen los novios el acceso: «Datos de la boda» → «Cómo entran los
    invitados».
14. **Fotos**: opción A (se publican al subir, la pareja borra), sin ajustes.

**Pregunta que necesita tu decisión (REQUISITOS, duda 9):** con el acceso
**abierto** (el de por defecto) no se crea sesión de invitado, así que **el quiz y
la subida de fotos no pueden funcionar**. Hoy solo avisa en «Datos de la boda».
Opciones: jugar de forma anónima con un apodo, o exigir enlace/teléfono para
esos módulos.

---

### D-56 · Tanda 26: identificarse para jugar y subir fotos, y precio acordado por boda — **pendiente de validar**

Respuestas de Gabriel a D-55: (1) exigir login para el quiz y la galería y avisar a los
novios; (3) sí al precio acordado editable por boda (puede cambiar si es un regalo).
Lo que hice y supuse yo:

1. **Con la web abierta, quiz, galería, regalos y playlist piden identificarse**
   (nombre y 4 últimos dígitos, como el modo B). _Supuesto mío:_ pedí lo mismo para
   regalos y playlist, no solo quiz y galería: también necesitan saber quién es el
   invitado (reserva, votos) y con la web abierta estaban rotas. Si prefieres que la
   lista de regalos sea informativa y sin login, se quita de la guarda.
2. **Cómo funciona:** `guestLogin` acepta ya una boda abierta (con credenciales de
   modo B, mismo límite de intentos y misma respuesta única de fallo). Una guarda de
   ruta manda a `/entrar?volver=quiz|galeria|regalos|playlist` y vuelve a la página
   al identificarse. El destino es un nombre de la lista, nunca una URL libre.
   También arregla abrir `/quiz` directamente en los modos B/C sin sesión.
3. **Efecto secundario:** ver la galería también exige identificarse (la función
   ya exigía sesión; antes fallaba con un error confuso).
4. **Avisos a los novios:** «Datos de la boda» (web abierta + quiz/galería activos,
   y cuántos invitados no tienen teléfono), y un aviso fijo en el panel del quiz y en
   el de la galería con enlace a la lista de invitados.
5. **Precio acordado:** campo en «Editar datos» de la ficha (euros; vacío = sin
   fijar; 0 vale). Se guarda en `billing/{weddingId}` (solo superadmin; la pareja no
   lo lee). La ficha enseña acordado, cobrado y falta por cobrar (nunca negativo).
   «Apuntar cobro» sigue como estaba. Sin reglas nuevas: la colección queda cerrada
   por defecto (hay test).
6. **Pregunta para ti:** los invitados sin teléfono en la lista no podrán jugar ni
   subir fotos. ¿Quieres que la importación avise más fuerte, o permitir que la
   pareja les dé acceso de otra forma?

### D-57 · Tanda 27: cabecera de navegación del plan completo y paletas nuevas — **pendiente de validar**

Gabriel eligió sobre los bocetos: **escritorio = menú horizontal plano con «Más»;
móvil = cajón agrupado** («La boda» / «Participa»). Lo que hice y supuse yo:

1. **Solo el plan completo (`layout: multipage`).** El plan básico (`onepage`) queda
   como estaba: sin cabecera, con los carteles apilados y el botón flotante de
   confirmar. La proyección ya publicaba `layout`; ahora el cliente lo lee
   (`SitioPublico.layout`, por defecto `onepage`).
2. **La cabecera** (`np-cabecera-boda`) sale en la portada y en las páginas de
   quiz, galería, regalos, playlist, historia, mapa y confirmar, con la plantilla y
   la paleta de la boda (colores y letra). Sticky arriba. En escritorio: nombre,
   Inicio, hasta 4 enlaces, «Más» si hay más, y «Confirmar asistencia». En móvil:
   nombre y botón de menú; el cajón agrupa los enlaces y deja «Confirmar» abajo.
   Escape cierra lo abierto. Las páginas con cabecera ya no pintan su «‹ Volver».
3. **El menú sale de las secciones encendidas**, en el orden de la pareja, grupo
   «La boda» primero y «Participa» después. Contenido de la portada (programa,
   alojamiento, dress code, preguntas, textos con título) = ancla a la portada;
   historia, mapa, quiz, galería, regalos y playlist = su página. _Supuesto mío:_
   los textos libres solo entran si tienen título. Candado en lo que pide nombre
   y 4 dígitos.
4. **En la portada del plan completo ya no se apilan los carteles** de los módulos
   con página propia (están en el menú). El botón flotante de confirmar lo sustituye
   el de la cabecera.
5. **Romántica + Vino «apenas se veía»:** el velo sobre la foto de portada tenía un
   rosa claro fijo, así que con una paleta oscura el texto claro se perdía. Ahora el
   velo es del color del fondo de la boda en Romántica, Moderna y Botánica (la
   Clásica va con texto blanco sobre velo negro y no se tocó). _Supuesto mío:_
   «Tinto» = la paleta Vino; no existía ninguna con ese nombre.
6. **Paletas nuevas** (todas pasan el test de contraste AA): «Tinto y rosa»
   (clara, tinto y rosa con acento dorado), «Burdeos y oro» (oscura), «Grafito y
   oro» (oscura) y «Perla y oro» (clara). Total 18.
7. **Pregunta para ti:** ¿quieres también cabecera en el plan básico, con anclas a
   las secciones de la misma página? Es el mismo componente; solo cambian los
   enlaces.

### D-58 · Tanda 28: mesas, acompañantes, teléfonos, finanzas, panel, plantilla Barroca — **pendiente de validar**

1. **Mesas:** a partir de 64 rem, dos columnas (lista de «faltan por sentar» a la
   izquierda con su propio scroll y filtros, mesas a la derecha); en móvil la lista va
   arriba con altura propia. Filtros: texto (nombre y apellidos a la vez, sin acentos;
   un acompañante sale también si buscas a su titular), grupo y «ocultar a los que no
   vienen». _Supuesto mío:_ un solo cuadro de texto para nombre y apellidos.
2. **Respuestas y acompañantes:** los acompañantes son invitados de pleno derecho y ya
   salían, pero **sin distinguirlos** y **sin avisar de los que no han contestado**.
   Ahora cada uno sale como «Nombre (con Titular)», el recuento dice cuántos son de
   acompañantes y cada pregunta de opciones enseña «Faltan por contestar N (de ellos M
   acompañantes)» con los nombres. No cuentan como faltantes quien no viene, quien no
   ve la pregunta por lo que contestó antes, ni las preguntas apagadas.
   **Pregunta para ti:** ¿el titular puede contestar el autobús por sus acompañantes
   (hoy cada uno contesta lo suyo)? Es lo que haría que «falten» bajara solo.
3. **Teléfonos:** se siguen **guardando** en E.164 (`+34677000111`), porque el login
   del invitado lo necesita. Lo que cambia es lo que se **ve y se exporta**: sin `+34`
   (`677000111`); los de otro país se enseñan con su `+`. Al escribirlos no hace falta
   prefijo y el servidor ya aceptaba ambas formas.
4. **Finanzas:** «Cobrado desde / hasta» y atajos (este mes, mes anterior, este año,
   todo). _Supuesto mío:_ con rango puesto, lo pendiente sin fecha de cobro queda fuera
   (se avisa en pantalla).
5. **Resumen del panel:** quitado el bloque «Atajos» (invitados, respuestas y módulos).
   _Supuesto mío:_ «ese atajo» era el bloque entero. «Volver a borrador» pasa a una fila
   horizontal pegada abajo (estado + enlace + botón).
6. **Publicar (error de permiso) — sin cerrar.** Con `setMyWebStatus` ya desplegada, el
   mensaje «Vuestra sesión no tiene permiso» sale cuando el servidor devuelve
   `permission-denied` o `unauthenticated`; no puedo distinguirlos sin el log. El
   modal ahora enseña un **detalle técnico**: `sesion-sin-boda` = el token no lleva
   `role: owner` ni `weddingId`; `permission-denied` a secas = lo rechazó el acceso a
   la función (invoker de Cloud Run sin `allUsers`); `Unauthenticated` = App Check o
   sesión caducada. Dime qué pone.
7. **Plantilla Barroca:** pergamino, doble filete, capitales con adorno y florones entre
   secciones; tipografías Cinzel Decorative e IM Fell English. Todo el ornamento es CSS
   y caracteres de texto. Total 5 plantillas.
8. **Quiz:** no se ha tocado (esperas a tener 10 preguntas).

### D-67 · Proveedores comercializadores y cobro en el alta — **pendiente de validar**

Hecho sin preguntarte (F0.7.7–F0.7.9, lo que no dependía de tu respuesta). Supuestos míos:

1. **El cobro se apunta después de crear la boda, no en la misma operación.** Si el cobro falla,
   la boda queda creada y la pantalla avisa de anotarlo en Finanzas. Prefiero eso a no dar de alta
   una boda por un fallo de contabilidad. El importe ilegible sí frena el alta antes de crear nada.
2. **Los proveedores no se borran**: se desactivan (`active`). Un proveedor con cobros no puede
   desaparecer sin dejar huérfanos.
3. **`partner_cash` exige proveedor** y es «efectivo que cobró el proveedor». Nace `pending`: sigue
   pendiente hasta que nos lo liquida. Un cobro con proveedor lo creas desde el alta; en Finanzas el
   proveedor se hereda al editar, pero no se elige.
4. **Liquidar es todo o nada** (máx. 200 cobros por vez) y pasa los cobros a `paid` con método
   `partner_cash` y la fecha dada. Si uno ya estaba cobrado o es de otro proveedor, no se toca ninguno.
5. **Tarifas mayoristas en céntimos**, por plan; vacío = 0. No son precios públicos (D-02 sigue abierta).
6. **El código del proveedor** (`pepe`, 3–32, minúsculas/números/guiones) es una etiqueta única, no
   una credencial. La ruta `/alta?ref=` todavía no existe (pertenece a la bandeja, F5).
7. **El saldo no se guarda**: se calcula de los cobros, así que no puede desfasarse.

### D-66 · Regalos sin identificarse en el básico y plazo de confirmación por defecto — **pendiente de validar**

**Pedido por ti (2026-11-25).** Dos decisiones mías al aplicarlo:

1. **Regalos del plan básico, dentro de la web y sin pedir identificarse.** No hay lista de
   invitados que comprobar, así que se pintan en la propia página (aportación con botones que
   copian IBAN y Bizum, y la lista, **sin reservas**: sin invitado no hay a quién apuntárselas).
   **Esto cambia una decisión de seguridad anterior** (el IBAN «nunca en la web pública»): sigue sin
   viajar en `public/site` —no se indexa ni se rastrea—, pero ahora **cualquiera que conozca el
   slug lo puede leer**, igual que ya pasaba en una boda con acceso abierto. Va por una función
   nueva, `getOpenGifts`, con App Check, que solo contesta si la boda es **básica, está publicada y
   tiene el módulo de regalos encendido**; en cualquier otro caso responde lo mismo que si no
   existiera. El plan extendido no cambia: sigue con `/regalos` e identificación.
2. **Plazo del formulario por defecto: una semana antes de la boda.** Sin plazo puesto por la
   pareja, el servidor cierra el formulario 7 días antes (cuenta ese día entero) y la web lo
   dice («Hasta cuándo se puede confirmar»). El panel lo explica bajo el campo con la fecha
   concreta. «Quitar el plazo» pasa a «Volver al plazo por defecto»: ya no existe «sin plazo
   para siempre». Sin fecha de boda, sigue sin plazo. **Ojo:** el plazo cierra también las
   respuestas de las bodas que ya existían sin plazo.

### D-65 · Módulos añadidos a un plan nacían ocultos y la pareja no tiene mando para verlos — **pendiente de validar**

**Qué pasaba (lo viste con Autobuses):** al añadir un módulo a un plan desde el superadmin,
las bodas lo recibían **encendido pero con visibilidad `hidden`** (D-52 punto 3: «decide ella
qué anuncia»). Pero la pareja **no tiene ningún control** para cambiar esa visibilidad, así que
salían el aviso azul «secciones activas que los invitados no ven» y la etiqueta «Oculta» en el
menú, sin salida. Además la visibilidad de módulo hoy solo la lee la web para el botón
«Confirmar»: lo que decide si el invitado ve algo es el interruptor de su sección en `/panel/web`.

**Supuesto mío:** al añadir un módulo a un plan se activa **y se pone visible**, igual que los
que el plan trae al nacer la boda. Se respeta «muy pronto» y lo ya visible. «Añadir módulos
nuevos» repara de paso las bodas que ya quedaron en encendido+oculto. Si algún día quieres que la
pareja anuncie módulos «muy pronto», hará falta ese mando; no existe todavía.

### D-65 · Tanda 35: la HOME de `nupcialis.com` y su editor — **pendiente de validar**

La portada del producto era un rótulo. Ahora es **una sola página vertical, sin menú**, pensada
para que una pareja que entra quiera quedarse, y se edita entera desde `/superadmin/home`
(plantilla, tipografías, color, textos con Jodit, iconos, imágenes y SEO).

Lo que decidí yo al construirla y necesita tu visto bueno:

1. **Tres plantillas**: **Luz** (clara y cálida, serif elegante), **Editorial** (de revista, bloques
   de color y sombra dura, titular a dos columnas) y **Noche** (oscura, dorados). Los nombres son
   míos. Cambiar de plantilla cambia solo la apariencia; los textos son los mismos.
2. **Texto de fábrica escrito por mí**, en español y en «vosotros». Titular: «Una web preciosa para
   vuestros invitados. Un panel para tenerlo todo a mano.» **Léelo entero**: es lo que va a ver
   quien llegue, y se cambia desde el editor.
3. **Orden de la página**: portada con imagen (panel + móvil) → «Todo lo de la boda, donde lo vais
   a encontrar» (3 tarjetas) → «Así de fácil» (4 pasos) → **capturas del panel básico y del
   extendido** (con su lista de lo que incluye cada uno) → **«Vosotros sois los dueños»** (6
   tarjetas: temas, colores, invitados, mesas, proveedores y qué se ve y qué no; cierra con «Es
   vuestra boda. Nosotros solo ponemos las herramientas.») → llamada final → pie. Las capturas son
   del panel real con datos de muestra (`/dev/panel-basico` y `/dev/panel-extendido`), no mock-ups,
   y se pueden cambiar subiendo otras.
4. **La llamada a la acción apunta a `mailto:hola@nupcialis.com`** (provisional: **no sé qué correo
   o formulario quieres**). Hasta que exista el embudo de solicitud (`B-A2`, `weddingRequests`),
   un botón que lleve a una dirección real es lo único honesto. Se cambia desde el editor. **Decide
   a dónde debe llevar.**
5. **Sin precios.** La sección «Planes» existe pero viene **apagada** y con el precio vacío (D-02:
   los precios no están decididos); si la enciendes y dejas el precio vacío, no enseña ninguno.
6. **Guardar = publicar al instante.** Hay borrador con vista previa, pero «Guardar y publicar» lo
   pone en la web ya; no hay un paso intermedio de «en revisión». «Restaurar de fábrica» borra lo
   guardado **y las imágenes subidas** (pide confirmación; no se puede deshacer).
7. **La HOME se indexa siempre** (`noindex` fuera): la portada del producto tiene que salir en
   Google. Las webs de las parejas siguen en `noindex` salvo que ellas lo cambien.
8. **Tipografías de Google Fonts**, cargadas solo en la HOME y solo las dos elegidas (8 de título,
   6 de texto, de una lista cerrada). Es una petición a un tercero desde la portada: **si prefieres
   alojarlas nosotros (RGPD), dímelo** y las empaqueto.
9. **Si Firestore tarda más de 2,5 s o falla, se pinta lo de fábrica**: la portada nunca se queda en
   blanco. Hasta saber cuál pintar no se enseña nada, para que no parpadee el texto equivocado.
10. **El acento «Oro viejo» lo oscurecí** (`#8a6a14` → `#7d5f10`) para que se lea como texto sobre
    los fondos tintados: el test de contraste lo cazó.
11. **Arreglo de paso**: los avisos «Tenéis 1 secciones activas…» / «1 módulos encendidos…» ya no
    concuerdan mal en singular («Hay secciones activas que los invitados todavía no ven (1)»).

**Para aplicar:** desplegar `saveHome` y `resetHome`, las reglas de Firestore y de Storage, y abrir
`/superadmin/home` (ver `PARA-GABRIEL.md`).

### D-64 · Tanda 34: repaso tras probar la tanda 33 — **pendiente de validar**

**Pedido por ti (2026-11-24):** autobuses en el superadmin, «Cómo llegar» que refleje el mapa,
quitar Ceremonia y Banquete de `/panel/web`, y poder publicar el formulario de confirmación.

**Supuestos míos, para que los valides:**

1. **Autobuses en el superadmin**: el catálogo de módulos de `/superadmin/planes` lo devuelve la
   función `getPlans` (`MODULOS` del servidor), que ya incluye `buses` **pero solo tras
   `npm run deploy:functions`**. Faltaba además `buses` en `MODULOS_PUBLICOS` (visibilidad que
   publica la proyección); corregido. He repasado el resto de listas (cliente, servidor,
   traducciones, iconos, rutas): no falta ningún otro módulo.
2. **«Cómo llegar» enseña los sitios del mapa dentro de la web**: nombre, tipo y hora, dirección,
   descripción y botón «Cómo llegar», más un enlace «Ver todos los sitios en el mapa» a `/mapa`.
   Antes era una tarjeta genérica que solo llevaba a esa página. Solo salen los sitios que ya se
   publican (con pin puesto y visibles para invitados: los demás no, igual que antes). La
   **ceremonia y el banquete en el mismo punto se cuentan como uno** («Ceremonia y banquete»).
   La vista previa de `/panel/web` ahora trae los sitios reales.
3. **Ceremonia y Banquete retirados**: el tipo de sección `evento` ya no se ofrece ni se publica
   (`TIPOS_RETIRADOS`); las bodas que lo tenían conservan los datos guardados, solo no se
   enseñan. Las bodas nuevas no los siembran. Si quieres recuperar lo que escribiste, está en
   Firestore (`content.sections`). El interruptor «mismo sitio» y `conMismoSitio` desaparecen.
   La hora de la ceremonia que sale en la portada es `weddingTime`, no esta tarjeta.
4. **Formulario de confirmación**: nueva sección «Confirmad vuestra asistencia» (tipo `rsvp`,
   módulo `rsvp`): un cartel que lleva a `/confirmar`, que sigue pidiendo nombre y 4 dígitos.
   **Nace apagada**, como las demás, y «Añadir módulos nuevos» la pone **justo tras la portada**
   en las bodas existentes. En el plan completo ya había botón «Confirmar» en la cabecera; esto
   añade el cartel dentro de la página (y es la única forma en el plan básico de tenerlo
   a la vista dentro de la web además del botón fijo de abajo).

### D-63 · Tanda 33: plan básico completo, autobuses, mismo sitio y tema Acuarela — **pendiente de validar**

**Decidido por ti (2026-11-24):** autobuses = **información de rutas** (sin reservas); plan básico =
**solo añadir regalos, alojamiento y autobuses** a los seis que ya tenía; el tema nuevo vale para
**los dos planes, con huecos de imagen**; «mismo sitio» = **interruptor en `/panel/web` + casilla
en el alta**.

**Supuestos míos, para que los valides:**

1. **Plan básico**: `ACTIVOS_BASICO` = publicSite, rsvp, guests, map, timeline, faqs, gifts,
   accommodation, buses. Lo que ofrece `/panel/web` en el básico sale solo de ahí: cronología,
   preguntas, mapa, regalos, alojamientos y autobuses (más ceremonia, banquete y texto libre).
   Las bodas básicas **ya creadas** tenían esos tres módulos apagados y la pareja no puede
   encenderlos: `completeWeddings` («Añadir módulos nuevos») los enciende **una vez** y solo en
   plan básico. Si el superadmin personalizó la lista del plan en Firestore (`plans/basic`), esa
   lista manda y hay que añadirlos allí a mano.
2. **Autobuses**: hasta 12 rutas; cada una con sentido (ida/vuelta), nombre opcional, salida,
   hora opcional, destino y nota. Sin salida **o** sin destino no se publica (el panel avisa).
   Salen primero las de ida y dentro de cada sentido por hora. Vive en el documento de la boda
   (`modules.buses.config.rutas`), igual que el dress code: no hay reglas nuevas.
3. ~~**Mismo sitio**~~ **Sustituido en D-64**: las tarjetas «Ceremonia» y «Banquete» ya no existen, y con ellas desaparece el interruptor y el dato `sameVenue`.
4. **Aviso de cambios sin guardar**: tarjeta fija arriba (se queda visible al hacer scroll), con
   título «Tenéis cambios sin guardar», explicación y botón «Guardar». El interruptor de mismo
   sitio cuenta como cambio sin guardar y se guarda junto con las secciones.
5. **Tema «Acuarela»** (en los dos planes): blanco, una columna centrada, letra manuscrita
   (Pinyon Script) en verde oscuro `#233d00`, manchas de acuarela hechas con degradados de CSS
   (nada de imágenes ajenas ni de copiar nada de la web de referencia). La portada enseña la
   foto de la boda dentro de un arco; mientras no la hay, una mancha. Los huecos para más
   imágenes (eventos, etc.) llegarán cuando decidas qué fotos y dónde.

### D-62 · Tanda 32: enlaces entre tareas, partidas, proveedores e invitados — **pendiente de validar**

**Decidido por ti (2026-11-24):** la partida solo **propone** importes del proveedor (botones, nunca
automático); la persona se enlaza con el invitado **solo como vínculo + chip de respuesta**; los
enlaces con tareas se hacen **desde ambos lados**.

**Supuestos míos, para que los valides:**

1. **El enlace es un identificador**: no se copian importes ni nombres. Si borras un proveedor,
   una partida o un invitado, lo que colgaba de él **se ve «sin enlace»** (no se borra nada) y el
   id roto se limpia solo al guardar esa ficha. Así no hay que tocar varias colecciones al borrar.
2. **Un selector solo existe si la boda tiene ese módulo** (el plan básico no ve proveedores ni
   presupuesto) y, **sin él, guardar conserva el enlace que hubiera** en vez de borrarlo.
3. **Si la lista de invitados no carga**, la persona conserva su enlace y no se avisa de «ya no
   está»: sin lista no se sabe si existe.
4. Desde la ficha del proveedor o de la partida, **«nueva tarea» nace en la categoría
   «Proveedores», a nombre de los dos y sin fecha** (se edita luego en `/panel/checklist`); la
   de una partida hereda además el proveedor de la partida.
5. La lista de tareas enlazables solo ofrece las **abiertas y sin enlace de ese tipo**: una tarea
   ya colgada de otro proveedor no se roba desde aquí (se desenlaza antes desde su propia ficha).
6. **El invitado enlazado no se publica nunca**: `guestId` lo descarta la proyección (test) y la
   web enseña lo mismo que antes. El chip de respuesta solo lo ve la pareja.
7. «Pagada» de la partida **sigue siendo a mano**: el proveedor solo la informa en una línea
   («lleva pagado X; acordado Y»). Si prefieres que se marque sola cuando el proveedor esté
   pagado, dímelo y se hace.

### D-61 · Tanda 31: proveedores y personas importantes — **pendiente de validar**

**Decidido por ti (2026-11-24):** consentimiento = casilla obligatoria al subir la foto
(se guarda que se confirmó y cuándo, `photoConsent` + `photoConsentAt`; sin ella no se
guarda la ficha y, si no hay foto, la persona sale con su inicial); los dos módulos solo
en el plan extendido (por defecto; lo cambias en «Planes y módulos»); la sección pública
enseña foto, nombre, papel y bio, con interruptor «visible para invitados» por persona.

**Supuestos míos, para que los valides:**

1. **El teléfono de una persona no se publica nunca**: la proyección es lista blanca y lo
   descarta; el editor tampoco lo usa en la vista previa.
2. **Foto**: JPG, PNG o WebP hasta 10 MB, reducida al subirla. Cambiar la foto obliga a
   confirmar otra vez. Quitarla borra el fichero y el consentimiento. Sin `visibleToGuests`
   ni foto con consentimiento, la persona no se publica (o sale sin foto).
3. **Reglas**: `weddingParty` ya **no la leen los invitados** (todo va por la proyección);
   la regla de Firestore rechaza guardar `photoPath` sin `photoConsent == true`, y la de
   Storage deja leer `party/` en público (las fotos ya publicadas) y escribir solo a la
   pareja. **La batería de reglas está escrita (`tests/rules/personas-importantes.spec.ts`)
   pero no la he podido ejecutar aquí** (no se descarga el emulador): que la pase el CI.
4. **Proveedores**: importes en céntimos; pagos con fecha ISO y concepto (máx. 30); contratos
   solo PDF ≤ 20 MB y ≤ 10 por proveedor, en `vendors/{id}/`; «el más barato» solo se marca
   con ≥ 2 candidatos con precio y un único mínimo; los descartados no suman en los totales;
   «pendiente» nunca sale negativo.
5. **Sin hacer aún** (anotado en TAREAS): enlace tarea↔proveedor, partida↔proveedor,
   persona↔invitado.

### D-60 · Tanda 30: el editor respeta el plan, dos plantillas nuevas — **pendiente de validar**

1. **El plan manda sobre las secciones.** El alta siembra las 15 secciones en todas las
   bodas, así que una del plan básico veía en `/panel/web` quiz, galería, historia, etc.
   Ahora `MODULO_DE_SECCION` + `conModulosActivos` (copia literal cliente/servidor, con
   test que las compara) filtran en **tres sitios**: la lista del editor y su vista
   previa, la **proyección pública** (lo que el invitado ve) y las funciones `quiz`,
   `gallery` y `libro` (`exigirModulo`: un invitado no puede usarlas por URL si la boda
   no tiene el módulo). Los datos no se borran: si la boda sube de plan, la sección
   reaparece como estaba. _Supuesto mío:_ el texto libre, los eventos y el contacto salen
   siempre; el resto depende de que el módulo esté activo, que a su vez sale de la lista
   del plan en superadmin.
2. **Sevillana** (papel picado, arco de patio, cenefa de azulejos, letra de rotulador) y
   **Cottage** (papel con textura, polaroid con cinta, margaritas de papel, fecha en
   mayúsculas abiertas). Todo el ornamento es CSS/Unicode. _Supuesto mío:_ Cottage no copia
   la página de referencia (no pude abrirla); si la quieres más fiel, capturas.
3. Los consejos de superadmin pasan a ancho completo.
4. **El superadmin se perdía solo.** `provisionWedding` fijaba `{weddingId, role}` con
   `setCustomUserClaims` (que reemplaza todo) y borrar una boda ponía los claims a `null`
   o borraba la cuenta; además la guarda miraba `role === 'superadmin'`, un claim que no
   existe. Si el correo de una boda de pruebas era el tuyo, perdías el permiso cada vez.
   Ahora `dominio/claims.ts` lo conserva en las tres rutas (con tests).

### D-59 · Tanda 29: cambiar de plan, libro de firmas, álbumes de la galería — **pendiente de validar**

1. **Cambiar de plan (superadmin).** Botón «Cambiar de plan» en la ficha, aparte de
   «Editar datos» (de ahí se ha quitado el selector). El diálogo carga las listas de
   módulos de cada plan, enseña **qué gana y qué pierde** la boda, avisa si es una
   bajada (los módulos se desactivan y se ocultan, **los datos se conservan**), y deja
   fijar el **nuevo precio acordado**. **No registra ningún cobro**: lo cobrado lo
   apuntas tú en Finanzas, por bloques. El servidor ya aplicaba la diferencia de
   módulos (D-53); no cambia. _Supuesto mío:_ una bajada no pide escribir nada, solo
   un botón rojo «Sí, bajar de plan»; si quieres freno extra (escribir el slug), dímelo.
2. **Libro de firmas** (`guestbook`, §8.15). Sección nueva `libro` en la web (cartel en
   la portada + página `/libro`) y pantalla `/panel/guestbook`.
   - **Se publica al enviar y se modera a posteriori** (lo que elegiste): la pareja
     puede **ocultar** (reversible) o **borrar**.
   - Exige **identificarse siempre** (como la galería y el quiz), porque cada firma va a
     nombre del invitado, con su mote. _Supuesto mío:_ también con la web «abierta».
   - Límites míos: 800 caracteres por firma, 3 firmas por invitado, 500 en total.
   - **El muro es público** para los demás invitados identificados (**decidido por Gabriel,
     2026-11-24**), y cada firma sale con el **mote o, si no lo tiene, solo el nombre de
     pila**, sin apellidos, «para darle un poco de misterio». El panel de la pareja ve el
     mismo nombre. _Pendiente menor:_ la pareja no ve quién es en realidad cada firma.
   - **Exportar a PDF queda para una segunda pasada** (`F3.5b`).
   - Las bodas que ya existen **no tienen la sección**: pulsa «Añadir módulos nuevos»
     en superadmin.
3. **Galería: dos álbumes**, «El día» y «Nuestro camino». Mismas fotos, mismas
   subidas, mismo borrado; cada foto lleva su `album` (las anteriores cuentan como «El
   día»). En «Nuestro camino» los invitados suben fotos de los novios a lo largo de su
   historia. **«Nuestra historia» sigue siendo solo de la pareja**: mezclar fotos de
   invitados ahí rompería el texto que escribís. El panel también tiene las dos
   pestañas; «Vaciar la galería» vacía **ambas**.
   _Supuesto mío:_ el álbum se filtra en el servidor, sin índice nuevo.
