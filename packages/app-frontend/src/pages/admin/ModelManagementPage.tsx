import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { ComfyUIModelRepository } from '../../repositories'
import { ComfyUIModel, type ComfyUIModelCategory } from '../../models'
import { useAuth } from '../../contexts/AuthContext'
import { EdgeFunctionService } from '../../services'

interface SyncModelsResponse {
  synced: number
  added: number
  deactivated: number
}

interface EditForm {
  displayName: string
  description: string
  category: string
  tags: string
  isFeatured: boolean
  sortOrder: number | string
}

export function ModelManagementPage() {
  const { user } = useAuth()
  const [models, setModels] = useState<ComfyUIModel[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ComfyUIModel | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Form states
  const [editForm, setEditForm] = useState<EditForm>({
    displayName: '',
    description: '',
    category: 'other',
    tags: '',
    isFeatured: false,
    sortOrder: 0,
  })

  // Load models
  const loadModels = async () => {
    try {
      setLoading(true)
      const { data, error } = await ComfyUIModelRepository.getAll()

      if (error) {
        console.error('Failed to load models:', error)
        return
      }

      const modelInstances = data.map(m => ComfyUIModel.fromDatabase(m))
      setModels(modelInstances)
    } catch (error) {
      console.error('Load models error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sync models from RunPod
  const handleSync = async () => {
    try {
      setSyncing(true)
      const { data, error } = await EdgeFunctionService.invoke<SyncModelsResponse>(
        'sync-comfyui-models',
        {}
      )

      if (error) {
        alert(`Sync failed: ${error.message}`)
        return
      }

      if (!data) {
        alert('Sync completed but no data returned')
        return
      }

      alert(`Sync completed!\n- Synced: ${data.synced}\n- Added: ${data.added}\n- Deactivated: ${data.deactivated}`)
      await loadModels()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Sync error:', error)
      alert(`Sync error: ${errorMessage}`)
    } finally {
      setSyncing(false)
    }
  }

  // Open edit dialog
  const handleEdit = (model: ComfyUIModel) => {
    setSelectedModel(model)
    setEditForm({
      displayName: model.displayName || '',
      description: model.description || '',
      category: model.category || 'other',
      tags: model.tags.join(', '),
      isFeatured: model.isFeatured,
      sortOrder: model.sortOrder,
    })
    setEditDialogOpen(true)
  }

  // Save changes
  const handleSave = async () => {
    if (!selectedModel || !selectedModel.id) return

    try {
      const updates = {
        display_name: editForm.displayName || null,
        description: editForm.description || null,
        category: editForm.category as ComfyUIModelCategory,
        tags: editForm.tags.split(',').map(t => t.trim()).filter(t => t),
        is_featured: editForm.isFeatured,
        sort_order: parseInt(String(editForm.sortOrder)) || 0,
      }

      const { error } = await ComfyUIModelRepository.update(selectedModel.id, updates)

      if (error) {
        alert(`Failed to update: ${error.message}`)
        return
      }

      alert('Model updated successfully!')
      setEditDialogOpen(false)
      await loadModels()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Update error:', error)
      alert(`Error: ${errorMessage}`)
    }
  }

  // Toggle featured status
  const toggleFeatured = async (model: ComfyUIModel) => {
    if (!model.id) return

    const { error } = await ComfyUIModelRepository.update(model.id, {
      is_featured: !model.isFeatured
    })

    if (error) {
      alert(`Failed to toggle featured: ${error.message}`)
      return
    }

    await loadModels()
  }

  // Filter models
  const filteredModels = models.filter(model => {
    const matchesSearch = model.matchesSearch(searchQuery)
    const matchesCategory = categoryFilter === 'all' || model.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  useEffect(() => {
    loadModels()
  }, [])

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to access the admin panel.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
              ComfyUI Model Management
            </h1>
            <p className="text-gray-600 mt-2">Manage model metadata, categories, and tags</p>
          </div>
          <Button
            variant="gradient"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync from RunPod'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{models.length}</div>
              <p className="text-xs text-gray-600">Total Models</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{models.filter(m => m.isFeatured).length}</div>
              <p className="text-xs text-gray-600">Featured</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{models.filter(m => m.isPopular()).length}</div>
              <p className="text-xs text-gray-600">Popular (&gt;10 uses)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{models.filter(m => m.category === 'anime').length}</div>
              <p className="text-xs text-gray-600">Anime Category</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                  <SelectItem value="pony">Pony</SelectItem>
                  <SelectItem value="3d">3D</SelectItem>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Models List */}
        <Card>
          <CardHeader>
            <CardTitle>Models ({filteredModels.length})</CardTitle>
            <CardDescription>Click on a model to edit its metadata</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No models found</div>
            ) : (
              <div className="space-y-2">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEdit(model)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{model.getDisplayName()}</span>
                        {model.isFeatured && (
                          <Badge variant="gradient">Featured</Badge>
                        )}
                        {model.isPopular() && (
                          <Badge variant="secondary">Popular</Badge>
                        )}
                        <Badge variant="outline">{model.getCategoryDisplay()}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{model.filename}</p>
                      {model.description && (
                        <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                      )}
                      {model.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {model.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm text-gray-600">
                      <div>Used: {model.usageCount} times</div>
                      <div>Order: {model.sortOrder}</div>
                      <Button
                        size="sm"
                        variant={model.isFeatured ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFeatured(model)
                        }}
                      >
                        {model.isFeatured ? 'Unfeature' : 'Feature'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Model: {selectedModel?.filename}</DialogTitle>
              <DialogDescription>
                Update model metadata and categorization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder="Auto-generated from filename if empty"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Optional model description"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={editForm.category} onValueChange={(val) => setEditForm({ ...editForm, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="pony">Pony</SelectItem>
                    <SelectItem value="3d">3D</SelectItem>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  placeholder="anime, illustrious, nsfw"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Sort Order</label>
                  <Input
                    type="number"
                    value={editForm.sortOrder}
                    onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.isFeatured}
                    onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium">Featured</label>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
