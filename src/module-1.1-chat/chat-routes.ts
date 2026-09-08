import type { Env } from '../env';
import { errorJson, json } from '../lib/http';
import { runGeminiConversation } from './providers/gemini';
import { runOpenAiCompatConversation } from './providers/openai-compat';
import type { ChatMessage, ChatProvider, ChatTurnResult, McpTool } from './types';

type ChatRequest = { message: string; history?: ChatMessage[]; provider?: string; model?: string };

export function resolveProvider(value: string | undefined, env: Env): ChatProvider {
  const candidate = value || env.DEFAULT_CHAT_PROVIDER || 'gemini';
  return candidate === 'openai' || candidate === 'openai-compat' ? candidate : 'gemini';
}

export function defaultModelFor(provider: ChatProvider, env: Env): string {
  return provider === 'gemini' ? (env.GEMINI_MODEL || 'gemini-flash-latest') : provider === 'openai' ? (env.OPENAI_MODEL || 'gpt-4o-mini') : (env.OPENAI_COMPAT_MODEL || 'gpt-4o-mini');
}

export function buildSystemPrompt(): string {
  return 'คุณคือผู้ช่วย AI ของระบบ Workshop Agentic AI ตอบภาษาเดียวกับผู้ใช้ ให้คำตอบชัดเจน สุภาพ และกระชับ';
}

export function resolveTools(): McpTool[] { return []; }

export async function runChatTurn(message: string, history: ChatMessage[], provider: ChatProvider, model: string, env: Env): Promise<ChatTurnResult> {
  const messages = [...history, { role: 'user' as const, content: message }];
  const tools = resolveTools();
  if (provider === 'gemini') return runGeminiConversation({ apiKey: env.GEMINI_API_KEY, model, messages, systemPrompt: buildSystemPrompt(), tools });
  return runOpenAiCompatConversation({
    baseUrl: provider === 'openai' ? 'https://api.openai.com/v1' : env.OPENAI_COMPAT_BASE_URL,
    apiKey: provider === 'openai' ? env.OPENAI_API_KEY : env.OPENAI_COMPAT_API_KEY,
    model, messages, systemPrompt: buildSystemPrompt(), tools,
  });
}

export async function handleChatRoute(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return errorJson('รองรับเฉพาะ POST /api/chat', 405);
  let body: ChatRequest;
  try { body = await request.json() as ChatRequest; } catch { return errorJson('รูปแบบ JSON ไม่ถูกต้อง'); }
  if (!body || typeof body.message !== 'string' || !body.message.trim()) return errorJson('ต้องระบุ message เป็นข้อความที่ไม่ว่าง');
  const provider = resolveProvider(body.provider, env);
  const model = body.model?.trim() || defaultModelFor(provider, env);
  const history = Array.isArray(body.history) ? body.history.filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-30) : [];
  try {
    const result = await runChatTurn(body.message.trim(), history, provider, model, env);
    return json({ reply: result.reply, provider, model, toolTrace: result.toolTrace });
  } catch (error) {
    console.error('chat provider request failed', error);
    return json({ reply: 'เชื่อมต่อ provider ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าแล้วลองใหม่', provider, model, toolTrace: [] });
  }
}