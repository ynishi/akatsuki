import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { ProviderRegistry } from '../../providers/ProviderRegistry';
import type { IAIProvider } from '../../providers/IAIProvider';

/**
 * AIエージェントコンテキストの型定義
 */
interface AIAgentContextValue {
  /** プロバイダーレジストリ */
  registry: ProviderRegistry;
}

/**
 * AIエージェントコンテキスト
 */
const AIAgentContext = createContext<AIAgentContextValue | null>(null);

/**
 * AIエージェントプロバイダーのProps
 */
export interface AIAgentProviderProps {
  /** プロバイダーレジストリインスタンス */
  registry?: ProviderRegistry;
  /** または、プロバイダー配列（内部でRegistryを自動生成） */
  providers?: IAIProvider[];
  /** 子要素 */
  children: ReactNode;
}

/**
 * AIエージェントプロバイダーコンポーネント
 *
 * アプリケーションのルートまたは必要な箇所でラップして使用する
 *
 * @example
 * ```tsx
 * // 新しい使い方（推奨）
 * import { AIAgentProvider, ProviderRegistry, GeminiProvider } from '@akatsuki/ai-agent-ui';
 *
 * function App() {
 *   const registry = useMemo(() => {
 *     const reg = new ProviderRegistry();
 *     reg.register(new GeminiProvider(aiService));
 *     return reg;
 *   }, [aiService]);
 *
 *   return (
 *     <AIAgentProvider registry={registry}>
 *       <YourApp />
 *     </AIAgentProvider>
 *   );
 * }
 *
 * // または、providers配列を渡す
 * function App() {
 *   const providers = useMemo(() => [
 *     new GeminiProvider(aiService),
 *   ], [aiService]);
 *
 *   return (
 *     <AIAgentProvider providers={providers}>
 *       <YourApp />
 *     </AIAgentProvider>
 *   );
 * }
 * ```
 */
export function AIAgentProvider({
  registry: providedRegistry,
  providers,
  children,
}: AIAgentProviderProps) {
  // Registryを作成または受け取る
  const registry = useMemo(() => {
    if (providedRegistry) {
      return providedRegistry;
    }

    // providers配列から自動生成
    const newRegistry = new ProviderRegistry();
    if (providers && providers.length > 0) {
      providers.forEach((p) => newRegistry.register(p));
    }
    return newRegistry;
  }, [providedRegistry, providers]);

  const value = useMemo(
    () => ({
      registry,
    }),
    [registry]
  );

  return (
    <AIAgentContext.Provider value={value}>
      {children}
    </AIAgentContext.Provider>
  );
}

/**
 * AIエージェントコンテキストを使用するフック
 *
 * @returns AIエージェントコンテキスト
 * @throws AIAgentProviderでラップされていない場合はエラー
 */
export function useAIAgentContext(): AIAgentContextValue {
  const context = useContext(AIAgentContext);

  if (!context) {
    throw new Error(
      'useAIAgentContext must be used within an AIAgentProvider. ' +
        'Make sure to wrap your component tree with <AIAgentProvider>.'
    );
  }

  return context;
}
