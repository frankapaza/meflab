import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // El prototipo no es código del proyecto: `support.js` es el runtime de
    // Claude Design, generado y vendorizado, y el .dc.html no es React.
    "docs/**",
    // El CLI de Supabase vendoriza aquí el runtime de edge functions.
    "supabase/.temp/**",
    // Herramientas Node de una vez (generar el cuaderno del laboratorio).
    // Son CommonJS y se ejecutan con `node`, no forman parte del bundle.
    "scripts/*.cjs",
  ]),
]);

export default eslintConfig;
