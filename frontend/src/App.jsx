import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LanguageProvider } from './contexts/LanguageContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import InteractiveMap from './pages/InteractiveMap'
import Analytics from './pages/Analytics'
import Reports from './pages/Reports'
import Upload from './pages/Upload'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <LanguageProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#152a52', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0f2040' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0f2040' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="map" element={<InteractiveMap />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="upload" element={<Upload />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </LanguageProvider>
  )
}
