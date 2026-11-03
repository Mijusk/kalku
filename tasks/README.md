# Tareas

Aquí viven las tareas del proyecto, una por fichero. Las crea y ordena `/planificar` y las implementa `/desarrollar`, las dos desde Claude Code.

## Cómo se usa

```text
/planificar bloque 2            → divide el bloque 2 de la hoja de ruta en tareas
/planificar quiero un modo duelo → convierte una idea en tareas
/planificar revisar              → repasa las tareas pendientes y reordena

/desarrollar                     → implementa la siguiente tarea disponible
/desarrollar T-005               → implementa una tarea concreta
```

Cada `/desarrollar` hace **una** tarea, en su propia rama, y abre un pull request. Cuando lo fusionas, la tarea queda hecha.

## Formato de una tarea

Fichero `T-NNN-titulo-corto.md`:

```markdown
---
id: T-005
titulo: Mover al personaje por el mapa
estado: pendiente        # pendiente | bloqueada | hecha
fase: 1
bloque: 2 · Mapa
tamano: M                # S ≈ 1 sesión · M ≈ 2–3 sesiones · L = hay que dividirla
depende_de: [T-002]
necesita_a_luis: no      # sí si hace falta una decisión o una acción suya
---

## Objetivo
Para qué sirve, en una o dos frases.

## Qué hay que hacer
- Pasos concretos.

## Criterios de aceptación
- [ ] Comprobables uno a uno.

## Fuera de alcance
- Lo que NO entra, para no crecer.

## Notas
Pistas técnicas, enlaces, decisiones relacionadas.
```

Una sesión son unas 3 horas de Luis. Una tarea `L` no se desarrolla: primero se divide con `/planificar`.

## Estados

- `pendiente`: lista para hacerse cuando sus dependencias estén hechas.
- `bloqueada`: espera algo de fuera (una decisión de Luis, una cuenta, un pack de gráficos). El motivo va en Notas.
- `hecha`: su pull request está fusionado. `/desarrollar` la marca como hecha dentro del propio PR.

## Índice

<!-- El índice lo mantienen /planificar y /desarrollar. No lo edites a mano si puedes evitarlo. -->

| Id | Tarea | Bloque | Tamaño | Depende de | Estado |
| --- | --- | --- | --- | --- | --- |
| [T-001](T-001-publicar-web.md) | Publicar la web en Cloudflare Pages | 1 · Publicar | S | — | bloqueada (Luis) |
| [T-002](T-002-paquete-world-terreno.md) | Paquete de mundo: terreno con semilla | 2 · Mapa | M | — | pendiente |
| [T-003](T-003-camino-y-lugares.md) | Camino garantizado y lugares especiales en texto | 2 · Mapa | M | T-002 | pendiente |
| [T-004](T-004-autotiling.md) | Bordes de agua y caminos (autotiling) | 2 · Mapa | M | T-002 | pendiente |
| [T-005](T-005-worldscene-movimiento.md) | Dibujar el mapa y mover al personaje | 2 · Mapa | M | T-003 | pendiente |
| [T-006](T-006-criaturas-datos.md) | Criaturas de Pradera Uno como datos | 3 · Encuentros | S | — | pendiente |
| [T-007](T-007-encuentros.md) | Encuentros en la hierba alta | 3 · Encuentros | M | T-005, T-006 | pendiente |
| [T-008](T-008-combate-con-criaturas.md) | El combate usa la criatura y sus tipos | 3 · Encuentros | S | T-006 | pendiente |
| [T-009](T-009-pack-pixel-art.md) | Cargar el pack de pixel art | 4 · Gráficos y tienda | S | — | bloqueada (Luis) |
| [T-010](T-010-personaje-capas.md) | Personaje por capas | 4 · Gráficos y tienda | M | T-009 | pendiente |
| [T-011](T-011-tienda.md) | Tienda de 5 objetos cosméticos | 4 · Gráficos y tienda | M | T-010 | pendiente |
| [T-012](T-012-limite-diario.md) | Límite diario de Cifras en ejercicios fáciles | 5 · Pulido | S | — | pendiente |
| [T-013](T-013-voz.md) | Leer el ejercicio en voz alta | 5 · Pulido | S | — | pendiente |
| [T-014](T-014-ajustes.md) | Ajustes: tiempo y tamaño de texto | 5 · Pulido | S | — | pendiente |
| [T-015](T-015-servidor-supabase.md) | Servidor: Supabase, cuenta anónima y validación | 6 · Servidor | L | — | pendiente (dividir) |
| [T-016](T-016-centros-clases-qr.md) | Centros, clases con QR y tarjetas | 7 · Clases | L | T-015 | pendiente (dividir) |
| [T-017](T-017-sin-conexion.md) | Sin conexión y fusión de cuentas | 8 · Sin conexión | L | T-015 | pendiente (dividir) |
| [T-018](T-018-paneles.md) | Panel docente y resumen para familias | 9 · Paneles | L | T-016 | pendiente (dividir) |
| [T-019](T-019-privacidad.md) | Consentimiento de los padres y textos legales | 10 · Privacidad | L | T-015 | pendiente (dividir) |
