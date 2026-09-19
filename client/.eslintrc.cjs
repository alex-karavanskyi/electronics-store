module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'off',
    'no-restricted-imports': ['error', { patterns: ['next', 'next/*', '**/server/**', 'electronics-store-server'] }],
  },
  overrides: [{ files: ['src/__tests__/**'], env: { jest: true } }],
  ignorePatterns: ['node_modules/', 'dist/', 'coverage/', '.verification/'],
}
