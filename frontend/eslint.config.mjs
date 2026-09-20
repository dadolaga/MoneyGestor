import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
    recommendedConfig: js.configs.recommended,
});

export default tseslint.config(
    {
        // Global ignores
        ignores: ['node_modules/', '.next/', 'out/', 'public/', 'eslint.config.mjs'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            import: importPlugin,
            react: reactPlugin,
            'react-hooks': hooksPlugin,
        },
        rules: {
            // 1. Core TypeScript logic
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }], // Ignore variables starting with _
            '@typescript-eslint/no-explicit-any': 'warn', // Prevent usage of 'any' type
            '@typescript-eslint/consistent-type-imports': 'error', // Enforce consistent type imports
            '@typescript-eslint/no-floating-promises': 'error', // Ensure Promises are handled (avoids async bugs)
            '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Suggests ?? instead of || for safer defaults

            // 2. React & Hooks
            'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
            'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies
            'react/jsx-no-leaked-render': ['error', { validStrategies: ['coerce'] }], // Prevent 0 or NaN rendering in JSX
            'react/self-closing-comp': 'error', // Prevents extra closing tags for empty components

            // 3. MUI & Organization
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', ['parent', 'sibling']],
                    pathGroups: [
                        { pattern: 'react', group: 'external', position: 'before' },
                        { pattern: '@mui/**', group: 'external', position: 'after' },
                    ],
                    pathGroupsExcludedImportTypes: ['react'],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ], // Organizes imports alphabetically and by group

            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@mui/icons-material',
                            message: 'Use the local Iconify catalog from @/components/ui/icons.',
                        },
                        {
                            name: 'lucide-react',
                            message: 'Use the local Iconify catalog from @/components/ui/icons.',
                        },
                        {
                            name: 'date-fns',
                            message: 'Use Day.js as the project date library.',
                        },
                        {
                            name: 'react-router-dom',
                            message: 'Use the Next.js App Router and the locale-aware navigation wrapper.',
                        },
                    ],
                    patterns: [
                        {
                            group: ['date-fns/*'],
                            message: 'Use Day.js as the project date library.',
                        },
                        {
                            group: ['@fortawesome/*'],
                            message: 'Use the local Iconify catalog from @/components/ui/icons.',
                        },
                        {
                            group: ['@mui/icons-material/*'],
                            message: 'Use the local Iconify catalog from @/components/ui/icons.',
                        },
                    ],
                },
            ],
        },
    },
    ...compat.config({
        extends: ['next/core-web-vitals'],
    }),
    {
        files: ['src/features/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@mui/icons-material',
                            message: 'Migrated slices must not import MUI.',
                        },
                        {
                            name: 'lucide-react',
                            message: 'Use the local Iconify catalog from @/components/ui/icons.',
                        },
                        {
                            name: 'next/link',
                            message: 'Use the locale-aware navigation wrapper from @/i18n/navigation.',
                        },
                        {
                            name: 'next/navigation',
                            message: 'Use the locale-aware navigation wrapper from @/i18n/navigation.',
                        },
                    ],
                    patterns: [
                        {
                            group: ['@mui/*'],
                            message: 'Migrated slices must not import MUI.',
                        },
                        {
                            group: ['@fortawesome/*'],
                            message: 'Use the local Iconify catalog from @/components/ui/icons.',
                        },
                    ],
                },
            ],
        },
    },
    eslintConfigPrettier,
);
