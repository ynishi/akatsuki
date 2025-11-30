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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FieldType {
    String,
    Number,
    Integer,
    Boolean,
    Uuid,
    Timestamp,
    Enum,
    Array,
    Json,
}

impl FieldType {
    /// Type-safe string conversion for template rendering
    pub const fn as_str(&self) -> &'static str {
        match self {
            FieldType::String => "string",
            FieldType::Number => "number",
            FieldType::Integer => "integer",
            FieldType::Boolean => "boolean",
            FieldType::Uuid => "uuid",
            FieldType::Timestamp => "timestamp",
            FieldType::Enum => "enum",
            FieldType::Array => "array",
            FieldType::Json => "json",
        }
    }
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OperationType {
    List,
    Get,
    Create,
    Update,
    Delete,
    Custom,
}

impl OperationType {
    /// Type-safe string conversion for template rendering
    pub const fn as_str(&self) -> &'static str {
        match self {
            OperationType::List => "list",
            OperationType::Get => "get",
            OperationType::Create => "create",
            OperationType::Update => "update",
            OperationType::Delete => "delete",
            OperationType::Custom => "custom",
        }
    }
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
        anyhow::bail!("Database Types parsing not implemented yet. Please use --schema <file>")
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
                !f.primary_key
                    && f.name != "userId"
                    && f.name != "createdAt"
                    && f.name != "updatedAt"
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
            FieldType::Number => "NUMERIC".to_string(),
            FieldType::Integer => "INTEGER".to_string(),
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
            FieldType::Integer => "number".to_string(),
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
            FieldType::Integer => "0".to_string(),
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
            FieldType::Integer => "z.number().int()".to_string(),
            FieldType::Boolean => "z.boolean()".to_string(),
            FieldType::Uuid => "z.string().uuid()".to_string(),
            FieldType::Timestamp => "z.string()".to_string(),
            FieldType::Enum => {
                if let Some(ref values) = self.enum_values {
                    format!(
                        "z.enum([{}])",
                        values
                            .iter()
                            .map(|v| format!("'{}'", v))
                            .collect::<Vec<_>>()
                            .join(", ")
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

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // -------------------------------------------------------------------------
    // OperationType tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_operation_type_as_str() {
        assert_eq!(OperationType::List.as_str(), "list");
        assert_eq!(OperationType::Get.as_str(), "get");
        assert_eq!(OperationType::Create.as_str(), "create");
        assert_eq!(OperationType::Update.as_str(), "update");
        assert_eq!(OperationType::Delete.as_str(), "delete");
        assert_eq!(OperationType::Custom.as_str(), "custom");
    }

    #[test]
    fn test_operation_type_equality() {
        assert_eq!(OperationType::List, OperationType::List);
        assert_ne!(OperationType::List, OperationType::Get);
    }

    // -------------------------------------------------------------------------
    // FieldType tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_field_type_as_str() {
        assert_eq!(FieldType::String.as_str(), "string");
        assert_eq!(FieldType::Number.as_str(), "number");
        assert_eq!(FieldType::Boolean.as_str(), "boolean");
        assert_eq!(FieldType::Uuid.as_str(), "uuid");
        assert_eq!(FieldType::Timestamp.as_str(), "timestamp");
        assert_eq!(FieldType::Enum.as_str(), "enum");
        assert_eq!(FieldType::Array.as_str(), "array");
        assert_eq!(FieldType::Json.as_str(), "json");
    }

    // -------------------------------------------------------------------------
    // EntitySchema helper tests
    // -------------------------------------------------------------------------

    fn create_test_schema() -> EntitySchema {
        EntitySchema {
            name: "Material".to_string(),
            table_name: "materials".to_string(),
            fields: vec![
                Field {
                    name: "id".to_string(),
                    db_name: "id".to_string(),
                    field_type: FieldType::Uuid,
                    required: true,
                    primary_key: true,
                    ..Default::default()
                },
                Field {
                    name: "title".to_string(),
                    db_name: "title".to_string(),
                    field_type: FieldType::String,
                    required: true,
                    ..Default::default()
                },
                Field {
                    name: "type".to_string(),
                    db_name: "type".to_string(),
                    field_type: FieldType::Enum,
                    required: true,
                    enum_values: Some(vec!["video".to_string(), "image".to_string()]),
                    index: true,
                    ..Default::default()
                },
                Field {
                    name: "createdAt".to_string(),
                    db_name: "created_at".to_string(),
                    field_type: FieldType::Timestamp,
                    required: false,
                    ..Default::default()
                },
            ],
            operations: vec![
                Operation {
                    op_type: OperationType::List,
                    name: None,
                    description: None,
                    filters: vec!["type".to_string()],
                    limit: None,
                },
                Operation {
                    op_type: OperationType::Custom,
                    name: Some("my".to_string()),
                    description: None,
                    filters: vec!["type".to_string()],
                    limit: None,
                },
            ],
            rls: vec![],
            documentation: None,
        }
    }

    #[test]
    fn test_enum_fields() {
        let schema = create_test_schema();
        let enum_fields = schema.enum_fields();

        assert_eq!(enum_fields.len(), 1);
        assert_eq!(enum_fields[0].name, "type");
    }

    #[test]
    fn test_writable_fields_excludes_auto_generated() {
        let schema = create_test_schema();
        let writable = schema.writable_fields();

        // Should exclude id (primary_key) and createdAt
        let names: Vec<&str> = writable.iter().map(|f| f.name.as_str()).collect();
        assert!(names.contains(&"title"));
        assert!(names.contains(&"type"));
        assert!(!names.contains(&"id"));
        assert!(!names.contains(&"createdAt"));
    }

    #[test]
    fn test_indexed_fields() {
        let schema = create_test_schema();
        let indexed = schema.indexed_fields();

        assert_eq!(indexed.len(), 1);
        assert_eq!(indexed[0].name, "type");
    }

    // -------------------------------------------------------------------------
    // Field type conversion tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_field_sql_type() {
        let field = Field {
            name: "test".to_string(),
            db_name: "test".to_string(),
            field_type: FieldType::String,
            required: true,
            ..Default::default()
        };
        assert_eq!(field.sql_type(), "TEXT");

        let array_field = Field {
            name: "tags".to_string(),
            db_name: "tags".to_string(),
            field_type: FieldType::Array,
            array_type: Some("string".to_string()),
            required: false,
            ..Default::default()
        };
        assert_eq!(array_field.sql_type(), "TEXT[]");
    }

    #[test]
    fn test_field_typescript_type_enum() {
        let field = Field {
            name: "status".to_string(),
            db_name: "status".to_string(),
            field_type: FieldType::Enum,
            enum_values: Some(vec!["draft".to_string(), "published".to_string()]),
            required: true,
            ..Default::default()
        };
        assert_eq!(field.typescript_type(), "'draft' | 'published'");
    }

    #[test]
    fn test_field_zod_type_with_validation() {
        let field = Field {
            name: "title".to_string(),
            db_name: "title".to_string(),
            field_type: FieldType::String,
            required: true,
            validation: Some(Validation {
                min_length: Some(1),
                max_length: Some(100),
                ..Default::default()
            }),
            ..Default::default()
        };
        assert_eq!(field.zod_type(), "z.string().min(1).max(100)");
    }
}

// Default implementation for Field (used in tests)
impl Default for Field {
    fn default() -> Self {
        Self {
            name: String::new(),
            db_name: String::new(),
            field_type: FieldType::String,
            required: false,
            default: None,
            primary_key: false,
            references: None,
            on_delete: None,
            index: false,
            index_type: None,
            unique: false,
            enum_values: None,
            array_type: None,
            validation: None,
            auto_update: false,
        }
    }
}

impl Default for Validation {
    fn default() -> Self {
        Self {
            min_length: None,
            max_length: None,
            min: None,
            max: None,
            email: false,
            url: false,
            pattern: None,
        }
    }
}
