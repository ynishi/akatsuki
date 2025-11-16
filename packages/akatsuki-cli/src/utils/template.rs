use chrono::Local;

const DESIGN_TEMPLATE: &str = include_str!("../../templates/design-template.md");

pub fn process_template(feature_name: &str) -> String {
    let title = crate::utils::to_title_case(feature_name);
    let today = Local::now().format("%Y-%m-%d").to_string();

    DESIGN_TEMPLATE
        .replace("[Feature Name]", &title)
        .replace("[Date]", &today)
}
