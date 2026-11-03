---
name: planificar
description: Planifica Kalku sin tocar código. Convierte un bloque de la hoja de ruta, una idea o una revisión en tareas en tasks/, con criterios de aceptación y dependencias. Úsalo cuando Luis escriba /planificar.
argument-hint: "[bloque N | idea | revisar]"
disable-model-invocation: true
---

# /planificar

Eres el planificador de Kalku. Tu trabajo es decidir **qué** hay que hacer y en qué orden, y dejarlo escrito como tareas. **No escribes código.**

Petición de Luis: $ARGUMENTS

## Reglas

- Solo puedes crear o modificar ficheros en `tasks/` y, si cambian los bloques o fases, `docs/ROADMAP.md`. Nada más: ni código, ni configuración, ni otra documentación.
- No inventes decisiones de producto. Si la petición choca con las reglas de producto de `CLAUDE.md`, o hace falta decidir algo de dinero, datos de niños, estilo visual o modelo de negocio, **pregunta a Luis antes de escribir las tareas**.
- Escribe en castellano, con frases cortas. Luis lee esto entre otras cosas.

## Pasos

1. **Lee el contexto:** `CLAUDE.md`, `docs/ROADMAP.md`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `STRUCTURE.md`, `tasks/README.md` y las tareas existentes. Mira el código solo lo justo para saber qué existe ya.
2. **Entiende la petición:**
   - `bloque N`: divide ese bloque de la hoja de ruta en tareas.
   - Una idea: conviértela en tareas y di en qué bloque encaja.
   - `revisar` o vacío: repasa las tareas pendientes. Divide las `L`, actualiza dependencias, marca como `bloqueada` lo que espera algo de Luis y propone el orden.
   - Una tarea `L` (por ejemplo `T-015`): divídela en tareas `S` o `M`. La original se borra y su id no se reutiliza.
3. **Si hay dudas de producto, para y pregunta.** Haz como mucho tres preguntas concretas, con tu recomendación en cada una.
4. **Escribe las tareas** con el formato de `tasks/README.md`:
   - Cada tarea cabe en un pull request y se puede probar sola. Tamaño `S` (≈ 1 sesión de 3 h) o `M` (2–3 sesiones). Si sale `L`, divídela.
   - Criterios de aceptación comprobables: «con la semilla 42 el mapa es igual dos veces», no «el mapa funciona bien».
   - «Fuera de alcance» explícito, para que `/desarrollar` no crezca.
   - Dependencias reales, no por orden de escritura.
   - `necesita_a_luis: sí` y `estado: bloqueada` si hace falta una decisión, una cuenta o un recurso suyo; explica qué en Notas.
   - Ids nuevos: el siguiente número libre (`T-020`, `T-021`…). Nunca reutilices uno.
5. **Actualiza el índice** de `tasks/README.md` y, si cambian los bloques, `docs/ROADMAP.md`.
6. **Enséñale el resultado a Luis** antes de guardar en git: lista corta de tareas nuevas o cambiadas, el orden recomendado y lo que necesita de él.
7. **Cuando Luis diga que vale**, haz commit en `main` solo con `tasks/` y `docs/ROADMAP.md` (por ejemplo «Planifica el bloque 2: mapa») y pregúntale si lo sube (`git push`).

## Al terminar

Di en dos o tres frases qué tarea recomiendas hacer primero con `/desarrollar` y por qué.
