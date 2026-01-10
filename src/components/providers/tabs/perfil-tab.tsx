'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  MapPin,
  Wrench,
  Users,
  User,
  Clock,
  CreditCard,
  FileCheck,
  Globe,
  UserCog,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  BarChart3,
  Star,
  Database,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { updateRelationshipOwner, updateProviderField } from '@/lib/providers/actions'
import { toast } from 'sonner'
import { EditableField } from '../editable-field'
import { EditableBoolean } from '../editable-boolean'
import { EditableNumber } from '../editable-number'
import { EditableArray } from '../editable-array'

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
    relationship_owner_id?: string | null
    relationship_owner?: { id: string; name: string } | null
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
  }
  users: Array<{ id: string; name: string; email: string }>
  districts: string[]
  services: string[]
}

const entityTypeLabels: Record<string, string> = {
  tecnico: 'Técnico',
  eni: 'ENI',
  empresa: 'Empresa',
}

export function PerfilTab({ provider, users, districts, services }: PerfilTabProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedOwner, setSelectedOwner] = useState(provider.relationship_owner_id || '')

  const getOwnerLabel = (ownerId: string) => {
    if (!ownerId) return 'Não atribuído'
    const owner = users.find(u => u.id === ownerId)
    return owner ? (owner.name || owner.email || 'Utilizador') : provider.relationship_owner?.name || 'Não atribuído'
  }

  const handleOwnerChange = (newOwnerId: string) => {
    if (newOwnerId === selectedOwner) return

    setSelectedOwner(newOwnerId)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('providerId', provider.id)
      formData.append('ownerId', newOwnerId)

      const result = await updateRelationshipOwner({}, formData)

      if (result.error) {
        toast.error(result.error)
        setSelectedOwner(provider.relationship_owner_id || '')
        return
      }

      toast.success('Responsável atualizado')
    })
  }

  const handleFieldUpdate = async (fieldName: string, value: string) => {
    const formData = new FormData()
    formData.append('providerId', provider.id)
    formData.append('fieldName', fieldName)
    formData.append('fieldValue', value)
    formData.append('fieldType', 'string')

    const result = await updateProviderField({}, formData)

    if (result.error) {
      toast.error(result.error)
      return { error: result.error }
    }

    toast.success('Campo atualizado')
    return { error: undefined }
  }

  const handleNumberUpdate = async (fieldName: string, value: number | null) => {
    const formData = new FormData()
    formData.append('providerId', provider.id)
    formData.append('fieldName', fieldName)
    formData.append('fieldValue', value !== null ? value.toString() : '')
    formData.append('fieldType', 'number')

    const result = await updateProviderField({}, formData)

    if (result.error) {
      toast.error(result.error)
      return { error: result.error }
    }

    toast.success('Campo atualizado')
    return { error: undefined }
  }

  const handleBooleanUpdate = async (fieldName: string, value: boolean) => {
    const formData = new FormData()
    formData.append('providerId', provider.id)
    formData.append('fieldName', fieldName)
    formData.append('fieldValue', value.toString())
    formData.append('fieldType', 'boolean')

    const result = await updateProviderField({}, formData)

    if (result.error) {
      toast.error(result.error)
      return { error: result.error }
    }

    toast.success('Campo atualizado')
    return { error: undefined }
  }

  const handleArrayUpdate = async (fieldName: string, value: string[]) => {
    const formData = new FormData()
    formData.append('providerId', provider.id)
    formData.append('fieldName', fieldName)
    formData.append('fieldValue', JSON.stringify(value))
    formData.append('fieldType', 'array')

    const result = await updateProviderField({}, formData)

    if (result.error) {
      toast.error(result.error)
      return { error: result.error }
    }

    toast.success('Campo atualizado')
    return { error: undefined }
  }

  const hasBackofficeData = !!provider.backoffice_provider_id
  const hasRatings = !!(provider.service_rating || provider.technician_rating)
  const hasCategories = provider.categories && provider.categories.length > 0
  const hasCounties = provider.counties && provider.counties.length > 0

  return (
    <div className="space-y-8">
      {/* ===== SECÇÃO: PERFORMANCE (só para prestadores com dados do backoffice) ===== */}
      {hasBackofficeData && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Estatísticas de Pedidos */}
            <Card className="lg:col-span-2">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold">{provider.total_requests || 0}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <p className="text-3xl font-bold text-green-600">{provider.completed_requests || 0}</p>
                    <p className="text-sm text-muted-foreground">Concluídos</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-3xl font-bold text-blue-600">{provider.active_requests || 0}</p>
                    <p className="text-sm text-muted-foreground">Ativos</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <p className="text-3xl font-bold text-red-600">{provider.cancelled_requests || 0}</p>
                    <p className="text-sm text-muted-foreground">Cancelados</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xl font-semibold">{provider.requests_received || 0}</p>
                    <p className="text-xs text-muted-foreground">Recebidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold">{provider.requests_accepted || 0}</p>
                    <p className="text-xs text-muted-foreground">Aceites</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold">{provider.requests_rejected || 0}</p>
                    <p className="text-xs text-muted-foreground">Rejeitados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold">{provider.requests_expired || 0}</p>
                    <p className="text-xs text-muted-foreground">Expirados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avaliações */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Avaliações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasRatings ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Serviço</span>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (provider.service_rating || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-sm">{provider.service_rating?.toFixed(1) || '-'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Técnico</span>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (provider.technician_rating || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-sm">{provider.technician_rating?.toFixed(1) || '-'}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem avaliações</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ===== SECÇÃO: DADOS DO PRESTADOR ===== */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Dados do Prestador
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identificação */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Nome</p>
                    <EditableField
                      value={provider.name}
                      onSave={(value) => handleFieldUpdate('name', value)}
                      placeholder="Nome do prestador"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Email</p>
                    <EditableField
                      value={provider.email}
                      onSave={(value) => handleFieldUpdate('email', value)}
                      placeholder="email@exemplo.com"
                      type="email"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Telefone</p>
                    <EditableField
                      value={provider.phone}
                      onSave={(value) => handleFieldUpdate('phone', value)}
                      placeholder="+351 XXX XXX XXX"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tipo de Entidade</p>
                    <p className="font-medium">{entityTypeLabels[provider.entity_type]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">NIF</p>
                    <EditableField
                      value={provider.nif}
                      onSave={(value) => handleFieldUpdate('nif', value)}
                      placeholder="XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Horário Laboral</p>
                    <EditableField
                      value={provider.working_hours}
                      onSave={(value) => handleFieldUpdate('working_hours', value)}
                      placeholder="Ex: 9h-18h"
                      icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                    />
                  </div>
                </div>
              </div>

              {/* Campos específicos para empresa/eni */}
              {(provider.entity_type === 'empresa' || provider.entity_type === 'eni') && (
                <div className="mt-6 pt-6 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Nr de Técnicos</p>
                      <EditableNumber
                        value={provider.num_technicians}
                        onSave={(value) => handleNumberUpdate('num_technicians', value)}
                        placeholder="0"
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                        min={0}
                      />
                    </div>
                    <EditableBoolean
                      value={provider.has_admin_team}
                      onSave={(value) => handleBooleanUpdate('has_admin_team', value)}
                      label="Equipa Administrativa"
                    />
                    <EditableBoolean
                      value={provider.has_own_transport}
                      onSave={(value) => handleBooleanUpdate('has_own_transport', value)}
                      label="Transporte Próprio"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gestão & Financeiro */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Responsável */}
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Responsável da Relação
                </p>
                <Select value={selectedOwner} onValueChange={handleOwnerChange} disabled={isPending}>
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {isPending ? 'A guardar...' : getOwnerLabel(selectedOwner)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email || 'Utilizador'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* IBAN */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">IBAN</p>
                <EditableField
                  value={provider.iban}
                  onSave={(value) => handleFieldUpdate('iban', value)}
                  placeholder="PT50XXXXXXXXXXXXXXXXXXXX"
                  icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
                />
              </div>

              {/* Comprovativo */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Comprovativo de Atividade</p>
                <EditableField
                  value={provider.activity_proof_url}
                  onSave={(value) => handleFieldUpdate('activity_proof_url', value)}
                  placeholder="https://..."
                  type="url"
                  icon={<FileCheck className="h-4 w-4 text-muted-foreground" />}
                />
              </div>

              {/* Info Backoffice (compacto) */}
              {hasBackofficeData && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Backoffice
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID</span>
                      <span className="font-mono">{provider.backoffice_provider_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <div className="flex items-center gap-1">
                        {provider.backoffice_is_active ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>{provider.backoffice_status || (provider.backoffice_is_active ? 'Ativo' : 'Inativo')}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Password</span>
                      <span>{provider.backoffice_password_defined ? 'Definida' : 'Não definida'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recorrência</span>
                      <span>{provider.backoffice_do_recurrence ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    {provider.backoffice_last_login && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Último login</span>
                        <span>{formatDateTime(provider.backoffice_last_login)}</span>
                      </div>
                    )}
                  </div>
                  {provider.backoffice_synced_at && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                      Sincronizado: {formatDateTime(provider.backoffice_synced_at)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===== SECÇÃO: ÁREA DE ATUAÇÃO ===== */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Área de Atuação
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distritos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distritos</CardTitle>
            </CardHeader>
            <CardContent>
              <EditableArray
                value={provider.districts}
                onSave={(value) => handleArrayUpdate('districts', value)}
                placeholder="Nenhum distrito definido"
                icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                suggestions={districts}
              />
            </CardContent>
          </Card>

          {/* Concelhos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Concelhos
                {hasCounties && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {provider.counties!.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasCounties ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {provider.counties!.map((county, idx) => (
                    <Badge key={`${county}-${idx}`} variant="outline" className="text-xs">
                      {county}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Dados do backoffice não sincronizados</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===== SECÇÃO: SERVIÇOS ===== */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Serviços
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Serviços CRM */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Serviços (CRM)</CardTitle>
            </CardHeader>
            <CardContent>
              <EditableArray
                value={provider.services}
                onSave={(value) => handleArrayUpdate('services', value)}
                placeholder="Nenhum serviço definido"
                icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
                suggestions={services}
              />
            </CardContent>
          </Card>

          {/* Categorias Backoffice */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Categorias (Backoffice)
                {hasCategories && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {provider.categories!.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasCategories ? (
                <div className="flex flex-wrap gap-2">
                  {provider.categories!.map((category, idx) => (
                    <Badge key={`${category}-${idx}`} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Dados do backoffice não sincronizados</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===== SECÇÃO: PRESENÇA ONLINE ===== */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Presença Online
        </h3>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Website</p>
                <EditableField
                  value={provider.website}
                  onSave={(value) => handleFieldUpdate('website', value)}
                  placeholder="https://exemplo.com"
                  type="url"
                  icon={<Globe className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Facebook</p>
                <EditableField
                  value={provider.facebook_url}
                  onSave={(value) => handleFieldUpdate('facebook_url', value)}
                  placeholder="https://facebook.com/..."
                  type="url"
                  icon={<Facebook className="h-4 w-4 text-blue-600" />}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Instagram</p>
                <EditableField
                  value={provider.instagram_url}
                  onSave={(value) => handleFieldUpdate('instagram_url', value)}
                  placeholder="https://instagram.com/..."
                  type="url"
                  icon={<Instagram className="h-4 w-4 text-pink-600" />}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">LinkedIn</p>
                <EditableField
                  value={provider.linkedin_url}
                  onSave={(value) => handleFieldUpdate('linkedin_url', value)}
                  placeholder="https://linkedin.com/..."
                  type="url"
                  icon={<Linkedin className="h-4 w-4 text-blue-700" />}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Twitter/X</p>
                <EditableField
                  value={provider.twitter_url}
                  onSave={(value) => handleFieldUpdate('twitter_url', value)}
                  placeholder="https://twitter.com/..."
                  type="url"
                  icon={<Twitter className="h-4 w-4 text-sky-500" />}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
