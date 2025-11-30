# CLI Clients

This directory contains auto-generated API client files.

## How to generate

Use the HEADLESS API Generator to create new clients:

```bash
akatsuki api new Article --schema article-schema-example.yaml
```

This will generate:
- `ArticlesClient.js` - Client wrapper for articles-crud Edge Function

## Usage

```javascript
import { AkatsukiClient } from '../client.js'
import { ArticlesClient } from './ArticlesClient.js'

const client = new AkatsukiClient()
await client.login(email, password)

const articlesClient = new ArticlesClient(client)
const articles = await articlesClient.list()
```

## Generated Files

Files in this directory are auto-generated. Do not edit manually.
Re-run the generator to update.
