mod check;
mod init;

use anyhow::Result;

use crate::cli::SetupAction;

pub struct SetupCommand;

impl SetupCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, action: SetupAction) -> Result<()> {
        match action {
            SetupAction::Check => check::execute(),
            SetupAction::Init => init::execute(),
        }
    }
}
