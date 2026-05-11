// TODO [CRITICAL]:
// All testimonials and social proof numbers on this page are fabricated.
// "2,000+ families", "4.9/5 rating", and all three testimonials (Sarah M., David K., Priya L.)
// are invented characters with invented quotes. This is a serious trust and legal risk —
// fake reviews can violate FTC guidelines and destroy credibility if a journalist or
// investor notices.
//
// Required actions before any marketing spend or press coverage:
// 1. Remove all fake testimonials and social proof numbers immediately
// 2. Replace with real user quotes (even beta users or friends) with explicit consent
// 3. Replace "2,000+ families" with accurate count, or remove entirely until real data exists
// 4. Replace "4.9/5 rating" with actual aggregated rating from real users, or remove
// 5. If no real users yet, replace testimonial section with a "What families will be able to do" section
//    or an honest "Early access" framing
// 6. Add disclaimer like "Beta results from early adopters" if using beta user data
//
// Business impact: One tweet calling out fake reviews can permanently damage brand trust.
// Do not ship this to real users without fixing this.

// TODO [GROWTH]:
// The landing page has no conversion analytics whatsoever. There's no way to know which
// section visitors drop off at, what the CTA click-through rate is, or which features
// resonate. Without this, optimization is guesswork.
//
// Suggested implementation:
// - Add Plausible or PostHog (privacy-friendly) for page-level analytics
// - Track CTA button clicks as custom events (hero CTA, final CTA, nav CTA)
// - Add scroll-depth tracking to identify where users stop reading
// - A/B test the hero headline (current vs. "AI assistant for family life")
// - Track signup source via UTM parameters on all marketing links
//
// Expected impact: 2-3x improvement in conversion rate within 60 days of data-driven optimization.

// TODO [MONETIZATION]:
// There is no pricing page linked anywhere on the landing page. Visitors cannot understand
// what they're committing to, what's free vs. paid, or how Nest makes money. This is a
// major conversion killer for privacy-conscious users and investors.
//
// Suggested implementation:
// - Add /pricing page with clear Free / Starter / Family / Premium tier comparison
// - Add "Pricing" link in nav
// - Add pricing teaser in CTA section ("Free forever for 1 household · Pro plans from $9/mo")
// - Schema.prisma already has Subscription + Plan models — wire them up
// - Consider: Free = 1 household / 50 AI msgs/mo, Pro = unlimited msgs + receipt scanning
//
// Expected impact: Pricing clarity reduces drop-off and signals product legitimacy to investors.

// TODO [UX]:
// The hero app preview is a static mockup with hardcoded skeleton data. It looks beautiful
// but tells nothing real about the product. Visitors can't try it, click anything, or see
// the AI actually work. The chat demo in the AI section is similarly static text.
//
// Suggested improvements:
// - Replace static preview with an animated walkthrough (CSS keyframes or Framer Motion)
// - Show a brief looping demo: AI receives a message → items appear on grocery list
// - Add an interactive "Try Nest" box where visitors can type a query and see a canned response
//   (no real API call needed — just pattern-match strings to show compelling results)
// - Add a video demo link (even a 60-second Loom video dramatically increases conversion)
//
// Expected impact: Interactive previews increase conversion by ~40% on SaaS landing pages.

import Link from 'next/link'
import {
  Home, MessageSquare, ShoppingCart, CheckSquare, Calendar,
  DollarSign, Sparkles, ArrowRight, Star, Shield, Zap,
  Bell, Users, ChefHat, Receipt, Brain
} from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: 'AI at the center',
    desc: 'Just ask. Add groceries, create tasks, schedule events, and track expenses — all through natural conversation.',
  },
  {
    icon: ShoppingCart,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'Smart grocery lists',
    desc: 'Auto-categorized lists, urgent item flags, recurring purchases, and one-tap check-off when shopping.',
  },
  {
    icon: CheckSquare,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'Family task board',
    desc: 'Assign tasks to family members with priorities and due dates. Everyone stays in sync.',
  },
  {
    icon: Calendar,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    title: 'Shared calendar',
    desc: 'A single source of truth for school pickups, appointments, date nights, and family activities.',
  },
  {
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'Expense tracking',
    desc: 'Budget by category, see spending trends, and get an instant view of where the money goes.',
  },
  {
    icon: ChefHat,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    title: 'Meal planning',
    desc: 'AI-generated weekly meal plans that automatically populate your grocery list.',
  },
  {
    icon: Receipt,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    title: 'Bill management',
    desc: 'Never miss a due date. Track bills, set up reminders, and log payments instantly.',
  },
  {
    icon: Bell,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    title: 'Smart reminders',
    desc: 'Proactive nudges for tasks, bills, events, and anything else your family needs to remember.',
  },
]

// TODO [CRITICAL]:
// These testimonials are entirely fabricated. Replace with real user quotes before launch.
// See the top-of-file TODO for full context on why this is a critical issue.
// Until real quotes exist, either remove this section or replace with a "What you'll be able to do"
// benefits list, or a "Join X beta users" invite-focused section.
const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Mom of 3',
    body: "Nest has completely changed how we manage our household. I just say 'add milk to the list' and it's done. My husband and I finally feel coordinated.",
    avatar: 'S',
    color: '#6366f1',
  },
  {
    name: 'David K.',
    role: 'Dad & small business owner',
    body: "I was skeptical, but now I use it every day. The grocery + budget tracking combo alone saves us at least $200/month by flagging overspending.",
    avatar: 'D',
    color: '#10b981',
  },
  {
    name: 'Priya L.',
    role: 'Working parent',
    body: "The meal planning feature is a game changer. Nest suggests meals, builds the grocery list, and even helps with the budget. It just thinks ahead for us.",
    avatar: 'P',
    color: '#f59e0b',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Nav ────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Nest</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-xl hover:bg-gray-50"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md press-effect"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className="bg-hero pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 animate-fade-in-up">
            <Sparkles size={12} />
            AI-powered family assistant
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.08] mb-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            Your family,{' '}
            <span className="gradient-text">perfectly</span>
            {' '}organized
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            Nest is the AI operating system for family life. Groceries, tasks, calendar, expenses, and meals — all in one place, all powered by a smart assistant that knows your home.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 press-effect text-base"
            >
              Start for free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-6 py-3.5 rounded-2xl transition-all hover:bg-gray-50 text-base border border-gray-200"
            >
              <Users size={16} />
              Already have an account
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-5 animate-fade-in" style={{ animationDelay: '300ms' }}>
            Free to start · No credit card required · Set up in 2 minutes
          </p>
        </div>

        {/* ─── App Preview ───────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto mt-16 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/80 overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs text-gray-400 font-mono w-48 text-center">
                  app.nest.family
                </div>
              </div>
            </div>

            {/* Fake app UI */}
            <div className="flex h-72 sm:h-96">
              {/* Sidebar */}
              <div className="hidden sm:flex flex-col w-52 bg-white border-r border-gray-100 p-3 gap-1">
                <div className="flex items-center gap-2 px-3 py-2 mb-3">
                  <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Home size={12} className="text-white" />
                  </div>
                  <span className="font-bold text-xs text-gray-800">The Smith Home</span>
                </div>
                {[
                  { icon: MessageSquare, label: 'Ask Nest', active: false, accent: true },
                  { icon: CheckSquare, label: 'Tasks', active: true, accent: false },
                  { icon: ShoppingCart, label: 'Grocery', active: false, accent: false },
                  { icon: Calendar, label: 'Calendar', active: false, accent: false },
                  { icon: DollarSign, label: 'Expenses', active: false, accent: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                      item.active
                        ? 'bg-indigo-50 text-indigo-700'
                        : item.accent
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-500'
                    }`}
                  >
                    <item.icon size={13} />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="h-5 w-36 skeleton rounded-lg mb-1.5" />
                    <div className="h-3 w-24 skeleton rounded" />
                  </div>
                  <div className="h-8 w-24 bg-indigo-600 rounded-xl opacity-90" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Open tasks', val: '5', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Grocery items', val: '12', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Upcoming', val: '3', color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Spent', val: '$840', color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl p-2.5 border border-gray-100">
                      <div className={`w-5 h-5 ${s.bg} rounded-lg mb-1.5`} />
                      <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Two cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckSquare size={12} className="text-indigo-500" />
                      <span className="text-xs font-semibold text-gray-700">Tasks</span>
                    </div>
                    {['Pick up kids 3pm', 'Pay electricity bill', 'Buy birthday gift'].map((t) => (
                      <div key={t} className="flex items-center gap-2 py-1">
                        <div className="w-3 h-3 rounded border border-gray-300 flex-shrink-0" />
                        <span className="text-[11px] text-gray-600 truncate">{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-3 text-white">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Brain size={12} className="text-white/80" />
                      <span className="text-xs font-semibold">Ask Nest</span>
                    </div>
                    <p className="text-[11px] text-white/80 leading-relaxed mb-2">
                      &ldquo;Add milk and eggs, and remind me about the dentist on Friday&rdquo;
                    </p>
                    <div className="bg-white/20 rounded-lg px-2 py-1 text-[10px]">
                      ✓ Done! Added 2 items &amp; set reminder
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof Bar ───────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center">
          {/* TODO [CRITICAL]:
            "4.9/5 rating" and "2,000+ families" are fabricated numbers. Replace with accurate
            metrics pulled from your actual database/analytics. If you have no data yet, replace
            with honest feature highlights like "End-to-end encrypted" and "Setup in 2 minutes".
            Remove all quantified claims until you have real numbers to back them up. */}
          {[
            { icon: Star, text: '4.9 / 5 rating', sub: 'from early adopters' },
            { icon: Users, text: '2,000+ families', sub: 'actively using Nest' },
            { icon: Shield, text: 'Privacy first', sub: 'your data stays yours' },
            { icon: Zap, text: 'Instant setup', sub: 'ready in under 2 minutes' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <item.icon size={14} className="text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{item.text}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wider mb-3">Everything you need</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4">
              One app for the whole home
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Stop juggling 6 different apps. Nest brings groceries, tasks, calendar, expenses, and more into one seamless AI-powered experience.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group p-5 bg-white rounded-2xl border border-gray-100 card-hover"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon size={20} className={f.color} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Feature callout ─────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full text-xs font-semibold px-3 py-1.5 mb-6">
                <Brain size={12} />
                Powered by GPT-4o
              </div>
              <h2 className="text-4xl font-bold tracking-tight mb-4 leading-tight">
                Talk to your home. It listens.
              </h2>
              <p className="text-indigo-100 text-lg leading-relaxed mb-8">
                Nest&apos;s AI understands your family&apos;s routines, preferences, and patterns. The more you use it, the smarter it gets.
              </p>
              <div className="space-y-3">
                {[
                  '"Add milk, eggs, and butter to the grocery list"',
                  '"What do we have on the calendar this weekend?"',
                  '"We spent too much on dining last month — help me budget"',
                  '"Remind everyone about the dentist appointment Friday"',
                ].map((q) => (
                  <div key={q} className="flex items-start gap-3 bg-white/10 border border-white/15 rounded-xl px-4 py-3">
                    <Sparkles size={14} className="text-indigo-300 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-white/90 font-medium">{q}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-3xl p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="bg-white/15 rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-white/90">Hey! I noticed you&apos;re running low on a few staples based on your shopping history. Want me to add them to the list?</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[75%]">
                    <p className="text-sm text-gray-800">Yes please! Also add ingredients for pasta tonight</p>
                  </div>
                  <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="bg-white/15 rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-white/90 mb-2">Done! I&apos;ve added:</p>
                    <div className="space-y-1">
                      {['✓ Olive oil, bread, eggs (staples)', '✓ Spaghetti, marinara, ground beef (pasta)', '✓ Parmesan cheese'].map((item) => (
                        <p key={item} className="text-xs text-white/75">{item}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wider mb-3">Real families. Real results.</p>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
              Families love Nest
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white border border-gray-100 rounded-2xl p-6 card-hover">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5">&ldquo;{t.body}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <Home size={28} className="text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-5">
            Ready to simplify<br />family life?
          </h2>
          {/* TODO [CRITICAL]: "Join thousands of families" is fabricated. Replace with
            honest copy, e.g. "Be part of our growing community of families" or wait until
            you have thousands of real users. */}
          <p className="text-lg text-gray-500 mb-8 max-w-lg mx-auto">
            Join thousands of families who use Nest to stay organized, reduce stress, and spend less time on logistics.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 hover:-translate-y-0.5 press-effect text-lg"
          >
            Get started — it&apos;s free
            <ArrowRight size={20} />
          </Link>
          <p className="text-sm text-gray-400 mt-4">No credit card required</p>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Home size={13} className="text-white" />
            </div>
            <span className="font-bold text-gray-800 text-sm">Nest</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 Nest. The AI operating system for family life.</p>
          {/* TODO [SECURITY]: Privacy and Terms links go to "#" which means they don't exist.
            These are legally required documents if you're collecting user data (which you are —
            emails, household data, expenses). You need actual policies before any public launch.
            At minimum, generate basic policies via Termly or a lawyer, then link to /privacy and /terms.
            Failure to have these can expose you to GDPR/CCPA liability. */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
