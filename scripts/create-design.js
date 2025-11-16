#!/usr/bin/env node

/**
 * VibeCoding Design Generator
 * Creates a new design document from template
 *
 * Usage:
 *   npm run design:new <feature-name>
 *   npm run design:new user-dashboard
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const featureName = process.argv[2]

if (!featureName) {
  console.error('❌ Error: Feature name is required')
  console.log('\nUsage:')
  console.log('  npm run design:new <feature-name>')
  console.log('\nExample:')
  console.log('  npm run design:new user-dashboard')
  process.exit(1)
}

// Convert kebab-case to Title Case
const toTitleCase = (str) => {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const templatePath = path.join(__dirname, '../docs/templates/design-template.md')
const outputPath = path.join(__dirname, '../workspace', `${featureName}-design.md`)

// Check if template exists
if (!fs.existsSync(templatePath)) {
  console.error('❌ Error: Design template not found at', templatePath)
  process.exit(1)
}

// Check if output file already exists
if (fs.existsSync(outputPath)) {
  console.error(`❌ Error: Design document already exists: ${outputPath}`)
  console.log('\nTip: Delete the existing file or use a different name')
  process.exit(1)
}

// Read template
const template = fs.readFileSync(templatePath, 'utf8')

// Replace placeholders
const today = new Date().toISOString().split('T')[0]
const title = toTitleCase(featureName)

const content = template
  .replace('[Feature Name]', title)
  .replace(/\[Date\]/g, today)
  .replace('Draft / In Progress / Completed', 'Draft')

// Write output
fs.writeFileSync(outputPath, content, 'utf8')

console.log('✅ Design document created successfully!')
console.log(`\n📄 File: ${outputPath}`)
console.log(`\n🚀 Next steps:`)
console.log(`   1. Open the file and fill in the sections`)
console.log(`   2. Discuss with user to clarify requirements`)
console.log(`   3. Reference AGENT.md for patterns and examples`)
console.log(`   4. Start VibeCoding!\n`)
