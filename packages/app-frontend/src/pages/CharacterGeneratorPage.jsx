import { CharacterGeneratorCard } from '@/components/features/character/CharacterGeneratorCard'

/**
 * CharacterGeneratorPage
 * Main page for character generation
 */
export function CharacterGeneratorPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Character Generator</h1>
        <p className="text-muted-foreground text-lg">
          Create unique character art with ComfyUI. Select presets and add your custom prompt!
        </p>
      </div>

      <CharacterGeneratorCard />
    </div>
  )
}
