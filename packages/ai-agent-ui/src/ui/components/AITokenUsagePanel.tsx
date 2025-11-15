import type { TokenUsage, TokenLimits } from '../../core/types';

/**
 * AITokenUsagePanelコンポーネントのProps
 */
export interface AITokenUsagePanelProps {
  /** Token使用量 */
  tokenUsage: TokenUsage;
  /** Token制限値 */
  tokenLimits: TokenLimits;
  /** リセット時のコールバック */
  onReset?: () => void;
  /** 閉じるコールバック */
  onClose: () => void;
  /** パネルの位置 */
  position?: 'left' | 'right' | 'center';
}

/**
 * 📊 AIToken使用量パネルコンポーネント
 *
 * Token使用量、コスト、リミットを表示
 *
 * @example
 * ```tsx
 * <AITokenUsagePanel
 *   tokenUsage={state.tokenUsage}
 *   tokenLimits={state.tokenLimits}
 *   onReset={() => provider.resetTokenUsage()}
 *   onClose={() => setShowTokenPanel(false)}
 * />
 * ```
 */
export function AITokenUsagePanel({
  tokenUsage,
  tokenLimits,
  onReset,
  onClose,
  position = 'center',
}: AITokenUsagePanelProps) {
  // 位置に応じたクラス
  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  // 警告レベルの計算
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

  const warningLevel = getWarningLevel();

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

  // パーセンテージの計算
  const getPercentage = (value: number, max?: number): number => {
    if (!max) return 0;
    return Math.min((value / max) * 100, 100);
  };

  return (
    <>
      {/* オーバーレイ（クリックで閉じる） */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tokenパネル */}
      <div
        className={`absolute bottom-full mb-2 ${positionClasses[position]} z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden`}
      >
        {/* ヘッダー */}
        <div className={`px-4 py-3 border-b border-gray-200 ${levelBgColors[warningLevel]}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              📊 Token使用量
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="閉じる"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>
        </div>

        {/* 使用量詳細 */}
        <div className="p-4 space-y-4">
          {/* 合計トークン数 */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 font-semibold">合計</span>
              <span className={`font-semibold ${levelColors[warningLevel]}`}>
                {tokenUsage.total.toLocaleString()}
              </span>
            </div>
            {tokenLimits.maxTokens && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    warningLevel === 'danger'
                      ? 'bg-red-500'
                      : warningLevel === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{
                    width: `${getPercentage(tokenUsage.total, tokenLimits.maxTokens)}%`,
                  }}
                />
              </div>
            )}
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 pl-2">入力</span>
                <span className="text-gray-700">
                  {tokenUsage.input.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 pl-2">出力</span>
                <span className="text-gray-700">
                  {tokenUsage.output.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* プロバイダー別内訳 */}
          {tokenUsage.byProvider && Object.keys(tokenUsage.byProvider).length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-600 border-b border-gray-200 pb-1">
                プロバイダー別
              </div>
              {Object.entries(tokenUsage.byProvider).map(([provider, usage]) => (
                <div key={provider} className="space-y-1">
                  <div className="text-xs font-medium text-gray-700 capitalize">
                    {provider}
                  </div>
                  <div className="flex items-center justify-between text-xs pl-2">
                    <span className="text-gray-500">入力</span>
                    <span className="text-gray-700">
                      {usage.input.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pl-2">
                    <span className="text-gray-500">出力</span>
                    <span className="text-gray-700">
                      {usage.output.toLocaleString()}
                    </span>
                  </div>
                  {usage.cost !== undefined && usage.cost > 0 && (
                    <div className="flex items-center justify-between text-xs pl-2">
                      <span className="text-gray-500">コスト</span>
                      <span className="text-gray-700">
                        ${usage.cost.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* コスト表示 */}
          {tokenUsage.cost !== undefined && tokenUsage.cost > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">コスト</span>
                <span className={`font-semibold ${levelColors[warningLevel]}`}>
                  ${tokenUsage.cost.toFixed(4)}
                </span>
              </div>
              {tokenLimits.maxCost && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      warningLevel === 'danger'
                        ? 'bg-red-500'
                        : warningLevel === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${getPercentage(tokenUsage.cost, tokenLimits.maxCost)}%`,
                    }}
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
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
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
