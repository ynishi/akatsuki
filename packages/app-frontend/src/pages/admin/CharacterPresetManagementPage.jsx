import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { CharacterPresetRepository } from '../../repositories/CharacterPresetRepository'
import { CharacterPreset } from '../../models/CharacterPreset'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Edit, Trash2, Search } from 'lucide-react'

const CATEGORIES = [
  { value: 'hairstyle', label: 'Hairstyle' },
  { value: 'body_type', label: 'Body Type' },
  { value: 'costume', label: 'Costume' },
  { value: 'expression', label: 'Expression' },
  { value: 'hair_color', label: 'Hair Color' },
  { value: 'eye_color', label: 'Eye Color' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'background', label: 'Background' },
  { value: 'pose', label: 'Pose' },
  { value: 'composition', label: 'Composition' },
  { value: 'lighting', label: 'Lighting' },
]

export function CharacterPresetManagementPage() {
  const { user } = useAuth()
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [form, setForm] = useState({
    nameEn: '',
    nameJa: '',
    promptEn: '',
    category: 'hairstyle',
    displayOrder: 0,
  })

  // Load presets
  const loadPresets = async () => {
    try {
      setLoading(true)
      const { data, error } = await CharacterPresetRepository.findAll()

      if (error) {
        console.error('Failed to load presets:', error)
        return
      }

      const presetInstances = data.map((p) => CharacterPreset.fromDatabase(p))
      setPresets(presetInstances)
    } catch (error) {
      console.error('Load presets error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Open create dialog
  const handleCreate = () => {
    setIsCreating(true)
    setSelectedPreset(null)
    setForm({
      nameEn: '',
      nameJa: '',
      promptEn: '',
      category: 'hairstyle',
      displayOrder: 0,
    })
    setEditDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (preset) => {
    setIsCreating(false)
    setSelectedPreset(preset)
    setForm({
      nameEn: preset.nameEn,
      nameJa: preset.nameJa,
      promptEn: preset.promptEn,
      category: preset.category,
      displayOrder: preset.displayOrder,
    })
    setEditDialogOpen(true)
  }

  // Save (create or update)
  const handleSave = async () => {
    try {
      const presetData = {
        name_en: form.nameEn,
        name_ja: form.nameJa,
        prompt_en: form.promptEn,
        category: form.category,
        display_order: parseInt(form.displayOrder) || 0,
      }

      if (isCreating) {
        const { error } = await CharacterPresetRepository.create(presetData)
        if (error) {
          alert(`Failed to create preset: ${error.message}`)
          return
        }
        alert('Preset created successfully!')
      } else {
        const { error } = await CharacterPresetRepository.update(selectedPreset.id, presetData)
        if (error) {
          alert(`Failed to update preset: ${error.message}`)
          return
        }
        alert('Preset updated successfully!')
      }

      setEditDialogOpen(false)
      await loadPresets()
    } catch (error) {
      console.error('Save error:', error)
      alert(`Error: ${error.message}`)
    }
  }

  // Delete preset
  const handleDelete = async () => {
    if (!selectedPreset) return

    try {
      const { error } = await CharacterPresetRepository.delete(selectedPreset.id)

      if (error) {
        alert(`Failed to delete preset: ${error.message}`)
        return
      }

      alert('Preset deleted successfully!')
      setDeleteDialogOpen(false)
      setSelectedPreset(null)
      await loadPresets()
    } catch (error) {
      console.error('Delete error:', error)
      alert(`Error: ${error.message}`)
    }
  }

  // Open delete confirmation
  const confirmDelete = (preset) => {
    setSelectedPreset(preset)
    setDeleteDialogOpen(true)
  }

  // Filter presets
  const filteredPresets = presets.filter((preset) => {
    if (!preset) return false

    const matchesSearch =
      (preset.nameEn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (preset.nameJa || '').includes(searchQuery) ||
      (preset.promptEn || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || preset.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  useEffect(() => {
    loadPresets()
  }, [])

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>Please login to access this page.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Character Preset Management</h1>
        <p className="text-gray-600">Create, edit, and manage character generation presets</p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search presets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Create Button */}
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Preset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Presets List */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Loading presets...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPresets.map((preset) => (
            <Card key={preset.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{preset.nameEn}</h3>
                      <Badge variant="outline">{preset.category}</Badge>
                      {preset.isSpecial() && <Badge variant="secondary">Special</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{preset.nameJa}</p>
                    <p className="text-sm text-gray-500 font-mono">{preset.promptEn}</p>
                    <p className="text-xs text-gray-400 mt-2">Display Order: {preset.displayOrder}</p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(preset)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => confirmDelete(preset)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredPresets.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">No presets found</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create Preset' : 'Edit Preset'}</DialogTitle>
            <DialogDescription>
              {isCreating
                ? 'Create a new character preset'
                : 'Update preset details and prompt'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name (English) */}
            <div className="space-y-2">
              <Label htmlFor="nameEn">Name (English)</Label>
              <Input
                id="nameEn"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="e.g., Long Hair"
              />
            </div>

            {/* Name (Japanese) */}
            <div className="space-y-2">
              <Label htmlFor="nameJa">Name (Japanese)</Label>
              <Input
                id="nameJa"
                value={form.nameJa}
                onChange={(e) => setForm({ ...form, nameJa: e.target.value })}
                placeholder="e.g., ロングヘア"
              />
            </div>

            {/* Prompt (English) */}
            <div className="space-y-2">
              <Label htmlFor="promptEn">Prompt (English)</Label>
              <Textarea
                id="promptEn"
                value={form.promptEn}
                onChange={(e) => setForm({ ...form, promptEn: e.target.value })}
                placeholder="e.g., long hair, flowing hair"
                rows={3}
              />
              <p className="text-xs text-gray-500">
                This will be added to the image generation prompt
              </p>
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">Lower numbers appear first</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{isCreating ? 'Create' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Preset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPreset?.nameEn}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
