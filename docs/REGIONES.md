# Cómo añadir una región o un capítulo

Kalku crece metiendo datos (docs/JUEGO-SIN-FIN.md). Esta guía explica qué fichero tocar para cada cosa. Después de cada cambio: `npm run check` y, si quieres verlo, `npm run dev`.

## Un capítulo nuevo en una región que ya existe

1. Abre los pasos de la región (Pradera Uno: `packages/content/src/story/praderaUno.ts`).
2. Añade el título del capítulo a `CHAPTERS` (es y ca).
3. Añade sus pasos a `STORY`, en orden. Tipos de paso:

| `kind` | Qué hace el niño | Campos |
|---|---|---|
| `talk` | Ir a hablar con alguien | `npc` |
| `collect` | Ganar combates en la hierba alta (cada uno da un objeto) | `count`, `item` |
| `crystals` | Ganar el combate de cada luz de la región | `count` (≤ luces de la región) |
| `riddles` | Resolver acertijos del guardián (salen del temario del centro si lo hay) | `count` |
| `boss` | El jefe de la región | — |

   Cada paso lleva `objective` (lo que pone la tarjeta, es y ca) y, si quieres, `intro`/`outro` (diálogos) y `opensZone` (la zona del mapa que abre).
4. Escribe los diálogos en `scenes.ts` (Brote, 5–8 años) y `scenesOlder.ts` (Aventura, 8–12). Los tests avisan si falta alguno o falta un idioma.

## Una región nueva

1. **Mapa** (`packages/world/src/regions.ts`): tamaño, semilla, lugares especiales y zonas, como `PRADERA_UNO` o `BOSQUE_DECENAS`. Añádela a `REGIONS`. Cada zona necesita su entrada en `ZONES` (`packages/content/src/zones.ts`).
2. **Habilidades** que practica (`packages/exercises`): si son nuevas, su id, definición, generador, pistas y tests (ver CLAUDE.md, «Una habilidad nueva»).
3. **Criaturas** (`packages/content/src/creatures.ts`): por piezas, nunca dibujos sueltos.
4. **Historia** (`packages/content/src/story/`): un fichero como `praderaUno.ts` y un `RegionStory` en `regions.ts` con:
   - `npcs`: dónde vive cada personaje (`place` = esquina de un lugar, `zone` = esquina de una zona, `gate` = puerta de una zona, `entrance` = entrada del mapa, más `dx`/`dy` en casillas);
   - `lights` y `lightSprites`: las luces de los pasos `crystals` y su dibujo (cristales, farolillos);
   - `riddler`: quién pone los acertijos y su diálogo de presentación;
   - `boss`: quién es el jefe, su dibujo, en qué se convierte y sus diálogos;
   - `paths`: los carteles de camino a otras regiones; `next`: la región que se abre al terminar (tiene que tener cartel);
   - `arrival` y `afterEnding`: lo que dice Uni al llegar y al terminar.
   Un personaje nuevo necesita su retrato y su dibujo del mapa en `@kalku/art` (`portraits.ts`, `npcs.ts`), su nombre en `CHARACTERS` y, si quieres, encargos en `quests.ts`.
5. Añádela a `REGION_STORIES`. Los tests comprueban que todo lo que pones en el mapa existe.

## Lo que nunca se puede romper

- Solo se avanza aprendiendo; nada se desbloquea con Cifras.
- Perder no hace retroceder la historia.
- Todo texto en castellano y catalán.
- Personajes y criaturas propios.
