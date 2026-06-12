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
    // One-off local debug/maintenance scripts (not part of the app):
    "scripts/**",
    "test-db.js",
    "test-db2.js",
    "test-db.ts",
    "test-sql.ts",
    "test_drive.ts",
    "check_db2.ts",
    "check_subs.ts",
    "fix_and_sync.ts",
    "fix_db_state.ts",
    "fix_missing_files.ts",
    "manual_sync.ts",
  ]),
]);

export default eslintConfig;
