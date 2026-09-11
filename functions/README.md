# functions

Cloud Functions de Nupcialis. **Pegamento, no backend**: cada función es
independiente, sin estado, y existe porque hay cosas que el cliente no puede
hacer con garantías. Ver `docs/REQUISITOS.md` §7.

Es un paquete npm **aparte** del de la aplicación: tiene su propio
`package.json`, sus dependencias y su TypeScript, porque se despliega a un
runtime de Node distinto del navegador.

```bash
npm run functions:install   # desde la raíz; equivale a npm --prefix functions install
npm run functions:build
npm run functions:test
npm run emulators           # compila las funciones y levanta todos los emuladores
```

Los emuladores se lanzan **desde la raíz** del repositorio, no desde aquí. Y hay
que compilar antes: el emulador de funciones carga `lib/`, no `src/`. Por eso
`npm run emulators` compila primero.

## Cómo está organizado

- `src/dominio/` — lógica pura, sin Firebase. Es lo que se puede probar sin
  emulador y donde vive lo que de verdad hay que acertar.
- `src/infra/` — adaptadores: permisos, auditoría, Identity Toolkit.
- `src/*.ts` — una función por fichero, que orquesta el Admin SDK y llama a
  `dominio/`. `index.ts` solo reexporta.

Esa separación no es ceremonia: las reglas de negocio del alta de una boda
—reservar el slug, sembrar la configuración, calcular fechas relativas, decidir
qué sale a la proyección pública— se prueban en milisegundos y sin red.

## Las funciones

| Función                  | Tipo                  | Qué hace                                                             |
| ------------------------ | --------------------- | -------------------------------------------------------------------- |
| `provisionWedding`       | callable (superadmin) | Alta atómica de una boda: slug, documento, semillas, cuentas, claims |
| `setUserClaims`          | callable (superadmin) | Asignar o revocar `weddingId` y `role` de una cuenta                 |
| `authorizeWeddingDomain` | callable (superadmin) | Reintento del alta del subdominio en Firebase Auth                   |
| `syncPublicProjection`   | trigger Firestore     | Mantiene `weddings/{id}/public/site` al día                          |
| `recomputeCounters`      | trigger Firestore     | Recuenta `counters` cuando cambia un invitado                        |

## Dos cosas que hay que saber antes de tocar esto

**El subdominio de cada boda hay que darlo de alta en Firebase Auth.** No admite
comodines. `provisionWedding` lo hace, pero si el Identity Toolkit falla no
tumba un alta por lo demás correcta: la boda queda con `setup.authDomain:
'pending'` y la respuesta trae un aviso. El panel de superadmin lo pinta en rojo
y desde ahí se llama a `authorizeWeddingDomain`. Es la regla 8 de `CLAUDE.md`, y
la parte que más veces se ha roto en silencio en productos parecidos.

**En el emulador no hay dominios autorizados.** El emulador de Auth no
implementa ese API, así que `autorizarDominio` no hace nada cuando detecta
`FIREBASE_AUTH_EMULATOR_HOST`. Que funcione en local no demuestra que funcione
en producción: eso solo lo demuestra un alta real.

## App Check

Las tres funciones invocables exigen App Check (`enforceAppCheck: true`). En
local no estorba —el emulador no lo comprueba—, pero al probar contra el
proyecto real desde `localhost` hace falta un **token de depuración**: se genera
en el navegador con `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` antes de
inicializar App Check, y se registra en la consola de Firebase.
