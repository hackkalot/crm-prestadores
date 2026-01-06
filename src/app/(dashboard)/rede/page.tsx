import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getNetworkStats,
  getNetworkCoverage,
  getNetworkGaps,
} from '@/lib/network/actions'
import { NetworkCoverageMap } from '@/components/network/network-coverage-map'
import { NetworkGapsList } from '@/components/network/network-gaps-list'
import { ProviderSearch } from '@/components/network/provider-search'
import {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Target,
} from 'lucide-react'

export default async function RedePage() {
  const [stats, coverage, gaps] = await Promise.all([
    getNetworkStats(),
    getNetworkCoverage(),
    getNetworkGaps(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Rede de Prestadores"
        description="Analise a cobertura da rede e identifique oportunidades"
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalDistricts}</p>
                  <p className="text-xs text-muted-foreground">Distritos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.districtsFullyCovered}</p>
                  <p className="text-xs text-muted-foreground">Com cobertura</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.districtsWithGaps}</p>
                  <p className="text-xs text-muted-foreground">Com lacunas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950">
                  <Target className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.criticalGaps}</p>
                  <p className="text-xs text-muted-foreground">Lacunas criticas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-950">
                  <Users className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.warningGaps}</p>
                  <p className="text-xs text-muted-foreground">Cobertura baixa</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.coveragePercentage}%</p>
                  <p className="text-xs text-muted-foreground">Cobertura total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="mapa" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mapa">Mapa de Cobertura</TabsTrigger>
            <TabsTrigger value="lacunas">
              Lacunas
              {stats.totalGaps > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.totalGaps}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pesquisa">Pesquisa</TabsTrigger>
          </TabsList>

          <TabsContent value="mapa">
            <NetworkCoverageMap coverage={coverage} />
          </TabsContent>

          <TabsContent value="lacunas">
            <NetworkGapsList gaps={gaps} />
          </TabsContent>

          <TabsContent value="pesquisa">
            <ProviderSearch />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
