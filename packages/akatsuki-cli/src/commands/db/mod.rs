use anyhow::{Context, Result};
use colored::Colorize;
use std::process::Command;

use crate::cli::DbAction;

pub struct DbCommand;

impl DbCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, action: DbAction) -> Result<()> {
        match action {
            DbAction::Push => self.push(),
            DbAction::MigrationNew { name } => self.migration_new(&name),
            DbAction::Status => self.status(),
            DbAction::Link => self.link(),
        }
    }

    fn push(&self) -> Result<()> {
        println!("{}", "🗄️  Pushing database migrations...".cyan());

        let status = Command::new("supabase")
            .args(["db", "push"])
            .status()
            .context("Failed to run supabase db push. Make sure Supabase CLI is installed.")?;

        if !status.success() {
            anyhow::bail!("Database push failed");
        }

        println!("{}", "✅ Database migrations pushed successfully!".green());
        Ok(())
    }

    fn migration_new(&self, name: &str) -> Result<()> {
        println!("{}", format!("📝 Creating new migration: {}", name).cyan());

        let status = Command::new("supabase")
            .args(["migration", "new", name])
            .status()
            .context("Failed to create migration. Make sure Supabase CLI is installed.")?;

        if !status.success() {
            anyhow::bail!("Migration creation failed");
        }

        println!("{}", "✅ Migration file created!".green());
        Ok(())
    }

    fn status(&self) -> Result<()> {
        println!("{}", "🔍 Checking database status...".cyan());

        let status = Command::new("supabase")
            .args(["status"])
            .status()
            .context("Failed to check status. Make sure Supabase CLI is installed.")?;

        if !status.success() {
            anyhow::bail!("Status check failed");
        }

        Ok(())
    }

    fn link(&self) -> Result<()> {
        println!("{}", "🔗 Linking to Supabase project...".cyan());

        let status = Command::new("supabase")
            .args(["link"])
            .status()
            .context("Failed to link project. Make sure Supabase CLI is installed.")?;

        if !status.success() {
            anyhow::bail!("Project linking failed");
        }

        println!("{}", "✅ Project linked successfully!".green());
        Ok(())
    }
}
