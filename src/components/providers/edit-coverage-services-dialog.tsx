'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ServicesSelector } from '@/components/forms/services-selector'
import { CoverageSelector } from '@/components/forms/coverage-selector'
import { MapPin, Briefcase, Loader2 } from 'lucide-react'
import { updateProviderCoverageAndServices } from '@/lib/providers/profile-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface EditCoverageServicesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  initialServices: string[]
  initialMunicipalities: string[]
  servicesData: Record<string, Record<string, any[]>>
}

export function EditCoverageServicesDialog({
  open,
  onOpenChange,
  providerId,
  initialServices,
  initialMunicipalities,
  servicesData,
}: EditCoverageServicesDialogProps) {
  const router = useRouter()
  const [selectedServices, setSelectedServices] = useState<string[]>(initialServices)
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<string[]>(initialMunicipalities)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateProviderCoverageAndServices(providerId, {
        selected_services: selectedServices,
        coverage_municipalities: selectedMunicipalities,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Cobertura e serviços atualizados com sucesso')
        router.refresh()
        onOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset to initial values
    setSelectedServices(initialServices)
    setSelectedMunicipalities(initialMunicipalities)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Cobertura e Serviços</DialogTitle>
          <DialogDescription>
            Atualize os serviços oferecidos e a cobertura geográfica do prestador
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="services" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Serviços ({selectedServices.length})
            </TabsTrigger>
            <TabsTrigger value="coverage" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Cobertura ({selectedMunicipalities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="flex-1 overflow-auto mt-4">
            <ServicesSelector
              services={servicesData}
              selectedServices={selectedServices}
              onChange={setSelectedServices}
            />
          </TabsContent>

          <TabsContent value="coverage" className="flex-1 overflow-auto mt-4">
            <CoverageSelector
              selectedMunicipalities={selectedMunicipalities}
              onChange={setSelectedMunicipalities}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A guardar...
              </>
            ) : (
              'Guardar alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
