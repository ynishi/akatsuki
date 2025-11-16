import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
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
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]|^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
    },
  },

  // ========================================
  // Layered Architecture Enforcement
  // ========================================

  // 📦 Components層 - UIロジックのみ、データアクセスは禁止
  {
    files: ['src/components/**/*.{js,jsx,ts,tsx}'],
    rules: {
      // UI componentsは定数exportもOK（Variant定義など）
      'react-refresh/only-export-components': ['off'],
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
          },
          {
            group: ['**/components/layout/*', '../components/layout/*', '@/components/layout/*'],
            message: '❌ Pages must not import Layout components. Layout is already applied in App.jsx routing. Remove the Layout wrapper from this page.'
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
      // Contextは定数exportもOK
      'react-refresh/only-export-components': ['off'],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.object.object.name='supabase'][callee.object.property.name='auth'][callee.property.name=/^sign(In|Up|Out)$/]",
          message: '❌ Use AuthContext.signIn/signUp/signOut instead of direct supabase.auth calls. (AGENT.md L754)'
        }
      ]
    }
  },

  // ========================================
  // TypeScript設定
  // ========================================
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),

  // TypeScript固有ルール
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]|^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      // 型定義ファイルでanyは許容（payload, result, metadataなど動的な値）
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // 🖼️ 画像生成後の二重Storage保存を防止
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/services/ImageGenerationService.{js,jsx,ts,tsx}'],
    plugins: {
      'custom': {
        rules: {
          'no-duplicate-storage-after-image-generation': {
            meta: {
              type: 'problem',
              docs: {
                description: 'Prevent duplicate storage saves after ImageGenerationService usage',
                category: 'Best Practices',
              },
              messages: {
                duplicateStorage: '⚠️ ImageGenerationService already saves images to Storage automatically. Use the returned fileId (result.data.id) instead. If you intentionally need to save two separate files, disable this rule with eslint-disable-next-line.'
              },
              schema: []
            },
            create(context) {
              let hasImageGeneration = false
              let hasStorageUpload = false
              let storageUploadNode = null

              return {
                // ImageGenerationService の呼び出しを検出
                'CallExpression[callee.object.name="ImageGenerationService"]'(node) {
                  const methodName = node.callee.property?.name
                  if (methodName?.startsWith('generate')) {
                    hasImageGeneration = true
                  }
                },
                // *StorageService.upload* の呼び出しを検出
                'CallExpression[callee.object.name=/.*StorageService$/]'(node) {
                  const methodName = node.callee.property?.name
                  if (methodName?.startsWith('upload')) {
                    hasStorageUpload = true
                    storageUploadNode = node
                  }
                },
                // 関数終了時にチェック
                'FunctionDeclaration:exit'() {
                  if (hasImageGeneration && hasStorageUpload) {
                    context.report({
                      node: storageUploadNode,
                      messageId: 'duplicateStorage'
                    })
                  }
                  // リセット
                  hasImageGeneration = false
                  hasStorageUpload = false
                  storageUploadNode = null
                },
                'FunctionExpression:exit'() {
                  if (hasImageGeneration && hasStorageUpload) {
                    context.report({
                      node: storageUploadNode,
                      messageId: 'duplicateStorage'
                    })
                  }
                  hasImageGeneration = false
                  hasStorageUpload = false
                  storageUploadNode = null
                },
                'ArrowFunctionExpression:exit'() {
                  if (hasImageGeneration && hasStorageUpload) {
                    context.report({
                      node: storageUploadNode,
                      messageId: 'duplicateStorage'
                    })
                  }
                  hasImageGeneration = false
                  hasStorageUpload = false
                  storageUploadNode = null
                }
              }
            }
          }
        }
      }
    },
    rules: {
      'custom/no-duplicate-storage-after-image-generation': 'warn'
    }
  }
])
