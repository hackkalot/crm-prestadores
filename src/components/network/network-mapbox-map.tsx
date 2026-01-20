'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Map, { Source, Layer, NavigationControl, Popup, Marker } from 'react-map-gl/mapbox'
import type { MapMouseEvent } from 'react-map-gl/mapbox'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PORTUGAL_CENTER } from '@/lib/geo/portugal-coordinates'
import { MapPin, Loader2, Filter, AlertCircle } from 'lucide-react'
import { MunicipalityCoverageDialog } from './municipality-coverage-dialog'
import type { MunicipalityGaps } from '@/lib/network/coverage-actions'
import 'mapbox-gl/dist/mapbox-gl.css'

interface NetworkMapboxMapProps {
  municipalityCoverage: Array<{
    municipality: string
    district: string
    status: 'good' | 'low' | 'bad'
  }>
  municipalityGaps: MunicipalityGaps[]
}

type CoverageStatus = 'good' | 'low' | 'bad'

interface MunicipalityPopupData {
  name: string
  district: string
  status: CoverageStatus
  gapCount: number
  badGaps: number
  lowGaps: number
  gapServices: Array<{ service: string; status: 'low' | 'bad' }>
  lng: number
  lat: number
}

// Colors for coverage status (with opacity for fills)
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

// Helper to calculate centroid of a polygon (simple average of coordinates)
function calculateCentroid(coordinates: number[][][]): [number, number] {
  let totalLng = 0
  let totalLat = 0
  let count = 0

  coordinates[0].forEach(([lng, lat]) => {
    totalLng += lng
    totalLat += lat
    count++
  })

  return [totalLng / count, totalLat / count]
}

export function NetworkMapboxMap({ municipalityCoverage, municipalityGaps }: NetworkMapboxMapProps) {
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredMunicipality, setHoveredMunicipality] = useState<MunicipalityPopupData | null>(null)
  const [selectedMunicipality, setSelectedMunicipality] = useState<{ name: string; district: string } | null>(null)
  const [coverageDialogOpen, setCoverageDialogOpen] = useState(false)
  const [serviceFilter, setServiceFilter] = useState<string>('all')
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

  // Create map of municipality -> gaps (filtered by service if needed)
  const gapsMap = useMemo(() => {
    const map: Record<string, MunicipalityGaps> = {}
    municipalityGaps.forEach(gap => {
      const key = gap.municipality.toLowerCase()

      // If service filter is active, filter gap services
      if (serviceFilter !== 'all') {
        const filteredServices = gap.gapServices.filter(s => s.service === serviceFilter)
        if (filteredServices.length > 0) {
          const badCount = filteredServices.filter(s => s.status === 'bad').length
          const lowCount = filteredServices.filter(s => s.status === 'low').length
          map[key] = {
            ...gap,
            gapServices: filteredServices,
            totalGaps: filteredServices.length,
            badGaps: badCount,
            lowGaps: lowCount,
          }
        }
      } else {
        map[key] = gap
      }
    })
    return map
  }, [municipalityGaps, serviceFilter])

  // Create a map of municipality -> status for quick lookup
  const coverageMap = useMemo(() => {
    const map: Record<string, CoverageStatus> = {}
    municipalityCoverage.forEach(({ municipality, status }) => {
      map[municipality.toLowerCase()] = status
    })
    return map
  }, [municipalityCoverage])

  // Extract unique services from gaps
  const availableServices = useMemo(() => {
    const services = new Set<string>()
    municipalityGaps.forEach(gap => {
      gap.gapServices.forEach(s => services.add(s.service))
    })
    return Array.from(services).sort()
  }, [municipalityGaps])

  // Process GeoJSON to add coverage status and calculate centroids
  const processedGeojson = useMemo(() => {
    if (!geojsonData) return null

    const features = geojsonData.features.map(feature => {
      const municipalityName = (feature.properties?.con_name || '').toLowerCase()
      const gaps = gapsMap[municipalityName]

      // Determine color based on gaps (priority: bad > low > good)
      let status = coverageMap[municipalityName] || null
      let color = status ? STATUS_COLORS[status] : 'rgba(0,0,0,0)'

      // Override with gap-based coloring if gaps exist
      if (gaps) {
        if (gaps.badGaps > 0) {
          status = 'bad'
          color = STATUS_COLORS.bad
        } else if (gaps.lowGaps > 0) {
          status = 'low'
          color = STATUS_COLORS.low
        }
      }

      // Calculate centroid for marker placement
      const centroid = feature.geometry.type === 'Polygon'
        ? calculateCentroid(feature.geometry.coordinates as number[][][])
        : feature.geometry.type === 'MultiPolygon'
        ? calculateCentroid((feature.geometry.coordinates as number[][][][])[0])
        : null

      return {
        ...feature,
        properties: {
          ...feature.properties,
          coverage_status: status,
          coverage_color: color,
          gap_count: gaps?.totalGaps || 0,
          bad_gaps: gaps?.badGaps || 0,
          low_gaps: gaps?.lowGaps || 0,
          centroid_lng: centroid?.[0],
          centroid_lat: centroid?.[1],
        },
      }
    })

    return {
      type: 'FeatureCollection' as const,
      features,
    }
  }, [geojsonData, coverageMap, gapsMap])

  // Get municipalities with gap markers (with centroids)
  const gapMarkers = useMemo(() => {
    if (!processedGeojson) return []

    return processedGeojson.features
      .filter(f => {
        const props = f.properties as any
        return props.gap_count > 0 && props.centroid_lng && props.centroid_lat
      })
      .map(f => {
        const props = f.properties as any
        return {
          name: props.con_name,
          district: props.dis_name,
          gapCount: props.gap_count,
          badGaps: props.bad_gaps,
          lowGaps: props.low_gaps,
          lng: props.centroid_lng as number,
          lat: props.centroid_lat as number,
          status: props.bad_gaps > 0 ? 'bad' as const : 'low' as const,
        }
      })
  }, [processedGeojson])

  // Calculate statistics
  const stats = useMemo(() => {
    const counts = { good: 0, low: 0, bad: 0, withGaps: 0 }
    Object.values(gapsMap).forEach(gap => {
      counts.withGaps++
      if (gap.badGaps > 0) counts.bad++
      else if (gap.lowGaps > 0) counts.low++
    })

    // Add municipalities with good coverage (no gaps)
    municipalityCoverage.forEach(({ municipality, status }) => {
      const key = municipality.toLowerCase()
      if (!gapsMap[key]) {
        if (status === 'good') counts.good++
      }
    })

    return counts
  }, [municipalityCoverage, gapsMap])

  const onHover = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0]
    if (feature?.properties) {
      const status = feature.properties.coverage_status as CoverageStatus | null
      const municipalityName = feature.properties.con_name?.toLowerCase()
      const gaps = municipalityName ? gapsMap[municipalityName] : null

      // Show popup for municipalities with coverage data
      if (status) {
        const [lng, lat] = event.lngLat.toArray()
        setHoveredMunicipality({
          name: feature.properties.con_name,
          district: feature.properties.dis_name,
          status,
          gapCount: feature.properties.gap_count || 0,
          badGaps: feature.properties.bad_gaps || 0,
          lowGaps: feature.properties.low_gaps || 0,
          gapServices: gaps?.gapServices.map(s => ({ service: s.service, status: s.status })) || [],
          lng,
          lat,
        })
      } else {
        setHoveredMunicipality(null)
      }
    } else {
      setHoveredMunicipality(null)
    }
  }, [gapsMap])

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
      {/* Legend + Service Filter */}
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

            {/* Service Filter */}
            {availableServices.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-62.5">
                    <SelectValue placeholder="Filtrar por serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os serviços</SelectItem>
                    {availableServices.map(service => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Baseado em capacidade: (Prestadores × Pedidos/Prestador) / Total Pedidos × 100%
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
                    // Vary opacity by number of gaps
                    [
                      'interpolate',
                      ['linear'],
                      ['get', 'gap_count'],
                      0, 0.3,  // No gaps = lighter
                      5, 0.6,  // Some gaps = medium
                      10, 0.8, // Many gaps = more intense
                    ],
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

            {/* Gap markers */}
            {gapMarkers.map((marker, idx) => (
              <Marker
                key={`${marker.name}-${idx}`}
                longitude={marker.lng}
                latitude={marker.lat}
                anchor="center"
              >
                <div
                  className="flex items-center justify-center rounded-full font-bold text-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: STATUS_COLORS[marker.status],
                    width: '32px',
                    height: '32px',
                    fontSize: '14px',
                  }}
                  title={`${marker.name}: ${marker.gapCount} lacuna${marker.gapCount > 1 ? 's' : ''}`}
                >
                  {marker.gapCount}
                </div>
              </Marker>
            ))}

            {/* Hover popup */}
            {hoveredMunicipality && (
              <Popup
                longitude={hoveredMunicipality.lng}
                latitude={hoveredMunicipality.lat}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={15}
              >
                <div className="text-sm min-w-50 max-w-xs">
                  <div className="font-semibold">{hoveredMunicipality.name}</div>
                  <div className="text-xs text-muted-foreground">{hoveredMunicipality.district}</div>
                  <div className="mt-1 text-xs font-medium">
                    {STATUS_LABELS[hoveredMunicipality.status]}
                  </div>

                  {/* Gap breakdown */}
                  {hoveredMunicipality.gapCount > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-1 text-xs font-medium mb-1">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span>{hoveredMunicipality.gapCount} Lacuna{hoveredMunicipality.gapCount > 1 ? 's' : ''}</span>
                      </div>
                      {hoveredMunicipality.badGaps > 0 && (
                        <div className="text-xs text-red-600">
                          • {hoveredMunicipality.badGaps} Má cobertura
                        </div>
                      )}
                      {hoveredMunicipality.lowGaps > 0 && (
                        <div className="text-xs text-amber-600">
                          • {hoveredMunicipality.lowGaps} Baixa cobertura
                        </div>
                      )}

                      {/* Show services if filtered or few gaps */}
                      {(serviceFilter !== 'all' || hoveredMunicipality.gapServices.length <= 3) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {hoveredMunicipality.gapServices.map((s, i) => (
                            <div key={i}>• {s.service}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
