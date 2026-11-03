---
id: T-003
titulo: Camino garantizado y lugares especiales en texto
estado: pendiente
fase: 1
bloque: 2 · Mapa
tamano: M
depende_de: [T-002]
necesita_a_luis: no
---

# T-003 · Camino garantizado y lugares especiales en texto

## Objetivo

Que siempre se pueda llegar de la entrada al jefe, y poder colocar lugares hechos a mano (pueblo, tienda, arena del jefe) escritos como texto.

## Qué hay que hacer

- En `@kalku/world`: piezas como arrays de texto, una letra por casilla (por ejemplo `C` casa, `A` agua, `.` hierba), con una leyenda.
- Colocar las piezas en el mapa en las posiciones que diga la `RegionSpec`.
- Trazar un camino (`path`) de la entrada al pueblo y del pueblo al jefe que esquive el agua.
- Comprobar conectividad con búsqueda en anchura; si una semilla no conecta, abrir paso quitando árboles.
- Pieza provisional de pueblo con tienda y pieza de arena del jefe para Pradera Uno.

## Criterios de aceptación

- [ ] Con 1.000 semillas distintas, siempre hay camino transitable de la entrada al jefe (test).
- [ ] Las piezas aparecen exactamente como están escritas (test).
- [ ] Ninguna pieza se sale del mapa ni se pisa con otra (test).

## Fuera de alcance

- Dibujar en pantalla.
- Entrar en edificios.

## Notas

Las piezas en texto sustituyen a un editor visual: Luis no quiere colocar cosas a mano.
