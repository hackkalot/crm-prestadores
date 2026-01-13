import { Header } from '@/components/layout/header'
import {
  getSyncLogs,
  getSyncStats,
  getProviderSyncLogs,
  getProviderSyncStats,
  getBillingSyncLogs,
  getBillingSyncStats,
  getAllocationSyncLogs,
  getAllocationSyncStats,
} from '@/lib/sync/logs-actions'
import { SyncLogsTabs } from '@/components/sync/sync-logs-tabs'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function SyncLogsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const tab = (params.tab as string) || 'pedidos'

  const [
    serviceLogs,
    serviceStats,
    providerLogs,
    providerStats,
    billingLogs,
    billingStats,
    allocationLogs,
    allocationStats,
  ] = await Promise.all([
    getSyncLogs(),
    getSyncStats(),
    getProviderSyncLogs(),
    getProviderSyncStats(),
    getBillingSyncLogs(),
    getBillingSyncStats(),
    getAllocationSyncLogs(),
    getAllocationSyncStats(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Logs de Sincronização"
        description="Historico de sincronizações com o backoffice OutSystems"
      />
      <div className="flex-1 p-6 overflow-auto">
        <SyncLogsTabs
          activeTab={tab}
          serviceLogs={serviceLogs}
          serviceStats={serviceStats}
          providerLogs={providerLogs}
          providerStats={providerStats}
          billingLogs={billingLogs}
          billingStats={billingStats}
          allocationLogs={allocationLogs}
          allocationStats={allocationStats}
        />
      </div>
    </div>
  )
}
