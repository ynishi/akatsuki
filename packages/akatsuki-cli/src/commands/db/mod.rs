use anyhow::{Context, Result};
use colored::Colorize;
use std::fs;
use std::path::Path;
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
            DbAction::Check => self.check(),
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

    fn check(&self) -> Result<()> {
        println!("{}", "🔍 Checking database migrations...".cyan());
        println!();

        // Step 1: Check if migrations directory exists
        let migrations_path = Path::new("supabase/migrations");
        if !migrations_path.exists() {
            println!("{}", "⚠️  No migrations directory found".yellow());
            println!("   Run: akatsuki db migration-new <name> to create your first migration");
            return Ok(());
        }

        // Step 2: List migration files
        let mut migrations = Vec::new();
        if let Ok(entries) = fs::read_dir(migrations_path) {
            for entry in entries.flatten() {
                if let Some(filename) = entry.file_name().to_str() {
                    if filename.ends_with(".sql") {
                        migrations.push(filename.to_string());
                    }
                }
            }
        }

        migrations.sort();

        if migrations.is_empty() {
            println!("{}", "✅ No migration files found".green());
            return Ok(());
        }

        println!(
            "{}",
            format!("📝 Found {} migration file(s):", migrations.len()).cyan()
        );
        for migration in &migrations {
            println!("   • {}", migration);
        }
        println!();

        // Step 3: Check migration status via Supabase CLI
        println!("{}", "🔄 Checking migration status...".cyan());
        let output = Command::new("supabase")
            .args(["migration", "list"])
            .output()
            .context("Failed to check migration status. Make sure Supabase CLI is installed and you're linked to a project.")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!(
                "{}",
                format!("⚠️  Could not check migration status:\n{}", stderr).yellow()
            );
            println!();
            println!(
                "{}",
                "💡 Tip: Run 'akatsuki db link' to link to your Supabase project".cyan()
            );
            return Ok(());
        }

        // Display migration status
        let stdout = String::from_utf8_lossy(&output.stdout);
        println!("{}", stdout);

        // Step 4: Show SQL preview for latest migration
        if let Some(latest_migration) = migrations.last() {
            println!(
                "{}",
                format!("📄 Latest migration preview: {}", latest_migration).cyan()
            );
            println!("{}", "─".repeat(80).dimmed());

            let migration_path = migrations_path.join(latest_migration);
            if let Ok(content) = fs::read_to_string(&migration_path) {
                // Show first 20 lines or full content if shorter
                let lines: Vec<&str> = content.lines().collect();
                let preview_lines = if lines.len() > 20 { 20 } else { lines.len() };

                for line in &lines[..preview_lines] {
                    println!("{}", line.dimmed());
                }

                if lines.len() > 20 {
                    println!(
                        "{}",
                        format!("... ({} more lines)", lines.len() - 20).dimmed()
                    );
                }
            }
            println!("{}", "─".repeat(80).dimmed());
        }

        // Step 5: Check for multibyte characters (potential encoding issues)
        println!();
        println!("{}", "🔤 Checking for multibyte characters...".cyan());

        let mut has_multibyte = false;
        let mut multibyte_warnings = Vec::new();

        for migration in &migrations {
            let migration_path = migrations_path.join(migration);
            if let Ok(content) = fs::read_to_string(&migration_path) {
                for (line_num, line) in content.lines().enumerate() {
                    // Check if line contains non-ASCII characters
                    if line.chars().any(|c| !c.is_ascii()) {
                        has_multibyte = true;
                        // Extract the non-ASCII part (first 50 chars max)
                        let sample: String = line.chars().take(50).collect();
                        multibyte_warnings.push((migration.clone(), line_num + 1, sample));
                    }
                }
            }
        }

        if has_multibyte {
            println!();
            println!(
                "{}",
                "⚠️  WARNING: Multibyte characters detected in migration files"
                    .yellow()
                    .bold()
            );
            println!(
                "{}",
                "   This may cause 'supabase db push' to fail with encoding errors".yellow()
            );
            println!();
            println!("{}", "   Affected files:".yellow());

            // Group by file and show first few occurrences per file
            let mut current_file = String::new();
            let mut count_in_file = 0;
            const MAX_WARNINGS_PER_FILE: usize = 3;

            for (file, line_num, sample) in &multibyte_warnings {
                if *file != current_file {
                    current_file = file.clone();
                    count_in_file = 0;
                    println!();
                    println!("{}", format!("   📄 {}", file).yellow());
                }

                count_in_file += 1;
                if count_in_file <= MAX_WARNINGS_PER_FILE {
                    println!(
                        "{}",
                        format!("      Line {}: {}", line_num, sample).dimmed()
                    );
                } else if count_in_file == MAX_WARNINGS_PER_FILE + 1 {
                    let remaining = multibyte_warnings
                        .iter()
                        .filter(|(f, _, _)| f == file)
                        .count()
                        - MAX_WARNINGS_PER_FILE;
                    if remaining > 0 {
                        println!(
                            "{}",
                            format!("      ... and {} more line(s)", remaining).dimmed()
                        );
                    }
                }
            }

            println!();
            println!("{}", "💡 Recommendations:".cyan());
            println!("   1. Remove Japanese/multibyte comments from SQL files");
            println!("   2. Use only ASCII characters (English) in migration files");
            println!("   3. Ensure files are saved with UTF-8 encoding");
            println!("   4. Test with: akatsuki db push --dry-run (if available)");
            println!();
        } else {
            println!(
                "{}",
                "   ✅ No multibyte characters found (safe for push)".green()
            );
        }

        println!();
        println!("{}", "✅ Migration check complete!".green());
        println!();
        println!("{}", "💡 Next steps:".cyan());
        println!("   • Review migration files above");
        println!("   • Run: akatsuki db push    - to apply migrations");
        println!("   • Run: akatsuki db status  - to check database status");

        Ok(())
    }
}
