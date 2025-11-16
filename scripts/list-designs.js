#!/usr/bin/env node

/**
 * Design Examples List
 * Lists all available design examples
 *
 * Usage:
 *   npm run design:list
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const examplesDir = path.join(__dirname, '../docs/examples')

// Check if examples directory exists
if (!fs.existsSync(examplesDir)) {
  console.log('📚 No design examples found yet.')
  console.log('\nTip: Use "npm run design:publish <feature-name>" to publish your first example!')
  process.exit(0)
}

// Read all markdown files
const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.md'))

if (files.length === 0) {
  console.log('📚 No design examples found yet.')
  console.log('\nTip: Use "npm run design:publish <feature-name>" to publish your first example!')
  process.exit(0)
}

console.log('📚 Available Design Examples:\n')

files.forEach((file, index) => {
  const filePath = path.join(examplesDir, file)
  const content = fs.readFileSync(filePath, 'utf8')

  // Extract metadata from markdown
  const titleMatch = content.match(/^# (.+)/m)
  const title = titleMatch ? titleMatch[1] : file.replace('.md', '')

  // Extract description (first paragraph after title)
  const descMatch = content.match(/^##\s+1\.\s+.*?\n\n\*\*WHY.*?:\*\*\n-\s+(.+)/m)
  const description = descMatch ? descMatch[1] : 'No description'

  // Extract creation date
  const dateMatch = content.match(/\*\*Created:\*\*\s+(.+)/m)
  const created = dateMatch ? dateMatch[1] : 'Unknown'

  // Extract status
  const statusMatch = content.match(/\*\*Status:\*\*\s+(.+)/m)
  const status = statusMatch ? statusMatch[1] : 'Unknown'

  // Count screens (routing section)
  const routingMatch = content.match(/```\n(\/.*?\n)+```/m)
  const screenCount = routingMatch
    ? routingMatch[0].split('\n').filter((l) => l.startsWith('/')).length
    : 0

  console.log(`${index + 1}. ${file}`)
  console.log(`   Title: ${title}`)
  console.log(`   ${description}`)
  console.log(`   Created: ${created} | Status: ${status}`)
  if (screenCount > 0) {
    console.log(`   Screens: ${screenCount}`)
  }
  console.log()
})

console.log(`Total: ${files.length} example(s)`)
console.log('\n💡 Use "npm run design:use" to copy an example to your workspace')
