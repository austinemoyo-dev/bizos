import { NextRequest } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 20) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!GEMINI_API_KEY) {
    return new Response('AI not configured — add GEMINI_API_KEY to .env.local', { status: 503 });
  }

  const { messages, businessContext } = await req.json();

  const systemPrompt = `You are Dash AI, the business intelligence assistant for Dash & Co., a phone repair and electronics shop in Nigeria.

You have access to the following live business data:

${businessContext}

Answer the owner's questions conversationally and specifically. Always reference actual numbers from the data above when relevant.
- Keep answers concise: 2–4 sentences for simple questions, up to 6 for complex ones
- Use Nigerian Naira (₦) for all amounts
- If asked about something not in the data, say so clearly and suggest what data would help
- Be direct and practical — this is a real business owner making real decisions
- Do not repeat the question back or add unnecessary preamble`;

  const groqRes = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.0-flash',
      stream: true,
      max_tokens: 450,
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages ?? []),
      ],
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return new Response(err, { status: groqRes.status });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch { /* skip malformed */ }
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
