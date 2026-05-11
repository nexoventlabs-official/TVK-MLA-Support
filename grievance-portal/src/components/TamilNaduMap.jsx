import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2 } from 'lucide-react'

/**
 * Read-only Tamil Nadu district map for the citizen portal landing page.
 *
 * This is a Vite-side port of the admin panel's `SidebarMapLeaflet.tsx`
 * (TN-MLA project) — same GeoJSON, same fit-to-bounds logic, but recoloured
 * in the portal's maroon (#990000) / gold (#FFD700) palette and locked
 * down (no drag / zoom / scroll-wheel) so it reads as an infographic
 * rather than an interactive map.
 *
 * The GeoJSON file is ~2 MB so we fetch it from `/data/tn_districts.json`
 * lazily on mount instead of bundling it. Keeps the initial JS payload
 * small and the network cost only happens for visitors who land on the
 * page (and the browser caches it for repeat views).
 */

const DISTRICT_ALIASES = {
  // Districts split off post-2011 → fall back to their parent in the GeoJSON
  TIRUPATHUR: 'VELLORE',
  RANIPET: 'VELLORE',
  CHENGALPATTU: 'KANCHEEPURAM',
  KALLAKURICHI: 'VILLUPURAM',
  KALLAKURUCHI: 'VILLUPURAM',
  VILUPURAM: 'VILLUPURAM',
  TENKASI: 'TIRUNELVELI KATTABO',
  TIRUNELVELI: 'TIRUNELVELI KATTABO',
  KRISHNAGIRI: 'DHARMAPURI',
  MAYILADUTHURAI: 'NAGAPATTINAM',
  TIRUPPUR: 'COIMBATORE',
  TIRUCHIRAPALLI: 'TIRUCHCHIRAPPALLI',
  TIRUCHIRAPPALLI: 'TIRUCHCHIRAPPALLI',
  PUDUKOTTAI: 'PUDUKKOTTAI',
}

const normalize = (s) => (s || '').trim().toUpperCase().replace(/[^A-Z]/g, '')

/**
 * Inner helper that locks the map to a fixed centre/zoom regardless of
 * container resize — without this the map stays blank on first paint
 * because Leaflet measures the container before CSS has settled.
 */
function FitBounds({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize()
      map.setView(center, zoom, { animate: false })
    }, 150)
    return () => clearTimeout(t)
  }, [map, center, zoom])
  return null
}

export default function TamilNaduMap({ 
  highlightedDistrict = 'CHENNAI',
  singleDistrictMode = false,
  baseFill = '#e5e7eb',
  hoverFill = '#fef08a',
  highlightFill = '#990000',
  baseColor = '#cbd5e1',
  highlightColor = '#FFD700',
  baseOpacity = 0.55,
  highlightOpacity = 0.92,
  zoom = 6,
  center = [10.9, 78.4]
}) {
  const [geo, setGeo] = useState(null)
  const [error, setError] = useState(null)

  // Resolve aliases once so styleFeature / tooltips can use a stable key.
  const aliased = DISTRICT_ALIASES[normalize(highlightedDistrict)] || normalize(highlightedDistrict)
  const target = normalize(aliased)

  // Lazy-load the 2 MB GeoJSON. Cached by the browser, so repeat
  // navigation back to the landing page is free.
  useEffect(() => {
    let cancelled = false
    fetch('/data/tn_districts.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setGeo(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load map')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const styleFeature = (feature) => {
    const featureName = normalize(feature?.properties?.NAME_2)
    const isMatched =
      target && (featureName.includes(target) || target.includes(featureName))
    
    if (singleDistrictMode && !isMatched) {
      return { opacity: 0, fillOpacity: 0, weight: 0 }
    }

    return {
      fillColor: isMatched ? highlightFill : baseFill,
      weight: isMatched ? (singleDistrictMode ? 2 : 1.6) : 0.8,
      opacity: 1,
      color: isMatched ? highlightColor : baseColor,
      fillOpacity: isMatched ? highlightOpacity : baseOpacity,
    }
  }

  const onEachFeature = (feature, layer) => {
    const name = feature?.properties?.NAME_2
    if (!name) return
    layer.bindTooltip(name, {
      className:
        '!bg-white !text-navy !border-gray-200 !text-[11px] !shadow-lg !rounded-lg !px-2 !py-1 !font-semibold',
      sticky: true,
    })

    if (!singleDistrictMode) {
      layer.on({
        mouseover: (e) => {
          const featureName = normalize(feature?.properties?.NAME_2)
          const isMatched = target && (featureName.includes(target) || target.includes(featureName))
          
          if (!isMatched) {
            e.target.setStyle({
              fillColor: hoverFill,
              fillOpacity: 0.9,
            });
            e.target.bringToFront();
          }
        },
        mouseout: (e) => {
          e.target.setStyle(styleFeature(feature));
        }
      });
    }
  }

  if (error) {
    return (
      <div className="w-full h-full grid place-items-center text-xs text-gray-400">
        Map unavailable
      </div>
    )
  }

  if (!geo) {
    return (
      <div className="w-full h-full grid place-items-center">
        <Loader2 className="animate-spin text-[#990000]/60" size={28} />
      </div>
    )
  }

  return (
    <>
      <style>{`
        .leaflet-interactive:focus {
          outline: none;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={Math.floor(zoom)}
        maxZoom={Math.ceil(zoom)}
        zoomSnap={0.1}
        className="w-full h-full bg-transparent z-0"
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <GeoJSON data={geo} style={styleFeature} onEachFeature={onEachFeature} />
        <FitBounds center={center} zoom={zoom} />
      </MapContainer>
    </>
  )
}
