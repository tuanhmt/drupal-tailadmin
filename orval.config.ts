import { defineConfig } from 'orval';
import { config as loadEnv } from "dotenv";

loadEnv({ path: '.env' });

export default defineConfig({
  drupalJsonApi: {
    input: {
      target: process.env.OPENAPI_URL ?? '',
    },
    output: {
      mode: 'tags-split',
      schemas: 'src/lib/api/generated/schemas',
      target: 'src/lib/api/generated',
      baseUrl: process.env.OPENAPI_URL ?? '',
      client: 'zod',
    },
  },
});