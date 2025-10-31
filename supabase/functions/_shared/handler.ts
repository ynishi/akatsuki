/**
 * Akatsuki統一ハンドラー
 *
 * すべてのEdge Functionで使用する統一ハンドラー。
 * - 認証クライアント自動作成（BP 1）
 * - Repository初期化・注入
 * - 入力バリデーション（Zod）
 * - 統一レスポンス形式（AkatsukiResponse）
 * - エラーハンドリング
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { AkatsukiResponse, AkatsukiErrorResponse, ErrorCodes } from './api_types.ts'
import { corsHeaders } from './cors.ts'
import { UserQuotaRepository } from './repositories/UserQuotaRepository.ts'
import { LLMCallLogRepository } from './repositories/LLMCallLogRepository.ts'

/**
 * Repository集約オブジェクト
 */
export interface Repositories {
  userQuota: UserQuotaRepository
  llmCallLog: LLMCallLogRepository
}

/**
 * logic関数に渡されるコンテキスト（ユーザー向けAPI用）
 */
export interface HandlerContext<I> {
  /** バリデーション済み入力 */
  input: I
  /** ユーザー権限のSupabaseクライアント（RLS有効） */
  userClient: SupabaseClient
  /** 管理者権限のSupabaseクライアント（RLSバイパス、Usage等の改ざん防止用） */
  adminClient: SupabaseClient
  /** Repository集約（AdminClient使用） */
  repos: Repositories
  /** 元のRequest（ヘッダー等の参照用） */
  req: Request
}

/**
 * logic関数に渡されるコンテキスト（システム内部API用）
 */
export interface SystemHandlerContext<I> {
  /** バリデーション済み入力 */
  input: I
  /** 管理者権限のSupabaseクライアント（RLSバイパス） */
  adminClient: SupabaseClient
  /** Repository集約（AdminClient使用） */
  repos: Repositories
  /** 元のRequest（ヘッダー等の参照用） */
  req: Request
}

/**
 * ハンドラーオプション
 */
export interface AkatsukiHandlerOptions<I, O> {
  /** 入力スキーマ（Zod） */
  inputSchema: z.ZodType<I>
  /** ビジネスロジック */
  logic: (context: HandlerContext<I>) => Promise<O>
  /** 認証を必須とするか（デフォルト: true） */
  requireAuth?: boolean
}

/**
 * ユーザー権限クライアントを作成（認証確認用）
 * @param req - Request
 * @returns ユーザー権限のSupabaseクライアント
 * @throws Authorization headerが無い場合
 */
function createAuthedClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw Object.assign(new Error('Missing Authorization header'), {
      code: ErrorCodes.UNAUTHORIZED,
      status: 401,
    })
  }

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
    }
  )
}

/**
 * Admin クライアントを作成（DB操作用）
 * @returns サービスロールキーを持つSupabaseクライアント
 */
function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

/**
 * Repository群を初期化
 * @param supabaseAdmin - Admin クライアント（サービスロールキー）
 * @returns Repository集約オブジェクト
 */
function createRepositories(supabaseAdmin: SupabaseClient): Repositories {
  return {
    userQuota: new UserQuotaRepository(supabaseAdmin),
    llmCallLog: new LLMCallLogRepository(supabaseAdmin),
  }
}

/**
 * Akatsuki統一ハンドラー（ユーザー向けAPI用）
 *
 * 認証必須のユーザー向けAPIで使用。
 * - userClient: RLS有効（ユーザー自身のデータのみ操作）
 * - adminClient: RLSバイパス（Usage等の改ざん防止用）
 *
 * @template I - 入力型
 * @template O - 出力型
 * @param req - Request
 * @param options - ハンドラーオプション
 * @returns AkatsukiResponse<O>形式のResponse
 *
 * @example
 * ```typescript
 * Deno.serve(async (req) => {
 *   return createAkatsukiHandler<Input, Output>(req, {
 *     inputSchema: InputSchema,
 *     logic: async ({ input, userClient, adminClient, repos }) => {
 *       // Chat履歴はuserClientで取得（自分のデータのみ）
 *       const { data } = await userClient.from('chats').select('*')
 *
 *       // Usageはadminclient経由のRepoで更新（改ざん防止）
 *       await repos.userQuota.incrementUsage(quotaId)
 *
 *       return { message: 'Success' }
 *     },
 *   })
 * })
 * ```
 */
export async function createAkatsukiHandler<I, O>(
  req: Request,
  options: AkatsukiHandlerOptions<I, O>
): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requireAuth = options.requireAuth ?? true
  let input: I
  let userClient: SupabaseClient
  let adminClient: SupabaseClient
  let repos: Repositories

  try {
    // 1. ユーザークライアントの作成（RLS有効、認証必須）
    if (requireAuth) {
      userClient = createAuthedClient(req)
    } else {
      // 認証不要の場合はANON KEYクライアント
      userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )
    }

    // 2. Admin クライアントの作成（RLSバイパス、Usage等の改ざん防止用）
    adminClient = createAdminClient()

    // 3. Repository初期化（Admin クライアントを渡す）
    repos = createRepositories(adminClient)

    // 4. 入力バリデーション
    const body = await req.json()
    const validation = options.inputSchema.safeParse(body)

    if (!validation.success) {
      console.warn('[Akatsuki Handler] Validation failed:', validation.error.errors)
      const errorResponse: AkatsukiErrorResponse = {
        success: false,
        result: null,
        error: {
          message: validation.error.errors.map((e) => e.message).join(', '),
          code: ErrorCodes.VALIDATION_FAILED,
        },
      }
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    input = validation.data

    // 5. ビジネスロジック実行
    const result: O = await options.logic({
      input,
      userClient,
      adminClient,
      repos,
      req,
    })

    // 6. 成功レスポンス
    const successResponse: AkatsukiResponse<O> = {
      success: true,
      result: result,
      error: null,
    }

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    // 6. エラーレスポンス
    console.error('[Akatsuki Handler] Error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack,
    })

    const errorResponse: AkatsukiErrorResponse = {
      success: false,
      result: null,
      error: {
        message: error.message || 'Internal server error',
        code: error.code || ErrorCodes.INTERNAL_ERROR,
      },
    }

    return new Response(JSON.stringify(errorResponse), {
      status: error.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

/**
 * System Handler オプション
 */
export interface SystemHandlerOptions<I, O> {
  /** 入力スキーマ（Zod） */
  inputSchema: z.ZodType<I>
  /** ビジネスロジック */
  logic: (context: SystemHandlerContext<I>) => Promise<O>
}

/**
 * System統一ハンドラー（内部システムAPI用）
 *
 * Webhook、Database Trigger等の内部システムで使用。
 * - 認証: 不要（Webhookシグネチャ検証等は個別に実装）
 * - adminClient: RLSバイパス（全データアクセス可能）
 *
 * @template I - 入力型
 * @template O - 出力型
 * @param req - Request
 * @param options - ハンドラーオプション
 * @returns AkatsukiResponse<O>形式のResponse
 *
 * @example
 * ```typescript
 * Deno.serve(async (req) => {
 *   return createSystemHandler<Input, Output>(req, {
 *     inputSchema: InputSchema,
 *     logic: async ({ input, adminClient, repos }) => {
 *       // 全ユーザーのデータにアクセス可能
 *       const { data } = await adminClient.from('user_quotas').select('*')
 *
 *       // Webhookの処理など
 *       await repos.userQuota.create({ ... })
 *
 *       return { received: true }
 *     },
 *   })
 * })
 * ```
 */
export async function createSystemHandler<I, O>(
  req: Request,
  options: SystemHandlerOptions<I, O>
): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let input: I
  let adminClient: SupabaseClient
  let repos: Repositories

  try {
    // 1. Admin クライアントの作成（RLSバイパス）
    adminClient = createAdminClient()

    // 2. Repository初期化（Admin クライアントを渡す）
    repos = createRepositories(adminClient)

    // 3. 入力バリデーション
    const body = await req.json()
    const validation = options.inputSchema.safeParse(body)

    if (!validation.success) {
      console.warn('[System Handler] Validation failed:', validation.error.errors)
      const errorResponse: AkatsukiErrorResponse = {
        success: false,
        result: null,
        error: {
          message: validation.error.errors.map((e: any) => e.message).join(', '),
          code: ErrorCodes.VALIDATION_FAILED,
        },
      }
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    input = validation.data

    // 4. ビジネスロジック実行
    const result: O = await options.logic({
      input,
      adminClient,
      repos,
      req,
    })

    // 5. 成功レスポンス
    const successResponse: AkatsukiResponse<O> = {
      success: true,
      result: result,
      error: null,
    }

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    // 6. エラーレスポンス
    console.error('[System Handler] Error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack,
    })

    const errorResponse: AkatsukiErrorResponse = {
      success: false,
      result: null,
      error: {
        message: error.message || 'Internal server error',
        code: error.code || ErrorCodes.INTERNAL_ERROR,
      },
    }

    return new Response(JSON.stringify(errorResponse), {
      status: error.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
