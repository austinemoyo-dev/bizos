import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 20) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'AI analytics not configured — add GROQ_API_KEY to .env.local' },
      { status: 503 },
    );
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

  // ── Build rich data context ──────────────────────────────────────────────
  const fmt = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
  const pct = (cur: number, prev: number) => {
    if (!prev) return 'N/A';
    const diff = ((cur - prev) / Math.abs(prev)) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const curRev    = Number(summary?.total_revenue    ?? 0);
  const curExp    = Number(summary?.total_expenses   ?? 0);
  const curProfit = Number(summary?.net_profit       ?? 0);
  const prevRev   = Number(prevSummary?.total_revenue    ?? 0);
  const prevExp   = Number(prevSummary?.total_expenses   ?? 0);
  const prevProfit= Number(prevSummary?.net_profit       ?? 0);
  const cashBal   = Number(summary?.available_balance ?? 0);
  const titheDue  = Number(summary?.tithe_due         ?? 0);
  const pending   = Number(summary?.pending_jobs      ?? 0);
  const lowStock  = Number(summary?.low_stock_count   ?? 0);

  const topExpenses = (expenseBreakdown ?? [])
    .sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount)
    .slice(0, 5)
    .map((e: { category: string; amount: number; percentage?: number }) =>
      `${e.category.replace(/_/g, ' ')} (${fmt(e.amount)}, ${e.percentage?.toFixed(1) ?? '?'}%)`)
    .join(', ');

  const topItemsStr = (topItems ?? [])
    .slice(0, 5)
    .map((i: { item_name: string; total_revenue: number; total_quantity: number }) =>
      `${i.item_name}: ${fmt(i.total_revenue)} revenue, qty ${i.total_quantity}`)
    .join('; ');

  const repairStatsStr = (repairStats ?? [])
    .sort((a: { job_count: number }, b: { job_count: number }) => b.job_count - a.job_count)
    .map((r: { device_type: string; job_count: number; total_revenue: number }) =>
      `${r.device_type}: ${r.job_count} jobs, ${fmt(r.total_revenue)}`)
    .join('; ');

  const marginPct = curRev > 0 ? ((curProfit / curRev) * 100).toFixed(1) : '0';
  const prevMarginPct = prevRev > 0 ? ((prevProfit / prevRev) * 100).toFixed(1) : '0';

  const dataContext = `
PERIOD: ${periodLabel} vs ${prevPeriodLabel}

REVENUE
  Current:  ${fmt(curRev)} (${pct(curRev, prevRev)} vs prior)
  Previous: ${fmt(prevRev)}

EXPENSES
  Current:  ${fmt(curExp)} (${pct(curExp, prevExp)} vs prior)
  Previous: ${fmt(prevExp)}
  Top categories: ${topExpenses || 'none'}

PROFIT
  Current:  ${fmt(curProfit)} — ${curProfit >= 0 ? 'PROFIT' : 'LOSS'} (${pct(curProfit, prevProfit)} vs prior)
  Previous: ${fmt(prevProfit)} — ${prevProfit >= 0 ? 'profit' : 'loss'}
  Margin:   ${marginPct}% current vs ${prevMarginPct}% previous

CASH POSITION
  Available balance:  ${fmt(cashBal)}
  Tithe due (unpaid): ${fmt(titheDue)}

OPERATIONS
  Pending repair jobs: ${pending}
  Low stock items:     ${lowStock}

TOP SELLING ITEMS
  ${topItemsStr || 'No data'}

REPAIR JOBS BY DEVICE
  ${repairStatsStr || 'No data'}
`.trim();

  const systemPrompt = `You are Dash AI, the business intelligence engine for Dash & Co., a phone repair and electronics shop in Nigeria. You analyze real financial data and speak directly to the owner.

Respond in EXACTLY this format — use ONLY these section headers, in this order:

## Health
Score: X/10. [One clear sentence on overall business health for this period. Be direct.]

## Wins
- [emoji] [What went well, specific to the data — name exact amounts]
- [emoji] [Second win]
- [emoji] [Third win]

## Warnings
- [emoji] [Risk or concern, tied to actual numbers]
- [emoji] [Second warning]
- [emoji] [Third warning]

## Expenses
[One or two sentences on the biggest expense pattern. Name the category and amount. Say whether it's alarming or expected.]

## Forecast
[2-3 sentences predicting next period based on the current trend. Be specific — project an approximate revenue and profit figure. Use the margin % and growth rate to reason forward. If data is insufficient, say so and give a range.]

## Next Actions
1. [Specific action tied to the numbers — name items, amounts, categories]
2. [Second action]
3. [Third action]

Rules:
- Every number you cite must come from the provided data
- Nigerian Naira context: ₦50k is a typical day, ₦500k+ month is strong, ₦1M+ is excellent
- If profit is negative, treat it as a crisis — be blunt
- For forecast: extrapolate from current trend vs prior period. If this week is up 20%, project next week will be in a similar range unless you see a reason otherwise
- No generic advice ("review your expenses") — always say WHICH and WHY
- If prior period data is missing (N/A), note it and focus on absolute performance`;

  const groqRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      max_tokens: 900,
      temperature: 0.55,
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
          } catch { /* skip malformed chunks */ }
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
