---
id: T-001
titulo: Publicar la web en Cloudflare Pages
estado: bloqueada
fase: 1
bloque: 1 · Publicar
tamano: S
depende_de: []
necesita_a_luis: sí
---

# T-001 · Publicar la web en Cloudflare Pages

## Objetivo

Que cada cambio en main se publique solo en una dirección web, y cada pull request tenga su propia vista previa, para probar en el móvil o la tablet sin instalar nada.

## Qué hay que hacer

- Luis crea una cuenta gratuita en Cloudflare y conecta el repositorio en Workers & Pages → Pages → Connect to Git.
- Configuración de compilación: comando `npm run build`, carpeta de salida `apps/game/dist`, variable `NODE_VERSION=22`.
- Añadir `apps/game/public/_headers` para que `sw.js` y `index.html` no se cacheen de más (`Cache-Control: no-cache`).
- Poner la dirección de producción en el README.

## Criterios de aceptación

- [ ] Al fusionar en main, la web se actualiza sola en la dirección de producción.
- [ ] Cada pull request muestra un enlace de vista previa.
- [ ] El juego se puede instalar desde el navegador del móvil (PWA) y abre sin conexión después de la primera visita.
- [ ] El README tiene la dirección.

## Fuera de alcance

- Dominio propio (se compra más adelante).
- Servidor o base de datos.

## Notas

Bloqueada: necesita que Luis cree la cuenta de Cloudflare y conecte el repositorio (5 minutos). Después, /desarrollar hace el resto.
