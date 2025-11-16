use anyhow::{Context, Result};
use colored::Colorize;
use std::process::{Command, Stdio};

use crate::cli::DevTarget;

pub struct DevCommand;

impl DevCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: DevTarget) -> Result<()> {
        match target {
            DevTarget::Frontend => self.run_frontend(),
            DevTarget::Backend => self.run_backend(),
            DevTarget::All => self.run_all(),
        }
    }

    fn run_frontend(&self) -> Result<()> {
        println!("{}", "🚀 Starting frontend development server...".cyan());

        let status = Command::new("npm")
            .args(["run", "dev", "--workspace=app-frontend"])
            .status()
            .context("Failed to start frontend dev server")?;

        if !status.success() {
            anyhow::bail!("Frontend dev server exited with error");
        }

        Ok(())
    }

    fn run_backend(&self) -> Result<()> {
        println!("{}", "🦀 Starting backend development server...".cyan());

        let status = Command::new("cargo")
            .args(["shuttle", "run"])
            .current_dir("packages/app-backend")
            .status()
            .context("Failed to start backend dev server")?;

        if !status.success() {
            anyhow::bail!("Backend dev server exited with error");
        }

        Ok(())
    }

    fn run_all(&self) -> Result<()> {
        println!("{}", "🚀 Starting both frontend and backend...".cyan().bold());
        println!("{}", "Press Ctrl+C to stop all servers".yellow());

        // Start backend in background
        println!("\n{}", "🦀 Starting backend...".cyan());
        let backend = Command::new("cargo")
            .args(["shuttle", "run"])
            .current_dir("packages/app-backend")
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
            .context("Failed to spawn backend server")?;

        // Start frontend in foreground
        println!("{}", "🚀 Starting frontend...".cyan());
        let frontend_status = Command::new("npm")
            .args(["run", "dev", "--workspace=app-frontend"])
            .status()
            .context("Failed to start frontend dev server")?;

        // Frontend has exited, kill backend
        drop(backend);

        if !frontend_status.success() {
            anyhow::bail!("Frontend dev server exited with error");
        }

        Ok(())
    }
}
