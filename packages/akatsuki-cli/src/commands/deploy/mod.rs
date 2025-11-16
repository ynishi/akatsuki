use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::DeployTarget;

pub struct DeployCommand;

impl DeployCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, target: DeployTarget) -> Result<()> {
        match target {
            DeployTarget::Frontend => self.deploy_frontend(),
            DeployTarget::Backend => self.deploy_backend(),
            DeployTarget::All => self.deploy_all(),
        }
    }

    fn deploy_frontend(&self) -> Result<()> {
        println!("{}", "🚀 Deploying frontend...".cyan());

        // Note: Frontend deployment not configured yet
        println!("{}", "  ℹ️  Frontend deployment not configured yet".yellow());
        println!("{}", "  Configure deployment (Vercel, Netlify, etc.) first".yellow());

        Ok(())
    }

    fn deploy_backend(&self) -> Result<()> {
        println!("{}", "🦀 Deploying backend to Shuttle...".cyan());

        let status = Command::new("cargo")
            .args(["shuttle", "deploy"])
            .current_dir("packages/app-backend")
            .status()
            .context("Failed to deploy backend. Make sure Shuttle CLI is installed.")?;

        if !status.success() {
            anyhow::bail!("Backend deployment failed");
        }

        println!("{}", "✅ Backend deployed successfully!".green());
        Ok(())
    }

    fn deploy_all(&self) -> Result<()> {
        println!("{}", "🚀 Deploying entire project...".cyan().bold());

        // Deploy backend first (production critical)
        self.deploy_backend()?;

        println!();

        // Deploy frontend
        self.deploy_frontend()?;

        println!();
        println!("{}", "✨ Deployment completed!".green().bold());

        Ok(())
    }
}
