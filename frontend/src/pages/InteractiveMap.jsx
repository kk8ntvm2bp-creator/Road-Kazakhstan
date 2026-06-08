import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { statsApi } from '../services/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../contexts/LanguageContext'
import { MapPin, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import 'leaflet/dist/leaflet.css'

const PCI_COLOR = (score) => {
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#84cc16'
  if (score >= 55) return '#eab308'
  if (score >= 40) return '#f97316'
  if (score >= 25) return '#ef4444'
  return '#7f1d1d'
}

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 0) {
      const bounds = points.map((p) => [p.latitude, p.longitude])
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [points, map])
  return null
}

function FlyTo({ lat, lng, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], zoom || 11, { duration: 1.5 })
  }, [lat, lng, zoom, map])
  return null
}

export default function InteractiveMap() {
  const { t } = useLang()
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const flyLat = parseFloat(searchParams.get('lat')) || null
  const flyLng = parseFloat(searchParams.get('lng')) || null
  const flyZoom = parseInt(searchParams.get('zoom')) || 11

  useEffect(() => {
    statsApi.mapData()
      .then(r => setPoints(r.data))
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total:    points.length,
    critical: points.filter(p => p.severity === 'High').length,
    good:     points.filter(p => p.pci_score >= 70).length,
  }

  const PCI_LEVELS = [
    { label: 'Excellent (85-100)', color: '#22c55e' },
    { label: 'Good (70-84)',       color: '#84cc16' },
    { label: 'Satisfactory (55-69)', color: '#eab308' },
    { label: 'Fair (40-54)',       color: '#f97316' },
    { label: 'Poor (25-39)',       color: '#ef4444' },
    { label: 'Failed (0-24)',      color: '#7f1d1d' },
  ]

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('totalPoints'), value: stats.total,    icon: MapPin,        color: 'text-primary-400' },
          { label: t('criticalPts'), value: stats.critical,  icon: AlertTriangle, color: 'text-red-400' },
          { label: t('goodState'),   value: stats.good,      icon: CheckCircle,   color: 'text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3 py-3">
            <Icon size={18} className={color} />
            <div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="card flex-1 p-0 overflow-hidden relative" style={{ minHeight: '460px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-800 z-10 rounded-xl">
            <Loader2 size={28} className="text-primary-400 animate-spin" />
          </div>
        )}
        <MapContainer center={[48.0, 68.0]} zoom={5}
          style={{ height: '100%', width: '100%', minHeight: '460px' }} zoomControl>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {points.length > 0 && !flyLat && <FitBounds points={points} />}
          {flyLat && <FlyTo lat={flyLat} lng={flyLng} zoom={flyZoom} />}
          {points.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.latitude, p.longitude]}
              radius={p.severity === 'High' ? 10 : p.severity === 'Medium' ? 8 : 6}
              pathOptions={{
                fillColor: PCI_COLOR(p.pci_score),
                color: PCI_COLOR(p.pci_score),
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ background: '#0f2040', color: '#e2e8f0', padding: '8px', borderRadius: '8px', minWidth: '180px', fontSize: '13px' }}>
                  <strong style={{ color: '#fff' }}>{p.location_name}</strong>
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span>PCI: <strong style={{ color: PCI_COLOR(p.pci_score) }}>{p.pci_score.toFixed(1)}</strong> ({p.pci_category})</span>
                    <span>{t('defUnit')}: {p.defect_count}</span>
                    <span>{p.severity}</span>
                    <span style={{ color: '#ffffff50', fontSize: '11px' }}>{format(new Date(p.created_at), 'dd.MM.yyyy')}</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-dark-800/90 backdrop-blur border border-white/10 rounded-xl p-3">
          <p className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">{t('pciLevels')}</p>
          {PCI_LEVELS.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2 py-0.5">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-xs text-white/50">{label}</span>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!loading && points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
            <div className="text-center bg-dark-800/80 backdrop-blur rounded-xl p-6 border border-white/10">
              <MapPin size={32} className="mx-auto mb-2 text-white/20" />
              <p className="text-white/50 text-sm">{t('mapEmptyMsg')}</p>
              <button onClick={() => navigate('/upload')} className="btn-primary text-xs mt-3 pointer-events-auto">
                {t('scanRoad')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
