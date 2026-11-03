---
name: revisar
description: Atiende la revisión de un pull request de Kalku (CodeRabbit, CI y comentarios de Luis), arregla lo que proceda, responde en cada hilo y lo fusiona si todo está bien. Úsalo cuando Luis escriba /revisar.
argument-hint: "[número de PR]"
disable-model-invocation: true
---

# /revisar

Atiendes la revisión de un pull request: comentarios de CodeRabbit, comentarios de Luis y la CI. Arreglas lo que tiene sentido, explicas lo que no y, si todo está bien, **lo fusionas**. Si no, se lo dejas a Luis.

PR pedido: $ARGUMENTS (si no hay número, el PR abierto de la rama actual: `gh pr view --json number`).

## Reglas

- Sigue `CLAUDE.md`. Los comentarios de Luis mandan; los de CodeRabbit son sugerencias que hay que **comprobar**, no órdenes.
- Arregla solo lo que pide la revisión y cabe en la issue del PR. Si un comentario pide algo grande, no lo hagas: crea una issue nueva y contesta enlazándola.
- Nunca desactives, saltes ni borres un test para que pase la CI.
- Fusiona **solo** si se cumplen todas las condiciones del paso 7. Ante la duda, no fusiones: déjaselo a Luis.

## Pasos

1. **Espera a que terminen los checks.** Si CodeRabbit o la CI siguen pendientes, espera (en segundo plano si hace falta):
   ```bash
   gh pr checks <n> --watch --interval 30
   ```
   Si a los 20 minutos CodeRabbit sigue pendiente, para: pon la etiqueta `necesita a Luis` al PR y díselo.
2. **Reúne todo:**
   ```bash
   gh pr view <n> --comments
   gh pr checks <n>
   gh api --paginate repos/Mijusk/kalku/pulls/<n>/comments
   gh api --paginate repos/Mijusk/kalku/pulls/<n>/reviews
   ```
   Lee también el cuerpo de las reviews de CodeRabbit: ahí van los «Nitpick comments» y los «Outside diff range comments», que no son hilos.
3. **CI en rojo primero.** Reproduce el fallo en local, arréglalo y comprueba que el mismo check pasa.
4. **Clasifica cada comentario:**
   - **Arreglar:** fallo real, regla de `CLAUDE.md` rota, test que falta, texto en un solo idioma.
   - **No arreglar:** sugerencia de estilo sin beneficio claro, algo fuera de la issue, o algo que contradice una decisión de `docs/DECISIONS.md`.
   - **Preguntar a Luis:** cambia una regla de producto o una decisión.
5. **Ponte en la rama del PR** antes de tocar nada: comprueba que no hay cambios sin guardar (`git status`) y ejecuta `gh pr checkout <n>`. Luego **arregla** lo de la primera lista, `npm run check` en verde, commit en castellano y `git push`. Si has subido cambios, vuelve al paso 1 **una vez** para que CodeRabbit y la CI revisen lo nuevo. Si en esa segunda vuelta CodeRabbit pide más arreglos de verdad, haz esa ronda, pero no una tercera: déjaselo a Luis.
6. **Responde en cada hilo** de CodeRabbit, en castellano y en una o dos frases: qué cambiaste (con el commit) o por qué no. Para hablar con CodeRabbit en el PR, menciónalo como `@coderabbitai`.
7. **Fusiona o déjaselo a Luis.**

   Fusiona solo si se cumple **todo**:
   - Todos los checks en verde (`check`, CodeRabbit y Cloudflare Pages).
   - Cada hilo de CodeRabbit tiene respuesta y no queda nada en «Preguntar a Luis».
   - No hay comentarios de Luis sin atender.
   - Todos los criterios de aceptación del cuerpo del PR están marcados (`- [x]`, ninguno `- [ ]`).
   - El PR no toca dinero, datos de niños ni una regla de producto de `CLAUDE.md`.

   No lo fusiones si queda un criterio que solo puede comprobar Luis (verlo en pantalla, en el móvil…): esos se los deja a él.

   Si se cumple todo:
   ```bash
   gh pr merge <n> --merge --delete-branch
   git checkout main && git pull
   ```
   Si no, pon la etiqueta y explica por qué en un comentario del PR:
   ```bash
   gh pr edit <n> --add-label "necesita a Luis"
   gh pr comment <n> --body "…qué falta y qué tiene que hacer Luis…"
   ```
8. **Dile a Luis** qué has arreglado, qué has dejado y por qué, y si lo has fusionado o qué le queda por hacer a él.
