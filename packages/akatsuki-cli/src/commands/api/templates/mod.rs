/**
 * Template Engine for Code Generation
 * Using minijinja (Jinja2-compatible)
 */

use anyhow::Result;
use minijinja::Environment;
use serde::Serialize;

pub mod migration;

pub struct TemplateEngine {
    env: Environment<'static>,
}

impl TemplateEngine {
    pub fn new() -> Result<Self> {
        let mut env = Environment::new();

        // Register templates
        env.add_template("migration", migration::MIGRATION_TEMPLATE)?;

        // Register custom filters
        env.add_filter("snake_case", filters::snake_case);
        env.add_filter("camel_case", filters::camel_case);
        env.add_filter("pascal_case", filters::pascal_case);
        env.add_filter("kebab_case", filters::kebab_case);

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
