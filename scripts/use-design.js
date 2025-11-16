#!/usr/bin/env node

/**
 * Use Design Example
 * Copy an example design to workspace with a new name
 *
 * Usage:
 *   npm run design:use
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import inquirer from 'inquirer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const examplesDir = path.join(__dirname, '../docs/examples')
const workspaceDir = path.join(__dirname, '../workspace')

// Check if examples directory exists
if (!fs.existsSync(examplesDir)) {
  console.error('❌ No design examples found.')
  console.log('\nTip: Use "npm run design:new <feature-name>" to create a new design')
  process.exit(1)
}

// Read all markdown files
const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.md'))

if (files.length === 0) {
  console.error('❌ No design examples found.')
  console.log('\nTip: Use "npm run design:new <feature-name>" to create a new design')
  process.exit(1)
}

// Prepare choices with descriptions
const choices = files.map((file) => {
  const filePath = path.join(examplesDir, file)
  const content = fs.readFileSync(filePath, 'utf8')
  const titleMatch = content.match(/^# (.+)/m)
  const title = titleMatch ? titleMatch[1] : file.replace('.md', '')

  return {
    name: `${file} - ${title}`,
    value: file,
  }
})

async function main() {
  console.log('📚 VibeCoding Design - Use Example\n')

  // Select example
  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: 'Select a design example to copy:',
      choices,
    },
  ])

  // Input new feature name
  const { newFeatureName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'newFeatureName',
      message: 'Enter new feature name (kebab-case):',
      validate: (input) => {
        if (!input) return 'Feature name is required'
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Use kebab-case (lowercase, numbers, hyphens only)'
        }
        return true
      },
    },
  ])

  const outputPath = path.join(workspaceDir, `${newFeatureName}-design.md`)

  // Check if output file already exists
  if (fs.existsSync(outputPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `File already exists: ${newFeatureName}-design.md. Overwrite?`,
        default: false,
      },
    ])

    if (!overwrite) {
      console.log('❌ Cancelled.')
      process.exit(0)
    }
  }

  // Copy file
  const sourcePath = path.join(examplesDir, selectedFile)
  const content = fs.readFileSync(sourcePath, 'utf8')

  // Update title and dates
  const today = new Date().toISOString().split('T')[0]
  const toTitleCase = (str) => {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const updatedContent = content
    .replace(/^# .+/m, `# ${toTitleCase(newFeatureName)} - Design Document`)
    .replace(/\*\*Created:\*\* .+/m, `**Created:** ${today}`)
    .replace(/\*\*Last Updated:\*\* .+/m, `**Last Updated:** ${today}`)
    .replace(/\*\*Status:\*\* .+/m, `**Status:** Draft`)

  fs.writeFileSync(outputPath, updatedContent, 'utf8')

  console.log('\n✅ Design example copied successfully!')
  console.log(`\n📄 File: ${outputPath}`)
  console.log('\n💡 Next steps:')
  console.log('   1. Open the file and customize for your needs')
  console.log('   2. Update the Pre-Discussion section with user requirements')
  console.log('   3. Modify design decisions (color, layout, etc.)')
  console.log('   4. Start VibeCoding!\n')
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
