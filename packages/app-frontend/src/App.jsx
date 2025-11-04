import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGuard } from './components/auth/AuthGuard'
import { HomePage } from './pages/HomePage'
import { ExamplesPage } from './pages/ExamplesPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { ModelManagementPage } from './pages/admin/ModelManagementPage'
import { QuotaManagementPage } from './pages/admin/QuotaManagementPage'
import { EventMonitorPage } from './pages/admin/EventMonitorPage'
import { CharacterPresetManagementPage } from './pages/admin/CharacterPresetManagementPage'
import { CharacterGeneratorPage } from './pages/CharacterGeneratorPage'
import { CharacterGalleryPage } from './pages/CharacterGalleryPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/examples" element={<ExamplesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Character Generation Routes (Private) */}
          <Route
            path="/character-generator"
            element={
              <AuthGuard>
                <CharacterGeneratorPage />
              </AuthGuard>
            }
          />
          <Route
            path="/character-gallery"
            element={
              <AuthGuard>
                <CharacterGalleryPage />
              </AuthGuard>
            }
          />

          {/* Private Routes */}
          <Route
            path="/admin"
            element={
              <AuthGuard>
                <AdminDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/models"
            element={
              <AuthGuard>
                <ModelManagementPage />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/quotas"
            element={
              <AuthGuard>
                <QuotaManagementPage />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/events"
            element={
              <AuthGuard>
                <EventMonitorPage />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/character-presets"
            element={
              <AuthGuard>
                <CharacterPresetManagementPage />
              </AuthGuard>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
