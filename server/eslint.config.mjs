import js from '@eslint/js'
import globals from 'globals'
import parser from '@typescript-eslint/parser'
import typescript from '@typescript-eslint/eslint-plugin'

export default [
  { ignores: ['node_modules/**', 'dist/**', '.verification/**'] },
  {
    files: ['**/*.{ts,mjs}'],
    languageOptions: {
      parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: { '@typescript-eslint': typescript },
    rules: {
      ...js.configs.recommended.rules,
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
            '**/client/**',
            'electronics-store',
            'electronics-store-client',
          ],
        },
      ],
    },
  },
]
