---
id: T-007
titulo: Encuentros en la hierba alta
estado: pendiente
fase: 1
bloque: 3 · Encuentros
tamano: M
depende_de: [T-005, T-006]
necesita_a_luis: no
---

# T-007 · Encuentros en la hierba alta

## Objetivo

Que al andar por la hierba alta aparezcan criaturas y se entre en combate, y al terminar se vuelva al mismo sitio del mapa.

## Qué hay que hacer

- Probabilidad de encuentro por paso en `tallGrass`, con `Rng` y configurable en la `RegionSpec`.
- Elegir la criatura según la región.
- Transición mapa → combate → mapa conservando la posición.
- Unos pasos de gracia tras un combate sin encuentros.

## Criterios de aceptación

- [ ] Andando por hierba alta aparece un combate de vez en cuando (no en cada paso).
- [ ] Al ganar o perder, se vuelve al mismo sitio del mapa.
- [ ] Fuera de la hierba alta no hay encuentros.
- [ ] La lógica de probabilidad tiene tests.

## Fuera de alcance

- Huir del combate.
- Jefe de región.

## Notas

—
