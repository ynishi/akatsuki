use anyhow::{bail, Result};
use colored::*;
use std::fs;

use crate::utils::{get_workspace_dir, process_template, validate_feature_name};

pub fn execute(feature_name: &str) -> Result<()> {
    // Validate feature name
    if !validate_feature_name(feature_name) {
        bail!(
            "Invalid feature name: {}. Use kebab-case (lowercase, numbers, hyphens only)",
            feature_name
        );
    }

    let workspace_dir = get_workspace_dir()?;
    let output_path = workspace_dir.join(format!("{}-design.md", feature_name));

    // Check if file already exists
    if output_path.exists() {
        bail!(
            "Design file already exists: {}\nUse a different name or remove the existing file.",
            output_path.display()
        );
    }

    // Process template
    let content = process_template(feature_name);

    // Write file
    fs::write(&output_path, content)?;

    // Success output
    println!("\n{}", "✅ Design document created successfully!".green().bold());
    println!("\n{} {}", "📄 File:".cyan(), output_path.display());
    println!("\n{}", "🚀 Next steps:".yellow().bold());
    println!("   1. Open the file and fill in the sections");
    println!("   2. Discuss with user to clarify requirements");
    println!("   3. Reference AGENT.md for patterns and examples");
    println!("   4. Start VibeCoding!\n");

    Ok(())
}
