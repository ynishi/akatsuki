import { createAkatsukiHandler } from '../_shared/handler.ts'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.12.0'

const WebSearchInputSchema = z.object({
  query: z.string().min(1),
  num_results: z.number().int().min(1).max(20).optional().default(10),
  provider: z.enum(['tavily', 'gemini']).optional().default('gemini'),
})

Deno.serve(async (req) => {
  return createAkatsukiHandler(req, {
    inputSchema: WebSearchInputSchema,
    requireAuth: true,

    logic: async ({ input, userClient }) => {
      const { query, num_results, provider } = input

      // Provider分岐
      if (provider === 'gemini') {
        // Gemini Google検索
        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY is not set')
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          tools: [{ googleSearch: {} }],
        })

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: query }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        })

        const response = result.response
        const text = response.text()
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata

        // 検索結果を統一形式に変換
        const searchResults = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || 'Untitled',
          url: chunk.web?.uri || '',
          content: text.substring(0, 200) + '...', // 一部抜粋
          score: 0.9, // Geminiは信頼性が高いので固定値
        })) || []

        return {
          query,
          answer: text,
          results: searchResults.slice(0, num_results),
          num_results: searchResults.length,
          provider: 'gemini',
          searchQueries: groundingMetadata?.webSearchQueries || [],
        }
      } else {
        // Tavily API呼び出し
        const apiKey = Deno.env.get('TAVILY_API_KEY')
        if (!apiKey) {
          throw new Error('TAVILY_API_KEY is not set')
        }

        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: apiKey,
            query: query,
            max_results: num_results,
            include_answer: true,
            include_raw_content: false,
          }),
        })

        if (!response.ok) {
          throw new Error(`Tavily API error: ${response.statusText}`)
        }

        const data = await response.json()

        // 結果を返す
        return {
          query: query,
          answer: data.answer,
          results: data.results.map((r: any) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
          })),
          num_results: data.results.length,
          provider: 'tavily',
        }
      }
    },
  })
})
