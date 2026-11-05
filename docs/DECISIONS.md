# Decisiones

Registro de decisiones del proyecto: qué se decidió, por qué y qué alternativas se descartaron. La más reciente arriba. Antes de cambiar algo de esta lista, habla con Luis y añade una entrada nueva en vez de borrar la vieja.

## 2026-11-04 · Dibujos generados por código, sin pack

Sustituye a la idea de comprar un pack de pixel art (#10). El mundo y las criaturas se dibujan por código con unas reglas de estilo fijas:

- **Pocos colores:** cada material (hierba, agua, tierra, hojas, tejado…) y cada criatura tiene su escala de 4 o 5 tonos.
- **Luz desde arriba a la izquierda** en todo, y **contorno oscuro** en criaturas y objetos.
- **Tamaños fijos:** casillas de 16 px y criaturas de 32 px (dos casillas de alto). Sin letras dentro de los dibujos.
- **Criaturas por piezas:** cuerpo, algo en la cabeza, ojos, colores y el símbolo de su familia (+ o −) en la tripa. Añadir una criatura es una línea de datos. La respiración y el parpadeo también salen del código.
- **Mundo por reglas con semilla:** orillas, bordes del camino, árboles, hierba alta, flores y piedras con variaciones.

**Por qué:** Luis vio la maqueta (`docs/maquetas/dibujos-por-codigo.html`) y le gustó todo menos la casa, que hay que rehacer. Así se pueden crear muchos mapas y criaturas a medida que crece el juego, con un estilo coherente y criaturas propias.

**Descartado:** comprar un pack (mezclar packs no pega y sus criaturas no serían nuestras) y encargar un ilustrador por ahora.

## 2026-11-04 · Claude trabaja desde las issues de GitHub

- Las etiquetas hacen de cola: `plan` (Claude comenta un plan, sin código) y `dev` (implementa con `/desarrollar` y abre el PR). Lo lanza el workflow `.github/workflows/claude.yml` con la Claude Code GitHub Action.
- Cuando hace falta una decisión, Claude la pregunta en la issue, pone `necesita a Luis` y para. Al contestar Luis en la issue, retoma. Así a Luis solo le llegan notificaciones cuando le toca decidir o revisar.
- Tras cada revisión de CodeRabbit en una rama `tarea/…`, Claude sigue `/revisar`, con un máximo de dos rondas de arreglos.
- Solo las acciones de Luis (y las revisiones de CodeRabbit) lanzan el workflow; los comentarios de Claude no, para que no se encadene solo. Cada ejecución tiene tope de turnos y de tiempo.

**Por qué:** Luis tiene unas 3 horas al día y quiere avanzar desde el móvil sin abrir Claude Code ni vigilar cada paso.

**Descartado:** que Claude coja la siguiente issue sola al fusionar un PR (se puede añadir más adelante si el flujo funciona bien).

## 2026-11-03 · Criaturas por familias (sumus, restus)

- Las criaturas se agrupan en **familias**, y la familia decide la operación: a un **sumus** se le gana sumando y a un **restus**, restando. El nombre es invariable (un sumus, dos sumus), igual en castellano y catalán.
- Hay **una criatura por habilidad** (6 en Pradera Uno, no 5 como decía la issue #7), con nombre propio: Sumus Brote, Restus Gota, Sumus Trébol, Restus Bruma, Sumus Roble y Restus Sombra. Luis aprobó los nombres el 2026-11-04.
- El niño no elige la operación: la habilidad que toca (`pickSkill`) decidirá qué criatura aparece, para que nunca pueda esquivar lo que le cuesta practicar. Pendiente: `BattleScene` todavía elige `creature-add` o `creature-sub` al azar.
- Los nombres de elementos (brote, gota, sombra…) son solo variedad: no dan habilidades ni debilidades. Las debilidades por operación inversa de DESIGN.md quedan para cuando haya criaturas compañeras, y entonces darán un bonus, no serán obligatorias para ganar.
- Los **problemus** (problemas con enunciado) esperan a tener su habilidad.

**Por qué:** que el nombre diga qué hay que hacer es lo más fácil de entender con 6 años, y una tabla de elementos sería algo que memorizar sin aprender nada.

## 2026-11-03 · Mapa en pantalla y movimiento (`WorldScene`)

- Pradera Uno se genera con la **semilla fija 42** (`PRADERA_UNO_SEED` en `WorldScene`): todos ven el mismo mapa. Con esa semilla el camino no cruza agua.
- El mapa es un tilemap de Phaser creado por código. El tileset es una tira generada desde los sprites de texto (`tiles.ts`): primero las casillas de un dibujo, luego las 16 orillas de agua y las 16 de camino (sustituye a las texturas sueltas `tile-water-<n>` / `tile-path-<n>`). Casillas de 16 px en pantalla (sprites de 8 px a doble tamaño), hasta el pack de 32 px (#10).
- Se anda casilla a casilla (150 ms por paso). Qué se pisa lo decide `isWalkable` de `@kalku/world`: árboles, agua, casas y tienda no.
- Tocar la pantalla lleva al personaje andando por el camino más corto (`pathTo`). Si se toca algo que no se pisa, va a la casilla más cercana a la que se puede llegar. El teclado manda sobre un camino a medias, y un toque rápido de tecla da al menos un paso.
- El juego arranca en el mapa. El combate de prueba sigue en `?combate` (también en la web publicada).

**Por qué:** casilla a casilla es más fácil de controlar para un niño de 6 años y encaja con los encuentros por paso en hierba alta (#8).

## 2026-11-03 · Bordes de agua y camino (autotiling)

- Cada casilla de agua o camino tiene una **máscara** de vecinas del mismo tipo: N=1, E=2, S=4, W=8 y, en modo 8, NE=16, SE=32, SW=64, NW=128.
- En modo 8 una esquina solo cuenta si sus dos lados están unidos. Así salen 47 máscaras en vez de 256, que es como vienen la mayoría de packs.
- Fuera del mapa cuenta como unido: el agua y el camino que tocan el borde no dibujan orilla contra la nada.
- Solo se une con el mismo tipo de casilla (el camino no se une al agua).
- Una **tabla** por pack traduce máscara → número de casilla del pack, con una variante de reserva. Cambiar de pack es escribir otra tabla. Las de ahora (`WATER_TILES`, `PATH_TILES`) son **provisionales**: modo 4, la variante es la propia máscara, y en el juego cada una es la textura `tile-water-<n>` / `tile-path-<n>` generada desde texto.

**Por qué:** separar la máscara (lógica, con tests) de la tabla (datos del pack) deja elegir el pack (#10) sin tocar código.

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

## 2026-11-04 · Estilo visual: pixel art con letra clara

Se mantiene el pixel art para el mundo, pero todo lo que hay que leer va en letra redonda y clara, nunca en fuente pixel: números del ejercicio, nombres, vida, mensajes y botones. La fuente pixel queda solo para detalles decorativos cortos. Escala de píxel grande y criaturas grandes y animadas en el combate.

**Por qué:** Luis temía que el pixel art pareciera antiguo y comparó una maqueta pixel con otra cartoon. Ganó el pixel porque se genera mucho mejor por código y hay muchos packs coherentes; el problema que vio fue la claridad de letras y números, y se resuelve separando la letra del arte. Maqueta: https://claude.ai/artifact/TPKQ9cesx3rHzgZCEgPoWn

**Descartado:** estilo cartoon vectorial (difícil mantener un estilo igual sin ilustrador y peor para mapas generados).

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

## 2026-11-04 · Ajustes del jugador: tiempo, tamaño de texto y voz

Los ajustes (`settings`) viven en el progreso: tiempo sí/no, texto normal/grande y voz automática. Sin tiempo, `BattleScene` no mide y llama a `scoreAnswer` sin `elapsedMs`: sin bonus de rapidez y con los mismos puntos que responder despacio (principio 3). No se sube `version` del progreso: al cargar se completan los valores que falten o que no sean válidos. El idioma no está en `settings`: sigue en `locale`, aunque se cambia desde la misma pantalla. El ajuste de voz solo se guarda; la lectura en voz alta irá en otra tarea.
