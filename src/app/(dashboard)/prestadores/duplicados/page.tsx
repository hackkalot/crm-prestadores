import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { DuplicatesScanner } from '@/components/duplicates/duplicates-scanner'
import { BackButton } from '@/components/ui/back-button'

export default function DuplicadosPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Detetar Duplicados"
        description="Encontrar e fundir prestadores duplicados"
        backButton={<BackButton fallbackUrl="/prestadores" />}
      />
      <div className="flex-1 p-6 overflow-auto">
        <Suspense fallback={<div className="h-48" />}>
          <DuplicatesScanner />
        </Suspense>
      </div>
    </div>
  )
}
