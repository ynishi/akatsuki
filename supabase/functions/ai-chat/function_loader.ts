// Function Call Loader
// DBからFunction定義を読み込んでLLM用の形式に変換

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Function Definition (from DB)
 */
export interface DbFunctionDefinition {
  id: string
  user_id: string | null
  name: string
  description: string
  parameters_schema: Record<string, any> // JSON Schema
  target_event_type: string
  is_enabled: boolean
  is_global: boolean
}

/**
 * Load function definitions from database
 */
export async function loadFunctionDefinitions(
  userId: string,
  adminClient: SupabaseClient
): Promise<DbFunctionDefinition[]> {
  const { data, error } = await adminClient
    .from('function_call_definitions')
    .select('*')
    .eq('is_enabled', true)
    .or(`user_id.eq.${userId},is_global.eq.true`)
    .order('name')

  if (error) {
    console.error('[function_loader] Error loading functions:', error)
    throw new Error(`Failed to load function definitions: ${error.message}`)
  }

  return data || []
}

/**
 * Convert DB functions to OpenAI Tools format
 */
export function toOpenAITools(functions: DbFunctionDefinition[]) {
  return functions.map(fn => ({
    type: 'function',
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters_schema,
    },
  }))
}

/**
 * Convert DB functions to Anthropic Tools format
 */
export function toAnthropicTools(functions: DbFunctionDefinition[]) {
  return functions.map(fn => ({
    name: fn.name,
    description: fn.description,
    input_schema: fn.parameters_schema,
  }))
}

/**
 * Convert DB functions to Gemini Function Declarations
 */
export function toGeminiFunctionDeclarations(functions: DbFunctionDefinition[]) {
  return functions.map(fn => ({
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters_schema,
  }))
}

/**
 * Find function definition by name
 */
export function findFunctionByName(
  functions: DbFunctionDefinition[],
  name: string
): DbFunctionDefinition | undefined {
  return functions.find(f => f.name === name)
}

/**
 * Register function call to system_events (Job System)
 */
export async function registerFunctionCallAsJob(
  functionDef: DbFunctionDefinition,
  args: Record<string, any>,
  userId: string,
  adminClient: SupabaseClient,
  llmCallLogId?: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // Validate arguments against schema (basic check)
    // TODO: Use a JSON Schema validator for stricter validation

    // Register to system_events
    const { data: event, error: eventError } = await adminClient
      .from('system_events')
      .insert({
        event_type: functionDef.target_event_type,
        payload: args,
        priority: 5,
        status: 'pending',
        user_id: userId,
      })
      .select('id')
      .single()

    if (eventError) {
      throw new Error(`Failed to register job: ${eventError.message}`)
    }

    // Log to function_call_logs
    await adminClient.from('function_call_logs').insert({
      llm_call_log_id: llmCallLogId,
      user_id: userId,
      function_name: functionDef.name,
      function_arguments: args,
      execution_type: 'async', // All functions are async (Job System)
      status: 'pending',
      system_event_id: event.id,
      started_at: new Date().toISOString(),
    })

    return {
      success: true,
      eventId: event.id,
    }
  } catch (error: any) {
    // Log error to function_call_logs
    await adminClient.from('function_call_logs').insert({
      llm_call_log_id: llmCallLogId,
      user_id: userId,
      function_name: functionDef.name,
      function_arguments: args,
      execution_type: 'async',
      status: 'failed',
      error_message: error.message,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })

    return {
      success: false,
      error: error.message,
    }
  }
}
