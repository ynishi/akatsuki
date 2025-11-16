use anyhow::Result;
use std::path::Path;

mod git;
mod migration;

pub use git::GitDetector;
pub use migration::MigrationDetector;

/// Detector trait for analyzing project state
pub trait Detector {
    fn detect(&self, project_root: &Path) -> Result<Vec<Detection>>;
}

/// Detection result
#[derive(Debug, Clone)]
pub struct Detection {
    pub category: DetectionCategory,
    pub message: String,
    pub priority: u8,
}

/// Detection categories
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DetectionCategory {
    PendingMigration,
    UncommittedChanges,
    DesignDocument,
    CheckRequired,
    Clean,
}

impl Detection {
    pub fn new(category: DetectionCategory, message: String, priority: u8) -> Self {
        Self {
            category,
            message,
            priority,
        }
    }
}
