/**
 * Akatsuki統一レスポンス型定義
 *
 * すべてのSupabase Edge Functionが必ず返す統一ラッパー型。
 * これにより、フロントエンドでのレスポンス解析が安定し、エラーハンドリングが統一される。
 */

/**
 * 成功レスポンス型
 * @template T - 実際の返却値の型
 */
export interface AkatsukiSuccessResponse<T> {
  /** 成功フラグ */
  success: true
  /** 実際の返却値（Supabaseクライアントの'data'との混同を避け'result'を採用） */
  result: T
  /** エラーは常にnull */
  error: null
}

/**
 * エラーレスポンス型
 */
export interface AkatsukiErrorResponse {
  /** 成功フラグ */
  success: false
  /** 結果は常にnull */
  result: null
  /** エラー詳細 */
  error: {
    /** エラーメッセージ */
    message: string
    /** エラーコード（例: 'VALIDATION_FAILED', 'UNAUTHORIZED', 'QUOTA_EXCEEDED', 'INTERNAL_ERROR'） */
    code?: string
  }
}

/**
 * 全Edge Functionが返すレスポンスの共用型
 * @template T - 成功時の返却値の型
 */
export type AkatsukiResponse<T> =
  | AkatsukiSuccessResponse<T>
  | AkatsukiErrorResponse

/**
 * よく使われるエラーコード定数
 */
export const ErrorCodes = {
  /** バリデーションエラー */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** 認証エラー */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** クォータ超過 */
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  /** 内部サーバーエラー */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** リソースが見つからない */
  NOT_FOUND: 'NOT_FOUND',
  /** 権限不足 */
  FORBIDDEN: 'FORBIDDEN',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
