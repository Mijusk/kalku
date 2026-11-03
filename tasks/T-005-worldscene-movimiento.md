---
id: T-005
titulo: Dibujar el mapa y mover al personaje
estado: pendiente
fase: 1
bloque: 2 · Mapa
tamano: M
depende_de: [T-003]
necesita_a_luis: no
---

# T-005 · Dibujar el mapa y mover al personaje

## Objetivo

Ver Pradera Uno en pantalla y moverse por ella, en ordenador y en tablet.

## Qué hay que hacer

- `WorldScene` en `apps/game` que dibuja el `WorldMap` con un tilemap de Phaser creado por código.
- Personaje que se mueve casilla a casilla con flechas/WASD y tocando la pantalla (ir hacia donde se toca).
- Colisiones con árboles, agua y casas.
- Cámara que sigue al personaje dentro de los límites del mapa.
- Al arrancar, el juego va al mapa; el combate de prueba sigue accesible para desarrollo.

## Criterios de aceptación

- [ ] Se puede ir de la entrada al pueblo y al jefe andando.
- [ ] No se atraviesan árboles ni agua.
- [ ] Funciona con teclado y con toque (probado en vista móvil del navegador).
- [ ] Va fluido en un móvil normal (sin tirones al moverse).
- [ ] `npm run check` pasa.

## Fuera de alcance

- Encuentros con criaturas (T-007).
- Gráficos definitivos (T-009).

## Notas

—
