import { useState, useCallback } from 'react'
import { MapPin, Navigation, Pencil } from 'lucide-react'

export default function LocationPicker({ onLocationSelect }) {
  const [mode, setMode] = useState(null) // null, 'gps', 'manual'
  const [gpsLoading, setGpsLoading] = useState(false)
  const [manualText, setManualText] = useState('')
  const [gpsResult, setGpsResult] = useState(null)
  const [error, setError] = useState('')

  const handleGPS = useCallback(() => {
    setMode('gps')
    setGpsLoading(true)
    setError('')

    if (!navigator.geolocation) {
      setError('GPS not supported on this device. Please type your location manually.')
      setGpsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const text = `Mylapore, Chennai — GPS: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
        setGpsResult({ lat, lng, text })
        onLocationSelect({ text, lat, lng })
        setGpsLoading(false)
      },
      (err) => {
        // Fallback to approximate Mylapore coords
        const lat = 13.0339
        const lng = 80.2619
        const text = `Mylapore, Chennai — GPS: ${lat}°N, ${lng}°E (approximate)`
        setGpsResult({ lat, lng, text })
        onLocationSelect({ text, lat, lng })
        setGpsLoading(false)
        setError('GPS access denied. Using approximate Mylapore location.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [onLocationSelect])

  const handleManualSubmit = () => {
    if (!manualText.trim()) return
    onLocationSelect({ text: manualText.trim(), lat: 13.0339, lng: 80.2619 })
    setMode('manual-done')
  }

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      {!mode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleGPS}
            className="flex items-center gap-3 p-4 border-2 border-navy/20 rounded-lg hover:border-navy hover:bg-navy/5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
              <Navigation className="w-5 h-5 text-navy" />
            </div>
            <div>
              <div className="font-semibold text-sm text-navy">📍 Use My Current Location</div>
              <div className="text-xs text-gray-500">Auto-detect via GPS</div>
            </div>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-saffron hover:bg-saffron/5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-saffron/10 flex items-center justify-center flex-shrink-0">
              <Pencil className="w-5 h-5 text-saffron" />
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-700">✏️ Type Landmark / Area</div>
              <div className="text-xs text-gray-500">Enter manually</div>
            </div>
          </button>
        </div>
      )}

      {/* GPS Loading */}
      {mode === 'gps' && gpsLoading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-3 border-navy border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Detecting your location...</p>
        </div>
      )}

      {/* GPS Result */}
      {mode === 'gps' && !gpsLoading && gpsResult && (
        <div>
          {error && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-xs text-orange-700">
              ⚠️ {error}
            </div>
          )}
          {/* Google Maps Embed */}
          <div className="rounded-lg overflow-hidden border border-gray-200 mb-3">
            <iframe
              width="100%"
              height="200"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${gpsResult.lat},${gpsResult.lng}&zoom=16`}
              title="Location Map"
            ></iframe>
          </div>
          <div className="flex items-center gap-2 text-sm text-tvk-green">
            <MapPin className="w-4 h-4" />
            <span>{gpsResult.text}</span>
          </div>
          <button onClick={() => { setMode(null); setGpsResult(null) }} className="text-xs text-navy hover:underline mt-2">
            ↺ Change location
          </button>
        </div>
      )}

      {/* Manual Input */}
      {mode === 'manual' && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Enter Location / Landmark
          </label>
          <input
            type="text"
            className="input-field"
            placeholder='e.g. "Near Kapaleeshwarar Temple", "Luz Corner junction"'
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">Tip: Include street name or nearby landmark for faster resolution</p>
          <div className="flex gap-3 mt-3">
            <button onClick={() => setMode(null)} className="text-xs text-gray-500 hover:underline">← Back</button>
            <button
              onClick={handleManualSubmit}
              className="btn-primary text-sm py-2"
              disabled={!manualText.trim()}
            >
              Confirm Location
            </button>
          </div>
        </div>
      )}

      {/* Manual Done */}
      {mode === 'manual-done' && (
        <div>
          <div className="flex items-center gap-2 text-sm text-tvk-green">
            <MapPin className="w-4 h-4" />
            <span>{manualText}</span>
          </div>
          <button onClick={() => { setMode('manual'); setManualText('') }} className="text-xs text-navy hover:underline mt-2">
            ↺ Change location
          </button>
        </div>
      )}
    </div>
  )
}
