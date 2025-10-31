#!/usr/bin/env node

/**
 * Akatsuki Setup Verification Script
 *
 * This script checks the current setup status and displays a checklist:
 * - Prerequisites installation status
 * - .env files existence
 * - Supabase link status
 * - Database migrations status
 * - Edge Functions deployment status
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

/**
 * Execute command and return output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    }).trim()
  } catch {
    return null
  }
}

/**
 * Check if a command exists
 */
function commandExists(command) {
  const result = exec(`which ${command}`)
  return result !== null && result.length > 0
}

/**
 * Display check result
 */
function displayCheck(label, passed, details = '') {
  const icon = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`
  const status = passed ? `${colors.green}OK${colors.reset}` : `${colors.red}Missing${colors.reset}`
  const detailsStr = details ? ` ${colors.blue}(${details})${colors.reset}` : ''
  console.log(`  ${icon} ${label}: ${status}${detailsStr}`)
}

/**
 * Check prerequisites
 */
function checkPrerequisites() {
  console.log(`\n${colors.bright}${colors.cyan}📋 Prerequisites${colors.reset}\n`)

  // Node.js
  const nodeVersion = process.version
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0])
  displayCheck('Node.js', nodeMajor >= 20, nodeVersion)

  // Rust
  const rustVersion = exec('rustc --version')
  displayCheck('Rust', rustVersion !== null, rustVersion || '')

  // Cargo
  const cargoVersion = exec('cargo --version')
  displayCheck('Cargo', cargoVersion !== null, cargoVersion || '')

  // Shuttle CLI
  const shuttleVersion = exec('cargo shuttle --version')
  displayCheck('Shuttle CLI', shuttleVersion !== null, shuttleVersion || '')

  // Supabase CLI
  const supabaseVersion = exec('supabase --version')
  displayCheck('Supabase CLI', supabaseVersion !== null, supabaseVersion || '')
}

/**
 * Check .env files
 */
function checkEnvFiles() {
  console.log(`\n${colors.bright}${colors.cyan}📝 Environment Files${colors.reset}\n`)

  // Frontend .env
  const frontendEnvPath = path.join(rootDir, 'packages/app-frontend/.env')
  const frontendEnvExists = fs.existsSync(frontendEnvPath)
  displayCheck('Frontend .env', frontendEnvExists, frontendEnvPath.replace(rootDir, '.'))

  // Backend .env
  const backendEnvPath = path.join(rootDir, 'packages/app-backend/.env')
  const backendEnvExists = fs.existsSync(backendEnvPath)
  displayCheck('Backend .env', backendEnvExists, backendEnvPath.replace(rootDir, '.'))

  // Check .env content
  if (frontendEnvExists) {
    const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8')
    const hasSupabaseUrl = frontendEnv.includes('VITE_SUPABASE_URL=')
    const hasAnonKey = frontendEnv.includes('VITE_SUPABASE_ANON_KEY=')
    displayCheck('  - VITE_SUPABASE_URL', hasSupabaseUrl)
    displayCheck('  - VITE_SUPABASE_ANON_KEY', hasAnonKey)
  }

  if (backendEnvExists) {
    const backendEnv = fs.readFileSync(backendEnvPath, 'utf8')
    const hasDatabaseUrl = backendEnv.includes('DATABASE_URL=')
    displayCheck('  - DATABASE_URL', hasDatabaseUrl)
  }
}

/**
 * Check Supabase link status
 */
function checkSupabaseLink() {
  console.log(`\n${colors.bright}${colors.cyan}🔗 Supabase Link${colors.reset}\n`)

  // Check if supabase/.temp/project-ref exists
  const projectRefPath = path.join(rootDir, 'supabase/.temp/project-ref')
  const isLinked = fs.existsSync(projectRefPath)

  if (isLinked) {
    const projectRef = fs.readFileSync(projectRefPath, 'utf8').trim()
    displayCheck('Supabase Project Linked', true, projectRef)
  } else {
    displayCheck('Supabase Project Linked', false, 'Run: supabase link')
  }
}

/**
 * Check database migrations
 */
function checkMigrations() {
  console.log(`\n${colors.bright}${colors.cyan}🗄️  Database Migrations${colors.reset}\n`)

  const migrationsDir = path.join(rootDir, 'supabase/migrations')
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))

  displayCheck('Migration Files', migrationFiles.length > 0, `${migrationFiles.length} files`)

  // Check if migrations are applied (we can't easily check this without supabase status)
  console.log(`\n  ${colors.yellow}ℹ${colors.reset} To verify applied migrations, run: ${colors.cyan}supabase db diff${colors.reset}`)
}

/**
 * Check Edge Functions
 */
function checkEdgeFunctions() {
  console.log(`\n${colors.bright}${colors.cyan}⚡ Edge Functions${colors.reset}\n`)

  const functionsDir = path.join(rootDir, 'supabase/functions')
  const functionDirs = fs.readdirSync(functionsDir).filter(f => {
    const stat = fs.statSync(path.join(functionsDir, f))
    return stat.isDirectory() && f !== '_shared'
  })

  displayCheck('Edge Functions', functionDirs.length > 0, `${functionDirs.length} functions`)

  functionDirs.forEach(fn => {
    const indexPath = path.join(functionsDir, fn, 'index.ts')
    const exists = fs.existsSync(indexPath)
    console.log(`    - ${exists ? colors.green + '✓' : colors.red + '✗'}${colors.reset} ${fn}`)
  })

  console.log(`\n  ${colors.yellow}ℹ${colors.reset} To deploy, run: ${colors.cyan}npm run supabase:function:deploy${colors.reset}`)
}

/**
 * Check Supabase Secrets
 */
function checkSecrets() {
  console.log(`\n${colors.bright}${colors.cyan}🔑 Supabase Secrets${colors.reset}\n`)

  // We can't easily check secrets without supabase CLI
  console.log(`  ${colors.yellow}ℹ${colors.reset} To check secrets, run: ${colors.cyan}supabase secrets list${colors.reset}`)
  console.log(`\n  Required for AI features:`)
  console.log(`    - OPENAI_API_KEY`)
  console.log(`    - ANTHROPIC_API_KEY`)
  console.log(`    - GEMINI_API_KEY`)
}

/**
 * Check backend compilation
 */
function checkBackend() {
  console.log(`\n${colors.bright}${colors.cyan}🦀 Backend (Rust)${colors.reset}\n`)

  const cargoToml = path.join(rootDir, 'packages/app-backend/Cargo.toml')
  const cargoTomlExists = fs.existsSync(cargoToml)
  displayCheck('Cargo.toml', cargoTomlExists)

  console.log(`\n  ${colors.yellow}ℹ${colors.reset} To verify compilation, run: ${colors.cyan}npm run check:backend${colors.reset}`)
}

/**
 * Display summary and next steps
 */
function displaySummary() {
  console.log(`\n${colors.bright}${colors.cyan}📊 Summary${colors.reset}\n`)

  // Quick checklist
  const frontendEnvExists = fs.existsSync(path.join(rootDir, 'packages/app-frontend/.env'))
  const backendEnvExists = fs.existsSync(path.join(rootDir, 'packages/app-backend/.env'))
  const projectRefExists = fs.existsSync(path.join(rootDir, 'supabase/.temp/project-ref'))

  const setupComplete = frontendEnvExists && backendEnvExists && projectRefExists

  if (setupComplete) {
    console.log(`  ${colors.green}✓${colors.reset} Basic setup is complete!`)
    console.log(`\n  ${colors.bright}Next Steps:${colors.reset}`)
    console.log(`    1. Set up Supabase Secrets: ${colors.cyan}supabase secrets set KEY=VALUE${colors.reset}`)
    console.log(`    2. Deploy Edge Functions: ${colors.cyan}npm run supabase:function:deploy${colors.reset}`)
    console.log(`    3. Start development: ${colors.cyan}npm run dev:frontend${colors.reset} & ${colors.cyan}npm run dev:backend${colors.reset}`)
  } else {
    console.log(`  ${colors.yellow}⚠${colors.reset} Setup is incomplete. Run: ${colors.cyan}npm run setup${colors.reset}`)
  }

  console.log('')
}

/**
 * Main
 */
function main() {
  console.log('')
  console.log(`${colors.bright}${colors.cyan}🔍 Akatsuki Setup Status${colors.reset}`)

  checkPrerequisites()
  checkEnvFiles()
  checkSupabaseLink()
  checkMigrations()
  checkEdgeFunctions()
  checkSecrets()
  checkBackend()
  displaySummary()
}

main()
