import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "artifacts/**",
      ".demo-tools/**",
      "server/docs/**",
      ".pnpm-store/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  },
];
