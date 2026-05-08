'use client'

import { useState } from 'react'
import type { Household, HouseholdMember } from '@prisma/client'
import {
  Settings, Home, User, Users, Bell, Copy, Check, Loader2, ChevronRight,
  Shield, Globe, DollarSign, LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  member: HouseholdMember
  household: Household
  members: HouseholdMember[]
}

const AVATAR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6',
]

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Jerusalem', 'Asia/Tokyo', 'Australia/Sydney']
const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'ILS', label: 'ILS — Israeli Shekel' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
]

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  CHILD: 'Child',
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-indigo-100 text-indigo-700',
  ADMIN: 'bg-violet-100 text-violet-700',
  MEMBER: 'bg-gray-100 text-gray-700',
  CHILD: 'bg-emerald-100 text-emerald-700',
}

type Section = 'household' | 'profile' | 'members' | 'notifications'

export function SettingsContent({ member, household, members }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('household')
  const [codeCopied, setCodeCopied] = useState(false)

  // Household settings
  const [householdName, setHouseholdName] = useState(household.name)
  const [timezone, setTimezone] = useState(household.timezone)
  const [currency, setCurrency] = useState(household.currency)
  const [householdSaving, setHouseholdSaving] = useState(false)
  const [householdError, setHouseholdError] = useState('')
  const [householdSuccess, setHouseholdSuccess] = useState(false)

  // Profile settings
  const [displayName, setDisplayName] = useState(member.displayName)
  const [color, setColor] = useState(member.color)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Notification toggles (UI only)
  const [notifToggles, setNotifToggles] = useState({
    tasks: true,
    grocery: false,
    events: true,
    expenses: false,
  })

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(household.inviteCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  async function saveHousehold() {
    setHouseholdError('')
    setHouseholdSuccess(false)
    if (!householdName.trim()) {
      setHouseholdError('Name is required')
      return
    }
    setHouseholdSaving(true)
    try {
      const res = await fetch('/api/settings/household', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName.trim(), timezone, currency }),
      })
      if (res.ok) {
        setHouseholdSuccess(true)
        setTimeout(() => setHouseholdSuccess(false), 3000)
      } else {
        const data = await res.json()
        setHouseholdError(typeof data.error === 'string' ? data.error : 'Failed to save')
      }
    } catch {
      setHouseholdError('Something went wrong')
    } finally {
      setHouseholdSaving(false)
    }
  }

  async function saveProfile() {
    setProfileError('')
    setProfileSuccess(false)
    if (!displayName.trim()) {
      setProfileError('Display name is required')
      return
    }
    setProfileSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim(), color }),
      })
      if (res.ok) {
        setProfileSuccess(true)
        setTimeout(() => setProfileSuccess(false), 3000)
      } else {
        const data = await res.json()
        setProfileError(typeof data.error === 'string' ? data.error : 'Failed to save')
      }
    } catch {
      setProfileError('Something went wrong')
    } finally {
      setProfileSaving(false)
    }
  }

  const NAV_ITEMS: Array<{ key: Section; label: string; icon: React.ElementType }> = [
    { key: 'household', label: 'Household', icon: Home },
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-gray-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="bg-white rounded-2xl border border-gray-100 p-2 h-fit">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSection === key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon size={16} />
              {label}
              {activeSection !== key && <ChevronRight size={14} className="ml-auto text-gray-400" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-4">
          {/* Household */}
          {activeSection === 'household' && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Home size={16} className="text-indigo-600" />
                  <h2 className="font-semibold text-gray-900">Household settings</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hhName">Name</Label>
                    <Input
                      id="hhName"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hhTz">Timezone</Label>
                    <select
                      id="hhTz"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="hhCur">Currency</Label>
                    <select
                      id="hhCur"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                  {householdError && <p className="text-sm text-red-600">{householdError}</p>}
                  {householdSuccess && <p className="text-sm text-emerald-600 flex items-center gap-1"><Check size={14} /> Saved!</p>}
                  <Button onClick={saveHousehold} disabled={householdSaving} className="bg-indigo-600 hover:bg-indigo-700">
                    {householdSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    Save changes
                  </Button>
                </div>
              </div>

              {/* Invite code */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={16} className="text-indigo-600" />
                  <h2 className="font-semibold text-gray-900">Invite code</h2>
                </div>
                <p className="text-sm text-gray-500 mb-3">Share this code with household members so they can join.</p>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <code className="text-xl font-mono font-bold text-gray-900 tracking-widest flex-1">{household.inviteCode}</code>
                  <button
                    onClick={copyInviteCode}
                    className={cn(
                      'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors',
                      codeCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    )}
                  >
                    {codeCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Danger zone */}
              {member.role !== 'OWNER' && (
                <div className="bg-white rounded-2xl border border-red-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <LogOut size={16} className="text-red-600" />
                    <h2 className="font-semibold text-red-700">Danger zone</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Once you leave, you will need a new invite code to rejoin.</p>
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                    Leave household
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Profile */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-5">
                <User size={16} className="text-indigo-600" />
                <h2 className="font-semibold text-gray-900">Your profile</h2>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {displayName ? displayName[0].toUpperCase() : '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{displayName || 'Your name'}</p>
                  <p className="text-sm text-gray-500">{ROLE_LABELS[member.role] ?? 'Member'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="profileName">Display name</Label>
                  <Input
                    id="profileName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Avatar color</Label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                          'w-9 h-9 rounded-full transition-all border-2',
                          color === c ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check size={14} className="text-white mx-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
                {profileError && <p className="text-sm text-red-600">{profileError}</p>}
                {profileSuccess && <p className="text-sm text-emerald-600 flex items-center gap-1"><Check size={14} /> Saved!</p>}
                <Button onClick={saveProfile} disabled={profileSaving} className="bg-indigo-600 hover:bg-indigo-700">
                  {profileSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Save changes
                </Button>
              </div>
            </div>
          )}

          {/* Members */}
          {activeSection === 'members' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Users size={16} className="text-indigo-600" />
                <h2 className="font-semibold text-gray-900">Household members</h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-auto">{members.length}</span>
              </div>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.displayName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{m.displayName}</p>
                        {m.id === member.id && <span className="text-xs text-gray-400">(you)</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[m.role])}>
                        {ROLE_LABELS[m.role]}
                      </span>
                      {m.role === 'OWNER' && <Shield size={14} className="text-indigo-400" />}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
                <p className="text-sm text-indigo-700 font-medium mb-1">Invite someone</p>
                <p className="text-xs text-indigo-600">
                  Share the invite code from the Household settings: <code className="font-mono font-bold">{household.inviteCode}</code>
                </p>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Bell size={16} className="text-indigo-600" />
                <h2 className="font-semibold text-gray-900">Notifications</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">Control what you get notified about.</p>
              <div className="space-y-4">
                {[
                  { key: 'tasks', label: 'Task updates', desc: 'When tasks are assigned, completed, or due soon' },
                  { key: 'grocery', label: 'Grocery reminders', desc: 'When urgent items are added to the list' },
                  { key: 'events', label: 'Event reminders', desc: 'Upcoming calendar events' },
                  { key: 'expenses', label: 'Budget alerts', desc: 'When spending approaches or exceeds budget' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifToggles(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                        notifToggles[key as keyof typeof notifToggles] ? 'bg-indigo-600' : 'bg-gray-200'
                      )}
                    >
                      <div className={cn(
                        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                        notifToggles[key as keyof typeof notifToggles] ? 'translate-x-5' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4">Note: Notifications are UI placeholders. Push notification backend coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
