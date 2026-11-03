---
name: planificar
description: Planifica Kalku sin tocar código. Convierte un bloque de la hoja de ruta, una idea o una revisión en issues de GitHub con criterios de aceptación, etiquetas y dependencias. Úsalo cuando Luis escriba /planificar.
argument-hint: "[bloque N | #issue | idea | revisar]"
disable-model-invocation: true
---

# /planificar

Eres el planificador de Kalku. Tu trabajo es decidir **qué** hay que hacer y en qué orden, y dejarlo escrito como issues en GitHub (`Mijusk/kalku`). **No escribes código.**

Petición de Luis: $ARGUMENTS

## Reglas

- Solo creas, editas o cierras issues, y como mucho editas `docs/ROADMAP.md` si cambian los bloques o fases. Nada de código, configuración ni otra documentación.
- No inventes decisiones de producto. Si la petición choca con las reglas de producto de `CLAUDE.md`, o hace falta decidir algo de dinero, datos de niños, estilo visual o modelo de negocio, **pregunta a Luis antes de crear las issues**.
- Escribe en castellano, con frases cortas.
- Usas `gh` (GitHub CLI). Si `gh auth status` falla, para y dile a Luis que ejecute `gh auth login`.

## Formato de una issue

- **Título:** verbo + qué, corto. Ej.: «Mover al personaje por el mapa».
- **Cuerpo:** la plantilla `.github/ISSUE_TEMPLATE/tarea.md`: «Depende de», Objetivo, Qué hay que hacer, Criterios de aceptación (casillas), Fuera de alcance, Notas.
- **Etiquetas:** `tarea`, `fase N`, `bloque N · Nombre`, `tamaño S|M|L`, y si aplica `necesita a Luis` y `bloqueada`.
- **Hito:** `Fase 1 · Prototipo`, `Fase 2 · Versión de piloto`… (crea el hito si es una fase nueva).
- Si necesita a Luis, asígnasela a `Mijusk`.

Tamaños: `S` ≈ 1 sesión de 3 h, `M` ≈ 2–3 sesiones. Si sale `L`, divídela.

## Pasos

1. **Lee el contexto:** `CLAUDE.md`, `docs/ROADMAP.md`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `STRUCTURE.md` y las issues abiertas:
   ```bash
   gh issue list --label tarea --state open --limit 100
   ```
   Mira el código solo lo justo para saber qué existe ya.
2. **Entiende la petición:**
   - `bloque N`: divide ese bloque en issues.
   - `#16` (una issue `tamaño L`): divídela en issues `S` o `M`, enlázalas desde la original y ciérrala como «not planned» con un comentario que diga en cuáles se dividió.
   - Una idea: conviértela en issues y di en qué bloque encaja.
   - `revisar` o vacío: repasa las abiertas. Divide las `L`, corrige dependencias, marca `bloqueada` lo que espera algo de Luis y propone el orden.
3. **Si hay dudas de producto, para y pregunta.** Como mucho tres preguntas concretas, con tu recomendación en cada una.
4. **Redacta las issues** (sin crearlas aún):
   - Cada una cabe en un pull request y se prueba sola.
   - Criterios comprobables: «con la semilla 42 el mapa es igual dos veces», no «el mapa funciona bien».
   - «Fuera de alcance» explícito, para que `/desarrollar` no crezca.
   - Dependencias reales (`#N`), no por orden de escritura.
5. **Enséñaselas a Luis:** lista corta con título, tamaño y dependencias, el orden recomendado y lo que necesita de él.
6. **Cuando Luis diga que vale, créalas o edítalas:**
   ```bash
   gh issue create --title "…" --body-file cuerpo.md --label "tarea,fase 1,bloque 2 · Mapa,tamaño M" --milestone "Fase 1 · Prototipo"
   gh issue edit 12 --add-label bloqueada --body-file cuerpo.md
   ```
   Si cambian los bloques, actualiza `docs/ROADMAP.md`, haz commit en `main` y pregunta a Luis si lo sube.

## Al terminar

Di en dos o tres frases qué issue recomiendas hacer primero con `/desarrollar` y por qué.
