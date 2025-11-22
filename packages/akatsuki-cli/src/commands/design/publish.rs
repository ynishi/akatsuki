use anyhow::{bail, Result};
use chrono::Local;
use colored::*;
use std::fs;

use crate::utils::{
    confirm_keep_in_workspace, confirm_overwrite, confirm_publish, get_examples_dir,
    get_workspace_dir, input_tags,
};

pub fn execute(feature_name: &str) -> Result<()> {
    let workspace_dir = get_workspace_dir()?;
    let examples_dir = get_examples_dir()?;
    let source_path = workspace_dir.join(format!("{}-design.md", feature_name));
    let target_path = examples_dir.join(format!("{}-design.md", feature_name));

    // Check if source file exists
    if !source_path.exists() {
        bail!(
            "Design file not found: {}\n\nTip: Make sure you have created the design file in workspace/",
            source_path.display()
        );
    }

    println!(
        "{}\n",
        "📚 VibeCoding Design - Publish to Examples".green().bold()
    );
    println!("{} {}", "Source:".cyan(), source_path.display());
    println!("{} {}\n", "Target:".cyan(), target_path.display());

    // Confirm publication
    if !confirm_publish()? {
        println!("{}", "❌ Cancelled.".red());
        return Ok(());
    }

    // Check if target already exists
    if target_path.exists() {
        if !confirm_overwrite(&format!("{}-design.md", feature_name))? {
            println!("{}", "❌ Cancelled.".red());
            return Ok(());
        }
    }

    // Optional: Add tags
    let tags = input_tags()?;

    // Read and update content
    let mut content = fs::read_to_string(&source_path)?;

    // Update status to Completed
    content = content
        .lines()
        .map(|line| {
            if line.starts_with("**Status:**") {
                "**Status:** Completed".to_string()
            } else if line.starts_with("**Last Updated:**") {
                let today = Local::now().format("%Y-%m-%d").to_string();
                format!("**Last Updated:** {}", today)
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    // Add tags section if provided
    if let Some(ref tag_list) = tags {
        if !tag_list.is_empty() {
            let tags_section = format!("\n**Tags:** {}\n", tag_list.join(", "));
            // Insert tags after Status line
            content = content.replace(
                "**Status:** Completed",
                &format!("**Status:** Completed{}", tags_section),
            );
        }
    }

    // Create examples directory if not exists
    if !examples_dir.exists() {
        fs::create_dir_all(&examples_dir)?;
    }

    // Write file
    fs::write(&target_path, content)?;

    println!("\n{}", "✅ Design published successfully!".green().bold());
    println!("\n{} {}", "📚 Published to:".cyan(), target_path.display());
    if let Some(tag_list) = tags {
        if !tag_list.is_empty() {
            println!("{} {}", "🏷️  Tags:".cyan(), tag_list.join(", "));
        }
    }
    println!(
        "\n{}",
        "💡 This design is now available as an example for future projects!".yellow()
    );
    println!("   Use \"akatsuki design list\" to see all examples");
    println!("   Use \"akatsuki design use\" to copy this example\n");

    // Optional: Keep or remove from workspace
    if !confirm_keep_in_workspace()? {
        fs::remove_file(&source_path)?;
        println!(
            "{} {}",
            "🗑️  Removed from workspace:".yellow(),
            source_path.display()
        );
    }

    Ok(())
}
