import { useEffect } from 'react'
import { MapContainer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'
import type { GeoPoint } from '../data/types'
import landData from '../data/land.json'

// Solid landmasses, no borders/labels — the location itself is the puzzle.
const land = landData as unknown as GeoJsonObject
const landStyle = { color: '#2c5476', weight: 0, fillColor: '#cbd5e1', fillOpacity: 1 }

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
    // Cap zoom so the view always shows recognizable coastlines/continents for
    // context — without labels, tightly-zoomed land would be a featureless field.
    map.fitBounds(
      [
        [birth.lat, birth.lng],
        [death.lat, death.lng],
      ],
      { padding: [60, 60], maxZoom: 4 },
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
      attributionControl={false}
    >
      <FitBounds birth={birth} death={death} />
      <GeoJSON data={land} style={landStyle} />
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
