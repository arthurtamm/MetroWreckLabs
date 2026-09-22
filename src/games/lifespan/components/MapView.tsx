import { useEffect } from 'react'
import { MapContainer, GeoJSON, CircleMarker, useMap } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'
import type { GeoPoint } from '../data/types'
import countriesData from '../data/countries.json'

// Flat-color countries with borders but no labels — players read the country
// from its shape, borders, and position rather than from place names.
const countries = countriesData as unknown as GeoJsonObject
const landStyle = { color: '#0a2a43', weight: 1, fillColor: '#cbd5e1', fillOpacity: 1 }

interface Props {
  birth: GeoPoint
  death: GeoPoint
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
      <GeoJSON data={countries} style={landStyle} />
      {/* Dates are shown as a legend below the map (see App) — the markers stay
          label-free so they never overlap and the map reads cleanly. */}
      <CircleMarker center={[birth.lat, birth.lng]} radius={9}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#34d399', fillOpacity: 1 }} />
      <CircleMarker center={[death.lat, death.lng]} radius={9}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#f87171', fillOpacity: 1 }} />
    </MapContainer>
  )
}
