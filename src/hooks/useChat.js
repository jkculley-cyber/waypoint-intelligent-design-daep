import { useState, useCallback, useEffect } from 'react'
import { findFaqMatch } from '../lib/chatKnowledge'

const STORAGE_KEY = 'waypoint_chat_messages'

function loadMessages() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveMessages(messages) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

export function useChat() {
  const [messages, setMessages] = useState(loadMessages)
  const [isTyping, setIsTyping] = useState(false)

  // Persist messages whenever they change
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const userMsg = { role: 'user', content: trimmed }

    setMessages((prev) => {
      const updated = [...prev, userMsg]

      // Try FAQ match first
      const faqMatch = findFaqMatch(trimmed)
      if (faqMatch) {
        const assistantMsg = { role: 'assistant', content: faqMatch.answer, source: 'faq' }
        return [...updated, assistantMsg]
      }

      return updated
    })

    // If FAQ matched, we already added the response above
    const faqMatch = findFaqMatch(trimmed)
    if (faqMatch) return

    // Fall back to Gemini AI (client-side)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'm sorry, the AI assistant is not configured yet. In the meantime, try asking common questions — many are answered instantly from our built-in FAQ!",
          source: 'ai',
        },
      ])
      return
    }

    setIsTyping(true)
    try {
      const currentMessages = loadMessages()
      const history = currentMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)

      const contents = [
        ...history.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        { role: 'user', parts: [{ text: trimmed }] },
      ]

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: 'You are a helpful assistant for Waypoint, a DAEP (Disciplinary Alternative Education Program) management platform used by Texas school districts. Answer questions about DAEP procedures, TEA Chapter 37, compliance requirements, and how to use the platform. Never ask for or reference specific student names, IDs, or personal information. Keep answers concise and professional.',
                },
              ],
            },
            contents,
          }),
        }
      )

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        console.error('Gemini API error:', res.status, errBody)
        throw new Error(`Gemini request failed: ${res.status}`)
      }

      const data = await res.json()
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't generate a response. Please try rephrasing your question."

      setMessages((prev) => [...prev, { role: 'assistant', content: reply, source: 'ai' }])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'm sorry, I couldn't reach the AI service. Please try again, or tap one of the suggested questions for an instant answer.",
          source: 'ai',
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  return { messages, sendMessage, isTyping, clearChat }
}
