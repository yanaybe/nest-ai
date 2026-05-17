import Link from 'next/link'
import { Home } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — Nest',
  description: 'How Nest collects, uses, and protects your household data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-gray-800 hover:text-gray-600 transition-colors">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Home size={13} className="text-white" />
            </div>
            <span className="font-bold text-sm">Nest</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">What we collect</h2>
            <p>Nest collects information you provide when creating an account (email address, display name) and data you enter into the app (grocery items, tasks, calendar events, expense records, household information, and AI conversation history).</p>
            <p className="mt-2">We also collect standard usage data: IP addresses, browser type, and pages visited, to operate and improve the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">How we use your data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide the Nest service to your household</li>
              <li>To power the AI assistant (your messages are sent to OpenAI for processing)</li>
              <li>To send account-related emails (password reset, verification)</li>
              <li>To improve the product through aggregated, anonymized analytics</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">AI and OpenAI</h2>
            <p>Nest uses OpenAI&apos;s GPT-4o model to power the AI assistant. Messages you send to Nest AI are transmitted to OpenAI&apos;s API for processing. OpenAI&apos;s <a href="https://openai.com/policies/privacy-policy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">privacy policy</a> applies to this processing. We do not use your data to train OpenAI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Data storage</h2>
            <p>Your data is stored in a PostgreSQL database hosted on Supabase. We use Upstash Redis for rate limiting. Authentication is handled by Supabase Auth. All data is encrypted at rest and in transit.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your rights</h2>
            <p>You may request deletion of your account and all associated data at any time from the Settings page. For data export or other requests, contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p>Questions about this policy? Email us at <span className="text-indigo-600">privacy@nest.family</span></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-4 mt-12">
        <div className="max-w-3xl mx-auto flex items-center gap-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
        </div>
      </footer>
    </div>
  )
}
