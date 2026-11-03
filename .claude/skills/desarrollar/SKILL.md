---
name: desarrollar
description: Implementa UNA tarea de tasks/ en Kalku, con tests, en su propia rama, y abre un pull request. Úsalo cuando Luis escriba /desarrollar.
argument-hint: "[T-NNN]"
disable-model-invocation: true
---

# /desarrollar

Eres el desarrollador de Kalku. Implementas **una sola tarea** de `tasks/`, bien hecha y probada, y la dejas en un pull request para que Luis la revise.

Tarea pedida: $ARGUMENTS

## Reglas

- Sigue `CLAUDE.md` al pie de la letra: reglas de producto, convenciones y comandos.
- Haz **solo** lo que dice la tarea. Si descubres trabajo extra necesario, no lo hagas: crea una tarea nueva en `tasks/` (siguiente id libre, estado `pendiente`) y menciónala al final.
- No toques tareas `L`, `bloqueadas` ni con dependencias sin hacer. Si te piden una, explica por qué no y propone `/planificar`.
- Si la tarea es ambigua o te obliga a decidir algo de producto, para y pregunta a Luis antes de escribir código.
- Nunca desactives, saltes ni borres un test para que pase la CI.

## Pasos

1. **Elige la tarea.**
   - Con id (`T-005`): esa.
   - Sin id: la primera de `tasks/README.md` con `estado: pendiente`, tamaño `S` o `M`, y todas sus dependencias `hecha`.
   - Dile a Luis cuál vas a hacer y por qué, en una frase.
2. **Prepara la rama.** Comprueba que no hay cambios sin guardar (`git status`); si los hay, pregunta. Luego:
   ```bash
   git checkout main && git pull
   git checkout -b tarea/T-NNN-titulo-corto
   ```
3. **Lee** la tarea entera, `CLAUDE.md`, `STRUCTURE.md` y el código que vas a tocar.
4. **Implementa** con pasos pequeños:
   - La lógica pura va en `packages/` y lleva tests.
   - Todo texto visible, en castellano y catalán.
   - Nada aleatorio sin semilla.
5. **Comprueba.**
   - `npm run check` tiene que pasar entero.
   - Repasa cada criterio de aceptación y márcalo `[x]` solo si lo has comprobado de verdad. Si algo es visual, arranca el juego (`npm run dev`) y compruébalo; si no puedes verlo, dilo en el PR.
6. **Actualiza la documentación** en la misma rama:
   - La tarea: `estado: hecha` y una línea en Notas con lo más importante que hiciste.
   - El índice de `tasks/README.md`.
   - `STRUCTURE.md` si has creado carpetas o ficheros importantes.
   - `docs/DECISIONS.md` si tomaste una decisión que otro debería conocer.
   - `docs/ROADMAP.md` si con esta tarea se completa un punto.
7. **Guarda y sube.** Commits en castellano e imperativo («Añade el generador de terreno»). Luego `git push -u origin <rama>`.
8. **Abre el pull request** con `gh pr create` usando `.github/pull_request_template.md`. Si `gh` no está instalado o no tiene sesión, dale a Luis el enlace para crearlo:
   `https://github.com/Mijusk/kalku/compare/main...<rama>?expand=1`

## Al terminar

Cuéntale a Luis, en pocas líneas:
- Qué tarea has hecho y el enlace al PR.
- Cómo probarlo (qué abrir y qué debería ver).
- Cualquier criterio que no hayas podido comprobar.
- Tareas nuevas que hayas creado.
- Cuál sería la siguiente tarea disponible.
