# Decisiones

Registro de decisiones del proyecto: qué se decidió, por qué y qué alternativas se descartaron. La más reciente arriba. Antes de cambiar algo de esta lista, habla con Luis y añade una entrada nueva en vez de borrar la vieja.

## 2026-11-03 · Criaturas por familias (sumus, restus)

- Las criaturas se agrupan en **familias**, y la familia decide la operación: a un **sumus** se le gana sumando y a un **restus**, restando. El nombre es invariable (un sumus, dos sumus), igual en castellano y catalán.
- Hay **una criatura por habilidad** (6 en Pradera Uno, no 5 como decía la issue #7), con nombre propio: Sumus Brote, Restus Gota, Sumus Trébol, Restus Bruma, Sumus Roble y Restus Sombra. Los nombres son **provisionales** hasta que Luis los apruebe.
- El niño no elige la operación: la habilidad que toca (`pickSkill`) decide qué criatura aparece. Así nunca puede esquivar lo que le cuesta practicar.
- Los nombres de elementos (brote, gota, sombra…) son solo variedad: no dan habilidades ni debilidades. Las debilidades por operación inversa de DESIGN.md quedan para cuando haya criaturas compañeras, y entonces darán un bonus, no serán obligatorias para ganar.
- Los **problemus** (problemas con enunciado) esperan a tener su habilidad.

**Por qué:** que el nombre diga qué hay que hacer es lo más fácil de entender con 6 años, y una tabla de elementos sería algo que memorizar sin aprender nada.

## 2026-11-03 · Camino y lugares hechos a mano (`generateRegion`)

- Los lugares (pueblo, arena del jefe) son piezas de texto con una leyenda de una letra por casilla (`PIECE_LEGEND`). Se colocan encima del terreno y quedan exactamente como están escritos: el camino y la limpieza no los tocan.
- Cada pieza tiene un **enlace**, una casilla de su borde por la que entra el camino. El camino va de la entrada al primer lugar, de ahí al segundo…, en el orden de `RegionSpec.places`. Las piezas no se atraviesan.
- Antes de trazarlo se abre un **claro** de hierba de radio 3 (en cruz) alrededor de la entrada y de cada enlace. Sin él, en un tercio de las semillas el camino tenía que cruzar el agua justo al salir.
- El camino es el más barato (Dijkstra): hierba 2, camino ya hecho 1, árbol 8 (se tala) y agua 1.000.000. El agua solo se cruza, como **puente**, si no hay ninguna otra forma de llegar. El test comprueba que pasa en menos del 3 % de las semillas.
- Casas, tienda y jefe son tipos de casilla nuevos (`house`, `shop`, `boss`) que solo salen de piezas. Las dos piezas de Pradera Uno son **provisionales**.

**Por qué:** un lago puede cerrar el paso al jefe. Antes que dejar un mapa sin salida, mejor un puente. Y antes que el puente, talar árboles.

## 2026-11-03 · Cómo se genera el terreno (`@kalku/world`)

- Cada tipo de casilla (agua, árboles, hierba alta, flores) tiene su propio ruido de valor con semilla. Se reparten en ese orden: cada capa coge, entre las casillas que siguen libres, las de más ruido hasta cubrir su proporción. Así las proporciones salen exactas (redondeadas a casillas) y las manchas son naturales.
- «Suelto» significa sin ninguna casilla igual arriba, abajo, a la izquierda o a la derecha (las diagonales no cuentan). Agua y árboles sueltos vuelven a hierba y se recolocan pegados a un grupo.
- El «±5 %» de las proporciones se entiende como 5 puntos sobre el total del mapa (pedir 8 % de agua acepta entre 3 % y 13 %). En la práctica sale exacto.
- Los cupos de las capas se calculan juntos (restos del redondeo a las capas con más decimales), para que nunca sumen más casillas que el mapa.
- La semilla del mapa se pasa a `generateTerrain`; de ella salen las semillas de cada capa.

**Por qué:** cortar el ruido por un umbral fijo da proporciones distintas en cada semilla; ordenar por ruido las garantiza sin perder la forma de las manchas.

## 2026-11-03 · Tareas en GitHub Issues y revisión con CodeRabbit

Sustituye a la entrada siguiente («Trabajo por tareas…»). Las tareas pasan de ficheros en `tasks/` a issues de GitHub (#2 a #20), con etiquetas de fase, bloque y tamaño, y un hito por fase. Los comandos usan `gh`. Cada PR lo revisa CodeRabbit; `/revisar` atiende sus comentarios.

**Por qué:** Luis prefiere ver y comentar las tareas en GitHub (también desde el móvil), y que se cierren solas al fusionar. El coste es instalar GitHub CLI una vez.

## 2026-11-03 · Trabajo por tareas con /planificar y /desarrollar

Las tareas viven como ficheros en `tasks/` (no en GitHub Issues). `/planificar` las crea sin tocar código; `/desarrollar` implementa una por rama y pull request y la marca como hecha en el propio PR.

**Por qué:** Luis quiere lanzar desde Claude Code un Claude que solo planifica y otro que solo implementa. Con ficheros en el repositorio no hace falta instalar ni configurar nada más, y la tarea viaja con el código que la cumple.

**Descartado:** GitHub Issues (necesita `gh` con sesión en el ordenador de Luis y separa la tarea del código).

## 2026-11-03 · Interpretación del motor de dominio (+8/+5/−6/−3)

El documento de diseño da los números pero no a qué corresponde cada uno. Se interpreta así:

- +8 acierto a la primera; +5 acierto tras pista o fallo.
- −6 fallo en ejercicio de su nivel o de repaso; −3 fallo en ejercicio de reto.
- El dominio se aplica **una vez por ejercicio** (no por intento). Si acierta tras fallar, cuenta como +5.
- Habilidad dominada: dominio ≥ 80 y al menos 10 respuestas. Da una gema de dominio.

**Por qué:** fallar un reto es arriesgarse, y el diseño dice que arriesgarse no debe castigar igual.

## 2026-11-03 · Estructura: monorepo con paquete de ejercicios puro

`packages/exercises` (TypeScript sin dependencias del navegador) + `apps/game` (Phaser). npm workspaces, Vite, Vitest.

**Por qué:** el servidor tendrá que validar respuestas con la misma lógica; separarla desde el principio evita duplicarla.

## 2026-11-03 · Phaser 3.90 y TypeScript 5.9

Phaser 4 ya existe, pero la mayoría de ejemplos y documentación siguen siendo de Phaser 3, y 3.90 es estable. TypeScript 5.9 en vez de 7 para evitar sorpresas con las herramientas.

**Revisar:** cuando el prototipo esté hecho, valorar migrar a Phaser 4.

## 2026-11-03 · Progreso en localStorage (provisional)

En la fase 1 el progreso se guarda en el navegador para poder probar sin servidor. En la fase 2 pasa a Supabase en la UE con validación en el servidor.

## 2026-11-02 · Pixel art, mapas por código, sin editor visual

- Pixel art visto desde arriba, casillas de 32×32 cuando haya pack de gráficos.
- Mapas generados por código por región, con semilla fija (todos ven el mismo mundo). Lugares especiales escritos como texto. Sin Tiled.
- Criaturas y objetos como datos; personaje por capas de PNG.
- Ejercicios en HTML con letra grande, no en píxeles.

**Por qué:** Luis no quiere colocar cosas a mano en un editor; lo quiere todo en código. Hay muchos packs de pixel art y Phaser trabaja bien con casillas.

**Descartado:** Tiled (editor visual), estilo de dibujo animado (necesita ilustrador).

## 2026-11-02 · Web primero, apps después

Web instalable (PWA) primero; apps de Android e iPhone con Capacitor cuando el juego funcione. Los pagos, en la web (Stripe).

**Por qué:** los colegios tienen de todo (Chromebooks, tablets, pizarras); un único código; actualizaciones al momento; sin la comisión del 15–30 % de las tiendas.

## 2026-11-02 · Modelo de negocio: gratis para el niño, pagan los adultos, sin anuncios

Planes Gratis, Familia (4,99 €/mes o 39,99 €/año), Docente gratis y Centro (2 €/alumno/año). Todo online, sin comerciales.

**Por qué (decisión de producto):** los anuncios rendirían unos 50 €/mes con 600 alumnos, los colegios no los aceptan, y ver un anuncio para ganar XP rompe el principio 1.

**Contexto legal (no es lo que decide, pero lo complica):** la DSA (art. 28) prohíbe a las plataformas mostrar a menores anuncios basados en perfiles, así que solo cabría publicidad contextual, que rinde menos. Y la LOPDGDD (art. 7) exige el consentimiento de los padres para tratar datos de menores de 14 años, lo que afecta a cualquier red de anuncios que use datos del niño.

**Descartado:** anuncios recompensados (idea inicial de Luis); venta colegio a colegio.

## 2026-11-02 · Nombre: Kalku

Nombre provisional anterior: Mundo Cifra. «Kalku» viene de cálculo / càlcul; las criaturas son «kalkus». Dominio previsto: kalkujuego.com (aún sin comprar). Marca sin registrar; en TMview no aparece «Kalku» en España/UE para software o educación (ojo con KALKUM, OEPM M2131696, clase 9).
