import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Sparkles, Shuffle, FileJson, Edit2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PresetSelector } from './PresetSelector'
import { useCharacterPresets } from '@/hooks/useCharacterPresets'
import { useImageGeneration } from '@/hooks/useImageGeneration'
import { CharacterGenerationService } from '@/services/CharacterGenerationService'
import { ComfyUIModelRepository } from '@/repositories/ComfyUIModelRepository'
import { ComfyUIWorkflowRepository } from '@/repositories/ComfyUIWorkflowRepository'
import { useAuth } from '@/contexts/AuthContext'

/**
 * CharacterGeneratorCard Component
 * Main card for character generation with presets + custom prompt
 */
export function CharacterGeneratorCard() {
  const { user } = useAuth()
  const { presets, isLoading: presetsLoading } = useCharacterPresets()
  const {
    generate: generateImage,
    loading: imageGenerating,
    result: generatedImage,
    error: imageError,
    reset,
  } = useImageGeneration()

  // Selected preset IDs by category
  const [selectedPresets, setSelectedPresets] = useState({})

  // Custom prompt (Japanese)
  const [customPrompt, setCustomPrompt] = useState('')

  // Prompt prefix (quality tags)
  const [promptPrefix, setPromptPrefix] = useState(
    'masterpiece, best quality, very aesthetic, absurdres, high resolution, extremely detailed, '
  )

  // Final prompt (for display)
  const [finalPrompt, setFinalPrompt] = useState('')

  // Generation metadata
  const [translatedPrompt, setTranslatedPrompt] = useState('')

  // Image generation options
  const [size, setSize] = useState('1024x1024')
  const [steps, setSteps] = useState(25)
  const [cfg, setCfg] = useState(7.0)

  // ComfyUI models
  const [availableModels, setAvailableModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [modelsLoading, setModelsLoading] = useState(false)

  // ComfyUI workflows
  const [availableWorkflows, setAvailableWorkflows] = useState([])
  const [selectedWorkflow, setSelectedWorkflow] = useState('')
  const [workflowsLoading, setWorkflowsLoading] = useState(false)

  // Workflow edit dialog
  const [editingWorkflow, setEditingWorkflow] = useState(null)
  const [editedWorkflowJson, setEditedWorkflowJson] = useState('')

  // Load ComfyUI models and workflows on mount
  useEffect(() => {
    loadAvailableModels()
    loadAvailableWorkflows()
  }, [])

  const loadAvailableModels = async () => {
    try {
      setModelsLoading(true)
      const { data, error } = await ComfyUIModelRepository.getAll()

      if (error) {
        console.error('Failed to load models:', error)
        return
      }

      setAvailableModels(data || [])

      // Set default model
      if (data && data.length > 0) {
        setSelectedModel(data[0].filename)
      }
    } catch (error) {
      console.error('Load models error:', error)
    } finally {
      setModelsLoading(false)
    }
  }

  const loadAvailableWorkflows = async () => {
    try {
      setWorkflowsLoading(true)
      const { data, error } = await ComfyUIWorkflowRepository.getAll()

      if (error) {
        console.error('Failed to load workflows:', error)
        return
      }

      setAvailableWorkflows(data || [])

      // Set default workflow
      if (data && data.length > 0) {
        setSelectedWorkflow(data[0].id)
      }
    } catch (error) {
      console.error('Load workflows error:', error)
    } finally {
      setWorkflowsLoading(false)
    }
  }

  const handlePresetChange = (category, presetId) => {
    setSelectedPresets((prev) => ({
      ...prev,
      [category]: presetId,
    }))
  }

  const handleEditWorkflow = (workflow) => {
    setEditingWorkflow(workflow)
    setEditedWorkflowJson(JSON.stringify(workflow.workflow_json, null, 2))
  }

  const handleSaveWorkflow = async () => {
    try {
      const parsedJson = JSON.parse(editedWorkflowJson)
      // TODO: API call to update workflow
      alert('Workflow editing is coming soon! (Admin page required)')
      setEditingWorkflow(null)
    } catch (err) {
      alert(`Invalid JSON: ${err.message}`)
    }
  }

  const extractPlaceholders = (workflowJson) => {
    const jsonStr = JSON.stringify(workflowJson)
    const placeholderRegex = /\{\{([^}]+)\}\}/g
    const matches = jsonStr.matchAll(placeholderRegex)
    const placeholders = new Set()
    for (const match of matches) {
      placeholders.add(match[1])
    }
    return Array.from(placeholders)
  }

  const handleFullRandom = () => {
    const categories = ['hairstyle', 'body_type', 'costume', 'expression', 'hair_color', 'eye_color', 'accessory', 'background', 'pose', 'composition', 'lighting']
    const newSelections = {}

    categories.forEach((category) => {
      const categoryPresets = presets[category]
      if (categoryPresets && categoryPresets.length > 0) {
        // Filter out "Random" and "No Preference" special presets
        const normalPresets = categoryPresets.filter(p => !p.isSpecial())
        if (normalPresets.length > 0) {
          const randomIndex = Math.floor(Math.random() * normalPresets.length)
          newSelections[category] = normalPresets[randomIndex].id
        }
      }
    })

    setSelectedPresets(newSelections)
  }

  const handleGenerate = async () => {
    try {
      // 1. Prepare final prompt (translate + combine presets)
      const presetIds = Object.values(selectedPresets).filter((id) => id)

      const { data: promptData, error: promptError } =
        await CharacterGenerationService.prepareFinalPrompt({
          presetIds,
          customPrompt,
          promptPrefix,
        })

      if (promptError) {
        console.error('Failed to prepare prompt:', promptError)
        return
      }

      setFinalPrompt(promptData.finalPrompt)
      setTranslatedPrompt(promptData.translatedPrompt)

      // 2. Generate image with ComfyUI
      const generationConfig = {
        prompt: promptData.finalPrompt,
        provider: 'comfyui',
        size,
        comfyui_config: {
          workflow_id: selectedWorkflow,
          steps,
          cfg,
          ckpt_name: selectedModel,
        },
      }

      console.log('[CharacterGeneratorCard] Generating image with config:', generationConfig)
      generateImage(generationConfig)
    } catch (err) {
      console.error('Generation failed:', err)
    }
  }

  // Save generation history when image is generated (only once per generation)
  useEffect(() => {
    const saveHistory = async () => {
      if (!generatedImage || !user || imageGenerating) return

      try {
        const presetIds = Object.values(selectedPresets).filter((id) => id)

        // Save with full generation settings
        await CharacterGenerationService.saveGeneration({
          userId: user.id,
          fileId: generatedImage.id,
          presetIds,
          customPrompt,
          translatedPrompt,
          finalPrompt,
          workflowId: selectedWorkflow,
          modelId: selectedModel,
          generationSettings: {
            promptPrefix,
            size,
            steps,
            cfg,
          },
        })
        console.log('[CharacterGeneratorCard] Generation history saved')
      } catch (err) {
        console.error('Failed to save generation history:', err)
      }
    }

    saveHistory()
  }, [generatedImage?.id]) // Only trigger when new image ID changes

  const handleReset = () => {
    setSelectedPresets({})
    setCustomPrompt('')
    setFinalPrompt('')
    setTranslatedPrompt('')
    reset()
  }

  return (
    <div className="space-y-6">
      {/* Preset Selector */}
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullRandom}
            disabled={presetsLoading}
            className="gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Full Random
          </Button>
        </div>
        <PresetSelector
          presets={presets}
          selectedPresets={selectedPresets}
          onPresetChange={handlePresetChange}
          isLoading={presetsLoading}
        />
      </div>

      {/* Custom Prompt & Generation Options */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Prompt & Options</CardTitle>
          <CardDescription>
            Add your own prompt in Japanese (will be auto-translated to English)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promptPrefix">Quality Prefix</Label>
            <Textarea
              id="promptPrefix"
              placeholder="masterpiece, best quality, very aesthetic, absurdres..."
              value={promptPrefix}
              onChange={(e) => setPromptPrefix(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Quality tags for high-quality anime generation. Recommended: masterpiece, best quality,
              very aesthetic, absurdres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customPrompt">Custom Prompt (Japanese OK)</Label>
            <Textarea
              id="customPrompt"
              placeholder="例: かわいい女の子、笑顔、明るい雰囲気"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {/* ComfyUI Workflow Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="workflow">Workflow</Label>
              {selectedWorkflow && (
                <div className="flex gap-2">
                  {/* View JSON Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <FileJson className="w-4 h-4" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Workflow JSON</DialogTitle>
                        <DialogDescription>
                          {availableWorkflows.find((w) => w.id === selectedWorkflow)?.name}
                        </DialogDescription>
                      </DialogHeader>

                      {/* Placeholders */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Available Placeholders:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {extractPlaceholders(
                            availableWorkflows.find((w) => w.id === selectedWorkflow)?.workflow_json
                          ).map((placeholder) => (
                            <Badge key={placeholder} variant="secondary">
                              {`{{${placeholder}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                        {JSON.stringify(
                          availableWorkflows.find((w) => w.id === selectedWorkflow)?.workflow_json,
                          null,
                          2
                        )}
                      </pre>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Dialog */}
                  <Dialog open={!!editingWorkflow} onOpenChange={(open) => !open && setEditingWorkflow(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          handleEditWorkflow(availableWorkflows.find((w) => w.id === selectedWorkflow))
                        }
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Workflow JSON</DialogTitle>
                        <DialogDescription>{editingWorkflow?.name}</DialogDescription>
                      </DialogHeader>

                      {/* Placeholders */}
                      {editingWorkflow && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Available Placeholders:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {extractPlaceholders(editingWorkflow.workflow_json).map((placeholder) => (
                              <Badge key={placeholder} variant="secondary">
                                {`{{${placeholder}}}`}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Use these placeholders in your workflow to enable dynamic parameter injection
                          </p>
                        </div>
                      )}

                      <Textarea
                        value={editedWorkflowJson}
                        onChange={(e) => setEditedWorkflowJson(e.target.value)}
                        className="font-mono text-xs h-[400px]"
                        placeholder="Edit workflow JSON..."
                      />

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingWorkflow(null)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveWorkflow}>Save (Admin Required)</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
            <Select
              value={selectedWorkflow}
              onValueChange={setSelectedWorkflow}
              disabled={workflowsLoading}
            >
              <SelectTrigger id="workflow">
                <SelectValue
                  placeholder={workflowsLoading ? 'Loading workflows...' : 'Select a workflow'}
                />
              </SelectTrigger>
              <SelectContent>
                {availableWorkflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ComfyUI Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model (Checkpoint)</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={modelsLoading}>
              <SelectTrigger id="model">
                <SelectValue placeholder={modelsLoading ? 'Loading models...' : 'Select a model'} />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.filename}>
                    {model.display_name || model.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ComfyUI Generation Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="512x512">512x512</SelectItem>
                  <SelectItem value="768x768">768x768</SelectItem>
                  <SelectItem value="1024x1024">1024x1024 (Square)</SelectItem>
                  <SelectItem value="1024x768">1024x768 (Landscape)</SelectItem>
                  <SelectItem value="768x1024">768x1024 (Portrait)</SelectItem>
                  <SelectItem value="1536x1024">1536x1024 (Wide)</SelectItem>
                  <SelectItem value="1024x1536">1024x1536 (Tall)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="steps">Steps: {steps}</Label>
              <Slider
                id="steps"
                min={10}
                max={50}
                step={5}
                value={[steps]}
                onValueChange={(value) => setSteps(value[0])}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground">Recommended: 20-30</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfg">CFG Scale: {cfg.toFixed(1)}</Label>
              <Slider
                id="cfg"
                min={1}
                max={15}
                step={0.5}
                value={[cfg]}
                onValueChange={(value) => setCfg(value[0])}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground">Recommended: 5-7</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={imageGenerating} className="flex-1">
              {imageGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Character
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleReset} disabled={imageGenerating}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {imageError && (
        <Alert variant="destructive">
          <AlertDescription>{imageError.message || 'Generation failed'}</AlertDescription>
        </Alert>
      )}

      {/* Result Display */}
      {generatedImage && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Character</CardTitle>
            <CardDescription>Final Prompt: {finalPrompt}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <img
                src={generatedImage.publicUrl}
                alt="Generated character"
                className="w-full rounded-lg"
              />

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={generatedImage.publicUrl} download>
                    Download
                  </a>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(finalPrompt)}
                >
                  Copy Prompt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
