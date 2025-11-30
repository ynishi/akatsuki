#!/usr/bin/env node
/**
 * Publish Article CLI Example
 * PoC: HEADLESS API Generator
 *
 * Usage:
 *   node cli/examples/publish-article.js <article-id>
 */

import 'dotenv/config'
import { AkatsukiClient, ArticlesClient } from '../client.js'

async function main() {
  const client = new AkatsukiClient()
  const articles = new ArticlesClient(client)

  try {
    // Parse command line args
    const args = process.argv.slice(2)
    const articleId = args[0]

    if (!articleId) {
      console.log('Usage: node publish-article.js <article-id>')
      console.log('\nExample:')
      console.log('  node publish-article.js 550e8400-e29b-41d4-a716-446655440000')
      process.exit(1)
    }

    console.log('🚀 Publish Article CLI')
    console.log('─'.repeat(50))

    // Login
    const email = process.env.SUPABASE_USER_EMAIL
    const password = process.env.SUPABASE_USER_PASSWORD

    if (!email || !password) {
      console.log('\n🔐 Login required')
      await client.loginInteractive()
    } else {
      await client.login(email, password)
    }

    // Get article first
    console.log(`\n📖 Fetching article...`)
    const article = await articles.getById(articleId)

    console.log(`   Title: ${article.title}`)
    console.log(`   Current Status: ${article.status}`)

    if (article.status === 'published') {
      console.log('\n⚠️  Article is already published!')
      await client.logout()
      return
    }

    // Publish article
    console.log(`\n🚀 Publishing article...`)
    const updated = await articles.publish(articleId)

    console.log(`\n✅ Article published successfully!`)
    console.log(`   ID: ${updated.id}`)
    console.log(`   Title: ${updated.title}`)
    console.log(`   Status: ${updated.status}`)
    console.log(`   Updated: ${new Date(updated.updated_at).toLocaleString()}`)

    // Logout
    await client.logout()

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
