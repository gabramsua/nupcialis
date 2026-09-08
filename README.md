# Nupcialis

SaaS multi-tenant de organización de bodas. Cada pareja tiene su web pública en
`<slug>.nupcialis.com` y un panel privado donde activa y configura sus módulos.

## Documentación

| Documento                                                    | Contenido                                           |
| ------------------------------------------------------------ | --------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                     | Guía de trabajo: stack, convenciones, reglas de oro |
| [`docs/REQUISITOS.md`](docs/REQUISITOS.md)                   | Requisitos completos, modelo de datos y módulos     |
| [`docs/PLAN-IMPLEMENTACION.md`](docs/PLAN-IMPLEMENTACION.md) | Fases de entrega y criterios de terminado           |
| [`docs/PUESTA-EN-MARCHA.md`](docs/PUESTA-EN-MARCHA.md)       | Cuentas, dominio, Firebase y hosting antes de F0    |
| [`docs/TAREAS.md`](docs/TAREAS.md)                           | Tareas en curso                                     |
| [`docs/PENDIENTES.md`](docs/PENDIENTES.md)                   | Decisiones abiertas                                 |

## Estado

**Puesta en marcha.** Ver `docs/PUESTA-EN-MARCHA.md`. F0 sin empezar.

## Stack

Angular 20 · Firebase (Firestore, Auth, Storage, Cloud Functions, App Check) ·
hosting con dominio wildcard · Leaflet/OpenStreetMap.
