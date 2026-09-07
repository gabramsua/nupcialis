# SiQuiero — Decisiones pendientes

Decisiones abiertas que Claude **no debe resolver por su cuenta**. Si una tarea
tropieza con una de estas, se para y se pregunta.

Estados: `abierta` · `en estudio` · `decidida` (con fecha y resultado).

| ID | Decisión | Bloquea | Estado |
|---|---|---|---|
| D-01 | Ciclo de vida post-boda: cuánto vive la web y los datos, renovación, purga | F5, RGPD | abierta |
| D-02 | Precio y planes: qué módulos son `basic` y cuáles `premium` | F5 | abierta |
| D-03 | Librería del editor de texto enriquecido | F1 | abierta |
| D-04 | Confirmar librería de mapas (Leaflet/MapLibre frente a Google Maps) | F2 | abierta |
| D-05 | Email transaccional: proveedor y si entra en el producto | F5 | abierta |
| D-06 | WhatsApp Business API | F5 | abierta |
| D-07 | Dominio propio de la pareja | — | abierta |
| D-08 | PWA e instalación en el móvil del invitado | — | abierta |
| D-09 | Comportamiento de los módulos con identidad en modo de acceso abierto | F3 | abierta |
| D-10 | Plano real de la finca | F5 | abierta |
| D-11 | Repeticiones del quiz: valor por defecto y qué muestra el ranking | F3 | abierta |
| D-12 | Familia de iconos base | **F0** | abierta |
| D-13 | Reserva de regalos sin identidad en modo abierto | F3 | abierta |
| D-14 | Consentimiento para publicar fotos de terceros en Personas importantes | F2, RGPD | abierta |
| D-15 | Dominio definitivo: `siquiero.com` está registrado y aparcado | **Bloque 1 de puesta en marcha** | abierta |
| D-16 | Dónde vive el panel de la pareja: subdominio de la boda o host fijo | **F0.3, F0.4** | abierta |

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

### D-03 · Editor de texto enriquecido
Jodit es MIT y sirve, pero su wrapper oficial de Angular está declarado sin
mantenimiento activo por su propio autor; el mantenido por la comunidad es
`ngx-jodit`. La versión 4.7.6 que se manejaba va varias menores por detrás de la
actual. Para una barra tan acotada como la que necesitamos puede pesar de más.
**Acción:** prueba comparativa rápida contra una alternativa ligera antes de F1.

### D-04 · Librería de mapas
Recomendación: Leaflet o MapLibre sobre OpenStreetMap, sin clave ni facturación,
con enlaces profundos a Google Maps para navegar. La alternativa, Maps JavaScript
API, exige clave con facturación, se paga por carga y obliga a restringir por
*referrer*; con subdominios wildcard esa restricción sería `*.siquiero.com/*`,
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

### D-12 · Familia de iconos base — **bloquea F0**
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

### D-15 · Dominio definitivo — **bloquea la compra**
`siquiero.com` está registrado desde 2001 y aparcado en ParkingCrew, lo que
normalmente significa que está en venta a precio de negociación. `siquiero.app`
lo registró alguien en febrero de 2026. `siquiero.net` está libre. El `.es` hay
que comprobarlo en un registrador.
**Opciones:** negociar el `.com`, ir a `.es` (que además es el mercado natural del
producto), o cambiar de nombre. No bloquea el desarrollo, solo el despliegue.
Ver `PUESTA-EN-MARCHA.md`.

### D-16 · Dónde vive el panel de la pareja — **bloquea F0.3 y F0.4**
Los requisitos dicen `<slug>.siquiero.com/panel`. Firebase Auth mantiene una lista
de dominios autorizados para OAuth y no consta que admita comodines; si no los
admite, el acceso con Google se rompe en cada boda nueva. Los invitados no se ven
afectados porque entran con `signInWithCustomToken`.
**Alternativa segura:** panel en un host fijo `app.siquiero.com`, resolviendo la
boda por el claim del token. Ventajas adicionales: un solo origen OAuth, cookies
del panel aisladas de los subdominios de las bodas (ver el aviso de Vercel sobre
la Public Suffix List) y el bundle del panel fuera del dominio de los invitados.
**Coste:** la pareja pierde entrar por su propio subdominio; se compensa con una
redirección. Lo decide el spike S-1.
