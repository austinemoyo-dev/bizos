import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not set in .env.local' }, { status: 500 });
  }

  const body = await req.json();
  const { summary, period } = body;

  const dataContext = `
BUSINESS DATA (${period ?? 'This Month'}):
- Revenue: ₦${Number(summary?.total_revenue ?? 0).toLocaleString()}
- Expenses: ₦${Number(summary?.total_expenses ?? 0).toLocaleString()}
- Net Profit: ₦${Number(summary?.net_profit ?? 0).toLocaleString()}
- Available Balance: ₦${Number(summary?.available_balance ?? 0).toLocaleString()}
- Tithe Due: ₦${Number(summary?.tithe_due ?? 0).toLocaleString()}
- Pending Repair Jobs: ${summary?.pending_jobs ?? 0}
- Low Stock Items: ${summary?.low_stock_count ?? 0}
`.trim();

  const groqRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are a sharp business analyst for Dash & Co., a phone repair and hardware shop in Nigeria.
Analyze the business data and respond with exactly 4 bullet points.
Each bullet:
- Starts with a relevant emoji
- Is under 18 words
- Is specific and actionable (not generic)
- Focuses on what the owner should DO
Respond ONLY with the 4 bullet points. No intro, no conclusion, no headers.`,
        },
        {
          role: 'user',
          content: `Give 4 actionable insights from this data:\n\n${dataContext}`,
        },
      ],
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return NextResponse.json({ error: err }, { status: groqRes.status });
  }

  // Proxy the SSE stream from Groq to the client
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // skip malformed chunks
          }
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
