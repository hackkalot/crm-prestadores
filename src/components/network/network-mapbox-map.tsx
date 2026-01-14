'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Map, { Source, Layer, NavigationControl, Popup } from 'react-map-gl/mapbox'
import type { MapMouseEvent } from 'react-map-gl/mapbox'
import { Card, CardContent } from '@/components/ui/card'
import { PORTUGAL_CENTER } from '@/lib/geo/portugal-coordinates'
import { MapPin, Loader2 } from 'lucide-react'
import { MunicipalityCoverageDialog } from './municipality-coverage-dialog'
import 'mapbox-gl/dist/mapbox-gl.css'

interface NetworkMapboxMapProps {
  municipalityCoverage: Array<{
    municipality: string
    district: string
    status: 'good' | 'low' | 'bad'
  }>
}

type CoverageStatus = 'good' | 'low' | 'bad'

interface MunicipalityPopupData {
  name: string
  district: string
  status: CoverageStatus
  lng: number
  lat: number
}

// Colors for coverage status
const STATUS_COLORS: Record<CoverageStatus, string> = {
  good: '#16a34a',    // green-600
  low: '#f59e0b',     // amber-500
  bad: '#dc2626',     // red-600
}

const STATUS_LABELS: Record<CoverageStatus, string> = {
  good: 'Boa Cobertura',
  low: 'Baixa Cobertura',
  bad: 'Má Cobertura',
}

export function NetworkMapboxMap({ municipalityCoverage }: NetworkMapboxMapProps) {
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

  // Create a map of municipality -> status for quick lookup
  const coverageMap = useMemo(() => {
    const map: Record<string, CoverageStatus> = {}
    municipalityCoverage.forEach(({ municipality, status }) => {
      map[municipality.toLowerCase()] = status
    })
    return map
  }, [municipalityCoverage])

  // Process GeoJSON to add coverage status to each municipality
  const processedGeojson = useMemo(() => {
    if (!geojsonData) return null

    const features = geojsonData.features.map(feature => {
      const municipalityName = (feature.properties?.con_name || '').toLowerCase()
      const status = coverageMap[municipalityName]

      return {
        ...feature,
        properties: {
          ...feature.properties,
          coverage_status: status || null, // null = transparente (sem pedidos)
          coverage_color: status ? STATUS_COLORS[status] : 'rgba(0,0,0,0)',
        },
      }
    })

    return {
      type: 'FeatureCollection' as const,
      features,
    }
  }, [geojsonData, coverageMap])

  // Calculate statistics
  const stats = useMemo(() => {
    const counts = { good: 0, low: 0, bad: 0 }
    municipalityCoverage.forEach(({ status }) => {
      counts[status]++
    })
    return counts
  }, [municipalityCoverage])

  const onHover = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0]
    if (feature?.properties) {
      const status = feature.properties.coverage_status as CoverageStatus | null

      // Only show popup for municipalities with coverage data
      if (status) {
        const [lng, lat] = event.lngLat.toArray()
        setHoveredMunicipality({
          name: feature.properties.con_name,
          district: feature.properties.dis_name,
          status,
          lng,
          lat,
        })
      } else {
        setHoveredMunicipality(null)
      }
    } else {
      setHoveredMunicipality(null)
    }
  }, [])

  const onMouseLeave = useCallback(() => {
    setHoveredMunicipality(null)
  }, [])

  const onClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0]
    if (feature?.properties) {
      const status = feature.properties.coverage_status as CoverageStatus | null

      // Only allow clicking on municipalities with coverage data
      if (status) {
        setSelectedMunicipality({
          name: feature.properties.con_name,
          district: feature.properties.dis_name,
        })
        setCoverageDialogOpen(true)
      }
    }
  }, [])

  if (!mapboxToken) {
    return (
      <Card className="flex-1">
        <CardContent className="flex items-center justify-center h-full p-8">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Mapbox token not configured</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !processedGeojson) {
    return (
      <Card className="flex-1">
        <CardContent className="flex items-center justify-center h-full p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">A carregar mapa...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.good }} />
                <span className="text-sm">
                  🟢 Boa ({stats.good})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.low }} />
                <span className="text-sm">
                  🟡 Baixa ({stats.low})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.bad }} />
                <span className="text-sm">
                  🔴 Má ({stats.bad})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: 'transparent' }} />
                <span className="text-sm">
                  Sem pedidos
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Baseado em capacidade: (Prestadores × Pedidos/Prestador) / Total Pedidos × 100%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="flex-1 min-h-0">
        <CardContent className="p-0 h-full">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapboxAccessToken={mapboxToken}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/light-v11"
            interactiveLayerIds={['municipalities-fill']}
            onMouseMove={onHover}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            cursor={hoveredMunicipality ? 'pointer' : 'grab'}
          >
            <NavigationControl position="top-right" />

            <Source id="municipalities" type="geojson" data={processedGeojson}>
              {/* Fill layer */}
              <Layer
                id="municipalities-fill"
                type="fill"
                paint={{
                  'fill-color': ['get', 'coverage_color'],
                  'fill-opacity': [
                    'case',
                    ['==', ['get', 'coverage_status'], null],
                    0, // Transparent for municipalities without requests
                    0.6,
                  ],
                }}
              />
              {/* Border layer */}
              <Layer
                id="municipalities-border"
                type="line"
                paint={{
                  'line-color': '#94a3b8',
                  'line-width': 0.5,
                  'line-opacity': 0.5,
                }}
              />
            </Source>

            {/* Hover popup */}
            {hoveredMunicipality && (
              <Popup
                longitude={hoveredMunicipality.lng}
                latitude={hoveredMunicipality.lat}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={10}
              >
                <div className="text-sm min-w-50">
                  <div className="font-semibold">{hoveredMunicipality.name}</div>
                  <div className="text-xs text-muted-foreground">{hoveredMunicipality.district}</div>
                  <div className="mt-1 text-xs font-medium">
                    {STATUS_LABELS[hoveredMunicipality.status]}
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </CardContent>
      </Card>

      {/* Coverage Dialog */}
      <MunicipalityCoverageDialog
        municipality={selectedMunicipality?.name || null}
        district={selectedMunicipality?.district}
        open={coverageDialogOpen}
        onOpenChange={setCoverageDialogOpen}
      />
    </div>
  )
}
