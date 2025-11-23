use anyhow::Result;
use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;

use crate::commands::advice::AdviceCommand;
use crate::commands::build::BuildCommand;
use crate::commands::check::CheckCommand;
use crate::commands::db::DbCommand;
use crate::commands::deploy::DeployCommand;
use crate::commands::design::DesignCommand;
use crate::commands::dev::DevCommand;
use crate::commands::docs::DocsCommand;
use crate::commands::function::FunctionCommand;
use crate::commands::setup::SetupCommand;
use crate::commands::test::TestCommand;

#[derive(Parser)]
#[command(name = "akatsuki")]
#[command(
    about = "Akatsuki - VibeCoding Development CLI",
    long_about = r#"Akatsuki - VibeCoding Development CLI

A comprehensive CLI tool for VibeCoding development workflow.
Provides commands for design, database, development, testing, and deployment.

USAGE:
    akatsuki <COMMAND>

COMMON WORKFLOWS:
    New Feature:
      1. akatsuki design new <name>      - Create design document
      2. akatsuki db migration-new <name> - Create migration (if needed)
      3. akatsuki db push                - Apply migration
      4. akatsuki check frontend         - Verify implementation

    Development:
      akatsuki dev                       - Start dev server
      akatsuki check                     - Run all checks
      akatsuki test                      - Run all tests

For detailed command help, run:
    akatsuki <command> --help
"#
)]
#[command(version)]
pub struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// VibeCoding Design Framework
    ///
    /// Commands: new, list, use, publish
    #[command(about = "VibeCoding Design Framework (new | list | use | publish)")]
    Design {
        #[command(subcommand)]
        action: DesignAction,
    },
    /// Setup and verification
    ///
    /// Commands: check
    #[command(about = "Setup and verification (check)")]
    Setup {
        #[command(subcommand)]
        action: SetupAction,
    },
    /// Start development server
    Dev {
        /// Target to run: frontend, backend, or all (default)
        #[arg(value_enum, default_value = "all")]
        target: DevTarget,
    },
    /// Build the project
    Build {
        /// Target to build: frontend, backend, or all (default)
        #[arg(value_enum, default_value = "all")]
        target: BuildTarget,
    },
    /// Database operations (Supabase)
    ///
    /// Commands: push, migration-new, check, status, link
    #[command(about = "Database operations (push | migration-new | check | status | link)")]
    Db {
        #[command(subcommand)]
        action: DbAction,
    },
    /// Edge Function operations (Supabase)
    ///
    /// Commands: new, deploy
    #[command(about = "Edge Function operations (new | deploy)")]
    Function {
        #[command(subcommand)]
        action: FunctionAction,
    },
    /// Run checks (lint, typecheck, cargo check)
    ///
    /// Targets: frontend | backend | all (default)
    #[command(about = "Run checks [frontend | backend | all]")]
    Check {
        /// Target to check: frontend, backend, or all (default)
        #[arg(value_enum, default_value = "all")]
        target: CheckTarget,
    },
    /// Run tests
    ///
    /// Targets: frontend | backend | all (default)
    /// Options: -w (watch), --ui (UI dashboard), --coverage (coverage report)
    #[command(about = "Run tests [frontend | backend | all]")]
    Test {
        /// Target to test: frontend, backend, or all (default)
        #[arg(value_enum, default_value = "all")]
        target: TestTarget,
        /// Watch mode (re-run tests on file changes)
        #[arg(short = 'w', long)]
        watch: bool,
        /// Run with UI dashboard (vitest --ui)
        #[arg(long)]
        ui: bool,
        /// Generate coverage report
        #[arg(long)]
        coverage: bool,
    },
    /// Deploy the project
    Deploy {
        /// Target to deploy: frontend, backend, or all (default)
        #[arg(value_enum, default_value = "all")]
        target: DeployTarget,
    },
    /// Browse project documentation
    ///
    /// Commands: all, components, models, repositories, services, hooks, pages
    #[command(about = "Browse project documentation (all | components | models | ...)")]
    Docs {
        #[command(subcommand)]
        action: DocsAction,
        /// Search keyword to filter results
        #[arg(long, short, global = true)]
        search: Option<String>,
    },
    /// Get contextual development advice
    ///
    /// Commands: rule, prompt, ai
    #[command(about = "Get contextual development advice (rule | prompt | ai)")]
    Advice {
        #[command(subcommand)]
        action: AdviceAction,
    },
    /// Generate shell completion script
    ///
    /// Usage: akatsuki completion zsh > ~/.zsh/completions/_akatsuki
    #[command(about = "Generate shell completion script")]
    Completion {
        /// Shell type (zsh, bash, fish, powershell)
        shell: clap_complete::Shell,
    },
    /// List all available commands (flat hierarchy)
    #[command(about = "List all available commands")]
    List,
    /// Install akatsuki CLI globally (cargo install --path packages/akatsuki-cli)
    #[command(about = "Install akatsuki CLI globally")]
    Install,
}

#[derive(Subcommand)]
pub enum DesignAction {
    /// Create new design document
    New {
        /// Feature name in kebab-case (e.g., user-dashboard)
        feature_name: String,
        /// Theme to apply (e.g., corporate-blue, minimal-dark)
        #[arg(long, short)]
        theme: Option<String>,
    },
    /// List all design examples
    List,
    /// Copy an example design interactively
    Use,
    /// Publish design to examples
    Publish {
        /// Feature name in kebab-case (e.g., user-dashboard)
        feature_name: String,
    },
    /// List all available themes
    Themes,
    /// Show theme details
    Theme {
        /// Theme ID (e.g., corporate-blue, minimal-dark)
        theme_id: String,
        /// Output format (markdown, json)
        #[arg(long, short, default_value = "markdown")]
        format: String,
    },
    /// Insert theme into existing design document
    InsertTheme {
        /// Design file path
        file: String,
        /// Theme ID (e.g., corporate-blue, minimal-dark)
        #[arg(long, short)]
        theme: String,
    },
}

#[derive(Subcommand)]
pub enum SetupAction {
    /// Check setup status and prerequisites
    Check,
}

#[derive(Debug, Clone, ValueEnum)]
pub enum DevTarget {
    /// Run frontend development server only
    Frontend,
    /// Run backend development server only
    Backend,
    /// Run both frontend and backend
    All,
}

#[derive(Debug, Clone, ValueEnum)]
pub enum BuildTarget {
    /// Build frontend only
    Frontend,
    /// Build backend only
    Backend,
    /// Build both frontend and backend
    All,
}

#[derive(Subcommand)]
pub enum DbAction {
    /// Push local migrations to remote database
    Push,
    /// Create a new migration file
    MigrationNew {
        /// Migration name
        name: String,
    },
    /// Check pending migrations and SQL syntax
    Check,
    /// Show database status
    Status,
    /// Link to Supabase project
    Link,
}

#[derive(Subcommand)]
pub enum FunctionAction {
    /// Create a new edge function
    New {
        /// Function name
        name: String,
    },
    /// Deploy edge function(s)
    Deploy {
        /// Function name (optional, deploys all if omitted)
        name: Option<String>,
    },
}

#[derive(Debug, Clone, ValueEnum)]
pub enum CheckTarget {
    /// Check frontend only (lint + typecheck)
    Frontend,
    /// Check backend only (cargo check)
    Backend,
    /// Check both frontend and backend
    All,
}

#[derive(Debug, Clone, ValueEnum)]
pub enum TestTarget {
    /// Test frontend only
    Frontend,
    /// Test backend only
    Backend,
    /// Test both frontend and backend
    All,
}

#[derive(Debug, Clone, ValueEnum)]
pub enum DeployTarget {
    /// Deploy frontend only
    Frontend,
    /// Deploy backend only
    Backend,
    /// Deploy both frontend and backend
    All,
}

#[derive(Debug, Clone, ValueEnum)]
pub enum AIBackend {
    /// Use Claude Code via claude command (automatic invocation)
    Claude,
    /// Output markdown prompt only (manual copy-paste)
    Markdown,
}

#[derive(Subcommand)]
pub enum DocsAction {
    /// List all layers (components, models, repositories, services, hooks, pages)
    All,
    /// List all UI components with descriptions
    Components,
    /// List all model classes
    Models,
    /// List all repository classes
    Repositories,
    /// List all service classes
    Services,
    /// List all custom hooks
    Hooks,
    /// List all page components
    Pages,
    /// Check documentation coverage and list undocumented files
    Lint,
    /// Sync component list to documentation file (e.g., AGENT-mini.md)
    Sync {
        /// Target file to update
        #[arg(long, default_value = "AGENT-mini.md")]
        target: String,
        /// Show diff without applying changes
        #[arg(long)]
        dry_run: bool,
    },
}

#[derive(Subcommand)]
pub enum AdviceAction {
    /// Static rule-based advice (fast, no AI)
    Rule {
        /// Optional task-specific workflow (e.g., feature, migration)
        task: Option<String>,
        /// Enable test coverage checking (disabled by default for VibeCoding)
        #[arg(long)]
        enable_test_coverage: bool,
    },
    /// Generate AI prompt for manual copy-paste to Claude Code
    Prompt {
        /// Optional custom question
        task: Option<String>,
        /// Enable test coverage checking (disabled by default for VibeCoding)
        #[arg(long)]
        enable_test_coverage: bool,
    },
    /// Automatic AI invocation (requires claude command)
    Ai {
        /// Optional custom question
        task: Option<String>,
        /// AI backend to use
        #[arg(long, value_enum, default_value = "claude")]
        backend: AIBackend,
        /// Enable test coverage checking (disabled by default for VibeCoding)
        #[arg(long)]
        enable_test_coverage: bool,
    },
}

impl Cli {
    pub fn run(self) -> Result<()> {
        match self.command {
            Commands::Design { action } => {
                let cmd = DesignCommand::new();
                cmd.execute(action)
            }
            Commands::Setup { action } => {
                let cmd = SetupCommand::new();
                cmd.execute(action)
            }
            Commands::Dev { target } => {
                let cmd = DevCommand::new();
                cmd.execute(target)
            }
            Commands::Build { target } => {
                let cmd = BuildCommand::new();
                cmd.execute(target)
            }
            Commands::Db { action } => {
                let cmd = DbCommand::new();
                cmd.execute(action)
            }
            Commands::Function { action } => {
                let cmd = FunctionCommand::new();
                cmd.execute(action)
            }
            Commands::Check { target } => {
                let cmd = CheckCommand::new();
                cmd.execute(target)
            }
            Commands::Test {
                target,
                watch,
                ui,
                coverage,
            } => {
                let cmd = TestCommand::new();
                cmd.execute(target, watch, ui, coverage)
            }
            Commands::Deploy { target } => {
                let cmd = DeployCommand::new();
                cmd.execute(target)
            }
            Commands::Docs { action, search } => {
                let cmd = DocsCommand::new();
                cmd.execute(action, search.as_deref())
            }
            Commands::Advice { action } => {
                let cmd = AdviceCommand::new();
                cmd.execute(action)
            }
            Commands::Completion { shell } => Self::generate_completion(shell),
            Commands::List => Self::list_all_commands(),
            Commands::Install => Self::install_cli(),
        }
    }

    fn generate_completion(shell: clap_complete::Shell) -> Result<()> {
        use clap::CommandFactory;
        use clap_complete::generate;
        use std::io;

        let mut cmd = Cli::command();
        let bin_name = cmd.get_name().to_string();

        generate(shell, &mut cmd, bin_name, &mut io::stdout());

        Ok(())
    }

    fn list_all_commands() -> Result<()> {
        println!("\n📋 All Available Commands (Flat Hierarchy)\n");

        println!("# 開発サーバー");
        println!("akatsuki dev                      # Frontend + Backend 同時起動");
        println!("akatsuki dev frontend             # Frontend のみ (localhost:5173)");
        println!("akatsuki dev backend              # Backend のみ (localhost:8000)");
        println!();

        println!("# ビルド");
        println!("akatsuki build                    # 両方ビルド");
        println!("akatsuki build frontend           # Frontend 本番ビルド");
        println!("akatsuki build backend            # Backend リリースビルド");
        println!();

        println!("# 品質チェック");
        println!(
            "akatsuki check                    # すべてチェック (lint + typecheck + cargo check)"
        );
        println!("akatsuki check frontend           # Frontend チェック (lint + typecheck)");
        println!("akatsuki check backend            # Backend チェック (cargo check)");
        println!();

        println!("# テスト");
        println!("akatsuki test                     # すべてテスト");
        println!("akatsuki test frontend            # Frontend テスト (vitest run)");
        println!("akatsuki test frontend -w         # Frontend テスト (watch mode - VibeCoding向け)");
        println!("akatsuki test frontend --ui       # Frontend テスト (UI dashboard)");
        println!("akatsuki test frontend --coverage # Frontend テスト (カバレッジレポート)");
        println!("akatsuki test backend             # Backend テスト (cargo test)");
        println!();

        println!("# データベース操作");
        println!("akatsuki db push                  # Migration 適用");
        println!("akatsuki db migration-new <name>  # Migration 作成");
        println!(
            "akatsuki db check                 # Migration チェック（SQL preview、multibyte検出）"
        );
        println!("akatsuki db status                # データベース状態確認");
        println!("akatsuki db link                  # Supabase プロジェクトにリンク");
        println!();

        println!("# 設計ワークフロー");
        println!("akatsuki design new <name>        # デザインドキュメント作成");
        println!("akatsuki design list              # デザイン例一覧");
        println!("akatsuki design use               # デザイン例をコピー");
        println!("akatsuki design publish <name>    # デザインを examples に公開");
        println!();

        println!("# ドキュメント探索（AIコーディング支援）");
        println!("akatsuki docs all                 # 全レイヤー（components/models/repositories/services/hooks/pages）表示");
        println!("akatsuki docs components          # UI コンポーネント一覧");
        println!("akatsuki docs models              # Model クラス一覧");
        println!("akatsuki docs repositories        # Repository クラス一覧");
        println!("akatsuki docs services            # Service クラス一覧");
        println!("akatsuki docs hooks               # Custom Hooks 一覧");
        println!("akatsuki docs pages               # Page コンポーネント一覧");
        println!(
            "akatsuki docs lint                # ドキュメント網羅率チェック（JSDoc未記載検出）"
        );
        println!(
            "akatsuki docs sync                # AGENT-mini.md のコンポーネントリスト自動更新"
        );
        println!("akatsuki docs all --search \"RAG\"  # 全レイヤー横断検索");
        println!();

        println!("# 開発アドバイス（AI統合）");
        println!("akatsuki advice rule              # 静的ルールベース提案（高速）");
        println!(
            "akatsuki advice prompt            # AI分析用プロンプト生成（Claude Codeにコピペ）"
        );
        println!("akatsuki advice ai                # AI自動分析（claude command経由）");
        println!("akatsuki advice ai --backend=markdown  # プロンプト生成のみ");
        println!();

        println!("# Edge Functions");
        println!("akatsuki function new <name>      # Edge Function 作成");
        println!("akatsuki function deploy [name]   # Edge Function デプロイ");
        println!();

        println!("# デプロイ");
        println!("akatsuki deploy backend           # Backend を Shuttle にデプロイ");
        println!();

        println!("# セットアップ");
        println!("akatsuki setup check              # セットアップ状態確認");
        println!();

        println!("# ユーティリティ");
        println!("akatsuki completion <shell>       # Shell completion スクリプト生成 (zsh/bash/fish/powershell)");
        println!("akatsuki list                     # 全コマンド一覧（このリスト）");
        println!(
            "akatsuki install                  # CLI をグローバルインストール (cargo install)"
        );
        println!();

        println!("💡 詳細なヘルプ: akatsuki <command> --help");
        println!();

        Ok(())
    }

    fn install_cli() -> Result<()> {
        use std::process::Command;

        println!("\n🔧 Installing akatsuki CLI globally...\n");

        // Find project root
        let project_root = Self::find_project_root();
        let cli_path = project_root.join("packages/akatsuki-cli");

        // Verify we're in the project root
        if !cli_path.exists() {
            anyhow::bail!(
                "Error: packages/akatsuki-cli not found.\n\n\
                 This command must be run from the Akatsuki project root.\n\
                 Current directory: {:?}\n\
                 Expected path: {:?}",
                std::env::current_dir()?,
                cli_path
            );
        }

        println!("📂 Project root: {}", project_root.display());
        println!("📦 Installing from: {}", cli_path.display());
        println!();

        // Run cargo install
        let status = Command::new("cargo")
            .args(["install", "--path", cli_path.to_str().unwrap()])
            .status()
            .map_err(|e| anyhow::anyhow!("Failed to run cargo install: {}\n\nMake sure cargo is installed and available in PATH.", e))?;

        if !status.success() {
            anyhow::bail!("cargo install failed");
        }

        println!();
        println!("✅ akatsuki CLI installed successfully!");
        println!();
        println!("💡 Next steps:");
        println!("   1. Make sure ~/.cargo/bin is in your PATH");
        println!("   2. Run: akatsuki --version");
        println!(
            "   3. Set up shell completion: akatsuki completion zsh > ~/.zsh/completions/_akatsuki"
        );
        println!();

        Ok(())
    }

    fn find_project_root() -> PathBuf {
        let mut current = std::env::current_dir().unwrap();

        loop {
            // Check for package.json with workspaces
            let package_json = current.join("package.json");
            if package_json.exists() {
                if let Ok(content) = std::fs::read_to_string(&package_json) {
                    if content.contains("\"workspaces\"") {
                        return current;
                    }
                }
            }

            // Check for packages directory (monorepo indicator)
            if current.join("packages").is_dir() && current.join("packages/app-frontend").is_dir() {
                return current;
            }

            // Move up to parent directory
            if let Some(parent) = current.parent() {
                current = parent.to_path_buf();
            } else {
                // Reached filesystem root, return original
                return std::env::current_dir().unwrap();
            }
        }
    }
}
