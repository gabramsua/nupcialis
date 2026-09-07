# SiQuiero — Puesta en marcha

Todo lo que hay que tener montado **antes** de escribir la primera línea de código
de F0. Ordenado por dependencias, con quién hace cada cosa.

Leyenda: **G** = Gabriel (requiere cuenta, tarjeta o decisión) · **C** = Claude
(puedo hacerlo yo con acceso al repositorio).

---

## Antes de nada: tres cosas que han cambiado

### 1. `siquiero.com` no está libre

Consultado el registro el 7 de septiembre de 2026:

| Dominio | Estado |
|---|---|
| `siquiero.com` | **Registrado desde 2001**, en Domain.com / Network Solutions, aparcado en ParkingCrew. Renovado hasta el 29/12/2026. Aparcado en ParkingCrew normalmente significa que está en venta. |
| `siquiero.app` | **Registrado el 17/02/2026**, en Cloudflare. Muy reciente. Puede ser un particular, puede ser alguien con la misma idea. |
| `siquiero.net` | **Libre** (el registro de Verisign no lo encuentra). |
| `siquiero.es` | No he podido comprobarlo con fiabilidad: el `.es` no expone RDAP público de forma consistente. Hay que mirarlo en un registrador. |

Esto no bloquea el desarrollo —el dominio solo hace falta para desplegar— pero sí
conviene decidirlo pronto, porque el nombre aparece en el producto, en el correo y
en la marca. Comprar un `.com` aparcado es una negociación: pueden ser 500 € o
pueden ser 15.000 €, y el precio no se sabe hasta preguntar.

Opciones razonables: negociar el `.com`, tirar de `.es` (que además es el mercado
natural), o cambiar el nombre. **Decisión D-15.**

### 2. Cloudflare Pages queda descartado

Cloudflare Pages **no soporta dominios wildcard** y la propia comunidad de
Cloudflare confirma en 2026 que no lo va a soportar, porque Pages está siendo
reemplazado por Workers con Static Assets. La alternativa sería desplegar un
Worker de "puerta de entrada" que intercepte `*.siquiero.com/*` y enrute — con el
efecto secundario de que ese Worker también captura subdominios que apuntan a
otro sitio, lo que hay que ir excluyendo a mano.

Es infraestructura extra que mantener para conseguir lo que Vercel hace de serie.

### 3. Vercel sí lo hace nativo, con dos condiciones

Vercel soporta `*.siquiero.com` de forma nativa y emite certificado por subdominio
sobre la marcha. Dos letras pequeñas:

- **Exige usar los nameservers de Vercel** (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), porque necesita resolver los retos DNS del certificado wildcard. Consecuencia práctica: **no compres el dominio en Cloudflare Registrar**, que obliga a mantener sus propios nameservers.
- **El plan Hobby es para proyectos personales.** Esto se vende, así que toca **Pro**, unos 20 $ por usuario y mes. Los equipos Pro de pago incluyen un dominio gratis el primer año en TLD elegibles, lo que puede cubrir la compra.

**Veredicto: Vercel.** Cloudflare seguiría siendo una opción si algún día el coste
importa mucho y se acepta mantener el Worker.

---

## Bloque 0 · Decisiones que bloquean

| ID | Decisión | Bloquea | Quién |
|---|---|---|---|
| D-15 | Dominio definitivo | Bloque 1 completo | G |
| D-12 | Familia de iconos base | F0.2, y F0.2 bloquea todo lo demás | G, con comparativa mía |
| D-16 | Dónde vive el panel de la pareja | F0.3, F0.4 | G, tras el spike S-1 |

### D-16 · Dónde vive el panel de la pareja

Los requisitos dicen hoy `<slug>.siquiero.com/panel`. Hay un riesgo que conviene
verificar antes de construirlo: Firebase Auth mantiene una lista de **dominios
autorizados** para las operaciones de OAuth, y no me consta que admita comodines.
Si no los admite, el acceso con Google se rompería en cada boda nueva, porque
habría que dar de alta su subdominio a mano — exactamente el trabajo manual que la
arquitectura elimina.

Los invitados no se ven afectados: entran con `signInWithCustomToken`, que no pasa
por OAuth.

**Alternativa segura:** el panel de la pareja vive en un host fijo,
`app.siquiero.com`, resolviendo la boda por el claim del token en lugar de por el
subdominio. Tiene tres ventajas independientes de este problema:

- Un solo origen de OAuth que autorizar, para siempre.
- Aísla las cookies del panel de las de los subdominios de las bodas. Vercel avisa de esto: sin una entrada en la Public Suffix List, `boda1.siquiero.com` puede escribir una cookie con `Domain=siquiero.com` que el navegador enviará a `boda2.siquiero.com` y al panel.
- El bundle del panel deja de estar servido desde el dominio que abren los invitados.

**Coste:** la pareja pierde el "mi boda es `mariaygabriel.siquiero.com` y ahí entro
yo". Se puede compensar con una redirección desde `<slug>.siquiero.com/panel`.

Lo resuelve el spike **S-1**.

---

## Bloque 1 · Cuentas, dominio y dinero — **G**

Depende de D-15.

- [ ] `B1.1` Decidir el dominio y comprarlo. **No en Cloudflare Registrar**, que obliga a sus nameservers y rompería el wildcard de Vercel. Registradores neutros: Porkbun, Namecheap, Dynadot. O directamente en Vercel, que además regala el primer año con Pro.
- [ ] `B1.2` Comprar defensivamente la variante obvia (`.es` si se va a `.com`, o al revés). Son 15 € al año contra el disgusto de que alguien la registre después.
- [ ] `B1.3` Crear cuenta de Vercel y contratar **Pro**.
- [ ] `B1.4` Apuntar el dominio a los nameservers de Vercel.
- [ ] `B1.5` Crear cuenta de Google Cloud con facturación activada. Firebase necesita **plan Blaze** para Cloud Functions; el nivel gratuito sigue aplicándose, pero hace falta tarjeta.
- [ ] `B1.6` Decidir el correo de la organización (`hola@`, `soporte@`) — hace falta para el registrador, para Firebase y para las notificaciones.

**Coste recurrente estimado:** Vercel Pro ~20 $/mes, dominio 10-40 €/año, Firebase
prácticamente 0 hasta que haya bodas reales (el gasto que escala son las fotos).
Fuera de esto, el `.com` aparcado si se decide negociarlo.

## Bloque 2 · Repositorio — **G** crea, **C** configura

- [ ] `B2.1` **G**: crear el repositorio en GitHub (privado) y pasarme la URL.
- [ ] `B2.2` **C**: añadir el remoto y subir el trabajo hecho.
- [ ] `B2.3` **G**: protección de rama en `main` — sin push directo, revisión antes de fusionar.
- [ ] `B2.4` **C**: plantilla de pull request con recordatorio de las siete reglas de oro.
- [ ] `B2.5` **C**: workflow de GitHub Actions con lint, build, tests unitarios y **tests de reglas** como bloqueantes.
- [ ] `B2.6` **G**: dar de alta los secretos de Actions (tokens de Firebase y Vercel).
- [ ] `B2.7` **C**: `.env.example` documentando cada variable, sin valores reales.

## Bloque 3 · Firebase — **G** ejecuta, **C** guía

Tres proyectos, no uno. Es la única forma de tocar sin miedo.

- [ ] `B3.1` Crear `siquiero-dev`, `siquiero-staging` y `siquiero-prod`.
- [ ] `B3.2` En los tres: Firestore en modo nativo, **región europea** (`eur3` o `europe-west1`). **Esto no se puede cambiar después:** la ubicación de Firestore se fija al crearla.
- [ ] `B3.3` Activar Storage en la misma región.
- [ ] `B3.4` Activar Authentication con email/contraseña y Google.
- [ ] `B3.5` Plan Blaze en `staging` y `prod`. `dev` puede quedarse en Spark si se trabaja con emuladores.
- [ ] `B3.6` App Check con reCAPTCHA Enterprise, en modo de solo monitorización al principio.
- [ ] `B3.7` Registrar la app web en cada proyecto y guardarme las claves de configuración.
- [ ] `B3.8` Presupuesto y alertas de facturación en Google Cloud. **No te saltes esto:** Blaze es pago por uso y una función mal escrita en bucle se nota en la factura.
- [ ] `B3.9` Exportación programada de Firestore a Cloud Storage en `prod`.

## Bloque 4 · Hosting y dominios — **G** con mi guion

- [ ] `B4.1` Crear el proyecto en Vercel conectado al repositorio.
- [ ] `B4.2` Añadir el dominio apex y el wildcard `*.siquiero.com`.
- [ ] `B4.3` Configurar `admin.` y, si se decide D-16, `app.`
- [ ] `B4.4` Entornos de preview y producción, con sus variables.
- [ ] `B4.5` Verificar que un subdominio inventado resuelve y sirve la aplicación con HTTPS.
- [ ] `B4.6` Reservar `www` y los subdominios de la lista de reservados para que nadie los pueda pedir como slug.

## Bloque 5 · Entorno local — **G**

- [ ] `B5.1` Node LTS (20 o 22).
- [ ] `B5.2` `npm i -g @angular/cli firebase-tools`.
- [ ] `B5.3` `firebase login` y comprobar acceso a los tres proyectos.
- [ ] `B5.4` `gh` autenticado, si quieres que yo pueda crear ramas y PRs.
- [ ] `B5.5` Java runtime, que lo necesitan los emuladores de Firestore.
- [ ] `B5.6` Verificar que `firebase emulators:start` levanta y responde.

## Bloque 6 · Spikes de verificación — **C**

Pruebas cortas para no construir sobre una suposición. Ninguna pasa de medio día.

- [ ] `S-1` **Dominios autorizados de Firebase Auth.** ¿Admiten comodín? ¿Hay límite de cuántos se pueden dar de alta? Decide D-16. **Es el spike más importante: condiciona dónde vive el panel.**
- [ ] `S-2` **Comparativa de familias de iconos.** Phosphor, Lucide y Tabler contra la lista real de conceptos de boda del set curado, con licencia y peso. Decide D-12.
- [ ] `S-3` **Editor de texto enriquecido.** Jodit con `ngx-jodit` frente a una alternativa ligera, midiendo peso en el bundle y saneado. Decide D-03.
- [ ] `S-4` **Wildcard en Vercel de punta a punta.** Desplegar una página mínima y comprobar que tres subdominios inventados resuelven con certificado válido, y cuánto tarda uno nuevo la primera vez.
- [ ] `S-5` **Coste de la galería.** Estimar almacenamiento y transferencia de una boda de 150 invitados subiendo fotos, para fijar las cuotas por plan.

---

## Orden recomendado

```
D-15 (dominio)  ─┬─> B1 (cuentas y compra) ──> B4 (hosting)
                 │
S-1 ──> D-16 ────┘

B2 (repositorio) ──> B5 (entorno local) ──> F0.1
        │
        └──> B3 (Firebase) ──> F0.1

S-2 ──> D-12 ──> F0.2 (sistema visual) ──> todo lo demás
```

**Camino crítico real:** D-12 → F0.2. El sistema visual bloquea todos los módulos,
y depende de una decisión de diez minutos. El dominio, en cambio, no bloquea nada
hasta que haya algo que desplegar.

**Se puede empezar F0.1 hoy mismo** con emuladores, sin dominio, sin Vercel y sin
proyectos de Firebase creados. Solo hace falta el repositorio.
