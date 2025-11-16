# [Feature Name] - Design Document

---

## Pre-Discussion (User Dialogue Memo)

**User Requirements:**
- [Record user dialogue here]
- Example: "I want a colorful and fun vibe"
- Example: "3-column dashboard-style UI"
- Example: "Visualize ComfyUI workflows"

**Decisions:**
- Design: [Vibrant Soft UI / Business Dark / etc.]
- Layout: [1-pane / 2-pane / 3-pane]
- Number of Screens: [3-5 screens]

---

## 1. Real User Needs (WHY/WHO/WHAT)

**WHY (Why is it needed):**
- [Fill in here]

**WHO (Who is it for):**
- [Fill in here]

**WHAT (What to build):**
- [Fill in here]

---

## 2. Use Case Expansion

### Main Flow
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Sub Flow
- [Sub flow 1]
- [Sub flow 2]

### Edge Cases
- [Edge case 1]
- [Edge case 2]

---

## 3. Screen Design (UX-Focused)

### Routing
```
/ (HomePage)                  - [Purpose]
/feature (ListPage)           - [Purpose]
/feature/:id (DetailPage)     - [Purpose]
/feature/new (CreatePage)     - [Purpose]
```

### Color Theme

**💡 Feel free to customize!**

**Reference: AGENT.md L954-1000 Color Variations**

**Selected:**
- [ ] AI App (Pink/Purple/Blue)
- [ ] Business (Dark/Blue)
- [ ] Healthcare (Green/Mint)
- [ ] Entertainment (Orange/Yellow)
- [ ] E-commerce (Purple/Pink)
- [ ] Custom: [Fill in here]

**Reason:**
[Fill in here]

### Layout Pattern

**💡 Feel free to customize!**

**Options:**
- [ ] 1-pane full width
- [ ] 2-pane (left-right split)
- [ ] 3-pane (left-center-right)
- [ ] Tab switching
- [ ] Custom: [Fill in here]

**Screen Design:**

#### [Page Name]
- **Purpose**: [Fill in here]
- **Layout**: [1-pane / 2-pane / etc.]
- **Elements**: [Fill in here]

### ASCII WireFrame

**💡 Draw freely! Keep it simple!**

```
┌─────────────────────────────────────┐
│ TopNavigation                        │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [Draw screen layout here]            │
│                                      │
│                                      │
└─────────────────────────────────────┘
```

---

## 4. Database Design

### Table Definitions (SQL)

**💡 Reuse existing tables as much as possible!**

**Reference:**
- profiles (User profiles)
- file_metadata (File management)
- ai_models (AI model info)

**New Tables Needed:**

```sql
-- [Table Name]
CREATE TABLE [table_name] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- [Add column definitions here]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_[table_name]_[column] ON [table_name]([column]);
```

### RLS Policy Design

**💡 Security first!**

```sql
-- Enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- Policy example
CREATE POLICY "Users can read own data"
  ON [table_name] FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON [table_name] FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON [table_name] FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON [table_name] FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 5. Using Akatsuki Features

### Existing Features (Reuse)

**💡 Avoid reinventing the wheel! Reference ExamplePage/AdminPage**

**Available Components:**
- ✅ `AuthGuard`, `Layout`, `PrivateLayout`
- ✅ `FileUpload`
- ✅ `usePublicProfile`
- ✅ `AIService`, `ImageGenerationService`
- ✅ shadcn/ui components (44 components)
- ✅ [Other]

**Available Edge Functions:**
- ✅ `ai-chat` - Multi-provider LLM API
- ✅ `generate-image` - Image generation
- ✅ `upload-file` / `delete-file` - File management
- ✅ `get-signed-url` / `create-signed-url` - Private storage
- ✅ [Other]

### New Features Needed

- 📝 [New feature 1]
- 📝 [New feature 2]

---

## 6. Architecture Layers

**💡 Always implement in this order!**

### Models
- `[ModelName].ts` - [Description]

```typescript
export interface [ModelName]Data {
  id?: string | null
  // [Add fields here]
}

export interface [ModelName]DatabaseRecord {
  id: string
  // [Add snake_case fields here]
}

export class [ModelName] {
  // [Add fields here]

  static fromDatabase(data: [ModelName]DatabaseRecord): [ModelName] {
    // Convert snake_case to camelCase
  }

  toDatabase() {
    // Convert camelCase to snake_case
  }
}
```

### Repositories
- `[RepositoryName].ts` - [Description]

```typescript
export class [RepositoryName] {
  static async findById(id: string): Promise<[Model]DatabaseRecord | null> {
    // Implementation
  }

  static async findAll(): Promise<[Model]DatabaseRecord[]> {
    // Implementation
  }

  static async create(data: Partial<[Model]DatabaseRecord>): Promise<[Model]DatabaseRecord> {
    // Implementation
  }

  static async update(id: string, updates: Partial<[Model]DatabaseRecord>): Promise<[Model]DatabaseRecord> {
    // Implementation
  }

  static async delete(id: string): Promise<void> {
    // Implementation
  }
}
```

### Services
- `[ServiceName].ts` - [Description]

```typescript
export class [ServiceName] {
  static async someOperation(params: any): Promise<{ data: any; error: Error | null }> {
    // Always return { data, error } format
  }
}
```

### Hooks
- `use[HookName].ts` - [Description]

```typescript
export function use[HookName]() {
  const query = useQuery({
    queryKey: ['key'],
    queryFn: async () => {
      // Implementation
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
```

### Components
- `[ComponentName].tsx` - [Description]

### Pages
- `[PageName].tsx` - [Description]

---

## 7. Implementation Steps

**💡 Phase management is internal, no need for intermediate user reports**

### Phase 1: DB Design & Migration
- [ ] Create migration
- [ ] Apply migration

### Phase 2: Model/Repository Layer
- [ ] Implement Models
- [ ] Implement Repositories

### Phase 3: Service Layer
- [ ] Implement Services

### Phase 4: Hook Layer
- [ ] Implement Custom Hooks

### Phase 5: Component Layer
- [ ] Implement Components

### Phase 6: Page Layer
- [ ] Implement Pages

### Phase 7: Routing Setup
- [ ] Add routes to App.jsx

### Phase 8: Testing
- [ ] Generate dummy data in workspace/
- [ ] Verify screens

---

## 8. Important Design Decisions

**💡 Record "why this design"**

### [Decision 1]
- **Choice**: [Fill in here]
- **Reason**: [Fill in here]
- **Alternatives**: [Fill in here]

### Security Considerations
- [Fill in here]

### Performance Considerations
- [Fill in here]

---

## 9. Reference Materials

### Akatsuki Documentation
- AGENT.md - Main development guide
- ExamplePage (`src/pages/ExamplesPage.jsx`) - All feature demos
- AdminDashboard (`src/pages/AdminDashboard.jsx`) - Dashboard patterns

### Existing Implementations (Reference First!)
- `src/models/UserProfile.ts` - Model layer pattern
- `src/repositories/UserProfileRepository.ts` - Repository layer pattern
- `src/hooks/usePublicProfile.ts` - React Query integration pattern

---

**Created:** [Date]
**Last Updated:** [Date]
**Status:** Draft / In Progress / Completed
