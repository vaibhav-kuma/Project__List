import './env.js'
import express from 'express'
import cors from 'cors'
import {
  createChatCompletion,
  getHealthInfo,
  mapProviderError,
  type ChatMessage,
} from './llm.js'

const app = express()
const PORT = 3001

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  }),
)
app.use(express.json({ limit: '2mb' }))

const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

app.post('/api/chat', async (req, res) => {
  const ip = req.ip || 'unknown'
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' })
  }

  const { messages, systemPrompt } = req.body as {
    messages: ChatMessage[]
    systemPrompt: string
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required.' })
  }

  try {
    const result = await createChatCompletion({ messages, systemPrompt })
    res.json({
      content: result.content,
      provider: result.provider,
      model: result.model,
    })
  } catch (err) {
    const { status, message } = mapProviderError(err)
    console.error('Chat API error:', message)
    res.status(status).json({ error: message })
  }
})

app.get('/api/health', (_req, res) => {
  res.json(getHealthInfo())
})

app.listen(PORT, () => {
  const health = getHealthInfo()
  console.log(`AEGIS API server running on http://localhost:${PORT}`)
  console.log(`  Provider: ${health.provider} (${health.model})`)
  console.log(`  API key configured: ${health.hasApiKey}`)
})
