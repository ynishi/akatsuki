import { useState } from 'react'
import { WasmModule } from '@/models/WasmModule'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { useWasmModule } from '@/hooks/useWasmModule'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'

interface WasmModuleListProps {
  modules: WasmModule[]
  isLoading: boolean
  onRefresh: () => void
}

export function WasmModuleList({ modules, isLoading, onRefresh }: WasmModuleListProps) {
  const { user } = useAuth()
  const {
    deleteModule,
    isDeleting,
    executeOnEdge,
    isExecutingOnEdge,
    executeOnEdgeResult,
    executeOnEdgeError,
  } = useWasmModule()

  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<WasmModule | null>(null)
  const [testFunctionName, setTestFunctionName] = useState('process')
  const [testArgs, setTestArgs] = useState('[]')

  const handleDelete = async (module: WasmModule) => {
    if (!module.id) return

    const confirmed = confirm(
      `Delete "${module.moduleName}" v${module.version}?\nThis action cannot be undone.`
    )
    if (!confirmed) return

    deleteModule(module.id, {
      onSuccess: () => {
        alert('Module deleted successfully')
        onRefresh()
      },
      onError: (error) => {
        alert(`Delete failed: ${error.message}`)
      },
    })
  }

  const handleTest = (module: WasmModule) => {
    setSelectedModule(module)
    setTestDialogOpen(true)
  }

  const handleExecuteTest = () => {
    if (!selectedModule?.id) return

    try {
      const args = JSON.parse(testArgs)
      if (!Array.isArray(args)) {
        alert('Arguments must be a JSON array')
        return
      }

      executeOnEdge(
        {
          moduleId: selectedModule.id,
          functionName: testFunctionName,
          args,
          timeoutMs: 5000,
        },
        {
          onSuccess: (result) => {
            console.log('Execution result:', result)
          },
          onError: (error) => {
            console.error('Execution error:', error)
          },
        }
      )
    } catch (error) {
      alert('Invalid JSON in arguments')
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading modules...
      </div>
    )
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No modules found
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {modules.map((module) => (
          <Card key={module.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">
                    {module.moduleName}
                  </span>
                  <Badge variant="outline">v{module.version}</Badge>
                  <Badge
                    variant={
                      module.ownerType === 'system'
                        ? 'default'
                        : module.ownerType === 'admin'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {module.ownerTypeDisplayName}
                  </Badge>
                  {module.isPublic && module.ownerType === 'user' && (
                    <Badge variant="outline">Public</Badge>
                  )}
                  {module.status !== 'active' && (
                    <Badge variant="secondary">{module.status}</Badge>
                  )}
                </div>

                {module.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {module.description}
                  </p>
                )}

                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span>File: {module.fileId.split('/').pop()}</span>
                  <span>Created: {new Date(module.createdAt).toLocaleDateString()}</span>
                  {module.ownerId === user?.id && (
                    <span className="text-blue-600">Your module</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTest(module)}
                >
                  Test
                </Button>
                {module.ownerId === user?.id && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(module)}
                    disabled={isDeleting}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Test Execution Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Test Module: {selectedModule?.moduleName} v{selectedModule?.version}
            </DialogTitle>
            <DialogDescription>
              Execute a function on the Edge Function to test the module
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Function Name</label>
              <Input
                value={testFunctionName}
                onChange={(e) => setTestFunctionName(e.target.value)}
                placeholder="process"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Arguments (JSON Array)</label>
              <textarea
                className="w-full p-2 border rounded-md font-mono text-sm"
                rows={4}
                value={testArgs}
                onChange={(e) => setTestArgs(e.target.value)}
                placeholder='[1, 2, 3]'
              />
            </div>

            {executeOnEdgeResult && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h4 className="font-semibold text-green-900 mb-2">Execution Result</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Result:</span>{' '}
                    <code className="bg-white px-2 py-1 rounded">
                      {JSON.stringify(executeOnEdgeResult.result)}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Execution Time:</span> {executeOnEdgeResult.executionTimeMs}ms
                  </div>
                  {executeOnEdgeResult.memoryUsedBytes && (
                    <div>
                      <span className="font-medium">Memory Used:</span>{' '}
                      {(executeOnEdgeResult.memoryUsedBytes / 1024).toFixed(2)} KB
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Cache Hit:</span>{' '}
                    {executeOnEdgeResult.cacheHit ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            )}

            {executeOnEdgeError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h4 className="font-semibold text-red-900 mb-2">Execution Error</h4>
                <p className="text-sm text-red-800">{executeOnEdgeError.message}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setTestDialogOpen(false)}
                disabled={isExecutingOnEdge}
              >
                Close
              </Button>
              <Button
                variant="gradient"
                onClick={handleExecuteTest}
                disabled={isExecutingOnEdge || !testFunctionName}
              >
                {isExecutingOnEdge ? 'Executing...' : 'Execute on Edge'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
