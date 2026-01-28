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
  getClientsSyncLogs,
  getClientsSyncStats,
  getRecurrencesSyncLogs,
  getRecurrencesSyncStats,
  getTasksSyncLogs,
  getTasksSyncStats,
} from '@/lib/sync/logs-actions'
import { SyncLogsTabs } from '@/components/sync/sync-logs-tabs'
import { SyncClientsDialog } from '@/components/sync/sync-clients-dialog'
import { SyncRecurrencesDialog } from '@/components/sync/sync-recurrences-dialog'
import { SyncTasksDialog } from '@/components/sync/sync-tasks-dialog'

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
    clientsLogs,
    clientsStats,
    recurrencesLogs,
    recurrencesStats,
    tasksLogs,
    tasksStats,
  ] = await Promise.all([
    getSyncLogs(),
    getSyncStats(),
    getProviderSyncLogs(),
    getProviderSyncStats(),
    getBillingSyncLogs(),
    getBillingSyncStats(),
    getAllocationSyncLogs(),
    getAllocationSyncStats(),
    getClientsSyncLogs(),
    getClientsSyncStats(),
    getRecurrencesSyncLogs(),
    getRecurrencesSyncStats(),
    getTasksSyncLogs(),
    getTasksSyncStats(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Logs de Sincronização"
        description="Historico de sincronizações com o backoffice OutSystems"
        action={tab === 'clients' ? <SyncClientsDialog /> : tab === 'recurrences' ? <SyncRecurrencesDialog /> : tab === 'tasks' ? <SyncTasksDialog /> : undefined}
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
          clientsLogs={clientsLogs}
          clientsStats={clientsStats}
          recurrencesLogs={recurrencesLogs}
          recurrencesStats={recurrencesStats}
          tasksLogs={tasksLogs}
          tasksStats={tasksStats}
        />
      </div>
    </div>
  )
}
