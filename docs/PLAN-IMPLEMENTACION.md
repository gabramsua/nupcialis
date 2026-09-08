# Nupcialis — Plan de implementación

Documento de ejecución. Qué se construye, en qué orden y cuándo se considera
terminado. El *qué* y el *por qué* están en `REQUISITOS.md`; aquí está el *cómo* y
el *cuándo*.

**Estado actual: F0 sin empezar.**

---

## Principios que ordenan el plan

1. **La seguridad va primero, no al final.** Las reglas de Firestore y su batería de tests se escriben en F0, antes que ningún módulo. Son lo que sustituye al aislamiento por bases de datos separadas: retrofitear aislamiento sobre un producto ya construido no funciona.
2. **El sistema visual es infraestructura.** Tokens de color, set de iconos y componentes base se construyen en F0. Si se dejan para cuando toque cada pantalla, cada módulo inventa los suyos.
3. **F1 tiene que ser vendible por sí sola.** Es el corte a partir del cual una boda real puede usar la herramienta de principio a fin. Todo lo posterior es ampliación.
4. **Cada fase termina con una boda de prueba funcionando**, no con una lista de ficheros escritos.
5. **Lo que existe se porta, no se rediseña.** El quiz, el login por nombre y cuatro dígitos y la partición de audiencia de la galería vienen del prototipo `wedding-quiz`.

---

## F0 — Fundaciones

Objetivo: dar de alta una boda desde el panel de superadmin y entrar a su panel
vacío, con el aislamiento demostrado por tests.

### F0.1 Proyecto y entornos
- Inicializar Angular con enrutado, SCSS y configuración estricta de TypeScript.
- Tres proyectos de Firebase: `dev`, `staging`, `prod`, en región europea.
- Configuración por entorno sin credenciales en el repositorio.
- Emuladores de Firestore, Auth, Functions y Storage funcionando en local.
- Prettier, ESLint y hooks de pre-commit.

### F0.2 Sistema visual
- Tokens de color: paleta semántica fija del panel y estructura de la paleta de marca por boda.
- Paleta categórica de 12-16 colores con contraste verificado sobre fondo claro y oscuro.
- Set curado de 80-100 iconos, agrupados por categoría, con componente `<sq-icon>` y buscador.
- Componentes base: botón, campo, tarjeta, chip de estado (color + icono + texto), tabla, modal, aviso, cargador vacío.
- Escala tipográfica y de espaciado.
- Página de catálogo del design system en `/dev/ds`, visible solo fuera de producción.

> Bloquea: todo lo demás. Nada de UI antes de esto.
> Requiere decidir la familia de iconos base (`PENDIENTES.md` D-12).

### F0.3 Multi-tenant
- Resolución de tenant por `hostname` con extracción y validación de slug.
- Índice `slugs/{slug}` y comprobación de reservados.
- Servicio de contexto de boda accesible en toda la aplicación.
- Fallback por ruta `nupcialis.com/<slug>` para desarrollo local y como plan B.
- Estados `draft`, `active` y `archived`, con su comportamiento en la web pública.

### F0.4 Autenticación
- Firebase Auth con email y contraseña, y Google.
- Custom claims `weddingId` y `role`, asignados por Cloud Function.
- Dos cuentas de owner por boda sobre `ownerUids`.
- Claim `superadmin` para la lista blanca.
- Guardas de ruta por rol y por tenant.
- App Check en cliente, Firestore, Storage y Functions.

### F0.5 Reglas de seguridad y su batería de tests
- `firestore.rules` completo, denegando por defecto, con `guests` y `photos` cerradas.
- `storage.rules` con límites de tamaño y tipo MIME.
- Tests con `@firebase/rules-unit-testing`:
  - El owner de la boda A no lee ni escribe nada de la boda B, colección por colección.
  - Un invitado no puede leer la lista de invitados.
  - Un anónimo solo lee `slugs` y `public/site`.
  - La pareja no puede escribir campos de sistema.
  - `giftsReceived` es inaccesible para cualquiera que no sea owner de esa boda.
- Integración en CI: si los tests de reglas fallan, no se despliega.

### F0.6 Provisioning
- `provisionWedding`: transacción de slug y documento, creación de cuentas, claims y semillas.
- Semillas: preguntas de fábrica del RSVP, banco de ejemplo del quiz, plantilla de checklist con fechas relativas, FAQ de fábrica, grupo por defecto de audiencia pública.
- `syncPublicProjection` y `recomputeCounters` como triggers.
- Log de auditoría.

### F0.7 Esqueletos de panel
- `panel-shell` con navegación por módulos, mostrando solo los activos.
- `admin-shell` de superadmin con listado de bodas, alta y registro de accesos de los novios.
- Resumen inicial del panel de la pareja, todavía sin datos reales.

**Terminado cuando:** se da de alta una boda desde superadmin, entran las dos cuentas
de la pareja, el subdominio resuelve, la batería de reglas pasa en verde y el
catálogo del design system está publicado.

---

## F1 — Núcleo vendible

Objetivo: una boda real puede usar la herramienta de principio a fin.

- **Invitados**: alta manual, importación CSV/Excel con mapeo y duplicados, grupos, filtros, búsqueda.
- **Grupos de invitados** con `photoAudience`, incluida la validación de un solo grupo restringido por invitado.
- **Acompañantes**: cupo por titular, alta por el invitado vía `addCompanion`, herencia de grupos, teléfono obligatorio en modos B y C.
- **Modos de acceso** A, B y C, con `guestLogin`, límite de intentos y respuestas genéricas.
- **Contadores de acceso**: `loginCount`, primera y última entrada, vista de quién no ha entrado nunca.
- **Formulario dinámico de RSVP**: motor de preguntas, ocho tipos de campo, visibilidad condicional, `mapsTo`, editor de preguntas en el panel, `submitRsvp` con validación en servidor.
- **Web pública**: dos plantillas, tokens de marca, secciones activables y reordenables, edición sobre vista previa en vivo, editor de texto enriquecido acotado, `sanitizeRichContent`.
- **Compartir por WhatsApp**: enlace por invitado y mensaje editable.
- **Exportación de invitados** a XLSX.
- i18n operativo con español completo.

**Terminado cuando:** una pareja de prueba carga 100 invitados, los invita por
WhatsApp, ellos entran, confirman con acompañantes y la pareja exporta la lista
para el catering.

---

## F2 — Banquete, ubicaciones y contenidos del día

- **Mesas**: redondas y rectangulares, mínimo y máximo, lienzo genérico, arrastrar y soltar, avisos sin bloqueo, coloreado por grupo, exportación a PDF y XLSX.
- **Mapa**: ubicaciones tipadas, selector de coordenadas con marcador arrastrable, mapa público con marcadores, ficha con "Cómo llegar", lista bajo el mapa.
- **Timeline**: eventos con icono, color, ubicación enlazada, visibilidad para invitados, aviso de solapes.
- **Preguntas frecuentes**: set de fábrica, categorías con icono y color, contacto de referencia, enlaces a otros módulos, buscador.
- **Alojamientos**: fichas con precio, distancia, código de descuento, plazas bloqueadas y fecha límite, enlazadas al mapa.
- **Dress code**: texto enriquecido, paleta de colores nombrados, moodboard.
- **Personas importantes**: roles precargados, fotos, vinculación con la lista de invitados, campo interno.

**Terminado cuando:** un invitado abre la web y resuelve solo, sin preguntar a nadie,
dónde es, cómo llega, dónde duerme, cómo va vestido y a qué hora es cada cosa.

---

## F3 — Participación de invitados

- **Galería**: subida desde móvil, `audienceGroupId` calculado en servidor, `listPhotos` con visibilidad por grupo, moderación opcional, miniaturas, cuotas, descarga en ZIP, denuncia.
- **Quiz**: banco de preguntas con su gestión, importación CSV, partida configurable, corrección en servidor, ranking con desempate por tiempo, partidas y mejor puntuación por invitado, vaciado del ranking, estadísticas.
- **Playlist**: sugerencias, votos, entrada automática desde el RSVP, duplicados, lista de veto, exportación para el DJ.
- **Libro de firmas**: mensajes atribuidos, moderación, exportación a PDF maquetado.
- **Regalos**: aportación con IBAN y Bizum, lista de productos con reserva.

**Terminado cuando:** el día de la boda de prueba, 50 personas suben fotos y juegan al
quiz desde el móvil sin que se caiga nada ni se filtre una foto del grupo restringido.

---

## F4 — Gestión interna de la pareja

- **Presupuesto**: partidas, categorías con color e icono, estimado frente a real, calendario de pagos, objetivo global, exportación.
- **Proveedores**: fichas, contratos en PDF, pagos y señales, comparativa por categoría, estados.
- **Checklist**: plantilla sembrada con fechas relativas, prioridades, responsable, vinculación a proveedor y a partida, semáforo por urgencia.
- **Regalos recibidos**: registro rápido, vinculación a invitados, totales por método, control de agradecimientos, cruce con asistencia, exportación.

**Terminado cuando:** la pareja de prueba lleva su presupuesto real en la herramienta
y cierra los agradecimientos desde el panel.

---

## F5 — Escala comercial

- Alta self-service con Stripe y webhook que invoca `provisionWedding`.
- Planes `basic` y `premium` con módulos por plan.
- WhatsApp Business API para invitaciones y recordatorios.
- Plano real de finca como extra.
- Landing comercial en `nupcialis.com`.

---

## Riesgos de ejecución

| Riesgo | Señal temprana | Respuesta |
|---|---|---|
| F0 se alarga y no se ve producto | Más de tres semanas sin una pantalla real | Recortar el design system al mínimo útil, no los tests de reglas |
| El alcance crece dentro de una fase | Aparecen tareas nuevas en `TAREAS.md` sin salir de F1 | Van a `PENDIENTES.md` y se planifican en la fase que toque |
| Las reglas se quedan sin tests | Un PR de modelo de datos sin fichero de test | Bloqueo en CI, no en revisión manual |
| El bundle público engorda | Más de 200 KB de JS comprimido | Presupuesto de tamaño en CI que falla el build |
