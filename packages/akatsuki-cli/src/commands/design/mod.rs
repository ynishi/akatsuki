mod list;
mod new;
mod publish;
pub mod theme;
mod use_cmd;

use anyhow::Result;

use crate::cli::DesignAction;

pub struct DesignCommand;

impl DesignCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, action: DesignAction) -> Result<()> {
        match action {
            DesignAction::New { feature_name, theme } => new::execute(&feature_name, theme.as_deref()),
            DesignAction::List => list::execute(),
            DesignAction::Use => use_cmd::execute(),
            DesignAction::Publish { feature_name } => publish::execute(&feature_name),
            DesignAction::Themes => theme::list_themes(),
            DesignAction::Theme { theme_id, format } => theme::show_theme(&theme_id, &format),
            DesignAction::InsertTheme { file, theme } => theme::insert_theme(&file, &theme),
        }
    }
}
