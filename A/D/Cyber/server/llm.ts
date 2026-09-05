import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export type AIProvider = 'anthropic' | 'openai'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCompletionRequest {
  messages: ChatMessage[]
  systemPrompt: string
}

export interface ChatCompletionResult {
  content: string
  provider: AIProvider
  model: string
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o',
}

export function getProvider(): AIProvider {
  const raw = (process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  if (raw === 'openai') return 'openai'
  return 'anthropic'
}

export function getModel(provider: AIProvider): string {
  if (provider === 'openai') {
    return process.env.OPENAI_MODEL || DEFAULT_MODELS.openai
  }
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic
}

function getApiKey(provider: AIProvider): string {
  const key =
    provider === 'openai'
      ? process.env.OPENAI_API_KEY?.trim()
      : process.env.ANTHROPIC_API_KEY?.trim()
  return key || ''
}

function validateApiKey(provider: AIProvider): string | null {
  const key = getApiKey(provider)
  if (!key) {
    const varName = provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'
    return `${varName} is not configured. Copy .env.example to .env and add your key.`
  }
  if (provider === 'anthropic' && !key.startsWith('sk-ant-')) {
    return 'ANTHROPIC_API_KEY appears invalid. Anthropic keys start with sk-ant-. Get one at console.anthropic.com.'
  }
  if (provider === 'openai' && !key.startsWith('sk-')) {
    return 'OPENAI_API_KEY appears invalid. OpenAI keys start with sk-. Get one at platform.openai.com.'
  }
  return null
}

async function completeWithAnthropic(
  request: ChatCompletionRequest,
  model: string,
): Promise<string> {
  const client = new Anthropic({ apiKey: getApiKey('anthropic') })

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system:
      request.systemPrompt ||
      'You are AEGIS (Advanced Expert Guardian of Information Systems), an elite cybersecurity AI agent.',
    messages: request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text : 'No response generated.'
}

async function completeWithOpenAI(
  request: ChatCompletionRequest,
  model: string,
): Promise<string> {
  const client = new OpenAI({ apiKey: getApiKey('openai') })

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          request.systemPrompt ||
          'You are AEGIS (Advanced Expert Guardian of Information Systems), an elite cybersecurity AI agent.',
      },
      ...request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ],
    temperature: 0.7,
    max_tokens: 4096,
  })

  return completion.choices[0]?.message?.content || 'No response generated.'
}

export async function createChatCompletion(
  request: ChatCompletionRequest,
): Promise<ChatCompletionResult> {
  const provider = getProvider()
  const model = getModel(provider)

  const keyError = validateApiKey(provider)
  if (keyError) throw new ProviderConfigError(keyError)

  const content =
    provider === 'openai'
      ? await completeWithOpenAI(request, model)
      : await completeWithAnthropic(request, model)

  return { content, provider, model }
}

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderConfigError'
  }
}

export function mapProviderError(err: unknown): { status: number; message: string } {
  const message = err instanceof Error ? err.message : 'LLM API error'

  if (err instanceof ProviderConfigError) {
    return { status: 500, message }
  }
  if (message.includes('401') || message.includes('authentication') || message.includes('invalid x-api-key')) {
    return { status: 401, message: 'Invalid API key for the configured provider.' }
  }
  if (message.includes('429') || message.includes('rate_limit')) {
    return { status: 429, message: 'Provider rate limit reached. Try again shortly.' }
  }
  return { status: 500, message }
}

export function getHealthInfo() {
  const provider = getProvider()
  const model = getModel(provider)
  return {
    status: 'ok',
    provider,
    model,
    hasApiKey: !!getApiKey(provider),
  }
}
