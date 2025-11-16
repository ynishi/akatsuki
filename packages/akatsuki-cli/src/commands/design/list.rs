use anyhow::Result;
use colored::*;
use std::fs;

use crate::utils::{extract_markdown_metadata, get_examples_dir};

pub fn execute() -> Result<()> {
    let examples_dir = get_examples_dir()?;

    if !examples_dir.exists() {
        println!("{}", "📚 No design examples found yet.".yellow());
        println!(
            "\n{}",
            "Tip: Use \"akatsuki design publish <feature-name>\" to publish your first example!"
                .cyan()
        );
        return Ok(());
    }

    // Read all markdown files
    let entries = fs::read_dir(&examples_dir)?;
    let mut files: Vec<_> = entries
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
        println!("{}", "📚 No design examples found yet.".yellow());
        println!(
            "\n{}",
            "Tip: Use \"akatsuki design publish <feature-name>\" to publish your first example!"
                .cyan()
        );
        return Ok(());
    }

    // Sort by modification time (newest first)
    files.sort_by_key(|entry| {
        entry
            .metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
    });
    files.reverse();

    println!("{}\n", "📚 Available Design Examples:".green().bold());

    for (index, entry) in files.iter().enumerate() {
        let path = entry.path();
        let filename = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown");
        let content = fs::read_to_string(&path)?;
        let metadata = extract_markdown_metadata(&content);

        println!("{}. {}", (index + 1).to_string().cyan(), filename.bold());
        println!("   Title: {}", metadata.title);
        println!("   {}", metadata.description);
        println!(
            "   Created: {} | Status: {}",
            metadata.created, metadata.status
        );
        if metadata.screen_count > 0 {
            println!("   Screens: {}", metadata.screen_count);
        }
        println!();
    }

    println!(
        "Total: {} example(s)",
        files.len().to_string().green().bold()
    );
    println!(
        "\n{}",
        "💡 Use \"akatsuki design use\" to copy an example to your workspace".cyan()
    );

    Ok(())
}
