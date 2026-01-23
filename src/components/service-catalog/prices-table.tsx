'use client'

import { useState, useEffect, useTransition, useCallback, useRef, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Upload,
  Trash2,
  FileText,
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
import { useRouter } from 'next/navigation'
import {
  getCatalogPrices,
  getCatalogServiceGroups,
  getCatalogPricesForExport,
  createCatalogPrice,
  updateCatalogPrice,
  deleteCatalogPrice,
  getServiceNameSuggestions,
  getUnitDescriptionSuggestions,
} from '@/lib/service-catalog/actions'
import type { CatalogPrice, CatalogPriceInput } from '@/lib/service-catalog/actions'
import { generateCatalogPricePDFHTML } from '@/lib/service-catalog/pdf-generator'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface CatalogPricesTableProps {
  prices: CatalogPrice[]
  clusters: string[]
}

const ITEMS_PER_PAGE_OPTIONS = [100, 200, 500, 1000]

// Colunas de preços para a tabela
const PRICE_COLUMNS = [
  { key: 'price_base', label: 'Preço Base' },
  { key: 'price_new_visit', label: 'Nova Visita' },
  { key: 'price_extra_night', label: 'Extra Noite' },
  { key: 'price_hour_no_materials', label: 'Hora (s/ mat.)' },
  { key: 'price_hour_with_materials', label: 'Hora (c/ mat.)' },
  { key: 'price_cleaning', label: 'Limpeza' },
  { key: 'price_cleaning_treatments', label: 'Limp. Tratam.' },
  { key: 'price_cleaning_imper', label: 'Limp. Imper.' },
  { key: 'price_cleaning_imper_treatments', label: 'Limp. Imper. Tratam.' },
] as const

type PriceKey = (typeof PRICE_COLUMNS)[number]['key']

// Larguras mínimas e padrão das colunas
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  service_name: 200,
  cluster: 120,
  service_group: 150,
  unit_description: 180,
  typology: 120,
  vat_rate: 80,
  price_base: 110,
  price_new_visit: 110,
  price_extra_night: 110,
  price_hour_no_materials: 110,
  price_hour_with_materials: 110,
  price_cleaning: 110,
  price_cleaning_treatments: 110,
  price_cleaning_imper: 110,
  price_cleaning_imper_treatments: 130,
  actions: 100,
}

const MIN_COLUMN_WIDTH = 80

// Estado vazio para nova linha
const getEmptyRow = (): Omit<CatalogPrice, 'id' | 'created_at' | 'updated_at'> => ({
  service_name: '',
  cluster: '',
  service_group: '',
  unit_description: '',
  typology: null,
  vat_rate: 23,
  launch_date: null,
  price_base: null,
  price_new_visit: null,
  price_extra_night: null,
  price_hour_no_materials: null,
  price_hour_with_materials: null,
  price_cleaning: null,
  price_cleaning_treatments: null,
  price_cleaning_imper: null,
  price_cleaning_imper_treatments: null,
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
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback(
    async (search: string) => {
      if (search.length < 2) {
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

  // Calcular posição do dropdown baseado no input
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
      // Atualizar posição no scroll
      const handleScroll = () => updateDropdownPosition()
      window.addEventListener('scroll', handleScroll, true)
      return () => window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showSuggestions, updateDropdownPosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setShowSuggestions(true)
          updateDropdownPosition()
        }}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && (suggestions.length > 0 || loading) && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border rounded-md shadow-lg max-h-48 overflow-auto"
          >
            {loading ? (
              <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                A carregar...
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  onClick={() => {
                    onChange(suggestion)
                    setShowSuggestions(false)
                  }}
                >
                  {suggestion}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

export function CatalogPricesTable({ prices, clusters }: CatalogPricesTableProps) {
  const [data, setData] = useState<CatalogPrice[]>(prices || [])
  const [total, setTotal] = useState(prices?.length || 0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)
  const [search, setSearch] = useState('')
  const [cluster, setCluster] = useState<string>('')
  const [serviceGroup, setServiceGroup] = useState<string>('')
  const [serviceGroups, setServiceGroups] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  // Estado de edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<CatalogPrice>>({})

  // Estado de nova linha
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newRow, setNewRow] = useState(getEmptyRow())

  // Estado de export
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Estado de import
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Estado de larguras das colunas (redimensionáveis)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)

  // Handlers para redimensionar colunas
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnKey: string) => {
      e.preventDefault()
      e.stopPropagation()
      setResizingColumn(columnKey)
      setResizeStartX(e.clientX)
      setResizeStartWidth(columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 100)
    },
    [columnWidths]
  )

  useEffect(() => {
    if (!resizingColumn) return

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX
      const newWidth = Math.max(MIN_COLUMN_WIDTH, resizeStartWidth + diff)
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: newWidth,
      }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth])

  // Componente para header redimensionável
  const ResizableHeader = useMemo(
    () =>
      function ResizableHeaderInner({
        columnKey,
        children,
        className = '',
        sticky = false,
      }: {
        columnKey: string
        children: React.ReactNode
        className?: string
        sticky?: boolean
      }) {
        const width = columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 100
        return (
          <TableHead
            className={`relative select-none ${sticky ? 'sticky left-0 bg-background z-10' : ''} ${className}`}
            style={{ width, minWidth: width, maxWidth: width }}
          >
            <div className="flex items-center justify-between pr-2">
              <span className="truncate">{children}</span>
              <div
                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
                onMouseDown={(e) => handleResizeStart(e, columnKey)}
              />
            </div>
          </TableHead>
        )
      },
    [columnWidths, handleResizeStart]
  )

  // Atualizar grupos quando cluster muda
  useEffect(() => {
    if (cluster) {
      getCatalogServiceGroups(cluster).then(setServiceGroups)
    } else {
      getCatalogServiceGroups().then(setServiceGroups)
    }
    setServiceGroup('')
  }, [cluster])

  // Buscar dados
  const fetchData = useCallback(() => {
    startTransition(async () => {
      const result = await getCatalogPrices({
        cluster: cluster || undefined,
        serviceGroup: serviceGroup || undefined,
        search: search || undefined,
        page,
        limit: itemsPerPage,
      })
      setData(result.data)
      setTotal(result.total)
    })
  }, [page, cluster, serviceGroup, search, itemsPerPage])

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

  const totalPages = Math.ceil(total / itemsPerPage)

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return `${price.toFixed(2)} €`
  }

  const getClusterColor = (c: string) => {
    switch (c) {
      case 'Casa':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Saúde e bem estar':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Empresas':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'Luxo':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
      case 'Pete':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // Iniciar edição
  const startEditing = (item: CatalogPrice) => {
    setEditingId(item.id)
    setEditValues({ ...item })
  }

  // Cancelar edição
  const cancelEditing = () => {
    setEditingId(null)
    setEditValues({})
  }

  // Guardar edição
  const saveEditing = async () => {
    if (!editingId) return

    // Validação
    if (!editValues.service_name?.trim()) {
      toast.error('Nome do serviço é obrigatório')
      return
    }
    if (!editValues.cluster?.trim()) {
      toast.error('Cluster é obrigatório')
      return
    }
    if (!editValues.service_group?.trim()) {
      toast.error('Grupo de serviço é obrigatório')
      return
    }
    if (!editValues.unit_description?.trim()) {
      toast.error('Unidade/Descrição é obrigatória')
      return
    }

    const result = await updateCatalogPrice(editingId, editValues)
    if (result.success) {
      toast.success('Serviço atualizado com sucesso')
      cancelEditing()
      fetchData()
    } else {
      toast.error(result.error || 'Erro ao atualizar serviço')
    }
  }

  // Eliminar serviço
  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este serviço?')) return

    const result = await deleteCatalogPrice(id)
    if (result.success) {
      toast.success('Serviço eliminado com sucesso')
      fetchData()
    } else {
      toast.error(result.error || 'Erro ao eliminar serviço')
    }
  }

  // Cancelar nova linha
  const cancelNewRow = () => {
    setIsAddingNew(false)
    setNewRow(getEmptyRow())
  }

  // Guardar nova linha
  const saveNewRow = async () => {
    // Validação
    if (!newRow.service_name?.trim()) {
      toast.error('Nome do serviço é obrigatório')
      return
    }
    if (!newRow.cluster?.trim()) {
      toast.error('Cluster é obrigatório')
      return
    }
    if (!newRow.service_group?.trim()) {
      toast.error('Grupo de serviço é obrigatório')
      return
    }
    if (!newRow.unit_description?.trim()) {
      toast.error('Unidade/Descrição é obrigatória')
      return
    }

    const result = await createCatalogPrice(newRow as CatalogPriceInput)
    if (result.success) {
      toast.success('Serviço criado com sucesso')
      cancelNewRow()
      fetchData()
    } else {
      toast.error(result.error || 'Erro ao criar serviço')
    }
  }

  // Export XLSX
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const exportData = await getCatalogPricesForExport({
        cluster: cluster || undefined,
        serviceGroup: serviceGroup || undefined,
        search: search || undefined,
      })

      // Preparar dados para Excel
      const excelData = exportData.map((item) => ({
        'Nome do Serviço': item.service_name,
        Cluster: item.cluster,
        'Grupo de Serviço': item.service_group || '',
        'Unidade/Descrição': item.unit_description,
        Tipologia: item.typology || '',
        'IVA (%)': item.vat_rate,
        'Data Lançamento': item.launch_date || '',
        'Preço Base': item.price_base,
        'Nova Visita': item.price_new_visit,
        'Extra Noite': item.price_extra_night,
        'Hora (s/ mat.)': item.price_hour_no_materials,
        'Hora (c/ mat.)': item.price_hour_with_materials,
        Limpeza: item.price_cleaning,
        'Limpeza Tratamentos': item.price_cleaning_treatments,
        'Limpeza Imper.': item.price_cleaning_imper,
        'Limpeza Imper. Tratam.': item.price_cleaning_imper_treatments,
      }))

      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Catálogo de Preços')

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 30 }, // service_name
        { wch: 15 }, // cluster
        { wch: 20 }, // service_group
        { wch: 25 }, // unit_description
        { wch: 15 }, // typology
        { wch: 8 }, // vat_rate
        { wch: 12 }, // launch_date
        { wch: 12 }, // price_base
        { wch: 12 }, // price_new_visit
        { wch: 12 }, // price_extra_night
        { wch: 14 }, // price_hour_no_materials
        { wch: 14 }, // price_hour_with_materials
        { wch: 12 }, // price_cleaning
        { wch: 18 }, // price_cleaning_treatments
        { wch: 14 }, // price_cleaning_imper
        { wch: 20 }, // price_cleaning_imper_treatments
      ]
      ws['!cols'] = colWidths

      // Gerar ficheiro
      const fileName = `catalogo-precos-${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast.success(`Exportados ${exportData.length} registos`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Erro ao exportar dados')
    }
    setIsExporting(false)
  }

  // Export PDF
  const handleExportPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // Buscar todos os dados (sem paginação) respeitando filtros
      const exportData = await getCatalogPricesForExport({
        cluster: cluster || undefined,
        serviceGroup: serviceGroup || undefined,
        search: search || undefined,
      })

      if (exportData.length === 0) {
        toast.error('Nenhum serviço encontrado para exportar')
        setIsGeneratingPDF(false)
        return
      }

      // Gerar HTML do PDF
      const html = generateCatalogPricePDFHTML(exportData)

      // Criar blob e abrir em nova janela
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const windowRef = window.open(url, '_blank')

      if (windowRef) {
        // Permitir que a janela carregue antes de imprimir
        setTimeout(() => {
          windowRef.print()
        }, 500)
        toast.success('PDF gerado com sucesso')
      } else {
        toast.error('Não foi possível abrir a janela de impressão')
      }
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Erro ao gerar PDF')
    }
    setIsGeneratingPDF(false)
  }

  // Clusters para autocomplete
  const getClusterSuggestions = async (search: string): Promise<string[]> => {
    if (!search) return clusters
    return clusters.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
  }

  // Service groups para autocomplete
  const getServiceGroupSuggestions = async (search: string): Promise<string[]> => {
    if (!search) return serviceGroups
    const allGroups = await getCatalogServiceGroups()
    return allGroups.filter((g) => g.toLowerCase().includes(search.toLowerCase()))
  }

  // Handlers de import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Por favor selecione um ficheiro Excel (.xlsx ou .xls)')
        return
      }
      setImportFile(selectedFile)
      setShowImportConfirm(true)
    }
  }

  const handleImport = async () => {
    if (!importFile) return

    setShowImportConfirm(false)
    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/service-catalog/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Importação concluída: ${data.pricesCount} preços, ${data.materialsCount} materiais`)
        router.refresh()
        fetchData()
      } else {
        toast.error(data.error || 'Erro ao importar ficheiro')
      }
    } catch {
      toast.error('Erro de rede ao enviar ficheiro')
    } finally {
      setIsImporting(false)
      setImportFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImportCancel = () => {
    setShowImportConfirm(false)
    setImportFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Renderizar célula editável
  const renderEditableCell = (
    value: string | number | null,
    field: keyof CatalogPrice,
    type: 'text' | 'number' | 'autocomplete' = 'text',
    getSuggestionsFn?: (search: string) => Promise<string[]>
  ) => {
    const rawValue = editValues[field] !== undefined ? editValues[field] : value
    // Garantir que o valor é string ou número (não booleano)
    const currentValue = typeof rawValue === 'boolean' ? null : rawValue

    if (type === 'autocomplete' && getSuggestionsFn) {
      return (
        <AutocompleteInput
          value={(currentValue as string) || ''}
          onChange={(val) => setEditValues({ ...editValues, [field]: val })}
          getSuggestions={getSuggestionsFn}
          className="h-8 min-w-[120px]"
        />
      )
    }

    if (type === 'number') {
      return (
        <Input
          type="number"
          step="0.01"
          value={currentValue ?? ''}
          onChange={(e) =>
            setEditValues({
              ...editValues,
              [field]: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
          className="h-8 w-24"
        />
      )
    }

    return (
      <Input
        value={(currentValue as string) || ''}
        onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
        className="h-8 min-w-[100px]"
      />
    )
  }

  // Renderizar célula para nova linha
  const renderNewRowCell = (
    field: keyof typeof newRow,
    type: 'text' | 'number' | 'autocomplete' = 'text',
    getSuggestionsFn?: (search: string) => Promise<string[]>
  ) => {
    const rawValue = newRow[field]
    // Garantir que o valor é string ou número (não booleano)
    const value = typeof rawValue === 'boolean' ? null : rawValue

    if (type === 'autocomplete' && getSuggestionsFn) {
      return (
        <AutocompleteInput
          value={(value as string) || ''}
          onChange={(val) => setNewRow({ ...newRow, [field]: val })}
          getSuggestions={getSuggestionsFn}
          className="h-8 min-w-[120px]"
        />
      )
    }

    if (type === 'number') {
      return (
        <Input
          type="number"
          step="0.01"
          value={value ?? ''}
          onChange={(e) =>
            setNewRow({
              ...newRow,
              [field]: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
          className="h-8 w-24"
        />
      )
    }

    return (
      <Input
        value={(value as string) || ''}
        onChange={(e) => setNewRow({ ...newRow, [field]: e.target.value })}
        className="h-8 min-w-[100px]"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros e Ações */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar serviço..."
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

        <Select value={serviceGroup} onValueChange={setServiceGroup}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os grupos</SelectItem>
            {serviceGroups.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingNew(true)}
          disabled={isAddingNew}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          Exportar XLSX
        </Button>

        {/* Input hidden para import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="excel-import"
          disabled={isImporting}
        />
        <label htmlFor="excel-import">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={isImporting}
            asChild
          >
            <span>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Importar XLSX
            </span>
          </Button>
        </label>

        {isPending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Tabela com scroll horizontal */}
      <div className={`rounded-md border overflow-x-auto ${resizingColumn ? 'select-none' : ''}`}>
        <Table style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
          <TableHeader>
            <TableRow>
              <ResizableHeader columnKey="service_name" sticky>
                Serviço
              </ResizableHeader>
              <ResizableHeader columnKey="cluster">Cluster</ResizableHeader>
              <ResizableHeader columnKey="service_group">Grupo</ResizableHeader>
              <ResizableHeader columnKey="unit_description">Unidade/Variante</ResizableHeader>
              <ResizableHeader columnKey="typology">Tipologia</ResizableHeader>
              <ResizableHeader columnKey="vat_rate" className="text-right">
                IVA
              </ResizableHeader>
              {PRICE_COLUMNS.map((col) => (
                <ResizableHeader key={col.key} columnKey={col.key} className="text-right">
                  {col.label}
                </ResizableHeader>
              ))}
              <TableHead className="sticky right-0 bg-background z-10 w-[100px]">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Nova linha */}
            {isAddingNew && (
              <TableRow className="bg-green-50">
                <TableCell
                  className="sticky left-0 bg-green-50 z-10"
                  style={{ width: columnWidths.service_name, minWidth: columnWidths.service_name }}
                >
                  {renderNewRowCell('service_name', 'autocomplete', getServiceNameSuggestions)}
                </TableCell>
                <TableCell style={{ width: columnWidths.cluster, minWidth: columnWidths.cluster }}>
                  {renderNewRowCell('cluster', 'autocomplete', getClusterSuggestions)}
                </TableCell>
                <TableCell style={{ width: columnWidths.service_group, minWidth: columnWidths.service_group }}>
                  {renderNewRowCell('service_group', 'autocomplete', getServiceGroupSuggestions)}
                </TableCell>
                <TableCell style={{ width: columnWidths.unit_description, minWidth: columnWidths.unit_description }}>
                  {renderNewRowCell(
                    'unit_description',
                    'autocomplete',
                    getUnitDescriptionSuggestions
                  )}
                </TableCell>
                <TableCell style={{ width: columnWidths.typology, minWidth: columnWidths.typology }}>
                  {renderNewRowCell('typology', 'text')}
                </TableCell>
                <TableCell style={{ width: columnWidths.vat_rate, minWidth: columnWidths.vat_rate }}>
                  {renderNewRowCell('vat_rate', 'number')}
                </TableCell>
                {PRICE_COLUMNS.map((col) => (
                  <TableCell key={col.key} style={{ width: columnWidths[col.key], minWidth: columnWidths[col.key] }}>
                    {renderNewRowCell(col.key, 'number')}
                  </TableCell>
                ))}
                <TableCell className="sticky right-0 bg-green-50 z-10" style={{ width: 100 }}>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveNewRow}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelNewRow}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Dados existentes */}
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7 + PRICE_COLUMNS.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const isEditing = editingId === item.id

                return (
                  <TableRow key={item.id} className={isEditing ? 'bg-blue-50' : undefined}>
                    <TableCell
                      className={`sticky left-0 z-10 font-medium ${isEditing ? 'bg-blue-50' : 'bg-background'}`}
                      style={{ width: columnWidths.service_name, minWidth: columnWidths.service_name }}
                    >
                      {isEditing ? (
                        renderEditableCell(
                          item.service_name,
                          'service_name',
                          'autocomplete',
                          getServiceNameSuggestions
                        )
                      ) : (
                        <span className="truncate block" style={{ maxWidth: columnWidths.service_name - 16 }}>
                          {item.service_name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell style={{ width: columnWidths.cluster, minWidth: columnWidths.cluster }}>
                      {isEditing ? (
                        renderEditableCell(item.cluster, 'cluster', 'autocomplete', getClusterSuggestions)
                      ) : (
                        <Badge variant="secondary" className={getClusterColor(item.cluster)}>
                          {item.cluster}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell style={{ width: columnWidths.service_group, minWidth: columnWidths.service_group }}>
                      {isEditing ? (
                        renderEditableCell(
                          item.service_group,
                          'service_group',
                          'autocomplete',
                          getServiceGroupSuggestions
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm truncate block" style={{ maxWidth: columnWidths.service_group - 16 }}>
                          {item.service_group || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell style={{ width: columnWidths.unit_description, minWidth: columnWidths.unit_description }}>
                      {isEditing ? (
                        renderEditableCell(
                          item.unit_description,
                          'unit_description',
                          'autocomplete',
                          getUnitDescriptionSuggestions
                        )
                      ) : (
                        <span className="text-sm truncate block" style={{ maxWidth: columnWidths.unit_description - 16 }}>
                          {item.unit_description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell style={{ width: columnWidths.typology, minWidth: columnWidths.typology }}>
                      {isEditing ? (
                        renderEditableCell(item.typology, 'typology', 'text')
                      ) : (
                        <span className="text-sm text-muted-foreground truncate block" style={{ maxWidth: columnWidths.typology - 16 }}>
                          {item.typology || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" style={{ width: columnWidths.vat_rate, minWidth: columnWidths.vat_rate }}>
                      {isEditing ? (
                        renderEditableCell(item.vat_rate, 'vat_rate', 'number')
                      ) : (
                        `${item.vat_rate}%`
                      )}
                    </TableCell>
                    {PRICE_COLUMNS.map((col) => (
                      <TableCell
                        key={col.key}
                        className="text-right"
                        style={{ width: columnWidths[col.key], minWidth: columnWidths[col.key] }}
                      >
                        {isEditing
                          ? renderEditableCell(item[col.key], col.key, 'number')
                          : formatPrice(item[col.key])}
                      </TableCell>
                    ))}
                    <TableCell
                      className={`sticky right-0 z-10 ${isEditing ? 'bg-blue-50' : 'bg-background'}`}
                      style={{ width: 100 }}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={saveEditing}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEditing(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(item.id)}
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
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            A mostrar {data.length} de {total} resultados
          </p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(val) => {
              setItemsPerPage(parseInt(val))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt.toString()}>
                  {opt} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {/* Dialog de confirmação de import */}
      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá substituir todos os preços existentes pelos valores do novo
              ficheiro. Tem a certeza que deseja continuar?
              <br />
              <br />
              <strong>Ficheiro:</strong> {importFile?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleImportCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>Importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
