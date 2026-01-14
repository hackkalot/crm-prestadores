'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, XCircle, PlusCircle, Loader2, Search } from 'lucide-react'
import { approveSuggestion, rejectSuggestion, markNeedsNewTaxonomy, getAllTaxonomyServices } from '@/lib/service-mapping/actions'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Database } from '@/types/database'

type Suggestion = Database['public']['Tables']['service_mapping_suggestions']['Row'] & {
  taxonomy_1?: { id: string; category: string; service: string } | null
  taxonomy_2?: { id: string; category: string; service: string } | null
  taxonomy_3?: { id: string; category: string; service: string } | null
}

type TaxonomyService = Database['public']['Tables']['service_taxonomy']['Row']

export function ServiceMappingReview({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showCustomDialog, setShowCustomDialog] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [allServices, setAllServices] = useState<TaxonomyService[]>([])
  const [selectedCustomService, setSelectedCustomService] = useState<string | null>(null)

  const handleApprove = async (suggestionId: string, taxonomyId: string) => {
    setLoading(suggestionId)

    const result = await approveSuggestion(suggestionId, taxonomyId, notes)

    if (result.error) {
      alert(`Erro: ${result.error}`)
    } else {
      setNotes('')
      router.refresh()
    }

    setLoading(null)
  }

  const handleReject = async (suggestionId: string) => {
    setLoading(suggestionId)

    const result = await rejectSuggestion(suggestionId, notes)

    if (result.error) {
      alert(`Erro: ${result.error}`)
    } else {
      setNotes('')
      router.refresh()
    }

    setLoading(null)
  }

  const handleNeedsNew = async (suggestionId: string) => {
    setLoading(suggestionId)

    const result = await markNeedsNewTaxonomy(suggestionId, notes)

    if (result.error) {
      alert(`Erro: ${result.error}`)
    } else {
      setNotes('')
      router.refresh()
    }

    setLoading(null)
  }

  const handleOpenCustomDialog = async (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion)
    setShowCustomDialog(true)

    // Load all services if not loaded yet
    if (allServices.length === 0) {
      const result = await getAllTaxonomyServices()
      if (result.data) {
        setAllServices(result.data)
      }
    }
  }

  const handleApproveCustom = async () => {
    if (!selectedSuggestion || !selectedCustomService) return

    setLoading(selectedSuggestion.id)

    const result = await approveSuggestion(selectedSuggestion.id, selectedCustomService, notes)

    if (result.error) {
      alert(`Erro: ${result.error}`)
    } else {
      setShowCustomDialog(false)
      setSelectedSuggestion(null)
      setSelectedCustomService(null)
      setNotes('')
      setSearchQuery('')
      router.refresh()
    }

    setLoading(null)
  }

  const filteredServices = allServices.filter(
    (service) =>
      service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.service.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sugestões de Mapeamento</CardTitle>
          <CardDescription>
            Todas as sugestões foram revistas! 🎉
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Não há sugestões pendentes de revisão.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sugestões de Mapeamento ({suggestions.length})</CardTitle>
          <CardDescription>
            Revê e aprova os mapeamentos sugeridos pelo algoritmo de IA. O teu feedback melhora a precisão futura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border rounded-lg p-4 space-y-4 bg-muted/30"
            >
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {suggestion.provider_service_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Serviço oferecido pelos prestadores
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Sugestões do algoritmo (clica para aprovar):
                </Label>

                <div className="space-y-2">
                  {suggestion.taxonomy_1 && (
                    <button
                      onClick={() => handleApprove(suggestion.id, suggestion.suggested_taxonomy_id_1!)}
                      disabled={loading !== null}
                      className="w-full flex items-center justify-between p-3 border rounded-md hover:bg-accent hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div>
                        <div className="font-medium">{suggestion.taxonomy_1.service}</div>
                        <div className="text-sm text-muted-foreground">
                          {suggestion.taxonomy_1.category}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {suggestion.suggested_score_1}%
                      </Badge>
                    </button>
                  )}

                  {suggestion.taxonomy_2 && (
                    <button
                      onClick={() => handleApprove(suggestion.id, suggestion.suggested_taxonomy_id_2!)}
                      disabled={loading !== null}
                      className="w-full flex items-center justify-between p-3 border rounded-md hover:bg-accent hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div>
                        <div className="font-medium">{suggestion.taxonomy_2.service}</div>
                        <div className="text-sm text-muted-foreground">
                          {suggestion.taxonomy_2.category}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {suggestion.suggested_score_2}%
                      </Badge>
                    </button>
                  )}

                  {suggestion.taxonomy_3 && (
                    <button
                      onClick={() => handleApprove(suggestion.id, suggestion.suggested_taxonomy_id_3!)}
                      disabled={loading !== null}
                      className="w-full flex items-center justify-between p-3 border rounded-md hover:bg-accent hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div>
                        <div className="font-medium">{suggestion.taxonomy_3.service}</div>
                        <div className="text-sm text-muted-foreground">
                          {suggestion.taxonomy_3.category}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {suggestion.suggested_score_3}%
                      </Badge>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`notes-${suggestion.id}`} className="text-sm">
                  Notas (opcional)
                </Label>
                <Textarea
                  id={`notes-${suggestion.id}`}
                  placeholder="Adiciona notas sobre esta decisão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCustomDialog(suggestion)}
                  disabled={loading !== null}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Procurar Outro
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNeedsNew(suggestion.id)}
                  disabled={loading !== null}
                >
                  {loading === suggestion.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlusCircle className="h-4 w-4 mr-2" />
                  )}
                  Criar Novo Serviço
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(suggestion.id)}
                  disabled={loading !== null}
                >
                  {loading === suggestion.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Rejeitar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom Service Selection Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Procurar Serviço na Taxonomia</DialogTitle>
            <DialogDescription>
              Procura e seleciona o serviço correto para mapear &ldquo;
              {selectedSuggestion?.provider_service_name}&rdquo;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div>
              <Input
                placeholder="Procurar por categoria ou serviço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex-1 overflow-auto space-y-2 pr-2">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedCustomService(service.id)}
                  className={`w-full flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors text-left ${
                    selectedCustomService === service.id
                      ? 'border-primary bg-accent'
                      : ''
                  }`}
                >
                  <div>
                    <div className="font-medium">{service.service}</div>
                    <div className="text-sm text-muted-foreground">{service.category}</div>
                  </div>
                  {selectedCustomService === service.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}

              {filteredServices.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum serviço encontrado
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomDialog(false)
                setSelectedCustomService(null)
                setSearchQuery('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApproveCustom}
              disabled={!selectedCustomService || loading !== null}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Aprovar Mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
