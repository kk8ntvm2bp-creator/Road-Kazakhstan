import { useEffect, useState } from 'react'
import { statsApi } from '../services/api'
import { useLang } from '../contexts/LanguageContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend,
  PieChart, Pie,
} from 'recharts'
import { TrendingUp, Globe, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

const KZ_COLOR = '#3b7de0'
const DE_COLOR = '#22c55e'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-800 border border-white/10 rounded-lg p-3 text-xs">
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}%</p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { t } = useLang()
  const [cmp, setCmp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.comparison()
      .then(r => setCmp(r.data))
      .catch(() => toast.error(t('loadError')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const kz = cmp?.KZ
  const de = cmp?.DE

  const DEFECT_LABELS = {
    pothole:            t('defPothole'),
    alligator_crack:    t('defAlligator'),
    longitudinal_crack: t('defLongitudinal'),
    transverse_crack:   t('defTransverse'),
    rutting:            t('defRutting'),
    raveling:           t('defRaveling'),
  }

  const barData = [
    { label: 'Excellent', KZ: kz?.excellent_pct, DE: de?.excellent_pct },
    { label: 'Good',      KZ: kz?.good_pct,      DE: de?.good_pct },
    { label: 'Fair',      KZ: kz?.fair_pct,      DE: de?.fair_pct },
    { label: 'Poor',      KZ: kz?.poor_pct,      DE: de?.poor_pct },
    { label: 'Failed',    KZ: kz?.failed_pct,    DE: de?.failed_pct },
  ]

  const defectData = Object.keys(DEFECT_LABELS).map(k => ({
    subject: DEFECT_LABELS[k],
    KZ: kz?.defect_distribution?.[k] || 0,
    DE: de?.defect_distribution?.[k] || 0,
  }))

  const kzPieData = [
    { name: 'Excellent', value: kz?.excellent_pct, fill: '#22c55e' },
    { name: 'Good',      value: kz?.good_pct,      fill: '#84cc16' },
    { name: 'Fair',      value: kz?.fair_pct,      fill: '#eab308' },
    { name: 'Poor',      value: kz?.poor_pct,      fill: '#f97316' },
    { name: 'Failed',    value: kz?.failed_pct,    fill: '#ef4444' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 size={20} className="text-primary-400" />
        <h2 className="text-lg font-semibold text-white">{t('analyticsTitle')}</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('kzAvgPci'), value: `${kz?.avg_pci}`, sub: t('kzLabel'), color: KZ_COLOR },
          { label: t('deAvgPci'), value: `${de?.avg_pci}`, sub: t('deLabel'), color: DE_COLOR },
          { label: t('kzRoads'),  value: `${(kz?.total_km/1000).toFixed(0)}k km`, sub: t('totalLabel'), color: KZ_COLOR },
          { label: t('deRoads'),  value: `${(de?.total_km/1000).toFixed(0)}k km`, sub: t('totalLabel'), color: DE_COLOR },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-sm font-medium text-white mt-0.5">{label}</p>
            <p className="text-xs text-white/30">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar comparison */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Globe size={16} className="text-primary-400" />
            {t('pciCatCompTitle')}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barGap={4}>
              <XAxis dataKey="label" tick={{ fill: '#ffffff50', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#ffffff50', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#ffffff80' }} />
              <Bar dataKey="KZ" name={t('kzLabel')} fill={KZ_COLOR} radius={[3,3,0,0]} />
              <Bar dataKey="DE" name={t('deLabel')} fill={DE_COLOR} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar defect types */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-400" />
            {t('defectTypesTitle')}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={defectData}>
              <PolarGrid stroke="#ffffff10" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff50', fontSize: 10 }} />
              <Radar name={t('kzLabel')} dataKey="KZ" stroke={KZ_COLOR} fill={KZ_COLOR} fillOpacity={0.25} />
              <Radar name={t('deLabel')} dataKey="DE" stroke={DE_COLOR} fill={DE_COLOR} fillOpacity={0.25} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#ffffff80' }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* KZ Pie chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">{t('kzPieTitle')}</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={kzPieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                    if (value < 8) return null
                    const RADIAN = Math.PI / 180
                    const r = innerRadius + (outerRadius - innerRadius) * 0.5
                    const x = cx + r * Math.cos(-midAngle * RADIAN)
                    const y = cy + r * Math.sin(-midAngle * RADIAN)
                    return (
                      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                        {`${value}%`}
                      </text>
                    )
                  }}
                />
                <Tooltip contentStyle={{ background: '#0f2040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5">
              {kzPieData.map(({ name, value, fill }) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: fill }} />
                  <span className="text-white/70">{name}</span>
                  <span className="text-white font-semibold ml-auto pl-2">{value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary table */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">{t('statsTableTitle')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-white/40 pb-2 font-medium">{t('indicatorCol')}</th>
                <th className="text-right text-xs pb-2 font-medium" style={{ color: KZ_COLOR }}>{t('kzLabel')}</th>
                <th className="text-right text-xs pb-2 font-medium" style={{ color: DE_COLOR }}>{t('deLabel')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                [t('avgPciRow'),    `${kz?.avg_pci}`,                        `${de?.avg_pci}`],
                [t('totalKmRow'),  `${kz?.total_km?.toLocaleString()}`,       `${de?.total_km?.toLocaleString()}`],
                [t('critSegRow'),  `${kz?.critical_segments}`,                `${de?.critical_segments}`],
                [t('budgetRow'),   `$${kz?.annual_budget_usd_m}`,             `$${de?.annual_budget_usd_m?.toLocaleString()}`],
              ].map(([label, kzVal, deVal]) => (
                <tr key={label}>
                  <td className="py-2.5 text-white/60">{label}</td>
                  <td className="py-2.5 text-right font-semibold" style={{ color: KZ_COLOR }}>{kzVal}</td>
                  <td className="py-2.5 text-right font-semibold" style={{ color: DE_COLOR }}>{deVal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
