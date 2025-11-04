import { Outlet } from 'react-router-dom'
import { TopNavigation } from './TopNavigation'

/**
 * Layout コンポーネント
 *
 * 全ページ共通のレイアウト構造を提供
 * - TopNavigation（ヘッダー）
 * - メインコンテンツエリア（背景グラデーション）
 * - ページコンテンツ（Outlet経由でレンダリング）
 *
 * @example
 * // App.tsx のルーティング
 * <Route element={<Layout />}>
 *   <Route path="/" element={<HomePage />} />
 *   <Route path="/about" element={<AboutPage />} />
 * </Route>
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <TopNavigation />
      <main className="max-w-7xl mx-auto px-8 pt-24 pb-8">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * NarrowLayout コンポーネント
 *
 * コンテンツ幅が狭いページ用のレイアウト（例: 記事ページ、フォームページ）
 */
export function NarrowLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <TopNavigation />
      <main className="max-w-4xl mx-auto px-8 pt-24 pb-8">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * FullWidthLayout コンポーネント
 *
 * 全幅を使いたいページ用のレイアウト（例: ダッシュボード、ギャラリー）
 */
export function FullWidthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <TopNavigation />
      <main className="w-full px-8 pt-24 pb-8">
        <Outlet />
      </main>
    </div>
  )
}
