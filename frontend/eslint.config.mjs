import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This project intentionally fetches data with plain
      // `useEffect(() => { load(); }, [load])` calls (no React Query/SWR —
      // out of scope per the project brief). That is the standard "fetch on
      // mount" pattern and not the bug class this React-Compiler-oriented
      // rule targets (accidental setState loops during render). Downgraded
      // to a warning rather than disabled outright so genuine misuse is
      // still visible.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
