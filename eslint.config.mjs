import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

/**
 * Policy: Next core-web-vitals + TypeScript recommended, then a modest
 * typescript-eslint strict overlay and a few high-signal custom rules.
 * Formatting is Prettier's job — eslint-config-prettier must stay last.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    rules: {
      // Prefer explicit unused markers over silent dead code.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-unused-expressions": "error",

      // Keep `any` exceptional; allow intentional escape hatches with a comment.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Prefer `import type` so type-only imports are erased cleanly.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // Language hygiene without stylistic micromanagement.
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      "object-shorthand": ["error", "always"],
      "no-debugger": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-useless-rename": "error",
      "prefer-template": "error",

      // Next/React defaults are good; keep a11y + hooks at error where sensible.
      "react/jsx-key": "error",
      "react/no-danger": "warn",
    },
  },
  {
    // Config / tooling files: keep lint light.
    files: [
      "*.config.{js,mjs,cjs,ts,mts,cts}",
      "eslint.config.mjs",
      "prettier.config.mjs",
      "prisma7.config.ts",
    ],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "src/generated/**",
    "pnpm-lock.yaml",
  ]),
]);

export default eslintConfig;
