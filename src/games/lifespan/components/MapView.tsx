import { useEffect } from 'react'
import { MapContainer, GeoJSON, CircleMarker, useMap } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'
import type { GeoPoint } from '../data/types'
import countriesData from '../data/countries.json'

// Flat-color countries with borders but no labels — players read the country
// from its shape, borders, and position rather than from place names.
const countries = countriesData as unknown as GeoJsonObject

/*
 * Leaflet takes colors as JS options, which cannot read CSS custom
 * properties — so these mirror tokens.css by hand. Keep them in sync with
 * --land, --coast, --born and --died.
 */
export const MAP_COLORS = {
  land: '#dfe3e7',
  coast: '#b9c0c7',
  born: '#6aaa64',
  died: '#c9433f',
} as const

const landStyle = {
  color: MAP_COLORS.coast,
  weight: 1,
  fillColor: MAP_COLORS.land,
  fillOpacity: 1,
}

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
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: MAP_COLORS.born, fillOpacity: 1 }} />
      <CircleMarker center={[death.lat, death.lng]} radius={9}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: MAP_COLORS.died, fillOpacity: 1 }} />
    </MapContainer>
  )
}
