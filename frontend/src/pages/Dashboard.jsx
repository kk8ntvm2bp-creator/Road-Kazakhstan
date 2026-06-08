import { useEffect, useState } from 'react'
import { statsApi, reportsApi } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../contexts/LanguageContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid, Area, AreaChart,
} from 'recharts'
import {
  Scan, AlertTriangle, Activity, TrendingUp,
  MapPin, Clock, Download, ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const PCI_COLORS = {
  Excellent:    '#22c55e',
  Good:         '#84cc16',
  Satisfactory: '#eab308',
  Fair:         '#f97316',
  Poor:         '#ef4444',
  Failed:       '#7f1d1d',
}

const SEVERITY_BADGE = {
  High:   'badge-high',
  Medium: 'badge-medium',
  Low:    'badge-low',
}

function StatCard({ icon: Icon, label, value, sub, color = 'primary', trend }) {
  const colorMap = {
    primary: { text: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
    red:     { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
    green:   { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  }
  const c = colorMap[color]
  return (
    <div className={clsx('card flex items-center gap-4 border', c.border)}>
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', c.bg)}>
        <Icon size={20} className={c.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/50 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={clsx('text-xs font-medium flex items-center gap-0.5', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-700 border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color || p.fill }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { t } = useLang()
  const [stats, setStats] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      statsApi.dashboard(),
      statsApi.trend(),
    ])
      .then(([statsRes, trendRes]) => {
        setStats(statsRes.data)
        setTrend(trendRes.data)
      })
      .catch(() => toast.error(t('loadError')))
      .finally(() => setLoading(false))
  }, [])

  async function exportCsv() {
    try {
      const { data } = await reportsApi.downloadCsv()
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url; a.download = 'roadscan_report.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success(t('csvLoaded'))
    } catch { toast.error(t('exportError')) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="space-y-3 text-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white/30 text-sm">{t('loadError').replace('қатесі','').replace('Ошибка','') || '...'}</p>
      </div>
    </div>
  )

  const pciChartData = stats
    ? Object.entries(stats.pci_distribution).map(([name, value]) => ({ name, value }))
    : []

  const avgPci = stats?.avg_pci ?? 0

  const quickActions = [
    { labelKey: 'actionScan', subKey: 'actionScanSub', path: '/upload', color: 'bg-primary-600 hover:bg-primary-500 border-primary-500/30', icon: '🔍' },
    { labelKey: 'actionMap',  subKey: 'actionMapSub',  path: '/map',    color: 'bg-dark-700 hover:bg-dark-600 border-white/5', icon: '🗺️' },
    { labelKey: 'actionAnal', subKey: 'actionAnalSub', path: '/analytics', color: 'bg-dark-700 hover:bg-dark-600 border-white/5', icon: '📊' },
    { labelKey: 'actionRep',  subKey: 'actionRepSub',  path: '/reports',   color: 'bg-dark-700 hover:bg-dark-600 border-white/5', icon: '📋' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Scan}          label={t('totalScans')} value={stats?.total_scans ?? 0}    color="primary" sub={t('allTime')} />
        <StatCard icon={AlertTriangle} label={t('critAlerts')} value={stats?.critical_alerts ?? 0} color="red"     sub={t('highSevSub')} />
        <StatCard icon={Activity}      label={t('avgPci')}     value={`${avgPci}`}                 color={avgPci >= 70 ? 'green' : avgPci >= 40 ? 'amber' : 'red'} sub={t('roadQualSub')} />
        <StatCard icon={TrendingUp}    label={t('totalDef')}   value={stats?.total_defects ?? 0}   color="amber"   sub={t('allDefSub')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PCI Distribution Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">{t('pciDistTitle')}</h3>
            <span className="text-xs text-white/30">{t('byScans')}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pciChartData} barSize={26}>
              <XAxis dataKey="name" tick={{ fill: '#ffffff40', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#ffffff40', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name={t('totalScans')} radius={[5, 5, 0, 0]}>
                {pciChartData.map((entry) => (
                  <Cell key={entry.name} fill={PCI_COLORS[entry.name] || '#3b7de0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent detections */}
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">{t('recentScans')}</h3>
            <div className="flex items-center gap-2">
              <button onClick={exportCsv} className="btn-secondary text-xs py-1.5 px-3">
                <Download size={13} /> CSV
              </button>
              <button onClick={() => navigate('/reports')} className="btn-secondary text-xs py-1.5 px-3">
                {t('allReportsGo').split('→')[0].trim()} <ChevronRight size={13} />
              </button>
            </div>
          </div>
          {!stats?.recent_detections?.length ? (
            <div className="text-center py-12 text-white/30">
              <Scan size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('noScans')}</p>
              <button onClick={() => navigate('/upload')} className="btn-primary text-xs mt-3">
                {t('uploadFirst')}
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.recent_detections.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => navigate('/reports')}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: `${PCI_COLORS[d.pci_category]}20` }}
                  >
                    <MapPin size={16} style={{ color: PCI_COLORS[d.pci_category] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{d.location_name}</p>
                      <span className={SEVERITY_BADGE[d.severity]}>{d.severity}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Clock size={10} />
                        {format(new Date(d.created_at), 'dd.MM HH:mm')}
                      </span>
                      <span className="text-xs text-white/40">{d.defect_count} {t('defUnit')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black" style={{ color: PCI_COLORS[d.pci_category] }}>
                      {d.pci_score.toFixed(0)}
                    </p>
                    <p className="text-xs text-white/30">PCI</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PCI Trend Chart */}
      {trend.length > 1 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-400" />
              {t('pciTrendTitle')}
            </h3>
            <span className="text-xs text-white/30">{t('byTime')}</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="pciGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b7de0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b7de0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: '#ffffff40', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#ffffff40', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pci"
                name="PCI"
                stroke="#3b7de0"
                strokeWidth={2}
                fill="url(#pciGradient)"
                dot={{ fill: '#3b7de0', r: 3 }}
                activeDot={{ r: 5, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map(({ labelKey, subKey, path, color, icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={clsx('rounded-xl p-4 text-left transition-all duration-200 border group', color)}
          >
            <span className="text-xl mb-2 block">{icon}</span>
            <p className="font-semibold text-white text-sm">{t(labelKey)}</p>
            <p className="text-xs text-white/40 mt-0.5">{t(subKey)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
