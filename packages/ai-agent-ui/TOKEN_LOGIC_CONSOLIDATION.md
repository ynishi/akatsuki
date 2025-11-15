# Token Logic Consolidation Design

## 🎯 目的

Token関連のビジネスロジックをCore層に集約し、UI層は計算結果を表示するだけに留める。
また、必要に応じてProviderインターフェースを拡張し、Token管理を強化する。

## 📊 現状分析

### ❌ 問題点1: Token警告レベル計算がUI層に存在

**場所**: `src/ui/components/AITokenUsagePanel.tsx:49-69`

```typescript
// UI層に複雑なビジネスロジックが存在
const getWarningLevel = (): 'normal' | 'warning' | 'danger' => {
  if (!tokenLimits.maxTokens && !tokenLimits.maxCost) return 'normal';

  const threshold = tokenLimits.warningThreshold || 0.8;

  if (tokenLimits.maxTokens) {
    const usage = tokenUsage.total / tokenLimits.maxTokens;
    if (usage >= 1) return 'danger';
    if (usage >= threshold) return 'warning';
  }

  if (tokenLimits.maxCost && tokenUsage.cost) {
    const usage = tokenUsage.cost / tokenLimits.maxCost;
    if (usage >= 1) return 'danger';
    if (usage >= threshold) return 'warning';
  }

  return 'normal';
};
```

**問題**:
- ビジネスロジックがUI層に漏れている
- 同じロジックを他のUIで使う場合、重複コードになる
- 単体テストが困難

### ❌ 問題点2: パーセンテージ計算もUI層に存在

**場所**: `src/ui/components/AITokenUsagePanel.tsx:85-88`

```typescript
// パーセンテージの計算
const getPercentage = (value: number, max?: number): number => {
  if (!max) return 0;
  return Math.min((value / max) * 100, 100);
};
```

**問題**:
- 計算ロジックがUIコンポーネント内に散在
- 再利用性が低い

### ❌ 問題点3: Providerインターフェースの不足

現在の`IAIProvider`には以下が欠けている可能性：
- Token使用量のリセット方法の標準化
- プロバイダー別のToken集計の取得
- モデル別のToken集計（将来的に必要）

## 🎨 設計方針

### 原則: Token計算ロジックの完全分離

```
┌─────────────────────────────────────────┐
│         UI Layer (Presentation)         │
│  - Display warning levels with colors   │
│  - Render progress bars                 │
│  - Show formatted numbers               │
└─────────────────────────────────────────┘
                    ↓↑ (computed values)
┌─────────────────────────────────────────┐
│      Core Layer (Business Logic)        │
│  - Calculate warning levels             │
│  - Calculate percentages                │
│  - Aggregate token usage                │
│  - Apply limits and thresholds          │
└─────────────────────────────────────────┘
                    ↓↑ (raw data)
┌─────────────────────────────────────────┐
│    Provider Layer (Data Access)         │
│  - Track token usage per API call       │
│  - Store token usage by provider        │
│  - Reset token counters                 │
└─────────────────────────────────────────┘
```

## 🔧 実装計画

### Step 1: Core層にToken計算ユーティリティを作成

#### 1.1 警告レベル計算

**新規ファイル**: `src/core/utils/tokenCalculations.ts`

```typescript
import type { TokenUsage, TokenLimits } from '../types';

/**
 * Token警告レベル
 */
export type TokenWarningLevel = 'normal' | 'warning' | 'danger';

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

  const threshold = limits.warningThreshold ?? 0.8;
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
```

#### 1.2 型定義の拡張

**更新ファイル**: `src/core/types.ts`

```typescript
// 既存のTokenUsage, TokenLimitsの後に追加

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
```

### Step 2: useAIRegisterでTokenUsageDetailsを計算

**更新ファイル**: `src/core/hooks/useAIRegister.ts`

```typescript
import {
  calculateTokenUsageDetails,
  type TokenUsageDetails,
} from '../utils/tokenCalculations';

export function useAIRegister(options: AIRegisterOptions): AIRegisterResult {
  // ... 既存のコード

  // Token使用量の詳細を計算（useMemoで最適化）
  const tokenUsageDetails = useMemo(
    () => calculateTokenUsageDetails(tokenUsage, options.tokenLimits ?? {}),
    [tokenUsage, options.tokenLimits]
  );

  return {
    actions: { ... },
    state: {
      // ... 既存のstate
      tokenUsage,
      tokenLimits: options.tokenLimits ?? {},
      tokenUsageDetails,  // NEW: 計算済みの詳細情報
    },
  };
}
```

**型定義の更新**: `src/core/types.ts`

```typescript
export interface AIRegisterResult {
  actions: { ... };
  state: {
    // ... 既存のstate

    /** Token使用量 */
    tokenUsage: TokenUsage;

    /** Token制限値 */
    tokenLimits: TokenLimits;

    /** Token使用量の詳細情報（計算済み） */
    tokenUsageDetails: TokenUsageDetails;  // NEW
  };
}
```

### Step 3: AITokenUsagePanelの更新

**更新ファイル**: `src/ui/components/AITokenUsagePanel.tsx`

```typescript
import type { TokenUsageDetails } from '../../core/types';

export interface AITokenUsagePanelProps {
  /** Token使用量の詳細情報（Core層で計算済み） */
  tokenUsageDetails: TokenUsageDetails;
  /** リセット時のコールバック */
  onReset?: () => void;
  /** 閉じるコールバック */
  onClose: () => void;
  /** パネルの位置 */
  position?: 'left' | 'right' | 'center';
}

export function AITokenUsagePanel({
  tokenUsageDetails,
  onReset,
  onClose,
  position = 'center',
}: AITokenUsagePanelProps) {
  // UI層は計算結果を使うだけ
  const { usage, limits, warningLevel, tokenPercentage, costPercentage } = tokenUsageDetails;

  // ローカル計算ロジックを削除
  // ❌ const getWarningLevel = () => { ... };  // 削除
  // ❌ const getPercentage = () => { ... };    // 削除

  // 警告レベルに応じた色
  const levelColors = {
    normal: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  const levelBgColors = {
    normal: 'bg-green-50',
    warning: 'bg-yellow-50',
    danger: 'bg-red-50',
  };

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Tokenパネル */}
      <div className={`... ${levelBgColors[warningLevel]}`}>
        {/* ヘッダー */}
        <div className={`... ${levelBgColors[warningLevel]}`}>
          {/* ... */}
        </div>

        {/* 使用量詳細 */}
        <div className="p-4 space-y-4">
          {/* 合計トークン数 */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 font-semibold">合計</span>
              <span className={`font-semibold ${levelColors[warningLevel]}`}>
                {usage.total.toLocaleString()}
              </span>
            </div>
            {limits.maxTokens && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    warningLevel === 'danger'
                      ? 'bg-red-500'
                      : warningLevel === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${tokenPercentage}%` }}  // ← Core層から受け取った値
                />
              </div>
            )}
            {/* ... */}
          </div>

          {/* プロバイダー別内訳 */}
          {usage.byProvider && Object.keys(usage.byProvider).length > 0 && (
            <div className="space-y-3">
              {/* ... */}
            </div>
          )}

          {/* コスト表示 */}
          {usage.cost !== undefined && usage.cost > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">コスト</span>
                <span className={`font-semibold ${levelColors[warningLevel]}`}>
                  ${usage.cost.toFixed(4)}
                </span>
              </div>
              {limits.maxCost && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      warningLevel === 'danger'
                        ? 'bg-red-500'
                        : warningLevel === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${costPercentage}%` }}  // ← Core層から受け取った値
                  />
                </div>
              )}
            </div>
          )}

          {/* リセットボタン */}
          {onReset && (
            <button
              type="button"
              onClick={() => {
                onReset();
                onClose();
              }}
              className="..."
            >
              リセット
            </button>
          )}
        </div>

        {/* 警告メッセージ */}
        {warningLevel !== 'normal' && (
          <div className={`px-4 py-2 ${levelBgColors[warningLevel]} border-t border-gray-200`}>
            <p className={`text-xs ${levelColors[warningLevel]}`}>
              {warningLevel === 'danger'
                ? '⚠️ 制限に達しました'
                : '⚠️ 制限値に近づいています'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
```

### Step 4: AIIconSetの更新

**更新ファイル**: `src/ui/components/AIIconSet.tsx`

```typescript
{/* 📊 Token使用量 */}
<div className="relative">
  <TooltipButton
    onClick={() => uiHandlers.toggleSubMenu('token')}
    disabled={state.isLoading}
    label="Token使用量"
    className={iconButtonClass}
  >
    <span className="text-xl">📊</span>
  </TooltipButton>

  {/* Token使用量パネル */}
  {uiState.openSubMenu === 'token' && (
    <AITokenUsagePanel
      tokenUsageDetails={state.tokenUsageDetails}  // ← 変更
      onClose={() => uiHandlers.toggleSubMenu('token')}
      position="left"
    />
  )}
</div>
```

### Step 5: Providerインターフェースの拡張（オプション）

現在のProviderインターフェースは十分だが、将来的な拡張のために以下を検討：

**更新ファイル**: `src/providers/IAIProvider.ts`

```typescript
export interface IAIProvider {
  // ... 既存のメソッド

  /**
   * Token使用量を取得
   */
  getTokenUsage(): TokenUsage;

  /**
   * Token使用量をリセット
   */
  resetTokenUsage(): void;

  // 将来的な拡張候補（今回は実装しない）
  // /**
  //  * モデル別のToken使用量を取得
  //  */
  // getTokenUsageByModel?(modelId: string): TokenUsage;
}
```

## 📝 実装手順

### Phase 1: Core層の整備
- [x] `src/core/utils/tokenCalculations.ts` を作成
- [x] 型定義 (`TokenWarningLevel`, `TokenUsageDetails`) を追加
- [x] 計算関数を実装
  - `calculateTokenWarningLevel`
  - `calculateTokenPercentage`
  - `calculateTokenUsageDetails`

### Phase 2: useAIRegisterの拡張
- [x] `tokenUsageDetails` を計算して state に追加
- [x] `AIRegisterResult` 型定義を更新

### Phase 3: UI層の更新
- [x] `AITokenUsagePanel` のProps変更
- [x] ローカル計算ロジックを削除
- [x] Core層から受け取った計算結果を使用
- [x] `AIIconSet` のPropsを更新

### Phase 4: テストと検証
- [x] TypeCheck
- [x] Build
- [x] 動作確認

## 🎯 期待される効果

### 1. 責務の明確化
- **Core層**: Token計算ロジックを一元管理
- **UI層**: 計算結果を表示するだけ

### 2. 再利用性の向上
- Token計算ロジックを他のコンポーネントでも使用可能
- 将来的に他のUI（例: ヘッダーのToken表示）でも利用できる

### 3. テスタビリティの向上
- Core層のロジックを単体テスト可能
- UIコンポーネントのテストがシンプルになる

### 4. 保守性の向上
- ビジネスルール（閾値、計算式）の変更がCore層の1箇所で済む
- UI層はスタイリングに集中できる

## 📚 補足

### Token計算ロジックの再利用例

将来的に以下のような場所でも使用可能：

```typescript
// 例1: ヘッダーにToken使用量インジケーターを表示
function HeaderTokenIndicator() {
  const ai = useAIRegister({ ... });
  const { warningLevel, tokenPercentage } = ai.state.tokenUsageDetails;

  return (
    <div className={getColorByLevel(warningLevel)}>
      {tokenPercentage}% used
    </div>
  );
}

// 例2: Token制限に達したら自動的にアクションを無効化
function AIActionButton() {
  const ai = useAIRegister({ ... });
  const { isLimitReached } = ai.state.tokenUsageDetails;

  return (
    <button disabled={isLimitReached || ai.state.isLoading}>
      Generate
    </button>
  );
}
```

### パフォーマンス最適化

- `useMemo`で計算結果をキャッシュ
- `tokenUsage`または`tokenLimits`が変更された時のみ再計算
- UI層での不要な再レンダリングを防止
