import { Link } from 'react-router-dom'
import { TopNavigation } from '@/components/layout/TopNavigation'
import { Button } from '@/components/ui/button'
import { CharacterGalleryGrid } from '@/components/features/character/CharacterGalleryGrid'
import { Sparkles } from 'lucide-react'

/**
 * CharacterGalleryPage
 * Display user's character generation history
 */
export function CharacterGalleryPage() {
  return (
    <>
      <TopNavigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl mt-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Character Gallery</h1>
            <p className="text-muted-foreground text-lg">Your generated characters</p>
          </div>

          <Button asChild>
            <Link to="/character-generator">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New
            </Link>
          </Button>
        </div>

        <CharacterGalleryGrid />
      </div>
    </>
  )
}
