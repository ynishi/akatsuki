#!/usr/bin/env node

/**
 * Akatsuki Setup Script
 *
 * This script automates the initial setup process for Akatsuki project:
 * 1. Set project name and clean Git history
 * 2. Check prerequisites (Node.js, Rust, Cargo, Shuttle CLI, Supabase CLI)
 * 3. Collect Supabase project information interactively
 * 4. Generate .env files for frontend and backend
 * 5. Link Supabase project
 * 6. Apply database migrations
 * 7. Deploy Edge Functions (optional)
 * 8. Guide for setting up Secrets
 * 9. Final setup verification
 * 10. Create initial Git commit (optional)
 */

import inquirer from 'inquirer'
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (msg) => console.log(`${colors.magenta}▸${colors.reset} ${msg}`),
}

/**
 * Execute command and return output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    }).trim()
  } catch (error) {
    if (options.throwOnError !== false) {
      throw error
    }
    return null
  }
}

/**
 * Check if a command exists
 */
function commandExists(command) {
  try {
    const result = exec(`which ${command}`, { silent: true, throwOnError: false })
    return result !== null && result.length > 0
  } catch {
    return false
  }
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  const version = process.version
  const majorVersion = parseInt(version.slice(1).split('.')[0])

  if (majorVersion >= 20) {
    log.success(`Node.js ${version} (OK)`)
    return true
  } else {
    log.error(`Node.js ${version} (Required: v20.x or higher)`)
    return false
  }
}

/**
 * Check Rust installation
 */
function checkRust() {
  if (!commandExists('rustc')) {
    log.error('Rust is not installed')
    log.info('Install: curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh')
    return false
  }

  const version = exec('rustc --version', { silent: true }) || 'unknown'
  log.success(`Rust: ${version}`)
  return true
}

/**
 * Check Cargo installation
 */
function checkCargo() {
  if (!commandExists('cargo')) {
    log.error('Cargo is not installed (should come with Rust)')
    return false
  }

  const version = exec('cargo --version', { silent: true }) || 'unknown'
  log.success(`Cargo: ${version}`)
  return true
}

/**
 * Check Shuttle CLI installation
 */
function checkShuttleCLI() {
  if (!commandExists('cargo-shuttle')) {
    log.error('Shuttle CLI is not installed')
    log.info('Install: cargo install cargo-shuttle')
    return false
  }

  const version = exec('cargo shuttle --version', { silent: true }) || 'unknown'
  log.success(`Shuttle CLI: ${version}`)
  return true
}

/**
 * Check Supabase CLI installation
 */
function checkSupabaseCLI() {
  if (!commandExists('supabase')) {
    log.error('Supabase CLI is not installed')
    log.info('Install: npm install -g supabase')
    log.info('Or: brew install supabase/tap/supabase')
    return false
  }

  const version = exec('supabase --version', { silent: true }) || 'unknown'
  log.success(`Supabase CLI: ${version}`)
  return true
}

/**
 * Step 0: Set project name and initialize Git
 */
async function setupProjectName() {
  log.section('📦 Step 0: Project Setup')

  // Get current directory name as default
  const currentDirName = path.basename(rootDir)
  const isDefaultName = currentDirName === 'akatsuki'

  if (isDefaultName) {
    log.warning('Current directory is "akatsuki" (template default)')
    log.info('Recommended: Clone with a custom name: git clone ... my-project-name')
  } else {
    log.info(`Current directory: ${currentDirName}`)
  }

  console.log('')

  const { projectName, projectDescription } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (for package.json):',
      default: isDefaultName ? 'my-awesome-app' : currentDirName,
      validate: (input) => {
        // npm package name validation
        if (!/^[a-z0-9-_]+$/.test(input)) {
          return 'Package name must contain only lowercase letters, numbers, hyphens, and underscores'
        }
        return true
      }
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'Project description (optional):',
      default: ''
    }
  ])

  // Update package.json
  const packageJsonPath = path.join(rootDir, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  packageJson.name = projectName

  // Set description (trim and check if not empty)
  const trimmedDescription = projectDescription.trim()
  packageJson.description = trimmedDescription
    ? `${trimmedDescription} (Made with Akatsuki)`
    : projectName

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  log.success(`Updated package.json: name = "${projectName}"`)
  log.success(`Updated package.json: description = "${packageJson.description}"`)

  // Git initialization
  console.log('')
  const gitDir = path.join(rootDir, '.git')
  const hasGit = fs.existsSync(gitDir)

  if (hasGit) {
    const { cleanGit } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'cleanGit',
        message: 'Clean Git history and initialize a fresh repository?',
        default: true
      }
    ])

    if (cleanGit) {
      log.step('Removing existing .git directory...')
      fs.rmSync(gitDir, { recursive: true, force: true })
      log.success('Removed existing Git history')

      log.step('Initializing new Git repository...')
      exec('git init')
      log.success('Initialized fresh Git repository')
    } else {
      log.info('Keeping existing Git history')
    }
  } else {
    log.step('Initializing Git repository...')
    exec('git init')
    log.success('Initialized Git repository')
  }

  return { projectName, projectDescription: packageJson.description }
}

/**
 * Step 1: Check all prerequisites
 */
async function checkPrerequisites() {
  log.section('📋 Step 1: Checking Prerequisites')

  const checks = [
    { name: 'Node.js', check: checkNodeVersion },
    { name: 'Rust', check: checkRust },
    { name: 'Cargo', check: checkCargo },
    { name: 'Shuttle CLI', check: checkShuttleCLI },
    { name: 'Supabase CLI', check: checkSupabaseCLI },
  ]

  const results = checks.map(({ name, check }) => ({ name, passed: check() }))
  const allPassed = results.every(r => r.passed)

  if (!allPassed) {
    console.log('')
    log.error('Some prerequisites are missing. Please install them and run this script again.')
    process.exit(1)
  }

  console.log('')
  log.success('All prerequisites are installed!')
}

/**
 * Step 2: Collect Supabase project information
 */
async function collectSupabaseInfo() {
  log.section('🔐 Step 2: Supabase Project Information')

  log.info('Please create a new project at: https://app.supabase.com/')
  log.info('Then, collect the following information from your Supabase Dashboard:')
  log.step('Settings > API > Project URL')
  log.step('Settings > API > Project API keys > anon public')
  log.step('Settings > Database > Connection string > URI')
  console.log('')

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectUrl',
      message: 'Supabase Project URL:',
      validate: (input) => {
        if (!input.startsWith('https://') || !input.includes('.supabase.co')) {
          return 'Invalid URL. Should be like: https://xxxxx.supabase.co'
        }
        return true
      }
    },
    {
      type: 'input',
      name: 'anonKey',
      message: 'Supabase Anon Key:',
      validate: (input) => input.length > 0 || 'Anon Key is required'
    },
    {
      type: 'password',
      name: 'databasePassword',
      message: 'Database Password:',
      validate: (input) => input.length > 0 || 'Database Password is required'
    }
  ])

  // Extract project ref from URL
  const projectRef = answers.projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef) {
    log.error('Could not extract project reference from URL')
    process.exit(1)
  }

  // Construct database URL
  const databaseUrl = `postgresql://postgres:${answers.databasePassword}@db.${projectRef}.supabase.co:5432/postgres`

  return {
    projectUrl: answers.projectUrl,
    projectRef,
    anonKey: answers.anonKey,
    databasePassword: answers.databasePassword,
    databaseUrl,
  }
}

/**
 * Step 3: Generate .env files
 */
async function generateEnvFiles(supabaseInfo) {
  log.section('📝 Step 3: Generating .env Files')

  // Frontend .env
  const frontendEnvPath = path.join(rootDir, 'packages/app-frontend/.env')
  const frontendEnv = `# Supabase Configuration
# Generated by npm run setup on ${new Date().toISOString()}
VITE_SUPABASE_URL=${supabaseInfo.projectUrl}
VITE_SUPABASE_ANON_KEY=${supabaseInfo.anonKey}

# Backend API (ローカル開発時)
VITE_API_BASE_URL=http://localhost:8000
`

  fs.writeFileSync(frontendEnvPath, frontendEnv)
  log.success(`Created: packages/app-frontend/.env`)

  // Backend .env
  const backendEnvPath = path.join(rootDir, 'packages/app-backend/.env')
  const backendEnv = `# Supabase Connection
# Generated by npm run setup on ${new Date().toISOString()}
DATABASE_URL=${supabaseInfo.databaseUrl}

# Optional: Supabase Project URL and Anon Key (for client operations)
SUPABASE_URL=${supabaseInfo.projectUrl}
SUPABASE_ANON_KEY=${supabaseInfo.anonKey}

# Optional: AI Model API Keys (if using external services)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
`

  fs.writeFileSync(backendEnvPath, backendEnv)
  log.success(`Created: packages/app-backend/.env`)
}

/**
 * Step 4: Link Supabase project
 */
async function linkSupabaseProject(projectRef) {
  log.section('🔗 Step 4: Linking Supabase Project')

  const { confirmLink } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmLink',
      message: `Link to Supabase project: ${projectRef}?`,
      default: true
    }
  ])

  if (!confirmLink) {
    log.warning('Skipped Supabase link. You can run manually: supabase link --project-ref ' + projectRef)
    return false
  }

  try {
    log.step('Running: supabase link --project-ref ' + projectRef)
    exec(`supabase link --project-ref ${projectRef}`)
    log.success('Supabase project linked successfully!')
    return true
  } catch (error) {
    log.error('Failed to link Supabase project')
    log.info('You can run manually: supabase link --project-ref ' + projectRef)
    return false
  }
}

/**
 * Step 5: Apply database migrations
 */
async function applyMigrations() {
  log.section('🗄️  Step 5: Applying Database Migrations')

  const { confirmMigrate } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmMigrate',
      message: 'Apply database migrations? (Creates tables, RLS policies, etc.)',
      default: true
    }
  ])

  if (!confirmMigrate) {
    log.warning('Skipped migrations. You can run manually: npm run supabase:push')
    return false
  }

  try {
    log.step('Running: supabase db push')
    exec('supabase db push')
    log.success('Database migrations applied successfully!')
    return true
  } catch (error) {
    log.error('Failed to apply migrations')
    log.info('You can run manually: npm run supabase:push')
    return false
  }
}

/**
 * Step 6: Deploy Edge Functions
 */
async function deployEdgeFunctions() {
  log.section('⚡ Step 6: Deploying Edge Functions')

  log.info('Edge Functions:')
  log.step('ai-chat - LLM API (OpenAI/Anthropic/Gemini)')
  log.step('generate-image - Image generation')
  log.step('upload-file - File upload')
  log.step('create-signed-url - Signed URL generation')
  log.step('slack-notify - Slack notifications')
  log.step('send-email - Email sending (Resend)')
  console.log('')

  const { confirmDeploy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmDeploy',
      message: 'Deploy all Edge Functions?',
      default: true
    }
  ])

  if (!confirmDeploy) {
    log.warning('Skipped Edge Functions deployment. You can run manually: npm run supabase:function:deploy')
    return false
  }

  try {
    log.step('Running: supabase functions deploy')
    exec('supabase functions deploy')
    log.success('Edge Functions deployed successfully!')
    return true
  } catch (error) {
    log.error('Failed to deploy Edge Functions')
    log.info('You can run manually: npm run supabase:function:deploy')
    return false
  }
}

/**
 * Step 7: Guide for Secrets setup
 */
async function guideSecretsSetup() {
  log.section('🔑 Step 7: Supabase Secrets Setup')

  log.info('To use AI features, you need to set up API keys as Supabase Secrets:')
  console.log('')
  log.step('Required for LLM features:')
  console.log('  supabase secrets set OPENAI_API_KEY=sk-...')
  console.log('  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...')
  console.log('  supabase secrets set GEMINI_API_KEY=AIza...')
  console.log('')
  log.step('Optional for external integrations:')
  console.log('  supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/...')
  console.log('  supabase secrets set RESEND_API_KEY=re_...')
  console.log('  supabase secrets set EMAIL_FROM=noreply@yourdomain.com')
  console.log('')
  log.info('You can set these later. See docs/setup.md for details.')
  console.log('')

  const { setupNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'setupNow',
      message: 'Do you want to set up Secrets now?',
      default: false
    }
  ])

  if (setupNow) {
    log.info('Opening interactive Secrets setup...')
    log.info('Use: supabase secrets set KEY=VALUE')
    log.info('When done, press Ctrl+C to continue.')
    console.log('')

    // Just inform, don't block
    log.warning('Skipping interactive setup for now. Please set manually.')
  } else {
    log.info('You can set Secrets later using: supabase secrets set KEY=VALUE')
  }
}

/**
 * Step 8: Verify backend setup
 */
async function verifyBackendSetup() {
  log.section('🔍 Step 8: Verifying Backend Setup')

  const { confirmCheck } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmCheck',
      message: 'Run backend compile check (cargo check)?',
      default: true
    }
  ])

  if (!confirmCheck) {
    log.warning('Skipped backend check. You can run manually: npm run check:backend')
    return false
  }

  try {
    log.step('Running: cargo check (in packages/app-backend)')
    exec('cd packages/app-backend && cargo check')
    log.success('Backend compiles successfully!')
    return true
  } catch (error) {
    log.error('Backend compilation failed')
    log.info('Check your .env file and dependencies')
    return false
  }
}

/**
 * Step 9: Create initial Git commit
 */
async function createInitialCommit(projectName, projectDescription) {
  log.section('📝 Step 9: Initial Git Commit')

  const { createCommit } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createCommit',
      message: 'Create initial Git commit?',
      default: true
    }
  ])

  if (!createCommit) {
    log.info('Skipped initial commit. You can commit manually later.')
    return false
  }

  try {
    log.step('Adding files to Git...')
    exec('git add .')

    log.step('Creating initial commit...')
    const commitMessage = `Initial commit: ${projectName}

${projectDescription}

Generated with Akatsuki template 🚀

Setup completed:
- Project name: ${projectName}
- Supabase connected
- Database migrations applied
- Edge Functions deployed
`
    exec(`git commit -m "${commitMessage.replace(/\n/g, '\\n')}"`)
    log.success('Created initial commit')
    return true
  } catch (error) {
    log.error('Failed to create initial commit')
    log.info('You can commit manually: git add . && git commit -m "Initial commit"')
    return false
  }
}

/**
 * Display setup summary
 */
function displaySummary(projectName, projectDescription) {
  log.section('🎉 Setup Complete!')

  console.log(`${colors.bright}Project: ${colors.green}${projectName}${colors.reset}`)
  if (projectDescription && projectDescription !== projectName) {
    console.log(`${colors.bright}Description: ${colors.cyan}${projectDescription}${colors.reset}`)
  }
  console.log('')
  console.log(`${colors.bright}Next Steps:${colors.reset}`)
  console.log('')
  console.log('1. Start development servers:')
  console.log(`   ${colors.cyan}npm run dev:frontend${colors.reset}  # Terminal 1 (http://localhost:5173)`)
  console.log(`   ${colors.cyan}npm run dev:backend${colors.reset}   # Terminal 2 (http://localhost:8000)`)
  console.log('')
  console.log('2. Set up Supabase Secrets (if not done):')
  console.log(`   ${colors.cyan}supabase secrets set OPENAI_API_KEY=sk-...${colors.reset}`)
  console.log('')
  console.log('3. Read the documentation:')
  console.log(`   ${colors.cyan}docs/setup.md${colors.reset} - Detailed setup guide`)
  console.log(`   ${colors.cyan}AGENT.md${colors.reset} - Development guidelines`)
  console.log('')
  console.log('4. Push to your remote repository:')
  console.log(`   ${colors.cyan}git remote add origin <your-repo-url>${colors.reset}`)
  console.log(`   ${colors.cyan}git push -u origin main${colors.reset}`)
  console.log('')
  log.success('Happy coding! 🚀')
}

/**
 * Main setup flow
 */
async function main() {
  console.log('')
  console.log(`${colors.bright}${colors.magenta}`)
  console.log('   █████╗ ██╗  ██╗ █████╗ ████████╗███████╗██╗   ██╗██╗  ██╗██╗')
  console.log('  ██╔══██╗██║ ██╔╝██╔══██╗╚══██╔══╝██╔════╝██║   ██║██║ ██╔╝██║')
  console.log('  ███████║█████╔╝ ███████║   ██║   ███████╗██║   ██║█████╔╝ ██║')
  console.log('  ██╔══██║██╔═██╗ ██╔══██║   ██║   ╚════██║██║   ██║██╔═██╗ ██║')
  console.log('  ██║  ██║██║  ██╗██║  ██║   ██║   ███████║╚██████╔╝██║  ██╗██║')
  console.log('  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝')
  console.log(`${colors.reset}`)
  console.log(`${colors.bright}  🚀 Akatsuki Setup Wizard${colors.reset}`)
  console.log('')

  try {
    // Step 0: Project name & Git
    const { projectName, projectDescription } = await setupProjectName()

    // Step 1: Prerequisites
    await checkPrerequisites()

    // Step 2: Collect Supabase info
    const supabaseInfo = await collectSupabaseInfo()

    // Step 3: Generate .env files
    await generateEnvFiles(supabaseInfo)

    // Step 4: Link Supabase
    await linkSupabaseProject(supabaseInfo.projectRef)

    // Step 5: Apply migrations
    await applyMigrations()

    // Step 6: Deploy Edge Functions
    await deployEdgeFunctions()

    // Step 7: Secrets guide
    await guideSecretsSetup()

    // Step 8: Verify backend
    await verifyBackendSetup()

    // Step 9: Initial Git commit
    await createInitialCommit(projectName, projectDescription)

    // Summary
    displaySummary(projectName, projectDescription)

  } catch (error) {
    console.log('')
    log.error('Setup failed: ' + error.message)
    process.exit(1)
  }
}

// Run
main()
