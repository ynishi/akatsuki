mod list;
mod new;
mod publish;
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
            DesignAction::New { feature_name } => new::execute(&feature_name),
            DesignAction::List => list::execute(),
            DesignAction::Use => use_cmd::execute(),
            DesignAction::Publish { feature_name } => publish::execute(&feature_name),
        }
    }
}
