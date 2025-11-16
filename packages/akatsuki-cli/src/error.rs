use std::fmt;

#[derive(Debug)]
pub enum CliError {
    InvalidFeatureName(String),
    FileNotFound(String),
    IoError(std::io::Error),
    TemplateError(String),
}

impl fmt::Display for CliError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CliError::InvalidFeatureName(name) => {
                write!(f, "Invalid feature name: {}. Use kebab-case (lowercase, numbers, hyphens only)", name)
            }
            CliError::FileNotFound(path) => {
                write!(f, "File not found: {}", path)
            }
            CliError::IoError(err) => {
                write!(f, "IO error: {}", err)
            }
            CliError::TemplateError(msg) => {
                write!(f, "Template error: {}", msg)
            }
        }
    }
}

impl std::error::Error for CliError {}

impl From<std::io::Error> for CliError {
    fn from(err: std::io::Error) -> Self {
        CliError::IoError(err)
    }
}
