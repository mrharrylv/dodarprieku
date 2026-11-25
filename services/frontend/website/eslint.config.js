import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dist-ssr', 'coverage', 'node_modules'] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // An unused variable is nearly always a leftover from an edit that was
      // not finished. The underscore prefix is the deliberate opt-out.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Errors must be handled explicitly, with a message the visitor can act
      // on. An empty catch that swallows the failure leaves someone staring at
      // a spinner forever.
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },

  // Tests reach for `any` when stubbing, and that is fine there.
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // A harness component handing `useNavigate()` out to the test body is
      // how a test drives the router; production code never does this.
      'react-hooks/globals': 'off',
    },
  },

  // The route table is data, not a component module: editing it reloads the
  // page rather than hot-swapping, which is what it should do anyway. The lazy
  // page bindings in it are not exports, so there is nothing to keep stable.
  {
    files: ['src/routes.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
