module.exports = {
  root: true,
  env: { node: true, es2021: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  rules: {
    // console.log is not allowed; console.warn/error/info are permitted.
    'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
  },
};
