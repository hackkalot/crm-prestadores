'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ServicesSelector } from '@/components/forms/services-selector'
import { CoverageSelector } from '@/components/forms/coverage-selector'
import { submitServicesForm, type FormsSubmissionData } from '@/lib/forms/services-actions'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Wrench,
  Briefcase,
  MapPin,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Provider {
  id: string
  name: string
  email: string
  phone: string | null
  nif: string | null
  location: string | null
  services: string[] | null
}

interface ServicesFormClientProps {
  token: string
  provider: Provider
  services: Record<string, Record<string, any[]>>
}

const WEEKDAYS = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
]

const CERTIFICATIONS = [
  'ISO 9001',
  'ISO 14001',
  'OHSAS 18001',
  'Certificação Energética',
  'Certificação de Segurança',
  'Outro',
]

const PLATFORMS = [
  'Fixando',
  'Zaask',
  'Cronoshare',
  'GetNinjas',
  'Outro',
]

const EQUIPMENT = [
  'Ferramentas manuais',
  'Ferramentas elétricas',
  'Equipamento de medição',
  'Equipamento de segurança',
  'Veículo de transporte',
  'Outro',
]

const STEPS = [
  { id: 1, title: 'Dados do Prestador', icon: Building2 },
  { id: 2, title: 'Documentação', icon: FileText },
  { id: 3, title: 'Disponibilidade', icon: Calendar },
  { id: 4, title: 'Recursos', icon: Wrench },
  { id: 5, title: 'Serviços', icon: Briefcase },
  { id: 6, title: 'Cobertura', icon: MapPin },
  { id: 7, title: 'Revisão', icon: ClipboardCheck },
]

export function ServicesFormClient({ token, provider, services }: ServicesFormClientProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Form data
  const [formData, setFormData] = useState<FormsSubmissionData>({
    // Documentação
    has_activity_declaration: false,
    has_liability_insurance: false,
    has_work_accidents_insurance: false,
    certifications: [],
    works_with_platforms: [],

    // Disponibilidade
    available_weekdays: [],
    work_hours_start: '09:00',
    work_hours_end: '18:00',
    num_technicians: 1,

    // Recursos
    has_transport: false,
    has_computer: false,
    own_equipment: [],

    // Serviços
    selected_services: [],

    // Cobertura
    coverage_municipalities: [],
  })

  const updateFormData = (field: keyof FormsSubmissionData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: keyof FormsSubmissionData, value: string) => {
    setFormData((prev) => {
      const array = prev[field] as string[]
      if (array.includes(value)) {
        return { ...prev, [field]: array.filter((item) => item !== value) }
      } else {
        return { ...prev, [field]: [...array, value] }
      }
    })
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true // Provider info is pre-filled
      case 2:
        return true // Documentation is optional
      case 3:
        return formData.available_weekdays.length > 0 && formData.num_technicians > 0
      case 4:
        return true // Resources are optional
      case 5:
        return formData.selected_services.length > 0
      case 6:
        return formData.coverage_municipalities.length > 0
      case 7:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    // Get IP address (client-side)
    let ipAddress: string | undefined
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      ipAddress = data.ip
    } catch (error) {
      console.error('Failed to get IP address:', error)
    }

    const result = await submitServicesForm(token, formData, ipAddress)

    if (result.success) {
      setIsSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setSubmitError(result.error || 'Erro ao submeter formulário')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    setIsSubmitting(false)
  }

  const progress = (currentStep / STEPS.length) * 100

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-3">Formulário Submetido com Sucesso!</h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Obrigado por preencher o formulário de serviços, <strong>{provider.name}</strong>.
                </p>
                <p className="text-muted-foreground">
                  A nossa equipa irá analisar as suas informações e entrará em contacto em breve.
                </p>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 w-full">
                <p className="text-sm text-blue-900">
                  <strong>Resumo da submissão:</strong>
                </p>
                <div className="mt-2 space-y-1 text-sm text-blue-800">
                  <p>{formData.selected_services.length} serviços selecionados</p>
                  <p>{formData.coverage_municipalities.length} concelhos de cobertura</p>
                  <p>{formData.num_technicians} técnico{formData.num_technicians > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Formulário de Serviços</h1>
          <p className="text-lg text-muted-foreground">
            Preencha as informações sobre os seus serviços e áreas de cobertura
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Passo {currentStep} de {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% completo</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Navigation */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  disabled={isSubmitting}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all',
                    isActive && 'bg-primary text-primary-foreground border-primary',
                    isCompleted && 'bg-green-50 text-green-700 border-green-200',
                    !isActive && !isCompleted && 'bg-white border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
                  {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error Alert */}
        {submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon
                return <Icon className="h-5 w-5" />
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Confirme os seus dados pessoais'}
              {currentStep === 2 && 'Indique a documentação que possui'}
              {currentStep === 3 && 'Defina a sua disponibilidade de trabalho'}
              {currentStep === 4 && 'Informe sobre os recursos disponíveis'}
              {currentStep === 5 && 'Selecione os serviços que presta'}
              {currentStep === 6 && 'Escolha as áreas onde atua'}
              {currentStep === 7 && 'Reveja todas as informações antes de submeter'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Provider Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input value={provider.name} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={provider.email} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={provider.phone || 'Não informado'} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>NIF</Label>
                    <Input value={provider.nif || 'Não informado'} disabled className="bg-muted" />
                  </div>
                </div>
                <div>
                  <Label>Localização</Label>
                  <Input value={provider.location || 'Não informado'} disabled className="bg-muted" />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Estes dados foram importados do seu registo inicial. Se precisar de corrigir alguma
                    informação, entre em contacto connosco.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 2: Documentation */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Documentação Obrigatória</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="activity-declaration"
                        checked={formData.has_activity_declaration}
                        onCheckedChange={(checked) =>
                          updateFormData('has_activity_declaration', checked)
                        }
                      />
                      <div className="flex-1">
                        <label htmlFor="activity-declaration" className="font-medium cursor-pointer">
                          Declaração de Início de Atividade
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Documento oficial que comprova o registo da atividade nas Finanças
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="liability-insurance"
                        checked={formData.has_liability_insurance}
                        onCheckedChange={(checked) =>
                          updateFormData('has_liability_insurance', checked)
                        }
                      />
                      <div className="flex-1">
                        <label htmlFor="liability-insurance" className="font-medium cursor-pointer">
                          Seguro de Responsabilidade Civil
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Cobertura de seguro para eventuais danos causados durante a prestação de serviços
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="work-accidents"
                        checked={formData.has_work_accidents_insurance}
                        onCheckedChange={(checked) =>
                          updateFormData('has_work_accidents_insurance', checked)
                        }
                      />
                      <div className="flex-1">
                        <label htmlFor="work-accidents" className="font-medium cursor-pointer">
                          Seguro de Acidentes de Trabalho
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Proteção para si e/ou para os seus técnicos em caso de acidente
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Certificações (opcional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CERTIFICATIONS.map((cert) => (
                      <div key={cert} className="flex items-center gap-2">
                        <Checkbox
                          id={`cert-${cert}`}
                          checked={formData.certifications.includes(cert)}
                          onCheckedChange={() => toggleArrayItem('certifications', cert)}
                        />
                        <label htmlFor={`cert-${cert}`} className="text-sm cursor-pointer flex-1">
                          {cert}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Plataformas onde trabalha (opcional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PLATFORMS.map((platform) => (
                      <div key={platform} className="flex items-center gap-2">
                        <Checkbox
                          id={`platform-${platform}`}
                          checked={formData.works_with_platforms.includes(platform)}
                          onCheckedChange={() => toggleArrayItem('works_with_platforms', platform)}
                        />
                        <label
                          htmlFor={`platform-${platform}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {platform}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Availability */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Dias de Trabalho *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {WEEKDAYS.map((day) => (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={formData.available_weekdays.includes(day.value)}
                          onCheckedChange={() => toggleArrayItem('available_weekdays', day.value)}
                        />
                        <label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer flex-1">
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  {formData.available_weekdays.length === 0 && (
                    <p className="text-sm text-destructive">Selecione pelo menos um dia de trabalho</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Horário de Trabalho</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="work-start">Início</Label>
                      <Input
                        id="work-start"
                        type="time"
                        value={formData.work_hours_start}
                        onChange={(e) => updateFormData('work_hours_start', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="work-end">Fim</Label>
                      <Input
                        id="work-end"
                        type="time"
                        value={formData.work_hours_end}
                        onChange={(e) => updateFormData('work_hours_end', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Número de Técnicos *</h3>
                  <div>
                    <Label htmlFor="num-technicians">
                      Quantas pessoas (incluindo você) trabalham na prestação de serviços?
                    </Label>
                    <Input
                      id="num-technicians"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.num_technicians}
                      onChange={(e) => updateFormData('num_technicians', parseInt(e.target.value) || 1)}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Resources */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Recursos Disponíveis</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="has-transport"
                        checked={formData.has_transport}
                        onCheckedChange={(checked) => updateFormData('has_transport', checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor="has-transport" className="font-medium cursor-pointer">
                          Possui Viatura Própria
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Veículo para deslocações e transporte de equipamento
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="has-computer"
                        checked={formData.has_computer}
                        onCheckedChange={(checked) => updateFormData('has_computer', checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor="has-computer" className="font-medium cursor-pointer">
                          Possui Computador/Tablet
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Dispositivo para acesso à plataforma e gestão de trabalhos
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Equipamento Próprio (opcional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione o equipamento que possui para a realização de trabalhos
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {EQUIPMENT.map((equip) => (
                      <div key={equip} className="flex items-center gap-2">
                        <Checkbox
                          id={`equip-${equip}`}
                          checked={formData.own_equipment.includes(equip)}
                          onCheckedChange={() => toggleArrayItem('own_equipment', equip)}
                        />
                        <label htmlFor={`equip-${equip}`} className="text-sm cursor-pointer flex-1">
                          {equip}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Services */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <Alert>
                  <Briefcase className="h-4 w-4" />
                  <AlertDescription>
                    Selecione todos os serviços que está apto a realizar. Pode escolher múltiplos serviços
                    de diferentes categorias.
                  </AlertDescription>
                </Alert>
                <ServicesSelector
                  services={services}
                  selectedServices={formData.selected_services}
                  onChange={(selected) => updateFormData('selected_services', selected)}
                />
                {formData.selected_services.length === 0 && (
                  <p className="text-sm text-destructive">Selecione pelo menos um serviço</p>
                )}
              </div>
            )}

            {/* Step 6: Coverage */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription>
                    Indique os concelhos onde está disponível para prestar serviços. Pode selecionar
                    distritos completos ou concelhos individuais.
                  </AlertDescription>
                </Alert>
                <CoverageSelector
                  selectedMunicipalities={formData.coverage_municipalities}
                  onChange={(selected) => updateFormData('coverage_municipalities', selected)}
                />
                {formData.coverage_municipalities.length === 0 && (
                  <p className="text-sm text-destructive">Selecione pelo menos um concelho</p>
                )}
              </div>
            )}

            {/* Step 7: Review */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <Alert>
                  <ClipboardCheck className="h-4 w-4" />
                  <AlertDescription>
                    Reveja cuidadosamente todas as informações antes de submeter. Após a submissão, a nossa
                    equipa entrará em contacto consigo.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Dados do Prestador</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                      <p>
                        <strong>Nome:</strong> {provider.name}
                      </p>
                      <p>
                        <strong>Email:</strong> {provider.email}
                      </p>
                      {provider.phone && (
                        <p>
                          <strong>Telefone:</strong> {provider.phone}
                        </p>
                      )}
                      {provider.nif && (
                        <p>
                          <strong>NIF:</strong> {provider.nif}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Documentação</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {formData.has_activity_declaration ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                        <span>Declaração de Início de Atividade</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {formData.has_liability_insurance ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                        <span>Seguro de Responsabilidade Civil</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {formData.has_work_accidents_insurance ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                        <span>Seguro de Acidentes de Trabalho</span>
                      </div>
                      {formData.certifications.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Certificações:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.certifications.map((cert) => (
                              <Badge key={cert} variant="secondary">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Disponibilidade</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Dias de trabalho:</strong>{' '}
                        {formData.available_weekdays
                          .map((day) => WEEKDAYS.find((d) => d.value === day)?.label)
                          .join(', ')}
                      </p>
                      <p>
                        <strong>Horário:</strong> {formData.work_hours_start} - {formData.work_hours_end}
                      </p>
                      <p>
                        <strong>Número de técnicos:</strong> {formData.num_technicians}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Recursos</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {formData.has_transport ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>Viatura Própria</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {formData.has_computer ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span>Computador/Tablet</span>
                      </div>
                      {formData.own_equipment.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Equipamento:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.own_equipment.map((equip) => (
                              <Badge key={equip} variant="secondary">
                                {equip}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Serviços</h3>
                    <Badge variant="outline" className="text-base">
                      {formData.selected_services.length} serviços selecionados
                    </Badge>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Cobertura Geográfica</h3>
                    <Badge variant="outline" className="text-base">
                      {formData.coverage_municipalities.length} concelhos
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
            className="min-w-32"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <div className="text-sm text-muted-foreground">
            {!canProceed() && currentStep !== 7 && (
              <span className="text-destructive">Preencha os campos obrigatórios (*)</span>
            )}
          </div>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={!canProceed() || isSubmitting} className="min-w-32">
              Seguinte
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="min-w-32"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A submeter...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submeter
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
