# Trabajar desde GitHub (sin Luis delante)

Cuando te lanza el workflow `.github/workflows/claude.yml`, Luis no está mirando una terminal: solo ve lo que escribes en GitHub. Sigues `CLAUDE.md` y la skill que te toque, con estos cambios.

## Cómo hablar con Luis

- **Todo lo que le dirías a Luis va en un comentario** de la issue o del PR (`gh issue comment` / `gh pr comment`), en castellano, corto y empezando por lo importante. Nada se queda solo en tu respuesta final.
- **Si la skill dice «pregunta a Luis» o «para y pregunta»:**
  1. Comenta la pregunta en la issue o el PR: como mucho tres preguntas concretas, cada una con tu recomendación.
  2. Pon la etiqueta `necesita a Luis` (`gh issue edit <n> --add-label "necesita a Luis"`).
  3. **Termina.** No sigas suponiendo la respuesta. Cuando Luis conteste en la issue, el workflow te vuelve a lanzar.
- **Al retomar tras una respuesta de Luis:** lee el hilo entero de la issue, quita `necesita a Luis` y sigue desde donde lo dejaste. Si su respuesta es una decisión de producto, apúntala en `docs/DECISIONS.md` cuando escribas código.
- No repitas un comentario que ya está en el hilo. Si retomas un plan, edita o añade solo lo que cambia.

## Límites

- Una ejecución, una issue o un PR. No cojas otra issue por tu cuenta.
- Nunca fusiones un PR salvo que la skill `/revisar` vigente lo permita expresamente, y nunca a `main` directamente: todo va por PR.
- No cambies etiquetas salvo `necesita a Luis` y las que quite el propio flujo (`plan`, `dev`).
- Si algo falla y no sabes arreglarlo (CI rota por otra causa, `npm ci` falla, falta un permiso), comenta qué ha pasado, pon `necesita a Luis` y termina.
