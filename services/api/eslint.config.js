import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: { ecmaVersion: 2022, globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: false }],
      // Logs go through src/log.ts, which redacts; a stray console.log could leak a token.
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.test.ts', 'src/test/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
