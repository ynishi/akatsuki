import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Trash2, Download, Info } from 'lucide-react'
import { useCharacterGallery } from '@/hooks/useCharacterGallery'

/**
 * CharacterGalleryGrid Component
 * Display user's character generation history in a grid
 */
export function CharacterGalleryGrid() {
  const { generations, isLoading, deleteGeneration, isDeleting } = useCharacterGallery()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="aspect-square w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (generations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No characters generated yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Visit the Character Generator to create your first character!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {generations.map((gen) => {
        const imageUrl = gen.getPublicUrl()

        return (
          <Card key={gen.id} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base truncate">{gen.finalPrompt}</CardTitle>
              <CardDescription>{gen.getFormattedDate()}</CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Generated character"
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">No image</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-2 p-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="mr-2 h-4 w-4" />
                    Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Generation Details</DialogTitle>
                    <DialogDescription>{gen.getFormattedDate()}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Generated character"
                        className="w-full rounded-lg"
                      />
                    )}
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-semibold text-sm">Final Prompt</h4>
                        <p className="text-sm text-muted-foreground">{gen.finalPrompt}</p>
                      </div>
                      {gen.customPrompt && (
                        <div>
                          <h4 className="font-semibold text-sm">Custom Prompt (Original)</h4>
                          <p className="text-sm text-muted-foreground">{gen.customPrompt}</p>
                        </div>
                      )}
                      {gen.translatedPrompt && (
                        <div>
                          <h4 className="font-semibold text-sm">Translated Prompt</h4>
                          <p className="text-sm text-muted-foreground">{gen.translatedPrompt}</p>
                        </div>
                      )}
                      {gen.generationSettings && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Generation Settings</h4>
                          <div className="flex flex-wrap gap-2">
                            {gen.generationSettings.size && (
                              <Badge variant="secondary">Size: {gen.generationSettings.size}</Badge>
                            )}
                            {gen.generationSettings.steps && (
                              <Badge variant="secondary">Steps: {gen.generationSettings.steps}</Badge>
                            )}
                            {gen.generationSettings.cfg && (
                              <Badge variant="secondary">CFG: {gen.generationSettings.cfg}</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {gen.comfyWorkflowId && (
                        <div>
                          <h4 className="font-semibold text-sm">Workflow ID</h4>
                          <p className="text-xs text-muted-foreground font-mono">{gen.comfyWorkflowId}</p>
                        </div>
                      )}
                      {gen.comfyModelId && (
                        <div>
                          <h4 className="font-semibold text-sm">Model</h4>
                          <p className="text-sm text-muted-foreground">{gen.comfyModelId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {imageUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={imageUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Character</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this character? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteGeneration(gen.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
