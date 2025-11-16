use anyhow::{Context, Result};
use colored::Colorize;
use regex::Regex;
use std::collections::HashSet;
use std::fs;
use std::path::Path;

/// Check navigation consistency between App.jsx routes and TopNavigation.tsx links
pub fn check_navigation_consistency(project_root: &Path) -> Result<bool> {
    println!("{}", "  Checking navigation consistency...".cyan());

    let app_jsx = project_root.join("packages/app-frontend/src/App.jsx");
    let top_nav = project_root.join("packages/app-frontend/src/components/layout/TopNavigation.tsx");

    if !app_jsx.exists() || !top_nav.exists() {
        println!("{}", "  ⏭️  Skipping navigation check (files not found)".yellow());
        return Ok(true);
    }

    // Extract routes from App.jsx
    let routes = extract_routes(&app_jsx)?;

    // Extract nav links from TopNavigation.tsx
    let nav_links = extract_nav_links(&top_nav)?;

    // Filter to list routes only
    let list_routes: Vec<String> = routes.into_iter()
        .filter(|r| is_list_route(r))
        .collect();

    // Check for missing links
    let mut has_errors = false;
    for route in &list_routes {
        if !nav_links.contains(route) {
            println!(
                "{}",
                format!("  ❌ Route '{}' is a list page but not in TopNavigation", route).red()
            );
            has_errors = true;
        }
    }

    if !has_errors {
        println!("{}", "  ✅ Navigation consistency check passed".green());
    } else {
        println!("{}", "  💡 Tip: Add missing routes to TopNavigation.tsx".yellow());
    }

    Ok(!has_errors)
}

/// Extract route paths from App.jsx
fn extract_routes(app_jsx: &Path) -> Result<Vec<String>> {
    let content = fs::read_to_string(app_jsx)
        .context("Failed to read App.jsx")?;

    let mut routes = Vec::new();
    let mut skip_next = false;

    // Match: <Route path="/something" element={...} />
    let route_re = Regex::new(r#"<Route\s+path="(/[^"]+)""#).unwrap();

    for line in content.lines() {
        // Check for akatsuki-ignore on same line
        if line.contains("akatsuki-ignore navigation") {
            skip_next = true;
            continue;
        }

        // Check for akatsuki-ignore-next-line
        if line.contains("akatsuki-ignore-next-line navigation") {
            skip_next = true;
            continue;
        }

        // Skip if previous line had ignore comment
        if skip_next {
            skip_next = false;
            continue;
        }

        if let Some(captures) = route_re.captures(line) {
            let path = captures.get(1).unwrap().as_str().to_string();
            routes.push(path);
        }
    }

    Ok(routes)
}

/// Extract navigation links from TopNavigation.tsx
fn extract_nav_links(top_nav: &Path) -> Result<HashSet<String>> {
    let content = fs::read_to_string(top_nav)
        .context("Failed to read TopNavigation.tsx")?;

    let mut links = HashSet::new();

    // Match: <Link to="/something"
    let link_re = Regex::new(r#"<Link\s+to="(/[^"]+)""#).unwrap();

    for captures in link_re.captures_iter(&content) {
        let path = captures.get(1).unwrap().as_str().to_string();
        links.insert(path);
    }

    Ok(links)
}

/// Determine if a route is a "list page" that should be in TopNavigation
fn is_list_route(path: &str) -> bool {
    // Exclude routes with parameters (e.g., /templates/:id)
    if path.contains(':') {
        return false;
    }

    // Exclude specific action routes
    if path.ends_with("/create") ||
       path.ends_with("/edit") ||
       path.ends_with("/new") {
        return false;
    }

    // Exclude authentication routes
    if path.starts_with("/login") ||
       path.starts_with("/signup") ||
       path.starts_with("/forgot-password") ||
       path.starts_with("/reset-password") {
        return false;
    }

    // Exclude admin routes (handled separately in dashboard)
    if path.starts_with("/admin") {
        return false;
    }

    // Exclude utility routes
    if path.starts_with("/type-test") ||
       path.starts_with("/debug") {
        return false;
    }

    // Everything else is considered a list route
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_list_route() {
        assert!(is_list_route("/"));
        assert!(is_list_route("/templates"));
        assert!(is_list_route("/examples"));
        assert!(is_list_route("/products"));

        assert!(!is_list_route("/templates/:id"));
        assert!(!is_list_route("/templates/create"));
        assert!(!is_list_route("/templates/:id/edit"));
        assert!(!is_list_route("/login"));
        assert!(!is_list_route("/signup"));
        assert!(!is_list_route("/admin"));
        assert!(!is_list_route("/admin/models"));
        assert!(!is_list_route("/type-test"));
    }
}
