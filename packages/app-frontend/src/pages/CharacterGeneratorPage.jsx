import { TopNavigation } from '@/components/layout/TopNavigation'
import { CharacterGeneratorCard } from '@/components/features/character/CharacterGeneratorCard'

/**
 * CharacterGeneratorPage
 * Main page for character generation
 */
export function CharacterGeneratorPage() {
  return (
    <>
      <TopNavigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl mt-16">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Character Generator</h1>
          <p className="text-muted-foreground text-lg">
            Create unique character art with ComfyUI. Select presets and add your custom prompt!
          </p>
        </div>

        <CharacterGeneratorCard />
      </div>
    </>
  )
}
