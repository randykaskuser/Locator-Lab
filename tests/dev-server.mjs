// Local preview: node tests/dev-server.mjs
import { serve } from './serve.mjs';

const { url } = await serve(Number(process.env.PORT) || 0);
console.log(`Locator Lab running at ${url}/public/`);
