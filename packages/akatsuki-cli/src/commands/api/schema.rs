/**
 * Entity Schema Definition
 * HEADLESS API Generator
 *
 * YAMLからパースして、Code生成に使用する型定義
 */

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySchema {
    /// Entity name (PascalCase, e.g., "Article", "User")
    pub name: String,

    /// Database table name (snake_case, e.g., "articles", "users")
    #[serde(rename = "tableName")]
    pub table_name: String,

    /// Field definitions
    pub fields: Vec<Field>,

    /// CRUD operations
    pub operations: Vec<Operation>,

    /// RLS policies
    pub rls: Vec<RLSPolicy>,

    /// Optional documentation
    #[serde(default)]
    pub documentation: Option<Documentation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Field {
    /// Field name in code (camelCase)
    pub name: String,

    /// Database column name (snake_case)
    #[serde(rename = "dbName")]
    pub db_name: String,

    /// Field type
    #[serde(rename = "type")]
    pub field_type: FieldType,

    /// Is required?
    #[serde(default)]
    pub required: bool,

    /// Default value (SQL expression)
    #[serde(default)]
    pub default: Option<String>,

    /// Primary key?
    #[serde(default, rename = "primaryKey")]
    pub primary_key: bool,

    /// Foreign key reference (e.g., "auth.users(id)")
    #[serde(default)]
    pub references: Option<String>,

    /// ON DELETE action
    #[serde(default, rename = "onDelete")]
    pub on_delete: Option<String>,

    /// Create index?
    #[serde(default)]
    pub index: bool,

    /// Index type (btree, gin, gist)
    #[serde(default, rename = "indexType")]
    pub index_type: Option<String>,

    /// Unique constraint?
    #[serde(default)]
    pub unique: bool,

    /// Enum values (for enum type)
    #[serde(default, rename = "enumValues")]
    pub enum_values: Option<Vec<String>>,

    /// Array element type (for array type)
    #[serde(default, rename = "arrayType")]
    pub array_type: Option<String>,

    /// Validation rules
    #[serde(default)]
    pub validation: Option<Validation>,

    /// Auto-update on UPDATE? (for timestamp fields)
    #[serde(default, rename = "autoUpdate")]
    pub auto_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FieldType {
    String,
    Number,
    Boolean,
    Uuid,
    Timestamp,
    Enum,
    Array,
    Json,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Validation {
    #[serde(default, rename = "minLength")]
    pub min_length: Option<usize>,

    #[serde(default, rename = "maxLength")]
    pub max_length: Option<usize>,

    #[serde(default)]
    pub min: Option<f64>,

    #[serde(default)]
    pub max: Option<f64>,

    #[serde(default)]
    pub email: bool,

    #[serde(default)]
    pub url: bool,

    #[serde(default)]
    pub pattern: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    #[serde(rename = "type")]
    pub op_type: OperationType,

    /// Custom operation name (for custom type)
    #[serde(default)]
    pub name: Option<String>,

    /// Description
    #[serde(default)]
    pub description: Option<String>,

    /// Available filters
    #[serde(default)]
    pub filters: Vec<String>,

    /// Max limit
    #[serde(default)]
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OperationType {
    List,
    Get,
    Create,
    Update,
    Delete,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RLSPolicy {
    /// SQL action (SELECT, INSERT, UPDATE, DELETE)
    pub action: String,

    /// Policy name
    pub name: String,

    /// USING clause
    #[serde(default)]
    pub using: Option<String>,

    /// WITH CHECK clause
    #[serde(default, rename = "withCheck")]
    pub with_check: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Documentation {
    #[serde(default)]
    pub description: Option<String>,

    #[serde(default)]
    pub examples: Vec<Example>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Example {
    pub title: String,
    pub code: String,
}

impl EntitySchema {
    /// Parse from YAML file
    pub fn from_yaml(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let schema: EntitySchema = serde_yaml::from_str(&content)?;
        Ok(schema)
    }

    /// Interactive mode (CLI prompts)
    pub fn from_interactive(entity_name: &str) -> Result<Self> {
        // TODO: Implement interactive schema builder
        anyhow::bail!("Interactive mode not implemented yet. Please use --schema <file>")
    }

    /// Parse from Database Types (Supabase)
    pub fn from_database_types(entity_name: &str) -> Result<Self> {
        // TODO: Parse supabase/functions/_shared/database.types.ts
        anyhow::bail!(
            "Database Types parsing not implemented yet. Please use --schema <file>"
        )
    }

    /// Get field by name
    pub fn get_field(&self, name: &str) -> Option<&Field> {
        self.fields.iter().find(|f| f.name == name)
    }

    /// Get writable fields (exclude auto-generated)
    pub fn writable_fields(&self) -> Vec<&Field> {
        self.fields
            .iter()
            .filter(|f| !f.primary_key && f.name != "createdAt" && f.name != "updatedAt")
            .collect()
    }

    /// Get updatable fields (exclude primary key, userId, createdAt)
    pub fn updatable_fields(&self) -> Vec<&Field> {
        self.fields
            .iter()
            .filter(|f| {
                !f.primary_key && f.name != "userId" && f.name != "createdAt" && f.name != "updatedAt"
            })
            .collect()
    }

    /// Get indexed fields
    pub fn indexed_fields(&self) -> Vec<&Field> {
        self.fields.iter().filter(|f| f.index).collect()
    }

    /// Get enum fields
    pub fn enum_fields(&self) -> Vec<&Field> {
        self.fields
            .iter()
            .filter(|f| matches!(f.field_type, FieldType::Enum))
            .collect()
    }
}

impl Field {
    /// Get SQL type
    pub fn sql_type(&self) -> String {
        match self.field_type {
            FieldType::String => "TEXT".to_string(),
            FieldType::Number => "INTEGER".to_string(),
            FieldType::Boolean => "BOOLEAN".to_string(),
            FieldType::Uuid => "UUID".to_string(),
            FieldType::Timestamp => "TIMESTAMPTZ".to_string(),
            FieldType::Enum => "TEXT".to_string(),
            FieldType::Array => {
                if let Some(ref array_type) = self.array_type {
                    format!("{}[]", self.array_element_sql_type(array_type))
                } else {
                    "TEXT[]".to_string()
                }
            }
            FieldType::Json => "JSONB".to_string(),
        }
    }

    fn array_element_sql_type(&self, element_type: &str) -> &str {
        match element_type {
            "string" => "TEXT",
            "number" => "INTEGER",
            "boolean" => "BOOLEAN",
            "uuid" => "UUID",
            _ => "TEXT",
        }
    }

    /// Get TypeScript type
    pub fn typescript_type(&self) -> String {
        match self.field_type {
            FieldType::String => "string".to_string(),
            FieldType::Number => "number".to_string(),
            FieldType::Boolean => "boolean".to_string(),
            FieldType::Uuid => "string".to_string(),
            FieldType::Timestamp => "string".to_string(),
            FieldType::Enum => {
                if let Some(ref values) = self.enum_values {
                    format!("'{}'", values.join("' | '"))
                } else {
                    "string".to_string()
                }
            }
            FieldType::Array => {
                if let Some(ref array_type) = self.array_type {
                    format!("{}[]", self.typescript_element_type(array_type))
                } else {
                    "string[]".to_string()
                }
            }
            FieldType::Json => "Record<string, any>".to_string(),
        }
    }

    fn typescript_element_type(&self, element_type: &str) -> &str {
        match element_type {
            "string" => "string",
            "number" => "number",
            "boolean" => "boolean",
            "uuid" => "string",
            _ => "any",
        }
    }

    /// Get TypeScript default value
    pub fn typescript_default(&self) -> String {
        // For optional fields (nullable), default to null
        if !self.required {
            return "null".to_string();
        }

        match self.field_type {
            FieldType::String => "''".to_string(),
            FieldType::Number => "0".to_string(),
            FieldType::Boolean => "false".to_string(),
            FieldType::Array => "[]".to_string(),
            FieldType::Json => "{}".to_string(),
            FieldType::Enum => {
                if let Some(ref values) = self.enum_values {
                    format!("'{}'", values.first().unwrap_or(&"".to_string()))
                } else {
                    "''".to_string()
                }
            }
            _ => "null".to_string(),
        }
    }

    /// Get Zod type
    pub fn zod_type(&self) -> String {
        match self.field_type {
            FieldType::String => {
                let mut zod = "z.string()".to_string();
                if let Some(ref validation) = self.validation {
                    if let Some(min) = validation.min_length {
                        zod.push_str(&format!(".min({})", min));
                    }
                    if let Some(max) = validation.max_length {
                        zod.push_str(&format!(".max({})", max));
                    }
                    if validation.email {
                        zod.push_str(".email()");
                    }
                    if validation.url {
                        zod.push_str(".url()");
                    }
                }
                zod
            }
            FieldType::Number => "z.number()".to_string(),
            FieldType::Boolean => "z.boolean()".to_string(),
            FieldType::Uuid => "z.string().uuid()".to_string(),
            FieldType::Timestamp => "z.string()".to_string(),
            FieldType::Enum => {
                if let Some(ref values) = self.enum_values {
                    format!(
                        "z.enum([{}])",
                        values.iter().map(|v| format!("'{}'", v)).collect::<Vec<_>>().join(", ")
                    )
                } else {
                    "z.string()".to_string()
                }
            }
            FieldType::Array => {
                if let Some(ref array_type) = self.array_type {
                    format!("z.array({})", self.zod_element_type(array_type))
                } else {
                    "z.array(z.string())".to_string()
                }
            }
            FieldType::Json => "z.record(z.any())".to_string(),
        }
    }

    fn zod_element_type(&self, element_type: &str) -> String {
        match element_type {
            "string" => "z.string()".to_string(),
            "number" => "z.number()".to_string(),
            "boolean" => "z.boolean()".to_string(),
            "uuid" => "z.string().uuid()".to_string(),
            _ => "z.any()".to_string(),
        }
    }
}
