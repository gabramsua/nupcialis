// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'np', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'np', style: 'kebab-case' },
      ],
      // Regla de oro 2 y D-17: el SDK de Firebase solo se importa en core/firebase.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['firebase/*'],
              message:
                'El SDK de Firebase solo se importa dentro de src/app/core/firebase. Usa los servicios de esa capa.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Dos excepciones a la regla anterior:
    //  - core/firebase es la capa que envuelve el SDK.
    //  - los tests de reglas necesitan el SDK crudo para ejercitarlas: su
    //    trabajo es precisamente atacar Firestore como lo haría un cliente.
    files: ['src/app/core/firebase/**/*.ts', 'tests/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  }
);
