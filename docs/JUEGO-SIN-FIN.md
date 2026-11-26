# Kalku sin fin (hito 4)

Pradera Uno es el principio. Este documento explica cómo el juego sigue creciendo casi sin límite **metiendo datos, no programando**, y cómo tiene dos inicios según la edad.

## 1. Dos inicios: 5–8 y 8–12 años

Las mates y el juego son los mismos (dominio, combates, mapa). Cambia el tono de la historia:

| | **Brote** (5–8 años, 1.º–2.º) | **Aventura** (8–12 años, 3.º–6.º) |
|---|---|---|
| Tono | Tierno, guiado, frases muy cortas | Humor, misterio, retos; nada infantil |
| Premisa | El Gran Borrón se come los números y el pueblo se queda gris | Los números de Kalku desaparecen sin dejar rastro: el niño entra en la **Liga de Calculistas** e investiga quién hay detrás |
| Guía | Uni, lucecita con forma de 1 | Uni, pero respondona y con chistes; los personajes le hablan de igual a igual |
| Mismos pasos | Sí: crear personaje, entrenar, rescatar, tablones, cristales, acertijos, jefe | Sí, con otros diálogos, otras pistas del misterio y un jefe con giro final |

**Cómo se elige (sin pedir la edad):** al empezar se pregunta «¿En qué curso estás?» con botones grandes (Infantil 5 años, 1.º … 6.º). Es lo mínimo (regla 5: no pide fecha de nacimiento). Si el niño entra con una clase, el curso lo pone el docente. Se puede cambiar en Ajustes. El curso también sirve de punto de partida a la prueba de nivel.

**Cómo se hace como datos:** cada escena de diálogo tiene su versión por tramo (`scenes.young`, `scenes.older`); los pasos de la historia son los mismos. Si a una escena le falta la versión de mayores, se usa la de pequeños (y un test avisa).

## 2. El mundo crece por regiones

Cada **región** es un bloque del currículo y un fichero de datos:

| Región | Matemáticas (LOMLOE) | Tramo natural |
|---|---|---|
| Pradera Uno | Sumas y restas hasta 20, problemas | 1.º–2.º |
| Bosque de las Decenas | Sumas y restas hasta 100, decenas y unidades | 2.º–3.º |
| Montes de las Tablas | Multiplicar y tablas | 3.º–4.º |
| Lago del Reparto | Dividir | 3.º–4.º |
| Costa de las Fracciones | Fracciones y decimales | 4.º–6.º |
| Ciudad de las Formas | Geometría y medida | todos |

Una región en datos lleva:
- mapa: semilla, tamaño y lugares especiales (como hoy Pradera Uno);
- criaturas de la región (piezas, como hoy);
- habilidades que practica;
- **capítulos**: pasos con los mismos tipos que ya existen (hablar, recoger N, encender N, acertijos, jefe) y sus diálogos en es/ca y por tramo;
- zonas que abre cada capítulo y el tesoro.

El motor de historia lee la región que toca. **Añadir un capítulo o una región = un fichero nuevo y sus tests de validación**, sin tocar lógica. Al acabar una región se abre el camino a la siguiente (sin pagar: aprender es la única forma de avanzar).

Los niños que ya dominan lo de una región pueden saltar a la siguiente con la prueba de nivel o el temario de su clase: la historia de la región se puede jugar igual, con ejercicios de su nivel.

## 3. Después del final: siempre hay algo que hacer

- **Encargos de los personajes:** al terminar el capítulo, Bruno, Lina, Pedrolo y Tecla piden favores repetibles (plantillas: «tráeme N tablones», «enciende N cristales», «resuelve N acertijos», «rescata N criaturas de tal familia»). Se generan por reglas con semilla, nunca se acaban y salen de la habilidad que le toca practicar.
- **Misiones del día y de la semana:** 3 del día y 1 grande de la semana, generadas con la semilla de la fecha (todos los niños de una clase ven las mismas, para comentarlo en clase). Premio: Cifras, pegatinas y piezas de ropa. **Sin rachas que castiguen:** si no juegas un día no pierdes nada (regla 2). Ninguna misión pide rapidez (regla 3).
- **Colección:** cada región trae criaturas nuevas; además, criaturas **brillantes** poco frecuentes (solo cambian de color) y un álbum con pegatinas por región.
- **Eventos de temporada como datos:** Castanyada/Halloween, Navidad, Sant Jordi, fin de curso… con fechas, una criatura invitada y misiones propias. Encajan con el calendario escolar.

## 4. Lo que nunca cambia

- Todo se gana aprendiendo; nada se compra.
- Fallar no quita nada; perder un combate no hace retroceder la historia.
- Cada niño juega a su nivel (70–85 % de aciertos), elija el tramo que elija.
- Todo texto en castellano y catalán; personajes y nombres propios.

## 5. Orden de trabajo

1. Motor de capítulos por región (Pradera Uno pasa a ser datos de región, sin cambios para el niño).
2. Dos inicios por tramo, con el curso al empezar.
3. Encargos repetibles de los personajes tras el final.
4. Misiones del día y de la semana.
5. Bosque de las Decenas: habilidades hasta 100, criaturas, mapa y capítulos.
6. Guía «Cómo añadir una región o un capítulo».
7. Colección ampliada (brillantes, álbum) y eventos de temporada.
