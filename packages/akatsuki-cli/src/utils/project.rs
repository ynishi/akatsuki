/**
 * Project utilities
 * プロジェクトルート検出など
 */
use std::path::PathBuf;

/// Find Akatsuki project root directory
///
/// Searches upward from current directory for:
/// 1. package.json with "workspaces"
/// 2. packages/app-frontend directory
///
/// Returns project root or current directory if not found
pub fn find_project_root() -> PathBuf {
    let mut current = std::env::current_dir().unwrap();

    loop {
        // Check for package.json with workspaces
        let package_json = current.join("package.json");
        if package_json.exists() {
            if let Ok(content) = std::fs::read_to_string(&package_json) {
                if content.contains("\"workspaces\"") {
                    return current;
                }
            }
        }

        // Check for packages directory (monorepo indicator)
        if current.join("packages").is_dir() && current.join("packages/app-frontend").is_dir() {
            return current;
        }

        // Move up to parent directory
        if let Some(parent) = current.parent() {
            current = parent.to_path_buf();
        } else {
            // Reached filesystem root, return original
            return std::env::current_dir().unwrap();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_project_root() {
        let root = find_project_root();
        assert!(root.join("package.json").exists());
        assert!(root.join("packages").exists());
    }
}
