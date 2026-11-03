---
id: T-006
titulo: Criaturas de Pradera Uno como datos
estado: pendiente
fase: 1
bloque: 3 · Encuentros
tamano: S
depende_de: []
necesita_a_luis: sí
---

# T-006 · Criaturas de Pradera Uno como datos

## Objetivo

Definir las 5 criaturas (kalkus) de Pradera Uno como datos, para que añadir una nueva no toque lógica.

## Qué hay que hacer

- Fichero de datos (por ejemplo `packages/content/src/creatures.ts`) con id, nombre en es/ca, tipo (Suma o Resta), habilidad asociada, vida, sprite y descripción corta.
- Validación de los datos con test: ids únicos, habilidades existentes, nombres en los dos idiomas.
- Sprites provisionales en texto para las 5.

## Criterios de aceptación

- [ ] Hay 5 criaturas con nombres propios (no parecidos a Pokémon) aprobados por Luis.
- [ ] Los tests de validación pasan y fallan si falta un idioma o una habilidad no existe.

## Fuera de alcance

- Evoluciones.
- Captura de criaturas.

## Notas

Necesita a Luis solo para aprobar los nombres: /desarrollar propone 5 nombres y los deja marcados como provisionales.
