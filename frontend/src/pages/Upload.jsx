import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { detectionsApi } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'
import {
  Upload as UploadIcon, X, MapPin, Loader2,
  CheckCircle, AlertTriangle, Image as ImageIcon,
  Navigation, Search, Map, List, Scan, Activity, TrendingDown
} from 'lucide-react'
import clsx from 'clsx'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── Nominatim helpers ──────────────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru&zoom=18`,
      { headers: { 'Accept': 'application/json' } }
    )
    const data = await res.json()
    const a = data.address || {}
    const street = a.road || a.pedestrian || a.path || a.footway || a.cycleway || ''
    const houseNum = a.house_number ? ` ${a.house_number}` : ''
    const district = a.suburb || a.neighbourhood || a.quarter || ''
    const city = a.city || a.town || a.village || a.county || ''
    const region = a.state || city
    return {
      street: street ? `${street}${houseNum}` : '',
      district, city, region,
      displayName: street
        ? `${street}${houseNum}${district ? ', ' + district : ''}`
        : data.display_name?.split(',').slice(0, 2).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      full: data.display_name || '',
    }
  } catch {
    return { street: '', city: '', region: '', displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, full: '' }
  }
}

async function searchNominatim(query) {
  if (!query.trim() || query.length < 3) return []
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=kz&limit=6&accept-language=ru&addressdetails=1`,
      { headers: { 'Accept': 'application/json' } }
    )
    return await res.json()
  } catch { return [] }
}

function nearestCity(lat, lng) {
  let best = KZ_CITIES[0], bestDist = Infinity
  for (const city of KZ_CITIES) {
    const dLat = (city.lat - lat) * Math.PI / 180
    const dLng = (city.lng - lng) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(city.lat*Math.PI/180) * Math.sin(dLng/2)**2
    const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    if (dist < bestDist) { bestDist = dist; best = city }
  }
  return { ...best, distKm: Math.round(bestDist) }
}

function MapClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

const KZ_CITIES = [
  { name: 'Алматы',      lat: 43.2220, lng: 76.8512, region: 'Алматы' },
  { name: 'Астана',      lat: 51.1801, lng: 71.4460, region: 'Астана' },
  { name: 'Шымкент',     lat: 42.3417, lng: 69.5901, region: 'Түркістан' },
  { name: 'Қарағанды',   lat: 49.8028, lng: 73.0875, region: 'Қарағанды' },
  { name: 'Атырау',      lat: 47.1167, lng: 51.8833, region: 'Атырау' },
  { name: 'Өскемен',     lat: 49.9481, lng: 82.6164, region: 'Шығыс ҚЗ' },
  { name: 'Павлодар',    lat: 52.2873, lng: 76.9674, region: 'Павлодар' },
  { name: 'Семей',       lat: 50.4106, lng: 80.2275, region: 'Абай' },
  { name: 'Ақтөбе',      lat: 50.2797, lng: 57.2069, region: 'Ақтөбе' },
  { name: 'Тараз',       lat: 42.9000, lng: 71.3667, region: 'Жамбыл' },
  { name: 'Орал',        lat: 51.2333, lng: 51.3667, region: 'Батыс ҚЗ' },
  { name: 'Қостанай',    lat: 53.2144, lng: 63.6249, region: 'Қостанай' },
  { name: 'Петропавл',   lat: 54.8645, lng: 69.1530, region: 'Солтүстік ҚЗ' },
  { name: 'Қызылорда',   lat: 44.8479, lng: 65.5093, region: 'Қызылорда' },
  { name: 'Ақтау',       lat: 43.6500, lng: 51.2000, region: 'Маңғыстау' },
  { name: 'Талдықорған', lat: 45.0000, lng: 78.4000, region: 'Жетісу' },
  { name: 'Туркістан',   lat: 43.2975, lng: 68.2694, region: 'Түркістан' },
]

const PCI_INFO = (score) => {
  if (score >= 85) return { color: '#22c55e', label: 'Excellent — Өте жақсы', bg: '#22c55e15' }
  if (score >= 70) return { color: '#84cc16', label: 'Good — Жақсы', bg: '#84cc1615' }
  if (score >= 55) return { color: '#eab308', label: 'Satisfactory — Қанағаттанарлық', bg: '#eab30815' }
  if (score >= 40) return { color: '#f97316', label: 'Fair — Орташа', bg: '#f9731615' }
  if (score >= 25) return { color: '#ef4444', label: 'Poor — Нашар', bg: '#ef444415' }
  return { color: '#dc2626', label: 'Failed — Апатты', bg: '#dc262615' }
}

const DEFECT_ICONS = {
  pothole:            '🕳️',
  alligator_crack:    '🕸️',
  longitudinal_crack: '📏',
  transverse_crack:   '➖',
  rutting:            '〰️',
  raveling:           '💨',
}

export default function Upload() {
  const navigate = useNavigate()
  const { t } = useLang()

  // ── File state ─────────────────────────────────────────────────
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [resultImageUrl, setResultImageUrl] = useState(null)
  const [showAnnotated, setShowAnnotated] = useState(true)
  const [notes, setNotes] = useState('')

  // ── Location state ─────────────────────────────────────────────
  const [locMode, setLocMode] = useState('city')
  const [city, setCity] = useState(KZ_CITIES[0])
  const [locInfo, setLocInfo] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)

  const [streetQuery, setStreetQuery] = useState('')
  const [streetResults, setStreetResults] = useState([])
  const [streetSearching, setStreetSearching] = useState(false)
  const [streetChosen, setStreetChosen] = useState(null)
  const streetRef = useRef(null)

  const [mapPos, setMapPos] = useState({ lat: 43.2220, lng: 76.8512 })
  const [mapGeoLoading, setMapGeoLoading] = useState(false)
  const [mapLocInfo, setMapLocInfo] = useState(null)
  const [showMap, setShowMap] = useState(false)

  // ── Defect labels (language-aware) ────────────────────────────
  const DEFECT_LABELS = {
    pothole:            t('defPothole'),
    alligator_crack:    t('defAlligator'),
    longitudinal_crack: t('defLongitudinal'),
    transverse_crack:   t('defTransverse'),
    rutting:            t('defRutting'),
    raveling:           t('defRaveling'),
  }

  // ── Computed final coords ──────────────────────────────────────
  const finalCoords = (() => {
    if (locMode === 'gps'    && locInfo)      return { lat: locInfo.lat,      lng: locInfo.lng,      name: locInfo.displayName,    region: locInfo.region || locInfo.city }
    if (locMode === 'search' && streetChosen) return { lat: streetChosen.lat, lng: streetChosen.lng, name: streetChosen.name,      region: streetChosen.region }
    if (locMode === 'map'    && mapLocInfo)   return { lat: mapPos.lat,       lng: mapPos.lng,       name: mapLocInfo.displayName, region: mapLocInfo.region || mapLocInfo.city }
    return { lat: city.lat, lng: city.lng, name: city.name, region: city.region }
  })()

  // ── GPS ────────────────────────────────────────────────────────
  async function detectLocation() {
    if (!navigator.geolocation) { toast.error(t('gpsNoBrowser')); return }
    setGpsLoading(true)
    setLocInfo(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        setGpsAccuracy(Math.round(accuracy))
        toast.loading(t('streetFinding'), { id: 'geo' })
        const geo = await reverseGeocode(lat, lng)
        const nearest = nearestCity(lat, lng)
        setLocInfo({ lat, lng, ...geo, city: geo.city || nearest.name, region: geo.region || nearest.region })
        toast.success(`📍 ${geo.displayName}\n🛰️ ±${Math.round(accuracy)} м`, { id: 'geo', duration: 5000 })
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        toast.dismiss('geo')
        toast.error({
          1: t('gpsNoPermission'),
          2: t('gpsNotFound'),
          3: t('gpsTimeout'),
        }[err.code] || t('gpsError'))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  // ── Street search ──────────────────────────────────────────────
  useEffect(() => {
    if (locMode !== 'search') return
    if (!streetQuery.trim() || streetQuery.length < 3) { setStreetResults([]); return }
    const timer = setTimeout(async () => {
      setStreetSearching(true)
      const res = await searchNominatim(streetQuery)
      setStreetResults(res)
      setStreetSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [streetQuery, locMode])

  useEffect(() => {
    function h(e) { if (streetRef.current && !streetRef.current.contains(e.target)) setStreetResults([]) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function pickStreet(item) {
    const a = item.address || {}
    const street = a.road || a.pedestrian || a.path || ''
    const houseNum = a.house_number ? ` ${a.house_number}` : ''
    const city2 = a.city || a.town || a.village || ''
    const region2 = a.state || city2
    const name = street
      ? `${street}${houseNum}${city2 ? ', ' + city2 : ''}`
      : item.display_name.split(',').slice(0, 2).join(', ')
    setStreetChosen({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), name, region: region2 })
    setStreetQuery(name)
    setStreetResults([])
  }

  // ── Map pick ───────────────────────────────────────────────────
  async function onMapPick(lat, lng) {
    setMapPos({ lat, lng })
    setMapGeoLoading(true)
    const geo = await reverseGeocode(lat, lng)
    setMapLocInfo({ ...geo, lat, lng })
    setMapGeoLoading(false)
  }

  const onDrop = useCallback((accepted) => {
    const f = accepted[0]
    if (!f) return
    setFile(f); setResult(null); setResultImageUrl(null)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.webp'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  })

  async function analyze() {
    if (!file) return toast.error(t('chooseFile'))
    setLoading(true); setResult(null); setResultImageUrl(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('latitude',      finalCoords.lat)
    formData.append('longitude',     finalCoords.lng)
    formData.append('location_name', finalCoords.name)
    formData.append('region',        finalCoords.region || finalCoords.name)
    formData.append('country', 'KZ')
    if (notes) formData.append('notes', notes)

    try {
      const { data } = await detectionsApi.upload(formData)
      setResult(data)
      toast.success(t('analysisDone'))
      try {
        const imgResponse = await detectionsApi.getResultImage(data.id)
        setResultImageUrl(URL.createObjectURL(imgResponse.data))
      } catch { /* silent */ }
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 422 && detail?.code === 'NOT_ROAD') {
        setResult({ _notRoad: true, message: detail.message })
      } else {
        toast.error(detail?.message || detail || t('analysisError'))
      }
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    if (resultImageUrl) URL.revokeObjectURL(resultImageUrl)
    setFile(null); setPreview(null); setResult(null)
    setResultImageUrl(null); setNotes('')
  }

  const pciInfo = result && !result._notRoad ? PCI_INFO(result.pci_score) : null

  // GPS accuracy color
  const accColor = gpsAccuracy == null ? '' : gpsAccuracy <= 30 ? 'emerald' : gpsAccuracy <= 150 ? 'amber' : 'red'
  const accBad = gpsAccuracy != null && gpsAccuracy > 150

  const locModes = [
    { key: 'city',   icon: List,       labelKey: 'tabCity'   },
    { key: 'gps',    icon: Navigation, labelKey: 'tabGps'    },
    { key: 'search', icon: Search,     labelKey: 'tabSearch' },
    { key: 'map',    icon: Map,        labelKey: 'tabMap'    },
  ]

  const coordsLabel = { city: '🏙️', gps: '🛰️', search: '🔍', map: '🗺️' }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Scan size={20} className="text-primary-400" />
        <h2 className="text-lg font-semibold text-white">{t('scanTitle')}</h2>
        <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">Computer Vision + PCI</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Upload panel ── */}
        <div className="space-y-4">
          {/* Dropzone */}
          <div {...getRootProps()} className={clsx(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
            isDragActive ? 'border-primary-500 bg-primary-500/10 scale-[1.01]' : 'border-white/10 hover:border-primary-500/50 hover:bg-white/2'
          )}>
            <input {...getInputProps()} />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full h-52 object-cover rounded-lg" />
                <button
                  onClick={(e) => { e.stopPropagation(); reset() }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                ><X size={14} /></button>
                <div className="mt-2 text-xs text-white/40 truncate">{file?.name}</div>
              </div>
            ) : (
              <div className="py-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-600/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={24} className="text-primary-400" />
                </div>
                <p className="text-white/70 text-sm font-medium">
                  {isDragActive ? '...' : t('scanTitle')}
                </p>
                <p className="text-white/30 text-xs mt-1">JPG, PNG, BMP, WEBP · max 20MB</p>
              </div>
            )}
          </div>

          {/* ── Location section ── */}
          <div className="space-y-2">
            <label className="text-xs text-white/50 font-medium flex items-center gap-1.5">
              <MapPin size={12} /> {t('locationLabel')}
            </label>

            {/* Mode tabs */}
            <div className="grid grid-cols-4 gap-1 bg-white/3 rounded-lg p-1">
              {locModes.map(({ key, icon: Icon, labelKey }) => (
                <button key={key} type="button"
                  onClick={() => setLocMode(key)}
                  className={clsx(
                    'flex flex-col items-center gap-0.5 py-1.5 rounded-md text-xs font-medium transition-all',
                    locMode === key ? 'bg-primary-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                  )}>
                  <Icon size={13} />
                  {t(labelKey)}
                </button>
              ))}
            </div>

            {/* City mode */}
            {locMode === 'city' && (
              <select className="input text-sm" value={city.name}
                onChange={e => setCity(KZ_CITIES.find(c => c.name === e.target.value))}>
                {KZ_CITIES.map(c => (
                  <option key={c.name} value={c.name} style={{ background: '#0f2040' }}>
                    {c.name} — {c.region}
                  </option>
                ))}
              </select>
            )}

            {/* GPS mode */}
            {locMode === 'gps' && (
              <div className="space-y-2">
                <button type="button" onClick={detectLocation} disabled={gpsLoading}
                  className={clsx('w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    locInfo
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-primary-500/10 border-primary-500/20 text-primary-400 hover:bg-primary-500/15')}>
                  {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                  {locInfo ? t('gpsDetected') : gpsLoading ? t('gpsDetecting') : t('gpsDetect')}
                </button>
                {locInfo && (
                  <div className={clsx(
                    'rounded-lg px-3 py-2.5 space-y-1 border',
                    accColor === 'emerald' ? 'bg-emerald-500/8 border-emerald-500/20'
                      : accColor === 'amber' ? 'bg-amber-500/8 border-amber-500/20'
                      : 'bg-red-500/8 border-red-500/20'
                  )}>
                    <p className={clsx('text-sm font-medium',
                      accColor === 'emerald' ? 'text-emerald-300'
                        : accColor === 'amber' ? 'text-amber-300'
                        : 'text-red-300'
                    )}>{locInfo.displayName}</p>
                    {locInfo.district && (
                      <p className="text-xs text-white/50">{locInfo.district}{locInfo.city ? ', ' + locInfo.city : ''}</p>
                    )}
                    <p className={clsx('text-xs font-mono',
                      accColor === 'emerald' ? 'text-white/30'
                        : accColor === 'amber' ? 'text-amber-400/70'
                        : 'text-red-400/70'
                    )}>
                      {locInfo.lat.toFixed(6)}, {locInfo.lng.toFixed(6)} · ±{gpsAccuracy}м
                    </p>
                    {accBad && (
                      <p className="text-xs text-amber-400/90">{t('gpsLowAccuracy')}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Search mode */}
            {locMode === 'search' && (
              <div className="relative" ref={streetRef}>
                <Search size={14} className="absolute left-3 top-3 text-white/30 pointer-events-none" />
                <input className="input pl-9 text-sm"
                  placeholder={t('streetSearchPh')}
                  value={streetQuery}
                  onChange={e => { setStreetQuery(e.target.value); setStreetChosen(null) }}
                />
                {streetSearching && <Loader2 size={13} className="absolute right-3 top-3 text-white/30 animate-spin" />}
                {streetResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-dark-700 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    {streetResults.map(item => (
                      <button key={item.place_id} type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        onClick={() => pickStreet(item)}>
                        <p className="text-sm text-white font-medium truncate">
                          {item.address?.road || item.display_name.split(',')[0]}
                        </p>
                        <p className="text-xs text-white/40 truncate mt-0.5">
                          {item.display_name.split(',').slice(1, 3).join(',')}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {streetChosen && (
                  <div className="mt-2 bg-primary-500/8 border border-primary-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <MapPin size={13} className="text-primary-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{streetChosen.name}</p>
                      <p className="text-xs text-white/40 font-mono">{streetChosen.lat.toFixed(5)}, {streetChosen.lng.toFixed(5)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Map picker mode */}
            {locMode === 'map' && (
              <div className="space-y-2">
                <button type="button" onClick={() => setShowMap(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-white/5 text-sm text-white/70 hover:text-white transition-all">
                  <Map size={15} />
                  {mapLocInfo ? t('mapChangeBtn') : t('mapPickBtn')}
                </button>
                {mapLocInfo && (
                  <div className="bg-primary-500/8 border border-primary-500/20 rounded-lg px-3 py-2.5 space-y-1">
                    <p className="text-sm text-white font-medium">{mapLocInfo.displayName}</p>
                    <p className="text-xs text-white/30 font-mono">{mapPos.lat.toFixed(6)}, {mapPos.lng.toFixed(6)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Coords summary */}
            <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-white/3 border border-white/5 text-white/30">
              <MapPin size={11} />
              <span className="font-mono truncate">{finalCoords.lat.toFixed(5)}, {finalCoords.lng.toFixed(5)}</span>
              <span className="ml-auto shrink-0">{coordsLabel[locMode]} {t(`tab${locMode.charAt(0).toUpperCase() + locMode.slice(1)}`)}</span>
            </div>
          </div>

          {/* ── Map picker modal ── */}
          {showMap && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowMap(false)}>
              <div className="w-full max-w-2xl bg-dark-800 rounded-2xl border border-white/10 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{t('mapPickTitle')}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{t('mapPickHint')}</p>
                  </div>
                  <button onClick={() => setShowMap(false)} className="text-white/40 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div style={{ height: 380 }}>
                  <MapContainer center={[mapPos.lat, mapPos.lng]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[mapPos.lat, mapPos.lng]} />
                    <MapClickHandler onPick={onMapPick} />
                  </MapContainer>
                </div>
                <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    {mapGeoLoading
                      ? <span className="text-xs text-white/40 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> {t('determining')}</span>
                      : mapLocInfo
                        ? <div>
                            <p className="text-sm text-white font-medium">{mapLocInfo.displayName}</p>
                            <p className="text-xs text-white/40 font-mono">{mapPos.lat.toFixed(5)}, {mapPos.lng.toFixed(5)}</p>
                          </div>
                        : <p className="text-xs text-white/40">{t('clickToSelect')}</p>
                    }
                  </div>
                  <button onClick={() => setShowMap(false)} className="btn-primary text-sm py-2 px-5">
                    <CheckCircle size={14} /> {t('selectBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">{t('notesLabel')}</label>
            <textarea
              className="input resize-none" rows={2}
              placeholder={t('notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button onClick={analyze} className="btn-primary w-full justify-center py-3" disabled={!file || loading}>
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> {t('analyzingBtn')}</>
              : <><Scan size={16} /> {t('analyzeBtn')}</>
            }
          </button>

          <div className="flex flex-wrap gap-2">
            {['OpenCV CV', 'ASTM D6433 PCI', `6 ${t('defUnit')}`, 'PDF'].map(tag => (
              <span key={tag} className="text-xs text-white/30 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── Result panel ── */}
        <div>
          {loading && (
            <div className="card h-full flex flex-col items-center justify-center gap-5 py-16">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-primary-500/15 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-3 border-2 border-primary-300/20 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">{t('analyzingTitle')}</p>
                <p className="text-white/40 text-sm mt-1">{t('analyzingCv')}</p>
              </div>
              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="card h-full flex flex-col items-center justify-center py-16 text-center border-dashed border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-white/3 flex items-center justify-center mb-4">
                <Activity size={28} className="text-white/15" />
              </div>
              <p className="text-white/30 text-sm">{t('resultEmpty')}</p>
              <p className="text-white/20 text-xs mt-1">{t('uploadToStart')}</p>
            </div>
          )}

          {result?._notRoad && (
            <div className="card border border-red-500/20 bg-red-500/5 flex flex-col items-center text-center py-10 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-base mb-1">{t('notRoadTitle')}</p>
                <p className="text-red-300/80 text-sm leading-relaxed max-w-xs">{result.message}</p>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3 text-xs text-white/40 max-w-xs">
                💡 {t('notRoadHint')}
              </div>
              <button onClick={reset} className="btn-secondary text-sm mt-1">
                <X size={14} /> {t('otherPhoto')}
              </button>
            </div>
          )}

          {result && !result._notRoad && pciInfo && (
            <div className="space-y-4">
              {/* Annotated image */}
              {resultImageUrl && (
                <div className="card p-0 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">{t('anotResult')}</span>
                    <button onClick={() => setShowAnnotated(!showAnnotated)}
                      className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                      {showAnnotated ? t('hideBtn') : t('showBtn')}
                    </button>
                  </div>
                  {showAnnotated && (
                    <img src={resultImageUrl} alt="Result" className="w-full object-cover max-h-52" />
                  )}
                </div>
              )}

              {/* PCI Score */}
              <div className="card" style={{ background: `linear-gradient(135deg, #0f2040 0%, ${pciInfo.bg} 100%)` }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">{t('pciIndex')}</span>
                  {result.pci_score < 40 ? <AlertTriangle size={16} className="text-red-400" /> : <CheckCircle size={16} className="text-emerald-400" />}
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-6xl font-black" style={{ color: pciInfo.color }}>{result.pci_score.toFixed(1)}</span>
                  <span className="text-white/40 text-base mb-3">/ 100</span>
                </div>
                <p className="text-sm font-semibold mb-3" style={{ color: pciInfo.color }}>{pciInfo.label}</p>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${result.pci_score}%`, background: `linear-gradient(90deg, ${pciInfo.color}80, ${pciInfo.color})` }} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { labelKey: 'defectsCount', value: result.defect_count },
                    { labelKey: 'damageLabel',  value: `${result.damaged_area_pct?.toFixed(1)}%` },
                    { labelKey: 'severityLabel',value: result.severity },
                  ].map(({ labelKey, value }) => (
                    <div key={labelKey} className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <p className="text-sm font-bold text-white">{value}</p>
                      <p className="text-xs text-white/40 mt-0.5">{t(labelKey)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Defects list */}
              {result.defects?.length > 0 && (
                <div className="card">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                    {t('defectsFoundTitle')} ({result.defects.length})
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {result.defects.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white/3 hover:bg-white/5 rounded-lg px-3 py-2 transition-colors">
                        <div className="flex items-center gap-2">
                          <span>{DEFECT_ICONS[d.type] || '⚠️'}</span>
                          <div>
                            <span className="text-white font-medium">{DEFECT_LABELS[d.type] || d.type}</span>
                            <span className="text-white/30 text-xs ml-2">{(d.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <span className={d.severity === 'High' ? 'badge-high' : d.severity === 'Medium' ? 'badge-medium' : 'badge-low'}>
                          {d.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => navigate('/reports')} className="btn-primary flex-1 justify-center text-sm">
                  <CheckCircle size={15} /> {t('viewReport')}
                </button>
                <button onClick={reset} className="btn-secondary flex-1 justify-center text-sm">
                  <UploadIcon size={15} /> {t('newImage')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
