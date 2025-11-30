use anyhow::Result;
use chrono::Local;

const DESIGN_TEMPLATE: &str = include_str!("../../../../docs/templates/design-template.md");

pub fn process_template(feature_name: &str) -> String {
    let title = crate::utils::to_title_case(feature_name);
    let today = Local::now().format("%Y-%m-%d").to_string();

    DESIGN_TEMPLATE
        .replace("[Feature Name]", &title)
        .replace("[Date]", &today)
}

pub fn process_template_with_theme(feature_name: &str, theme_id: &str) -> Result<String> {
    use crate::commands::design::theme::Theme;

    let title = crate::utils::to_title_case(feature_name);
    let today = Local::now().format("%Y-%m-%d").to_string();

    // Load theme
    let theme = Theme::load(theme_id)?;

    // Generate theme section for design doc
    let theme_section = generate_theme_section(&theme);

    // Replace placeholders
    let mut content = DESIGN_TEMPLATE
        .replace("[Feature Name]", &title)
        .replace("[Date]", &today);

    // Replace Color Theme section
    content = replace_color_theme_section(&content, &theme_section);

    Ok(content)
}

pub fn generate_theme_section_for_insertion(
    theme: &crate::commands::design::theme::Theme,
) -> String {
    generate_theme_section(theme)
}

fn generate_theme_section(theme: &crate::commands::design::theme::Theme) -> String {
    let mut section = String::new();

    section.push_str(&format!("### Color Theme\n\n"));
    section.push_str(&format!(
        "**Selected Theme:** `{}` - {}\n\n",
        theme.id, theme.name
    ));
    section.push_str(&format!("**Mood:** {}\n\n", theme.mood));

    // Color Palette
    section.push_str("#### Primary Colors\n");
    section.push_str(&format!(
        "- Main: `{}` (500)\n",
        theme
            .colors
            .primary
            .get("500")
            .unwrap_or(&"N/A".to_string())
    ));
    section.push_str(&format!(
        "- Hover: `{}` (600)\n",
        theme
            .colors
            .primary
            .get("600")
            .unwrap_or(&"N/A".to_string())
    ));
    section.push_str(&format!(
        "- Active: `{}` (700)\n\n",
        theme
            .colors
            .primary
            .get("700")
            .unwrap_or(&"N/A".to_string())
    ));

    section.push_str("#### Neutral Colors\n");
    section.push_str(&format!(
        "- Background: `{}` (50)\n",
        theme.colors.neutral.get("50").unwrap_or(&"N/A".to_string())
    ));
    section.push_str(&format!(
        "- Text: `{}` (900)\n\n",
        theme
            .colors
            .neutral
            .get("900")
            .unwrap_or(&"N/A".to_string())
    ));

    section.push_str("#### Semantic Colors\n");
    section.push_str(&format!(
        "- Success: `{}` (500)\n",
        theme
            .colors
            .success
            .get("500")
            .unwrap_or(&"N/A".to_string())
    ));
    section.push_str(&format!(
        "- Warning: `{}` (500)\n",
        theme
            .colors
            .warning
            .get("500")
            .unwrap_or(&"N/A".to_string())
    ));
    section.push_str(&format!(
        "- Error: `{}` (500)\n\n",
        theme.colors.error.get("500").unwrap_or(&"N/A".to_string())
    ));

    // Typography
    section.push_str("#### Typography\n");
    section.push_str(&format!(
        "- Font: `{}`\n\n",
        theme
            .typography
            .font_family
            .get("sans")
            .unwrap_or(&"N/A".to_string())
    ));

    // Component Styles
    section.push_str("#### Component Styles\n\n");

    if let Some(btn_primary) = theme.components.button.get("primary") {
        section.push_str("**Button (Primary):**\n");
        section.push_str(&format!("```css\n{}\n```\n\n", btn_primary));
    }

    if let Some(card_default) = theme.components.card.get("default") {
        section.push_str("**Card:**\n");
        section.push_str(&format!("```css\n{}\n```\n\n", card_default));
    }

    section.push_str(&format!(
        "💡 **Full theme details**: `akatsuki design theme {}`\n",
        theme.id
    ));

    section
}

fn replace_color_theme_section(content: &str, theme_section: &str) -> String {
    // Find the Color Theme section and replace it
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

    // If markers not found, return original
    content.to_string()
}
