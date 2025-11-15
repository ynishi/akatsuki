/**
 * Providers module exports
 */

// New Provider Architecture
export * from './IAIProvider';
export * from './ProviderRegistry';

// Gemini Provider
export * from './gemini/GeminiProvider';

// Legacy Interface (will be deprecated)
export * from './IAIAgentProvider';

// Akatsuki implementation (legacy, will be deprecated)
export { AkatsukiAgentProvider, setAIService } from './akatsuki/AkatsukiAgentProvider';
