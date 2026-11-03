---
id: T-009
titulo: Cargar el pack de pixel art
estado: bloqueada
fase: 1
bloque: 4 · Gráficos y tienda
tamano: S
depende_de: []
necesita_a_luis: sí
---

# T-009 · Cargar el pack de pixel art

## Objetivo

Sustituir los sprites provisionales por un pack de pixel art de 32×32 coherente.

## Qué hay que hacer

- Luis elige el pack (por ejemplo en itch.io) con licencia que permita uso comercial.
- Guardar los PNG en `apps/game/public/assets/` con un fichero `LICENSE` o nota de atribución.
- Cargarlos en `BootScene` con las mismas claves que los sprites provisionales.
- Ajustar la tabla de autotiling (T-004) a la disposición del pack.

## Criterios de aceptación

- [ ] El mapa y el combate se ven con el pack.
- [ ] La licencia está guardada en el repositorio y permite uso comercial.
- [ ] Los sprites provisionales en texto siguen sirviendo de respaldo si falta una imagen.

## Fuera de alcance

- Arte propio o encargado.

## Notas

Bloqueada: Luis tiene que elegir y comprar el pack. /desarrollar puede proponer 3 opciones con su licencia.
