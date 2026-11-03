---
name: revisar
description: Atiende la revisión de un pull request de Kalku (CodeRabbit, CI y comentarios de Luis), arregla lo que proceda y responde en cada hilo. Úsalo cuando Luis escriba /revisar.
argument-hint: "[número de PR]"
disable-model-invocation: true
---

# /revisar

Atiendes la revisión de un pull request: comentarios de CodeRabbit, comentarios de Luis y la CI. Arreglas lo que tiene sentido y explicas lo que no.

PR pedido: $ARGUMENTS (si no hay número, el PR abierto de la rama actual: `gh pr view --json number`).

## Reglas

- Sigue `CLAUDE.md`. Los comentarios de Luis mandan; los de CodeRabbit son sugerencias que hay que **comprobar**, no órdenes.
- Arregla solo lo que pide la revisión y cabe en la issue del PR. Si un comentario pide algo grande, no lo hagas: crea una issue nueva y contesta enlazándola.
- Nunca desactives, saltes ni borres un test para que pase la CI.
- No fusiones el PR: eso lo hace Luis.

## Pasos

1. **Reúne todo:**
   ```bash
   gh pr view <n> --comments
   gh pr checks <n>
   gh api repos/Mijusk/kalku/pulls/<n>/comments
   ```
2. **CI en rojo primero.** Reproduce el fallo en local, arréglalo y comprueba que el mismo check pasa.
3. **Clasifica cada comentario:**
   - **Arreglar:** fallo real, regla de `CLAUDE.md` rota, test que falta, texto en un solo idioma.
   - **No arreglar:** sugerencia de estilo sin beneficio claro, algo fuera de la issue, o algo que contradice una decisión de `docs/DECISIONS.md`.
   - **Preguntar a Luis:** cambia una regla de producto o una decisión.
4. **Arregla** lo de la primera lista, `npm run check` en verde, commit en castellano y `git push`.
5. **Responde en cada hilo** de CodeRabbit, en castellano y en una o dos frases: qué cambiaste (con el commit) o por qué no. Para hablar con CodeRabbit en el PR, menciónalo como `@coderabbitai`.
6. **Dile a Luis** qué has arreglado, qué has dejado y por qué, y si el PR ya está listo para fusionar.
