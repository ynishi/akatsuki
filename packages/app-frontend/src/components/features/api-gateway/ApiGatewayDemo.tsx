/**
 * API Gateway Demo Card
 * Shows Public API Gateway capabilities
 *
 * Features:
 * - API Key management link
 * - Usage example with curl
 * - Architecture overview
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'

export function ApiGatewayDemo() {
  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🔐</span>
          Public API Gateway
        </CardTitle>
        <CardDescription>
          API Key認証で外部からHEADLESS APIにアクセス
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Architecture */}
        <div className="bg-white p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">アーキテクチャ</h3>
          <pre className="text-xs font-mono text-gray-600 overflow-x-auto">
{`External Client
    │ X-API-Key: ak_xxxxxx_...
    ▼
┌─────────────────────────────┐
│  api-gateway (Edge Func)    │
│  • API Key検証              │
│  • Rate Limit              │
│  • Permission Check        │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  {entity}-crud (Edge Func)  │
│  • CRUD操作実行             │
└─────────────────────────────┘`}
          </pre>
        </div>

        {/* Code Example */}
        <div className="bg-white p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">使用例</h3>
          <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
            <code>{`# List items
curl -X GET ".../api-gateway/articles/list" \\
  -H "X-API-Key: ak_xxxxxx_..."

# Create item
curl -X POST ".../api-gateway/articles/create" \\
  -H "X-API-Key: ak_xxxxxx_..." \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Hello", "content": "World"}'`}</code>
          </pre>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">API Key認証</Badge>
          <Badge variant="outline">Rate Limiting</Badge>
          <Badge variant="outline">即時停止</Badge>
          <Badge variant="outline">使用統計</Badge>
          <Badge variant="outline">権限管理</Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link to="/admin/api-keys">
            <Button>
              🔑 API Keys管理
            </Button>
          </Link>
        </div>

        {/* Info */}
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">🎯 機能:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>✅ API Key発行・管理（Admin画面）</li>
            <li>✅ SHA-256ハッシュ認証</li>
            <li>✅ 分単位Rate Limiting</li>
            <li>✅ 操作権限設定（list/get/create/update/delete）</li>
            <li>✅ 使用統計・最終使用日時</li>
            <li>✅ 即時停止（isActive toggle）</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
