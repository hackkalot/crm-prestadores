'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Map, { Source, Layer, NavigationControl, Popup } from 'react-map-gl/mapbox'
import type { MapMouseEvent } from 'react-map-gl/mapbox'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MapCoverageData } from '@/lib/network/actions'
import { PORTUGAL_CENTER } from '@/lib/geo/portugal-coordinates'
import { MapPin, Loader2, Users, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { MunicipalityCoverageDialog } from './municipality-coverage-dialog'
import 'mapbox-gl/dist/mapbox-gl.css'

interface NetworkMapboxMapProps {
  coverageData: MapCoverageData
}

type CoverageStatus = 'ok' | 'warning' | 'critical'

interface MunicipalityPopupData {
  name: string
  district: string
  status: CoverageStatus
  providerCount: number
  lng: number
  lat: number
}

// Colors for coverage status - more vibrant
const STATUS_COLORS: Record<CoverageStatus, string> = {
  ok: '#16a34a',      // green-600 - mais saturado
  warning: '#f59e0b', // amber-500 - mais visivel que yellow
  critical: '#dc2626', // red-600 - mais saturado
}

// Normalize district names between GeoJSON and our data
function normalizeDistrictName(name: string): string {
  const mapping: Record<string, string> = {
    'Évora': 'Évora',
    'Evora': 'Évora',
    'Açores': 'Açores',
    'Acores': 'Açores',
    'Setúbal': 'Setúbal',
    'Setubal': 'Setúbal',
    'Santarém': 'Santarém',
    'Santarem': 'Santarém',
    'Bragança': 'Bragança',
    'Braganca': 'Bragança',
  }
  return mapping[name] || name
}

export function NetworkMapboxMap({ coverageData }: NetworkMapboxMapProps) {
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<string>('_all')
  const [hoveredMunicipality, setHoveredMunicipality] = useState<MunicipalityPopupData | null>(null)
  const [selectedMunicipality, setSelectedMunicipality] = useState<{ name: string; district: string } | null>(null)
  const [coverageDialogOpen, setCoverageDialogOpen] = useState(false)
  const [viewState, setViewState] = useState({
    longitude: PORTUGAL_CENTER.lng,
    latitude: PORTUGAL_CENTER.lat,
    zoom: 6,
  })

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Load GeoJSON data
  useEffect(() => {
    fetch('/geo/portugal-municipalities-simplified.geojson')
      .then(res => res.json())
      .then(data => {
        setGeojsonData(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error loading GeoJSON:', err)
        setIsLoading(false)
      })
  }, [])

  // Process GeoJSON to add coverage status to each municipality
  const processedGeojson = useMemo(() => {
    if (!geojsonData) return null

    const features = geojsonData.features.map(feature => {
      const districtName = normalizeDistrictName(feature.properties?.dis_name || '')
      const districtData = coverageData.districts[districtName]

      let status: CoverageStatus = 'critical'
      let providerCount = 0

      if (districtData) {
        providerCount = districtData.activeProviders

        if (selectedService === '_all') {
          status = districtData.overallStatus
        } else {
          const serviceData = districtData.services[selectedService]
          if (serviceData) {
            status = serviceData.status
            providerCount = serviceData.count
          }
        }
      }

      return {
        ...feature,
        properties: {
          ...feature.properties,
          coverage_status: status,
          coverage_color: STATUS_COLORS[status],
          provider_count: providerCount,
          district_normalized: districtName,
        },
      }
    })

    return {
      type: 'FeatureCollection' as const,
      features,
    }
  }, [geojsonData, coverageData, selectedService])

  // Handle mouse events
  const onMouseEnter = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0]
    if (feature && feature.geometry.type === 'Polygon' || feature?.geometry.type === 'MultiPolygon') {
      const props = feature.properties
      const center = props?.geo_point_2d

      let lng = event.lngLat.lng
      let lat = event.lngLat.lat

      // Try to use the center point from properties
      if (center) {
        try {
          const parsed = typeof center === 'string' ? JSON.parse(center) : center
          lng = parsed.lon
          lat = parsed.lat
        } catch {
          // Use event coordinates
        }
      }

      setHoveredMunicipality({
        name: props?.con_name || 'Unknown',
        district: props?.dis_name || 'Unknown',
        status: props?.coverage_status || 'critical',
        providerCount: props?.provider_count || 0,
        lng,
        lat,
      })
    }
  }, [])

  const onMouseLeave = useCallback(() => {
    setHoveredMunicipality(null)
  }, [])

  const onClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0]
    if (feature?.properties) {
      const municipalityName = feature.properties.con_name
      const districtName = feature.properties.dis_name

      setSelectedMunicipality({
        name: municipalityName,
        district: districtName,
      })
      setCoverageDialogOpen(true)
    }
  }, [])

  // Count stats by status
  const statusCounts = useMemo(() => {
    if (!processedGeojson) return { ok: 0, warning: 0, critical: 0 }

    const counts = { ok: 0, warning: 0, critical: 0 }
    for (const feature of processedGeojson.features) {
      const status = feature.properties?.coverage_status as CoverageStatus
      if (status && counts[status] !== undefined) {
        counts[status]++
      }
    }
    return counts
  }, [processedGeojson])

  if (!mapboxToken) {
    return (
      <Card className="flex-1 min-h-[400px] flex items-center justify-center">
        <CardContent className="text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Token Mapbox nao configurado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Adiciona NEXT_PUBLIC_MAPBOX_TOKEN ao ficheiro .env.local
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="flex-1 min-h-[400px] flex items-center justify-center">
        <CardContent className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
          <p className="text-lg font-medium">A carregar mapa...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative flex-1 min-h-[400px] h-full">
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        {/* Legend */}
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border p-3 shadow-lg">
          <p className="text-xs font-medium mb-2">Cobertura</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.ok }} />
              <span>Boa cobertura ({statusCounts.ok})</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.warning }} />
              <span>Cobertura baixa ({statusCounts.warning})</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.critical }} />
              <span>Sem cobertura ({statusCounts.critical})</span>
            </div>
          </div>
        </div>

        {/* Service filter */}
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border p-3 shadow-lg">
          <p className="text-xs font-medium mb-2">Filtrar por servico</p>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os servicos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos os servicos</SelectItem>
              {coverageData.services.map(service => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-14 z-10 bg-background/95 backdrop-blur-sm rounded-lg border px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">308</span> concelhos
        </p>
      </div>

      {/* Map */}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={mapboxToken}
        interactiveLayerIds={['municipalities-fill']}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        cursor="pointer"
      >
        <NavigationControl position="top-right" />

        {processedGeojson && (
          <Source id="municipalities" type="geojson" data={processedGeojson}>
            {/* Fill layer */}
            <Layer
              id="municipalities-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'coverage_color'],
                'fill-opacity': 0.75,
              }}
            />
            {/* Border layer - district borders thicker */}
            <Layer
              id="municipalities-border"
              type="line"
              paint={{
                'line-color': '#374151', // gray-700
                'line-width': 0.5,
                'line-opacity': 0.5,
              }}
            />
          </Source>
        )}

        {/* Popup on hover */}
        {hoveredMunicipality && (
          <Popup
            longitude={hoveredMunicipality.lng}
            latitude={hoveredMunicipality.lat}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            className="network-map-popup"
          >
            <div className="p-1 min-w-[160px]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{hoveredMunicipality.name}</span>
                {hoveredMunicipality.status === 'ok' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {hoveredMunicipality.status === 'warning' && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                {hoveredMunicipality.status === 'critical' && (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{hoveredMunicipality.district}</p>
              <div className="flex items-center gap-1 mt-1 text-xs">
                <Users className="h-3 w-3" />
                <span>
                  {hoveredMunicipality.providerCount} prestador{hoveredMunicipality.providerCount !== 1 ? 'es' : ''}
                  {selectedService !== '_all' && ` (${selectedService})`}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Municipality Coverage Dialog */}
      <MunicipalityCoverageDialog
        municipality={selectedMunicipality?.name || null}
        district={selectedMunicipality?.district}
        open={coverageDialogOpen}
        onOpenChange={setCoverageDialogOpen}
      />
    </div>
  )
}
