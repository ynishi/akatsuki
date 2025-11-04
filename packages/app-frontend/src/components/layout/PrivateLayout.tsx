import { AuthGuard } from '../auth/AuthGuard'
import { Layout } from './Layout'

/**
 * PrivateLayout コンポーネント
 *
 * 認証が必要なページ用のレイアウト
 * - AuthGuardで認証チェック
 * - 未ログインの場合はLoginPageにリダイレクト
 * - ログイン済みの場合は通常のLayoutでレンダリング
 *
 * @example
 * // App.tsx のルーティング
 * <Route element={<PrivateLayout />}>
 *   <Route path="/admin" element={<AdminDashboard />} />
 *   <Route path="/profile" element={<ProfilePage />} />
 * </Route>
 */
export function PrivateLayout() {
  return (
    <AuthGuard>
      <Layout />
    </AuthGuard>
  )
}
