# Nupcialis — Decisiones pendientes

Decisiones abiertas que Claude **no debe resolver por su cuenta**. Si una tarea
tropieza con una de estas, se para y se pregunta.

Estados: `abierta` · `en estudio` · `decidida` (con fecha y resultado).

| ID | Decisión | Bloquea | Estado |
|---|---|---|---|
| D-01 | Ciclo de vida post-boda: cuánto vive la web y los datos, renovación, purga | F5, RGPD | abierta |
| D-02 | Precio y planes: qué módulos son `basic` y cuáles `premium` | F5 | abierta |
| D-03 | Librería del editor de texto enriquecido | F1 | **decidida 2026-09-08: Jodit con `ngx-jodit`** |
| D-04 | Confirmar librería de mapas (Leaflet/MapLibre frente a Google Maps) | F2 | abierta |
| D-05 | Email transaccional: proveedor y si entra en el producto | F5 | abierta |
| D-06 | WhatsApp Business API | F5 | abierta |
| D-07 | Dominio propio de la pareja | — | abierta |
| D-08 | PWA e instalación en el móvil del invitado | — | abierta |
| D-09 | Comportamiento de los módulos con identidad en modo de acceso abierto | F3 | abierta |
| D-10 | Plano real de la finca | F5 | abierta |
| D-11 | Repeticiones del quiz: valor por defecto y qué muestra el ranking | F3 | abierta |
| D-12 | Familia de iconos base | **F0** | **decidida 2026-09-08: Phosphor** |
| D-13 | Reserva de regalos sin identidad en modo abierto | F3 | abierta |
| D-14 | Consentimiento para publicar fotos de terceros en Personas importantes | F2, RGPD | abierta |
| D-15 | Dominio definitivo: `nupcialis.com` está registrado y aparcado | **Bloque 1 de puesta en marcha** | abierta |
| D-16 | Dónde vive el panel de la pareja | F0.3, F0.4 | **decidida 2026-09-08: subdominio de la boda** |
| D-17 | Acceso a Firebase desde el cliente: AngularFire o SDK directo | F0.1 | **decidida 2026-09-08: SDK modular directo** |

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
*referrer*; con subdominios wildcard esa restricción sería `*.nupcialis.com/*`,
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

| | Phosphor | Lucide | Tabler |
|---|---|---|---|
| Cobertura de los 50 conceptos | **50/50** | 49/50 | 49/50 |
| Le falta | — | WhatsApp | un icono de baile |
| Iconos por peso | 1.512 | 2.074 | 5.130 |
| Pesos disponibles | **6** (thin, light, regular, bold, fill, duotone) | 1 | 2 |
| Licencia | MIT | ISC | MIT |

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

Verificado libre en el registro el 07/09/2026. Queda pendiente comprarlo (bloque
B1.1) y registrar defensivamente `nupcialis.es`.

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
