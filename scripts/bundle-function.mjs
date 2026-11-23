// Empaqueta la Edge Function `answer` con @kalku/exercises dentro (Deno no resuelve
// los imports .js → .ts del paquete). Los `npm:` y `jsr:` los resuelve Deno al ejecutar.
import { rolldown } from 'rolldown';

const bundle = await rolldown({
  input: 'supabase/functions/answer/index.ts',
  platform: 'neutral',
  external: [/^npm:/, /^jsr:/, /^node:/],
});
await bundle.write({ file: 'supabase/functions/answer/dist/index.js', format: 'esm' });
await bundle.close();
