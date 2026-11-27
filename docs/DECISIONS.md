# Decisiones

Registro de decisiones del proyecto: qué se decidió, por qué y qué alternativas se descartaron. La más reciente arriba. Antes de cambiar algo de esta lista, habla con Luis y añade una entrada nueva en vez de borrar la vieja.

## 2026-11-27 · La casa del niño

- **Contexto:** tras el compañero, Luis pidió seguir con lo siguiente («no pares»). Las Cifras se acumulaban sin mucho en qué gastarlas y faltaba un sitio propio en el juego. Modo autónomo: decide Claude.
- **Qué es:** la primera casa del pueblo de Pradera Uno es la del niño. Se entra parándose en su puerta o con el botón «Mi casa» del mapa (desde cualquier región; al salir vuelve al mismo sitio). Dentro, una habitación vista de frente con su personaje y su compañero junto a la puerta.
- **Decorar:** se toca un mueble abajo (o uno ya puesto) y luego un sitio del suelo. Si no cabe, lo dice y no pasa nada. «Guardar en la caja» lo quita sin perderlo. Las alfombras van debajo de los demás muebles.
- **Muebles como datos (`home.ts`) y dibujados por código (`art/furniture.ts`):** 16 muebles de 14 dibujos. Cama y mesa desde el principio; 11 se compran con Cifras (60 a 400, algunos desde un nivel); copas con las gemas de sumar y restar hasta 10; telescopio al nivel 8. Mismas reglas que la ropa: **nada da ventaja**, lo de nivel o gema no se puede comprar antes, y un guardado con muebles que no se tienen o que no caben los devuelve a la caja.
- Se guarda como `home` (comprados y colocados).

## 2026-11-27 · Compañero y tienda del Bosque

- **Contexto:** tras los objetos, Luis pidió seguir con los siguientes pasos. Modo autónomo: decide Claude.
- **Compañero:** en la Colección, cada criatura rescatada tiene «Que me acompañe». La elegida anda un paso por detrás del personaje en el mapa (más pequeña que las salvajes para no confundirla) y en el combate se queda detrás y salta de alegría al acertar. Si se rescató brillante, va brillante. **No da ninguna ventaja:** no cambia daño, vida ni Cifras. Contra el jefe, el amigo que sale a ayudar entre fases (ya existía, #109) pasa a ser el compañero, para no duplicarlo. Se guarda como `companion` y se descarta si la criatura ya no está en la colección.
- **Tienda en el Bosque:** el campamento de Olma tiene una tienda pequeña con el mismo catálogo; se añaden dos objetos del bosque (gorro de bellota, nivel 6; capa de hojas, nivel 7).

## 2026-11-27 · Objetos: tienda, armario, cofre sorpresa y límite de Cifras (#12, #13, #72)

- **Contexto:** Luis pidió «tema items y cosas random». Las Cifras no servían para nada y los tesoros de las zonas eran solo un nombre. Modo autónomo: decide Claude, pensando en cómo lo vería un colegio.
- **Objetos = piezas del personaje, como datos (`outfit.ts`):** dos capas nuevas, **espalda** (capas, detrás del cuerpo) y **sombrero** (encima de todo). Cada pieza dice cómo se consigue (`get`): sin campo, desde el principio; `shop` (Cifras, con nivel o gema opcional); `treasure` (cofre de una zona); `level`; `gem`; `gift` (cofre sorpresa). Ninguna pieza tiene datos de combate (test): son solo dibujo y nombre (regla 1). La piel y el pelo nunca se compran.
- **Tienda del pueblo (#12):** se entra parándose delante de la puerta de la tienda de Pradera Uno. 9 objetos de 120 a 1000 Cifras. Tocar uno lo prueba en el personaje (gratis); «Comprar» solo sale si se puede comprar ya y se activa con Cifras suficientes. Lo que pide nivel o gema **no se puede comprar antes** (más claro para un niño de 6 años que comprar algo que no se puede poner).
- **Armario:** botón en el mapa, pestañas por capa (Sombrero, Capa, Ropa, Accesorio, Pelo, Piel) y tarjetas grandes con el personaje puesto. Lo que no se tiene sale con candado y el motivo en letra clara («Desde el nivel 6», «En el cofre de: Cueva», «En un cofre sorpresa»). Un guardado con piezas que no se tienen vuelve a la de por defecto.
- **Premios por aprender (#72):** los 5 tesoros de zona se llevan puestos (los recogidos antes cuentan solos), capa al nivel 3, diadema al 5, capa dorada al 10 e insignias con las gemas de sumar y restar hasta 10. Al ganarlas sale un aviso abajo («¡Nuevo objeto! … Póntelo en el Armario»).
- **Cofre sorpresa del día, pensado para que no parezca una apuesta:** uno al día, en una casilla fija para esa fecha y región (igual para todos, hora de Madrid), morado para distinguirlo. Se abre **resolviendo una cuenta** de su nivel (fallar da pista y otra cuenta, no quita nada). Dentro está **siempre el siguiente regalo de una lista fija** que aún no tiene: sin rarezas, sin probabilidades, sin repetidos y sin nada que comprar para tener más cofres. Cuando los tiene todos, da 30 Cifras. No se acumulan días ni se pierde nada por no entrar. Lo «sorpresa» es qué regalo toca hoy, no si toca.
- **Límite diario de Cifras (#13):** las habilidades ya dominadas dan como mucho **150 Cifras al día** (unas 10–15 respuestas); pasado el tope siguen dando dominio y experiencia, pero 0 Cifras, con un aviso amable («Esto ya lo dominas… ¡Prueba algo nuevo!»). Los ejercicios de reto y los de habilidades con menos de 40 de dominio dan un **25 % extra**. Nunca se quitan Cifras. Las preguntas propias de un temario no cuentan para el tope. Lógica pura en `@kalku/exercises` (`coinCap.ts`), con tests.
- **Descartado:** cajas de botín con rarezas, objetos que den vida o daño, comprar cofres, rachas de días que se pierden.

## 2026-11-27 · Pantalla de inicio y flujos guiados

- **Contexto:** Luis no entendía la pantalla de familia (código del niño sin explicar, casilla de consentimiento suelta, un error rojo antes de hacer nada, botones sin orden) y el juego empezaba directamente en «¿En qué curso estás?». Modo autónomo: decide Claude.
- **Pantalla de inicio (`TitleScene`):** siempre se entra por ella (salvo un alumno de clase ya dentro en la pestaña, `?clase` y `?combate`). Solo tres caminos: «Empezar a jugar» / «Seguir jugando» (con «¡Hola de nuevo, apodo!» y el nivel), «Entro con mi clase» y, arriba y pequeño, el idioma y «Familias y docentes». Lo de adultos sale de las pantallas del niño (el apodo ya no lleva botones de clase ni de familia).
- **Fondo por código, no con Phaser:** el atardecer de Pradera Uno se dibuja con `@kalku/art` (`title.ts`, con tests) en un `<canvas>` propio que cubre la pantalla con píxeles enteros, para que en un móvil vertical no salga una franja con bordes negros. Lo que se mueve (nubes, estrellas, criaturas, números que suben) se anima encima a 30 fps y se queda quieto con «reducir movimiento». El nombre «Kalku» va en letra redonda y gorda, no en fuente pixel; las cifras pixeladas que suben son adorno.
- **Una sola zona de adultos:** desde la portada y desde Ajustes, tras la cuenta, tarjetas grandes: «Soy madre, padre o tutor», «Soy docente», «Datos de este aparato» y «Privacidad».
- **Familia por pasos:** para qué sirve y correo → «Mira tu correo» con 3 pasos → tu familia → «Añadir un hijo»: ¿dónde juega? (este aparato / otro aparato con los pasos para sacar el código) → permiso explicado (qué guardamos, qué no, prueba y cómo retirarlo). «Siguiente» solo se activa con las 8 letras del código y «Dar permiso y añadir» solo al marcar la casilla: así no hay errores antes de hacer nada. Se dice «permiso» en vez de «consentimiento» en la interfaz (el texto legal sigue igual).
- **Docentes por pasos:** qué ofrece Kalku y correo → «¿Tu centro ya usa Kalku?» con tres tarjetas (tengo el código / darlo de alta / solo probar con mi clase), cada una en su pantalla. Renovar el código, dejar el centro y cerrar sesión pasan a «Más opciones».
- **Niño nuevo:** «Paso 1 de 3» (curso), «Paso 2 de 3» (apodo) y «Paso 3 de 3» (personaje).

## 2026-11-26 · Combate con gracia y sonido por código (#84, #85)

- **Contexto:** Luis vio la versión de piloto y le pareció que no había juego: todo lo hecho era invisible. Se abre el hito 3 (historia de Pradera Uno, guion en [HISTORIA.md](HISTORIA.md)) centrado en lo que ve y siente el niño. Modo autónomo: decide Claude.
- **Hechizos en vez de ataques:** «Ataque rápido» y «Ataque fuerte» pasan a llamarse **Chispa** y **Rayo**, con una línea debajo («fácil» / «reto · ×1,5»). A las criaturas no se las derrota: se les **devuelve la chispa**. Empiezan grises (filtro de color en WebGL) y recuperan el color con cada acierto.
- **Daño fijo por chispa (8, ×1,5 el rayo, ×1,5 la debilidad):** antes el daño eran los puntos del ejercicio y casi todos los combates acababan de un golpe. Ahora un combate dura 3–5 aciertos y la rapidez no cambia cuánto dura (regla 3). Las Cifras siguen saliendo de `scoreAnswer`.
- **Efectos:** escenario dibujado por código (cielo, nubes, colinas, tarimas), entrada animada, proyectil con estela, números que saltan (en HTML, letra clara), sacudida en el rayo, racha a partir de 3, burla amable al fallar y celebración con estrellas y confeti. Tras acertar se quita el teclado para que el combate se vea grande. Con «reducir movimiento» no hay sacudidas, partículas ni confeti.
- **Sonido sin ficheros (`apps/game/src/audio/sound.ts`):** efectos y cuatro melodías como datos (notas), tocados con Web Audio. Sin dependencias. Arranca en el primer toque (política de los navegadores). Ajustes «Sonido» y «Música», guardados en el progreso. El fallo suena como un «uy» suave, nunca como un zumbido de error.
- **`applyTextSize` pasa a `applySettings`:** ahora también aplica el sonido.

## 2026-11-27 · Dominio de la clase para el docente (#55)

- **Decisiones (25 nov, Claude en modo autónomo por encargo de Luis):** (1) el docente nunca ve las respuestas: solo totales por día (intentos y aciertos) y dominio por habilidad, con las funciones `class_mastery` y `class_student_days` (`security definer`, solo para quien lee la clase: su docente y la dirección del centro; `answers` sigue sin política para docentes); (2) «varios días» = 3 días con actividad seguidos por debajo del 70 %, contando solo días con al menos 5 respuestas (`FLAG_DAYS`, `FLAG_MIN_ANSWERS`); un día sin jugar o con pocas respuestas ni cuenta ni rompe la racha; (3) cuatro tramos con icono y número (0–39 «empezando», 40–69 «avanzando», 70–89 «bien», 90–100 «dominada») y casilla vacía si no ha empezado.
- **La marca se calcula en `@kalku/content` (`classProgress.ts`), no en SQL:** el servidor solo da los totales por día de los últimos 14 días; así la regla es un dato con tests y se puede cambiar sin migración.
- **Sin rankings:** la tabla va siempre por orden alfabético de apodo, nunca por dominio. Los días se cuentan en hora de Madrid.
- **Sin probar en local:** el test pgTAP (`panel_dominio.test.sql`) lo ejecuta la CI de Supabase; el panel HTML no tiene test de DOM (el proyecto no usa jsdom), se comprueba a mano.

## 2026-11-26 · Resumen semanal por correo para las familias (#56)

- **Decisiones (25 nov, Claude en modo autónomo por encargo de Luis):** (1) activado por defecto, solo para adultos con correo confirmado y al menos un niño con consentimiento, con baja en un clic en cada correo; (2) el idioma se guarda en la familia (`families.summary_locale`, por defecto `es`) y se elige en «Familia»; (3) la clave de Brevo y el remitente los pone Luis como secretos de Supabase, nunca en el repo; sin ellos el envío queda inactivo; (4) las funciones `weekly-summary` y `unsubscribe` se despliegan con `supabase-migrar.yml`; la app de Claude no puede editar workflows, así que **Luis añade a mano** al final de ese fichero: `supabase functions deploy weekly-summary --project-ref nxaehojnwutxpshqwzeo --yes --no-verify-jwt` y lo mismo con `unsubscribe` (sin `--no-verify-jwt` la baja no abriría desde el correo).
- **Cálculo en `@kalku/content` (`weeklySummary.ts`), función pura:** por niño, días jugados (día natural en Europe/Madrid), ejercicios y aciertos de la semana. «Avanza» una habilidad con al menos 3 aciertos esa semana (`ADVANCE_MIN_CORRECT`). No se guarda el historial de dominio, así que no se puede restar «dominio al final − al inicio»; esta regla se calcula solo con `answers`. El correo nunca habla de fallos (regla 2) y no se manda si nadie ha jugado.
- **Sin rastreo (regla 5):** correo de solo texto (`textContent`, sin HTML: no hay píxel posible), con un único enlace, el de baja, directo a nuestro dominio. El token va en el fragmento (`baja.html#<token>`), que el navegador no envía a ningún servidor. **Luis: confirma en Brevo (Transactional → Settings) que el seguimiento de aperturas y de clics está apagado**; la API de envío no tiene un ajuste por correo.
- **Baja sin guardar nada:** el token es `<id de familia>.<HMAC-SHA256>` con el secreto del servidor (`KALKU_JWT_SECRET`); la función `unsubscribe` (sin inicio de sesión) comprueba la firma y marca `summary_opt_out_at`. También se puede desactivar en «Familia».
- **Servidor:** `weekly_summary_data` (solo `service_role`) devuelve las familias a las que toca enviar y solo los niños con consentimiento. La tarea `weekly-summary` de `pg_cron` (lunes 07:00 UTC) llama a la función con `pg_net`; la dirección y la clave están en Vault (`weekly_summary_url`, `weekly_summary_secret`) y, si faltan, no hace nada. La función comprueba esa clave contra el secreto `SUMMARY_CRON_SECRET`.
- **Para activarlo (lo hace Luis):** secretos `BREVO_API_KEY`, `SUMMARY_SENDER`, `SUMMARY_CRON_SECRET` (y `SITE_URL` si el dominio no es kalkujuego.com) en Edge Functions; y en Vault `weekly_summary_url` (`https://<proyecto>.supabase.co/functions/v1/weekly-summary`) y `weekly_summary_secret` (el mismo valor que `SUMMARY_CRON_SECRET`).
- **Política de privacidad 0.4:** el correo del adulto se usa también para el resumen semanal; Brevo lo envía sin seguimiento.

## 2026-11-26 · Entrar en la clase con apodo + animal o con el código (#53)

- **Decisiones (25 nov, Claude en modo autónomo por encargo de Luis):** (1) límite de intentos en el servidor por alumno: tras 3 fallos seguidos, 30 s, luego 1 min y 5 min como tope; un acierto lo pone a cero y un fallo de hace más de una hora no cuenta; sin pantalla de desbloqueo (el docente regenera la tarjeta si hace falta); (2) con el QR o el id de la clase solo se ven apodos, nunca hash, pista ni animal; (3) al salir se sube lo pendiente 3 s como mucho y luego se borra todo lo local, haya red o no (la última partida sin subir se pierde); (4) `class-session` firma con `KALKU_JWT_SECRET` y se despliega sola desde `supabase-migrar.yml`.
- **Quien comprueba es el servidor.** La función SQL `class_login` (solo `service_role`) mira el animal o el hash, cuenta los fallos con la fila bloqueada (sin carreras) y devuelve el niño del alumno. La Edge Function `class-session` solo valida la petición, calcula el hash y firma la sesión (un día, sin refresco). Sin `verify_jwt`: el niño aún no tiene sesión. El mismo mensaje para «no existe» y «no es tu animal».
- **El niño nace al primer acceso:** `class_students.child_id` se rellena entonces, y se crean su cuenta anónima, su `children` y su `class_children`; así el docente ve su progreso con los permisos de #51. Regenerar la tarjeta no cambia su niño: conserva el progreso.
- **Código de la tarjeta:** además del límite por alumno, hay otro por clase (`class_login_limits`) para los códigos que no existen: tras 10 seguidos, 30 s, 1 min y 5 min; sin él, quien tuviera el QR podría probar los 5.400 códigos. 10 y no 3 para que un error de tecleo de un niño no frene a la clase.
- **Aparato compartido:** si la dirección lleva `?clase` (QR o «Entro con mi clase»), la sesión de Supabase se guarda en `sessionStorage`, no en `localStorage`. La copia local del progreso sí va en `localStorage` (jugar sin red) y se marca con `kalku:class-device`. «Salir» la borra (y la sesión). Si cierran la pestaña sin salir, la copia queda marcada pero sin sesión: al abrir el juego se borra. Entrar un alumno distinto borra siempre lo del anterior.
- **Sin código corto de clase:** las clases no tienen un código corto escribible (solo su id). Si no hay QR se pide el enlace de la tarjeta o el id de la clase. Un código corto de clase pediría esquema y pantalla del docente: queda como idea para una issue aparte.
- **Animales con dibujo:** cada animal secreto lleva un emoji (dato en `SECRET_ANIMALS`) para que los reconozca un niño que lee poco; la tarjeta impresa sigue con el nombre.

## 2026-11-25 · Zonas del mapa que se abren con gemas o nivel (#71)

- **Decisiones (25 nov, Claude en modo autónomo por encargo de Luis):** (1) el cofre de cada zona da un «tesoro» cosmético (id en los datos, guardado en `treasures` y visible en la Colección); se conectará al personaje cuando existan #11/#12 y nunca da ventaja en combate; (2) dentro salen las criaturas existentes con la habilidad de reto (`challengeSkill`); las raras nuevas irán aparte, como datos; (3) requisitos provisionales, en datos: puente roto = gema de restas llevando, cueva = nivel 3, puerta de piedra = gema de sumas llevando + nivel 5.
- **Una zona = una entrada en `ZONES` (`@kalku/content`) + un lugar con `zone` en `regions.ts` (`@kalku/world`).** La pieza se escribe como texto con `G` (puerta, no se pisa) y `K` (cofre). El mapa generado sale con la puerta cerrada y `openGate` devuelve uno nuevo con ella abierta. Las zonas salen en ramal del último lugar que no es zona, no en el camino principal.
- **`isZoneOpen(requisito, { gems, level })` no recibe monedas:** no hay forma de abrir una zona con ellas (regla 1). La prueba de nivel no da gemas ni XP, así que no abre nada; se gana jugando.
- **Se abre al acercarse (≤ 2 casillas) si se cumple el requisito**, con una animación de la puerta una sola vez; queda guardado en `zonesOpened` (en `children.extra`, sin migración de SQL) y no se repite. Sin «reducir movimiento» desaparece sin animar.
- **Cartel:** HTML con letra clara y la gema dibujada («Necesitas la gema de …», «Necesitas el nivel N»), es/ca.
- **Criaturas:** no salen ni andan dentro de una zona cerrada (filtro opcional en `wildlife.ts`); `assign` recibe la casilla para decidir la habilidad.
- **Provisional:** las tres puertas usan el mismo dibujo de piedra y el mismo claro; falta distinguir puente, cueva y puerta con dibujos propios. El nivel no se valida en el servidor todavía (ver #69).

## 2026-11-25 · Clases con tarjetas imprimibles (#52)

- **Decisiones (25 nov, tomadas por Claude en modo autónomo por encargo de Luis):** (1) del código solo se guarda el hash y una pista (sus dos primeras letras); el docente no puede volver a verlo y, si se pierde la tarjeta, regenera e imprime; (2) el QR se genera con `qrcode-generator` (MIT, sin dependencias, versión fija 2.0.4) y solo lleva `/?clase=<id>`, sin datos del alumno; (3) la tarjeta lleva impreso el apodo del docente y la hoja no se guarda en el servidor.
- **Alumnos de clase aparte de `children`:** un alumno con tarjeta aún no ha entrado nunca, así que tiene su propia tabla `class_students` (apodo de 1 a 20 letras, hash, pista, animal). Entrar con la tarjeta (siguiente issue) lo enlazará con un niño. Mismo límite de 30 con trigger. RLS forzada: lee quien lee la clase; escribe solo el docente que la creó, por funciones (`create_class`, `add_student`, `regenerate_student_code`, `remove_student`). La dirección ve, no escribe. El cliente no puede leer el hash.
- **Códigos:** `PALABRA-NN` con una lista propia de 60 palabras sin tildes (`packages/content/src/classCodes.ts`, con test de vetadas y repetidas) y 90 números: 5.400 códigos por clase. Se generan con `createRng(randomSeed())` en el aparato del docente; el hash es sha-256 de `<id de la clase>:<CÓDIGO>` (la clase hace de sal) y es único por clase. Si el servidor dice `code-taken`, se prueba con otro. 6 animales secretos como datos con nombre es/ca.
- **Regenerar** cambia código y animal; el anterior deja de existir porque ya no hay nada que lo reconozca.
- **Impresión:** hojas A4 de 8 tarjetas (2×4, 105×74,25 mm) con CSS `@media print`, cada tarjeta en castellano y catalán. Los códigos en claro solo viven en memoria hasta cerrar la página: hay que imprimir antes de salir.
- **Privacidad:** el apodo avisa si parece nombre y apellido (el docente puede seguir). `class_students` está en la política de privacidad; no se cambia su versión porque solo afecta a datos de docentes y alumnos de centro, cubiertos por el contrato del centro.

## 2026-11-25 · Nivel del personaje (#69)

- **Decisiones de Luis (25 nov):** (1) acierto con pista = la mitad de XP, nunca 0; la rapidez y las rachas no dan XP; (2) XP por acierto = 10 × dificultad, niveles 2 → 400, 3 → 900, 4 → 1.500, 5 → 2.300 y luego ~30 % más por nivel hasta el 30; (3) la XP la escribe el cliente en `children.extra`, sin validar en el servidor por ahora (se validará en `answer` cuando un nivel desbloquee cosas, #71).
- **Curva en datos:** `LEVELS` en `packages/exercises/src/levels.ts` (XP acumulada por nivel). El nivel **no se guarda**: `levelForXp(xp)` lo calcula siempre. Solo se guarda `xp`.
- **Reglas:** fallar da 0 XP y nunca resta; `xpForAnswer` no recibe el tiempo. Tests: 1.000 respuestas con semilla fija nunca bajan XP ni nivel.
- **Subida de nivel:** estrella en pixel art generada por código (`drawStar`) y mensaje en letra clara, es/ca; con voz si «Voz automática» está activa; sin animación con «reducir movimiento».

## 2026-11-25 · Cuentas de centro y de docente (#51)

- **Decisiones de Luis (25 nov):** (1) la pantalla es una página aparte dentro de `apps/game` (`docentes.html`, sin Phaser) y se moverá a `apps/panel/` en el bloque 9; (2) aquí solo van las tablas `classes` y `class_children`, con permisos y límite de 30; crear clases desde la pantalla, tarjetas y QR van en #52; (3) el código del centro no caduca solo: el director lo renueva y el anterior deja de valer; (4) el borrado a los 30 días (#48) no toca a los niños que están en `class_children`.
- **Mismo patrón que la familia:** el docente es un adulto con enlace de correo (cliente de adulto, `is_adult()`); las tablas tienen RLS forzada, el adulto solo lee y todo cambio va por funciones `security definer` (`create_school`, `rotate_school_code`, `join_school_with_code`, `leave_school`). Un niño (anónimo) no puede ejecutar ninguna.
- **Tablas:** `schools` (nombre y hash del código; el cliente no puede leer el hash), `teachers` (un adulto está en un solo centro o en ninguno; rol `director` o `docente`), `school_contracts` (versión del contrato, fecha y quién lo aceptó, por id), `classes` (de un docente, con o sin centro) y `class_children` (clave primaria = niño: una sola clase; máximo 30 con un trigger que bloquea la fila de la clase). Ninguna guarda correo ni nombre real.
- **Alta de centro:** exige correo confirmado, nombre y aceptar el contrato de encargo (`CONTRACT_VERSION` en `@kalku/content`, enlazado desde la pantalla al texto de `docs/legal/`, borrador pendiente de revisión legal). Quien lo crea es director. El código (8 caracteres, como el de los niños) solo se muestra una vez, al crearlo o renovarlo; en la base solo queda el hash.
- **Permisos:** el docente lee sus clases, y de sus alumnos la ficha y el dominio; nunca las respuestas. El director lee además las clases de los docentes de su centro. Un docente sin centro tiene sus clases igual. Un docente no puede estar en dos centros, y el director no puede dejar el suyo (nadie renovaría el código); un docente que sale conserva sus clases.
- **Un niño, una clase.** Si más adelante hace falta que esté en varias, se cambia la clave de `class_children`.
- **Política de privacidad 0.3** (borrador): tablas nuevas, el centro como responsable y Kalku como encargado, y el correo del docente en el sistema de acceso. La exportación del niño incluye su fila de `class_children`.
- **Pendiente de Luis:** el contrato del centro sigue siendo una plantilla sin revisar por un abogado; hasta entonces no hay que dar de alta centros reales.

## 2026-11-24 · Consentimiento de los padres (#48)

- **Decisiones de Luis (24 nov):** (1) sin segundo correo: basta el enlace de acceso; al unir, el adulto marca «Soy su madre, padre o tutor» y acepta la política, y el servidor exige el correo confirmado; (2) los 30 días se cuentan **sin jugar** desde `children.last_active_at`, y «Para adultos» avisa de que sin familia el progreso caduca; (3) el correo del adulto solo en `parental_consents.adult_email`, sin lectura salvo funciones del servidor.
- **Unir = consentir:** `join_family_with_code(código, versión_política, es_tutor)` falla (`email-not-confirmed`, `consent-required`) si falta algo, y en la misma transacción une e inserta el consentimiento (fecha, versión, correo). Volver a unir al mismo niño no cambia el consentimiento original.
- **`parental_consents`:** RLS forzada y sin permisos para nadie desde el cliente. El test de #47 ahora admite una única columna de correo en `public`: esa. La exportación del niño incluye el consentimiento sin el correo.
- **Retirar el consentimiento** (`withdraw_consent`, solo el adulto de la familia): borra la cuenta del niño en `auth.users` y todo cae por `on delete cascade`, incluida la fila con el correo. **Soltar al niño** de la familia (`leave_family`) también borra su consentimiento y el correo: el niño vuelve a ser una cuenta sin consentimiento y caduca a los 30 días sin jugar. Borrar la cuenta del adulto borra sus consentimientos por cascada (misma consecuencia).
- **Borrado automático:** `purge_unconsented_children()` borra a los niños sin consentimiento con `last_active_at` de hace más de 30 días; `pg_cron` la lanza cada día a las 03:00 UTC (la migración lo programa si la extensión existe; si no, avisa). `last_active_at` se actualiza con triggers al guardar respuestas o dominio, como mucho una vez por hora.
- **Política de privacidad 0.2** (borrador para el abogado): consentimiento, correo del adulto, 30 días sin consentimiento.
- **Pendiente de Luis:** comprobar en el panel de Supabase que existe el trabajo `purge-unconsented-children` (Database → Cron) y que `pg_cron` está activo en el proyecto real.

## 2026-11-24 · Cuenta de familia (#47)

- **Decisiones de Luis (23 nov):** (1) el adulto entra como niño en otro aparato con la Edge Function `child-session`, que crea una sesión del mismo niño (su `id` no cambia, no se copian filas); (2) ese niño juega como en su aparato, sin acceso al correo ni a los otros hijos; (3) un niño que ya está en otra familia se rechaza: solo se suelta desde su familia (`leave_family`) o borrando su cuenta (#63).
- **El adulto es un usuario no anónimo de Supabase** (enlace de correo, sin contraseña, Brevo). El correo vive solo en `auth.users`; un test pgTAP falla si alguna tabla de `public` tiene una columna de correo, y el test de integración comprueba que ni la ficha ni la exportación del niño lo llevan. `is_adult()` lee `is_anonymous` del token: las funciones y las políticas de adulto lo exigen, y las de niño lo prohíben.
- **Tablas:** `families` (un adulto, una familia), `family_children` (clave primaria = niño: solo una familia; máximo 4 con un trigger que bloquea la fila de la familia) y `link_codes` (hash sha-256 de un código de 8 caracteres, 10 minutos, un solo uso). RLS forzada; el adulto solo lee `families`, `family_children`, `children` y `progress` de su familia (no las respuestas) y nunca escribe: todo cambio va por funciones `security definer` (`create_link_code`, `join_family_with_code`, `leave_family`).
- **Dos clientes de Supabase en el navegador:** el del adulto usa otra clave de `localStorage` (`kalku-adult-auth`) y es el único que lee el enlace de la URL. Así entrar como adulto no pisa la sesión del niño de ese aparato, y «unir desde este aparato» es: el niño pide un código con su sesión y el adulto lo usa con la suya. Por eso no existe una función SQL «unir desde este aparato».
- **Unir no copia ni mueve nada:** solo inserta una fila en `family_children`; el progreso del niño no se toca. Volver a unir al mismo niño no cambia nada (ni siquiera con la familia llena).
- **`child-session` firma un JWT del niño** (HS256, 7 días, `sub` = id del niño, `is_anonymous: true`) con el secreto `KALKU_JWT_SECRET`, que solo existe en el servidor. No hay token de refresco: pasados 7 días el adulto vuelve a entrar como él. **Pendiente de Luis:** `supabase secrets set KALKU_JWT_SECRET=<JWT secret del proyecto>` y comprobar en el proyecto real que el proyecto acepta tokens HS256 (clave heredada); la CI no arranca el runtime de funciones, así que esta función solo tiene test de la firma, no de extremo a extremo.
- **Clave heredada (23 nov):** el proyecto real firma con una clave ECC (P-256) y conserva la HS256 heredada en «Previously used keys», así que sigue aceptando los tokens de `child-session`. **No revocar la clave heredada** mientras `child-session` firme con ella. `supabase-migrar.yml` despliega `answer` y `child-session`.
- **Cambio de niño en un aparato:** la copia local lleva su dueño (`kalku:owner`). Si la sesión es de otro niño, la copia se borra antes de leerla: dos niños nunca comparten monedas, apodo ni ajustes. Si el servidor falla al entrar como un niño, el aparato queda como estaba.
- **«Para adultos» y la pantalla de apodo:** la sección Familia va detrás de la cuenta 47 × 6; en la pantalla de apodo, el enlace «Ya tengo cuenta de familia» pasa por la misma cuenta.
- **Correo:** en local lo recoge Inbucket. El SMTP de Brevo se configura en el panel de Supabase (Auth → SMTP), sin claves en el repo (pendiente de Luis). La política de privacidad y el contrato ya dicen que Brevo está activo y que el correo del adulto se guarda solo en el sistema de acceso.
- **Fuera de alcance:** consentimiento parental (#48), plan de pago, informes por correo.

## 2026-11-23 · Exportar y borrar los datos de un niño (#50)

- **Dos funciones SQL** (`export_my_data`, `delete_my_account`, `security definer`) que solo actúan sobre `auth.uid()`. El cliente no puede borrar `auth.users` ni `answers`, por eso hace falta función. `anon` no puede ejecutarlas.
- **El borrado es borrar la fila de `auth.users`:** `on delete cascade` se lleva `children`, `progress` y `answers`. Una tabla futura con `child_id` debe tener también `on delete cascade`, y el export usa `to_jsonb(fila)`, así que incluye las columnas nuevas. Un test pgTAP falla si una tabla con `child_id` no está en el export.
- **«Para adultos» en Ajustes** (decidido con Luis), tras una cuenta tipo 47 × 6 con semilla. No es seguridad, solo evita borrados por error. Confirmación en dos pasos, con «No, volver» como botón principal.
- **Si el servidor falla, no se borra nada local** y se avisa; no se finge un borrado.
- **Tras borrar** se vuelve a la pantalla de apodo como un niño nuevo (cuenta anónima nueva).
- **Fuera de alcance (decidido con Luis):** un adulto sin el aparato del niño necesita cuentas de familia; mientras, la política ofrece el correo.

## 2026-11-23 · Respuestas validadas en el servidor (#46)

- **Edge Function `answer`** (`supabase/functions/answer/`): el niño manda habilidad + semilla + lo que respondió; el servidor regenera el ejercicio con `createRng(seed)`, corrige con `checkAnswer`, aplica `applyAnswer` y guarda. La lógica pura está en `packages/exercises/src/validate.ts` (con tests); la función solo identifica al niño por su token, lee el perfil y llama a `record_answers`.
- **El navegador ya no escribe `progress` ni `answers`** (solo lee). Escribe únicamente `record_answers`, que solo puede ejecutar `service_role` (clave que solo existe en el entorno de la función). `children` (apodo y `extra`) se sigue guardando desde el navegador.
- **Semilla del cliente (decidido con Luis)** + `unique (child_id, seed)`: una semilla no se responde dos veces. Un tramposo podría generar ejercicios y resolverlos con un script (acelerar, no inventar progreso); se revisa en el bloque 8.
- **Ejercicio manipulado:** el cliente manda también `a, b, c` y el hueco que vio; si no coinciden con lo regenerado, se rechaza (422) y no se guarda nada. Semillas solo como entero de 32 bits en forma canónica (`"5"`, nunca `"05"`), para que `unique` no se esquive.
- **Cifras fuera (decidido con Luis):** monedas, gemas y colección siguen en el cliente (`children.extra`); se validarán cuando haya tienda (no dan ventaja en el juego, regla 1).
- **`helped` y `slot` los declara el cliente (decidido con Luis):** el servidor no puede comprobarlos; se guarda `hints_used` en `answers` para revisar patrones raros.
- **Regla 3:** el tiempo no se envía ni se usa en el dominio; ser lento no puede restar. **Regla 2:** `applyAnswer` no baja de 0 ni quita intentos o aciertos.
- **Prueba de nivel:** se manda entera al terminar y el servidor la repite desde el principio (cada ejercicio tiene que ser el que tocaba, la prueba debe estar acabada) y aplica `applyPlacement`, que nunca baja nada.
- **El servidor manda:** el juego sigue aplicando la respuesta en local para verse al instante y, cuando llega la respuesta del servidor, pone su dominio. Sin red o con error se queda la copia local (el reintento sin conexión es del bloque 8). **Consecuencia:** el dominio local de antes de las cuentas ya no se sube (migración de prototipo); la primera respuesta validada de cada habilidad lo sustituye por el del servidor.
- **Empaquetado:** Deno no resuelve los imports `.js` → `.ts` de `@kalku/exercises`, así que `npm run build:function` (rolldown) genera `supabase/functions/answer/dist/index.js`, que es el `entrypoint` de `config.toml`. Despliegue: `supabase functions deploy answer` tras `db push` en «Supabase · aplicar migraciones» (pendiente de añadir a mano, ver PR #62); el token necesita permiso de «Edge Functions».
- **Despliegue de la función:** el workflow manual «Supabase · aplicar migraciones» empaqueta `answer` (`npm run build:function`) y la sube con `supabase functions deploy` tras las migraciones. El token `SUPABASE_ACCESS_TOKEN` necesita el permiso «Edge Functions» además de «Migrations». Hasta que se despliega, el juego sigue con la copia local. **Desde el 25 nov** se lanza solo al fusionar en main cualquier cambio de `supabase/` o `packages/exercises/` (sigue pudiendo lanzarse a mano sobre la rama de un PR para probar su vista previa). Así nadie tiene que acordarse de aplicarlas.

## 2026-11-22 · Política de privacidad y contrato para centros (#49)

- **Los textos son datos** (`packages/content/src/legal.ts`, es/ca) y la página `/privacidad` (`privacidad.html`, entrada aparte de Vite, sin Phaser) solo los pinta. Se enlaza desde Ajustes. El service worker no la sustituye por `index.html` (`navigateFallbackDenylist`).
- **Borrador:** `LEGAL_DRAFT = true` muestra «Borrador pendiente de revisión legal» en la página; las plantillas de `docs/legal/` llevan el mismo aviso. Para quitarlo, cuando el abogado dé el visto bueno: `LEGAL_DRAFT = false` y borrar el aviso de las plantillas.
- **Responsable y contacto** (decidido con Luis): marcadores `[PENDIENTE: …]` visibles; nadie inventa datos. Luis los rellena antes del piloto.
- **Conservación** (decidido con Luis): la cuenta del niño se borra tras 12 meses sin jugar y siempre a petición de la familia o del centro; los datos de un centro, al terminar el contrato. Es texto: el borrado automático aún no existe.
- **Subencargados:** Supabase (Frankfurt) y Cloudflare; Brevo marcado «cuando existan cuentas de familia» (hoy no se guarda ningún correo).
- **Un test cruza la política con `supabase/migrations/`:** si una migración añade una columna que no está en `SERVER_DATA`, falla. Así la política no se queda atrás.
- **Pendiente para el abogado:** ubicación exacta del alojamiento de Cloudflare Pages, plazo de aviso de brechas (48 h, propuesto) y jurisdicción del contrato.

## 2026-11-22 · Progreso en el servidor con cuenta anónima (#45)

- **Se guarda todo el progreso (decidido con Luis):** el dominio en `progress` y el resto (monedas, gemas, colección, encuentros, ajustes, idioma, `placementDone`) en `children.extra jsonb`, con límite de 8 KB en la base de datos. Sin datos personales; el test de privacidad ahora espera esa columna.
- **Cuenta:** al empezar, pantalla de apodo (lista o escrito) y `signInAnonymously()`; la sesión la guarda Supabase en el aparato. El apodo también queda en `localStorage` (`kalku:nickname`) para crear la cuenta más tarde si no había red.
- **Conflicto local/servidor (decidido con Luis):** gana el servidor, salvo que no tenga ningún intento y el local sí; entonces se sube el local, una sola vez (`kalku:migrated`, solo se marca si la subida confirma).
- **Apodo de varias palabras (decidido con Luis):** solo un aviso corto, sin bloquear.
- **Sin conexión:** `localStorage` es la copia; los fallos de red se ignoran y se reintenta en la siguiente guardada (subida con 1,5 s de retardo). Al arrancar se espera como mucho 4 s al servidor. Mientras haya guardados sin confirmar (`kalku:pending`), al arrancar se sube lo local en vez de bajar el servidor, para no perder lo jugado sin conexión.
- **Test de integración** con Supabase local (`sync.integracion.test.ts`) en la CI de `supabase.yml`; fuera de ella no se ejecuta porque no hay servidor local.

## 2026-11-19 · Servidor: Supabase en Frankfurt, tablas y permisos (#44)

- **Proyecto** `nxaehojnwutxpshqwzeo` (eu-central-1, plan gratis en el piloto). Migraciones en `supabase/migrations/`; la CI aplica las migraciones desde cero con Supabase local y lanza los tests pgTAP (`.github/workflows/supabase.yml`).
- **Un niño es un login anónimo de Supabase:** `children.id` = `auth.uid()`. La futura cuenta de familia conserva el mismo id.
- **Tablas mínimas:** `children` (id, apodo, fecha), `progress` (dominio por habilidad, como `SkillProgress`) y `answers` (respuesta con su semilla, para que el servidor regenere el ejercicio). Sin nombre real, correo ni ubicación; un test falla si aparece otra columna.
- **RLS activado y forzado:** cada niño solo lee y escribe lo suyo; `anon` no tiene permisos; `answers` no se edita ni se borra.
- **El navegador escribía `progress` y `answers`** (solo lo suyo); en #46 se retiraron esos permisos.
- **Migraciones al proyecto real:** workflow manual `.github/workflows/supabase-migrar.yml`, solo para Luis, con los secretos `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`. La `service_role` no se usa en ningún sitio.
- **Cliente** (`apps/game/src/supabase.ts`): solo clave pública vía `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; sin ellas devuelve `null` y el juego sigue con el guardado local.

## 2026-11-09 · Problemas con enunciado y familia problemus (#28)

- **Operador `'mixed'`** para la habilidad `word-problems-within-10` y la familia problemus. Cada ejercicio lleva su operación real (`+` o `−`) y un `story` en es/ca con el enunciado; `validateCreatures` exige que habilidad y familia coincidan (mixed con mixed) y que el símbolo sea `±`.
- **Resultados hasta 10**, operandos de 2 o más (el texto nunca dice «1 manzanas»), siempre preguntando por el resultado: el niño decide la operación. Va **al final de `SKILLS`** para no mover la dificultad de las demás; la prueba de nivel la trata como la más difícil, pero sigue empezando en «Sumas hasta 20 sin llevar» (`START_LEVEL`).
- **Problemus sin debilidad** (daño ×1), porque sus ejercicios mezclan operaciones. Pistas: nivel 1 ayuda a elegir la operación, el 2 la nombra, el 3 ayuda a calcularla.
- **Cuentín** (`problemus-cuentin`) es un nombre provisional pendiente de aprobar por Luis.

## 2026-11-09 · Leer el ejercicio en voz alta (#14)

- **El texto sale de una función pura** (`speakExercise` en `@kalku/exercises`), con tests; el navegador solo lo pronuncia con `speechSynthesis` (`apps/game/src/speech.ts`). Signos y números van en palabras («cinco más tres son…», «siete más ¿cuánto falta para doce?») para que el motor de voz no los lea mal. En una resta con hueco no se dice «cuánto falta», sino «¿cuánto?» y el resultado.
- **Sin voz, sin botón:** el altavoz solo aparece si el navegador tiene voz `es`/`ca`; si las voces cargan tarde (`voiceschanged`), aparece al llegar (y, con voz automática, se lee entonces una vez).
- **«Voz automática» conectada (decidido con Luis):** si está activa y hay voz, el ejercicio se lee solo al aparecer; si no, solo con el botón. Cambiarla en Ajustes aplica desde el siguiente ejercicio.
- **Sin grabaciones ni reconocimiento de voz**, fuera de alcance. No se envía nada a terceros: la voz es la del propio dispositivo (regla 5): se ignoran las voces remotas (`localService: false`), que enviarían el texto a un servidor.

## 2026-11-06 · Rescatar criaturas débiles (#37)

- **Cuándo sale «Rescatar»:** con el 25 % de vida o menos (`RESCUE_HP_RATIO`) y más de 0, y nunca con un jefe (`boss: true` en la criatura; hoy no hay ninguno, un test avisa si cambia).
- **Rescatar es un ejercicio normal** de la habilidad de la criatura, con las mismas pistas y tres intentos. Al acertar, la criatura entra en la colección y el combate termina como victoria, con las monedas normales del ejercicio (decidido con Luis). Al fallar: pista y otra oportunidad; el enemigo no contraataca en un rescate fallido, así que el niño no puede perder el combate (y la criatura) por intentarlo.
- **Solo coleccionar:** la colección se escribe desde el combate pero no se lee en él, así que no da ventaja (regla 1). Guarda solo id y fecha en el perfil local (`collection`); `parseCollection` descarta ids desconocidos y datos corruptos.
- **Repetidas:** una criatura ya rescatada se puede volver a encontrar y el botón sigue saliendo (siempre hay combate que practicar), pero no se duplica y conserva la fecha del primer rescate.
- **Dónde se ve:** botón «Colección» en el mapa (no en el combate). Las que faltan salen en silueta y sin nombre.

**Por qué:** que el niño tenga ganas de seguir explorando y practicando. Idea tomada del rescate de Prodigy, con mecánica propia. **Pendiente (fuera de alcance):** combatir con las criaturas rescatadas, equipos y guardar la colección en el servidor.

## 2026-11-05 · Prueba de nivel al empezar (#36)

- **Una sola vez, corta, como un juego:** «¡Vamos a ver qué sabes!», barra de avance, sin notas, sin tiempo. 10 ejercicios, tope duro de 12 (`PLACEMENT_LENGTH`, `PLACEMENT_MAX`). Termina antes si el nivel rebota entre dos habilidades vecinas o toca techo o suelo dos veces seguidas.
- **Cómo avanza:** empieza a mitad del currículo; sube un puesto en `SKILLS` al acertar y baja uno al fallar. Cuenta como acierto solo si se responde sin fallos ni pistas; fallar da la pista habitual y no quita nada. La lógica no recibe el tiempo de respuesta: ser lento no cambia el resultado.
- **Dominio inicial (decidido con Luis):** por debajo del nivel detectado, 80 con 10 intentos «de prueba»; el nivel, 40; por encima, 0. El nivel detectado es la habilidad siguiente a la más alta en la que se acertó más de lo que se falló. Si no se acierta nada, todo queda en 0. `applyPlacement` nunca baja nada y no muta el perfil.
- **Sin gemas:** la gema se da al cruzar el umbral de dominio jugando, no por tenerlo ya (`BattleScene` mira si ya estaba dominada antes de responder), así que la prueba no las otorga (regla 1).
- **«Ahora no»:** botón discreto que deja todo en 0 y marca la prueba como hecha.
- **Solo la primera vez:** `placementDone` en el progreso. Un guardado antiguo sin el campo y con intentos cuenta como hecho, para no molestar a quien ya juega. `?combate` se salta la prueba.

**Por qué:** que cada niño empiece a su nivel (regla 4) y no por «sumas hasta 10». Idea tomada de la prueba de nivel de Prodigy, pero en una sola sesión corta para niños de 6 años.

**Pendiente (fuera de alcance):** repetirla en enero o septiembre, que el docente cambie el nivel (fase 2) y guardarla en el servidor.

## 2026-11-05 · Encuentros con criaturas visibles, no al azar por paso

Los combates de la hierba alta empiezan al tocar una criatura que se ve en el mapa, en vez de tirar un dado en cada paso. Se sigue la mecánica de los juegos recientes del género, sin copiar nada suyo (nombres, criaturas, dibujos ni sistemas reconocibles).

- Las criaturas salen solo en casillas `tallGrass`, con un máximo por región (3 en Pradera Uno), y andan despacio sin salir de la hierba alta.
- Cada criatura lleva la habilidad elegida con `pickSkill` al aparecer (60/25/15) y el sprite de una criatura de esa habilidad: esquivarlas no sirve para saltarse lo que le cuesta al niño.
- El combate empieza cuando personaje y criatura coinciden en la misma casilla. Después la criatura desaparece, otra sale a los 6 s lejos del personaje (8 casillas o más) y hay 2 s de margen sin combates.
- Los valores (`max`, `moveEveryMs`, `respawnMs`, `graceMs`, `minSpawnDistance`) están en `RegionSpec.wildlife`, en `regions.ts`.
- Ganar o perder vuelve a la casilla donde saltó el combate y perder no quita nada. No se puede huir.
- La lógica es pura y con semilla (`packages/world/src/wildlife.ts`). El estado del mapa (posición y criaturas) se guarda en memoria entre mapa y combate; no se persiste al cerrar el juego.

**Por qué:** el niño ve lo que viene y decide a qué se acerca, y no hay combates por sorpresa. **Descartado:** probabilidad por paso con pasos de gracia (el plan inicial de #8).

## 2026-11-05 · Paquete `@kalku/art`: cómo se generan los dibujos

Implementa la decisión de abajo (#10). Los dibujos salen de `packages/art` (TypeScript puro, sin Phaser) y `apps/game` solo los pasa a texturas.

- **Casillas de 16 px a tamaño real** (antes eran sprites de 8 px al doble). Cada material tiene su escala de 4–5 tonos en `palette.ts`; luz desde arriba a la izquierda; contorno oscuro.
- **Agua y camino con 47 variantes** (autotile en modo 8, tablas `WATER_TILES_8` y `PATH_TILES_8`), para que las esquinas de la orilla salgan bien. Las tablas de 16 variantes siguen existiendo, pero el juego ya no las usa.
- **Agua animada con 3 tilemaps iguales** y un tileset por fotograma; solo se ve uno y un temporizador cambia cuál (cada ~340 ms). Así no se toca ninguna casilla por fotograma. Con «reducir movimiento» del sistema el agua y las criaturas se quedan quietas.
- **Casas y tienda como edificio entero**, no casilla a casilla: `findBuildings` agrupa las casillas `house`/`shop` en rectángulos y `drawBuilding` dibuja cada uno a su tamaño (el pueblo tiene casas de 3×2). Debajo hay hierba. Dos casas del mismo tipo pegadas se dibujarían como una sola grande.
- **Hierba con variantes** elegidas por casilla y semilla, y alguna piedrecita (sin obstáculo: se puede pisar). No hay un tipo de casilla «roca» en el mundo.
- **Criaturas por piezas en datos:** `CreatureDefinition.look` (cuerpo, cabeza, ojos, color, símbolo). `validateCreatures` comprueba que las piezas existen y que el símbolo (+/−) es el de su familia. 8 fotogramas: respirar, mecer la pieza de la cabeza y parpadear.
- **El personaje del jugador sigue siendo un sprite en texto** (pixelArt.ts): va por capas en otra tarea.

## 2026-11-04 · Dibujos generados por código, sin pack

Sustituye a la idea de comprar un pack de pixel art (#10). El mundo y las criaturas se dibujan por código con unas reglas de estilo fijas:

- **Pocos colores:** cada material (hierba, agua, tierra, hojas, tejado…) y cada criatura tiene su escala de 4 o 5 tonos.
- **Luz desde arriba a la izquierda** en todo, y **contorno oscuro** en criaturas y objetos.
- **Tamaños fijos:** casillas de 16 px y criaturas de 32 px (dos casillas de alto). Sin letras dentro de los dibujos.
- **Criaturas por piezas:** cuerpo, algo en la cabeza, ojos, colores y el símbolo de su familia (+ o −) en la tripa. Añadir una criatura es una línea de datos. La respiración y el parpadeo también salen del código.
- **Mundo por reglas con semilla:** orillas, bordes del camino, árboles, hierba alta, flores y piedras con variaciones.

**Por qué:** Luis vio la maqueta (`docs/maquetas/dibujos-por-codigo.html`) y le gustó todo menos la casa, que hay que rehacer. Así se pueden crear muchos mapas y criaturas a medida que crece el juego, con un estilo coherente y criaturas propias.

**Descartado:** comprar un pack (mezclar packs no pega y sus criaturas no serían nuestras) y encargar un ilustrador por ahora.

## 2026-11-05 · Debilidades por operación inversa en el combate

- Una criatura es débil a la operación inversa a la de su familia (restus → suma, sumus → resta). El ataque de esa operación hace ×1,5 de daño (`WEAKNESS_MULTIPLIER`, un solo sitio), que se multiplica con el ataque fuerte (×2,25 como máximo). Es un bonus: nunca resta.
- `pickSkill` y `challengeSkill` no cambian: el niño no elige la habilidad.
- El cartel «Débil a la suma» y el aviso al golpear salen solo las 5 primeras veces (`WEAKNESS_HINT_ENCOUNTERS`) que el niño se encuentra con una criatura de esa familia. Después se retira a propósito, para que se acuerde de que suma y resta son inversas; el daño extra se sigue aplicando. El contador por familia se guarda en el progreso (`encounters`).
- Esto sustituye a lo apuntado antes de que las debilidades quedaban para las criaturas compañeras y como bonus no obligatorio.

**Por qué:** Luis, 5 nov 2026, al planificar la issue #9.

## 2026-11-04 · Claude trabaja desde las issues de GitHub

- Las etiquetas hacen de cola: `plan` (Claude comenta un plan, sin código) y `dev` (implementa con `/desarrollar` y abre el PR). Lo lanza el workflow `.github/workflows/claude.yml` con la Claude Code GitHub Action.
- Cuando hace falta una decisión, Claude la pregunta en la issue, pone `necesita a Luis` y para. Al contestar Luis en la issue, retoma. Así a Luis solo le llegan notificaciones cuando le toca decidir o revisar.
- Tras cada revisión de CodeRabbit en una rama `tarea/…`, Claude sigue `/revisar`, con un máximo de dos rondas de arreglos.
- Solo las acciones de Luis (y las revisiones de CodeRabbit) lanzan el workflow; los comentarios de Claude no, para que no se encadene solo. Cada ejecución tiene tope de turnos y de tiempo.

**Por qué:** Luis tiene unas 3 horas al día y quiere avanzar desde el móvil sin abrir Claude Code ni vigilar cada paso.

**Descartado:** que Claude coja la siguiente issue sola al fusionar un PR (se puede añadir más adelante si el flujo funciona bien).

## 2026-11-03 · Criaturas por familias (sumus, restus)

- Las criaturas se agrupan en **familias**, y la familia decide la operación: a un **sumus** se le gana sumando y a un **restus**, restando. El nombre es invariable (un sumus, dos sumus), igual en castellano y catalán.
- Hay **una criatura por habilidad** (6 en Pradera Uno, no 5 como decía la issue #7), con nombre propio: Sumus Brote, Restus Gota, Sumus Trébol, Restus Bruma, Sumus Roble y Restus Sombra. Luis aprobó los nombres el 2026-11-04.
- El niño no elige la operación: la habilidad que toca (`pickSkill`) decidirá qué criatura aparece, para que nunca pueda esquivar lo que le cuesta practicar. Pendiente: `BattleScene` todavía elige `creature-add` o `creature-sub` al azar.
- Los nombres de elementos (brote, gota, sombra…) son solo variedad: no dan habilidades ni debilidades. Las debilidades por operación inversa de DESIGN.md quedan para cuando haya criaturas compañeras, y entonces darán un bonus, no serán obligatorias para ganar.
- Los **problemus** (problemas con enunciado) esperan a tener su habilidad.

**Por qué:** que el nombre diga qué hay que hacer es lo más fácil de entender con 6 años, y una tabla de elementos sería algo que memorizar sin aprender nada.

## 2026-11-03 · Mapa en pantalla y movimiento (`WorldScene`)

- Pradera Uno se genera con la **semilla fija 42** (`PRADERA_UNO_SEED` en `WorldScene`): todos ven el mismo mapa. Con esa semilla el camino no cruza agua.
- El mapa es un tilemap de Phaser creado por código. El tileset es una tira generada desde los sprites de texto (`tiles.ts`): primero las casillas de un dibujo, luego las 16 orillas de agua y las 16 de camino (sustituye a las texturas sueltas `tile-water-<n>` / `tile-path-<n>`). Casillas de 16 px en pantalla (sprites de 8 px a doble tamaño), hasta el pack de 32 px (#10).
- Se anda casilla a casilla (150 ms por paso). Qué se pisa lo decide `isWalkable` de `@kalku/world`: árboles, agua, casas y tienda no.
- Tocar la pantalla lleva al personaje andando por el camino más corto (`pathTo`). Si se toca algo que no se pisa, va a la casilla más cercana a la que se puede llegar. El teclado manda sobre un camino a medias, y un toque rápido de tecla da al menos un paso.
- El juego arranca en el mapa. El combate de prueba sigue en `?combate` (también en la web publicada).

**Por qué:** casilla a casilla es más fácil de controlar para un niño de 6 años y encaja con los encuentros por paso en hierba alta (#8).

## 2026-11-03 · Bordes de agua y camino (autotiling)

- Cada casilla de agua o camino tiene una **máscara** de vecinas del mismo tipo: N=1, E=2, S=4, W=8 y, en modo 8, NE=16, SE=32, SW=64, NW=128.
- En modo 8 una esquina solo cuenta si sus dos lados están unidos. Así salen 47 máscaras en vez de 256, que es como vienen la mayoría de packs.
- Fuera del mapa cuenta como unido: el agua y el camino que tocan el borde no dibujan orilla contra la nada.
- Solo se une con el mismo tipo de casilla (el camino no se une al agua).
- Una **tabla** por pack traduce máscara → número de casilla del pack, con una variante de reserva. Cambiar de pack es escribir otra tabla. Las de ahora (`WATER_TILES`, `PATH_TILES`) son **provisionales**: modo 4, la variante es la propia máscara, y en el juego cada una es la textura `tile-water-<n>` / `tile-path-<n>` generada desde texto.

**Por qué:** separar la máscara (lógica, con tests) de la tabla (datos del pack) deja elegir el pack (#10) sin tocar código.

## 2026-11-03 · Camino y lugares hechos a mano (`generateRegion`)

- Los lugares (pueblo, arena del jefe) son piezas de texto con una leyenda de una letra por casilla (`PIECE_LEGEND`). Se colocan encima del terreno y quedan exactamente como están escritos: el camino y la limpieza no los tocan.
- Cada pieza tiene un **enlace**, una casilla de su borde por la que entra el camino. El camino va de la entrada al primer lugar, de ahí al segundo…, en el orden de `RegionSpec.places`. Las piezas no se atraviesan.
- Antes de trazarlo se abre un **claro** de hierba de radio 3 (en cruz) alrededor de la entrada y de cada enlace. Sin él, en un tercio de las semillas el camino tenía que cruzar el agua justo al salir.
- El camino es el más barato (Dijkstra): hierba 2, camino ya hecho 1, árbol 8 (se tala) y agua 1.000.000. El agua solo se cruza, como **puente**, si no hay ninguna otra forma de llegar. El test comprueba que pasa en menos del 3 % de las semillas.
- Casas, tienda y jefe son tipos de casilla nuevos (`house`, `shop`, `boss`) que solo salen de piezas. Las dos piezas de Pradera Uno son **provisionales**.

**Por qué:** un lago puede cerrar el paso al jefe. Antes que dejar un mapa sin salida, mejor un puente. Y antes que el puente, talar árboles.

## 2026-11-03 · Cómo se genera el terreno (`@kalku/world`)

- Cada tipo de casilla (agua, árboles, hierba alta, flores) tiene su propio ruido de valor con semilla. Se reparten en ese orden: cada capa coge, entre las casillas que siguen libres, las de más ruido hasta cubrir su proporción. Así las proporciones salen exactas (redondeadas a casillas) y las manchas son naturales.
- «Suelto» significa sin ninguna casilla igual arriba, abajo, a la izquierda o a la derecha (las diagonales no cuentan). Agua y árboles sueltos vuelven a hierba y se recolocan pegados a un grupo.
- El «±5 %» de las proporciones se entiende como 5 puntos sobre el total del mapa (pedir 8 % de agua acepta entre 3 % y 13 %). En la práctica sale exacto.
- Los cupos de las capas se calculan juntos (restos del redondeo a las capas con más decimales), para que nunca sumen más casillas que el mapa.
- La semilla del mapa se pasa a `generateTerrain`; de ella salen las semillas de cada capa.

**Por qué:** cortar el ruido por un umbral fijo da proporciones distintas en cada semilla; ordenar por ruido las garantiza sin perder la forma de las manchas.

## 2026-11-04 · Estilo visual: pixel art con letra clara

Se mantiene el pixel art para el mundo, pero todo lo que hay que leer va en letra redonda y clara, nunca en fuente pixel: números del ejercicio, nombres, vida, mensajes y botones. La fuente pixel queda solo para detalles decorativos cortos. Escala de píxel grande y criaturas grandes y animadas en el combate.

**Por qué:** Luis temía que el pixel art pareciera antiguo y comparó una maqueta pixel con otra cartoon. Ganó el pixel porque se genera mucho mejor por código y hay muchos packs coherentes; el problema que vio fue la claridad de letras y números, y se resuelve separando la letra del arte. Maqueta: https://claude.ai/artifact/TPKQ9cesx3rHzgZCEgPoWn

**Descartado:** estilo cartoon vectorial (difícil mantener un estilo igual sin ilustrador y peor para mapas generados).

## 2026-11-03 · Tareas en GitHub Issues y revisión con CodeRabbit

Sustituye a la entrada siguiente («Trabajo por tareas…»). Las tareas pasan de ficheros en `tasks/` a issues de GitHub (#2 a #20), con etiquetas de fase, bloque y tamaño, y un hito por fase. Los comandos usan `gh`. Cada PR lo revisa CodeRabbit; `/revisar` atiende sus comentarios.

**Por qué:** Luis prefiere ver y comentar las tareas en GitHub (también desde el móvil), y que se cierren solas al fusionar. El coste es instalar GitHub CLI una vez.

## 2026-11-03 · Trabajo por tareas con /planificar y /desarrollar

Las tareas viven como ficheros en `tasks/` (no en GitHub Issues). `/planificar` las crea sin tocar código; `/desarrollar` implementa una por rama y pull request y la marca como hecha en el propio PR.

**Por qué:** Luis quiere lanzar desde Claude Code un Claude que solo planifica y otro que solo implementa. Con ficheros en el repositorio no hace falta instalar ni configurar nada más, y la tarea viaja con el código que la cumple.

**Descartado:** GitHub Issues (necesita `gh` con sesión en el ordenador de Luis y separa la tarea del código).

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

**Por qué (decisión de producto):** los anuncios rendirían unos 50 €/mes con 600 alumnos, los colegios no los aceptan, y ver un anuncio para ganar XP rompe el principio 1.

**Contexto legal (no es lo que decide, pero lo complica):** la DSA (art. 28) prohíbe a las plataformas mostrar a menores anuncios basados en perfiles, así que solo cabría publicidad contextual, que rinde menos. Y la LOPDGDD (art. 7) exige el consentimiento de los padres para tratar datos de menores de 14 años, lo que afecta a cualquier red de anuncios que use datos del niño.

**Descartado:** anuncios recompensados (idea inicial de Luis); venta colegio a colegio.

## 2026-11-02 · Nombre: Kalku

Nombre provisional anterior: Mundo Cifra. «Kalku» viene de cálculo / càlcul; las criaturas son «kalkus». Dominio previsto: kalkujuego.com (aún sin comprar). Marca sin registrar; en TMview no aparece «Kalku» en España/UE para software o educación (ojo con KALKUM, OEPM M2131696, clase 9).

## 2026-11-04 · Ajustes del jugador: tiempo, tamaño de texto y voz

Los ajustes (`settings`) viven en el progreso: tiempo sí/no, texto normal/grande y voz automática. Sin tiempo, `BattleScene` no mide y llama a `scoreAnswer` sin `elapsedMs`: sin bonus de rapidez y con los mismos puntos que responder despacio (principio 3). No se sube `version` del progreso: al cargar se completan los valores que falten o que no sean válidos. El idioma no está en `settings`: sigue en `locale`, aunque se cambia desde la misma pantalla. El ajuste de voz solo se guarda; la lectura en voz alta irá en otra tarea.

## Cola de respuestas sin conexión (#54)

- **Toda respuesta pasa por una cola** (IndexedDB; `localStorage` si el navegador no la ofrece) antes de enviarse, y sale solo cuando el servidor la acepta o la rechaza. Se envían de una en una y en el orden jugado; se vacía tras cada respuesta, al arrancar (antes de bajar el dominio, para no pisar lo pendiente) y al evento `online`.
- **`409 repeated` cuenta como hecha**: el servidor ya la tenía (`unique (child_id, seed)`), así reenviar una cola no duplica nada.
- **Rechazo (400/422):** sale de la cola y el dominio local se sustituye por el del servidor, solo el dominio (monedas y ajustes siguen locales). No se avisa al niño. Otros errores (red, 5xx, 401/404) paran el envío y la cola se conserva.
- **Aviso «Sin conexión · se guardará al volver»** (es/ca), sin contador, mientras no haya red o queden respuestas pendientes. No bloquea el juego.

## 2026-11-26 · La historia de Pradera Uno (hito 3)

La historia está en [HISTORIA.md](HISTORIA.md) y como datos en `packages/content/src/story/`: 13 pasos en 5 capítulos. Un paso solo avanza aprendiendo (combates ganados, acertijos acertados) o hablando con quien toca; ningún evento hace retroceder y perder un combate de la historia no quita nada (Uni te lleva a descansar).

- **Las zonas las abre la historia**, no las gemas ni el nivel: el puente con los tablones de Bruno, la cueva con Lina y la Puerta de Piedra con los acertijos de Pedrolo. Así el niño siempre sabe qué hacer (tarjeta de misión, marca «!» y flecha). Las gemas siguen saliendo en la colección.
- **El pueblo empieza gris** y recupera color con cada capítulo (`greyFor`).
- **Jefe final, el Gran Borrón:** 3 fases de 32 de vida; entre fases encoge y una criatura rescatada ayuda con una chispa gratis. El niño tiene el doble de vida contra él. Al final se convierte en Borroncito y vive en el pueblo.
- **Daño fijo** en los combates (Chispa 8, Rayo ×1,5): ya no depende de las monedas ganadas, para que el primer combate no se acabe de un golpe.
- **Acertijos sin vida ni tiempo:** tras 3 fallos se enseña la respuesta y sale otro, sin perder nada.

## 2026-11-26 · Temario del centro como JSON

Un fichero por centro en `packages/content/temarios/` ([TEMARIO.md](TEMARIO.md)), validado por los tests con errores en castellano. Se activa con `?temario=<id>`. Las preguntas propias no cuentan para el dominio porque no pertenecen a una habilidad. Se eligió JSON a mano antes que un editor en `/docentes` porque Luis puede rellenarlo ya con lo que le manden los centros; el editor vendrá después.

## 2026-11-26 · Dos inicios por edad: se pregunta el curso, no la edad

Luis pidió una historia para 5–8 años y otra para 8–12. Mismas mates y mismos pasos; solo cambian los diálogos («Brote» tierno y «Aventura» con humor y misterio, `SCENES_OLDER`). La primera pantalla de un niño nuevo pregunta «¿En qué curso estás?» (Infantil 5 años a 6.º): hasta 2.º, Brote; desde 3.º, Aventura. Se guarda el curso (`grade`) y el tramo (`band`) en la partida; nunca la edad ni la fecha de nacimiento (regla 5), y se añade a la lista de datos de la política. Se cambia en Ajustes («Historia»). Quien ya jugaba sigue con Brote.

## 2026-11-26 · Encargos y misiones para seguir jugando tras la historia (hito 4)

- **Encargos de los personajes** (`quests.ts`): al acabar la historia, Bruno, Lina, Pedrolo y Tecla piden cosas (ganar combates, rescatar, acertijos, chispas). Se acepta hablando con quien lo pide y se elige con semilla, sin repetir personaje seguido. El premio son Cifras (cosmética), nunca XP ni ventajas: la XP solo sale de acertar.
- **Misiones del día y de la semana** (`missions.ts`): 3 del día y 1 de la semana, iguales para todos los niños según la fecha en Europe/Madrid (una clase entera ve las mismas). Solo cuentan aciertos, combates y rescates; fallar no resta nada. Cada misión da su premio una sola vez.
- **Sin rachas ni castigos por no entrar**: no hay días seguidos que se pierdan. Así no hay presión ni ansiedad y encaja con lo que piden los centros.

## 2026-11-26 · Bosque de las Decenas: la segunda región (#99)

- **Habilidades hasta 100** detrás de las de Pradera Uno en `SKILLS` (decenas y unidades; sumas y restas sin y con llevada; problemas). Así la dificultad de las de antes no cambia. Migración que amplía la lista de habilidades de la base de datos; un test avisa si una habilidad nueva no está en ella.
- **La prueba de nivel solo recorre Pradera Uno** (`PLACEMENT_SKILLS`): diez preguntas no dan para trece habilidades. Quien lo acierta todo empieza con lo de la pradera dominado y llega a los números hasta 100 jugando.
- **Las regiones no limitan las cuentas**: en el bosque cada niño sigue con las de su nivel (regla 4). La región cambia el mapa, la historia y los personajes.
- **Se viaja por carteles**: el del bosque aparece al terminar la historia de Pradera Uno (nunca con Cifras) y hay que pararse en él (pasar por encima no cuenta). Se puede volver a la pradera. `story` guarda la región más avanzada y `at` dónde está el niño; una región anterior se ve terminada (`storyIn`).
- **Encargos por región**: los da quien vive en la región donde está el niño. Un encargo ya aceptado no se pierde al cambiar de región.
- Nombres nuevos (Olma, Cuco, Gran Enredo/Gran Embolic, Ovillo/Cabdell y las seis criaturas): **aprobados por Luis el 2026-11-27**.

## Panel de desarrollo (2026-11-27)

- Luis pidió poder pasar todo rápido para probar: un botón **DEV** abajo a la izquierda abre atajos (ganar un combate o un acertijo de un toque, pasar un paso de la historia, terminar la región, ir a cualquier región, completar el encargo y las misiones, dominarlo todo, +1000 Cifras y borrar la partida). Código en `apps/game/src/dev/`.
- **Nunca lo ve un niño:** solo existe con `npm run dev` y en las vistas previas de Cloudflare (ramas que no son `main`). La constante `__DEV_TOOLS__` se decide al compilar (`vite.config.ts`, con `CF_PAGES_BRANCH`); en la web publicada vale `false` y el código ni se incluye en el paquete. No hay clave secreta: en un repositorio público no habría forma de esconderla.
- Es una herramienta de adulto y va solo en castellano (no es interfaz del juego).
- Lo que se gana con los atajos no pasa por el servidor como respuestas; solo cambia el progreso guardado de quien lo usa.

## Brillantes, álbum y eventos de temporada (#101, 2026-11-27)

- **Brillantes:** 1 de cada 25 criaturas del mapa (rng con semilla del mapa) sale con otra escala de color (`SHINY_RAMP` en `@kalku/content`). Solo cambia el dibujo: vida, familia, debilidad, ejercicios y rescate son los de siempre (regla 1, con test). Al rescatarla se apunta su pegatina brillante en la colección (`shiny` con la fecha) sin tocar la fecha del primer rescate.
- **Álbum:** la colección se ve por páginas, una por región (`album` en cada criatura) y otra de invitados de temporada. Al completar una página sale su pegatina «¡Página completa!».
- **Eventos como datos** (`packages/content/src/events.ts`): Castañada (25 oct–5 nov), Navidad (15 dic–7 ene), Sant Jordi (20–26 abr) y fin de curso (15–30 jun). Cada uno trae una criatura invitada (1 de cada 5 criaturas del mapa mientras dura), un cartel al entrar al mapa y una misión del día propia. Fuera de fechas no existen (test). Nunca se solapan (test recorre un año entero).
- La invitada no tiene habilidad propia: sus ejercicios, también al rescatarla, son los que le tocan al niño. Es de la familia problemus (sin debilidad) para no dar ventaja a ninguna operación.
- Nombres de las invitadas (Castaña/Castanya, Copito/Floquet, Roseta, Solete/Solet) **pendientes de aprobar por Luis**.
- En el panel DEV se puede forzar un evento (o ninguno) y poner brillantes todas las criaturas del mapa.

