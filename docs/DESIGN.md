# Diseño del juego (resumen)

Resumen del documento de diseño de Luis (2 de noviembre de 2026) y de lo hablado después. Si algo de aquí choca con el código, manda este documento; si choca con una decisión más reciente, manda [DECISIONS.md](DECISIONS.md).

## Visión

Kalku es un juego de aventuras 2D donde cada combate y cada reto se ganan resolviendo ejercicios de matemáticas (más adelante, lengua y ciencias). Para niños de 6 a 12 años, en casa y en clase.

Frase: «Un juego de criaturas y mates, gratis para el niño, seguro y útil para el profe».

Referencias: Prodigy Math (misma idea, en inglés, con suscripción que bloquea cosas al niño), Smartick, Khan Academy Kids, DragonBox. Nos diferenciamos en: castellano y catalán, LOMLOE, nada de pago para el niño, RGPD, uso en clase.

## Tres principios

1. Aprender es la única forma de avanzar.
2. Cada niño juega a su nivel (70–85 % de aciertos).
3. Los adultos ven el aprendizaje, no solo el juego.

## Públicos

| Usuario | Quiere | Le damos |
| --- | --- | --- |
| Niño (6–12) | Divertirse, progresar, presumir | Aventura, criaturas (kalkus), tienda, logros, duelos |
| Familia | Que practique sin pelearse, saber cómo va | Resumen semanal gratis; Plan Familia con informes y límites |
| Docente | Reforzar lo de clase, ver quién se queda atrás | Clases con QR, tareas, mapa de dominio, Clase en directo |

## Modos de juego

- **Aventura (casa):** mundo libre; el motor adaptativo elige los ejercicios.
- **Tarea:** el docente fija un tema y los combates de esa semana lo priorizan.
- **Clase en directo:** toda la clase contra un jefe común desde la pizarra digital. Cooperación, no ranking.
- **Duelo:** dos amigos, cada uno con ejercicios de su nivel.
- **Sin conexión:** práctica básica sin internet; sincroniza al volver.

## Bucle y economía

Bucle de 2–5 minutos: explorar → reto → resolver → recompensa → mejorar → zonas nuevas.

- **Cifras** (moneda): en cada combate; solo para cosmética (ropa, casa).
- **Experiencia:** solo acertando; sube el nivel del personaje y sus criaturas.
- **Gemas de dominio:** al dominar una habilidad; desbloquean regiones y criaturas raras.

Puntos: base × dificultad, bonus de racha, bonus de rapidez con tope (lento nunca resta). Fallar no quita monedas: pista y otra oportunidad con menos puntos. Límite diario de monedas por ejercicios demasiado fáciles.

## Combate por turnos

| Acción | Ejercicio | Efecto |
| --- | --- | --- |
| Ataque rápido | 1 fácil de su nivel | Daño pequeño, casi seguro |
| Ataque fuerte | 1 un escalón por encima | Daño grande; si falla, no pasa nada |
| Combo | 3 seguidos con tiempo | Crítico si acierta los 3 |
| Curar / defender | 1 problema con texto | Recupera vida o reduce daño |
| Criatura | Del tipo de la criatura | Ataque especial |

Tipos elementales ligados a habilidades (Suma, Resta, Multiplicación…). Un enemigo de Resta es débil a Suma (operación inversa).

Formatos: resultado, completar el hueco, opciones, ordenar, recta numérica, bloques, problemas con texto y voz, estimación.

Accesibilidad: tiempo desactivable, lectura en voz alta, texto ampliable.

## Mundo

Mundo 2D visto desde arriba, en pixel art, generado por código. Cada región es un bloque del currículo y se desbloquea con gemas de la anterior (o con una prueba de nivel).

| Región | Contenido | Curso |
| --- | --- | --- |
| Pradera Uno | Contar, sumas y restas hasta 20 | 1.º |
| Bosque de las Decenas | Sumas y restas hasta 100, llevando | 1.º–2.º |
| Montañas Tabla | Tablas de multiplicar | 2.º–3.º |
| Desierto Reparto | División, problemas de dos pasos | 3.º–4.º |
| Costa Fracción | Fracciones y decimales | 4.º–5.º |
| Ciudad Geometría | Medidas, áreas, ángulos | 4.º–6.º |
| Islas Incógnita | Proporciones, porcentajes, álgebra | 6.º+ |

## Modelo de negocio

Gratis para el niño, sin anuncios. Pagan los adultos, todo online y sin comerciales:

| Plan | Precio | Incluye |
| --- | --- | --- |
| Gratis | 0 € | Todo el juego, resumen semanal |
| Plan Familia | 4,99 €/mes o 39,99 €/año | Hasta 4 hijos, informes, límites de tiempo, avisos, sin conexión |
| Docente | 0 € | Una clase de hasta 30 alumnos |
| Centro | 2 €/alumno/año, mínimo 99 € | Todas las clases, Clase en directo, panel de dirección, Plan Familia para las familias del centro |

Crecimiento: los profes lo usan gratis, los niños lo llevan a casa, las familias lo descubren. Contenido propio en redes en vez de publicidad pagada.

## Cuentas y progreso

- El progreso vive en el servidor (Supabase, UE), ligado al niño, no al aparato.
- Cuenta de centro → profes con código → clases con QR → alumnos entran con QR o con el código de su tarjeta (p. ej. «LEÓN-47») + «toca tu animal».
- Sin clase: cuenta anónima con apodo; se pide pronto el correo de los padres (consentimiento para menores de 14).
- Copia local para jugar sin conexión; sincroniza sola.
- Respuestas validadas en el servidor.
