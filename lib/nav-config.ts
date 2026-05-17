import {
  LayoutDashboard, MessageSquare, ShoppingCart, CheckSquare,
  Calendar, DollarSign, UtensilsCrossed, Receipt, Repeat,
  Bell, Settings
} from 'lucide-react'

export type NavItem = {
  href: string
  icon: React.ElementType
  label: string
  highlight?: boolean
  section?: string
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/chat', icon: MessageSquare, label: 'Ask Nest', highlight: true },
]

export const HOUSEHOLD_NAV: NavItem[] = [
  { href: '/grocery', icon: ShoppingCart, label: 'Grocery', section: 'Household' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks', section: 'Household' },
  { href: '/calendar', icon: Calendar, label: 'Calendar', section: 'Household' },
  { href: '/expenses', icon: DollarSign, label: 'Expenses', section: 'Household' },
]

export const PLANNING_NAV: NavItem[] = [
  { href: '/meals', icon: UtensilsCrossed, label: 'Meals', section: 'Planning' },
  { href: '/bills', icon: Receipt, label: 'Bills', section: 'Planning' },
  { href: '/routines', icon: Repeat, label: 'Routines', section: 'Planning' },
  { href: '/reminders', icon: Bell, label: 'Reminders', section: 'Planning' },
]

export const SETTINGS_NAV: NavItem[] = [
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export const ALL_NAV = [...PRIMARY_NAV, ...HOUSEHOLD_NAV, ...PLANNING_NAV, ...SETTINGS_NAV]

export const MOBILE_PRIMARY_NAV = [
  PRIMARY_NAV[0], // Dashboard
  PRIMARY_NAV[1], // Chat (Ask Nest)
  HOUSEHOLD_NAV[0], // Grocery
  HOUSEHOLD_NAV[1], // Tasks
  HOUSEHOLD_NAV[2], // Calendar
]

export const MOBILE_MORE_NAV = [
  ...HOUSEHOLD_NAV.slice(3), // Expenses
  ...PLANNING_NAV,
  ...SETTINGS_NAV,
]
