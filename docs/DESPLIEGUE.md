# Despliegue a producción: Vercel + Firebase

La guía para sacar Nupcialis a internet de una vez. Está pensada para seguirla de
arriba abajo, con casillas. **G** = lo haces tú (cuentas, tarjetas, consolas). **C** = lo
hago yo (código, parches). Todo lo que hay que hacer en el repositorio ya está hecho: lo que
queda son cuentas y clics.

**Tiempo real de trabajo: media jornada.** Lo único largo es la espera del DNS (de minutos a
48 h), así que **se empieza por ahí** y mientras tanto se monta Firebase.

```
Paso 0  Subir el código a main ─┐
Paso 1  Vercel (cuenta, proyecto)├─> Paso 2  DNS y wildcard  ── (espera) ──┐
                                 │                                          ├─> Paso 8  Prueba de humo
Paso 3  Firebase de producción ──┴─> Paso 4  Pasarme 4 datos ─> Paso 5  Desplegar ─> Paso 6  Superadmin
                                                                         └─> Paso 7  Correo
```

## Lo que asumo (pendiente de validar, D-71)

1. **Dos proyectos de Firebase**: el actual (`nupcialis-2220d`) queda como **desarrollo** y se
   crea uno **nuevo y limpio para producción**. El actual tiene bodas y datos de prueba: no se
   convierte en producción.
2. **Firestore y Storage en `europe-west1` (Bélgica)**: es la región de las funciones
   (`functions/src/firebase.ts`) y los datos de invitados no salen de la UE.
3. **Vercel Pro** (20 $/mes, un puesto). El plan gratuito (Hobby) no es para un producto de pago.
4. **Producción = rama `main`**. Las demás ramas no se construyen en Vercel (la aplicación
   resuelve la boda por el nombre del host, así que una URL `*.vercel.app` no serviría para
   probar nada).
5. **Node 22.x fijado** en `package.json`, igual que el CI.

---

## Paso 0 · Subir todo a `main` — G (5 min)

Tienes los parches 0006 a 0009 aplicados **sin commitear** en tu carpeta, más los cambios de
esta tanda. En `C:\Users\gabra\Desktop\APPS\nupcialis`:

```powershell
git status                      # mira que son los cambios que esperas
git add -A
git commit -m "feat: home con capturas, escaparate y despliegue (D-69, D-70, D-71)"
git push origin dev
```

Luego lleva `dev` a `main` por **pull request** en GitHub (así corre el CI primero) y fusiónala.
**Espera a que el CI esté en verde antes de fusionar.** Si todavía no hay protección de rama
(`B2.3`), también vale `git checkout main && git merge dev && git push`.

---

## Paso 1 · Vercel — G (15 min)

- [ ] Entra en <https://vercel.com/signup> **con tu cuenta de GitHub** (`gabramsua`).
- [ ] **Settings → Billing → Upgrade a Pro.** Pon un nombre al equipo («Nupcialis») y la
      tarjeta. Ojo: usa tu correo de siempre, porque el de la factura sale de aquí.
- [ ] **Add New → Project → Import Git Repository → `gabramsua/nupcialis`.** Si GitHub pide
      permisos, dáselos solo a ese repositorio.
- [ ] En la pantalla de configuración **no cambies nada**: el `vercel.json` del repositorio ya fija
      la instalación, la construcción (`npm run build`) y la carpeta de salida
      (`dist/nupcialis/browser`). **Framework Preset: Other.** **Variables de entorno: ninguna**
      (la configuración web de Firebase va en el código y no es un secreto).
- [ ] **Deploy.** Tarda 2-4 minutos. En el registro de construcción comprueba que pone
      `Node.js Version` **22.x** y que acaba en `Build Completed`.
- [ ] **Settings → Git → Production Branch = `main`.**
- [ ] **Settings → Deployment Protection**: deja la protección **Standard** (no protege el
      dominio de producción, solo las previews).

> Esa primera construcción ya funciona, pero la web de `*.vercel.app` te dirá «no encontrada»:
> es lo esperado, la aplicación solo reconoce `nupcialis.com` y sus subdominios.

---

## Paso 2 · Dominio y wildcard — G (30 min + espera)

Tu `nupcialis.com` está en Hostalia. Hay **dos formas** de hacer que Vercel sirva el wildcard
`*.nupcialis.com`. **Antes de elegir, mira tu zona DNS en Hostalia** y apunta todos los
registros que haya, sobre todo **MX** (correo) y **TXT** (SPF, DKIM): si tienes el buzón
`hola@nupcialis.com` en Hostalia, un cambio de nameservers que los pierda **te deja sin correo**.

### Opción A — Nameservers de Vercel (la oficial, un poco más de riesgo)

- [ ] En Vercel, proyecto → **Settings → Domains → Add**: `nupcialis.com` y `*.nupcialis.com`.
      Para `www.nupcialis.com` añade también una entrada que **redirija al dominio raíz**.
- [ ] Vercel te enseña los nameservers (`ns1.vercel-dns.com` y `ns2.vercel-dns.com`).
- [ ] **Antes de cambiarlos**: en la página de **Domains del equipo → nupcialis.com → DNS Records**
      comprueba que Vercel ha copiado los registros de Hostalia, y crea a mano los que falten
      (MX, TXT…).
- [ ] En Hostalia (panel del dominio → **Servidores DNS**): cambia a `ns1.vercel-dns.com` y
      `ns2.vercel-dns.com`.

### Opción B — Sin tocar los nameservers (menos invasiva, si Hostalia lo permite)

Vercel permite delegar **solo el reto del certificado** y dejar el resto del DNS donde está
([documentación](https://vercel.com/docs/domains/working-with-domains/add-a-domain)). Tu correo no
se toca y no hay una propagación completa que esperar.

- [ ] Vercel → proyecto → **Settings → Domains → Add**: `*.nupcialis.com` (y `nupcialis.com`).
- [ ] Vercel → **Domains del equipo → nupcialis.com → DNS Records → Enable Vercel DNS**. **No cambies
      los nameservers en Hostalia.**
- [ ] En el DNS de Hostalia añade:
  - Dos registros **NS** con nombre `_acme-challenge` y valores `ns1.vercel-dns.com.` y
    `ns2.vercel-dns.com.`
  - Un **CNAME** con nombre `*` y valor `cname.vercel-dns-0.com.`
  - Para el dominio raíz y `www` (el wildcard **no** los cubre): usa **los valores exactos que
    muestre Vercel** en Settings → Domains (normalmente un registro A para el raíz y un CNAME
    para `www`).
- [ ] Si el panel de Hostalia **no deja crear NS de un subdominio o un CNAME comodín**, esta
      opción no vale: pasa a la A.

> Los registros que ya tengas con nombre propio (`mail`, `ftp`…) siguen mandando sobre el CNAME
> comodín. Y mantén el `_acme-challenge` mientras uses el wildcard: es lo que renueva el certificado.

### Comprobar que ha cogido (cualquiera de las dos)

- [ ] En Vercel → Settings → Domains los tres dominios dicen **Valid Configuration**.
- [ ] `https://nupcialis.com` enseña **la HOME** y el candado es válido.
- [ ] `https://cualquiercosa.nupcialis.com` carga la aplicación con **HTTPS válido** y dice que la
      boda no existe. Es la prueba `S-4`: si sale un error de certificado, el wildcard todavía no
      está.
- [ ] Windows: `nslookup -type=NS _acme-challenge.nupcialis.com` (opción B) o
      `nslookup nupcialis.com` si quieres ver a dónde apunta.

Mientras esto propaga, **sigue con el Paso 3**.

---

## Paso 3 · Firebase de producción — G (40 min)

> **Cambio de plan (D-72, 2026-11-27):** la cuota de proyectos de Google Cloud impidió crear
> `nupcialis-prod`, así que producción usa **el mismo proyecto que desarrollo, `nupcialis-2220d`**.
> Ya está escrito en `environment.prod.ts` y en el alias `prod` de `.firebaserc`. De este paso solo
> quedan las comprobaciones de región, plan Blaze, dominios autorizados y la clave de reCAPTCHA; lo
> de crear proyecto, registrar la app web y copiar la configuración **ya no hace falta**.

Todo en <https://console.firebase.google.com>. **Con la misma cuenta de Google que será la
propietaria**, y con la cuenta de facturación propia de Nupcialis (`B1.5a`).

- [ ] **Add project.** Nombre «Nupcialis». ID: prueba `nupcialis-prod`; si está cogido, el que te
      proponga la consola. **Desactiva Google Analytics** (no lo usamos, y medir a invitados que no
      han aceptado nada es un problema de privacidad).
- [ ] **Plan Blaze** (Upgrade, abajo a la izquierda). Sin él no se despliegan funciones. Aprovecha
      para crear la **alerta de presupuesto** (Paso 9).
- [ ] **Build → Firestore Database → Create database.** Modo **producción**, ubicación
      **`europe-west1`**. **No se puede cambiar después.**
- [ ] **Build → Storage → Get started.** Modo producción, **misma ubicación** (`europe-west1`).
- [ ] **Build → Authentication → Get started → Sign-in method**: activa **Correo/contraseña** y
      **Google** (con tu correo de asistencia).
- [ ] **Authentication → Settings → Authorized domains → Add domain**: `nupcialis.com` y
      `www.nupcialis.com`. (Los de cada boda los añade el servidor solo, regla 8.)
- [ ] **Project settings (la rueda) → General → Your apps → Web (`</>`)**: registra la app como
      «Nupcialis web». **No marques «Firebase Hosting».** Copia el bloque `firebaseConfig`.
- [ ] **App Check → Apps → tu app web → reCAPTCHA Enterprise.** Si no hay clave, el enlace te lleva a
      Google Cloud → reCAPTCHA → **Crear clave**: tipo **sitio web**, **basada en puntuación** (no
      casilla), dominio **`nupcialis.com`** (cubre sus subdominios; **no** añadas `localhost`).
      Copia la **clave de sitio**.
      **No actives todavía el modo exigente en la consola** (Paso 9). Las funciones ya exigen App
      Check por código, así que **la clave tiene que estar bien desde el primer día**.

---

## Paso 4 · Pásame cuatro datos — G → C (2 min)

Pégame aquí (**no son secretos**, viajan en la web de cualquier visitante):

```
ID del proyecto:      nupcialis-prod (o el que sea)
firebaseConfig:       { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId }
Clave de sitio App Check (reCAPTCHA Enterprise):  6L...
```

Yo relleno `src/environments/environment.prod.ts` y añado el alias `prod` a `.firebaserc`, y te
devuelvo un parche. Si prefieres hacerlo a mano:

- `src/environments/environment.prod.ts`: sustituye cada `PENDIENTE` por el valor de
  `firebaseConfig` y pon `appCheckSiteKey: '6L...'`. Deja `rootDomain: 'nupcialis.com'`.
- `.firebaserc`: añade `"prod": "tu-id-de-proyecto"` dentro de `projects`.

Luego commit, push y fusión a `main`: Vercel **reconstruye solo** y en 3 minutos tienes la
aplicación con la configuración buena.

---

## Paso 5 · Reglas, índices y funciones — G (20 min)

Una vez, en tu carpeta:

```powershell
npm i -g firebase-tools        # si no lo tienes
firebase login                 # con la cuenta propietaria
npm run functions:install
npm run deploy:prod            # reglas + índices + Storage + Cloud Functions, a producción
```

- La primera vez **pregunta si activa varias APIs** (Cloud Build, Artifact Registry, Cloud Run,
  Eventarc…): di que **sí**. Y si pregunta cuántos días guardar imágenes de contenedor, responde
  **1** o **7**.
- **Tarda 5-10 minutos.** Si acaba con un error de permisos de **Eventarc**, es la primera vez que
  se propagan: **espera cinco minutos y repite el mismo comando.**
- Comprueba en la consola → **Functions** que salen todas, en `europe-west1`, y en **Firestore →
  Índices** que no hay ninguno en error.

Si solo quieres las reglas: `npm run deploy:rules -- --project prod`.

---

## Paso 6 · Hacerte superadmin — G (10 min)

- [ ] Entra en **`https://nupcialis.com/superadmin/acceso`** y pulsa **Entrar con Google**. Eso crea
      tu cuenta en producción (aún sin permisos).
- [ ] Consola de Firebase → **Project settings → Service accounts → Generate new private key.**
      **Guarda el fichero FUERA del repositorio** (el repositorio es público y esa clave abre el
      proyecto entero).
- [ ] En PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\fuera\del\repo\clave.json"
node functions/tools/dar-superadmin.mjs tu-correo@gmail.com
```

- [ ] **Borra el fichero** y, en la consola, revoca esa clave (Service accounts → Manage → Keys).
- [ ] Cierra sesión y vuelve a entrar para que se refresque el permiso. Deberías ver el panel de
      superadmin.

---

## Paso 7 · Correo (Trigger Email + SMTP) — G (30 min)

Sin esto **no sale ningún correo** (acceso de la pareja, avisos de solicitudes). El alta de una
boda funciona igual y el enlace sale en pantalla, así que **no bloquea el lanzamiento, pero sí
el primer cliente**.

- [ ] Elige un SMTP. Lo más rápido: **Brevo** (300 correos al día gratis) o **Resend**
      (3 000 al mes). Crea la cuenta, **verifica el dominio `nupcialis.com`** y añade en tu DNS los
      registros SPF/DKIM que te dé (en Vercel DNS si usas la opción A, en Hostalia si la B). Sin
      eso, Gmail manda tus correos a spam. Comprueba en su panel el servidor, el puerto y el
      usuario.
- [ ] Consola de Firebase → **Extensions → «Trigger Email from Firestore» → Instalar.**
  - Ubicación: `europe-west1`
  - Colección de correos: **`mail`**
  - URI de conexión SMTP: `smtps://USUARIO:CLAVE@servidor:465` (o `smtp://…:587`)
  - Remitente por defecto: `Nupcialis <hola@nupcialis.com>`
  - Colección de plantillas y de usuarios: vacías.
- [ ] **Superadmin → Correos**: revisa los textos y manda uno de prueba a tu correo.
- [ ] **Superadmin → Solicitudes**: elige a qué correo avisar cuando alguien rellene el formulario de
      la HOME.

---

## Paso 8 · Prueba de humo — G + C (30 min)

Con un móvil (o el navegador a 360 px de ancho):

- [ ] `https://nupcialis.com` enseña la HOME, con las imágenes y el selector de plantillas.
- [ ] El **formulario de contacto** llega a Superadmin → Solicitudes (y por correo, si hiciste el Paso 7).
- [ ] **Alta de una boda de prueba** desde Superadmin (slug `prueba1`). La respuesta no debe traer
      avisos en rojo. En la consola → Authentication → Authorized domains **tiene que aparecer
      `prueba1.nupcialis.com`**: es la regla 8, la que más veces se rompe en silencio.
- [ ] `https://prueba1.nupcialis.com` carga la web de la boda con **HTTPS válido**.
- [ ] Entra al **panel** de esa boda (`/panel/acceso`) con la contraseña y también con Google.
- [ ] Añade un invitado, publica la web, entra como invitado (nombre + 4 dígitos), **confirma
      asistencia** y, si el plan es el extendido, **sube una foto**.
- [ ] Consola del navegador **sin errores 401** (App Check) ni de CORS.
- [ ] Da de alta **una segunda boda** y comprueba que **no ve nada de la primera** (aislamiento:
      `B-A7`).
- [ ] **Borra las bodas de prueba** al acabar: cada alta consume un dominio autorizado y el límite
      de Firebase no está documentado.

---

## Paso 9 · Endurecer, en los dos días siguientes — G

- [ ] **Alerta de presupuesto**: Google Cloud → Billing → Budgets & alerts → crear presupuesto
      (por ejemplo 10 € y 30 €, con avisos al 50 %, 90 % y 100 %) a tu correo.
- [ ] **Copia diaria de Firestore**: consola → Firestore → **Backups** → programar una copia diaria
      con retención de 7 días.
- [ ] **App Check exigente** en la consola (Firestore y Storage), **cuando lleves un día entero y las
      métricas de App Check muestren casi todo «verificado»**. Antes, no: bloquearías tráfico
      legítimo.
- [ ] **Monitor de disponibilidad**: UptimeRobot (gratis) sobre `https://nupcialis.com`.
- [ ] **Segundo propietario** del proyecto de Firebase y de Vercel (`B1.5b`) y verificación en dos
      pasos con códigos de recuperación (`B1.5c`).
- [ ] **C** (yo): Content-Security-Policy en `Report-Only`, Dependabot y `npm audit` en el CI.

---

## Si algo falla

| Síntoma                                                                   | Causa probable y arreglo                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La construcción de Vercel muere instalando (`edgesOut`)                   | npm 10. En `vercel.json`, `installCommand`: `npm i -g npm@11 && HUSKY=0 npm ci`.                                                                                                                                                                                           |
| La construcción dice que Node no encaja                                   | Mira la versión en el registro: tiene que ser 22.x (la fija `engines` del `package.json`).                                                                                                                                                                                 |
| Toda llamada a una función da **401**                                     | App Check: `appCheckSiteKey` vacío o mal en `environment.prod.ts`, o la clave no incluye `nupcialis.com`. Se arregla en el código y se reconstruye.                                                                                                                        |
| El acceso con Google abre la ventana y se cuelga                          | Falta la cabecera COOP (está en `vercel.json`; comprueba que `nupcialis.com` ha reconstruido) o el dominio no está en **Authorized domains**.                                                                                                                              |
| `auth/unauthorized-domain` en una boda                                    | El alta no pudo autorizar su subdominio. Superadmin → ficha de la boda → **reintentar** el dominio. Si sigue, da a la cuenta de servicio de computación (`<número>-compute@developer.gserviceaccount.com`) el rol **Firebase Authentication Admin** en Google Cloud → IAM. |
| `ERR_SSL` o certificado no válido en un subdominio                        | El wildcard aún no se ha emitido: mira Settings → Domains en Vercel y que el `_acme-challenge` (opción B) o los nameservers (opción A) estén bien. En la B, tarda minutos.                                                                                                 |
| El deploy de funciones muere con `Cannot determine backend specification` | Ya está resuelto por `tools/desplegar-functions.mjs`. Si aun así falla, mira `docs/PUESTA-EN-MARCHA.md`, bloque 7.                                                                                                                                                         |
| Una boda existente sale «no encontrada»                                   | Producción está **vacía**: nada del proyecto de desarrollo viaja. Las bodas se dan de alta de nuevo desde Superadmin.                                                                                                                                                      |

**Volver atrás.** Web: Vercel → Deployments → la anterior → **Instant Rollback**. Reglas:
`git checkout <commit-bueno> -- firestore.rules storage.rules` y
`npm run deploy:rules -- --project prod`.

---

## Qué cuesta

| Concepto                | Coste                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Vercel Pro              | 20 $/mes (incluye un puesto y 20 $ de uso)                                               |
| Dominio `nupcialis.com` | ~15,7 € al año de renovación (ya comprado)                                               |
| Firebase Blaze          | ~0 € hasta que haya bodas reales; lo que escala son las fotos. Con presupuesto y alerta. |
| SMTP (Brevo/Resend)     | 0 € en el plan gratuito                                                                  |

## Lo que no bloquea el despliegue pero sí la primera venta

Te lo recomiendo, por este orden, **justo después de la prueba de humo** (lo hago yo):

1. `B-A1` — **el botón «Confirmar asistencia» no sale en bodas abiertas**, que es el modo por
   defecto del alta. Es un defecto funcional que verá el primer cliente.
2. `B-A3` — **RGPD mínimo**: aviso de privacidad y términos visibles, y contrato de encargo en el
   alta. Hace falta antes de guardar datos reales de invitados.
3. `D-02` — **qué incluye el plan básico** (precio ya decidido: 85 € y 250 €).
4. `B-A4` — correo (Paso 7), si no lo hiciste ya.
