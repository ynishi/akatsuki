# Akatsuki CLI Tools

**PoC: HEADLESS API Generator**

CLI tools for interacting with Akatsuki Articles API using Supabase Authentication.

## 🎯 Features

- ✅ Supabase Auth integration (email/password login)
- ✅ Same API as Browser (Frontend) - articles-crud Edge Function
- ✅ Type-safe CRUD operations
- ✅ Interactive & automated modes
- ✅ Easy to extend for other entities

---

## 📦 Setup

### 1. Install Dependencies

```bash
cd packages/app-cli
npm install
```

### 2. Configure Environment Variables

Create `.env` file in the project root (or set environment variables):

```bash
# Required
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional (for non-interactive mode)
SUPABASE_USER_EMAIL=your-email@example.com
SUPABASE_USER_PASSWORD=your-password
```

---

## 🚀 Usage

### List Articles

```bash
# List all your articles
node packages/app-cli/examples/list-articles.js

# List only drafts
node packages/app-cli/examples/list-articles.js --status=draft

# List only published articles
node packages/app-cli/examples/list-articles.js --status=published

# Or use npm script
cd packages/app-cli && npm run list
```

### Create Article

```bash
# Create draft article
node packages/app-cli/examples/create-article.js "My Title" "My Content"

# Create and publish immediately
node packages/app-cli/examples/create-article.js "Hello World" "My first article" --publish

# Or use npm script
cd packages/app-cli && npm run create "Title" "Content"
```

### Publish Article

```bash
# Publish existing draft article
node packages/app-cli/examples/publish-article.js <article-id>

# Or use npm script
cd packages/app-cli && npm run publish <article-id>
```

---

## 📚 API Client Usage

### Basic Usage

```javascript
import { AkatsukiClient, ArticlesClient } from '../app-cli/client.js'

const client = new AkatsukiClient()
const articles = new ArticlesClient(client)

// Login
await client.login('email@example.com', 'password')
// Or interactive login
await client.loginInteractive()

// Get my articles
const myArticles = await articles.getMyArticles()

// Create article
const article = await articles.create({
  title: 'Hello World',
  content: 'My first article',
  status: 'draft',
  tags: ['tutorial', 'getting-started']
})

// Publish article
await articles.publish(article.id)

// Logout
await client.logout()
```

### Advanced Usage

```javascript
// Get published articles (public)
const published = await articles.getPublished(10)

// Get specific article
const article = await articles.getById('uuid')

// Update article
await articles.update('uuid', {
  title: 'Updated Title',
  content: 'Updated Content',
  status: 'published'
})

// Delete article
await articles.delete('uuid')
```

---

## 🏗️ Architecture

```
CLI Tool
  ↓
AkatsukiClient (client.js)
  ├─ SupabaseAuth (auth.js) - Login/Logout
  └─ Edge Function Invoker - Same as Frontend
       ↓
Supabase Edge Function (articles-crud)
  ├─ createAkatsukiHandler
  ├─ Zod Validation
  ├─ Repository (RLS enabled)
  └─ PostgreSQL (articles table)
```

**Same API as Browser!** 🎉

---

## 🔐 Authentication Flow

1. Login with email/password (Supabase Auth)
2. Receive JWT access token
3. Set `Authorization: Bearer <token>` header
4. Edge Function validates token via RLS
5. Repository operations use authenticated user context

---

## 📝 Example Output

### List Articles

```
📝 Articles List CLI
──────────────────────────────────────────────────
✅ Logged in as: user@example.com

📚 Fetching all articles...

✅ Found 3 article(s)

1. My First Article
   Status: published
   Created: 11/30/2025
   ID: 550e8400-e29b-41d4-a716-446655440000

2. Draft Post
   Status: draft
   Created: 11/30/2025
   ID: 6fa459ea-ee8a-4ca4-894e-db77e160355e
   Tags: wip, ideas

3. Tutorial: Getting Started
   Status: published
   Created: 11/29/2025
   ID: 7c9e6679-7425-40de-944b-e07fc1f90ae7

✅ Logged out
```

### Create Article

```
📝 Create Article CLI
──────────────────────────────────────────────────
✅ Logged in as: user@example.com

✍️  Creating article...
   Title: Hello CLI
   Content: This article was created from CLI tool!
   Status: draft

✅ Article created successfully!
   ID: f47ac10b-58cc-4372-a567-0e02b2c3d479
   Title: Hello CLI
   Status: draft
   Created: 11/30/2025, 3:45:00 PM

✅ Logged out
```

---

## 🎯 Use Cases

1. **Automation Scripts** - Bulk import/export articles
2. **CI/CD Integration** - Publish articles from Git commits
3. **Admin Tools** - Moderate articles from command line
4. **Data Migration** - Import from other platforms
5. **Backup/Restore** - Backup articles to JSON

---

## 🚀 Extending to Other Entities

Same pattern works for any entity with CRUD Edge Function:

```javascript
// users-crud, products-crud, etc.
export class UsersClient {
  constructor(akatsukiClient) {
    this.client = akatsukiClient
  }

  async getMyProfile() {
    return this.client.invoke('users-crud', {
      action: 'my'
    })
  }

  // ... other methods
}
```

---

## 🔧 Troubleshooting

### "Not authenticated" error
- Make sure you called `await client.login()` before API calls
- Check `.env` file has correct credentials
- Verify Supabase project is active

### "Validation failed" error
- Check request body matches Zod schema
- Ensure `action` field is included
- Verify field types match schema

### RLS Policy errors
- Ensure user is logged in
- Check RLS policies in Supabase Dashboard
- Verify user has permission to access/modify resource

---

## 📚 Related Files

- `packages/app-cli/auth.js` - Supabase authentication helper
- `packages/app-cli/client.js` - Akatsuki client & Articles client
- `packages/app-cli/examples/` - Example CLI scripts
- `supabase/functions/articles-crud/` - Edge Function implementation

---

**Created for HEADLESS API Generator PoC** 🎉
