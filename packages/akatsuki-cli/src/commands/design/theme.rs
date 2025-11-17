use anyhow::{Context, Result};
use colored::Colorize;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct Theme {
    pub name: String,
    pub id: String,
    pub description: String,
    pub mood: String,
    pub use_cases: Vec<String>,
    pub colors: ThemeColors,
    pub typography: Typography,
    pub spacing: HashMap<String, String>,
    pub border_radius: HashMap<String, String>,
    pub components: Components,
    pub examples: Examples,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThemeColors {
    pub primary: HashMap<String, String>,
    pub secondary: HashMap<String, String>,
    #[serde(default)]
    pub accent: HashMap<String, String>,
    pub neutral: HashMap<String, String>,
    pub success: HashMap<String, String>,
    pub warning: HashMap<String, String>,
    pub error: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Typography {
    pub font_family: HashMap<String, String>,
    pub font_size: HashMap<String, String>,
    pub line_height: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Components {
    pub button: HashMap<String, String>,
    pub card: HashMap<String, String>,
    pub input: HashMap<String, String>,
    pub badge: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Examples {
    pub layout: String,
    pub button_group: String,
}

impl Theme {
    pub fn load(theme_id: &str) -> Result<Self> {
        let theme_path = Self::get_theme_path(theme_id)?;
        let content = fs::read_to_string(&theme_path)
            .with_context(|| format!("Failed to read theme file: {}", theme_path.display()))?;

        let theme: Theme = serde_json::from_str(&content)
            .with_context(|| format!("Failed to parse theme JSON: {}", theme_id))?;

        Ok(theme)
    }

    pub fn list_all() -> Result<Vec<String>> {
        let themes_dir = Self::get_themes_dir()?;

        if !themes_dir.exists() {
            return Ok(vec![]);
        }

        let mut theme_ids = Vec::new();

        for entry in fs::read_dir(&themes_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    theme_ids.push(stem.to_string());
                }
            }
        }

        theme_ids.sort();
        Ok(theme_ids)
    }

    fn get_themes_dir() -> Result<PathBuf> {
        // Find the CLI package directory (where Cargo.toml is)
        let mut current = std::env::current_dir()?;

        loop {
            // Check for akatsuki-cli/themes directory
            let themes_dir = current.join("packages/akatsuki-cli/themes");
            if themes_dir.exists() {
                return Ok(themes_dir);
            }

            // Also check if we're already in akatsuki-cli
            let themes_dir = current.join("themes");
            if themes_dir.exists() && current.join("Cargo.toml").exists() {
                return Ok(themes_dir);
            }

            // Move up to parent directory
            if let Some(parent) = current.parent() {
                current = parent.to_path_buf();
            } else {
                anyhow::bail!("Could not find themes directory. Make sure you're in the Akatsuki project.");
            }
        }
    }

    fn get_theme_path(theme_id: &str) -> Result<PathBuf> {
        let themes_dir = Self::get_themes_dir()?;
        let theme_path = themes_dir.join(format!("{}.json", theme_id));

        if !theme_path.exists() {
            anyhow::bail!("Theme not found: {}. Use 'akatsuki design themes' to list available themes.", theme_id);
        }

        Ok(theme_path)
    }

    pub fn to_markdown(&self) -> String {
        let mut md = String::new();

        // Header
        md.push_str(&format!("# {} Theme\n\n", self.name));
        md.push_str(&format!("**ID**: `{}`\n\n", self.id));
        md.push_str(&format!("{}\n\n", self.description));

        // Mood and Use Cases
        md.push_str(&format!("**ムード**: {}\n\n", self.mood));
        md.push_str("**適用例**:\n");
        for use_case in &self.use_cases {
            md.push_str(&format!("- {}\n", use_case));
        }
        md.push_str("\n");

        // Color Palette
        md.push_str("## カラーパレット\n\n");

        md.push_str("### Primary\n");
        self.format_color_scale(&mut md, &self.colors.primary);

        md.push_str("### Secondary\n");
        self.format_color_scale(&mut md, &self.colors.secondary);

        if !self.colors.accent.is_empty() {
            md.push_str("### Accent\n");
            self.format_color_scale(&mut md, &self.colors.accent);
        }

        md.push_str("### Neutral\n");
        self.format_color_scale(&mut md, &self.colors.neutral);

        md.push_str("### Semantic Colors\n");
        md.push_str(&format!("- **Success**: `{}` (500), `{}` (600)\n",
            self.colors.success.get("500").unwrap_or(&"N/A".to_string()),
            self.colors.success.get("600").unwrap_or(&"N/A".to_string())));
        md.push_str(&format!("- **Warning**: `{}` (500), `{}` (600)\n",
            self.colors.warning.get("500").unwrap_or(&"N/A".to_string()),
            self.colors.warning.get("600").unwrap_or(&"N/A".to_string())));
        md.push_str(&format!("- **Error**: `{}` (500), `{}` (600)\n\n",
            self.colors.error.get("500").unwrap_or(&"N/A".to_string()),
            self.colors.error.get("600").unwrap_or(&"N/A".to_string())));

        // Typography
        md.push_str("## タイポグラフィ\n\n");
        md.push_str(&format!("**Font Family**:\n"));
        md.push_str(&format!("- Sans: `{}`\n",
            self.typography.font_family.get("sans").unwrap_or(&"N/A".to_string())));
        md.push_str(&format!("- Mono: `{}`\n\n",
            self.typography.font_family.get("mono").unwrap_or(&"N/A".to_string())));

        // Components
        md.push_str("## コンポーネント\n\n");

        md.push_str("### Button\n");
        for (variant, classes) in &self.components.button {
            md.push_str(&format!("**{}**:\n", variant));
            md.push_str(&format!("```css\n{}\n```\n\n", classes));
        }

        md.push_str("### Card\n");
        for (variant, classes) in &self.components.card {
            md.push_str(&format!("**{}**:\n", variant));
            md.push_str(&format!("```css\n{}\n```\n\n", classes));
        }

        md.push_str("### Input\n");
        for (variant, classes) in &self.components.input {
            md.push_str(&format!("**{}**:\n", variant));
            md.push_str(&format!("```css\n{}\n```\n\n", classes));
        }

        md.push_str("### Badge\n");
        for (variant, classes) in &self.components.badge {
            md.push_str(&format!("**{}**:\n", variant));
            md.push_str(&format!("```css\n{}\n```\n\n", classes));
        }

        // Examples
        md.push_str("## 使用例\n\n");

        md.push_str("### Layout\n");
        md.push_str(&format!("{}\n\n", self.examples.layout));

        md.push_str("### Button Group\n");
        md.push_str(&format!("{}\n\n", self.examples.button_group));

        // How to use
        md.push_str("## このテーマを使う\n\n");
        md.push_str(&format!("```bash\n# 新しい設計でこのテーマを参照\nakatsuki design new my-feature\n# 上記Markdownをコピーして設計書の「カラーパレット」セクションに貼り付け\n```\n"));

        md
    }

    fn format_color_scale(&self, md: &mut String, colors: &HashMap<String, String>) {
        let mut sorted_keys: Vec<_> = colors.keys().collect();
        sorted_keys.sort_by_key(|k| k.parse::<i32>().unwrap_or(0));

        for key in sorted_keys {
            if let Some(value) = colors.get(key) {
                md.push_str(&format!("- **{}**: `{}`\n", key, value));
            }
        }
        md.push_str("\n");
    }
}

pub fn list_themes() -> Result<()> {
    println!("\n{}\n", "📚 Available Themes".bright_cyan().bold());

    let theme_ids = Theme::list_all()?;

    if theme_ids.is_empty() {
        println!("No themes found in themes directory.");
        return Ok(());
    }

    for theme_id in &theme_ids {
        // Load theme to get name and description
        match Theme::load(theme_id) {
            Ok(theme) => {
                println!("  {} {}", "●".bright_green(), theme_id.bright_white().bold());
                println!("    {} - {}", theme.name.bright_cyan(), theme.description);
                println!("    {}: {}", "Mood".dimmed(), theme.mood);
                println!();
            }
            Err(e) => {
                println!("  {} {} (error: {})", "●".bright_red(), theme_id, e);
            }
        }
    }

    println!("💡 {}", "Use 'akatsuki design theme <id>' to view theme details".dimmed());

    Ok(())
}

pub fn show_theme(theme_id: &str, format: &str) -> Result<()> {
    let theme = Theme::load(theme_id)?;

    match format {
        "json" => {
            let json = serde_json::to_string_pretty(&theme)?;
            println!("{}", json);
        }
        "markdown" | _ => {
            let markdown = theme.to_markdown();
            println!("{}", markdown);
        }
    }

    Ok(())
}

pub fn insert_theme(file_path: &str, theme_id: &str) -> Result<()> {
    use crate::utils::template::generate_theme_section_for_insertion;

    // Check if file exists
    let path = std::path::Path::new(file_path);
    if !path.exists() {
        anyhow::bail!("File not found: {}", file_path);
    }

    // Read existing file
    let original_content = std::fs::read_to_string(path)?;

    // Load theme
    let theme = Theme::load(theme_id)?;

    // Generate theme section
    let theme_section = generate_theme_section_for_insertion(&theme);

    // Replace Color Theme section
    let updated_content = replace_color_theme_section_in_file(&original_content, &theme_section);

    // Write back to file
    std::fs::write(path, updated_content)?;

    println!("\n{}", "✅ Theme inserted successfully!".bright_green().bold());
    println!("\n{} {}", "📄 File:".cyan(), file_path);
    println!("{} {}", "🎨 Theme:".magenta(), theme_id.bright_white().bold());

    Ok(())
}

fn replace_color_theme_section_in_file(content: &str, theme_section: &str) -> String {
    let start_marker = "### Color Theme";
    let end_marker = "### Layout Pattern";

    if let Some(start_pos) = content.find(start_marker) {
        if let Some(end_pos) = content.find(end_marker) {
            let mut result = String::new();
            result.push_str(&content[..start_pos]);
            result.push_str(theme_section);
            result.push_str("\n");
            result.push_str(&content[end_pos..]);
            return result;
        }
    }

    // If section not found, append at the end
    let mut result = content.to_string();
    result.push_str("\n\n");
    result.push_str(theme_section);
    result
}
