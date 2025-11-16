use anyhow::Result;
use std::fs;
use std::path::PathBuf;

/// Get project root directory (searches for Cargo.toml or package.json)
pub fn get_project_root() -> Result<PathBuf> {
    let current_dir = std::env::current_dir()?;

    let mut dir = current_dir.as_path();
    loop {
        if dir.join("package.json").exists() || dir.join("Cargo.toml").exists() {
            return Ok(dir.to_path_buf());
        }

        match dir.parent() {
            Some(parent) => dir = parent,
            None => return Ok(current_dir),
        }
    }
}

/// Get workspace directory path
pub fn get_workspace_dir() -> Result<PathBuf> {
    let root = get_project_root()?;
    let workspace = root.join("workspace");

    if !workspace.exists() {
        fs::create_dir_all(&workspace)?;
    }

    Ok(workspace)
}

/// Get examples directory path
pub fn get_examples_dir() -> Result<PathBuf> {
    let root = get_project_root()?;
    let examples = root.join("docs").join("examples");

    if !examples.exists() {
        fs::create_dir_all(&examples)?;
    }

    Ok(examples)
}

/// Validate feature name (kebab-case)
pub fn validate_feature_name(name: &str) -> bool {
    !name.is_empty() && name.chars().all(|c| c.is_ascii_lowercase() || c == '-' || c.is_numeric())
}

/// Convert kebab-case to Title Case
pub fn to_title_case(s: &str) -> String {
    s.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().chain(chars).collect(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Extract metadata from markdown file
pub fn extract_markdown_metadata(content: &str) -> MarkdownMetadata {
    let title_regex = regex::Regex::new(r"(?m)^#\s+(.+)").unwrap();
    let created_regex = regex::Regex::new(r"\*\*Created:\*\*\s+(.+)").unwrap();
    let status_regex = regex::Regex::new(r"\*\*Status:\*\*\s+(.+)").unwrap();
    let desc_regex = regex::Regex::new(r"(?m)^##\s+1\.\s+.*?\n\n\*\*WHY.*?:\*\*\n-\s+(.+)").unwrap();

    let title = title_regex
        .captures(content)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "No title".to_string());

    let created = created_regex
        .captures(content)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let status = status_regex
        .captures(content)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let description = desc_regex
        .captures(content)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "No description".to_string());

    // Count screens (lines starting with /)
    let routing_regex = regex::Regex::new(r"```\n(/.*?\n)+```").unwrap();
    let screen_count = routing_regex
        .find(content)
        .map(|m| {
            m.as_str()
                .lines()
                .filter(|line| line.starts_with('/'))
                .count()
        })
        .unwrap_or(0);

    MarkdownMetadata {
        title,
        created,
        status,
        description,
        screen_count,
    }
}

#[derive(Debug)]
pub struct MarkdownMetadata {
    pub title: String,
    pub created: String,
    pub status: String,
    pub description: String,
    pub screen_count: usize,
}
