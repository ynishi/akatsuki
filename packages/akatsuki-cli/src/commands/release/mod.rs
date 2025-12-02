//! Release command for CLI versioning and publishing
//!
//! Updates Cargo.toml version, creates git tag, and pushes to origin.

use anyhow::{Context, Result};
use colored::*;
use dialoguer::Confirm;
use regex::Regex;
use std::fs;
use std::process::Command;

use crate::utils::get_project_root;

pub struct ReleaseCommand;

impl ReleaseCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, version: &str, skip_confirm: bool) -> Result<()> {
        println!("\n{}\n", "🚀 Akatsuki CLI Release".cyan().bold());

        // Validate version format
        let version_re = Regex::new(r"^\d+\.\d+\.\d+$")?;
        if !version_re.is_match(version) {
            anyhow::bail!(
                "Invalid version format: {}. Expected: X.Y.Z (e.g., 1.0.0)",
                version
            );
        }

        let root = get_project_root()?;
        let cargo_toml_path = root.join("packages/akatsuki-cli/Cargo.toml");

        // Read current version
        let cargo_content = fs::read_to_string(&cargo_toml_path)
            .context("Failed to read Cargo.toml")?;

        let current_version = extract_version(&cargo_content)
            .context("Failed to extract current version from Cargo.toml")?;

        println!("{} Current version: {}", "ℹ".blue(), current_version);
        println!("{} New version: {}", "ℹ".blue(), version.green());
        println!("{} Tag: {}", "ℹ".blue(), format!("cli-v{}", version).yellow());
        println!();

        // Check for uncommitted changes
        let status_output = Command::new("git")
            .args(["status", "--porcelain"])
            .current_dir(&root)
            .output()?;

        let has_changes = !status_output.stdout.is_empty();
        if has_changes {
            println!("{} Warning: You have uncommitted changes", "⚠".yellow());
            println!();
        }

        // Confirm
        if !skip_confirm {
            let confirm = Confirm::new()
                .with_prompt(format!(
                    "Release version {}? (update Cargo.toml, commit, tag, push)",
                    version
                ))
                .default(true)
                .interact()?;

            if !confirm {
                println!("{} Release cancelled", "✗".red());
                return Ok(());
            }
        }

        // Step 1: Update Cargo.toml version
        println!("\n{} Updating Cargo.toml...", "▸".magenta());
        let new_content = update_version(&cargo_content, version)?;
        fs::write(&cargo_toml_path, new_content)?;
        println!("{} Updated version to {}", "✓".green(), version);

        // Step 2: Git add and commit
        println!("\n{} Creating release commit...", "▸".magenta());

        let status = Command::new("git")
            .args(["add", "packages/akatsuki-cli/Cargo.toml"])
            .current_dir(&root)
            .status()?;

        if !status.success() {
            anyhow::bail!("Failed to stage Cargo.toml");
        }

        let commit_msg = format!("chore(akatsuki-cli): Release v{}", version);
        let status = Command::new("git")
            .args(["commit", "-m", &commit_msg])
            .current_dir(&root)
            .status()?;

        if !status.success() {
            anyhow::bail!("Failed to create commit");
        }
        println!("{} Created commit: {}", "✓".green(), commit_msg);

        // Step 3: Create tag
        println!("\n{} Creating tag...", "▸".magenta());
        let tag = format!("cli-v{}", version);

        let status = Command::new("git")
            .args(["tag", "-a", &tag, "-m", &format!("Release {}", tag)])
            .current_dir(&root)
            .status()?;

        if !status.success() {
            anyhow::bail!("Failed to create tag");
        }
        println!("{} Created tag: {}", "✓".green(), tag);

        // Step 4: Push commit and tag
        println!("\n{} Pushing to origin...", "▸".magenta());

        let status = Command::new("git")
            .args(["push", "origin", "HEAD"])
            .current_dir(&root)
            .status()?;

        if !status.success() {
            anyhow::bail!("Failed to push commit");
        }

        let status = Command::new("git")
            .args(["push", "origin", &tag])
            .current_dir(&root)
            .status()?;

        if !status.success() {
            anyhow::bail!("Failed to push tag");
        }
        println!("{} Pushed commit and tag to origin", "✓".green());

        // Summary
        println!("\n{}\n", "🎉 Release Complete!".cyan().bold());
        println!("Version: {}", version.green());
        println!("Tag: {}", tag.yellow());
        println!();
        println!("{}", "Next steps:".bold());
        println!("1. GitHub Actions will build and create the release");
        println!("2. Update Formula/akatsuki.rb with new SHA256 hashes");
        println!("3. Check: https://github.com/ynishi/akatsuki/releases");
        println!();

        Ok(())
    }
}

/// Extract version from Cargo.toml content
fn extract_version(content: &str) -> Option<String> {
    let re = Regex::new(r#"^version\s*=\s*"([^"]+)""#).ok()?;
    for line in content.lines() {
        if let Some(caps) = re.captures(line) {
            return Some(caps.get(1)?.as_str().to_string());
        }
    }
    None
}

/// Update version in Cargo.toml content
fn update_version(content: &str, new_version: &str) -> Result<String> {
    let re = Regex::new(r#"^(version\s*=\s*)"[^"]+""#)?;
    let mut found = false;
    let mut result = String::new();

    for line in content.lines() {
        if !found && re.is_match(line) {
            let new_line = re.replace(line, format!(r#"$1"{}""#, new_version));
            result.push_str(&new_line);
            found = true;
        } else {
            result.push_str(line);
        }
        result.push('\n');
    }

    if !found {
        anyhow::bail!("Could not find version field in Cargo.toml");
    }

    Ok(result)
}
