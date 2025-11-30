#!/usr/bin/env npx tsx
/**
 * List Articles CLI Example
 * PoC: HEADLESS API Generator
 *
 * Usage:
 *   npx tsx examples/list-articles.ts
 *   npx tsx examples/list-articles.ts --status=draft
 *   npx tsx examples/list-articles.ts --status=published
 */

import 'dotenv/config'
import { AkatsukiClient, ArticlesClient, Article } from '../client.js'

async function main(): Promise<void> {
  const client = new AkatsukiClient()
  const articles = new ArticlesClient(client)

  try {
    // Parse command line args
    const args = process.argv.slice(2)
    const statusArg = args.find(arg => arg.startsWith('--status='))
    const status = statusArg ? statusArg.split('=')[1] as 'draft' | 'published' : undefined

    console.log('📝 Articles List CLI')
    console.log('─'.repeat(50))

    // Login (you can also use environment variables)
    const email = process.env.SUPABASE_USER_EMAIL
    const password = process.env.SUPABASE_USER_PASSWORD

    if (!email || !password) {
      console.log('\n🔐 Login required')
      await client.loginInteractive()
    } else {
      await client.login(email, password)
    }

    // Get articles
    console.log(`\n📚 Fetching ${status ? status : 'all'} articles...`)
    const myArticles = await articles.getMyArticles(status ? { status } : {})

    console.log(`\n✅ Found ${myArticles.length} article(s)\n`)

    if (myArticles.length === 0) {
      console.log('  No articles yet. Create one first!')
    } else {
      myArticles.forEach((article: Article, i: number) => {
        console.log(`${i + 1}. ${article.title}`)
        console.log(`   Status: ${article.status}`)
        console.log(`   Created: ${new Date(article.created_at).toLocaleDateString()}`)
        console.log(`   ID: ${article.id}`)
        if (article.tags && article.tags.length > 0) {
          console.log(`   Tags: ${article.tags.join(', ')}`)
        }
        console.log()
      })
    }

    // Logout
    await client.logout()

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Error:', message)
    process.exit(1)
  }
}

main()
