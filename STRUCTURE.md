# Estructura del proyecto

Monorepo con npm workspaces. Cada carpeta tiene una responsabilidad clara; si algo no encaja en ninguna, pregunta antes de crear una nueva.

```
kalku/
├── CLAUDE.md                 Guía para trabajar con Claude: reglas, comandos, convenciones
├── STRUCTURE.md              Este fichero
├── README.md                 Presentación corta y cómo arrancar
├── package.json              Workspaces y scripts de la raíz (dev, test, build, check)
├── tsconfig.base.json        Opciones de TypeScript comunes (estricto)
├── tsconfig.json             Referencias a los proyectos (tsc -b)
├── .coderabbit.yaml          Configuración de la revisión automática de PRs (CodeRabbit)
├── supabase/                 Servidor: config.toml, migrations/ (tablas y RLS), functions/answer/ (Edge Function que corrige respuestas), functions/child-session/ (el adulto entra como su niño en otro aparato), functions/class-session/ (el alumno entra en su clase con animal o código), functions/weekly-summary/ (resumen semanal por Brevo), functions/unsubscribe/ (baja en un clic) y tests/ (pgTAP: permisos, privacidad, familias, consentimiento, centros/docentes, alumnos de clase, entrar en clase y resumen semanal y dominio de la clase)
├── scripts/bundle-function.mjs Empaqueta la Edge Function con @kalku/exercises dentro (`npm run build:function`)
├── .github/
│   ├── workflows/ci.yml        CI: typecheck + tests + build en cada push y PR
│   ├── workflows/supabase.yml  CI de la base de datos: migraciones desde cero + tests pgTAP (si cambia supabase/)
│   ├── workflows/supabase-migrar.yml Aplica las migraciones y despliega las funciones al proyecto real (solo al fusionar en main o a mano)
│   ├── workflows/claude.yml    Claude desde las issues: etiquetas plan/dev, /revisar tras CodeRabbit, @claude
│   ├── ISSUE_TEMPLATE/tarea.md Plantilla de issue de tarea
│   └── pull_request_template.md Plantilla de PR (Closes #, cómo probar, criterios)
├── .claude/modo-github.md    Cómo pregunta y avisa Claude cuando lo lanza GitHub
├── .claude/skills/
│   ├── planificar/SKILL.md   Comando /planificar: crea y ordena issues, sin código
│   ├── desarrollar/SKILL.md  Comando /desarrollar: implementa una issue y abre un PR
│   └── revisar/SKILL.md      Comando /revisar: atiende CodeRabbit, CI y comentarios
│
├── docs/
│   ├── DESIGN.md             Resumen del documento de diseño del juego
│   ├── HISTORIA.md           Guion de la historia de Pradera Uno: personajes, tono y capítulos
│   ├── DECISIONS.md          Registro de decisiones (qué y por qué), la más reciente arriba
│   ├── ROADMAP.md            Fases y tareas hasta septiembre de 2027
│   ├── legal/                Plantillas del contrato de encargo de tratamiento para centros (es/ca, borrador)
│   └── maquetas/
│       └── dibujos-por-codigo.html  Maqueta del generador de dibujos (mapa por reglas y semilla, criaturas por piezas)
│
├── packages/
│   ├── exercises/            @kalku/exercises: lógica de aprendizaje, TypeScript puro
│   │   ├── src/
│   │   │   ├── index.ts        Exporta todo el paquete
│   │   │   ├── types.ts        Tipos: Exercise, SkillId, Locale, Hint…
│   │   │   ├── rng.ts          Aleatorio con semilla (mulberry32)
│   │   │   ├── skills.ts       Currículo: habilidades en orden, nombres es/ca, requisitos
│   │   │   ├── generators.ts   Un generador por habilidad + formato del ejercicio
│   │   │   ├── check.ts        Corrección de respuestas
│   │   │   ├── hints.ts        Pistas en 3 niveles, es/ca
│   │   │   ├── mastery.ts      Dominio 0–100 por habilidad (+8/+5/−6/−3)
│   │   │   ├── placement.ts    Prueba de nivel: sube/baja por el currículo y da el dominio inicial (sin tiempo, sin quitar nada)
│   │   │   ├── selection.ts    Qué habilidad toca: 60 % actual, 25 % repaso, 15 % reto
│   │   │   ├── validate.ts     Validación en el servidor: regenera el ejercicio desde la semilla, corrige y aplica el dominio (respuesta y prueba de nivel)
│   │   │   ├── levels.ts       Nivel del personaje: curva de XP en datos, XP por acierto (sin rapidez ni racha) y nivel calculado solo desde la XP
│   │   │   ├── speech.ts       Texto para leer el ejercicio en voz alta («cinco más tres son…»), es/ca
│   │   │   └── scoring.ts      Puntos (Cifras): dificultad, racha, rapidez sin penalizar
│   │   └── test/             Tests con vitest
│   ├── world/                @kalku/world: mundo generado por código con semilla, TypeScript puro
│   │   ├── src/
│   │   │   ├── index.ts        Exporta todo el paquete
│   │   │   ├── types.ts        Tipos: TileKind, WorldMap, TerrainSpec, RegionSpec, PieceSpec
│   │   │   ├── noise.ts        Ruido de valor con semilla (hecho a mano, sin dependencias)
│   │   │   ├── terrain.ts      generateTerrain: reparte casillas por proporción y agrupa agua y árboles
│   │   │   ├── pieces.ts       Lugares hechos a mano como texto (leyenda, pueblo y arena provisionales)
│   │   │   ├── layout.ts       generateRegion: coloca las piezas y traza el camino; isReachable
│   │   │   ├── regions.ts      Regiones como datos (con su semilla): Pradera Uno y Bosque de las Decenas; regionSpec(id)
│   │   │   ├── autotile.ts     Bordes de agua y camino: máscara de vecinas → variante, con tabla (16 o 47 variantes)
│   │   │   ├── gates.ts        Zonas cerradas: isGateClosed, openGate (sin mutar) y zoneInterior (el claro de detrás de la puerta)
│   │   │   ├── movement.ts     Andar casilla a casilla: canWalk, step y pathTo (ir hasta donde se toca)
│   │   │   └── wildlife.ts     Criaturas visibles en la hierba alta: aparecer, andar, combate al coincidir, reaparecer
│   │   └── test/             Tests con vitest
│   ├── art/                  @kalku/art: dibujos generados por código con reglas de estilo fijas, TypeScript puro
│   │   ├── src/
│   │   │   ├── index.ts        Exporta todo el paquete
│   │   │   ├── grid.ts         Rejilla de píxeles, contorno, luz desde arriba a la izquierda, paso a RGBA y tiras
│   │   │   ├── palette.ts      Escalas de color por material y por criatura (datos)
│   │   │   ├── tiles.ts        Casillas de 16 px: hierba, flores, hierba alta, piedra, árbol, jefe, agua animada y camino
│   │   │   ├── tileset.ts      Orden del tileset y fotograma de cada casilla del mapa (con autotile de 47 variantes)
│   │   │   ├── buildings.ts    findBuildings (agrupa casillas) y drawBuilding: casa y tienda de cualquier tamaño
│   │   │   ├── creatures.ts    CreatureLook (piezas como datos) y drawCreature: 8 fotogramas de 32 px
│   │   │   ├── gems.ts         drawGem: gema de 16 px por operación, encendida o apagada
│   │   │   ├── objects.ts      drawGate (puerta de piedra de una zona) y drawChest (cofre cerrado y abierto)
│   │   │   ├── character.ts    El personaje del niño por capas (piel, pelo, ropa, accesorio)
│   │   │   ├── portraits.ts    Retratos de 16 px de los personajes de la historia (diálogos)
│   │   │   └── npcs.ts         Personajes y objetos de la historia en el mapa: Tecla, Bruno, Lina, Pedrolo, Uni, el Gran Borrón, cristales, tablones y puente
│   │   └── test/             Tests con vitest
│   └── content/              @kalku/content: contenido del juego como datos, TypeScript puro
│       ├── src/
│       │   ├── index.ts        Exporta todo el paquete
│       │   ├── gems.ts         gemStatus: una gema por habilidad de SKILLS, ganada o no
│       │   ├── zones.ts        Zonas cerradas como datos (requisito de gemas y/o nivel, tesoro es/ca), isZoneOpen (nunca por monedas), missingForZone y lectura del guardado
│       │   ├── creatures.ts    Familias (sumus, restus, problemus) y criaturas de Pradera Uno con sus piezas (`look`); creaturesForSkill; validateCreatures
│       │   ├── collection.ts   Rescate y colección: canRescue (25 % de vida, nunca jefes), addToCollection sin mutar, parseCollection, collectionStatus
│       │   ├── classCodes.ts   Códigos de alumno «LUNA-47» (lista de palabras propia), 6 animales secretos y generateStudentCode sin repetir
│       │   ├── classProgress.ts Dominio de la clase para el docente: tramos de color con icono y número, marca «varios días bajo el 70 %», fichas por alumno (alfabético, sin rankings)
│       │   ├── weeklySummary.ts Resumen semanal: buildWeeklySummary, selectRecipients, correo es/ca de texto plano y cuerpo para Brevo (sin seguimiento)
│       │   ├── summaryToken.ts Token firmado (HMAC) del enlace de baja del resumen
│       │   ├── legal.ts        Textos legales como datos: política es/ca, versión para niños, datos del servidor, subencargados, LEGAL_DRAFT
│       │   ├── weakness.ts     Debilidad por operación inversa (damageMultiplier; los problemus no tienen) y contador de encuentros para el cartel
│       │   ├── outfit.ts       Piezas del personaje por capa y lectura del guardado
│       │   ├── syllabus.ts     Temario de un centro: parseSyllabus (errores claros en castellano), preguntas propias como ejercicio
│       │   ├── quests.ts       Encargos de los personajes tras el final: plantillas, nextQuest con semilla, advanceQuest
│       │   ├── missions.ts     Misiones del día y de la semana: iguales para todos según la fecha (Europe/Madrid)
│       │   └── story/          La historia (docs/HISTORIA.md) como datos, por regiones (docs/JUEGO-SIN-FIN.md)
│       │       ├── story.ts    Motor: advanceStory (nunca retrocede), objetivo de la tarjeta, zonas que abre, viajar entre regiones (travel, storyIn), validateStory
│       │       ├── regions.ts  RegionStory: capítulos, pasos, personajes, luces, jefe, guardián y caminos de cada región; REGION_STORIES
│       │       ├── praderaUno.ts Capítulos y pasos de Pradera Uno
│       │       ├── bosqueDecenas.ts Capítulos y pasos del Bosque de las Decenas
│       │       ├── scenesOlder.ts Diálogos de «Aventura» (8–12 años); sceneLines elige según el tramo
│       │       └── scenes.ts   Personajes y diálogos es/ca de cada escena, con {apodo}
│       ├── temarios/         Un JSON por centro (docs/TEMARIO.md); entran solos en el juego
│       └── test/             Tests con vitest
│
└── apps/
    └── game/                 @kalku/game: el juego, web instalable (PWA)
        ├── index.html          Contenedores #game (canvas) y #ui (HTML)
        ├── privacidad.html     Página /privacidad (entrada aparte de Vite, sin Phaser)
        ├── baja.html           Página /baja: darse de baja del resumen semanal desde el enlace del correo (entrada aparte, sin Phaser)
        ├── docentes.html       Página /docentes: alta de centro, unirse con código, clases y tarjetas (entrada aparte, sin Phaser)
        ├── vite.config.ts      Vite + PWA (manifest y service worker)
        ├── public/             Ficheros estáticos (icono, _headers de caché para Cloudflare Pages)
        └── src/
            ├── main.ts         Arranca Phaser y registra el service worker
            ├── i18n.ts         Textos de interfaz es/ca
            ├── speech.ts       Envoltorio de speechSynthesis: hay voz, leer, parar (el texto sale de @kalku/exercises)
            ├── supabase.ts     Cliente de Supabase con clave pública; null si faltan las variables (copia apps/game/.env.example a .env). Segundo cliente, con otra sesión, para el adulto
            ├── family.ts       Cuenta de familia: enlace por correo, unir niños (código de 10 min), entrar como un niño; FamilyBackend falso en los tests
            ├── progress.ts     Progreso y ajustes: copia local (localStorage) y conversión a filas del servidor (toServerRows / fromServerRows)
            ├── adultGate.ts    Cuenta con semilla (tipo 47 × 6) que da paso a «Para adultos»
            ├── sync.ts         Cuenta anónima y sincronización con Supabase: bajar al arrancar, migrar lo local una vez, subir tras cada guardado; sin red sigue en local
            ├── offlineQueue.ts Cola de respuestas pendientes (IndexedDB, con localStorage de reserva) para jugar sin conexión
            ├── teacher.ts      Cuentas de centro y docente: enlace por correo, alta de centro con contrato, código; TeacherBackend falso en los tests
            ├── classes.ts      Clases y tarjetas: alta de alumnos con código (hash sha-256), regenerar, ClassBackend falso en los tests
            ├── classProgress.ts ClassProgressBackend: lee `class_mastery` y `class_student_days` (solo totales); backend falso en los tests
            ├── classLogin.ts   Entrar en la clase: ClassLoginBackend (función class-session), enterClass y leaveSharedDevice (salir borra lo del alumno); backend falso en los tests
            ├── classDevice.ts  Aparato compartido: ?clase del QR, marcas en localStorage/sessionStorage y borrado de lo que dejó una pestaña cerrada
            ├── docentes.ts     Arranca la página /docentes (TeacherPanel)
            ├── baja.ts / unsubscribe.ts Página de baja del resumen: lee el token del fragmento y llama a la función `unsubscribe`
            ├── privacidad.ts   Pinta la política de privacidad (idioma, versión, tablas) desde @kalku/content
            ├── privacyLocale.ts Elige el idioma de /privacidad: ?lang=, ajuste guardado o navegador
            ├── nickname.ts     Apodos propuestos (es/ca) y validación (1–30 caracteres; avisa si parece nombre y apellido)
            ├── worldState.ts   Estado del mapa que sobrevive al combate (posición y criaturas) y resultado de la historia al volver
            ├── storyFlow.ts    Avanzar la historia y guardarla, reproducir diálogos, ir a la escena que toca
            ├── syllabus.ts     Temarios de packages/content/temarios, ?temario=<id> y el acertijo que toca
            ├── missions.ts     Misiones de hoy en la partida: avanzar con cada evento y dar las Cifras
            ├── dev/            Panel de desarrollo (botón DEV): solo en local y en vistas previas, nunca en la web publicada (__DEV_TOOLS__)
            │   ├── devActions.ts Atajos sobre el progreso: pasar paso, terminar o saltar región, encargo, misiones, dominarlo todo
            │   └── devTools.ts   El panel y «ganar de un toque» en combates y acertijos
            ├── audio/
            │   └── sound.ts    Sonido por código (Web Audio): efectos y melodías como notas, ajustes de sonido y música
            ├── art/
            │   └── textures.ts Pasa los dibujos de @kalku/art a texturas de Phaser: tilesets, criaturas, edificios, personaje, retratos y personajes del mapa
            ├── scenes/         Escenas de Phaser
            │   ├── BootScene.ts    Genera las texturas y va a la escena de la historia que toca (o combate con ?combate)
            │   ├── GradeScene.ts   «¿En qué curso estás?» (y el idioma) al empezar: elige el tono de la historia
            │   ├── PrologueScene.ts Prólogo: cuatro viñetas dibujadas por código con el Gran Borrón
            │   ├── CreateScene.ts  Crea tu personaje (también desde la Colección: «Cambiar mi personaje»)
            │   ├── RiddleScene.ts  Acertijos de Pedrolo (capítulo 4): problemas sin vida ni tiempo; salen del temario del centro si lo hay
            │   ├── ClassLoginScene.ts Entrada a la clase del QR: apodo, animal o código de la tarjeta
            │   ├── NicknameScene.ts Pantalla de apodo (lista o escrito) antes de la prueba de nivel, solo si no hay cuenta
            │   ├── PlacementScene.ts Prueba de nivel de la primera vez («¡Vamos a ver qué sabes!»), con «Ahora no»
            │   ├── WorldScene.ts   Mapa de Pradera Uno: tilemap con agua animada, edificios, personaje, criaturas visibles, teclado y toque, cámara; color según capítulos
            │   ├── worldStory.ts   La historia en el mapa: personajes, Uni, marca «!», flecha, tarjeta de misión, cristales y jefe
            │   ├── BattleScene.ts  Combate por turnos: hechizos Chispa y Rayo, la criatura recupera el color al devolverle la chispa; botón «Rescatar» con poca vida
            │   ├── battleFx.ts     Escenario del combate, proyectiles con estela y ráfagas de partículas, dibujados por código
            │   └── CollectionScene.ts Colección: criaturas rescatadas y las que faltan en silueta (HTML), se abre desde el mapa
            └── ui/             Interfaz HTML encima del canvas (incluye el aviso «sin conexión»)
                ├── ExercisePanel.ts  Ejercicio, altavoz, teclado numérico, pistas
                ├── Hud.ts            Cifras, gemas y dominio
                ├── fx.ts             Efectos en HTML sobre el canvas: números que saltan, carteles y confeti
                ├── DialogBox.ts      Diálogos con retrato, texto que se escribe solo, voz y «Saltar»
                ├── SettingsPanel.ts  Ajustes: idioma, tiempo, texto, voz, historia y «Para adultos»
                ├── MissionsPanel.ts  Misiones del día y de la semana, con lo que lleva cada una
                ├── dom.ts            Ayudas de HTML (texto, botón, estado) y la cuenta de «Para adultos»
                ├── FamilyPanel.ts    Familia: entrar con correo, lista de hijos, unir, entrar como, quitar
                ├── AdultsPanel.ts    Para adultos (con «Familia»): cuenta de entrada, descargar los datos en JSON y borrarlos (con confirmación)
                └── styles.css
```

## Cómo fluye un turno de combate

1. `BattleScene` pide a `pickSkill` qué habilidad toca (o el reto, si es ataque fuerte).
2. `generateExercise` crea el ejercicio con el `Rng` de la escena.
3. `ExercisePanel` lo muestra y recoge la respuesta.
4. `checkAnswer` corrige. Si falla, `getHint` da la siguiente pista; al tercer fallo se enseña la respuesta.
5. Al acabar el ejercicio, `applyAnswer` actualiza el dominio y `scoreAnswer` calcula las Cifras, que se convierten en daño.
6. `saveProgress` guarda.

## Lo que vendrá (y dónde irá)

| Qué | Dónde | Fase |
| --- | --- | --- |
| Tienda de 5 objetos y datos de objetos | `apps/game/src/data/` | 1 |
| Servidor: cuentas, validación, sincronización | `supabase/` (migraciones y funciones) | 2 |
| Panel docente y de familias | `apps/panel/` | 2 |
