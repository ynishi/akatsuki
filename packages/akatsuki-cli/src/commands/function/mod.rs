use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::FunctionAction;

pub struct FunctionCommand;

impl FunctionCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, action: FunctionAction) -> Result<()> {
        match action {
            FunctionAction::New { name } => self.create_function(&name),
            FunctionAction::Deploy { name } => self.deploy(name.as_deref()),
        }
    }

    fn create_function(&self, name: &str) -> Result<()> {
        println!("{}", format!("⚡ Creating new edge function: {}", name).cyan());

        let status = Command::new("supabase")
            .args(["functions", "new", name])
            .status()
            .context("Failed to create function. Make sure Supabase CLI is installed.")?;

        if !status.success() {
            anyhow::bail!("Function creation failed");
        }

        println!("{}", "✅ Edge function created!".green());
        Ok(())
    }

    fn deploy(&self, name: Option<&str>) -> Result<()> {
        match name {
            Some(func_name) => {
                println!("{}", format!("🚀 Deploying edge function: {}", func_name).cyan());

                let status = Command::new("supabase")
                    .args(["functions", "deploy", func_name])
                    .status()
                    .context("Failed to deploy function. Make sure Supabase CLI is installed.")?;

                if !status.success() {
                    anyhow::bail!("Function deployment failed");
                }

                println!("{}", format!("✅ Function '{}' deployed successfully!", func_name).green());
            }
            None => {
                println!("{}", "🚀 Deploying all edge functions...".cyan());

                let status = Command::new("supabase")
                    .args(["functions", "deploy"])
                    .status()
                    .context("Failed to deploy functions. Make sure Supabase CLI is installed.")?;

                if !status.success() {
                    anyhow::bail!("Functions deployment failed");
                }

                println!("{}", "✅ All functions deployed successfully!".green());
            }
        }

        Ok(())
    }
}
