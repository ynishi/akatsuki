import { useState, FormEvent, ChangeEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    // パスワード確認
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    // パスワード強度チェック
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(email, password)
      if (error) throw error

      setMessage('登録完了！確認メールを送信しました。メールをご確認ください。')
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>新規登録</CardTitle>
        <CardDescription>アカウントを作成して管理画面にアクセス</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              メールアドレス
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              パスワード
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">6文字以上で入力してください</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              パスワード（確認）
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={loading}
          >
            {loading ? '登録中...' : '新規登録'}
          </Button>

          <div className="text-center text-sm text-gray-600">
            既にアカウントをお持ちの方は{' '}
            <a href="/login" className="text-purple-600 hover:underline">
              ログイン
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
