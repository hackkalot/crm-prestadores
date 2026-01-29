'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Eye,
  X,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getTemplatesForManagement,
  getTemplateClusters,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getServiceNameSuggestionsFromPrices,
} from '@/lib/service-templates/actions'
import type { ServiceTemplate, ServiceTemplateSections, ServiceTemplateInput } from '@/lib/service-templates/actions'
import { toast } from 'sonner'

interface ServiceTemplatesTableProps {
  initialTemplates: ServiceTemplate[]
  initialClusters: string[]
}

const ITEMS_PER_PAGE = 25

// Empty template for new records
const getEmptyTemplate = (): ServiceTemplateInput => ({
  service_name: '',
  service_group: null,
  cluster: null,
  folder_path: null,
  file_name: null,
  content_markdown: null,
  sections: {
    includes: [],
    excludes: [],
    importantNotes: [],
  },
  is_active: true,
})

// Section editor component
function SectionsEditor({
  sections,
  onChange,
}: {
  sections: ServiceTemplateSections
  onChange: (sections: ServiceTemplateSections) => void
}) {
  const addItem = (key: keyof ServiceTemplateSections) => {
    const current = sections[key] || []
    onChange({
      ...sections,
      [key]: [...current, ''],
    })
  }

  const updateItem = (key: keyof ServiceTemplateSections, index: number, value: string) => {
    const current = sections[key] || []
    const updated = [...current]
    updated[index] = value
    onChange({
      ...sections,
      [key]: updated,
    })
  }

  const removeItem = (key: keyof ServiceTemplateSections, index: number) => {
    const current = sections[key] || []
    const updated = current.filter((_, i) => i !== index)
    onChange({
      ...sections,
      [key]: updated,
    })
  }

  const renderSection = (key: keyof ServiceTemplateSections, title: string, color: string) => {
    const items = sections[key] || []

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className={`text-sm font-medium ${color}`}>{title}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addItem(key)}
            className="h-7 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        <div className="space-y-1">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => updateItem(key, index, e.target.value)}
                placeholder={`Item ${index + 1}...`}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(key, index)}
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Nenhum item adicionado
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {renderSection('includes', 'O que inclui', 'text-green-700')}
      {renderSection('excludes', 'O que não inclui', 'text-red-700')}
      {renderSection('importantNotes', 'Notas importantes', 'text-amber-700')}
    </div>
  )
}

export function ServiceTemplatesTable({ initialTemplates, initialClusters }: ServiceTemplatesTableProps) {
  const [data, setData] = useState<ServiceTemplate[]>(initialTemplates)
  const [total, setTotal] = useState(initialTemplates.length)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [cluster, setCluster] = useState<string>('')
  const [clusters, setClusters] = useState<string[]>(initialClusters)
  const [isPending, startTransition] = useTransition()

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewMode, setIsViewMode] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null)
  const [formData, setFormData] = useState<ServiceTemplateInput>(getEmptyTemplate())
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Service name suggestions
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fetch data
  const fetchData = useCallback(() => {
    startTransition(async () => {
      const result = await getTemplatesForManagement({
        cluster: cluster || undefined,
        search: search || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      })
      setData(result.data)
      setTotal(result.total)

      // Refresh clusters
      const newClusters = await getTemplateClusters()
      setClusters(newClusters)
    })
  }, [page, cluster, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  // Fetch service name suggestions
  const fetchSuggestions = async (value: string) => {
    if (value.length < 2) {
      setSuggestions([])
      return
    }
    const results = await getServiceNameSuggestionsFromPrices(value)
    setSuggestions(results)
  }

  // Open dialog for new template
  const handleNew = () => {
    setEditingTemplate(null)
    setFormData(getEmptyTemplate())
    setIsViewMode(false)
    setIsDialogOpen(true)
  }

  // Open dialog for editing
  const handleEdit = (template: ServiceTemplate) => {
    setEditingTemplate(template)
    setFormData({
      service_name: template.service_name,
      service_group: template.service_group,
      cluster: template.cluster,
      folder_path: template.folder_path,
      file_name: template.file_name,
      content_markdown: template.content_markdown,
      sections: (template.sections as ServiceTemplateSections) || {
        includes: [],
        excludes: [],
        importantNotes: [],
      },
      is_active: template.is_active ?? true,
    })
    setIsViewMode(false)
    setIsDialogOpen(true)
  }

  // Open dialog for viewing
  const handleView = (template: ServiceTemplate) => {
    setEditingTemplate(template)
    setFormData({
      service_name: template.service_name,
      service_group: template.service_group,
      cluster: template.cluster,
      folder_path: template.folder_path,
      file_name: template.file_name,
      content_markdown: template.content_markdown,
      sections: (template.sections as ServiceTemplateSections) || {
        includes: [],
        excludes: [],
        importantNotes: [],
      },
      is_active: template.is_active ?? true,
    })
    setIsViewMode(true)
    setIsDialogOpen(true)
  }

  // Save template
  const handleSave = async () => {
    if (!formData.service_name?.trim()) {
      toast.error('Nome do serviço é obrigatório')
      return
    }

    setIsSaving(true)
    try {
      if (editingTemplate) {
        const result = await updateTemplate(editingTemplate.id, formData)
        if (result.success) {
          toast.success('Template atualizado com sucesso')
          setIsDialogOpen(false)
          fetchData()
        } else {
          toast.error(result.error || 'Erro ao atualizar template')
        }
      } else {
        const result = await createTemplate(formData)
        if (result.success) {
          toast.success('Template criado com sucesso')
          setIsDialogOpen(false)
          fetchData()
        } else {
          toast.error(result.error || 'Erro ao criar template')
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Delete template
  const handleDelete = async () => {
    if (!deleteId) return

    const result = await deleteTemplate(deleteId)
    if (result.success) {
      toast.success('Template eliminado com sucesso')
      setDeleteId(null)
      fetchData()
    } else {
      toast.error(result.error || 'Erro ao eliminar template')
    }
  }

  const getClusterColor = (c: string | null) => {
    if (!c) return 'bg-gray-100 text-gray-800'
    switch (c) {
      case 'Casa':
        return 'bg-blue-100 text-blue-800'
      case 'Saúde e bem estar':
        return 'bg-green-100 text-green-800'
      case 'Empresas':
        return 'bg-purple-100 text-purple-800'
      case 'Luxo':
        return 'bg-amber-100 text-amber-800'
      case 'Pete':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const countSectionItems = (sections: unknown) => {
    if (!sections || typeof sections !== 'object') return 0
    const s = sections as ServiceTemplateSections
    return (
      (s.includes?.length || 0) +
      (s.excludes?.length || 0) +
      (s.importantNotes?.length || 0)
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={cluster} onValueChange={setCluster}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os clusters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os clusters</SelectItem>
            {clusters.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleNew}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>

        {isPending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Serviço</TableHead>
              <TableHead className="w-[120px]">Cluster</TableHead>
              <TableHead className="w-[150px]">Grupo</TableHead>
              <TableHead className="w-[100px] text-center">Secções</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nenhum template encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    {template.service_name}
                  </TableCell>
                  <TableCell>
                    {template.cluster && (
                      <Badge variant="secondary" className={getClusterColor(template.cluster)}>
                        {template.cluster}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {template.service_group || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {countSectionItems(template.sections)} itens
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleView(template)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEdit(template)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(template.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A mostrar {data.length} de {total} templates
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isPending}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? 'Detalhes do Template'
                : editingTemplate
                  ? 'Editar Template'
                  : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? 'Visualização do template de ficha de serviço'
                : 'Preencha os campos para configurar o template de ficha de serviço'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Service Name with suggestions */}
            <div className="space-y-2">
              <Label htmlFor="service_name">Nome do Serviço *</Label>
              <div className="relative">
                <Input
                  id="service_name"
                  value={formData.service_name}
                  onChange={(e) => {
                    setFormData({ ...formData, service_name: e.target.value })
                    fetchSuggestions(e.target.value)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Ex: Eletricista"
                  disabled={isViewMode}
                />
                {showSuggestions && suggestions.length > 0 && !isViewMode && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setFormData({ ...formData, service_name: suggestion })
                          setShowSuggestions(false)
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cluster and Service Group */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cluster">Cluster</Label>
                <Select
                  value={formData.cluster || ''}
                  onValueChange={(v) => setFormData({ ...formData, cluster: v || null })}
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem cluster</SelectItem>
                    <SelectItem value="Casa">Casa</SelectItem>
                    <SelectItem value="Saúde e bem estar">Saúde e bem estar</SelectItem>
                    <SelectItem value="Empresas">Empresas</SelectItem>
                    <SelectItem value="Luxo">Luxo</SelectItem>
                    <SelectItem value="Pete">Pete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_group">Grupo de Serviço</Label>
                <Input
                  id="service_group"
                  value={formData.service_group || ''}
                  onChange={(e) => setFormData({ ...formData, service_group: e.target.value || null })}
                  placeholder="Ex: Limpeza"
                  disabled={isViewMode}
                />
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-2">
              <Label>Secções da Ficha</Label>
              <div className="border rounded-md p-4 bg-muted/30">
                <SectionsEditor
                  sections={formData.sections || {}}
                  onChange={(sections) => setFormData({ ...formData, sections })}
                />
              </div>
            </div>

            {/* Content Markdown (optional, collapsed) */}
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Conteúdo Markdown (avançado)
              </summary>
              <Textarea
                value={formData.content_markdown || ''}
                onChange={(e) => setFormData({ ...formData, content_markdown: e.target.value || null })}
                placeholder="Conteúdo markdown original do template..."
                rows={6}
                disabled={isViewMode}
                className="mt-2"
              />
            </details>
          </div>

          <DialogFooter>
            {isViewMode ? (
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Fechar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTemplate ? 'Guardar' : 'Criar'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este template? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
