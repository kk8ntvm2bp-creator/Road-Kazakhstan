import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'
import { Scan, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const fn = isRegister ? authApi.register : authApi.login
      const payload = isRegister
        ? form
        : { email: form.email, password: form.password }
      const { data } = await fn(payload)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      toast.success(isRegister ? 'Сәтті тіркелдіңіз!' : 'Қош келдіңіз!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Қате орын алды')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-800/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-600/30">
            <Scan size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RoadScan Kazakhstan</h1>
          <p className="text-white/40 text-sm mt-1">Жол жамылғысын талдау жүйесі</p>
        </div>

        {/* Card */}
        <div className="bg-dark-800 rounded-2xl border border-white/5 p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">
            {isRegister ? 'Тіркелу' : 'Жүйеге кіру'}
          </h2>

          <form onSubmit={submit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Толық аты-жөні</label>
                <input className="input" placeholder="Аты-жөніңізді енгізіңіз" value={form.full_name} onChange={set('full_name')} />
              </div>
            )}
            {isRegister && (
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Пайдаланушы аты</label>
                <input className="input" placeholder="username" value={form.username} onChange={set('username')} required />
              </div>
            )}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Email</label>
              <input className="input" type="email" placeholder="email@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Құпия сөз</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Жүктелуде...' : isRegister ? 'Тіркелу' : 'Кіру'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-5">
            {isRegister ? 'Тіркелгеніңіз бар ма?' : 'Тіркелгеніңіз жоқ па?'}{' '}
            <button onClick={() => setIsRegister(!isRegister)}
              className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              {isRegister ? 'Кіру' : 'Тіркелу'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          КазНТЗУ · Диплом жобасы 2026
        </p>
      </div>
    </div>
  )
}
