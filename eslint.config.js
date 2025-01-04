// @ts-check
// from https://typescript-eslint.io/getting-started/

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config({
  files: ['**/*.ts'],
  ignores: ['**/node_modules/**', '**/dist/**', '**/.github/**'],
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    eslintConfigPrettier,
  ],
  rules: {
    "max-lines-per-function": ["warn", {"max": 75}],  //GitLab25
    "max-lines": ["warn", {"max": 500}], //GitLab250
    //"complexity": ["error", { "max": 5 }], //GitLab5
    "import/order": "off",
    "sort-imports": "off", //opencommit special
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "caughtErrorsIgnorePattern": "^_",
      "varsIgnorePattern": "^[_A-Z]"
    }],
    /** 命名規則 */
    "@typescript-eslint/naming-convention": [
      "error",
      { // classやtypeなどは頭大文字
        "selector": "typeLike",
        "format": ["PascalCase"]
      },
      { // enumはアッパーケース di-sukharevスタイル
        "selector": "enum",
        "format": ["PascalCase", "UPPER_CASE"]
      },
      { // グローバル定数はアッパーケース
        "selector": "variable",
        "modifiers": ["global", "const"],
        "format": ["camelCase", "UPPER_CASE"]
      },
      { // 変数名はキャメルケース
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE"] // opencommit special
      }
    ],
    // 未使用の変数や関数は宣言禁止、ただし大文字で始まっているものはクラスなので許す
    "no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "caughtErrorsIgnorePattern": "^_",
      "varsIgnorePattern": "^[_A-Z]"
    }],
    "no-console": "off" //opencommit special
  },
});
