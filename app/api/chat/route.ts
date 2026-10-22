import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not set.' }, { status: 503 });

  const { systemPrompt, messages } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });

  // Convert OpenAI-style messages to Gemini format (user/model roles)
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt || 'You are a helpful assistant.' }] },
          contents,
          generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || `Gemini error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return NextResponse.json({ result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
