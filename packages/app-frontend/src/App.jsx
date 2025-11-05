import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'
import { PrivateLayout } from './components/layout/PrivateLayout'
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
import { WebhookManagementPage } from './pages/admin/WebhookManagementPage'
import { WebhookLogsPage } from './pages/admin/WebhookLogsPage'
import { WebhookTestPage } from './pages/admin/WebhookTestPage'
import { FunctionCallLogsPage } from './pages/admin/FunctionCallLogsPage'
import { FunctionDefinitionsPage } from './pages/admin/FunctionDefinitionsPage'
import { TypeTestComponent } from './TypeTestComponent'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes with Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/examples" element={<ExamplesPage />} />
            <Route path="/type-test" element={<TypeTestComponent />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Private Routes with PrivateLayout */}
          <Route element={<PrivateLayout />}>
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/models" element={<ModelManagementPage />} />
            <Route path="/admin/quotas" element={<QuotaManagementPage />} />
            <Route path="/admin/events" element={<EventMonitorPage />} />
            <Route path="/admin/webhooks" element={<WebhookManagementPage />} />
            <Route path="/admin/webhooks/logs" element={<WebhookLogsPage />} />
            <Route path="/admin/webhooks/test" element={<WebhookTestPage />} />
            <Route path="/admin/function-calls" element={<FunctionCallLogsPage />} />
            <Route path="/admin/function-definitions" element={<FunctionDefinitionsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
