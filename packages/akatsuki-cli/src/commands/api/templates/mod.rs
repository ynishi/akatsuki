/**
 * Template Engine for Code Generation
 * Using minijinja (Jinja2-compatible)
 */

use anyhow::Result;
use minijinja::Environment;
use serde::Serialize;

pub mod admin_page;
pub mod cli_client;
pub mod demo_component;
pub mod edge_function;
pub mod hook;
pub mod migration;
pub mod model;
pub mod repository_edge;
pub mod service;
pub mod zod_schema;

pub struct TemplateEngine {
    env: Environment<'static>,
}

impl TemplateEngine {
    pub fn new() -> Result<Self> {
        let mut env = Environment::new();

        // Register templates - Backend
        env.add_template("migration", migration::MIGRATION_TEMPLATE)?;
        env.add_template("zod_schema", zod_schema::ZOD_SCHEMA_TEMPLATE)?;
        env.add_template("repository_edge", repository_edge::REPOSITORY_EDGE_TEMPLATE)?;
        env.add_template("edge_function", edge_function::EDGE_FUNCTION_TEMPLATE)?;

        // Register templates - Frontend
        env.add_template("model", model::MODEL_TEMPLATE)?;
        env.add_template("service", service::SERVICE_TEMPLATE)?;
        env.add_template("hook", hook::HOOK_TEMPLATE)?;

        // Register templates - CLI
        env.add_template("cli_client", cli_client::CLI_CLIENT_TEMPLATE)?;

        // Register templates - UI Components
        env.add_template("admin_page", admin_page::ADMIN_PAGE_TEMPLATE)?;
        env.add_template("demo_component", demo_component::DEMO_COMPONENT_TEMPLATE)?;

        // Register custom filters
        env.add_filter("snake_case", filters::snake_case);
        env.add_filter("camel_case", filters::camel_case);
        env.add_filter("pascal_case", filters::pascal_case);
        env.add_filter("kebab_case", filters::kebab_case);
        env.add_filter("singular", filters::singular);
        env.add_filter("upper", filters::upper);
        env.add_filter("lower", filters::lower);

        Ok(Self { env })
    }

    pub fn render<T: Serialize>(&self, template_name: &str, context: &T) -> Result<String> {
        let template = self.env.get_template(template_name)?;
        let output = template.render(context)?;
        Ok(output)
    }
}

/// Custom filters for template engine
mod filters {
    use minijinja::Value;

    pub fn snake_case(value: Value) -> Result<Value, minijinja::Error> {
        let s = value.as_str().ok_or_else(|| {
            minijinja::Error::new(
                minijinja::ErrorKind::InvalidOperation,
                "snake_case filter requires string",
            )
        })?;

        // PascalCase/camelCase → snake_case
        let result = s
            .chars()
            .enumerate()
            .flat_map(|(i, c)| {
                if c.is_uppercase() && i > 0 {
                    vec!['_', c.to_lowercase().next().unwrap()]
                } else {
                    vec![c.to_lowercase().next().unwrap()]
                }
            })
            .collect::<String>();

        Ok(Value::from(result))
    }

    pub fn camel_case(value: Value) -> Result<Value, minijinja::Error> {
        let s = value.as_str().ok_or_else(|| {
            minijinja::Error::new(
                minijinja::ErrorKind::InvalidOperation,
                "camel_case filter requires string",
            )
        })?;

        // snake_case → camelCase
        let mut result = String::new();
        let mut capitalize_next = false;

        for c in s.chars() {
            if c == '_' {
                capitalize_next = true;
            } else if capitalize_next {
                result.push(c.to_uppercase().next().unwrap());
                capitalize_next = false;
            } else {
                result.push(c);
            }
        }

        Ok(Value::from(result))
    }

    pub fn pascal_case(value: Value) -> Result<Value, minijinja::Error> {
        let camel = camel_case(value)?;
        let s = camel.as_str().unwrap();
        let mut chars = s.chars();
        let result = match chars.next() {
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            None => String::new(),
        };
        Ok(Value::from(result))
    }

    pub fn kebab_case(value: Value) -> Result<Value, minijinja::Error> {
        let snake = snake_case(value)?;
        let result = snake.as_str().unwrap().replace('_', "-");
        Ok(Value::from(result))
    }

    pub fn singular(value: Value) -> Result<Value, minijinja::Error> {
        let s = value.as_str().ok_or_else(|| {
            minijinja::Error::new(
                minijinja::ErrorKind::InvalidOperation,
                "singular filter requires string",
            )
        })?;

        // Simple pluralization rules (English)
        let result = if s.ends_with("ies") {
            s[..s.len() - 3].to_string() + "y"
        } else if s.ends_with("ses") || s.ends_with("zes") || s.ends_with("xes") {
            s[..s.len() - 2].to_string()
        } else if s.ends_with('s') {
            s[..s.len() - 1].to_string()
        } else {
            s.to_string()
        };

        Ok(Value::from(result))
    }

    pub fn upper(value: Value) -> Result<Value, minijinja::Error> {
        let s = value.as_str().ok_or_else(|| {
            minijinja::Error::new(
                minijinja::ErrorKind::InvalidOperation,
                "upper filter requires string",
            )
        })?;

        Ok(Value::from(s.to_uppercase()))
    }

    pub fn lower(value: Value) -> Result<Value, minijinja::Error> {
        let s = value.as_str().ok_or_else(|| {
            minijinja::Error::new(
                minijinja::ErrorKind::InvalidOperation,
                "lower filter requires string",
            )
        })?;

        Ok(Value::from(s.to_lowercase()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_snake_case() {
        use minijinja::Value;
        assert_eq!(
            filters::snake_case(Value::from("ArticleName")).unwrap(),
            Value::from("article_name")
        );
        assert_eq!(
            filters::snake_case(Value::from("userId")).unwrap(),
            Value::from("user_id")
        );
    }

    #[test]
    fn test_camel_case() {
        use minijinja::Value;
        assert_eq!(
            filters::camel_case(Value::from("user_id")).unwrap(),
            Value::from("userId")
        );
    }

    #[test]
    fn test_pascal_case() {
        use minijinja::Value;
        assert_eq!(
            filters::pascal_case(Value::from("user_profile")).unwrap(),
            Value::from("UserProfile")
        );
    }
}
