import type { TokenUsage, TokenLimits } from '../types';

/**
 * Token警告レベル
 */
export type TokenWarningLevel = 'normal' | 'warning' | 'danger';

/**
 * Token使用量の詳細情報（計算結果含む）
 */
export interface TokenUsageDetails {
  /** 生のToken使用量 */
  usage: TokenUsage;
  /** Token制限値 */
  limits: TokenLimits;
  /** 警告レベル */
  warningLevel: TokenWarningLevel;
  /** Token使用率（0-100） */
  tokenPercentage: number;
  /** コスト使用率（0-100） */
  costPercentage: number;
  /** 制限に達しているか */
  isLimitReached: boolean;
  /** 警告閾値に達しているか */
  isWarningReached: boolean;
}

/**
 * Token使用量に基づいて警告レベルを計算
 *
 * @param usage - Token使用量
 * @param limits - Token制限値
 * @returns 警告レベル ('normal' | 'warning' | 'danger')
 *
 * @example
 * ```typescript
 * const level = calculateTokenWarningLevel(
 *   { input: 800, output: 200, total: 1000, cost: 0.01 },
 *   { maxTokens: 1000, warningThreshold: 0.8 }
 * );
 * // => 'danger' (1000/1000 = 100%)
 * ```
 */
export function calculateTokenWarningLevel(
  usage: TokenUsage,
  limits: TokenLimits
): TokenWarningLevel {
  // 制限が設定されていない場合は常にnormal
  if (!limits.maxTokens && !limits.maxCost) {
    return 'normal';
  }

  const threshold = limits.warningThreshold ?? 0.8;

  // Token数ベースのチェック
  if (limits.maxTokens && limits.maxTokens > 0) {
    const tokenUsageRatio = usage.total / limits.maxTokens;
    if (tokenUsageRatio >= 1) return 'danger';
    if (tokenUsageRatio >= threshold) return 'warning';
  }

  // コストベースのチェック
  if (limits.maxCost && limits.maxCost > 0 && usage.cost !== undefined) {
    const costUsageRatio = usage.cost / limits.maxCost;
    if (costUsageRatio >= 1) return 'danger';
    if (costUsageRatio >= threshold) return 'warning';
  }

  return 'normal';
}

/**
 * Token使用率をパーセンテージで計算
 *
 * @param value - 使用量
 * @param max - 最大値
 * @returns パーセンテージ (0-100)
 *
 * @example
 * ```typescript
 * calculateTokenPercentage(750, 1000); // => 75
 * calculateTokenPercentage(1200, 1000); // => 100 (上限)
 * calculateTokenPercentage(500, undefined); // => 0 (maxが未設定)
 * ```
 */
export function calculateTokenPercentage(
  value: number,
  max: number | undefined
): number {
  if (!max || max <= 0) return 0;
  return Math.min((value / max) * 100, 100);
}

/**
 * Token使用量の詳細情報を計算
 *
 * @param usage - Token使用量
 * @param limits - Token制限値
 * @returns Token使用量の詳細情報
 *
 * @example
 * ```typescript
 * const details = calculateTokenUsageDetails(
 *   { input: 800, output: 200, total: 1000, cost: 0.01 },
 *   { maxTokens: 1000, maxCost: 0.02, warningThreshold: 0.8 }
 * );
 * // => {
 * //   usage: { ... },
 * //   limits: { ... },
 * //   warningLevel: 'danger',
 * //   tokenPercentage: 100,
 * //   costPercentage: 50,
 * //   isLimitReached: true,
 * //   isWarningReached: true
 * // }
 * ```
 */
export function calculateTokenUsageDetails(
  usage: TokenUsage,
  limits: TokenLimits
): TokenUsageDetails {
  const warningLevel = calculateTokenWarningLevel(usage, limits);
  const tokenPercentage = calculateTokenPercentage(usage.total, limits.maxTokens);
  const costPercentage = calculateTokenPercentage(usage.cost ?? 0, limits.maxCost);

  const isWarningReached = warningLevel === 'warning' || warningLevel === 'danger';
  const isLimitReached = warningLevel === 'danger';

  return {
    usage,
    limits,
    warningLevel,
    tokenPercentage,
    costPercentage,
    isLimitReached,
    isWarningReached,
  };
}
