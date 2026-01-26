'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Check,
  X,
  Plus,
  Download,
  Trash2,
  Package,
} from 'lucide-react'
import {
  getCatalogMaterialsWithPagination,
  getCatalogMaterialCategories,
  getCatalogMaterialsForExport,
  createCatalogMaterial,
  updateCatalogMaterial,
  deleteCatalogMaterial,
  getMaterialCategorySuggestions,
} from '@/lib/service-catalog/actions'
import type { CatalogMaterial, CatalogMaterialInput } from '@/lib/service-catalog/actions'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface CatalogMaterialsTableProps {
  materials: CatalogMaterial[]
  categories: string[]
}

const ITEMS_PER_PAGE_OPTIONS = [50, 100, 200]

// Estado vazio para nova linha
const getEmptyRow = (): Omit<CatalogMaterial, 'id' | 'created_at' | 'updated_at'> => ({
  material_name: '',
  category: null,
  price_without_vat: 0,
  vat_rate: 23,
  is_active: true,
})

// Componente de Autocomplete com portal para evitar problemas de z-index/overflow
function AutocompleteInput({
  value,
  onChange,
  getSuggestions,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  getSuggestions: (search: string) => Promise<string[]>
  placeholder?: string
  className?: string
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchSuggestions = useCallback(
    async (search: string) => {
      if (search.length < 1) {
        setSuggestions([])
        return
      }
      setLoading(true)
      try {
        const results = await getSuggestions(search)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      }
      setLoading(false)
    },
    [getSuggestions]
  )

  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(value)
    }, 200)
    return () => clearTimeout(timer)
  }, [value, fetchSuggestions])

  useEffect(() => {
    if (showSuggestions) {
      updateDropdownPosition()
      const handleScroll = () => updateDropdownPosition()
      window.addEventListener('scroll', handleScroll, true)
      return () => window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showSuggestions, updateDropdownPosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (inputRef.current && !inputRef.current.contains(target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dropdown = showSuggestions && suggestions.length > 0 && (
    <div
      style={dropdownStyle}
      className="bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto"
    >
      {loading ? (
        <div className="p-2 text-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline" />
        </div>
      ) : (
        suggestions.map((suggestion) => (
          <div
            key={suggestion}
            className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
            onMouseDown={(e) => {
              e.preventDefault()
              onChange(suggestion)
              setShowSuggestions(false)
            }}
          >
            {suggestion}
          </div>
        ))
      )}
    </div>
  )

  return (
    <>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
      />
      {typeof window !== 'undefined' && createPortal(dropdown, document.body)}
    </>
  )
}

export function CatalogMaterialsTable({ materials: initialMaterials, categories: initialCategories }: CatalogMaterialsTableProps) {
  const [isPending, startTransition] = useTransition()

  // Estado de paginação e filtros
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [materials, setMaterials] = useState(initialMaterials)
  const [totalItems, setTotalItems] = useState(initialMaterials.length)
  const [categories, setCategories] = useState(initialCategories)
  const [isLoading, setIsLoading] = useState(false)

  // Estado de edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<CatalogMaterial>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newRowData, setNewRowData] = useState(getEmptyRow())

  // Estado de confirmação de delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const formatPrice = (price: number) => `${price.toFixed(2)} €`

  const formatPriceWithVat = (price: number, vatRate: number) => {
    const priceWithVat = price * (1 + vatRate / 100)
    return `${priceWithVat.toFixed(2)} €`
  }

  // Fetch data com filtros
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [materialsResult, categoriesResult] = await Promise.all([
        getCatalogMaterialsWithPagination({
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm || undefined,
          category: selectedCategory || undefined,
        }),
        getCatalogMaterialCategories(),
      ])
      setMaterials(materialsResult.data)
      setTotalItems(materialsResult.total)
      setCategories(categoriesResult)
    } catch (error) {
      console.error('Error fetching materials:', error)
      toast.error('Erro ao carregar materiais')
    }
    setIsLoading(false)
  }, [currentPage, itemsPerPage, searchTerm, selectedCategory])

  // Fetch quando filtros mudam
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchData])

  // Paginação
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  // Edição
  const startEditing = (material: CatalogMaterial) => {
    setEditingId(material.id)
    setEditingData({ ...material })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData({})
  }

  const saveEditing = async () => {
    if (!editingId) return

    startTransition(async () => {
      const result = await updateCatalogMaterial(editingId, editingData as Partial<CatalogMaterialInput>)
      if (result.success) {
        toast.success('Material atualizado')
        setEditingId(null)
        setEditingData({})
        fetchData()
      } else {
        toast.error(result.error || 'Erro ao atualizar')
      }
    })
  }

  // Criar novo
  const startAddingNew = () => {
    setIsAddingNew(true)
    setNewRowData(getEmptyRow())
  }

  const cancelAddingNew = () => {
    setIsAddingNew(false)
    setNewRowData(getEmptyRow())
  }

  const saveNewRow = async () => {
    if (!newRowData.material_name.trim()) {
      toast.error('Nome do material é obrigatório')
      return
    }

    startTransition(async () => {
      const result = await createCatalogMaterial(newRowData as CatalogMaterialInput)
      if (result.success) {
        toast.success('Material criado')
        setIsAddingNew(false)
        setNewRowData(getEmptyRow())
        fetchData()
      } else {
        toast.error(result.error || 'Erro ao criar')
      }
    })
  }

  // Delete
  const confirmDelete = (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return

    startTransition(async () => {
      const result = await deleteCatalogMaterial(deleteId)
      if (result.success) {
        toast.success('Material eliminado')
        setDeleteConfirmOpen(false)
        setDeleteId(null)
        fetchData()
      } else {
        toast.error(result.error || 'Erro ao eliminar')
      }
    })
  }

  // Export
  const handleExportXLSX = async () => {
    try {
      const allMaterials = await getCatalogMaterialsForExport({
        category: selectedCategory || undefined,
        search: searchTerm || undefined,
      })

      const exportData = allMaterials.map((m) => ({
        'Nome do Material': m.material_name,
        'Categoria': m.category || '',
        'Preço s/ IVA': m.price_without_vat,
        'IVA (%)': m.vat_rate,
        'Preço c/ IVA': m.price_without_vat * (1 + m.vat_rate / 100),
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Materiais')
      XLSX.writeFile(wb, `materiais_canalizador_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Ficheiro exportado')
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Erro ao exportar')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Materiais de Canalizador</CardTitle>
              <CardDescription>
                {totalItems} materiais no catálogo
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportXLSX}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button
              size="sm"
              onClick={startAddingNew}
              disabled={isAddingNew}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Material
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar material..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={selectedCategory || 'all'}
            onValueChange={(value) => {
              setSelectedCategory(value === 'all' ? '' : value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Material</TableHead>
                <TableHead className="min-w-[150px]">Categoria</TableHead>
                <TableHead className="text-right min-w-[120px]">Preço s/ IVA</TableHead>
                <TableHead className="text-right min-w-[80px]">IVA</TableHead>
                <TableHead className="text-right min-w-[120px]">Preço c/ IVA</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Nova linha */}
              {isAddingNew && (
                <TableRow className="bg-green-50 dark:bg-green-950/20">
                  <TableCell>
                    <Input
                      value={newRowData.material_name}
                      onChange={(e) =>
                        setNewRowData({ ...newRowData, material_name: e.target.value })
                      }
                      placeholder="Nome do material"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <AutocompleteInput
                      value={newRowData.category || ''}
                      onChange={(value) =>
                        setNewRowData({ ...newRowData, category: value || null })
                      }
                      getSuggestions={getMaterialCategorySuggestions}
                      placeholder="Categoria"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={newRowData.price_without_vat}
                      onChange={(e) =>
                        setNewRowData({
                          ...newRowData,
                          price_without_vat: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-8 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={newRowData.vat_rate}
                      onChange={(e) =>
                        setNewRowData({
                          ...newRowData,
                          vat_rate: parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-8 text-right w-20"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPriceWithVat(newRowData.price_without_vat, newRowData.vat_rate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={saveNewRow}
                        disabled={isPending}
                        className="h-7 w-7 p-0 text-green-600"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelAddingNew}
                        disabled={isPending}
                        className="h-7 w-7 p-0 text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum material encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((item) => {
                  const isEditing = editingId === item.id

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingData.material_name || ''}
                            onChange={(e) =>
                              setEditingData({ ...editingData, material_name: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="font-medium">{item.material_name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <AutocompleteInput
                            value={editingData.category || ''}
                            onChange={(value) =>
                              setEditingData({ ...editingData, category: value || null })
                            }
                            getSuggestions={getMaterialCategorySuggestions}
                            placeholder="Categoria"
                            className="h-8"
                          />
                        ) : (
                          <span className="text-muted-foreground">{item.category || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingData.price_without_vat ?? 0}
                            onChange={(e) =>
                              setEditingData({
                                ...editingData,
                                price_without_vat: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-right"
                          />
                        ) : (
                          formatPrice(item.price_without_vat)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingData.vat_rate ?? 23}
                            onChange={(e) =>
                              setEditingData({
                                ...editingData,
                                vat_rate: parseInt(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-right w-20"
                          />
                        ) : (
                          `${item.vat_rate}%`
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {isEditing
                          ? formatPriceWithVat(
                              editingData.price_without_vat ?? 0,
                              editingData.vat_rate ?? 23
                            )
                          : formatPriceWithVat(item.price_without_vat, item.vat_rate)}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={saveEditing}
                              disabled={isPending}
                              className="h-7 w-7 p-0 text-green-600"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              disabled={isPending}
                              className="h-7 w-7 p-0 text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(item)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => confirmDelete(item.id)}
                              className="h-7 w-7 p-0 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrar</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>por página</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages || 1}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Dialog de confirmação de delete */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar material</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar este material? Esta ação pode ser revertida pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
