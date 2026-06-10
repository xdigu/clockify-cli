import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import jest from "eslint-plugin-jest";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["src/**/*.ts", "typings/**/*.d.ts"],
    ignores: ["src/__tests__/**"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/__tests__/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...jest.environments.globals.globals,
      },
      parserOptions: {
        project: null,
      },
    },
    ...jest.configs["flat/recommended"],
    rules: {
      ...jest.configs["flat/recommended"].rules,
      "jest/no-conditional-expect": "off",
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
);
