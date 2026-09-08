import type { ChatMessage, ChatTurnResult, ToolCaller, McpTool } from '../types';

type OpenAiOptions = { baseUrl?: string; apiKey?: string; model: string; messages: ChatMessage[]; systemPrompt: string; tools: McpTool[]; callTool?: ToolCaller };

export async function runOpenAiCompatConversation(options: OpenAiOptions): Promise<ChatTurnResult> {
  if (!options.baseUrl) return { reply: 'ยังไม่ได้ตั้งค่า base URL ของ OpenAI-compatible gateway กรุณาตั้งค่า OPENAI_COMPAT_BASE_URL', toolTrace: [] };
  if (!options.apiKey) return { reply: 'ยังไม่ได้ตั้งค่า API key ของ provider นี้ กรุณาตั้งค่า secret ให้เรียบร้อย', toolTrace: [] };
  const messages: any[] = [{ role: 'system', content: options.systemPrompt }, ...options.messages];
  const url = `${options.baseUrl.replace(/\/$/, '')}/chat/completions`;
  for (let round = 0; round < 4; round++) {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${options.apiKey}` }, body: JSON.stringify({ model: options.model, messages }) });
    if (!response.ok) return { reply: `OpenAI-compatible provider ตอบกลับผิดพลาด (${response.status}) กรุณาตรวจสอบการตั้งค่าและลองใหม่`, toolTrace: [] };
    const data: any = await response.json();
    const choice = data.choices?.[0];
    if (choice?.message?.content) return { reply: choice.message.content, toolTrace: [] };
    const call = choice?.message?.tool_calls?.[0];
    if (!call || !options.callTool) return { reply: 'โมเดลไม่ได้ส่งข้อความตอบกลับที่อ่านได้', toolTrace: [] };
    const result = await options.callTool(call.function.name, JSON.parse(call.function.arguments || '{}'));
    messages.push(choice.message, { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
  }
  return { reply: 'การเรียกเครื่องมือใช้จำนวนรอบเกินกำหนด', toolTrace: [] };
}