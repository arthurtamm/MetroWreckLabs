import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { GeoPoint } from '../data/types'

interface Props {
  birth: GeoPoint
  death: GeoPoint
}

function fmtDate(iso: string): string {
  // Show year prominently; ISO already human-enough for v1.
  return iso
}

// MapContainer only honors `bounds` on first mount. This re-fits the view
// whenever the person (and thus the coordinates) changes — mode switch, play again.
function FitBounds({ birth, death }: Props) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(
      [
        [birth.lat, birth.lng],
        [death.lat, death.lng],
      ],
      { padding: [60, 60] },
    )
  }, [map, birth.lat, birth.lng, death.lat, death.lng])
  return null
}

export function MapView({ birth, death }: Props) {
  const bounds: [number, number][] = [
    [birth.lat, birth.lng],
    [death.lat, death.lng],
  ]
  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [60, 60] }}
      scrollWheelZoom
      className="map"
      worldCopyJump
    >
      <FitBounds birth={birth} death={death} />
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[birth.lat, birth.lng]} radius={10}
        pathOptions={{ color: '#10803a', fillColor: '#34d399', fillOpacity: 0.9 }}>
        <Tooltip permanent direction="top">🟢 Born {fmtDate(birth.date)}</Tooltip>
      </CircleMarker>
      <CircleMarker center={[death.lat, death.lng]} radius={10}
        pathOptions={{ color: '#991b1b', fillColor: '#f87171', fillOpacity: 0.9 }}>
        <Tooltip permanent direction="top">🔴 Died {fmtDate(death.date)}</Tooltip>
      </CircleMarker>
    </MapContainer>
  )
}
