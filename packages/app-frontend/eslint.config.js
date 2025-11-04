import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // ========================================
  // 基本ルール（全ファイル共通）
  // ========================================
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // ========================================
  // Layered Architecture Enforcement
  // ========================================

  // 📦 Components層 - UIロジックのみ、データアクセスは禁止
  {
    files: ['src/components/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/lib/supabase*', '../lib/supabase*', '@/lib/supabase*'],
            message: '❌ Components must not import supabase directly. Use hooks or contexts instead. (AGENT.md L271)'
          },
          {
            group: ['**/repositories/*', '../repositories/*', '@/repositories/*'],
            message: '❌ Components must not use repositories directly. Use custom hooks instead. (AGENT.md L271)'
          },
          {
            group: ['**/services/EdgeFunctionService*', '**/services/AIService*'],
            message: '❌ Components must not call services directly. Use custom hooks instead. (AGENT.md L271)'
          }
        ]
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='from']",
          message: '❌ Components must not call supabase.from() directly. Use Repository pattern via hooks. (AGENT.md L216)'
        },
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='auth']",
          message: '❌ Components must use AuthContext, not direct supabase.auth calls. (AGENT.md L754)'
        }
      ]
    }
  },

  // 📄 Pages層 - Hooksは使えるが、Repositoryの直接呼び出しは禁止
  {
    files: ['src/pages/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/lib/supabase*', '../lib/supabase*', '@/lib/supabase*'],
            message: '❌ Pages must not import supabase directly. Use hooks instead. (AGENT.md L278)'
          },
          {
            group: ['**/repositories/*', '../repositories/*', '@/repositories/*'],
            message: '⚠️ Pages should use custom hooks, not repositories directly. Consider creating a hook. (AGENT.md L278)'
          }
        ]
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.object.name='supabase']",
          message: '❌ Pages must not call supabase directly. Use hooks or contexts. (AGENT.md L278)'
        }
      ]
    }
  },

  // 🪝 Hooks層 - Repositoriesを使ってOKだが、componentsへの依存は禁止
  {
    files: ['src/hooks/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/components/*', '../components/*', '@/components/*'],
            message: '❌ Hooks must not depend on components (circular dependency). (AGENT.md L246)'
          }
        ]
      }]
    }
  },

  // 🗄️ Repositories/Services層 - Hooksやcomponentsへの依存は禁止
  {
    files: ['src/repositories/**/*.{js,jsx,ts,tsx}', 'src/services/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/hooks/*', '../hooks/*', '@/hooks/*'],
            message: '❌ Repositories/Services must not depend on hooks (circular dependency). (AGENT.md L215)'
          },
          {
            group: ['**/components/*', '../components/*', '@/components/*'],
            message: '❌ Repositories/Services must not depend on components (circular dependency). (AGENT.md L215)'
          },
          {
            group: ['**/pages/*', '../pages/*', '@/pages/*'],
            message: '❌ Repositories/Services must not depend on pages (circular dependency). (AGENT.md L215)'
          }
        ]
      }]
    }
  },

  // 🔐 AuthContext以外での認証ロジック禁止
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/contexts/AuthContext.{js,jsx,ts,tsx}', 'src/lib/supabase.{js,ts}'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.object.object.name='supabase'][callee.object.property.name='auth'][callee.property.name=/^sign(In|Up|Out)$/]",
          message: '❌ Use AuthContext.signIn/signUp/signOut instead of direct supabase.auth calls. (AGENT.md L754)'
        }
      ]
    }
  }
])
