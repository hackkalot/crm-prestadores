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
  Truck,
  Clock,
  CreditCard,
  FileCheck,
  Globe,
  UserCog,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
} from 'lucide-react'
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Dados Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          {(provider.entity_type === 'empresa' || provider.entity_type === 'eni') && (
            <div className="space-y-4 pt-2 border-t">
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
          )}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Horário Laboral</p>
            <EditableField
              value={provider.working_hours}
              onSave={(value) => handleFieldUpdate('working_hours', value)}
              placeholder="Ex: 9h-18h"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados Administrativos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Administrativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">IBAN</p>
            <EditableField
              value={provider.iban}
              onSave={(value) => handleFieldUpdate('iban', value)}
              placeholder="PT50XXXXXXXXXXXXXXXXXXXX"
              icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Comprovativo de Atividade (URL)</p>
            <EditableField
              value={provider.activity_proof_url}
              onSave={(value) => handleFieldUpdate('activity_proof_url', value)}
              placeholder="https://..."
              type="url"
              icon={<FileCheck className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Zonas de Atuação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Zonas de Atuação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditableArray
            value={provider.districts}
            onSave={(value) => handleArrayUpdate('districts', value)}
            placeholder="Nenhuma zona definida"
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            suggestions={districts}
          />
        </CardContent>
      </Card>

      {/* Serviços */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Serviços
          </CardTitle>
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

      {/* Website & Redes Sociais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website & Redes Sociais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Responsável da Relação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Responsável da Relação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOwner} onValueChange={handleOwnerChange} disabled={isPending}>
            <SelectTrigger className="w-full max-w-xs">
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
        </CardContent>
      </Card>
    </div>
  )
}
