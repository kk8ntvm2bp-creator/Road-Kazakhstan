import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Map, BarChart3, FileText, Upload, LogOut, Scan } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useLang } from '../../contexts/LanguageContext'

export default function Sidebar() {
  const navigate = useNavigate()
  const { t } = useLang()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const nav = [
    { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
    { to: '/map',       icon: Map,             key: 'map'       },
    { to: '/analytics', icon: BarChart3,       key: 'analytics' },
    { to: '/reports',   icon: FileText,        key: 'reports'   },
    { to: '/upload',    icon: Upload,          key: 'upload'    },
  ]

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    toast.success('Сәтті шықтыңыз')
    navigate('/login')
  }

  return (
    <aside className="w-60 bg-dark-800 border-r border-white/5 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-600/30">
            <Scan size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">RoadScan</div>
            <div className="text-xs text-primary-400 font-medium">Kazakhstan</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon size={17} />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      {/* Regions */}
      <div className="px-4 pb-3">
        <p className="text-xs text-white/30 uppercase tracking-wider mb-2 font-semibold">{t('regions')}</p>
        {[
          { label: 'Алматы облысы', lat: 43.2220, lng: 76.8512 },
          { label: 'Астана қаласы', lat: 51.1801, lng: 71.4460 },
          { label: 'Қарағанды',     lat: 49.8028, lng: 73.0875 },
          { label: 'Шымкент',       lat: 42.3417, lng: 69.5901 },
        ].map(r => (
          <button key={r.label}
            onClick={() => navigate(`/map?lat=${r.lat}&lng=${r.lng}&zoom=11`)}
            className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 cursor-pointer group text-left transition-colors">
            <div className="w-2 h-2 rounded-full bg-primary-400 group-hover:bg-primary-300 transition-colors shrink-0" />
            <span className="text-xs text-white/50 group-hover:text-white transition-colors">{r.label}</span>
          </button>
        ))}
      </div>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/3 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
            {user.username?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user.username || 'User'}</p>
            <p className="text-xs text-white/30 truncate">{user.email || ''}</p>
          </div>
          <button onClick={logout}
            className="text-white/30 hover:text-red-400 transition-colors p-1 rounded"
            title={t('logout')}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
