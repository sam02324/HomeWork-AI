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
    // Agent worktrees and one-off local debug/ops scripts (not part of the app):
    ".claude/**",
    "scripts/**",
    "scratch/**",
    "**/*.scratch.ts",
    "**/*.scratch.js",
  ]),
]);

export default eslintConfig;
