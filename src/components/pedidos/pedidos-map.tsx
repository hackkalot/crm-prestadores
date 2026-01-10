'use client'

import { useState, useMemo, useCallback } from 'react'
import Map, { Popup, NavigationControl, Source, Layer } from 'react-map-gl/mapbox'
import type { MapMouseEvent } from 'react-map-gl/mapbox'
import type { MapServiceRequest } from '@/lib/service-requests/actions'
import { PORTUGAL_CENTER } from '@/lib/geo/portugal-coordinates'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Calendar, User, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import 'mapbox-gl/dist/mapbox-gl.css'

interface PedidosMapProps {
  pedidos: MapServiceRequest[]
}

function getStatusColor(status: string): string {
  if (status === 'Novo pedido') return '#eab308' // yellow
  if (status === 'Atribuir prestador') return '#f97316' // orange
  if (status === 'Prestador atribuído') return '#3b82f6' // blue
  if (status === 'Concluído') return '#22c55e' // green
  if (status?.includes('Cancelado')) return '#ef4444' // red
  return '#6b7280' // gray
}

function getStatusBadgeClass(status: string): string {
  if (status === 'Novo pedido') return 'bg-yellow-100 text-yellow-800'
  if (status === 'Atribuir prestador') return 'bg-orange-100 text-orange-800'
  if (status === 'Prestador atribuído') return 'bg-blue-100 text-blue-800'
  if (status === 'Concluído') return 'bg-green-100 text-green-800'
  if (status?.includes('Cancelado')) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function PedidosMap({ pedidos }: PedidosMapProps) {
  const [selectedPedido, setSelectedPedido] = useState<MapServiceRequest | null>(null)
  const [viewState, setViewState] = useState({
    longitude: PORTUGAL_CENTER.lng,
    latitude: PORTUGAL_CENTER.lat,
    zoom: 6.5,
  })

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Convert pedidos to GeoJSON for clustering
  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: pedidos.map((pedido) => ({
      type: 'Feature' as const,
      properties: {
        id: pedido.id,
        request_code: pedido.request_code,
        status: pedido.status,
        category: pedido.category,
        service: pedido.service,
        city: pedido.city,
        district: pedido.district,
        assigned_provider_name: pedido.assigned_provider_name,
        created_at: pedido.created_at,
        color: getStatusColor(pedido.status),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [pedido.lng, pedido.lat],
      },
    })),
  }), [pedidos])

  const handleMarkerClick = useCallback((pedido: MapServiceRequest) => {
    setSelectedPedido(pedido)
  }, [])

  const handleClusterClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0]
    if (!feature) return

    const clusterId = feature.properties?.cluster_id
    if (clusterId) {
      // Zoom into cluster
      const map = event.target
      const source = map.getSource('pedidos')
      if (source && 'getClusterExpansionZoom' in source) {
        (source as { getClusterExpansionZoom: (id: number, cb: (err: Error | null, zoom: number | null) => void) => void })
          .getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return
            map.easeTo({
              center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom ?? 10,
              duration: 500,
            })
          })
      }
    } else {
      // Single point - find the pedido and show popup
      const pedidoId = feature.properties?.id
      const pedido = pedidos.find((p) => p.id === pedidoId)
      if (pedido) {
        setSelectedPedido(pedido)
      }
    }
  }, [pedidos])

  if (!mapboxToken) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
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

  if (pedidos.length === 0) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nenhum pedido para mostrar no mapa</p>
          <p className="text-sm text-muted-foreground mt-2">
            Ajusta os filtros ou aguarda novos pedidos
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative flex-1 min-h-[400px]">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur-sm rounded-lg border p-3 shadow-lg">
        <p className="text-xs font-medium mb-2">Estado dos pedidos</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Novo pedido</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Atribuir prestador</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Prestador atribuido</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Concluido</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Cancelado</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-14 z-10 bg-background/95 backdrop-blur-sm rounded-lg border px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{pedidos.length}</span> pedidos no mapa
        </p>
      </div>

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={mapboxToken}
        interactiveLayerIds={['clusters', 'unclustered-point']}
        onClick={handleClusterClick}
      >
        <NavigationControl position="top-right" />

        <Source
          id="pedidos"
          type="geojson"
          data={geojsonData}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          {/* Cluster circles */}
          <Layer
            id="clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#3b82f6', // blue for small clusters
                10,
                '#f97316', // orange for medium
                30,
                '#ef4444', // red for large
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20, // small
                10,
                25, // medium
                30,
                35, // large
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />

          {/* Cluster count labels */}
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            }}
            paint={{
              'text-color': '#ffffff',
            }}
          />

          {/* Individual points */}
          <Layer
            id="unclustered-point"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': 8,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </Source>

        {/* Popup */}
        {selectedPedido && (
          <Popup
            longitude={selectedPedido.lng}
            latitude={selectedPedido.lat}
            anchor="bottom"
            onClose={() => setSelectedPedido(null)}
            closeOnClick={false}
            className="pedidos-map-popup"
          >
            <div className="p-1 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <Link
                  href={`/pedidos/${selectedPedido.request_code}`}
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {selectedPedido.request_code}
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <Badge className={getStatusBadgeClass(selectedPedido.status)}>
                  {selectedPedido.status}
                </Badge>
              </div>

              {selectedPedido.service && (
                <p className="text-sm mb-1">{selectedPedido.service}</p>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedPedido.city || selectedPedido.district || 'Localizacao desconhecida'}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(selectedPedido.created_at)}
                </div>
                {selectedPedido.assigned_provider_name && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {selectedPedido.assigned_provider_name}
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
