use anyhow::Result;
use clap::{Parser, Subcommand};

use crate::commands::design::DesignCommand;
use crate::commands::setup::SetupCommand;

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
        }
    }
}
