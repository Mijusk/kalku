# Temario de un centro

Un colegio o un docente puede poner su propio temario en Kalku. De momento se escribe a mano en un fichero JSON (lo puede hacer Luis con lo que le mande el centro); más adelante se rellenará desde el panel de docentes.

## Dónde va

Un fichero por centro en `packages/content/temarios/<id>.json`. El nombre del fichero tiene que ser el `id` del temario. Al fusionar en `main`, el juego lo incluye solo: no hay que tocar código. Los tests comprueban cada fichero y, si algo está mal, dicen qué y dónde (en castellano).

Ejemplo completo: [`colegio-de-prueba.json`](../packages/content/temarios/colegio-de-prueba.json).

## Formato

```json
{
  "id": "colegio-sol",
  "name": { "es": "CEIP Sol · 1.º", "ca": "Escola Sol · 1r" },
  "units": [
    {
      "id": "sumas-hasta-10",
      "name": { "es": "Sumas hasta 10", "ca": "Sumes fins a 10" },
      "skills": ["add-within-10"],
      "questions": [
        {
          "text": { "es": "Hay 4 tomates y 3 más. ¿Cuántos hay?", "ca": "Hi ha 4 tomàquets i 3 més. Quants n'hi ha?" },
          "answer": 7,
          "hint": { "es": "Cuenta desde 4.", "ca": "Compta des de 4." }
        }
      ]
    }
  ]
}
```

- `id`: minúsculas y guiones.
- Todo texto lleva castellano (`es`) y catalán (`ca`).
- `skills`: habilidades del currículo de Kalku que trabaja la unidad. Pueden ser: `add-within-10`, `sub-within-10`, `add-within-20-no-carry`, `sub-within-20-no-borrow`, `add-within-20-carry`, `sub-within-20-borrow`, `word-problems-within-10`.
- `questions`: preguntas propias del centro. `answer` es un número entero (0–9999). `hint` es opcional.
- Cada unidad necesita al menos una habilidad o una pregunta.

## Cómo se usa en el juego

- Se activa en un dispositivo abriendo el juego con `?temario=<id>` (por ejemplo `https://kalku-6ty.pages.dev/?temario=colegio-de-prueba`). Se recuerda en ese dispositivo. `?temario=` (vacío) lo quita.
- Las preguntas propias salen en los **acertijos de Pedrolo** (capítulo 4), en orden. Sin temario, los acertijos son problemas generados.
- Las preguntas propias dan monedas y XP como cualquier acierto, pero **no cuentan para el dominio** de ninguna habilidad (no sabemos cuál trabajan). Fallar nunca quita nada, igual que en el resto del juego.

## Lo que falta (siguiente paso)

- Que el docente asigne el temario a su clase desde `/docentes`, sin `?temario=`.
- Usar `skills` para que los combates practiquen lo que toca en clase esa semana.
- Preguntas propias también en los combates contra problemus.
