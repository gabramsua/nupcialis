# Lo que no puedo hacer yo

Escrito el 2026-11-13, al día el 2026-11-16. **Esta lista es lo que bloquea avanzar**, y está en un
fichero aparte porque hasta ahora vivía repartida por `TAREAS.md` y se perdía
entre lo hecho.

Tres clases de cosas: las que **solo se pueden hacer desde tu ordenador o con
tus credenciales**, las que **necesitan tus ojos** y las **decisiones** que no
me corresponden. Debajo de cada una está por qué no puedo yo, para que no haya
que preguntarlo.

---

## 1. Antes de arrancar (cinco minutos, y bloquea todo lo demás)

```bash
npm install                 # jodit, ngx-jodit, write-excel-file, read-excel-file
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

**Funciones nuevas acumuladas**, por orden de entrada:

| Función                     | Para qué                                                |
| --------------------------- | ------------------------------------------------------- |
| `getRsvpForm`, `submitRsvp` | El formulario de confirmación del invitado              |
| `guestLinkLogin`            | Entrar con el enlace de la pareja (D-34)                |
| `verifyGuest`               | Subir de «enlace» a «verificado» con los cuatro dígitos |
| `getInviteLink`             | El token del enlace de cada invitado                    |
| `listRsvpAnswers`           | Lo que han contestado, para la pareja                   |
| `listAccessLog`             | «Quién ha entrado»                                      |
| `setCompanionQuota`         | El cupo de acompañantes en lote                         |
| `reorderGroups`             | El orden de los grupos                                  |
| `startQuiz`, `submitQuiz`   | Jugar al quiz, con la corrección en servidor            |
| `listQuizRanking`           | El ranking que ve el invitado                           |
| `listQuizPlays`             | Quién ha jugado, con teléfono, para vuestro panel       |
| `clearQuizRanking`          | Vaciar el ranking antes del día de la boda              |

Y `listGuests` devuelve dos campos más (si lo apuntó un invitado y cuándo), y
`syncPublicProjection` ahora **sanea el HTML** del texto enriquecido. Hasta que
no se despliegue, el aviso de acompañantes nuevos no sale y el texto con formato
se publica sin sanear.

**Reglas e índices:** hay un índice nuevo (`guests` por `normalizedName` +
`phoneLast4`). Sin él, el modo B de acceso falla con un error de índice la
primera vez que alguien intenta entrar.

Y **las reglas han cambiado** para `faqs`, `timelineEvents` y `accommodations`:
el invitado ya no las lee directamente, porque lo publicable le llega por la
proyección pública. Hasta que se despliegue, un invitado identificado podría
leer una pregunta a medio escribir, la hora a la que llega el fotógrafo o un
hotel que todavía no habéis decidido, con una consulta directa.

**Tres triggers nuevos** de proyección, uno por lista: `syncPublicFaqs`,
`syncPublicTimeline` y `syncPublicAccommodations`. Los cuatro —con el de
siempre— llaman a la misma función (`reconstruirProyeccion`), que compara antes
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

**Dos páginas nuevas que te ahorran parte de esto**, las dos solo en desarrollo
y sin tocar Firebase: `localhost:4200/dev/previa` enseña las dos plantillas de
la web con una boda entera de muestra y con el caso de boda recién creada, y
`localhost:4200/dev/panel` monta las cuatro pantallas de contenido del panel con
datos de muestra que se pueden tocar. Abriéndolas a 360 px salieron seis fallos
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

| Decisión                                                 | Qué bloquea                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **D-04 · Librería de mapas** (Leaflet/MapLibre o Google) | El módulo de **mapa**, que está en el plan básico y hoy sale «En camino»      |
| **D-02 · Precio** de cada plan                           | La landing comercial y el alta con datos de cobro (`F0.7.7`)                  |
| **D-09 · Módulos con identidad en modo abierto**         | Galería, quiz y libro de firmas en una boda sin puerta (F3)                   |
| **D-11 · Repeticiones del quiz** y qué enseña el ranking | El quiz (F3)                                                                  |
| **D-01 · Ciclo de vida post-boda**: cuánto se conserva   | El archivado y la purga, y lo que hay que contar en la política de privacidad |

## 7. Infraestructura, cuando toque vender

- `F0.1.3` Los tres proyectos de Firebase (`dev`, `staging`, `prod`) en región europea.
- `F0.3.7` Hosting con wildcard `*.nupcialis.com`.
- `RE.7` **Proyecto de producción aparte, antes de la primera pareja que pague.**
  Hoy las bodas de prueba tienen invitados inventados con teléfonos y alergias;
  en cuanto haya una boda real al lado, eso es un asunto de datos personales.
- `RE.8` Servir `Cross-Origin-Opener-Policy: same-origin-allow-popups` en
  producción, o el acceso con Google se rompe en algunos navegadores.
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
sube una foto o firma en una boda en modo abierto, donde no hay sesión) y `D-04`
(la librería de mapas).

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
