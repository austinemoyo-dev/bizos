import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 20) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI analytics not configured — add GROQ_API_KEY to .env.local' }, { status: 503 });
  }

  const body = await req.json();
  const {
    summary,
    prevSummary,
    expenseBreakdown,
    topItems,
    repairStats,
    periodLabel,
    prevPeriodLabel,
  } = body;

  // ── Build a rich data context ──────────────────────────────────────────────
  const fmt = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
  const pct = (cur: number, prev: number) => {
    if (!prev) return 'N/A';
    const diff = ((cur - prev) / Math.abs(prev)) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const curRev  = Number(summary?.total_revenue ?? 0);
  const curExp  = Number(summary?.total_expenses ?? 0);
  const curProfit = Number(summary?.net_profit ?? 0);
  const prevRev = Number(prevSummary?.total_revenue ?? 0);
  const prevExp = Number(prevSummary?.total_expenses ?? 0);
  const prevProfit = Number(prevSummary?.net_profit ?? 0);

  const topExpenses = (expenseBreakdown ?? [])
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 5)
    .map((e: any) => `${e.category.replace('_', ' ')} (${fmt(e.amount)}, ${e.percentage?.toFixed(1) ?? '?'}%)`)
    .join(', ');

  const topItemsStr = (topItems ?? [])
    .slice(0, 5)
    .map((i: any) => `${i.item_name}: ${fmt(i.total_revenue)} revenue, qty ${i.total_quantity}`)
    .join('; ');

  const repairStatsStr = (repairStats ?? [])
    .sort((a: any, b: any) => b.job_count - a.job_count)
    .map((r: any) => `${r.device_type}: ${r.job_count} jobs, ${fmt(r.total_revenue)}`)
    .join('; ');

  const pendingJobs = Number(summary?.pending_jobs ?? 0);
  const lowStock    = Number(summary?.low_stock_count ?? 0);
  const titheDue    = Number(summary?.tithe_due ?? 0);
  const cashBalance = Number(summary?.available_balance ?? 0);

  const dataContext = `
PERIOD: ${periodLabel} vs ${prevPeriodLabel}

REVENUE
  Current: ${fmt(curRev)} (${pct(curRev, prevRev)} vs prior)
  Previous: ${fmt(prevRev)}

EXPENSES
  Current: ${fmt(curExp)} (${pct(curExp, prevExp)} vs prior)
  Previous: ${fmt(prevExp)}
  Top categories: ${topExpenses || 'none'}

PROFIT
  Current: ${fmt(curProfit)} (${curProfit >= 0 ? 'profit' : 'LOSS'}) (${pct(curProfit, prevProfit)} vs prior)
  Previous: ${fmt(prevProfit)} (${prevProfit >= 0 ? 'profit' : 'loss'})

CASH
  Available balance: ${fmt(cashBalance)}
  Tithe due (unpaid): ${fmt(titheDue)}

OPERATIONAL
  Pending repair jobs: ${pendingJobs}
  Low stock items: ${lowStock}

TOP SELLING ITEMS
  ${topItemsStr || 'No data'}

REPAIR JOBS BY DEVICE
  ${repairStatsStr || 'No data'}
`.trim();

  const systemPrompt = `You are a sharp, direct business analyst for Dash & Co., a phone repair and hardware shop in Nigeria.
You analyze real business data and give specific, numbers-driven insights.

Respond in EXACTLY this format (use these section headers, nothing else):

## Health
One sentence: overall business health for this period in plain English. Include a score out of 10.

## Wins
- [3 bullet points of what went well, specific to the numbers. Start each bullet with an emoji.]

## Warnings
- [3 bullet points of concerns or risks, specific to the numbers. Start each bullet with an emoji.]

## Expenses
One sentence about the biggest expense pattern and whether it's concerning or expected.

## Next Actions
1. [First action item — specific, actionable, references actual data]
2. [Second action item]
3. [Third action item]

Rules:
- Every number you mention must come from the data provided.
- Be specific: name items, categories, and amounts.
- If profit is negative, treat it seriously — this is a real business.
- Nigerian Naira context: ₦50,000 is a typical day. ₦500,000+ month is strong.
- No generic advice like "review your expenses" — say WHICH expenses and WHY.
- If a prior period is N/A, note the lack of comparison data and focus on absolute performance.`;

  const groqRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      max_tokens: 700,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this business data:\n\n${dataContext}` },
      ],
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return NextResponse.json({ error: err }, { status: groqRes.status });
  }

  // Proxy SSE stream to client
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
