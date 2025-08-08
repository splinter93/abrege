
module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    '@next/next/no-img-element': 'warn',
    '@next/next/no-html-link-for-pages': 'warn',
    '@next/next/no-page-custom-font': 'warn',
    'react/no-unescaped-entities': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    '@typescript-eslint/no-require-imports': 'warn',
    'prefer-const': 'warn'
  },
  ignorePatterns: [
    'src/app/api/chat/llm/route.ts',
    'src/utils/v2DatabaseUtils.ts',
    'src/services/agentApiV2Tools.ts',
    'src/components/EditorToolbar.tsx'
  ]
};
