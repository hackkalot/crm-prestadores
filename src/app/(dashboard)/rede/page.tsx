import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getNetworkStats,
  getNetworkCoverage,
  getNetworkGaps,
} from '@/lib/network/actions'
import { getAllMunicipalitiesCoverage, getAllMunicipalitiesGaps } from '@/lib/network/coverage-actions'
import { NetworkCoverageMap } from '@/components/network/network-coverage-map'
import { NetworkMapboxMap } from '@/components/network/network-mapbox-map'
import { NetworkGapsList } from '@/components/network/network-gaps-list'
import { ProviderSearch } from '@/components/network/provider-search'
import {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Target,
  Map,
  LayoutGrid,
} from 'lucide-react'

export default async function RedePage() {
  const [stats, coverage, gaps, municipalityCoverage, municipalityGaps] = await Promise.all([
    getNetworkStats(),
    getNetworkCoverage(),
    getNetworkGaps(),
    getAllMunicipalitiesCoverage(),
    getAllMunicipalitiesGaps(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Rede de Prestadores"
        description="Analise a cobertura da rede e identifique oportunidades"
      />

      <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
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
        <Tabs defaultValue="mapa" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-fit">
            <TabsTrigger value="mapa" className="flex items-center gap-1.5">
              <Map className="h-4 w-4" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="distritos" className="flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Distritos
            </TabsTrigger>
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

          <TabsContent value="mapa" className="flex-1 mt-4 data-[state=active]:flex data-[state=active]:flex-col">
            <NetworkMapboxMap
              municipalityCoverage={municipalityCoverage}
              municipalityGaps={municipalityGaps}
            />
          </TabsContent>

          <TabsContent value="distritos" className="mt-4">
            <NetworkCoverageMap coverage={coverage} />
          </TabsContent>

          <TabsContent value="lacunas" className="mt-4">
            <NetworkGapsList gaps={gaps} />
          </TabsContent>

          <TabsContent value="pesquisa" className="mt-4">
            <ProviderSearch />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
