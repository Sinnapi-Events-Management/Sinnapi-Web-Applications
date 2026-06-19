module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["check-file"],
  settings: { react: { version: "detect" } },
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  rules: {
    // console.log is not allowed; console.warn/error/info are permitted.
    "no-console": ["error", { allow: ["warn", "error", "info"] }],

    // Variables must be camelCase. Components/types use PascalCase, true
    // constants UPPER_CASE. Object/destructured properties are left alone so
    // Supabase snake_case payloads don't trip the rule.
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        selector: "variable",
        format: ["camelCase", "PascalCase", "UPPER_CASE"],
        leadingUnderscore: "allow",
      },
      { selector: "variable", modifiers: ["destructured"], format: null },
      {
        selector: "parameter",
        format: ["camelCase", "PascalCase"],
        leadingUnderscore: "allow",
      },
      { selector: "function", format: ["camelCase", "PascalCase"] },
      { selector: "typeLike", format: ["PascalCase"] },
    ],

    // Folder names under src/ must be camelCase.
    "check-file/folder-naming-convention": ["error", { "src/**/": "CAMEL_CASE" }],

    // React component files (.tsx) must be PascalCase, e.g. HomePage.tsx.
    "check-file/filename-naming-convention": [
      "error",
      { "src/**/*.tsx": "PASCAL_CASE" },
      { ignoreMiddleExtensions: true },
    ],
  },
};
