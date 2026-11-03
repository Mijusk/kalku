---
id: T-008
titulo: El combate usa la criatura y sus tipos
estado: pendiente
fase: 1
bloque: 3 · Encuentros
tamano: S
depende_de: [T-006]
necesita_a_luis: no
---

# T-008 · El combate usa la criatura y sus tipos

## Objetivo

Que el combate use la vida y el tipo de la criatura, y que las debilidades enseñen operaciones inversas.

## Qué hay que hacer

- `BattleScene` recibe la criatura y usa su vida, sprite y nombre.
- Debilidad: un enemigo de tipo Resta recibe más daño de ataques de Suma y al revés (multiplicador en un único sitio).
- Mostrar el nombre de la criatura en es/ca.

## Criterios de aceptación

- [ ] La vida y el nombre salen de los datos.
- [ ] El multiplicador de debilidad tiene test.
- [ ] Fallar sigue sin quitar nada.

## Fuera de alcance

- Ataques de criatura propia, combo y curar (fase 6).

## Notas

—
