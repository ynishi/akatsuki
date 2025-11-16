#!/usr/bin/env node

/**
 * Publish Design to Examples
 * Move completed design from workspace to docs/examples
 *
 * Usage:
 *   npm run design:publish <feature-name>
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import inquirer from 'inquirer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const featureName = process.argv[2]

if (!featureName) {
  console.error('❌ Error: Feature name is required')
  console.log('\nUsage:')
  console.log('  npm run design:publish <feature-name>')
  console.log('\nExample:')
  console.log('  npm run design:publish user-dashboard')
  process.exit(1)
}

const workspaceDir = path.join(__dirname, '../workspace')
const examplesDir = path.join(__dirname, '../docs/examples')
const sourcePath = path.join(workspaceDir, `${featureName}-design.md`)
const targetPath = path.join(examplesDir, `${featureName}-design.md`)

// Check if source file exists
if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Error: Design file not found: ${sourcePath}`)
  console.log('\nTip: Make sure you have created the design file in workspace/')
  process.exit(1)
}

// Create examples directory if not exists
if (!fs.existsSync(examplesDir)) {
  fs.mkdirSync(examplesDir, { recursive: true })
}

async function main() {
  console.log('📚 VibeCoding Design - Publish to Examples\n')
  console.log(`Source: ${sourcePath}`)
  console.log(`Target: ${targetPath}\n`)

  // Confirm publication
  const { confirmPublish } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmPublish',
      message: 'Is this design ready to publish as an example?',
      default: true,
    },
  ])

  if (!confirmPublish) {
    console.log('❌ Cancelled.')
    process.exit(0)
  }

  // Check if target already exists
  if (fs.existsSync(targetPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Example already exists. Overwrite?',
        default: false,
      },
    ])

    if (!overwrite) {
      console.log('❌ Cancelled.')
      process.exit(0)
    }
  }

  // Optional: Add tags
  const { addTags } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addTags',
      message: 'Add tags to help categorize this example?',
      default: true,
    },
  ])

  let tags = []
  if (addTags) {
    const { tagsInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tagsInput',
        message: 'Enter tags (comma-separated):',
        default: 'AI, Dashboard, CRUD',
      },
    ])
    tags = tagsInput.split(',').map((t) => t.trim())
  }

  // Read and update content
  let content = fs.readFileSync(sourcePath, 'utf8')

  // Update status to Completed
  content = content.replace(/\*\*Status:\*\* .+/m, '**Status:** Completed')

  // Update last updated date
  const today = new Date().toISOString().split('T')[0]
  content = content.replace(/\*\*Last Updated:\*\* .+/m, `**Last Updated:** ${today}`)

  // Add tags section if provided
  if (tags.length > 0) {
    const tagsSection = `\n**Tags:** ${tags.join(', ')}\n`
    // Insert tags after Status
    content = content.replace(
      /(\*\*Status:\*\* Completed)/,
      `$1${tagsSection}`
    )
  }

  // Copy file
  fs.writeFileSync(targetPath, content, 'utf8')

  console.log('\n✅ Design published successfully!')
  console.log(`\n📚 Published to: ${targetPath}`)
  if (tags.length > 0) {
    console.log(`🏷️  Tags: ${tags.join(', ')}`)
  }
  console.log('\n💡 This design is now available as an example for future projects!')
  console.log('   Use "npm run design:list" to see all examples')
  console.log('   Use "npm run design:use" to copy this example\n')

  // Optional: Keep or remove from workspace
  const { keepInWorkspace } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'keepInWorkspace',
      message: 'Keep original file in workspace?',
      default: false,
    },
  ])

  if (!keepInWorkspace) {
    fs.unlinkSync(sourcePath)
    console.log(`🗑️  Removed from workspace: ${sourcePath}`)
  }
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
