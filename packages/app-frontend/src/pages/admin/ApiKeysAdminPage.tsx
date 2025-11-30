/**
 * API Keys Admin Page
 * Manage API Keys for Public API Gateway
 *
 * Features:
 * - Create new API keys
 * - View key list with statistics
 * - Toggle active status (instant disable)
 * - Delete keys
 * - Copy API key (shown once at creation)
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Switch } from '../../components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { useApiKeys } from '../../hooks/useApiKeys'
import type { ApiKeyOperation } from '../../models/ApiKey'

const AVAILABLE_OPERATIONS: ApiKeyOperation[] = ['list', 'get', 'create', 'update', 'delete']

export function ApiKeysAdminPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [entityName, setEntityName] = useState('')
  const [tableName, setTableName] = useState('')
  const [allowedOps, setAllowedOps] = useState<ApiKeyOperation[]>(['list', 'get'])
  const [rateLimit, setRateLimit] = useState(60)

  const {
    apiKeys,
    isLoading,
    createApiKey,
    isCreating,
    toggleApiKeyActive,
    isToggling,
    deleteApiKey,
    isDeleting,
    totalKeys,
    activeKeys,
    totalRequests,
  } = useApiKeys()

  const resetForm = () => {
    setName('')
    setDescription('')
    setEntityName('')
    setTableName('')
    setAllowedOps(['list', 'get'])
    setRateLimit(60)
    setCreatedKey(null)
    setCopied(false)
  }

  const handleCreate = async () => {
    try {
      const result = await createApiKey({
        name,
        description: description || undefined,
        entityName,
        tableName: tableName || entityName.toLowerCase() + 's',
        allowedOperations: allowedOps,
        rateLimitPerMinute: rateLimit,
      })
      setCreatedKey(result.fullKey)
    } catch (error) {
      console.error('Failed to create API key:', error)
    }
  }

  const handleCopyKey = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
    resetForm()
  }

  const toggleOperation = (op: ApiKeyOperation) => {
    if (allowedOps.includes(op)) {
      setAllowedOps(allowedOps.filter((o) => o !== op))
    } else {
      setAllowedOps([...allowedOps, op])
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this API key? This cannot be undone.')) {
      await deleteApiKey(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-gray-500">Manage API keys for Public API Gateway</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Create API Key</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            {!createdKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Create an API key to allow external access to your HEADLESS API.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Mobile App Production"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this key used for?"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Entity Name *</label>
                      <Input
                        value={entityName}
                        onChange={(e) => setEntityName(e.target.value)}
                        placeholder="e.g., Article"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Table Name</label>
                      <Input
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        placeholder="e.g., articles"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Auto: {entityName ? entityName.toLowerCase() + 's' : '...'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Allowed Operations</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {AVAILABLE_OPERATIONS.map((op) => (
                        <Badge
                          key={op}
                          variant={allowedOps.includes(op) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleOperation(op)}
                        >
                          {op}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Rate Limit (per minute)</label>
                    <Select
                      value={String(rateLimit)}
                      onValueChange={(v) => setRateLimit(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 req/min</SelectItem>
                        <SelectItem value="30">30 req/min</SelectItem>
                        <SelectItem value="60">60 req/min</SelectItem>
                        <SelectItem value="120">120 req/min</SelectItem>
                        <SelectItem value="300">300 req/min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseCreate}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating || !name || !entityName}
                  >
                    {isCreating ? 'Creating...' : 'Create Key'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created!</DialogTitle>
                  <DialogDescription>
                    Copy your API key now. You won't be able to see it again.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm break-all">
                    {createdKey}
                  </div>
                  <Button
                    className="w-full mt-4"
                    variant={copied ? 'secondary' : 'default'}
                    onClick={handleCopyKey}
                  >
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </Button>
                  <p className="text-xs text-red-500 mt-2 text-center">
                    This key will only be shown once. Store it securely!
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseCreate}>Done</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Keys</CardDescription>
            <CardTitle className="text-3xl">{totalKeys}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Keys</CardDescription>
            <CardTitle className="text-3xl text-green-600">{activeKeys}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-3xl">{totalRequests.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage your API keys. Toggle the switch to instantly enable/disable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Loading...</p>
          ) : !apiKeys?.length ? (
            <p className="text-center py-8 text-gray-500">
              No API keys yet. Create one to get started!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Operations</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{key.name}</p>
                        {key.description && (
                          <p className="text-xs text-gray-400">{key.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {key.keyPrefix}
                      </code>
                    </TableCell>
                    <TableCell>{key.entityName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.allowedOperations.map((op) => (
                          <Badge key={op} variant="outline" className="text-xs">
                            {op}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{key.requestCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          key.getStatus() === 'active'
                            ? 'default'
                            : key.getStatus() === 'expired'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {key.getStatus()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={key.isActive}
                        onCheckedChange={() => toggleApiKeyActive(key.id!)}
                        disabled={isToggling}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(key.id!)}
                        disabled={isDeleting}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Guide</CardTitle>
          <CardDescription>
            How to use your API keys with the Public API Gateway
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
            <code>{`# List items
curl -X GET "https://your-project.supabase.co/functions/v1/api-gateway/{entity}/list" \\
  -H "X-API-Key: ak_xxxxxx_yyyyyyyyyyyyyyyy"

# Get single item
curl -X GET "https://your-project.supabase.co/functions/v1/api-gateway/{entity}/get?id={uuid}" \\
  -H "X-API-Key: ak_xxxxxx_yyyyyyyyyyyyyyyy"

# Create item
curl -X POST "https://your-project.supabase.co/functions/v1/api-gateway/{entity}/create" \\
  -H "X-API-Key: ak_xxxxxx_yyyyyyyyyyyyyyyy" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Hello", "content": "World"}'

# Update item
curl -X POST "https://your-project.supabase.co/functions/v1/api-gateway/{entity}/update" \\
  -H "X-API-Key: ak_xxxxxx_yyyyyyyyyyyyyyyy" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "{uuid}", "title": "Updated"}'

# Delete item
curl -X POST "https://your-project.supabase.co/functions/v1/api-gateway/{entity}/delete" \\
  -H "X-API-Key: ak_xxxxxx_yyyyyyyyyyyyyyyy" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "{uuid}"}'`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
