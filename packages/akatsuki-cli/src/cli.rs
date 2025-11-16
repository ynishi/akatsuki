use anyhow::Result;
use clap::{Parser, Subcommand, ValueEnum};

use crate::commands::design::DesignCommand;
use crate::commands::setup::SetupCommand;
use crate::commands::dev::DevCommand;
use crate::commands::build::BuildCommand;

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
        }
    }
}
