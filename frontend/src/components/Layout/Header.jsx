import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, Globe, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { detectionsApi, statsApi } from '../../services/api'
import { useLang } from '../../contexts/LanguageContext'
import { format } from 'date-fns'
import clsx from 'clsx'

const PCI_COLOR = (s) => s >= 70 ? '#22c55e' : s >= 40 ? '#f97316' : '#ef4444'

const ROUTE_KEY = {
  '/dashboard': 'dashboard',
  '/map':       'map',
  '/analytics': 'analytics',
  '/reports':   'reports',
  '/upload':    'upload',
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate    = useNavigate()
  const { lang, toggle, t } = useLang()

  // ── Search ──────────────────────────────────────────────────
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearchOpen(false); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await detectionsApi.list({ search: query, limit: 6 })
        setResults(data)
        setSearchOpen(true)
      } catch { /* ignore */ }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Notifications ────────────────────────────────────────────
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [notifs,     setNotifs]     = useState([])
  const [notifCount, setNotifCount] = useState(0)
  const [notifSeen,  setNotifSeen]  = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    statsApi.dashboard().then(r => {
      const recent = r.data.recent_detections || []
      const critical = recent.filter(d => d.severity === 'High' || d.pci_score < 40)
      setNotifs(critical.slice(0, 5))
      setNotifCount(critical.length)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function openNotif() {
    setNotifOpen(v => !v)
    setNotifSeen(true)
    setNotifCount(0)
  }

  const titleKey = ROUTE_KEY[pathname]
  const title = titleKey ? t(titleKey) : 'RoadScan'

  return (
    <header className="h-14 bg-dark-800 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-white">{title}</h1>
        <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full hidden sm:inline">Kazakhstan</span>
      </div>

      <div className="flex items-center gap-2">

        {/* ── Search ── */}
        <div className="relative hidden md:block" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            placeholder={t('search')}
            className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500 w-52 transition-all focus:w-64"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length && setSearchOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') { navigate('/reports'); setSearchOpen(false); setQuery('') }
              if (e.key === 'Escape') { setSearchOpen(false); setQuery('') }
            }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setSearchOpen(false) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
              <X size={13} />
            </button>
          )}
          {searchOpen && (
            <div className="absolute top-full mt-1 w-72 bg-dark-700 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {searching ? (
                <div className="px-4 py-3 text-xs text-white/40 flex items-center gap-2">
                  <div className="w-3 h-3 border border-white/30 border-t-transparent rounded-full animate-spin" />
                  {t('searching')}
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-xs text-white/40">{t('noResults')}</div>
              ) : results.map(d => (
                <button key={d.id}
                  className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                  onClick={() => { navigate('/reports'); setSearchOpen(false); setQuery('') }}>
                  <div>
                    <p className="text-sm text-white font-medium">{d.location_name}</p>
                    <p className="text-xs text-white/40">{d.region} · {d.defect_count} {t('defUnit')}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: PCI_COLOR(d.pci_score) }}>
                    {d.pci_score?.toFixed(0)}
                  </span>
                </button>
              ))}
              <div className="px-4 py-2 border-t border-white/5">
                <button className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  onClick={() => { navigate('/reports'); setSearchOpen(false); setQuery('') }}>
                  {t('allReportsGo')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Language toggle ── */}
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 transition-all"
          title={t('lang')}
        >
          <Globe size={12} className="text-primary-400" />
          <span className={clsx('font-semibold transition-colors', lang === 'KZ' ? 'text-white' : 'text-white/40')}>KZ</span>
          <span className="text-white/20">|</span>
          <span className={clsx('font-semibold transition-colors', lang === 'RU' ? 'text-white' : 'text-white/40')}>RU</span>
        </button>

        {/* ── Notifications ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotif}
            className="relative w-8 h-8 flex items-center justify-center text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
          >
            <Bell size={15} />
            {notifCount > 0 && !notifSeen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                {notifCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-dark-700 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-sm font-semibold text-white">{t('notifications')}</span>
                {notifs.length > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    {notifs.length} {t('criticalWord')}
                  </span>
                )}
              </div>

              {notifs.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <CheckCircle size={24} className="text-emerald-400 opacity-50" />
                  <p className="text-sm text-white/40">{t('noNotif')}</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifs.map(d => (
                    <button
                      key={d.id}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                      onClick={() => { navigate('/reports'); setNotifOpen(false) }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle size={13} className="text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{d.location_name}</p>
                          <p className="text-xs text-white/40 mt-0.5">
                            PCI {d.pci_score?.toFixed(0)} · {d.defect_count} {t('defUnit')}
                          </p>
                          <p className="text-xs text-white/30 mt-0.5">
                            {format(new Date(d.created_at), 'dd.MM.yyyy HH:mm')}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-red-400 shrink-0">
                          {d.pci_score?.toFixed(0)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-2.5 border-t border-white/5">
                <button
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors w-full text-left"
                  onClick={() => { navigate('/reports'); setNotifOpen(false) }}
                >
                  {t('allReportsGo')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
