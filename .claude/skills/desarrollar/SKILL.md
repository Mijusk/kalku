---
name: desarrollar
description: Implementa UNA issue de Kalku, con tests, en su propia rama, abre un pull request que la cierra y sigue con la revisión hasta fusionarlo o dejárselo a Luis. Úsalo cuando Luis escriba /desarrollar.
argument-hint: "[#issue]"
disable-model-invocation: true
---

# /desarrollar

Eres el desarrollador de Kalku. Implementas **una sola issue**, bien hecha y probada, en un pull request. CodeRabbit lo revisa automáticamente; tú atiendes su revisión y lo fusionas si todo está bien, o se lo dejas a Luis.

Issue pedida: $ARGUMENTS

## Reglas

- Sigue `CLAUDE.md` al pie de la letra: reglas de producto, convenciones y comandos.
- Haz **solo** lo que dice la issue. Si descubres trabajo extra necesario, no lo hagas: crea una issue nueva con la plantilla de tarea y menciónala al final.
- No cojas issues con `tamaño L`, `bloqueada`, o con dependencias abiertas. Si te piden una, explica por qué no y propone `/planificar`.
- Si la issue es ambigua o te obliga a decidir algo de producto, para y pregunta a Luis antes de escribir código.
- Nunca desactives, saltes ni borres un test para que pase la CI.
- Usas `gh`. Si `gh auth status` falla, para y dile a Luis que ejecute `gh auth login`.

## Pasos

1. **Elige la issue.**
   - Con número (`#6` o `6`): esa.
   - Sin número: la de número más bajo que esté abierta, con `tarea`, sin `bloqueada` ni `tamaño L`, y con todas sus «Depende de» cerradas:
     ```bash
     gh issue list --label tarea --state open --limit 100 --json number,title,labels,body
     ```
   - Dile a Luis cuál vas a hacer y por qué, en una frase.
2. **Prepara la rama.** Comprueba que no hay cambios sin guardar (`git status`); si los hay, pregunta. Luego:
   ```bash
   git checkout main && git pull
   git checkout -b tarea/<numero>-<titulo-corto>
   ```
3. **Lee** la issue entera (`gh issue view <n>`), `CLAUDE.md`, `STRUCTURE.md` y el código que vas a tocar.
4. **Implementa** con pasos pequeños:
   - La lógica pura va en `packages/` y lleva tests.
   - Todo texto visible, en castellano y catalán.
   - Nada aleatorio sin semilla.
5. **Comprueba.**
   - `npm run check` tiene que pasar entero.
   - Repasa cada criterio de aceptación. Si algo es visual, arranca el juego (`npm run dev`) y compruébalo; si no puedes verlo, dilo en el PR.
6. **Actualiza la documentación** en la misma rama:
   - `STRUCTURE.md` si has creado carpetas o ficheros importantes.
   - `docs/DECISIONS.md` si tomaste una decisión que otro debería conocer.
   - `docs/ROADMAP.md` si con esta issue se completa un punto.
7. **Guarda y sube.** Commits en castellano e imperativo («Añade el generador de terreno»). Luego `git push -u origin <rama>`.
8. **Abre el pull request** con la plantilla `.github/pull_request_template.md`. La primera línea es `Closes #<numero>`, para que la issue se cierre al fusionar. Marca solo los criterios que comprobaste de verdad.
   ```bash
   gh pr create --title "<título de la issue>" --body-file pr.md
   ```
9. **Sigue con la revisión** sin esperar a Luis: haz los pasos de `.claude/skills/revisar/SKILL.md` con este PR (esperar a CodeRabbit, atender comentarios, responder y fusionar si se cumplen todas sus condiciones, o dejarlo con la etiqueta `necesita a Luis`).

## Al terminar

Cuéntale a Luis, en pocas líneas:
- Qué issue has hecho y el enlace al PR.
- Si está **fusionado**, o qué le toca hacer a él (por ejemplo, comprobar algo en el móvil y fusionar).
- Cómo probarlo (qué abrir y qué debería ver; la web es https://kalku-6ty.pages.dev).
- Qué dijo CodeRabbit y qué arreglaste o dejaste.
- Issues nuevas que hayas creado.
