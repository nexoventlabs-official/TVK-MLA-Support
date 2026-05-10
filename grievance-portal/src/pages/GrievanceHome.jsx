import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Send, ChevronRight, AlertCircle, Camera, X } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import LocationPicker from '../components/LocationPicker'

import { SERVICES } from '../utils/servicesData'

export default function GrievanceHome() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Hold the full service / option objects (not just titles) so the request
  // body sent to /portal/grievances carries the canonical IDs the backend
  // and admin dashboard expect.
  const [step, setStep] = useState(1) // 1=category, 2=sub, 3=location, 4=description, 5=confirm
  const [serviceObj, setServiceObj] = useState(null)
  const [optionObj, setOptionObj] = useState(null)
  const [location, setLocation] = useState({ text: '', lat: null, lng: null })
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [grievanceId, setGrievanceId] = useState(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image too large. Please select a photo smaller than 10MB.')
        e.target.value = ''
        return
      }
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const handleLocationSelect = useCallback((loc) => {
    setLocation(loc)
  }, [])

  const handleSubmit = async () => {
    if (!user) {
      alert("Please log in to submit a grievance.")
      navigate('/login')
      return
    }

    if (!serviceObj || !optionObj) {
      alert('Please pick a category and issue type before submitting.')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('serviceId', serviceObj.id)
    formData.append('serviceTitle', serviceObj.title)
    formData.append('optionId', optionObj.id)
    formData.append('optionTitle', optionObj.title)
    formData.append('description', description)
    formData.append('location', location.text)
    if (location.lat != null) formData.append('lat', location.lat)
    if (location.lng != null) formData.append('lng', location.lng)
    if (image) formData.append('image', image)

    try {
      const res = await api.post('/portal/grievances', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setGrievanceId(res.data.grievanceId)
      setStep(5)
    } catch (err) {
      console.error('Submission error:', err)
      alert(err.response?.data?.error || 'Failed to submit grievance. Please check your internet connection and try again.')
    }
    setLoading(false)
  }

  // Convenience aliases used by the existing template literal copy below.
  const category = serviceObj?.title || ''
  const subCategory = optionObj?.title || ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      {/* Step Progress */}
      <div className="flex items-center justify-between mb-6">
        {['Category', 'Sub-Category', 'Location', 'Description', 'Done'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i + 1 <= step ? 'bg-navy text-white' : 'bg-gray-200 text-gray-500'
            } ${i + 1 === step ? 'ring-2 ring-navy/30 ring-offset-1' : ''}`}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span className={`ml-1 text-xs hidden lg:inline ${i + 1 <= step ? 'text-navy font-semibold' : 'text-gray-400'}`}>{s}</span>
            {i < 4 && <div className={`w-4 md:w-8 h-0.5 mx-1 ${i + 1 < step ? 'bg-navy' : 'bg-gray-200'}`}></div>}
          </div>
        ))}
      </div>

      {/* STEP 1: Category */}
      {step === 1 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">📋 Step 1: Select Category</h2>
          <p className="text-sm text-gray-500 mb-6">Choose the department / type of issue you want to report</p>

          <div className="grid sm:grid-cols-2 gap-3">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => { setServiceObj(s); setOptionObj(null); setStep(2) }}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-navy hover:bg-navy/5 transition-all flex items-start gap-3 group bg-white shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform flex-shrink-0 p-1 border border-gray-100">
                  {s.img ? (
                    <img src={s.img} alt={s.title} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl">{s.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-navy text-sm mb-0.5 flex items-center justify-between">
                    <span className="truncate">{s.title}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-navy group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </h3>
                  <p className="text-[11px] text-gray-500 leading-tight">{s.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Sub-Category */}
      {step === 2 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">🔍 Step 2: Select Issue Type</h2>
          <p className="text-sm text-gray-500 mb-4">Choose the specific issue under <strong>{category}</strong></p>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {(serviceObj?.options || []).map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => { setOptionObj(opt); setStep(3) }}
                className="w-full text-left p-4 border border-gray-200 rounded-2xl hover:border-navy hover:bg-navy/5 transition-all flex items-center gap-4 group bg-white shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform flex-shrink-0 p-1 border border-gray-100">
                  {opt.img ? (
                    <img src={opt.img} alt={opt.title} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-navy/5 text-navy text-xs font-bold">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-navy mb-0.5">{opt.title}</div>
                  <div className="text-[11px] text-gray-500">{opt.description}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-navy group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          <button onClick={() => setStep(1)} className="mt-4 text-xs text-navy hover:underline">← Back to Categories</button>
        </div>
      )}

      {/* STEP 3: Location */}
      {step === 3 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">📍 Step 3: Share Issue Location</h2>
          <p className="text-sm text-gray-500 mb-4">Help the MLA team locate the exact problem area</p>

          <LocationPicker onLocationSelect={handleLocationSelect} />

          {location.text && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-tvk-green flex-shrink-0" />
              <span className="text-sm text-green-700">{location.text}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="btn-outline text-sm flex-1">← Back</button>
            <button
              onClick={() => setStep(4)}
              className="btn-primary text-sm flex-1"
              disabled={!location.text}
            >
              Next: Describe Issue →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Description */}
      {step === 4 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-navy font-serif mb-2">💬 Step 4: Describe Your Issue</h2>
          <p className="text-sm text-gray-500 mb-4">Write a clear, brief description (max 200 characters)</p>

          <div className="relative">
            <textarea
              className="input-field h-32 resize-none"
              placeholder="Describe the problem clearly..."
              value={description}
              onChange={(e) => e.target.value.length <= 200 && setDescription(e.target.value)}
              autoFocus
            />
            <span className={`absolute bottom-2 right-3 text-xs ${description.length > 170 ? 'text-saffron font-semibold' : 'text-gray-400'}`}>
              {description.length}/200
            </span>
          </div>

          {/* Image Upload */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              📷 Attach Photo <span className="text-gray-400 font-normal normal-case">(optional, max 5MB)</span>
            </label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-navy hover:bg-navy/5 transition-all">
                <Camera className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload issue photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4 text-sm space-y-1">
            <div><strong className="text-gray-500">Category:</strong> {category}</div>
            <div><strong className="text-gray-500">Issue:</strong> {subCategory}</div>
            <div><strong className="text-gray-500">Location:</strong> {location.text}</div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(3)} className="btn-outline text-sm flex-1">← Back</button>
            <button
              onClick={handleSubmit}
              className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
              disabled={loading || !description.trim()}
            >
              {loading ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Grievance</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Confirmation */}
      {step === 5 && (
        <div className="card p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="text-lg font-bold text-tvk-green font-serif">Grievance Successfully Registered!</h2>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <div className="text-lg font-extrabold text-tvk-green mb-3">✅ Reference ID: #{grievanceId}</div>
            <div className="text-sm text-green-800 space-y-1">
              <div><strong>Category:</strong> {category}</div>
              <div><strong>Issue Type:</strong> {subCategory}</div>
              <div><strong>Location:</strong> {location.text}</div>
              <div><strong>Your Message:</strong> "{description.substring(0, 100)}{description.length > 100 ? '...' : ''}"</div>
            </div>

            <div className="mt-4 bg-white border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <span className="text-sm text-tvk-green">⏱ MLA Venkatramanan's office will respond within <strong>7 working days</strong></span>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Status</span><span>Received</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-saffron rounded-full w-[12%]"></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>✅ Received</span><span>Under Review</span><span>Action Taken</span><span>Resolved</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={() => navigate('/my-grievances')} className="btn-outline text-sm">
              📂 My Grievances
            </button>
            <button onClick={() => { setStep(1); setServiceObj(null); setOptionObj(null); setLocation({ text: '', lat: null, lng: null }); setDescription('') }} className="btn-primary text-sm">
              ➕ Raise Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
