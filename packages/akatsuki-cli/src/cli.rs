use anyhow::Result;
use clap::{Parser, Subcommand, ValueEnum};

use crate::commands::design::DesignCommand;
use crate::commands::setup::SetupCommand;
use crate::commands::dev::DevCommand;
use crate::commands::build::BuildCommand;
use crate::commands::db::DbCommand;
use crate::commands::function::FunctionCommand;
use crate::commands::check::CheckCommand;
use crate::commands::test::TestCommand;
use crate::commands::deploy::DeployCommand;
use crate::commands::docs::DocsCommand;
use crate::commands::advice::AdviceCommand;

#[derive(Parser)]
#[command(name = "akatsuki")]
#[command(about = "Akatsuki - VibeCoding Development CLI", long_about = r#"Akatsuki - VibeCoding Development CLI

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
"#)]
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
    #[command(about = "Run tests [frontend | backend | all]")]
    Test {
        /// Target to test: frontend, backend, or all (default)
        #[arg(value_enum, default_value = "all")]
        target: TestTarget,
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
    /// Analyzes project state and suggests next steps
    #[command(about = "Get contextual development advice")]
    Advice {
        /// Optional task-specific workflow (e.g., feature, migration)
        task: Option<String>,
    },
}

#[derive(Subcommand)]
pub enum DesignAction {
    /// Create new design document
    New {
        /// Feature name in kebab-case (e.g., user-dashboard)
        feature_name: String,
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
            Commands::Test { target } => {
                let cmd = TestCommand::new();
                cmd.execute(target)
            }
            Commands::Deploy { target } => {
                let cmd = DeployCommand::new();
                cmd.execute(target)
            }
            Commands::Docs { action, search } => {
                let cmd = DocsCommand::new();
                cmd.execute(action, search.as_deref())
            }
            Commands::Advice { task } => {
                let cmd = AdviceCommand::new();
                cmd.execute(task)
            }
        }
    }
}
