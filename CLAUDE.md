# CLAUDE.md

Guía para trabajar en Kalku con Claude. Léela entera antes de tocar código.

## Qué es Kalku

Juego de aventuras 2D en pixel art para niños de 6 a 12 años donde cada ataque se gana resolviendo un ejercicio de matemáticas. Se juega en casa y en clase, en castellano y catalán, alineado con la LOMLOE.

- Diseño del juego: [docs/DESIGN.md](docs/DESIGN.md)
- Dónde está cada cosa: [STRUCTURE.md](STRUCTURE.md)
- Por qué se decidió cada cosa: [docs/DECISIONS.md](docs/DECISIONS.md)
- Plan por fases: [docs/ROADMAP.md](docs/ROADMAP.md)

Lo lleva Luis, solo, unas 3 horas al día. Todo lo que se construya tiene que funcionar sin que él gestione nada a mano.

## Reglas de producto que el código nunca puede romper

Son los principios del juego. Si un cambio choca con alguno, para y pregunta.

1. **Aprender es la única forma de avanzar.** Nada que dé ventaja en el juego se puede comprar ni conseguir viendo anuncios. Lo de pago es solo para adultos (informes, límites de tiempo, panel de centro). Sin anuncios.
2. **Fallar nunca quita nada.** Ni monedas, ni dominio por debajo de 0, ni progreso. Fallar da una pista y otra oportunidad.
3. **Ser lento nunca resta.** La rapidez puede dar un bonus con tope, pero responder despacio da los mismos puntos que jugar sin tiempo.
4. **Cada niño juega a su nivel.** El objetivo es acertar entre el 70 % y el 85 %.
5. **Niños = datos mínimos.** RGPD y LOPDGDD: nada de datos personales sin consentimiento de los padres (menores de 14), nada de seguimiento ni analítica de terceros, alojamiento en la UE.
6. **Todo texto visible existe en castellano (`es`) y catalán (`ca`).** Nunca escribas un texto de interfaz solo en un idioma.
7. **Nada copiado de Pokémon** ni de otros juegos: criaturas, nombres y diseños propios.

## Comandos

Node 22 (ver `.nvmrc`). Todo se lanza desde la raíz.

```bash
npm install          # instalar
npm run dev          # juego en http://localhost:5173
npm test             # tests de los paquetes (vitest)
npm run typecheck    # TypeScript en todo el monorepo
npm run build        # compilar todo (genera también el service worker)
npm run check        # typecheck + test + build: lo mismo que la CI
```

Antes de dar por terminado cualquier cambio, `npm run check` tiene que pasar.

## Trabajar por tareas

El trabajo se organiza en [issues de GitHub](https://github.com/Mijusk/kalku/issues) con la etiqueta `tarea`, un hito por fase y etiquetas de bloque y tamaño. Hay tres comandos (en `.claude/skills/`), que usan `gh`:

- **`/planificar`** decide qué hay que hacer: divide bloques de la hoja de ruta o ideas en issues con criterios de aceptación. No toca código.
- **`/desarrollar`** implementa **una** issue, en su rama `tarea/<número>-…`, con tests, y abre un pull request con `Closes #<número>`.
- **`/revisar`** atiende la revisión de un PR (CodeRabbit, CI y comentarios de Luis): arregla lo que proceda y responde en cada hilo.

Cada PR lo revisa CodeRabbit automáticamente (configuración en `.coderabbit.yaml`). Sus comentarios son sugerencias que hay que comprobar, no órdenes. Luis fusiona.

### Desde GitHub, sin abrir Claude Code

El workflow `.github/workflows/claude.yml` lanza los mismos comandos desde las issues, para que Luis trabaje desde el móvil:

- Etiqueta **`plan`** en una issue: Claude comenta un plan de implementación, sin código.
- Etiqueta **`dev`**: Claude sigue `/desarrollar` y abre el PR.
- Si necesita una decisión, la pregunta en la issue y pone **`necesita a Luis`**. Cuando Luis contesta allí, retoma solo.
- Cuando CodeRabbit revisa un PR de una rama `tarea/…`, Claude sigue `/revisar` (como mucho dos rondas).
- **`@claude`** en un comentario de Luis, para cualquier encargo puntual.

Las reglas de cómo preguntar y avisar en ese modo están en `.claude/modo-github.md`. Solo Luis puede lanzarlo.

Si te piden algo fuera de estos comandos y es más que un arreglo pequeño, propón crear una issue con `/planificar` en vez de hacerlo directamente.

## Arquitectura en una frase

`packages/exercises` es la lógica pura de aprendizaje (generar, corregir, pistas, puntos, dominio, qué ejercicio toca); `apps/game` es el juego en Phaser que la usa. Más adelante el servidor usará el mismo paquete para validar respuestas.

## Convenciones

- **Idioma:** identificadores de código en inglés; comentarios, documentación, commits y textos para el usuario en castellano.
- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`). Sin `any`. Sin `// @ts-ignore`.
- **Nada aleatorio sin semilla.** Usa `createRng(seed)` de `@kalku/exercises`, nunca `Math.random()` directamente (salvo `randomSeed()`). Así los tests son reproducibles y los mapas iguales para todos.
- **`@kalku/exercises` no depende del navegador ni de Phaser.** Nada de `window`, `document`, `localStorage` ni imports de `phaser` ahí dentro; tiene que poder correr en el servidor.
- **Funciones puras para la lógica.** `applyAnswer` devuelve un perfil nuevo; no muta el que recibe.
- **Contenido como datos, no como código suelto.** Habilidades en `skills.ts`; más adelante, criaturas, objetos y regiones en ficheros de datos. Añadir una criatura no debería tocar lógica.
- **Nada de editor visual.** Mapas generados por código con semilla, lugares especiales escritos como texto, sprites provisionales como texto (`apps/game/src/art/pixelArt.ts`). No añadir Tiled ni editores de niveles.
- **Interfaz de ejercicios en HTML, el mundo en Phaser.** Los números del ejercicio van en HTML con letra grande; el pixel art, en el canvas.
- **Letra clara siempre.** El mundo es pixel art, pero números, nombres, vida, mensajes y botones van en letra redonda y legible, nunca en fuente pixel (ver `docs/DECISIONS.md`).
- **Accesible para niños de 6 años:** botones de al menos 48 px, teclado numérico en pantalla, textos cortos.
- Commits en castellano, en imperativo y cortos: «Añade generador de restas llevando».

## Tests

- Toda la lógica de `@kalku/exercises` lleva tests en `packages/exercises/test/`.
- Los generadores se prueban con miles de muestras con semilla fija: cada habilidad debe cumplir sus reglas siempre (por ejemplo, «sin llevar» nunca cruza la decena).
- Si cambias una regla de producto (puntos, dominio, mezcla 60/25/15), cambia el test y apúntalo en `docs/DECISIONS.md`.
- Nunca desactives ni saltes un test para que pase la CI.

## Cómo añadir cosas habituales

- **Una habilidad nueva:** su id en `SkillId` (`types.ts`), su definición en `SKILLS` (`skills.ts`, en orden de currículo), su generador en `GENERATORS` (`generators.ts`), sus pistas en `hints.ts` y tests de sus reglas.
- **Un texto de interfaz:** en `apps/game/src/i18n.ts`, con `es` y `ca`.
- **Un sprite provisional:** como texto en `apps/game/src/art/pixelArt.ts` y registrarlo en `BootScene`. Cuando haya pack de pixel art, se carga el PNG con la misma clave.

## Estado actual

Fase 1 (prototipo). Hay un combate de prueba jugable; el progreso se guarda en `localStorage` de forma provisional. Supabase, cuentas, mapas generados y tienda aún no existen. Mira [docs/ROADMAP.md](docs/ROADMAP.md) antes de empezar algo nuevo.

## Cuándo preguntar a Luis

- Cualquier cosa que toque dinero, datos de niños, o los principios de arriba.
- Añadir una dependencia grande o un servicio externo.
- Cambiar el modelo de negocio o el estilo visual.
