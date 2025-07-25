import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";
import html from "@html-eslint/eslint-plugin";

export default defineConfig([
  {
    ignores: [ "node_modules/", "package-lock.json" ],
  },
  {
    "extends": [
      "js/recommended",
    ],
    files: [ "**/*.{js,mjs,cjs}" ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        chrome: "readonly",
      },
    },
    plugins: {
      js,
      "@stylistic": stylistic,
    },
    rules: {
      ...stylistic.configs.all.rules,
      semi: "warn",
      "no-unused-vars": "warn",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: [ "error", "always" ],
      curly: [ "error", "all" ],
      "@stylistic/padded-blocks": [ "error", "never" ],
      "@stylistic/no-tabs": "error",
      "@stylistic/no-mixed-spaces-and-tabs": "error",
      "@stylistic/indent": [ "error", 2, { ignoreComments: true }],
      "@stylistic/multiline-comment-style": "off",
      "@stylistic/spaced-comment": "off",
      "@stylistic/no-extra-parens": "off",
      "@stylistic/arrow-parens": [ "error", "always" ],
      "@stylistic/no-multi-spaces": [ "error", {
        ignoreEOLComments: true,
      }],
      //"@stylistic/key-spacing": [ "error", {
      //  align: "value",
      //  VariableDeclarator: true
      //}],
      "@stylistic/comma-dangle": [ "error", {
        arrays: "always-multiline",
        objects: "always-multiline",
        imports: "always-multiline",
        exports: "always-multiline",
        functions: "never",
      }],
      "@stylistic/quotes": [ "error", "double", {
        allowTemplateLiterals: "always",
      }],
      "@stylistic/function-call-argument-newline": [ "error", "consistent" ],
      "@stylistic/multiline-ternary": "off",
      "@stylistic/array-element-newline": [ "error", "consistent" ],
      "@stylistic/space-before-function-paren": [ "error", {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
        "catch": "always",
      }],
      "@stylistic/no-floating-decimal": "off",
      "@stylistic/object-curly-spacing": [ "error", "always" ],
      "@stylistic/quote-props": [ "error", "as-needed", {
        keywords: true,
        unnecessary: true,
        numbers: true,
      }],
      "@stylistic/array-bracket-newline": [ "error", "consistent" ],
      "@stylistic/array-bracket-spacing": [ "error", "always", {
        singleValue: true,
        objectsInArrays: false,
        arraysInArrays: false,
      }],
      "@stylistic/lines-around-comment": "off",
    },
  },
  {
    files: [ "**/*.js" ],
    languageOptions: { sourceType: "script" },
  },
  {
    "extends": [ "json/recommended" ],
    files: [ "**/*.json" ],
    plugins: { json },
    language: "json/json",
  },
  {
    "extends": [ "css/recommended" ],
    files: [ "**/*.css" ],
    plugins: { css },
    language: "css/css",
    rules: {
      "css/no-important": "off",
    },
  },
  {
    ...html.configs["flat/recommended"],
    files: [ "**/*.html" ],
    rules: {
      ...html.configs["flat/recommended"].rules,
      "@html-eslint/indent": [ "error", 2 ],
      "@html-eslint/attrs-newline": "off",
      "@html-eslint/element-newline": "off",
    },
  },
]);
