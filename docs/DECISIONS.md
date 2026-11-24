# Decisiones

Registro de decisiones del proyecto: qué se decidió, por qué y qué alternativas se descartaron. La más reciente arriba. Antes de cambiar algo de esta lista, habla con Luis y añade una entrada nueva en vez de borrar la vieja.

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
- **Despliegue de la función:** el workflow manual «Supabase · aplicar migraciones» empaqueta `answer` (`npm run build:function`) y la sube con `supabase functions deploy` tras las migraciones. El token `SUPABASE_ACCESS_TOKEN` necesita el permiso «Edge Functions» además de «Migrations». Hasta que se despliega, el juego sigue con la copia local.

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
