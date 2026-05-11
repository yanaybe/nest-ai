'use client'

// TODO [AI]:
// The chat interface is the core product differentiator. Currently it's a solid foundation,
// but it lacks the features that make AI assistants feel intelligent and trustworthy.
//
// Missing capabilities that users will expect within the first week:
// 1. Voice input — many household tasks happen in the kitchen with dirty hands. Web Speech API
//    is available in all modern browsers. Add a microphone button that transcribes and submits.
// 2. Image upload — "What should I cook with these ingredients?" with a fridge photo.
//    GPT-4o supports vision. This is a killer feature for a household assistant.
// 3. Message editing — users will want to fix typos in sent messages and regenerate
// 4. Conversation search — when you have 50 conversations, you need to search them
// 5. Conversation naming — auto-generated titles from the first message are truncated to 60 chars
//    but never updated as the conversation evolves
//
// Expected impact: Voice input alone could make this product usable in scenarios where typing
// is not practical (cooking, driving, childcare), dramatically expanding daily use frequency.

// TODO [PERFORMANCE]:
// The entire message list re-renders on every new character the user types in the input box,
// because `input` state lives at the same level as the message list. This causes unnecessary
// DOM work, especially with long conversations.
//
// Fix: Extract the input area into a separate component (ChatInput) and use React.memo on
// the message list (ChatMessages). The message list should only re-render when `messages`
// or `isLoading` changes, not when the user types.

import { useChat } from 'ai/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { AIConversation, HouseholdMember } from '@prisma/client'
import {
  Send, Loader2, Sparkles, ShoppingCart, CheckSquare,
  Calendar, DollarSign, Plus, Bell, ChefHat, Receipt,
  RefreshCw, ThumbsUp, Copy, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  member: HouseholdMember
  initialQuery?: string
  recentConversations: (AIConversation & { _count: { messages: number } })[]
}

const SUGGESTIONS = [
  { icon: ShoppingCart,  text: "What's on the grocery list?",       color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100' },
  { icon: CheckSquare,   text: 'What tasks are pending?',            color: 'text-indigo-600',  bg: 'bg-indigo-50 hover:bg-indigo-100' },
  { icon: Calendar,      text: "What's on the calendar this week?",  color: 'text-violet-600',  bg: 'bg-violet-50 hover:bg-violet-100' },
  { icon: DollarSign,    text: 'How much did we spend this month?',  color: 'text-amber-600',   bg: 'bg-amber-50 hover:bg-amber-100' },
  { icon: ChefHat,       text: "Suggest a meal plan for this week",  color: 'text-rose-600',    bg: 'bg-rose-50 hover:bg-rose-100' },
  { icon: Bell,          text: 'Set a reminder for tomorrow 9am',    color: 'text-pink-600',    bg: 'bg-pink-50 hover:bg-pink-100' },
]

const TOOL_ICONS: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  addGroceryItem:     { icon: ShoppingCart, label: 'Added to grocery',   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  getGroceryList:     { icon: ShoppingCart, label: 'Grocery list',        color: 'text-emerald-600', bg: 'bg-emerald-50' },
  checkGroceryItem:   { icon: Check,        label: 'Checked off',         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  createTask:         { icon: CheckSquare,  label: 'Task created',        color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  getTasks:           { icon: CheckSquare,  label: 'Tasks',               color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  createEvent:        { icon: Calendar,     label: 'Event added',         color: 'text-violet-600',  bg: 'bg-violet-50' },
  getUpcomingEvents:  { icon: Calendar,     label: 'Upcoming events',     color: 'text-violet-600',  bg: 'bg-violet-50' },
  logExpense:         { icon: DollarSign,   label: 'Expense logged',      color: 'text-amber-600',   bg: 'bg-amber-50' },
  getExpenseSummary:  { icon: DollarSign,   label: 'Expense summary',     color: 'text-amber-600',   bg: 'bg-amber-50' },
  setReminder:        { icon: Bell,         label: 'Reminder set',        color: 'text-pink-600',    bg: 'bg-pink-50' },
  createBill:         { icon: Receipt,      label: 'Bill added',          color: 'text-orange-600',  bg: 'bg-orange-50' },
  suggestMealPlan:    { icon: ChefHat,      label: 'Meal plan generated', color: 'text-rose-600',    bg: 'bg-rose-50' },
}

function ToolResultCard({ toolName, state }: { toolName: string; state: string }) {
  const cfg = TOOL_ICONS[toolName] ?? { icon: Sparkles, label: toolName.replace(/([A-Z])/g, ' $1').trim(), color: 'text-indigo-600', bg: 'bg-indigo-50' }
  const Icon = cfg.icon
  const isPending = state !== 'result'

  return (
    <div className={cn('inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all', cfg.bg, 'border-transparent')}>
      {isPending ? (
        <Loader2 size={12} className={cn('animate-spin', cfg.color)} />
      ) : (
        <Icon size={12} className={cfg.color} />
      )}
      <span className={cfg.color}>{isPending ? `Running ${cfg.label.toLowerCase()}…` : `✓ ${cfg.label}`}</span>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Sparkles size={13} className="text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full block" />
          <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full block" />
          <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full block" />
        </div>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  )
}

export function ChatInterface({ member, initialQuery, recentConversations }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, append, reload, stop } = useChat({
    api: '/api/ai/chat',
    body: { conversationId },
    onResponse: (response) => {
      const convId = response.headers.get('X-Conversation-Id')
      if (convId && !conversationId) setConversationId(convId)
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      append({ role: 'user', content: initialQuery })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const handleSuggestion = useCallback((text: string) => {
    append({ role: 'user', content: text })
  }, [append])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
      }
    }
  }

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const visibleMessages = messages.filter((m) => m.role !== 'system')

  return (
    <div className="flex h-full">
      {/* ─── Sidebar: conversations ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-60 border-r border-gray-100 bg-white">
        {/* TODO [UX]: "New chat" button calls window.location.reload() which is a full page
          reload — all React state is destroyed, network requests are re-fired, and the user
          sees a flash. This should use Next.js router.push('/chat') with the conversation
          state reset via a query param or URL change, not a full page reload.
          Also: if the user already has an active conversation, warn them before losing it. */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent chats</h3>
            <button
              onClick={() => { setConversationId(undefined); window.location.reload() }}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors press-effect"
              title="New chat"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {recentConversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 px-3">No previous conversations</p>
          ) : (
            recentConversations.map((conv) => (
              {/* TODO [HIGH PRIORITY]:
                Clicking a previous conversation does nothing — the onClick is a stub.
                This is a broken feature. Users see their conversation history in the sidebar
                but can't load it. When they click, nothing happens.

                Implementation needed:
                1. Load the conversation's messages from the DB: GET /api/ai/conversations/:id/messages
                2. Populate the useChat `messages` state with the loaded history
                3. Set `conversationId` to the selected conversation's ID so new messages append correctly
                4. Show a loading state while the history is fetched
                5. Handle the edge case where the conversation has tool invocations (message format differs)

                This is a core retention feature — users can't reference past conversations
                without it. Fix this before any user testing. */}
              <button
                key={conv.id}
                onClick={() => { /* TODO: load conversation history */ }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors',
                  conv.id === conversationId && 'bg-indigo-50'
                )}
              >
                <p className={cn('text-xs font-medium truncate', conv.id === conversationId ? 'text-indigo-700' : 'text-gray-800')}>
                  {conv.title || 'New conversation'}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {format(new Date(conv.updatedAt), 'MMM d')} · {conv._count.messages} messages
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ─── Main chat ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {visibleMessages.length === 0 ? (
            /* Empty state / onboarding */
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto px-4 animate-fade-in-up">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
                <Sparkles size={26} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Hey {member.displayName}! 👋
              </h2>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                I&apos;m Nest, your family AI assistant. I can help with groceries, tasks, schedules, expenses, and anything else your household needs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestion(s.text)}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-2xl border border-gray-100 transition-all text-left group press-effect',
                      s.bg
                    )}
                  >
                    <div className={cn('w-7 h-7 bg-white/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm')}>
                      <s.icon size={14} className={s.color} />
                    </div>
                    <span className="text-xs text-gray-700 font-medium leading-tight">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div className="max-w-2xl mx-auto space-y-5">
              {visibleMessages.map((message, idx) => {
                const isUser = message.role === 'user'
                const isLast = idx === visibleMessages.length - 1
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3 animate-fade-in-up group',
                      isUser ? 'justify-end' : 'justify-start'
                    )}
                    style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
                  >
                    {/* Assistant avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Sparkles size={13} className="text-white" />
                      </div>
                    )}

                    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start', 'max-w-[82%]')}>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3 shadow-sm',
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-md'
                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md'
                        )}
                      >
                        {isUser ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <div className="prose-chat">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Tool invocation results */}
                        {!isUser && message.toolInvocations && message.toolInvocations.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {message.toolInvocations.map((tool) => (
                              <ToolResultCard
                                key={tool.toolCallId}
                                toolName={tool.toolName}
                                state={tool.state}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* TODO [AI]: The ThumbsUp button does nothing — there is no feedback
                        collection system. This is a critical missing feature for AI quality
                        improvement. User feedback is how you train better responses over time.

                        Implementation needed:
                        1. POST /api/ai/feedback with { messageId, type: 'positive' | 'negative', comment? }
                        2. Store feedback in a new Feedback table in Prisma schema
                        3. Add ThumbsDown button alongside ThumbsUp
                        4. On negative feedback: show a follow-up "What went wrong?" mini-form
                           (Options: "Wrong information", "Not helpful", "Took wrong action", "Other")
                        5. Use feedback data to:
                           a. Fine-tune prompts for common failure modes
                           b. Identify which tool calls cause frustration
                           c. Build a quality dashboard for internal monitoring

                        Also: the message actions (copy, regenerate, thumbs up) only appear on the
                        LAST assistant message. They should appear on hover for ALL assistant messages
                        so users can copy or rate any response, not just the latest. */}

                      {/* TODO [UX]: The message action buttons (copy, regenerate, thumbs) are
                        invisible until hover — `opacity-0 group-hover:opacity-100`. On mobile,
                        there is no hover state. These actions are completely inaccessible on touch
                        devices. Fix: show a "..." tap target on mobile that reveals the action menu. */}

                      {/* Assistant message actions */}
                      {!isUser && isLast && (
                        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton text={message.content} />
                          <button
                            onClick={() => reload()}
                            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <RefreshCw size={12} />
                          </button>
                          <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <ThumbsUp size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* User avatar */}
                    {isUser && (
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: member.color ?? '#6366f1' }}
                      >
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )
              })}

              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ─── Input ───────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm px-4 py-4">
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto"
          >
            <div className="flex items-end gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-indigo-400 focus-within:shadow-sm transition-all shadow-sm">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Nest anything… (Enter to send, Shift+Enter for newline)"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none min-h-[24px] max-h-[120px] leading-relaxed"
                rows={1}
                disabled={isLoading}
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors press-effect"
                  >
                    <span className="w-3 h-3 bg-red-500 rounded-sm" />
                  </button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim()}
                    className={cn(
                      'w-8 h-8 rounded-xl flex-shrink-0 transition-all',
                      input.trim()
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 press-effect'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    )}
                  >
                    <Send size={14} />
                  </Button>
                )}
              </div>
            </div>
            {/* TODO [MOBILE]: The input textarea on iOS Safari doesn't trigger the auto-scroll
              to bottom reliably when the virtual keyboard appears and pushes the viewport up.
              The chat content disappears behind the keyboard. Fix: listen to the
              visualViewport.resize event and adjust the chat container height dynamically.
              This is one of the most reported bugs in chat UI on mobile. */}

            {/* TODO [UX]: Character/token limit is not communicated to the user. If someone
              types a very long message, the AI response may be cut off or the request may fail
              due to context window limits. Add a subtle character counter that shows when
              approaching limits, and gracefully degrade with a warning message. */}
            <p className="text-center text-[11px] text-gray-400 mt-2">
              Nest can make mistakes. Double-check important details.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
