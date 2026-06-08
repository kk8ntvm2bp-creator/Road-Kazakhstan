import { useEffect, useState, useMemo } from 'react'
import { detectionsApi, reportsApi } from '../services/api'
import api from '../services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useLang } from '../contexts/LanguageContext'
import {
  FileText, Download, Trash2, Eye,
  MapPin, Calendar, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Search, Filter, X
} from 'lucide-react'
import clsx from 'clsx'

const PCI_COLOR = (score) => {
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#84cc16'
  if (score >= 55) return '#eab308'
  if (score >= 40) return '#f97316'
  if (score >= 25) return '#ef4444'
  return '#dc2626'
}

const SEVERITY_BADGE = {
  High:   'badge-high',
  Medium: 'badge-medium',
  Low:    'badge-low',
}

function PCIBar({ score }) {
  const color = PCI_COLOR(score)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>
        {score.toFixed(0)}
      </span>
    </div>
  )
}

export default function Reports() {
  const { t } = useLang()
  const [detections, setDetections] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(null)
  const [imgOpen, setImgOpen] = useState(null)
  const [imgUrl, setImgUrl] = useState(null)
  const [imgLoading, setImgLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [pciFilter, setPciFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { load() }, [])

  async function openImage(id) {
    setImgOpen(id)
    setImgUrl(null)
    setImgLoading(true)
    try {
      const { data } = await api.get(`/detections/${id}/image`, { responseType: 'blob' })
      setImgUrl(URL.createObjectURL(data))
    } catch {
      toast.error(t('imgLoadError'))
      setImgOpen(null)
    } finally {
      setImgLoading(false)
    }
  }

  function closeImage() {
    if (imgUrl) URL.revokeObjectURL(imgUrl)
    setImgOpen(null)
    setImgUrl(null)
  }

  async function load() {
    try {
      const { data } = await detectionsApi.list()
      setDetections(data)
    } catch {
      toast.error(t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  async function downloadPdf(id) {
    setPdfLoading(id)
    try {
      const { data } = await reportsApi.downloadPdf(id)
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `roadscan_report_${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('pdfLoaded'))
    } catch {
      toast.error(t('pdfError'))
    } finally {
      setPdfLoading(null)
    }
  }

  async function downloadCsv() {
    try {
      const { data } = await reportsApi.downloadCsv()
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'roadscan_report.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('csvLoaded'))
    } catch {
      toast.error(t('csvError'))
    }
  }

  async function del(id) {
    if (!confirm(t('deleteConfirm'))) return
    try {
      await detectionsApi.delete(id)
      setDetections(d => d.filter(x => x.id !== id))
      toast.success(t('deleted'))
    } catch {
      toast.error(t('deleteError'))
    }
  }

  const DEFECT_LABELS = {
    pothole:            t('defPothole'),
    alligator_crack:    t('defAlligator'),
    longitudinal_crack: t('defLongitudinal'),
    transverse_crack:   t('defTransverse'),
    rutting:            t('defRutting'),
    raveling:           t('defRaveling'),
  }

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = detections
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.location_name?.toLowerCase().includes(q) ||
        d.region?.toLowerCase().includes(q)
      )
    }
    if (severityFilter !== 'all') {
      list = list.filter(d => d.severity === severityFilter)
    }
    if (pciFilter === 'good') list = list.filter(d => d.pci_score >= 70)
    if (pciFilter === 'fair') list = list.filter(d => d.pci_score >= 40 && d.pci_score < 70)
    if (pciFilter === 'poor') list = list.filter(d => d.pci_score < 40)
    return list
  }, [detections, search, severityFilter, pciFilter])

  const hasFilters = search || severityFilter !== 'all' || pciFilter !== 'all'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <FileText size={18} className="text-primary-400" />
          <h2 className="font-semibold text-white">{t('reports')}</h2>
          <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{filtered.length}/{detections.length}</span>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx('btn-secondary text-xs py-1.5 px-3', hasFilters && 'border-primary-500/50 text-primary-400')}
        >
          <Filter size={13} /> {t('filterBtn')} {hasFilters && '●'}
        </button>
        <button onClick={downloadCsv} className="btn-secondary text-sm">
          <Download size={15} /> CSV
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card flex flex-wrap gap-4 py-4">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="input pl-8 py-2 text-sm"
              placeholder={t('searchLocPh')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          {/* Severity */}
          <select
            className="input py-2 text-sm w-auto min-w-36"
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value="all" style={{ background: '#0f2040' }}>{t('allSeverity')}</option>
            <option value="High"   style={{ background: '#0f2040' }}>High</option>
            <option value="Medium" style={{ background: '#0f2040' }}>Medium</option>
            <option value="Low"    style={{ background: '#0f2040' }}>Low</option>
          </select>
          {/* PCI */}
          <select
            className="input py-2 text-sm w-auto min-w-36"
            value={pciFilter}
            onChange={e => setPciFilter(e.target.value)}
          >
            <option value="all"  style={{ background: '#0f2040' }}>{t('allPci')}</option>
            <option value="good" style={{ background: '#0f2040' }}>Good (70+)</option>
            <option value="fair" style={{ background: '#0f2040' }}>Fair (40-69)</option>
            <option value="poor" style={{ background: '#0f2040' }}>Poor (&lt;40)</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setSeverityFilter('all'); setPciFilter('all') }}
              className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1"
            >
              <X size={13} /> {t('clearBtn')}
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          {detections.length === 0 ? (
            <>
              <AlertCircle size={40} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/40">{t('noReportsMsg')}</p>
            </>
          ) : (
            <>
              <Search size={40} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/40">{t('noSearchRes')}</p>
              <button onClick={() => { setSearch(''); setSeverityFilter('all'); setPciFilter('all') }}
                className="btn-secondary text-xs mt-3 mx-auto">
                {t('clearFilters')}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div key={d.id} className="card p-0 overflow-hidden transition-all duration-200 hover:border-white/10">
              {/* Row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/2 transition-colors"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              >
                {/* PCI circle */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all"
                  style={{ borderColor: PCI_COLOR(d.pci_score), background: `${PCI_COLOR(d.pci_score)}12` }}
                >
                  <span className="text-sm font-black" style={{ color: PCI_COLOR(d.pci_score) }}>
                    {d.pci_score.toFixed(0)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{d.location_name}</span>
                    <span className={SEVERITY_BADGE[d.severity]}>{d.severity}</span>
                    <span className="text-xs text-white/30">{d.pci_category}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-white/40">
                    <span className="flex items-center gap-1"><MapPin size={10} />{d.region}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} />{format(new Date(d.created_at), 'dd.MM.yyyy HH:mm')}</span>
                    <span>{d.defect_count} {t('defUnit')}</span>
                    <span>{t('damageLabel')}: {d.damaged_area_pct?.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 max-w-xs">
                    <PCIBar score={d.pci_score} />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openImage(d.id) }}
                    className="btn-secondary text-xs py-1.5 px-3"
                    title={t('anotResult')}
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadPdf(d.id) }}
                    className="btn-primary text-xs py-1.5 px-3"
                    disabled={pdfLoading === d.id}
                  >
                    {pdfLoading === d.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Download size={13} />
                    }
                    PDF
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); del(d.id) }}
                    className="text-white/20 hover:text-red-400 transition-colors p-1.5"
                    title={t('deleteConfirm')}
                  >
                    <Trash2 size={15} />
                  </button>
                  {expanded === d.id
                    ? <ChevronUp size={15} className="text-white/30" />
                    : <ChevronDown size={15} className="text-white/30" />
                  }
                </div>
              </div>

              {/* Expanded defect list */}
              {expanded === d.id && (
                <div className="border-t border-white/5 p-4 bg-white/1">
                  {d.defects?.length > 0 ? (
                    <>
                      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                        {t('defectsFoundTitle')} ({d.defects.length})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {d.defects.map((defect, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/3 rounded-xl px-3 py-2.5 border border-white/5">
                            <div>
                              <p className="text-sm text-white font-medium">
                                {DEFECT_LABELS[defect.type] || defect.type}
                              </p>
                              <p className="text-xs text-white/40 mt-0.5">
                                {t('areaLabel')}: {defect.area_pct?.toFixed(2)}% · {(defect.confidence * 100).toFixed(0)}% {t('confLabel')}
                              </p>
                            </div>
                            <span className={SEVERITY_BADGE[defect.severity]}>{defect.severity}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-white/30 text-center py-2">{t('noDefects')}</p>
                  )}
                  {d.notes && (
                    <p className="text-xs text-white/40 mt-3 pt-3 border-t border-white/5">
                      <span className="text-white/60">{t('noteLabel')}:</span> {d.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image modal */}
      {imgOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeImage}
        >
          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="card p-2 relative">
              <button
                onClick={closeImage}
                className="absolute top-3 right-3 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-500/70 z-10 transition-colors"
              >
                <X size={15} />
              </button>
              {imgLoading && (
                <div className="flex items-center justify-center h-64">
                  <Loader2 size={32} className="text-primary-400 animate-spin" />
                </div>
              )}
              {imgUrl && (
                <img src={imgUrl} alt="Detection Result" className="w-full rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
