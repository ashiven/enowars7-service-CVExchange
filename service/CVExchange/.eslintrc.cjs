/* eslint-env node */
module.exports = {
  env: {
    "node": true,
    "browser": true,
    "commonjs": true,
    "es6": true
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  root: true,
  rules: {
    '@typescript-eslint/no-var-requires': 0,
  }
};