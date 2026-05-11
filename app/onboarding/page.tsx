'use client'

// TODO [UX]:
// The current onboarding is purely functional — it collects data but does NOT sell the user
// on Nest's value. A new user who just signed up needs to feel excited, not like they're
// filling out a form. First impressions set retention.
//
// Current problems:
// 1. No value proposition reinforcement — the user just came from a marketing page and now sees
//    a plain "Get started" card with no reminder of why Nest is amazing
// 2. No onboarding "hook" moment — users don't experience any AI magic during setup
// 3. No guidance on what a good household setup looks like (examples, templates)
// 4. The "Timezone" / "Currency" fields appear before the user even understands the product
//
// Suggested improvements:
// - Step 1: Show an animated "Welcome" screen with a brief value statement ("Nest learns your
//   household's patterns and helps you stay organized effortlessly")
// - Add AI-generated starter setup: after household creation, auto-populate 3 sample tasks,
//   a grocery list, and an upcoming event so the dashboard feels alive immediately
// - Add "Quick templates" for common household types: "Young couple", "Family with kids", "Roommates"
//   that pre-configure categories and common tasks
// - Move timezone/currency to Settings — most users don't care and it adds friction to the
//   most critical signup moment
// - Show a preview of what the dashboard will look like after setup
//
// Expected impact: Reducing onboarding steps and showing value earlier should improve
// activation rate (users who take a meaningful action within 7 days) by 30-50%.

// TODO [GROWTH]:
// There is no referral or sharing mechanism at the end of onboarding. After a user creates
// a household, they immediately want to invite their family — but there's no "Invite your
// family" step in the flow. The invite code exists in the DB but isn't surfaced here.
//
// Suggested addition:
// - Add Step 4: "Invite your family" that shows the invite code prominently with a copy button
//   and a "Share via WhatsApp / iMessage" button (native Web Share API)
// - Show who has joined in real-time as they accept the invite (via polling or SSE)
// - Frame it as: "Nest is better with the whole family. Invite them now."
// - Add viral loop: remind the household creator to invite remaining members in the first
//   3 dashboard visit notifications
//
// Expected impact: Each household inviting 1+ additional member doubles your active user count
// without any additional acquisition cost. This is the highest-leverage growth lever in the product.

// TODO [MOBILE]:
// The onboarding page uses `min-h-screen` which doesn't account for the iOS Safari address bar
// height shifting as the user scrolls. On certain devices, the "Let's go!" button may be hidden
// behind the browser chrome.
//
// Fix: Use `min-h-[100dvh]` (dynamic viewport height) instead of `min-h-screen` to ensure
// the page fills the actual visible area on mobile browsers.
// Also verify the form doesn't get obscured by the virtual keyboard on iOS when typing.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Users, ChevronRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Flow = 'none' | 'create' | 'join'

// TODO [UX]: Hardcoded timezone list misses most of the world. Use the browser's
// Intl.supportedValuesOf('timeZone') API to populate a full, auto-detected list,
// or default to the user's detected timezone via Intl.DateTimeFormat().resolvedOptions().timeZone
// and only show the selector as an "override" option. Most users just want the right default.
const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Jerusalem', 'Asia/Tokyo', 'Australia/Sydney']
const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'ILS', label: 'ILS — Israeli Shekel' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
]
const AVATAR_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#14b8a6', label: 'Teal' },
]

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [flow, setFlow] = useState<Flow>('none')

  // Create form
  const [householdName, setHouseholdName] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [currency, setCurrency] = useState('USD')

  // Join form
  const [inviteCode, setInviteCode] = useState('')

  // Step 3
  const [displayName, setDisplayName] = useState('')
  const [color, setColor] = useState('#6366f1')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function chooseFlow(f: 'create' | 'join') {
    setFlow(f)
    setStep(2)
    setError('')
  }

  function goToStep3() {
    setError('')
    if (flow === 'create' && !householdName.trim()) {
      setError('Household name is required')
      return
    }
    if (flow === 'join') {
      const code = inviteCode.trim()
      if (code.length !== 8) {
        setError('Invite code must be exactly 8 characters')
        return
      }
    }
    setStep(3)
  }

  async function handleSubmit() {
    setError('')
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }

    setLoading(true)
    try {
      if (flow === 'create') {
        const res = await fetch('/api/household/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: householdName.trim(),
            displayName: displayName.trim(),
            timezone,
            currency,
            color,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(typeof data.error === 'string' ? data.error : 'Failed to create household')
          return
        }
      } else {
        const res = await fetch('/api/household/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteCode: inviteCode.trim(),
            displayName: displayName.trim(),
            color,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(typeof data.error === 'string' ? data.error : 'Failed to join household')
          return
        }
      }
      // TODO [GROWTH]: After successful household creation, instead of going straight to /dashboard,
      // go to a dedicated "invite family" step or a "your household is ready" celebration screen
      // that shows the invite code prominently and encourages sharing. This is the highest-ROI
      // moment to get viral sharing — users are most excited right after setup completes.
      //
      // Also consider: trigger an AI-generated "starter pack" here — auto-create 3 sample tasks
      // ("Welcome to Nest!", "Set up your grocery list", "Add your first event") so the dashboard
      // doesn't look empty on first load. Empty state is the #1 reason new users churn.
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = 3
  const stepLabels = ['Choose', flow === 'create' ? 'Setup' : 'Join', 'Profile']

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Home size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Nest</h1>
          <p className="text-gray-500 text-sm mt-1">Your AI-powered home hub</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const s = i + 1
            const active = s === step
            const done = s < step
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-gray-200 text-gray-400'
                )}>
                  {done ? <Check size={14} /> : s}
                </div>
                <span className={cn('text-xs', active ? 'text-indigo-600 font-medium' : 'text-gray-400')}>
                  {stepLabels[i]}
                </span>
                {i < totalSteps - 1 && <div className={cn('w-8 h-0.5', done ? 'bg-indigo-600' : 'bg-gray-200')} />}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {/* Step 1: Choose */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Get started</h2>
                <p className="text-gray-500 text-sm mt-1">Create a new household or join one with an invite code.</p>
              </div>
              <button
                onClick={() => chooseFlow('create')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group text-left"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors flex-shrink-0">
                  <Home size={22} className="text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Create a household</p>
                  <p className="text-sm text-gray-500">Start fresh and invite your family</p>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-indigo-600" />
              </button>
              <button
                onClick={() => chooseFlow('join')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group text-left"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors flex-shrink-0">
                  <Users size={22} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Join existing</p>
                  <p className="text-sm text-gray-500">Enter an 8-character invite code</p>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-indigo-600" />
              </button>
            </div>
          )}

          {/* Step 2a: Create household details */}
          {step === 2 && flow === 'create' && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-gray-900">Set up your household</h2>
                <p className="text-gray-500 text-sm mt-1">Give your home a name and configure preferences.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="householdName">Household name *</Label>
                <Input
                  id="householdName"
                  placeholder="e.g. The Berdah Home"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && goToStep3()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setStep(1); setError('') }} className="gap-2">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button onClick={goToStep3} className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2">
                  Continue <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2b: Join with invite code */}
          {step === 2 && flow === 'join' && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-gray-900">Join a household</h2>
                <p className="text-gray-500 text-sm mt-1">Enter the invite code shared by your household.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite code *</Label>
                <Input
                  id="inviteCode"
                  placeholder="8 characters e.g. ab12cd34"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toLowerCase())}
                  onKeyDown={(e) => e.key === 'Enter' && goToStep3()}
                  maxLength={8}
                  autoFocus
                  className="font-mono text-center tracking-widest text-lg"
                />
                <p className="text-xs text-gray-400 text-center">{inviteCode.length}/8 characters</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setStep(1); setError('') }} className="gap-2">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button onClick={goToStep3} className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2">
                  Continue <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Profile */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-gray-900">Your profile</h2>
                <p className="text-gray-500 text-sm mt-1">How should your household know you?</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name *</Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Yanay"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Avatar color</Label>
                <div className="flex flex-wrap gap-3">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      title={c.label}
                      className={cn(
                        'w-9 h-9 rounded-full transition-all border-2',
                        color === c.value ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: c.value }}
                    >
                      {color === c.value && <Check size={14} className="text-white mx-auto" />}
                    </button>
                  ))}
                </div>
                {/* Preview */}
                <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {displayName ? displayName[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{displayName || 'Your name'}</p>
                    <p className="text-xs text-gray-500">Member</p>
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setStep(2); setError('') }} className="gap-2">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Setting up...</>
                  ) : (
                    <><Check size={16} /> Let&apos;s go!</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* TODO [SECURITY]: "terms of service and privacy policy" are not linked — they link
          to nothing. These are legally required before collecting user data. The user is
          explicitly consenting to terms that don't exist. Replace with actual /terms and /privacy
          links before any public launch. This is a legal liability. */}
        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing you agree to Nest&apos;s terms of service and privacy policy.
        </p>
      </div>
    </div>
  )
}
