# Nupcialis — Guía del proyecto

SaaS multi-tenant de organización de bodas. Cada pareja tiene su web pública en
`<slug>.nupcialis.com` y un panel privado donde activa y configura sus módulos.

## Antes de tocar código

Lee siempre, en este orden:

| Documento                     | Para qué                                                             |
| ----------------------------- | -------------------------------------------------------------------- |
| `docs/REQUISITOS.md`          | La verdad del producto. Modelo de datos, módulos, reglas de negocio. |
| `docs/PLAN-IMPLEMENTACION.md` | En qué fase estamos y qué entra en ella.                             |
| `docs/TAREAS.md`              | Qué hay que hacer ahora. Se actualiza en cada sesión.                |
| `docs/PENDIENTES.md`          | Decisiones abiertas. **No las resuelvas por tu cuenta: pregunta.**   |

Si algo que vas a implementar contradice `docs/REQUISITOS.md`, para y dilo. No
improvises una tercera versión.

## Stack

- **Angular 22**, **zoneless**, componentes standalone, signals, `ChangeDetectionStrategy.OnPush`.
- **Firebase**: Firestore (una sola base multi-tenant), Auth, Storage, Cloud Functions v2, App Check.
- **SDK modular de Firebase v12 directamente**, sin AngularFire: no existe versión compatible con Angular 22. Los servicios de `core/firebase` envuelven el SDK y son el único sitio donde se importa `firebase/*`.
- **Hosting del frontal**: plataforma con dominio wildcard `*.nupcialis.com` (Cloudflare Pages o Vercel). **No Firebase Hosting**: limita a 20 subdominios por dominio apex.
- **Mapas**: Leaflet o MapLibre sobre OpenStreetMap. Enlaces profundos a Google Maps para navegar. Sin clave de Google.
- **Iconos**: Phosphor (MIT). Solo el set curado, compilado en sprite propio. `regular` = inactivo, `fill` = activo.
- **Editor de texto enriquecido**: Jodit con `ngx-jodit`, barra acotada y saneado en servidor.
- **i18n**: toda cadena visible en ficheros de traducción desde el primer commit. Español por defecto.
- **Tests**: **Vitest** para unidad, `@firebase/rules-unit-testing` contra el emulador para las reglas.

## Las ocho reglas de oro

Estas no se negocian. Si una tarea parece pedir saltárselas, es que la tarea está mal planteada.

1. **El `weddingId` sale siempre del custom claim del token**, nunca de un campo que mande el cliente ni de la URL.
2. **`guests` y `photos` están cerradas a lectura directa** en las reglas de Firestore. Todo pasa por Cloud Function. Si el cliente pudiera consultarlas, cualquiera se descarga la lista de invitados con sus teléfonos, o las fotos del grupo restringido.
3. **El login de invitado (nombre + 4 dígitos, o teléfono) se resuelve en `guestLogin`**, con App Check, límite de intentos y respuestas genéricas que no distinguen "no existe" de "no coincide".
4. **El quiz se corrige en servidor.** El cliente manda las respuestas elegidas; la función puntúa. Nunca aceptes una puntuación que venga del navegador.
5. **Todo HTML del editor de contenidos se sanea en servidor** antes de publicarse. Lo van a ver cientos de invitados.
6. **La pareja no escribe campos de sistema**: `counters`, `plan`, `status`, `ownerUids`, `slug`, `loginCount`, `quizPlayCount`. Esos los mueve el servidor.
7. **`giftsReceived` no sale nunca de la sesión de la pareja.** Ni proyección pública, ni exportaciones compartidas, ni logs.
8. **Al dar de alta una boda hay que autorizar su subdominio en Firebase Auth.** No admite comodines: si `provisionWedding` no llama al Identity Toolkit Admin API, el acceso con Google se rompe en esa boda y solo se descubre cuando la pareja intenta entrar.

Toda regla de seguridad nueva llega acompañada de su test de aislamiento. Sin test, no se mergea.

## Estructura

```
src/app/
  core/            servicios transversales: tenant, auth, sesión, App Check
  shared/          componentes, pipes y directivas reutilizables
  design-system/   tokens de color, set de iconos, componentes base
  layouts/         public-shell, panel-shell, admin-shell
  features/
    public-site/   web pública de la boda
    panel/         panel de la pareja, un directorio por módulo
    superadmin/    panel de superadmin
functions/src/     Cloud Functions, un fichero por función + core compartido
docs/              requisitos, plan, tareas, pendientes
```

Cada módulo del panel se carga con `loadComponent` diferido. **El bundle de la web
pública no puede arrastrar código del panel**: el invitado abre el enlace desde
WhatsApp con datos móviles.

**Los servicios de Firebase se proveen por ruta, dentro de ficheros de rutas
diferidos** (`features/*/`*.routes.ts`), nunca en `app.config.ts`ni en`app.routes.ts`. Proveerlos arriba metía 122 kB comprimidos de SDK en el
arranque. Medido: 189,7 kB con todo arriba frente a 76,3 kB con el reparto por
rutas. Si añades un servicio de Firebase, va en su propio fichero de
`core/firebase` y se provee en la ruta que lo usa.

## Convenciones Angular

- Componentes standalone. No pongas `standalone: true`: es el valor por defecto.
- `input()` y `output()`, no los decoradores.
- `inject()`, no inyección por constructor.
- `computed()` para estado derivado. `set`/`update` en signals, nunca `mutate`.
- Control de flujo nativo: `@if`, `@for`, `@switch`. No `*ngIf` ni `*ngFor`.
- Enlaces de `class` y `style`, no `ngClass` ni `ngStyle`.
- Host bindings en el objeto `host` del decorador, no `@HostBinding`/`@HostListener`.
- Formularios reactivos.
- `NgOptimizedImage` para imágenes estáticas.
- TypeScript estricto. Nada de `any`; usa `unknown` cuando no sepas el tipo.
- Servicios con una sola responsabilidad y `providedIn: 'root'`.

## Sistema visual

Ver `docs/REQUISITOS.md` §9.1. Lo mínimo que hay que respetar:

- **Dos paletas separadas.** La de marca de la pareja manda en la web pública. La semántica del panel es fija e igual en todas las bodas.
- **El color nunca viaja solo.** Todo estado se comunica con color + icono + texto. Un punto verde sin etiqueta no es información.
- **Nada de hexadecimales sueltos en los componentes.** Todo sale de los tokens del design system.
- Iconos, solo del set curado. Si falta uno, se añade al set; no se importa suelto de otra librería.
- El panel se diseña primero para móvil.

## Requisitos de entorno

**Node ≥ 22.22.3 y npm ≥ 11.** Con npm 10 la instalación falla con un error
críptico (`Cannot read properties of null (reading 'edgesOut')`) al resolver un
peer opcional de Vitest. Si te pasa: `npm install -g npm@11`.

`firebase-tools` se instala **global**, no como dependencia del proyecto: arrastra
módulos nativos enormes y multiplica el tiempo de instalación de todo el equipo.

## Comandos

```bash
npm start                      # ng serve
npm run build
npm test                       # unidad (Vitest)
npm run test:rules             # batería de aislamiento contra el emulador
npm run typecheck:rules        # solo tipos, sin emulador
firebase emulators:start       # Firestore, Auth, Functions, Storage
npm run deploy:rules
npm run deploy:functions
```

Trabaja siempre contra los emuladores. **Nunca ejecutes scripts ni pruebas contra el
proyecto de producción.**

## Git

- Yo (Claude) me encargo de los commits; Gabriel hace los push.
- Rama por trabajo: `feat/...`, `fix/...`, `docs/...`. No commitees directamente en `main`.
- Mensajes en español, imperativo y concretos: `feat(galeria): audiencias por grupo en listPhotos`.
- Un commit por unidad de trabajo coherente. Nada de commits de 40 ficheros con mensaje "cambios".
- **Nunca commitees secretos**: claves de servicio, `environment*.ts` con credenciales, CSV con datos de invitados.

## Al terminar cada sesión de trabajo

1. Marca en `docs/TAREAS.md` lo completado y añade lo que haya surgido.
2. Si has tomado una decisión que no estaba en los requisitos, anótala en `docs/PENDIENTES.md` para que Gabriel la valide.
3. Si el cambio altera el modelo de datos o una regla de negocio, actualiza `docs/REQUISITOS.md` en el mismo commit.

## Qué no hacer

- No crear una base de datos por boda. Ya se descartó y está razonado en `docs/REQUISITOS.md` §2.2.
- No usar Firebase Hosting para los subdominios.
- No meter dependencias pesadas sin justificarlo: hay un presupuesto de 200 KB de JS comprimido en la web pública.
- No construir un maquetador libre tipo WordPress. El modelo es edición sobre vista previa con secciones prediseñadas.
- No inventar colores ni iconos fuera del design system.
- No resolver por tu cuenta nada que esté en `docs/PENDIENTES.md`.
