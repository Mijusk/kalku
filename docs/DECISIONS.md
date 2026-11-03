# Decisiones

Registro de decisiones del proyecto: qué se decidió, por qué y qué alternativas se descartaron. La más reciente arriba. Antes de cambiar algo de esta lista, habla con Luis y añade una entrada nueva en vez de borrar la vieja.

## 2026-11-03 · Interpretación del motor de dominio (+8/+5/−6/−3)

El documento de diseño da los números pero no a qué corresponde cada uno. Se interpreta así:

- +8 acierto a la primera; +5 acierto tras pista o fallo.
- −6 fallo en ejercicio de su nivel o de repaso; −3 fallo en ejercicio de reto.
- El dominio se aplica **una vez por ejercicio** (no por intento). Si acierta tras fallar, cuenta como +5.
- Habilidad dominada: dominio ≥ 80 y al menos 10 respuestas. Da una gema de dominio.

**Por qué:** fallar un reto es arriesgarse, y el diseño dice que arriesgarse no debe castigar igual.

## 2026-11-03 · Estructura: monorepo con paquete de ejercicios puro

`packages/exercises` (TypeScript sin dependencias del navegador) + `apps/game` (Phaser). npm workspaces, Vite, Vitest.

**Por qué:** el servidor tendrá que validar respuestas con la misma lógica; separarla desde el principio evita duplicarla.

## 2026-11-03 · Phaser 3.90 y TypeScript 5.9

Phaser 4 ya existe, pero la mayoría de ejemplos y documentación siguen siendo de Phaser 3, y 3.90 es estable. TypeScript 5.9 en vez de 7 para evitar sorpresas con las herramientas.

**Revisar:** cuando el prototipo esté hecho, valorar migrar a Phaser 4.

## 2026-11-03 · Progreso en localStorage (provisional)

En la fase 1 el progreso se guarda en el navegador para poder probar sin servidor. En la fase 2 pasa a Supabase en la UE con validación en el servidor.

## 2026-11-02 · Pixel art, mapas por código, sin editor visual

- Pixel art visto desde arriba, casillas de 32×32 cuando haya pack de gráficos.
- Mapas generados por código por región, con semilla fija (todos ven el mismo mundo). Lugares especiales escritos como texto. Sin Tiled.
- Criaturas y objetos como datos; personaje por capas de PNG.
- Ejercicios en HTML con letra grande, no en píxeles.

**Por qué:** Luis no quiere colocar cosas a mano en un editor; lo quiere todo en código. Hay muchos packs de pixel art y Phaser trabaja bien con casillas.

**Descartado:** Tiled (editor visual), estilo de dibujo animado (necesita ilustrador).

## 2026-11-02 · Web primero, apps después

Web instalable (PWA) primero; apps de Android e iPhone con Capacitor cuando el juego funcione. Los pagos, en la web (Stripe).

**Por qué:** los colegios tienen de todo (Chromebooks, tablets, pizarras); un único código; actualizaciones al momento; sin la comisión del 15–30 % de las tiendas.

## 2026-11-02 · Modelo de negocio: gratis para el niño, pagan los adultos, sin anuncios

Planes Gratis, Familia (4,99 €/mes o 39,99 €/año), Docente gratis y Centro (2 €/alumno/año). Todo online, sin comerciales.

**Por qué:** los anuncios rendirían unos 50 €/mes con 600 alumnos, chocan con la DSA (art. 28) y la LOPDGDD, los colegios no los aceptan, y ver un anuncio para ganar XP rompe el principio 1.

**Descartado:** anuncios recompensados (idea inicial de Luis); venta colegio a colegio.

## 2026-11-02 · Nombre: Kalku

Nombre provisional anterior: Mundo Cifra. «Kalku» viene de cálculo / càlcul; las criaturas son «kalkus». Dominio previsto: kalkujuego.com (aún sin comprar). Marca sin registrar; en TMview no aparece «Kalku» en España/UE para software o educación (ojo con KALKUM, OEPM M2131696, clase 9).
