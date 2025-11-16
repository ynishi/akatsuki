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

#[derive(Parser)]
#[command(name = "akatsuki")]
#[command(about = "Akatsuki development CLI tools", long_about = None)]
#[command(version)]
pub struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// VibeCoding Design Framework commands
    Design {
        #[command(subcommand)]
        action: DesignAction,
    },
    /// Setup and verification commands
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
    Db {
        #[command(subcommand)]
        action: DbAction,
    },
    /// Edge Function operations (Supabase)
    Function {
        #[command(subcommand)]
        action: FunctionAction,
    },
    /// Run checks (lint, typecheck, cargo check)
    Check {
        /// Target to check: frontend, backend, or all (default)
        #[arg(value_enum, default_value = "all")]
        target: CheckTarget,
    },
    /// Run tests
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
        }
    }
}
