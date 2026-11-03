---
id: T-002
titulo: Paquete de mundo: terreno con semilla
estado: pendiente
fase: 1
bloque: 2 · Mapa
tamano: M
depende_de: []
necesita_a_luis: no
---

# T-002 · Paquete de mundo: terreno con semilla

## Objetivo

Generar por código el terreno de una zona a partir de una semilla, sin editor visual. Es la base de todos los mapas.

## Qué hay que hacer

- Crear `packages/world` (`@kalku/world`), TypeScript puro sin navegador ni Phaser, igual que `@kalku/exercises`.
- Tipos: `TileKind` (`grass`, `tallGrass`, `tree`, `water`, `path`, `flowers`) y `WorldMap` (ancho, alto, casillas).
- Ruido de valor con semilla implementado a mano (sin dependencias), usando `createRng` de `@kalku/exercises`.
- Descripción de región como datos: `RegionSpec` con tamaño y proporciones de agua, árboles, hierba alta y flores.
- Regla de agrupación: árboles y agua forman grupos, no casillas sueltas.
- Definir Pradera Uno como `RegionSpec` (60×40 casillas).

## Criterios de aceptación

- [ ] Con la misma semilla y región sale exactamente el mismo mapa (test).
- [ ] Semillas distintas dan mapas distintos (test).
- [ ] Las proporciones de cada tipo de casilla quedan dentro de ±5 % de lo pedido (test con varias semillas).
- [ ] No hay árboles ni agua sueltos de una sola casilla (test).
- [ ] `npm run check` pasa y el paquete está en `STRUCTURE.md`.

## Fuera de alcance

- Dibujar el mapa en Phaser (T-005).
- Caminos y lugares especiales (T-003).
- Bordes bonitos (T-004).

## Notas

Ver docs/DECISIONS.md: mapas por código, semilla fija para que todos los niños vean el mismo mundo.
