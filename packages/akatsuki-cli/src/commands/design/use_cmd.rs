use anyhow::{bail, Result};
use chrono::Local;
use colored::*;
use std::fs;

use crate::utils::{
    confirm_overwrite, extract_markdown_metadata, get_examples_dir, get_workspace_dir,
    input_feature_name, select_design_example, to_title_case,
};

pub fn execute() -> Result<()> {
    let examples_dir = get_examples_dir()?;

    if !examples_dir.exists() {
        bail!("No design examples found.\n\nTip: Use \"akatsuki design new <feature-name>\" to create a new design");
    }

    // Read all markdown files
    let entries = fs::read_dir(&examples_dir)?;
    let files: Vec<_> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().is_file()
                && entry
                    .path()
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s == "md")
                    .unwrap_or(false)
        })
        .collect();

    if files.is_empty() {
        bail!("No design examples found.\n\nTip: Use \"akatsuki design new <feature-name>\" to create a new design");
    }

    // Prepare choices with metadata
    let choices: Vec<(String, String)> = files
        .iter()
        .map(|entry| {
            let path = entry.path();
            let filename = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            let content = fs::read_to_string(&path).unwrap_or_default();
            let metadata = extract_markdown_metadata(&content);
            (filename, metadata.title)
        })
        .collect();

    println!("{}\n", "📚 VibeCoding Design - Use Example".green().bold());

    // Select example
    let selection = select_design_example(&choices)?;
    let selected_file = &choices[selection].0;

    // Input new feature name
    let new_feature_name = input_feature_name()?;

    let workspace_dir = get_workspace_dir()?;
    let output_path = workspace_dir.join(format!("{}-design.md", new_feature_name));

    // Check if output file already exists
    if output_path.exists() {
        let overwrite = confirm_overwrite(&format!("{}-design.md", new_feature_name))?;
        if !overwrite {
            println!("{}", "❌ Cancelled.".red());
            return Ok(());
        }
    }

    // Copy file
    let source_path = examples_dir.join(selected_file);
    let content = fs::read_to_string(&source_path)?;

    // Update title and dates
    let today = Local::now().format("%Y-%m-%d").to_string();
    let new_title = to_title_case(&new_feature_name);

    let updated_content = content
        .lines()
        .map(|line| {
            if line.starts_with("# ") {
                format!("# {} - Design Document", new_title)
            } else if line.starts_with("**Created:**") {
                format!("**Created:** {}", today)
            } else if line.starts_with("**Last Updated:**") {
                format!("**Last Updated:** {}", today)
            } else if line.starts_with("**Status:**") {
                "**Status:** Draft".to_string()
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    fs::write(&output_path, updated_content)?;

    println!(
        "\n{}",
        "✅ Design example copied successfully!".green().bold()
    );
    println!("\n{} {}", "📄 File:".cyan(), output_path.display());
    println!("\n{}", "💡 Next steps:".yellow().bold());
    println!("   1. Open the file and customize for your needs");
    println!("   2. Update the Pre-Discussion section with user requirements");
    println!("   3. Modify design decisions (color, layout, etc.)");
    println!("   4. Start VibeCoding!\n");

    Ok(())
}
