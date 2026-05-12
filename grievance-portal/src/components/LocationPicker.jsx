import { useState, useCallback } from 'react'
import { MapPin, Navigation, Pencil, Map } from 'lucide-react'

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleGPS}
            className="group flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] rounded-2xl hover:border-[#990000]/30 hover:shadow-md transition-all duration-300 text-center relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-[#990000]/5 transition-all duration-300">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg" 
                alt="Google Maps" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-[15px] text-gray-800 group-hover:text-[#990000] transition-colors duration-300">Use My Current Location</div>
              <div className="text-xs text-gray-500 mt-1">Auto-detect via GPS</div>
            </div>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="group flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] rounded-2xl hover:border-[#990000]/30 hover:shadow-md transition-all duration-300 text-center relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-[#990000]/5 transition-all duration-300">
              <img 
                src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4dd.svg" 
                alt="Manual Entry" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-[15px] text-gray-800 group-hover:text-[#990000] transition-colors duration-300">Manually Enter Address</div>
              <div className="text-xs text-gray-500 mt-1">Type address details</div>
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
