/**
 * Providers module exports
 */

// New Provider Architecture
export * from './IAIProvider';
export * from './ProviderRegistry';

// Concrete Provider Implementations
export * from './gemini/GeminiProvider';
export * from './anthropic/AnthropicProvider';
export * from './openai/OpenAIProvider';

// Legacy Interface (will be deprecated)
export * from './IAIAgentProvider';

// Akatsuki implementation (legacy, will be deprecated)
export { AkatsukiAgentProvider, setAIService } from './akatsuki/AkatsukiAgentProvider';
