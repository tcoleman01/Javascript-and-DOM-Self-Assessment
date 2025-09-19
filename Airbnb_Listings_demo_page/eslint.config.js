import globals from "globals";
import pluginJs from "@eslint/js";
import htmlPlugin from "eslint-plugin-html";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.html"],
    plugins: { htmlPlugin },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },

      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      indent: [
        "error",
        2,
        {
          SwitchCase: 1,
        },
      ],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "no-console": 0,
    },
  },
];
