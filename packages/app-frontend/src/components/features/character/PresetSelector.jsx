import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

/**
 * PresetSelector Component
 * Tabbed interface for selecting character presets by category
 *
 * @param {Object} props
 * @param {Object} props.presets - Presets grouped by category
 * @param {Object} props.selectedPresets - Selected preset IDs by category
 * @param {Function} props.onPresetChange - Callback when preset changes
 * @param {boolean} props.isLoading - Loading state
 */
export function PresetSelector({ presets, selectedPresets, onPresetChange, isLoading }) {
  const categories = [
    { key: 'hairstyle', label: 'Hair Style' },
    { key: 'body_type', label: 'Body Type' },
    { key: 'costume', label: 'Costume' },
    { key: 'expression', label: 'Expression' },
    { key: 'hair_color', label: 'Hair Color' },
    { key: 'eye_color', label: 'Eye Color' },
    { key: 'accessory', label: 'Accessory' },
    { key: 'background', label: 'Background' },
    { key: 'pose', label: 'Pose' },
    { key: 'composition', label: 'Composition' },
    { key: 'lighting', label: 'Lighting' },
  ]

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Character Presets</CardTitle>
          <CardDescription>Loading presets...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Character Presets</CardTitle>
        <CardDescription>
          Select options for each category, or choose Random/No Preference
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Selected Presets Display */}
        {Object.keys(selectedPresets).length > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">Selected Presets:</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const presetId = selectedPresets[cat.key]
                if (!presetId) return null

                const preset = presets[cat.key]?.find((p) => p.id === presetId)
                if (!preset) return null

                return (
                  <Badge key={cat.key} variant="secondary" className="gap-1">
                    <span className="text-xs text-muted-foreground">{cat.label}:</span>
                    <span>{preset.nameJa}</span>
                    <button
                      onClick={() => onPresetChange(cat.key, null)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        <Tabs defaultValue="hairstyle" className="w-full">
          <TabsList className="grid grid-cols-11 w-full text-xs">
            {categories.map((cat) => (
              <TabsTrigger key={cat.key} value={cat.key}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.key} value={cat.key} className="mt-4">
              <RadioGroup
                value={selectedPresets[cat.key] || ''}
                onValueChange={(value) => onPresetChange(cat.key, value)}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {presets[cat.key]?.map((preset) => (
                    <div key={preset.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={preset.id} id={preset.id} />
                      <Label
                        htmlFor={preset.id}
                        className={`cursor-pointer ${
                          preset.isSpecial() ? 'font-semibold text-primary' : ''
                        }`}
                      >
                        {preset.nameJa}
                      </Label>
                    </div>
                  )) || <p className="text-sm text-muted-foreground">No presets available</p>}
                </div>
              </RadioGroup>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
