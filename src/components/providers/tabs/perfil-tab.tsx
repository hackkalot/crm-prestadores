'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  Wrench,
  Users,
  User,
  Clock,
  FileCheck,
  Globe,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  BarChart3,
  Star,
  Database,
  CheckCircle2,
  XCircle,
  Briefcase,
  Award,
  Building2,
  Mail,
  Phone,
  CreditCard,
  Shield,
  Layers,
  Package,
  Calendar,
  ChevronDown,
  Pencil,
  Check,
  X as XIcon,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { updateProviderProfile, updateProviderFormsFields } from '@/lib/providers/profile-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { EditCoverageServicesDialog } from '@/components/providers/edit-coverage-services-dialog'

interface PerfilTabProps {
  provider: {
    id: string
    name: string
    email: string
    phone?: string | null
    entity_type: string
    nif?: string | null
    website?: string | null
    facebook_url?: string | null
    instagram_url?: string | null
    linkedin_url?: string | null
    twitter_url?: string | null
    districts?: string[] | null
    services?: string[] | null
    num_technicians?: number | null
    has_admin_team?: boolean | null
    has_own_transport?: boolean | null
    working_hours?: string | null
    iban?: string | null
    activity_proof_url?: string | null
    // Backoffice fields
    backoffice_provider_id?: number | null
    backoffice_password_defined?: boolean | null
    backoffice_last_login?: string | null
    backoffice_is_active?: boolean | null
    backoffice_status?: string | null
    backoffice_do_recurrence?: boolean | null
    backoffice_synced_at?: string | null
    categories?: string[] | null
    counties?: string[] | null
    total_requests?: number | null
    active_requests?: number | null
    cancelled_requests?: number | null
    completed_requests?: number | null
    requests_received?: number | null
    requests_accepted?: number | null
    requests_expired?: number | null
    requests_rejected?: number | null
    service_rating?: number | null
    technician_rating?: number | null
    forms_submitted_at?: string | null
    // Forms data fields (now stored directly in providers)
    has_activity_declaration?: boolean | null
    has_liability_insurance?: boolean | null
    has_work_accidents_insurance?: boolean | null
    certifications?: string[] | null
    works_with_platforms?: string[] | null
    available_weekdays?: string[] | null
    work_hours_start?: string | null
    work_hours_end?: string | null
    has_computer?: boolean | null
    own_equipment?: string[] | null
  }
  selectedServicesDetails?: Record<string, Record<string, Array<{
    id: string
    service_name: string
    cluster: string
    service_group: string
    unit_description?: string | null
    typology?: string | null
  }>>> | null
  allServicesData?: Record<string, Record<string, any[]>> | null
}

const entityTypeLabels: Record<string, string> = {
  tecnico: 'Técnico',
  eni: 'ENI',
  empresa: 'Empresa',
}

interface EditableFieldProps {
  label: string
  value?: string | number | null
  icon?: any
  field: string
  type?: 'text' | 'email' | 'tel'
  onSave: (field: string, value: string) => Promise<void>
}

function EditableField({ label, value, icon: Icon, field, type = 'text', onSave }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value?.toString() || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(field, editValue)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value?.toString() || '')
    setIsEditing(false)
  }

  if (!value && !isEditing) return null

  return (
    <div className="flex items-center gap-3 py-2 group">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <XIcon className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate flex-1">{value}</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface EditableSelectFieldProps {
  label: string
  value: string
  icon?: any
  field: string
  options: Array<{ value: string; label: string }>
  onSave: (field: string, value: string) => Promise<void>
}

function EditableSelectField({ label, value, icon: Icon, field, options, onSave }: EditableSelectFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(field, editValue)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const currentLabel = options.find(o => o.value === value)?.label || value

  return (
    <div className="flex items-center gap-3 py-2 group">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <Select value={editValue} onValueChange={setEditValue}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <XIcon className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate flex-1">{currentLabel}</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: any }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-center gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, variant = 'default' }: {
  label: string
  value?: number | null
  icon: any
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}) {
  const colors = {
    default: 'bg-blue-100 dark:bg-blue-950 text-blue-600',
    success: 'bg-green-100 dark:bg-green-950 text-green-600',
    warning: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-600',
    destructive: 'bg-red-100 dark:bg-red-950 text-red-600',
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colors[variant]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value ?? 0}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function PerfilTab({ provider, selectedServicesDetails, allServicesData }: PerfilTabProps) {
  const router = useRouter()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<'documentation' | 'resources' | 'availability' | 'coverage' | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const hasBackofficeData = !!provider.backoffice_provider_id
  const hasRatings = !!(provider.service_rating || provider.technician_rating)
  // Forms data is now stored directly in provider
  const hasFormsData = !!provider.forms_submitted_at

  const handleFieldSave = async (field: string, value: string) => {
    const result = await updateProviderProfile(provider.id, { [field]: value || null })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Campo atualizado com sucesso')
      router.refresh()
    }
  }

  const handleEditCard = (card: 'documentation' | 'resources' | 'availability' | 'coverage') => {
    setEditingCard(card)

    // Initialize editing data based on card type - now from provider directly
    if (card === 'documentation') {
      setEditingData({
        has_activity_declaration: provider.has_activity_declaration ?? false,
        has_liability_insurance: provider.has_liability_insurance ?? false,
        has_work_accidents_insurance: provider.has_work_accidents_insurance ?? false,
        certifications: provider.certifications || [],
        works_with_platforms: provider.works_with_platforms || [],
      })
    } else if (card === 'resources') {
      setEditingData({
        has_own_transport: provider.has_own_transport ?? false,
        has_computer: provider.has_computer ?? false,
        num_technicians: provider.num_technicians ?? 0,
        own_equipment: provider.own_equipment || [],
      })
    } else if (card === 'availability') {
      setEditingData({
        available_weekdays: provider.available_weekdays || [],
        work_hours_start: provider.work_hours_start || '',
        work_hours_end: provider.work_hours_end || '',
      })
    } else if (card === 'coverage') {
      setEditDialogOpen(true)
      return
    }
  }

  const handleCancelEdit = () => {
    setEditingCard(null)
    setEditingData(null)
  }

  const handleSaveCard = async () => {
    if (!editingCard || !editingData) return

    setIsSaving(true)

    if (editingCard === 'coverage') {
      // Coverage uses the existing dialog
      setEditDialogOpen(false)
    } else {
      // Update provider forms fields directly
      const result = await updateProviderFormsFields(provider.id, editingData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Dados atualizados com sucesso')
        setEditingCard(null)
        setEditingData(null)
        router.refresh()
      }
    }

    setIsSaving(false)
  }

  const entityTypeOptions = [
    { value: 'tecnico', label: 'Técnico' },
    { value: 'eni', label: 'ENI' },
    { value: 'empresa', label: 'Empresa' },
  ]

  return (
    <div className="space-y-6">
      {/* INFORMAÇÕES BÁSICAS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 divide-y md:divide-y-0">
            <EditableField label="Nome" value={provider.name} icon={Building2} field="name" onSave={handleFieldSave} />
            <EditableField label="Email" value={provider.email} icon={Mail} field="email" type="email" onSave={handleFieldSave} />
            <EditableField label="Telefone" value={provider.phone} icon={Phone} field="phone" type="tel" onSave={handleFieldSave} />
            <EditableField label="NIF" value={provider.nif} icon={CreditCard} field="nif" onSave={handleFieldSave} />
            <EditableSelectField
              label="Tipo de Entidade"
              value={provider.entity_type}
              icon={Layers}
              field="entity_type"
              options={entityTypeOptions}
              onSave={handleFieldSave}
            />
            <EditableField label="IBAN" value={provider.iban} icon={CreditCard} field="iban" onSave={handleFieldSave} />
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <EditableField label="Website" value={provider.website} icon={Globe} field="website" onSave={handleFieldSave} />
            <EditableField label="Facebook" value={provider.facebook_url} icon={Facebook} field="facebook_url" onSave={handleFieldSave} />
            <EditableField label="Instagram" value={provider.instagram_url} icon={Instagram} field="instagram_url" onSave={handleFieldSave} />
            <EditableField label="LinkedIn" value={provider.linkedin_url} icon={Linkedin} field="linkedin_url" onSave={handleFieldSave} />
            <EditableField label="Twitter" value={provider.twitter_url} icon={Twitter} field="twitter_url" onSave={handleFieldSave} />
          </div>
        </CardContent>
      </Card>

      {/* DOCUMENTAÇÃO E CERTIFICAÇÕES (Forms Data) */}
      {hasFormsData && (
        <Card className="group relative">
          {editingCard === 'documentation' ? (
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveCard}
                disabled={isSaving}
              >
                {isSaving ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={() => handleEditCard('documentation')}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Documentação e Certificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingCard === 'documentation' ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <Checkbox
                        id="has_activity_declaration"
                        checked={editingData.has_activity_declaration}
                        onCheckedChange={(checked) =>
                          setEditingData({ ...editingData, has_activity_declaration: checked })
                        }
                      />
                      <label
                        htmlFor="has_activity_declaration"
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        Declaração de Atividade
                      </label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <Checkbox
                        id="has_liability_insurance"
                        checked={editingData.has_liability_insurance}
                        onCheckedChange={(checked) =>
                          setEditingData({ ...editingData, has_liability_insurance: checked })
                        }
                      />
                      <label
                        htmlFor="has_liability_insurance"
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        Seguro RC
                      </label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <Checkbox
                        id="has_work_accidents_insurance"
                        checked={editingData.has_work_accidents_insurance}
                        onCheckedChange={(checked) =>
                          setEditingData({ ...editingData, has_work_accidents_insurance: checked })
                        }
                      />
                      <label
                        htmlFor="has_work_accidents_insurance"
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        Seguro Acidentes de Trabalho
                      </label>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certificações
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Adicionar certificação"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              e.preventDefault()
                              const newCert = e.currentTarget.value.trim()
                              if (!editingData.certifications.includes(newCert)) {
                                setEditingData({
                                  ...editingData,
                                  certifications: [...editingData.certifications, newCert],
                                })
                              }
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            if (input?.value.trim()) {
                              const newCert = input.value.trim()
                              if (!editingData.certifications.includes(newCert)) {
                                setEditingData({
                                  ...editingData,
                                  certifications: [...editingData.certifications, newCert],
                                })
                              }
                              input.value = ''
                            }
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editingData.certifications.map((cert: string) => (
                          <Badge key={cert} variant="secondary" className="gap-1">
                            {cert}
                            <button
                              type="button"
                              onClick={() =>
                                setEditingData({
                                  ...editingData,
                                  certifications: editingData.certifications.filter((c: string) => c !== cert),
                                })
                              }
                              className="ml-1 hover:text-destructive"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Plataformas
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Adicionar plataforma"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              e.preventDefault()
                              const newPlatform = e.currentTarget.value.trim()
                              if (!editingData.works_with_platforms.includes(newPlatform)) {
                                setEditingData({
                                  ...editingData,
                                  works_with_platforms: [...editingData.works_with_platforms, newPlatform],
                                })
                              }
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            if (input?.value.trim()) {
                              const newPlatform = input.value.trim()
                              if (!editingData.works_with_platforms.includes(newPlatform)) {
                                setEditingData({
                                  ...editingData,
                                  works_with_platforms: [...editingData.works_with_platforms, newPlatform],
                                })
                              }
                              input.value = ''
                            }
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editingData.works_with_platforms.map((platform: string) => (
                          <Badge key={platform} variant="outline" className="gap-1">
                            {platform}
                            <button
                              type="button"
                              onClick={() =>
                                setEditingData({
                                  ...editingData,
                                  works_with_platforms: editingData.works_with_platforms.filter(
                                    (p: string) => p !== platform
                                  ),
                                })
                              }
                              className="ml-1 hover:text-destructive"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    {provider.has_activity_declaration ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">Declaração de Atividade</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-muted-foreground">Sem Declaração de Atividade</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    {provider.has_liability_insurance ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">Seguro RC</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-muted-foreground">Sem Seguro RC</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    {provider.has_work_accidents_insurance ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">Seguro Acidentes</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-muted-foreground">Sem Seguro Acidentes</span>
                      </>
                    )}
                  </div>
                </div>

                {(provider.certifications?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certificações
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {provider.certifications!.map((cert) => (
                        <Badge key={cert} variant="secondary">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(provider.works_with_platforms?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Plataformas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {provider.works_with_platforms!.map((platform) => (
                        <Badge key={platform} variant="outline">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {provider.forms_submitted_at && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Última atualização: {formatDateTime(provider.forms_submitted_at)}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* RECURSOS E DISPONIBILIDADE */}
      {hasFormsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="group relative">
            {editingCard === 'resources' ? (
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveCard}
                  disabled={isSaving}
                >
                  {isSaving ? 'A guardar...' : 'Guardar'}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={() => handleEditCard('resources')}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Recursos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingCard === 'resources' ? (
                <>
                  {/* Edit mode */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Checkbox
                        id="has_own_transport"
                        checked={editingData.has_own_transport}
                        onCheckedChange={(checked) =>
                          setEditingData({ ...editingData, has_own_transport: checked })
                        }
                      />
                      <Label htmlFor="has_own_transport" className="cursor-pointer flex-1">
                        Viatura própria
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Checkbox
                        id="has_computer"
                        checked={editingData.has_computer}
                        onCheckedChange={(checked) =>
                          setEditingData({ ...editingData, has_computer: checked })
                        }
                      />
                      <Label htmlFor="has_computer" className="cursor-pointer flex-1">
                        Computador
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="num_technicians">Número de técnicos</Label>
                      <Input
                        id="num_technicians"
                        type="number"
                        min="0"
                        value={editingData.num_technicians}
                        onChange={(e) =>
                          setEditingData({
                            ...editingData,
                            num_technicians: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Equipamento próprio</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Adicionar equipamento..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const input = e.currentTarget
                              const value = input.value.trim()
                              if (value && !editingData.own_equipment.includes(value)) {
                                setEditingData({
                                  ...editingData,
                                  own_equipment: [...editingData.own_equipment, value],
                                })
                                input.value = ''
                              }
                            }
                          }}
                        />
                      </div>
                      {editingData.own_equipment.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {editingData.own_equipment.map((equip: string) => (
                            <Badge
                              key={equip}
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() =>
                                setEditingData({
                                  ...editingData,
                                  own_equipment: editingData.own_equipment.filter(
                                    (e: string) => e !== equip
                                  ),
                                })
                              }
                            >
                              {equip}
                              <XIcon className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Display mode */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Viatura própria</span>
                    </div>
                    {provider.has_own_transport ? (
                      <Badge variant="success">Sim</Badge>
                    ) : (
                      <Badge variant="secondary">Não</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Computador</span>
                    </div>
                    {provider.has_computer ? (
                      <Badge variant="success">Sim</Badge>
                    ) : (
                      <Badge variant="secondary">Não</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Número de técnicos</span>
                    </div>
                    <Badge variant="outline">{provider.num_technicians ?? 0}</Badge>
                  </div>

                  {(provider.own_equipment?.length ?? 0) > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">Equipamento próprio</p>
                        <div className="flex flex-wrap gap-1.5">
                          {provider.own_equipment!.map((equip) => (
                            <Badge key={equip} variant="secondary" className="text-xs">
                              {equip}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="group relative">
            {editingCard === 'availability' ? (
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveCard}
                  disabled={isSaving}
                >
                  {isSaving ? 'A guardar...' : 'Guardar'}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={() => handleEditCard('availability')}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Disponibilidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingCard === 'availability' ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Horário</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Início</label>
                          <Input
                            type="time"
                            value={editingData?.work_hours_start || ''}
                            onChange={(e) => setEditingData({ ...editingData, work_hours_start: e.target.value })}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Fim</label>
                          <Input
                            type="time"
                            value={editingData?.work_hours_end || ''}
                            onChange={(e) => setEditingData({ ...editingData, work_hours_end: e.target.value })}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-3">Dias da semana</p>
                      <div className="space-y-2">
                        {[
                          { value: 'segunda', label: 'Segunda-feira' },
                          { value: 'terça', label: 'Terça-feira' },
                          { value: 'quarta', label: 'Quarta-feira' },
                          { value: 'quinta', label: 'Quinta-feira' },
                          { value: 'sexta', label: 'Sexta-feira' },
                          { value: 'sábado', label: 'Sábado' },
                          { value: 'domingo', label: 'Domingo' },
                        ].map((day) => (
                          <div key={day.value} className="flex items-center gap-2">
                            <Checkbox
                              id={`day-${day.value}`}
                              checked={editingData?.available_weekdays?.includes(day.value) || false}
                              onCheckedChange={(checked) => {
                                const currentDays = editingData?.available_weekdays || []
                                const newDays = checked
                                  ? [...currentDays, day.value]
                                  : currentDays.filter((d: string) => d !== day.value)
                                setEditingData({ ...editingData, available_weekdays: newDays })
                              }}
                            />
                            <label
                              htmlFor={`day-${day.value}`}
                              className="text-sm cursor-pointer select-none"
                            >
                              {day.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium mb-2">Horário</p>
                    <p className="text-sm text-muted-foreground">
                      {provider.work_hours_start || '--:--'} - {provider.work_hours_end || '--:--'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Dias da semana</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(provider.available_weekdays || []).map((day) => (
                        <Badge key={day} variant="outline" className="text-xs">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* COBERTURA - Mostrar sempre que tenha dados de forms (permite adicionar manualmente) */}
      {hasFormsData && (
        <Card className="group relative">
          {editingCard === 'coverage' ? (
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveCard}
                disabled={isSaving}
              >
                {isSaving ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleEditCard('coverage')}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Cobertura ({provider.counties?.length || 0} concelhos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {provider.counties && provider.counties.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {provider.counties.map((county) => (
                  <Badge key={county} variant="secondary" className="text-xs">
                    {county}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Sem área de cobertura definida</p>
                <Button
                  variant="outline"
                  onClick={() => handleEditCard('coverage')}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Adicionar Cobertura
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SERVIÇOS - Mostrar sempre que tenha dados de forms (permite adicionar manualmente) */}
      {hasFormsData && (
        <Card className="group relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Serviços ({provider.services?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedServicesDetails && Object.keys(selectedServicesDetails).length > 0 ? (
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(selectedServicesDetails).map(([cluster, groups]) => {
                  const clusterCount = Object.values(groups).flat().length
                  return (
                    <AccordionItem key={cluster} value={cluster} className="border rounded-lg transition-all duration-200">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:hidden justify-start! group">
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span className="font-medium text-left transition-colors">{cluster}</span>
                          <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-1.5 ml-auto transition-colors">
                            {clusterCount} {clusterCount === 1 ? 'serviço' : 'serviços'}
                            <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2">
                        <div className="pl-6 border-l-2 border-muted/50 space-y-3">
                          {Object.entries(groups).map(([group, servicesList]) => (
                            <div key={`${cluster}-${group}`} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {group}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {servicesList.length} {servicesList.length === 1 ? 'serviço' : 'serviços'}
                                </span>
                              </div>
                              <div className="space-y-1.5 pl-3">
                                {servicesList.map((service) => (
                                  <div key={service.id} className="text-sm flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <div className="flex-1">
                                      <p className="font-medium">{service.service_name}</p>
                                      {service.unit_description && (
                                        <p className="text-xs text-muted-foreground">{service.unit_description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Sem serviços selecionados</p>
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Adicionar Serviços
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* BACKOFFICE PERFORMANCE */}
      {hasBackofficeData && (
        <>
          {hasRatings && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Avaliações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {provider.service_rating && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Qualidade do Serviço</p>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold">{provider.service_rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">/ 5.0</span>
                      </div>
                    </div>
                  )}
                  {provider.technician_rating && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Simpatia do Técnico</p>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold">{provider.technician_rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">/ 5.0</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Estatísticas de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total" value={provider.total_requests} icon={Database} variant="default" />
                <StatCard label="Ativos" value={provider.active_requests} icon={Clock} variant="warning" />
                <StatCard label="Concluídos" value={provider.completed_requests} icon={CheckCircle2} variant="success" />
                <StatCard label="Cancelados" value={provider.cancelled_requests} icon={XCircle} variant="destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Dados do Backoffice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 divide-y md:divide-y-0">
                <InfoRow label="ID Backoffice" value={provider.backoffice_provider_id} icon={Database} />
                <InfoRow label="Status" value={provider.backoffice_status} icon={Shield} />
                <InfoRow
                  label="Último Login"
                  value={provider.backoffice_last_login ? formatDateTime(provider.backoffice_last_login) : 'Nunca'}
                  icon={Clock}
                />
                <InfoRow
                  label="Sincronizado em"
                  value={provider.backoffice_synced_at ? formatDateTime(provider.backoffice_synced_at) : '-'}
                  icon={Clock}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Coverage and Services Dialog */}
      {allServicesData && (
        <EditCoverageServicesDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          providerId={provider.id}
          initialServices={provider.services || []}
          initialMunicipalities={provider.counties || []}
          servicesData={allServicesData}
        />
      )}
    </div>
  )
}
