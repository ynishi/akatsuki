import type { TokenUsageDetails, AIPanelPosition } from '../../core/types';

/**
 * AITokenUsagePanelコンポーネントのProps
 */
export interface AITokenUsagePanelProps {
  /** Token使用量の詳細情報（Core層で計算済み） */
  tokenUsageDetails: TokenUsageDetails;
  /** リセット時のコールバック */
  onReset?: () => void;
  /** 閉じるコールバック */
  onClose: () => void;
  /** パネルの位置 */
  position?: AIPanelPosition;
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
  tokenUsageDetails,
  onReset,
  onClose,
  position = 'center',
}: AITokenUsagePanelProps) {
  // UI層は計算結果を使うだけ
  const { usage, limits, warningLevel, tokenPercentage, costPercentage } = tokenUsageDetails;

  // 位置に応じたクラス
  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

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
                  style={{
                    width: `${tokenPercentage}%`,
                  }}
                />
              </div>
            )}
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 pl-2">入力</span>
                <span className="text-gray-700">
                  {usage.input.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 pl-2">出力</span>
                <span className="text-gray-700">
                  {usage.output.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* プロバイダー別内訳 */}
          {usage.byProvider && Object.keys(usage.byProvider).length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-600 border-b border-gray-200 pb-1">
                プロバイダー別
              </div>
              {Object.entries(usage.byProvider).map(([provider, providerUsage]) => (
                <div key={provider} className="space-y-1">
                  <div className="text-xs font-medium text-gray-700 capitalize">
                    {provider}
                  </div>
                  <div className="flex items-center justify-between text-xs pl-2">
                    <span className="text-gray-500">入力</span>
                    <span className="text-gray-700">
                      {providerUsage.input.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pl-2">
                    <span className="text-gray-500">出力</span>
                    <span className="text-gray-700">
                      {providerUsage.output.toLocaleString()}
                    </span>
                  </div>
                  {providerUsage.cost !== undefined && providerUsage.cost > 0 && (
                    <div className="flex items-center justify-between text-xs pl-2">
                      <span className="text-gray-500">コスト</span>
                      <span className="text-gray-700">
                        ${providerUsage.cost.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
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
                    style={{
                      width: `${costPercentage}%`,
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
