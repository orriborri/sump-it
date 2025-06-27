import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  ...compat.config({
    extends: ['next', 'prettier'],
    plugins: ['prettier'],
  }),
  {
    rules: {
      // Prettier formatting rules
      'prettier/prettier': 'error',

      // Allow underscore-prefixed unused variables
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Disable some Next.js rules that conflict with our patterns
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'warn', // Keep as warning instead of error
    },
  },
]

export default eslintConfig