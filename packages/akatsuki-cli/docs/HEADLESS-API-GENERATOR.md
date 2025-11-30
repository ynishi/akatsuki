# HEADLESS API Generator - Architecture

## Overview

`akatsuki api new` コマンドは、YAML スキーマから以下を自動生成します：

- Migration (PostgreSQL DDL)
- Edge Function (Supabase)
- Model / Service / Hook (React Query)
- Admin Page / Demo Component
- CLI Client

## Architecture: DSL → AST → CodeGen

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          YAML Schema (DSL)                              │
│  material-schema.yaml                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ serde_yaml::from_str()
┌─────────────────────────────────────────────────────────────────────────┐
│                          EntitySchema (AST)                             │
│  schema.rs - Canonical representation                                   │
│  ├── name, table_name                                                   │
│  ├── fields: Vec<Field>                                                 │
│  ├── operations: Vec<Operation>                                         │
│  └── rls: Vec<RLSPolicy>                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ IntoContext trait
┌─────────────────────────────────────────────────────────────────────────┐
│                          Context (View Layer)                           │
│  generator_contexts.rs - Template-specific views                        │
│  ├── FieldContext, EnumFieldContext, UIFieldContext                    │
│  ├── OperationContext (via OperationContextBuilder)                    │
│  └── HookContext, ServiceContext, ModelContext, etc.                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ minijinja::render()
┌─────────────────────────────────────────────────────────────────────────┐
│                          Templates (CodeGen)                            │
│  templates/*.rs - minijinja templates                                   │
│  ├── HOOK_TEMPLATE, MODEL_TEMPLATE, SERVICE_TEMPLATE                   │
│  ├── MIGRATION_TEMPLATE, EDGE_FUNCTION_TEMPLATE                        │
│  └── ADMIN_PAGE_TEMPLATE, DEMO_COMPONENT_TEMPLATE                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ fs::write()
┌─────────────────────────────────────────────────────────────────────────┐
│                          Generated Files                                │
│  ├── supabase/migrations/*.sql                                         │
│  ├── supabase/functions/*-crud/                                        │
│  └── packages/app-frontend/src/{models,services,hooks,pages}/          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `schema.rs` | EntitySchema (AST) - YAML をパースした正規表現 |
| `generator_contexts.rs` | Context structs - テンプレート用の View |
| `generator.rs` | Main generator logic - ファイル生成フロー |
| `templates/*.rs` | minijinja templates - コード生成テンプレート |

## Core Concepts

### 1. IntoContext Trait

Schema 型から Context 型への型安全な変換を提供：

```rust
pub trait IntoContext<T> {
    fn into_context(&self) -> T;
}

// Field → FieldContext
impl IntoContext<FieldContext> for Field {
    fn into_context(&self) -> FieldContext {
        FieldContext {
            name: self.name.clone(),
            typescript_type: self.typescript_type(),
            // ...
        }
    }
}
```

**利点:**
- 変換ロジックの一元化（DRY）
- 型安全性の保証
- テスト容易性

### 2. OperationContextBuilder

Operation の Context 変換時に、オプションで enum フィールドとの重複を除外：

```rust
// Hook では重複フィルタが必要（TypeScript の型重複防止）
let operations = OperationContextBuilder::new(&schema)
    .exclude_enum_fields_from_filters()  // "type" などを filters から除外
    .build();

// Service では不要（バックエンドが処理）
let operations = OperationContextBuilder::new(&schema).build();
```

**背景:**
- Schema に `type: enum [video, image]` と `filters: [type]` がある場合
- Hook テンプレートで `type` が 2 回定義されるバグを防止

### 3. Type-Safe String Conversion

Debug 出力ではなく明示的な文字列変換：

```rust
// Before: ランタイムで format! (バグの温床)
op_type: format!("{:?}", op.op_type).to_lowercase()

// After: コンパイル時に保証
op_type: op.op_type.as_str().to_string()

impl OperationType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            OperationType::List => "list",
            OperationType::Custom => "custom",
            // ...
        }
    }
}
```

## Standard Fields (Auto-Generated)

Migration には以下のフィールドが自動追加されます：

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PRIMARY KEY | `gen_random_uuid()` |
| `user_id` | UUID REFERENCES auth.users | ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Trigger で自動更新 |

**実装場所:** `generator.rs` の `MigrationContext::from_schema()`

## Adding a New Context

新しい出力形式を追加する手順：

```rust
// 1. Context 構造体を定義
#[derive(Debug, Serialize)]
pub struct NewContext {
    pub name: String,
    pub fields: Vec<FieldContext>,
    pub operations: Vec<OperationContext>,
}

// 2. from_schema を実装（ヘルパー関数を活用）
impl NewContext {
    pub fn from_schema(schema: &EntitySchema) -> Self {
        Self {
            name: schema.name.clone(),
            fields: fields_to_context(&schema.writable_fields()),
            operations: OperationContextBuilder::new(schema)
                .exclude_enum_fields_from_filters()  // 必要な場合
                .build(),
        }
    }
}

// 3. テンプレートを作成 (templates/new_template.rs)
pub const NEW_TEMPLATE: &str = r##"
// Generated code for {{ name }}
{%- for field in fields %}
{{ field.name }}: {{ field.typescript_type }}
{%- endfor %}
"##;

// 4. generator.rs に追加
```

## Testing

```bash
# 全テスト実行
cargo test

# 特定モジュールのテスト
cargo test commands::api::schema
cargo test commands::api::generator_contexts
```

### Test Categories

| Category | File | Tests |
|----------|------|-------|
| Schema parsing | `schema.rs` | `test_operation_type_as_str`, `test_field_type_as_str` |
| Field conversion | `generator_contexts.rs` | `test_field_into_*_context` |
| Operation builder | `generator_contexts.rs` | `test_operation_context_builder_*` |
| Duplicate prevention | `generator_contexts.rs` | `test_hook_context_no_duplicate_type_in_filters` |

## Common Issues & Solutions

### Issue: Hook に重複した type 定義が生成される

**原因:** `enum_fields` と `operation.filters` の両方に `type` が存在

**解決:** `HookContext` は `OperationContextBuilder::exclude_enum_fields_from_filters()` を使用

### Issue: Migration に標準フィールドがない

**原因:** `MigrationContext::from_schema()` で自動追加が漏れている

**解決:** `generator.rs` の `MigrationContext` 実装を確認

---

**Last Updated:** 2025-11-30
**Version:** 1.0
