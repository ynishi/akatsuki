use anyhow::Result;
use dialoguer::{Confirm, Input, Select};

pub fn select_design_example(examples: &[(String, String)]) -> Result<usize> {
    let items: Vec<String> = examples
        .iter()
        .map(|(file, title)| format!("{} - {}", file, title))
        .collect();

    let selection = Select::new()
        .with_prompt("Select a design example to copy:")
        .items(&items)
        .interact()?;

    Ok(selection)
}

pub fn input_feature_name() -> Result<String> {
    let name: String = Input::new()
        .with_prompt("Enter new feature name (kebab-case)")
        .validate_with(|input: &String| {
            if input.is_empty() {
                Err("Feature name is required")
            } else if !input
                .chars()
                .all(|c| c.is_ascii_lowercase() || c == '-' || c.is_numeric())
            {
                Err("Use kebab-case (lowercase, numbers, hyphens only)")
            } else {
                Ok(())
            }
        })
        .interact_text()?;

    Ok(name)
}

pub fn confirm_overwrite(filename: &str) -> Result<bool> {
    let result = Confirm::new()
        .with_prompt(format!(
            "File already exists: {}. Overwrite?",
            filename
        ))
        .default(false)
        .interact()?;

    Ok(result)
}

pub fn confirm_publish() -> Result<bool> {
    let result = Confirm::new()
        .with_prompt("Is this design ready to publish as an example?")
        .default(true)
        .interact()?;

    Ok(result)
}

pub fn confirm_keep_in_workspace() -> Result<bool> {
    let result = Confirm::new()
        .with_prompt("Keep original file in workspace?")
        .default(false)
        .interact()?;

    Ok(result)
}

pub fn input_tags() -> Result<Option<Vec<String>>> {
    let add_tags = Confirm::new()
        .with_prompt("Add tags to help categorize this example?")
        .default(true)
        .interact()?;

    if !add_tags {
        return Ok(None);
    }

    let tags_input: String = Input::new()
        .with_prompt("Enter tags (comma-separated)")
        .default("AI, Dashboard, CRUD".to_string())
        .interact_text()?;

    let tags: Vec<String> = tags_input
        .split(',')
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();

    Ok(Some(tags))
}
