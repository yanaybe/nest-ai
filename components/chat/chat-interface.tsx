'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef, useState } from 'react'
import type { AIConversation, HouseholdMember } from '@prisma/client'
import { Send, Loader2, Sparkles, ShoppingCart, CheckSquare, Calendar, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Props {
  member: HouseholdMember
  initialQuery?: string
  recentConversations: (AIConversation & { _count: { messages: number } })[]
}

const SUGGESTIONS = [
  { icon: ShoppingCart, text: "What's on the grocery list?" },
  { icon: CheckSquare, text: "What tasks are pending?" },
  { icon: Calendar, text: "What's on the calendar this week?" },
  { icon: DollarSign, text: "How much did we spend this month?" },
]

export function ChatInterface({ member, initialQuery, recentConversations }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, append } = useChat({
    api: '/api/ai/chat',
    body: { conversationId },
    onResponse: (response) => {
      const convId = response.headers.get('X-Conversation-Id')
      if (convId && !conversationId) setConversationId(convId)
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      append({ role: 'user', content: initialQuery })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const handleSuggestion = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — recent conversations */}
      <div className="hidden lg:flex flex-col w-64 border-r border-gray-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent</h3>
        <div className="space-y-1">
          {recentConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {/* TODO: load conversation */}}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-800 truncate">
                {conv.title || 'New conversation'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {format(new Date(conv.updatedAt), 'MMM d')} · {conv._count.messages} messages
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Hey {member.displayName}!</h2>
              <p className="text-gray-500 mb-8">
                I&apos;m Nest, your family AI assistant. Ask me anything about your household — groceries, tasks, schedule, expenses, and more.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestion(s.text)}
                    className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                  >
                    <div className="w-8 h-8 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <s.icon size={16} className="text-indigo-600" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-md'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md shadow-sm'
                    )}
                  >
                    {message.content}

                    {/* Tool call results — show as subtle action cards */}
                    {message.toolInvocations?.map((tool) => (
                      tool.state === 'result' && (
                        <div key={tool.toolCallId} className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">✓ {tool.toolName.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      )
                    ))}
                  </div>
                  {message.role === 'user' && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                    <Loader2 size={16} className="animate-spin text-indigo-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-indigo-400 focus-within:bg-white transition-all"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask Nest anything..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 w-8 h-8 rounded-xl flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </Button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-2">
            Nest can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}
