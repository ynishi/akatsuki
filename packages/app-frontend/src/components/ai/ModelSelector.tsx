import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAIModels, useAIProviders, AIModelFilters } from '@/hooks/useAIModels'
import type { AIModel } from '@/models/AIModel'

/**
 * Model selector props
 */
export interface ModelSelectorProps {
  value: string
  onChange: (value: string) => void
  provider?: string | null
  isBasic?: boolean | null
  filters?: AIModelFilters
  label?: string
  showBadges?: boolean
  groupBy?: 'provider' | 'tier' | 'none'
  placeholder?: string
  className?: string
  activeOnly?: boolean
}

/**
 * AIモデル選択コンポーネント
 * Supabaseからモデル情報を取得して表示
 *
 * @example
 * <ModelSelector
 *   value={selectedModelId}
 *   onChange={setSelectedModelId}
 * />
 *
 * @example
 * // Vision対応モデルのみ
 * <ModelSelector
 *   value={selectedModelId}
 *   onChange={setSelectedModelId}
 *   filters={{ supportsImageInput: true }}
 * />
 */
export function ModelSelector({
  value,
  onChange,
  provider = null,
  isBasic = null,
  filters = {},
  label = 'AIモデル',
  showBadges = true,
  groupBy = 'provider',
  placeholder = 'モデルを選択',
  className = '',
  activeOnly = true,
}: ModelSelectorProps) {
  // DBからモデルを取得（カスタムフック経由）
  const allFilters = useMemo(() => ({
    ...filters,
    ...(provider && { provider }),
    ...(isBasic !== null && { isBasic }),
    activeOnly,
  }), [filters, provider, isBasic, activeOnly])

  const { models, loading, error } = useAIModels(allFilters)

  // グルーピング
  const groupedModels = useMemo(() => {
    if (groupBy === 'none') {
      return { all: models }
    }

    const groups: Record<string, AIModel[]> = {}
    models.forEach((model) => {
      const key = groupBy === 'tier'
        ? (model.isBasic ? 'basic' : 'advanced')
        : model[groupBy]

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(model)
    })
    return groups
  }, [models, groupBy])

  // グループラベル生成
  const getGroupLabel = (key: string): string => {
    if (groupBy === 'provider') {
      return key.charAt(0).toUpperCase() + key.slice(1)
    }
    if (groupBy === 'tier') {
      return key === 'basic' ? 'Basic Models' : 'Advanced Models'
    }
    return key
  }

  // 選択中のモデル
  const selectedModel = useMemo(() => {
    return models.find((m) => m.id === value)
  }, [models, value])

  if (loading) {
    return <div className={className}>Loading models...</div>
  }

  if (error) {
    return <div className={`text-red-500 ${className}`}>Error loading models</div>
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedModel && (
              <div className="flex items-center gap-2">
                <span>{selectedModel.label}</span>
                {showBadges && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {selectedModel.provider}
                    </Badge>
                    {selectedModel.isAdvanced() && (
                      <Badge variant="default" className="text-xs">
                        Advanced
                      </Badge>
                    )}
                  </>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {Object.entries(groupedModels).map(([groupKey, groupModels]) => (
            <SelectGroup key={groupKey}>
              {groupBy !== 'none' && <SelectLabel>{getGroupLabel(groupKey)}</SelectLabel>}

              {groupModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.label}</span>
                      {showBadges && (
                        <>
                          {groupBy !== 'provider' && (
                            <Badge variant="outline" className="text-xs">
                              {model.provider}
                            </Badge>
                          )}
                          {groupBy !== 'tier' && model.isAdvanced() && (
                            <Badge variant="default" className="text-xs">
                              Advanced
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{model.getDescription()}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* 選択中モデルの詳細情報 */}
      {selectedModel && showBadges && (
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          {selectedModel.supportsStreaming && <Badge variant="secondary">Streaming</Badge>}
          {selectedModel.supportsImageInput && <Badge variant="secondary">Vision</Badge>}
          {selectedModel.supportsImageOutput && <Badge variant="secondary">Image Gen</Badge>}
          {selectedModel.supportsFunctionCalling && (
            <Badge variant="secondary">Function Call</Badge>
          )}
          {selectedModel.supportsJson && <Badge variant="secondary">JSON</Badge>}
        </div>
      )}
    </div>
  )
}

/**
 * Provider selector props
 */
export interface ProviderSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

/**
 * プロバイダー選択コンポーネント
 */
export function ProviderSelector({
  value,
  onChange,
  label = 'AI Provider',
  className = ''
}: ProviderSelectorProps) {
  const { providers } = useAIProviders()

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="プロバイダーを選択" />
        </SelectTrigger>

        <SelectContent>
          {providers.map((provider) => (
            <SelectItem key={provider} value={provider}>
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Tier selector props
 */
export interface TierSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

/**
 * Tier選択コンポーネント
 */
export function TierSelector({
  value,
  onChange,
  label = 'Model Tier',
  className = ''
}: TierSelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Tierを選択" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="basic">Basic</SelectItem>
          <SelectItem value="advanced">Advanced</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
