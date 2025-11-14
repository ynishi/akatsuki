import { createContext, useContext, type ReactNode } from 'react';
import type { IAIAgentProvider } from '../../providers/IAIAgentProvider';

/**
 * AIエージェントコンテキストの型定義
 */
interface AIAgentContextValue {
  /** AIプロバイダーインスタンス */
  provider: IAIAgentProvider;
}

/**
 * AIエージェントコンテキスト
 */
const AIAgentContext = createContext<AIAgentContextValue | null>(null);

/**
 * AIエージェントプロバイダーのProps
 */
export interface AIAgentProviderProps {
  /** AIプロバイダーインスタンス */
  provider: IAIAgentProvider;
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
 * import { AIAgentProvider } from '@akatsuki/ai-agent-ui';
 * import { AkatsukiAgentProvider } from '@akatsuki/ai-agent-ui/providers';
 *
 * function App() {
 *   const provider = new AkatsukiAgentProvider();
 *
 *   return (
 *     <AIAgentProvider provider={provider}>
 *       <YourApp />
 *     </AIAgentProvider>
 *   );
 * }
 * ```
 */
export function AIAgentProvider({ provider, children }: AIAgentProviderProps) {
  return (
    <AIAgentContext.Provider value={{ provider }}>
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
