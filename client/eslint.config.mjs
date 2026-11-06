import js from '@eslint/js'
import globals from 'globals'
import parser from '@typescript-eslint/parser'
import typescript from '@typescript-eslint/eslint-plugin'
import hooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.verification/**'],
  },
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],
    languageOptions: {
      parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: { '@typescript-eslint': typescript, 'react-hooks': hooks },
    rules: {
      ...js.configs.recommended.rules,
      // Preserve the project's Hooks checks. React Compiler adoption is separate
      // from this dependency migration; its expanded preset changes lint policy.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'no-undef': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'next',
            'next/*',
            '**/server/**',
            'electronics-store-server',
          ],
        },
      ],
    },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
  { files: ['src/__tests__/**'], languageOptions: { globals: globals.jest } },
]
