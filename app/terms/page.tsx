import Link from 'next/link'
import { Home } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service — Nest',
  description: 'Terms and conditions for using the Nest household assistant.',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Acceptance</h2>
            <p>By creating a Nest account, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">The service</h2>
            <p>Nest is a household management assistant powered by AI. We provide tools for managing grocery lists, tasks, calendars, expenses, and more. The service is provided &quot;as is&quot; and we may update or modify it at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your account</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for keeping your account credentials secure</li>
              <li>You must be at least 13 years old to use Nest</li>
              <li>One person may not create multiple accounts to circumvent usage limits</li>
              <li>You are responsible for all activity that occurs under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Acceptable use</h2>
            <p>You agree not to use Nest to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Violate any applicable law or regulation</li>
              <li>Attempt to gain unauthorized access to other users&apos; data</li>
              <li>Scrape, reverse-engineer, or abuse the API</li>
              <li>Submit content that is illegal, harmful, or violates others&apos; rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">AI-generated content</h2>
            <p>Nest&apos;s AI assistant may make mistakes. AI-generated suggestions, reminders, and plans should be verified before acting on them, particularly for important household decisions. We are not liable for errors in AI-generated content.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Termination</h2>
            <p>You may cancel your account at any time from the Settings page. We may suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Nest shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p>Questions? Email us at <span className="text-indigo-600">hello@nest.family</span></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-4 mt-12">
        <div className="max-w-3xl mx-auto flex items-center gap-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
