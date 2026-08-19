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
    // Design reference only — the prototype HTML, its authoring-format runtime
    // (support.js) and the original genart source. Kept for reference, never
    // built or shipped, so it is not ours to lint.
    "design_handoff_ardeis_site/**",
  ]),
]);

export default eslintConfig;
