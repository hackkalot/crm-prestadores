import { getUserActivePriorities } from '@/lib/priorities/actions'
import { PrioritiesSidebar } from './priorities-sidebar'

export async function PrioritiesBell() {
  const priorities = await getUserActivePriorities()

  return <PrioritiesSidebar priorities={priorities} />
}
