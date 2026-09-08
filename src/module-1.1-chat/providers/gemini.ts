import type { ChatMessage, ChatTurnResult, ToolCaller, McpTool } from '../types';

type GeminiOptions = { apiKey?: string; model: string; messages: ChatMessage[]; systemPrompt: string; tools: McpTool[]; callTool?: ToolCaller };

export async function runGeminiConversation(options: GeminiOptions): Promise<ChatTurnResult> {
  if (!options.apiKey) return { reply: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY กรุณาตั้งค่า secret ก่อนใช้งาน Gemini', toolTrace: [] };
  const contents = options.messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  for (let round = 0; round < 4; round++) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: options.systemPrompt }] }, contents }),
    });
    if (!response.ok) return { reply: `Gemini ตอบกลับผิดพลาด (${response.status}) กรุณาตรวจสอบการตั้งค่าและลองใหม่`, toolTrace: [] };
    const data: any = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((part: any) => typeof part.text === 'string').map((part: any) => part.text).join('');
    if (text) return { reply: text, toolTrace: [] };
    const call = parts.find((part: any) => part.functionCall);
    if (!call || !options.callTool) return { reply: 'โมเดลไม่ได้ส่งข้อความตอบกลับที่อ่านได้', toolTrace: [] };
    const result = await options.callTool(call.functionCall.name, call.functionCall.args ?? {});
    contents.push({ role: 'model', parts } as { role: 'model'; parts: unknown[] });
    contents.push({ role: 'user', parts: [{ text: JSON.stringify(result) }] });
  }
  return { reply: 'การเรียกเครื่องมือใช้จำนวนรอบเกินกำหนด', toolTrace: [] };
}