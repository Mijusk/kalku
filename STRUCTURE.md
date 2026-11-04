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
├── .github/
│   ├── workflows/ci.yml        CI: typecheck + tests + build en cada push y PR
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
│   ├── DECISIONS.md          Registro de decisiones (qué y por qué), la más reciente arriba
│   └── ROADMAP.md            Fases y tareas hasta septiembre de 2027
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
│   │   │   ├── selection.ts    Qué habilidad toca: 60 % actual, 25 % repaso, 15 % reto
│   │   │   └── scoring.ts      Puntos (Cifras): dificultad, racha, rapidez sin penalizar
│   │   └── test/             Tests con vitest
│   └── world/                @kalku/world: mundo generado por código con semilla, TypeScript puro
│       ├── src/
│       │   ├── index.ts        Exporta todo el paquete
│       │   ├── types.ts        Tipos: TileKind, WorldMap, TerrainSpec, RegionSpec, PieceSpec
│       │   ├── noise.ts        Ruido de valor con semilla (hecho a mano, sin dependencias)
│       │   ├── terrain.ts      generateTerrain: reparte casillas por proporción y agrupa agua y árboles
│       │   ├── pieces.ts       Lugares hechos a mano como texto (leyenda, pueblo y arena provisionales)
│       │   ├── layout.ts       generateRegion: coloca las piezas y traza el camino; isReachable
│       │   └── regions.ts      Regiones como datos: Pradera Uno (60×40, entrada, pueblo y jefe)
│       └── test/             Tests con vitest
│
└── apps/
    └── game/                 @kalku/game: el juego, web instalable (PWA)
        ├── index.html          Contenedores #game (canvas) y #ui (HTML)
        ├── vite.config.ts      Vite + PWA (manifest y service worker)
        ├── public/             Ficheros estáticos (icono)
        └── src/
            ├── main.ts         Arranca Phaser y registra el service worker
            ├── i18n.ts         Textos de interfaz es/ca
            ├── progress.ts     Guardado del progreso (PROVISIONAL: localStorage)
            ├── art/
            │   └── pixelArt.ts Sprites provisionales dibujados como texto
            ├── scenes/         Escenas de Phaser
            │   ├── BootScene.ts    Crea o carga texturas
            │   └── BattleScene.ts  Combate por turnos de prueba
            └── ui/             Interfaz HTML encima del canvas
                ├── ExercisePanel.ts  Ejercicio, teclado numérico, pistas
                ├── Hud.ts            Cifras, gemas y dominio
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
| Dibujo del mapa y bordes bonitos | escena `WorldScene` (usa `@kalku/world`) | 1 |
| Tienda de 5 objetos y datos de objetos | `apps/game/src/data/` | 1 |
| Criaturas como datos | `packages/content/` o `apps/game/src/data/` | 2 |
| Servidor: cuentas, validación, sincronización | `supabase/` (migraciones y funciones) | 2 |
| Panel docente y de familias | `apps/panel/` | 2 |
