#!/usr/bin/env node
/**
 * Create Article CLI Example
 * PoC: HEADLESS API Generator
 *
 * Usage:
 *   node cli/examples/create-article.js "My Title" "My Content"
 *   node cli/examples/create-article.js "My Title" "My Content" --publish
 */

import 'dotenv/config'
import { AkatsukiClient, ArticlesClient } from '../client.js'

async function main() {
  const client = new AkatsukiClient()
  const articles = new ArticlesClient(client)

  try {
    // Parse command line args
    const args = process.argv.slice(2)
    const title = args[0]
    const content = args[1]
    const shouldPublish = args.includes('--publish')

    if (!title || !content) {
      console.log('Usage: node create-article.js "Title" "Content" [--publish]')
      console.log('\nExample:')
      console.log('  node create-article.js "Hello World" "My first article"')
      console.log('  node create-article.js "Hello World" "My first article" --publish')
      process.exit(1)
    }

    console.log('📝 Create Article CLI')
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

    // Create article
    console.log(`\n✍️  Creating article...`)
    console.log(`   Title: ${title}`)
    console.log(`   Content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`)
    console.log(`   Status: ${shouldPublish ? 'published' : 'draft'}`)

    const article = await articles.create({
      title,
      content,
      status: shouldPublish ? 'published' : 'draft',
      tags: []
    })

    console.log(`\n✅ Article created successfully!`)
    console.log(`   ID: ${article.id}`)
    console.log(`   Title: ${article.title}`)
    console.log(`   Status: ${article.status}`)
    console.log(`   Created: ${new Date(article.created_at).toLocaleString()}`)

    // Logout
    await client.logout()

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
