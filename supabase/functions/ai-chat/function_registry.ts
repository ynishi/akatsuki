// Function Call Registry
// LLM Function Calling support for ai-chat Edge Function

import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// ============================================================
// Types
// ============================================================

export interface FunctionDefinition {
  name: string
  description: string
  parameters: z.ZodObject<any>
  executionType: 'sync' | 'async'
  handler: FunctionHandler
}

export type FunctionHandler = (
  args: Record<string, any>,
  context: FunctionCallContext
) => Promise<FunctionCallResult>

export interface FunctionCallContext {
  userId: string
  userClient: SupabaseClient
  adminClient: SupabaseClient
  llmCallLogId?: string
}

export interface FunctionCallResult {
  success: boolean
  result?: any
  error?: string
  systemEventId?: string
}

// ============================================================
// Zod Schema to JSON Schema Conversion
// ============================================================

export function zodToJsonSchema(schema: z.ZodObject<any>): Record<string, any> {
  const shape = schema._def.shape()
  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny
    properties[key] = zodTypeToJsonSchema(zodType)

    if (!zodType.isOptional()) {
      required.push(key)
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  }
}

function zodTypeToJsonSchema(zodType: z.ZodTypeAny): Record<string, any> {
  const typeName = zodType._def.typeName

  switch (typeName) {
    case 'ZodString':
      return { type: 'string', description: zodType.description }
    case 'ZodNumber':
      return { type: 'number', description: zodType.description }
    case 'ZodBoolean':
      return { type: 'boolean', description: zodType.description }
    case 'ZodArray':
      return {
        type: 'array',
        items: zodTypeToJsonSchema(zodType._def.type),
        description: zodType.description,
      }
    case 'ZodObject':
      return zodToJsonSchema(zodType)
    case 'ZodEnum':
      return {
        type: 'string',
        enum: zodType._def.values,
        description: zodType.description,
      }
    case 'ZodOptional':
      return zodTypeToJsonSchema(zodType._def.innerType)
    case 'ZodNullable':
      return zodTypeToJsonSchema(zodType._def.innerType)
    default:
      return { type: 'string', description: zodType.description }
  }
}

// ============================================================
// Provider-Specific Format Conversion
// ============================================================

export function toOpenAITools(functions: FunctionDefinition[]) {
  return functions.map(fn => ({
    type: 'function',
    function: {
      name: fn.name,
      description: fn.description,
      parameters: zodToJsonSchema(fn.parameters),
    },
  }))
}

export function toAnthropicTools(functions: FunctionDefinition[]) {
  return functions.map(fn => ({
    name: fn.name,
    description: fn.description,
    input_schema: zodToJsonSchema(fn.parameters),
  }))
}

export function toGeminiFunctionDeclarations(functions: FunctionDefinition[]) {
  return functions.map(fn => ({
    name: fn.name,
    description: fn.description,
    parameters: zodToJsonSchema(fn.parameters),
  }))
}

// ============================================================
// Function Call Execution
// ============================================================

export async function executeFunctionCall(
  functionName: string,
  functionArgs: Record<string, any>,
  context: FunctionCallContext,
  registry: Map<string, FunctionDefinition>
): Promise<FunctionCallResult> {
  const func = registry.get(functionName)
  if (!func) {
    return {
      success: false,
      error: `Function '${functionName}' not found in registry`,
    }
  }

  // Validate arguments
  const validation = func.parameters.safeParse(functionArgs)
  if (!validation.success) {
    return {
      success: false,
      error: `Invalid arguments: ${validation.error.message}`,
    }
  }

  const startTime = Date.now()
  let result: FunctionCallResult

  try {
    // Execute function handler
    if (func.executionType === 'sync') {
      result = await func.handler(validation.data, context)
    } else {
      // Async: Register to Job System via system_events
      // Use 'job:function_name' format so process-events can route to the correct job handler
      const { data: eventData, error: eventError } = await context.adminClient
        .from('system_events')
        .insert({
          event_type: `job:${functionName}`,
          payload: validation.data,
          priority: 5,
          status: 'pending',
          user_id: context.userId,
        })
        .select()
        .single()

      if (eventError) {
        throw new Error(`Failed to register async function: ${eventError.message}`)
      }

      result = {
        success: true,
        result: {
          message: `Function '${functionName}' scheduled for async execution`,
          event_id: eventData.id,
        },
        systemEventId: eventData.id,
      }
    }
  } catch (error: any) {
    result = {
      success: false,
      error: error.message,
    }
  }

  const executionTime = Date.now() - startTime

  // Log function call
  await context.adminClient.from('function_call_logs').insert({
    llm_call_log_id: context.llmCallLogId,
    user_id: context.userId,
    function_name: functionName,
    function_arguments: functionArgs,
    execution_type: func.executionType,
    status: result.success ? 'success' : 'failed',
    result: result.result,
    error_message: result.error,
    system_event_id: result.systemEventId,
    execution_time_ms: executionTime,
    started_at: new Date(startTime).toISOString(),
    completed_at: new Date().toISOString(),
  })

  return result
}

// ============================================================
// Sample Function Definitions
// ============================================================

// Function: send_webhook
const sendWebhookFunction: FunctionDefinition = {
  name: 'send_webhook',
  description: 'Send a webhook to an external service with custom payload',
  parameters: z.object({
    url: z.string().url().describe('The webhook URL to send the request to'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().default('POST').describe('HTTP method'),
    headers: z.record(z.string()).optional().describe('Custom HTTP headers'),
    body: z.any().optional().describe('Request body payload'),
  }),
  executionType: 'async',
  handler: async (args, context) => {
    // Async functions are handled by Job System via system_events
    // The executeFunctionCall function will register this to system_events
    // with event_type: 'job:send_webhook' and the job handler will process it
    return {
      success: true,
      result: {
        message: 'Webhook scheduled for sending',
        url: args.url,
        method: args.method || 'POST',
      },
    }
  },
}

// Function: query_database
const queryDatabaseFunction: FunctionDefinition = {
  name: 'query_database',
  description: 'Execute a read-only database query using Supabase',
  parameters: z.object({
    table: z.string().describe('The table name to query'),
    filters: z.record(z.any()).optional().describe('Filter conditions (key-value pairs)'),
    select: z.string().optional().default('*').describe('Columns to select'),
    limit: z.number().optional().default(10).describe('Maximum number of results'),
  }),
  executionType: 'sync',
  handler: async (args, context) => {
    try {
      let query = context.userClient.from(args.table).select(args.select)

      if (args.filters) {
        for (const [key, value] of Object.entries(args.filters)) {
          query = query.eq(key, value)
        }
      }

      query = query.limit(args.limit)

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        result: { data, count: data?.length || 0 },
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },
}

// Function: send_notification
const sendNotificationFunction: FunctionDefinition = {
  name: 'send_notification',
  description: 'Send a notification to the user (email, push, or in-app)',
  parameters: z.object({
    type: z.enum(['email', 'push', 'in_app']).describe('Notification type'),
    title: z.string().describe('Notification title'),
    message: z.string().describe('Notification message'),
    recipients: z.array(z.string()).optional().describe('Recipient user IDs (defaults to current user)'),
  }),
  executionType: 'async',
  handler: async (args, context) => {
    return {
      success: true,
      result: {
        message: 'Notification scheduled for delivery',
        type: args.type,
        recipients: args.recipients || [context.userId],
      },
    }
  },
}

// Function: generate_image
const generateImageFunction: FunctionDefinition = {
  name: 'generate_image',
  description: 'Generate an image using AI (DALL-E, Stable Diffusion, etc.)',
  parameters: z.object({
    prompt: z.string().describe('The image generation prompt'),
    size: z.enum(['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024']).optional().default('1024x1024').describe('Image size'),
    quality: z.enum(['standard', 'hd']).optional().default('standard').describe('Image quality'),
    style: z.enum(['vivid', 'natural']).optional().default('vivid').describe('Image style'),
  }),
  executionType: 'async',
  handler: async (args, context) => {
    return {
      success: true,
      result: {
        message: 'Image generation scheduled',
        prompt: args.prompt,
        size: args.size,
      },
    }
  },
}

// Function: aggregate_data
const aggregateDataFunction: FunctionDefinition = {
  name: 'aggregate_data',
  description: 'Perform data aggregation and analysis on database tables',
  parameters: z.object({
    table: z.string().describe('The table name to aggregate'),
    operation: z.enum(['count', 'sum', 'avg', 'min', 'max']).describe('Aggregation operation'),
    column: z.string().optional().describe('Column to aggregate (not needed for count)'),
    groupBy: z.string().optional().describe('Column to group by'),
    filters: z.record(z.any()).optional().describe('Filter conditions before aggregation'),
  }),
  executionType: 'sync',
  handler: async (args, context) => {
    try {
      // This is a simplified implementation
      // In production, you'd want more robust SQL aggregation
      let query = context.userClient.from(args.table).select('*')

      if (args.filters) {
        for (const [key, value] of Object.entries(args.filters)) {
          query = query.eq(key, value)
        }
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data) {
        return { success: false, error: 'No data found' }
      }

      let result: any

      switch (args.operation) {
        case 'count':
          result = data.length
          break
        case 'sum':
          result = data.reduce((acc, row) => acc + (row[args.column!] || 0), 0)
          break
        case 'avg':
          result = data.reduce((acc, row) => acc + (row[args.column!] || 0), 0) / data.length
          break
        case 'min':
          result = Math.min(...data.map(row => row[args.column!] || Infinity))
          break
        case 'max':
          result = Math.max(...data.map(row => row[args.column!] || -Infinity))
          break
      }

      return {
        success: true,
        result: {
          operation: args.operation,
          value: result,
          rowCount: data.length,
        },
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },
}

// ============================================================
// Function Registry
// ============================================================

export function createFunctionRegistry(): Map<string, FunctionDefinition> {
  const registry = new Map<string, FunctionDefinition>()

  registry.set('send_webhook', sendWebhookFunction)
  registry.set('query_database', queryDatabaseFunction)
  registry.set('send_notification', sendNotificationFunction)
  registry.set('generate_image', generateImageFunction)
  registry.set('aggregate_data', aggregateDataFunction)

  return registry
}

export function getAllFunctions(): FunctionDefinition[] {
  const registry = createFunctionRegistry()
  return Array.from(registry.values())
}
