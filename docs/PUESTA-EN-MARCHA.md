# Nupcialis — Puesta en marcha

Todo lo que hay que tener montado **antes** de escribir la primera línea de código
de F0. Ordenado por dependencias, con quién hace cada cosa.

Leyenda: **G** = Gabriel (requiere cuenta, tarjeta o decisión) · **C** = Claude
(puedo hacerlo yo con acceso al repositorio).

---

## Antes de nada: tres cosas que condicionan todo

### 1. El nombre es Nupcialis — decidido el 08/09/2026

`nupcialis.com` está **libre**, verificado en el registro. Queda comprarlo (B1.1).

El nombre original, SiQuiero, se descartó porque `siquiero.com` lleva registrado
desde 2001 y está aparcado en ParkingCrew, o sea en venta a precio de negociación
desconocido, y `siquiero.app` lo registró alguien en febrero de 2026.

Riesgo asumido: "nupci**alis**" contiene "cialis". Se acepta conscientemente.

### 2. Cloudflare Pages queda descartado

Cloudflare Pages **no soporta dominios wildcard** y la propia comunidad de
Cloudflare confirma en 2026 que no lo va a soportar, porque Pages está siendo
reemplazado por Workers con Static Assets. La alternativa sería desplegar un
Worker de "puerta de entrada" que intercepte `*.nupcialis.com/*` y enrute — con el
efecto secundario de que ese Worker también captura subdominios que apuntan a
otro sitio, lo que hay que ir excluyendo a mano.

Es infraestructura extra que mantener para conseguir lo que Vercel hace de serie.

### 3. Vercel sí lo hace nativo, con dos condiciones

Vercel soporta `*.nupcialis.com` de forma nativa y emite certificado por subdominio
sobre la marcha. Dos letras pequeñas:

- **Exige usar los nameservers de Vercel** (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), porque necesita resolver los retos DNS del certificado wildcard. Consecuencia práctica: **no compres el dominio en Cloudflare Registrar**, que obliga a mantener sus propios nameservers.
- **El plan Hobby es para proyectos personales.** Esto se vende, así que toca **Pro**, unos 20 $ por usuario y mes. Los equipos Pro de pago incluyen un dominio gratis el primer año en TLD elegibles, lo que puede cubrir la compra.

**Veredicto: Vercel.** Cloudflare seguiría siendo una opción si algún día el coste
importa mucho y se acepta mantener el Worker.

---

## Bloque 0 · Decisiones que bloquean

| ID   | Decisión                         | Bloquea    | Quién                    |
| ---- | -------------------------------- | ---------- | ------------------------ |
| D-15 | Dominio definitivo               | Bloque 1   | ✅ `nupcialis.com`       |
| D-12 | Familia de iconos base           | F0.2       | ✅ Phosphor              |
| D-16 | Dónde vive el panel de la pareja | F0.3, F0.4 | ✅ Subdominio de la boda |
| D-03 | Editor de texto enriquecido      | F1         | ✅ Jodit con `ngx-jodit` |

**Ninguna decisión bloquea ya el arranque de F0.**

### D-16 · resuelto — el panel se queda en el subdominio de la boda

Firebase Auth **no admite comodines** en su lista de dominios autorizados, pero
**sí permite añadirlos por API** (Identity Toolkit Admin v2, con cuenta de
servicio). `provisionWedding` da de alta `<slug>.nupcialis.com` como un paso más
del alta, así que la intervención humana sigue siendo cero y la pareja conserva su
`mariaygabriel.nupcialis.com/panel`.

Dos cabos sueltos que van a `REQUISITOS.md` §11 como riesgos instrumentados: no hay
límite documentado de dominios autorizados, y sin entrada en la Public Suffix List
un subdominio de boda puede escribir cookies visibles en otro.

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

- [x] `B2.1` **G**: repositorio creado en `github.com/gabramsua/nupcialis`.
- [!] `B2.1b` **G**: **el repositorio es público.** Decidir si es lo que quieres: hoy cualquiera lee `REQUISITOS.md` entero, con el modelo de negocio, la estrategia de dominio, los planes de precio y el razonamiento de seguridad. No hay secretos commiteados —lo he comprobado—, así que no es una fuga, pero sí es tu plan de producto a la vista. Se cambia en Settings → General → Danger Zone.
- [x] `B2.2` **C**: remoto añadido. **G** hace los push.
- [ ] `B2.3` **G**: protección de rama en `main` — sin push directo, revisión antes de fusionar.
- [ ] `B2.4` **C**: plantilla de pull request con recordatorio de las siete reglas de oro.
- [x] `B2.5` **C**: workflow de GitHub Actions con lint, formato, tests unitarios, build y batería de reglas, en todas las ramas.
- [ ] `B2.6` **G**: dar de alta los secretos de Actions (tokens de Firebase y Vercel).
- [ ] `B2.7` **C**: `.env.example` documentando cada variable, sin valores reales.

## Bloque 3 · Firebase — **G** ejecuta, **C** guía

Tres proyectos, no uno. Es la única forma de tocar sin miedo.

- [ ] `B3.1` Crear `nupcialis-dev`, `nupcialis-staging` y `nupcialis-prod`.
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
- [ ] `B4.2` Añadir el dominio apex y el wildcard `*.nupcialis.com`.
- [ ] `B4.3` Configurar `admin.` y, si se decide D-16, `app.`
- [ ] `B4.4` Entornos de preview y producción, con sus variables.
- [ ] `B4.5` Verificar que un subdominio inventado resuelve y sirve la aplicación con HTTPS.
- [ ] `B4.6` Reservar `www` y los subdominios de la lista de reservados para que nadie los pueda pedir como slug.

## Bloque 5 · Entorno local — **G**

- [ ] `B5.1` **Node 22.22.3 o superior** (o 24.15+, o 26+). Angular 22 lo exige y
      con Node 20 el CLI ni arranca. En Windows: `winget install OpenJS.NodeJS.LTS`,
      o `fnm`/`nvm-windows` si quieres varias versiones a la vez.
- [ ] `B5.1b` **npm 11 o superior**, después de instalar Node: `npm i -g npm@11`.
      Node trae npm 10 de serie, y con npm 10 la instalación de este proyecto
      falla con un error críptico (`edgesOut`) al resolver un peer de Vitest.
      Hay que repetirlo cada vez que se cambia de versión de Node.
- [ ] `B5.2` `npm i -g @angular/cli firebase-tools`.
- [ ] `B5.3` `firebase login` y comprobar acceso a los tres proyectos.
- [ ] `B5.4` `gh` autenticado, si quieres que yo pueda crear ramas y PRs.
- [ ] `B5.5` Java runtime, que lo necesitan los emuladores de Firestore.
- [ ] `B5.6` Verificar que `firebase emulators:start` levanta y responde.

## Bloque 6 · Spikes de verificación — **C**

Pruebas cortas para no construir sobre una suposición. Ninguna pasa de medio día.

- [x] `S-1` **Dominios autorizados de Firebase Auth.** _Hecho 08/09/2026._ No admiten comodín, pero se añaden por API (Identity Toolkit Admin v2). `provisionWedding` lo hace como un paso más del alta y el panel se queda en el subdominio de la boda. No hay límite documentado: queda como riesgo instrumentado.
- [x] `S-2` **Comparativa de familias de iconos.** _Hecho 08/09/2026._ Phosphor 50/50 conceptos, Lucide 49/50 (sin WhatsApp), Tabler 49/50 (sin baile). Elegido **Phosphor**, MIT, seis pesos.
- [x] `S-3` **Editor de texto enriquecido.** _Cerrado por decisión 08/09/2026:_ Jodit con `ngx-jodit`. Queda medir su peso real al integrarlo y, si compromete el presupuesto de 200 KB, cargarlo solo en el panel.
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
