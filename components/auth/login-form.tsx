'use client'

// TODO [SECURITY]:
// The login form has no client-side rate limiting. A user could rapidly submit the form
// hundreds of times in a loop without any throttle. Supabase has its own server-side
// rate limiting on auth, but the UI provides no protection and will show confusing errors.
// Add: a disabled state after N failed attempts within M seconds (e.g., 5 fails in 60s
// disables for 30s with a countdown timer). This also improves UX for users who mistype.

// TODO [UX]:
// After a successful Google OAuth login, the user is redirected through /auth/callback
// to /dashboard. If the user is new (no household yet), they'll be redirected to /onboarding.
// But if something goes wrong with the redirect flow (e.g., cookies not set properly),
// the user ends up on a blank page with no indication of what happened.
// Add: a loading state on the Google button that persists until the redirect completes,
// and an error handler in /auth/callback for when the OAuth exchange fails.

// TODO [UX]:
// There's no "Remember me" checkbox. By default, Supabase sessions expire based on the
// project settings. For a household app that users check multiple times daily, a persistent
// session (30 days) is the right default. Verify Supabase project settings have appropriate
// session duration and that the "Remember me" behavior matches user expectations.

// TODO [GROWTH]:
// The login page has no social login options beyond Google. Many families might prefer
// Apple Sign In (especially on iOS/Safari where Apple pushes it strongly) or phone number
// auth (more universal, no email required). Supabase supports both.
// Priority: Apple Sign In for App Store compliance if ever submitting as a native app.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : error.message)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-6">Sign in to your household</p>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2.5 mb-4">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className={error ? 'border-red-300 focus-visible:ring-red-300' : ''}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className={error ? 'border-red-300 focus-visible:ring-red-300' : ''}
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-sm font-semibold press-effect shadow-sm shadow-indigo-200"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Sign in
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-gray-400 font-medium">Or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-11 font-medium press-effect"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </Button>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
          Sign up free
        </Link>
      </p>
    </div>
  )
}
