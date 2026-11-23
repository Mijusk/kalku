// Empaqueta las Edge Functions con lo que Deno no resuelve solo (los imports .js → .ts de
// @kalku/exercises). Los `npm:` y `jsr:` los resuelve Deno al ejecutar.
import { rolldown } from 'rolldown';

for (const name of ['answer', 'child-session']) {
  const bundle = await rolldown({
    input: `supabase/functions/${name}/index.ts`,
    platform: 'neutral',
    external: [/^npm:/, /^jsr:/, /^node:/],
  });
  await bundle.write({ file: `supabase/functions/${name}/dist/index.js`, format: 'esm' });
  await bundle.close();
}
