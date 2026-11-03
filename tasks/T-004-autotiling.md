---
id: T-004
titulo: Bordes de agua y caminos (autotiling)
estado: pendiente
fase: 1
bloque: 2 · Mapa
tamano: M
depende_de: [T-002]
necesita_a_luis: no
---

# T-004 · Bordes de agua y caminos (autotiling)

## Objetivo

Que el agua y los caminos tengan bordes bien unidos, eligiendo la variante de casilla según sus vecinas.

## Qué hay que hacer

- En `@kalku/world`: calcular para cada casilla de agua y camino una máscara de vecinas (4 u 8 direcciones).
- Función que traduce máscara → índice de variante, con una tabla configurable para adaptarla al pack de gráficos.
- Sprites provisionales en texto de las variantes básicas para probarlo.

## Criterios de aceptación

- [ ] Las máscaras son correctas en casos de prueba escritos a mano (esquinas, bordes, islas) (test).
- [ ] Cambiar de pack solo requiere cambiar la tabla, no la lógica.

## Fuera de alcance

- Animación del agua.
- Variantes de árboles y hierba.

## Notas

Cuando se elija el pack (T-009), ajustar la tabla a su disposición de casillas.
