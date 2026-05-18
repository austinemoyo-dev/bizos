import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 20) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'AI insights not configured — add GROQ_API_KEY to .env.local' },
      { status: 503 },
    );
  }

  const {
    analytics,
    trend = [],
    vendors = [],
    payments = [],
    budget = 0,
    monthlySpent = 0,
  } = await req.json();

  const fmt = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;

  // Day-of-week breakdown from trend
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dowMap: Record<string, number> = {};
  DAYS.forEach((d) => { dowMap[d] = 0; });
  (trend as { date: string; total: number }[]).forEach((t) => {
    const d = DAYS[new Date(t.date + 'T00:00:00').getDay()];
    dowMap[d] = (dowMap[d] ?? 0) + Number(t.total);
  });
  const topDay = Object.entries(dowMap).sort((a, b) => b[1] - a[1])[0];

  const trendTotal = (trend as { total: number }[]).reduce((s, t) => s + Number(t.total), 0);
  const trendDays  = trend.length || 1;
  const trueAvg    = trendTotal / trendDays;

  const vendorLines = (vendors as { vendor_name: string; total_spent: number; total_meals: number; unpaid_amount: number }[])
    .map((v) => `  • ${v.vendor_name}: ${fmt(v.total_spent)} total, ${v.total_meals} meals, ${fmt(v.unpaid_amount)} owed`)
    .join('\n');

  const paymentCount = payments.length;
  const totalPaid    = (payments as { amount_paid: number }[]).reduce((s, p) => s + Number(p.amount_paid), 0);

  const budgetLine = budget > 0
    ? `Monthly budget: ${fmt(budget)} | Spent so far this month: ${fmt(monthlySpent)} | ${monthlySpent > budget ? `OVER by ${fmt(monthlySpent - budget)}` : `${fmt(budget - monthlySpent)} remaining`}`
    : 'No monthly budget set.';

  const dataContext = `
FOOD VENDOR SPENDING REPORT

SUMMARY (last 30 days)
  Weekly total:     ${fmt(analytics?.weekly_total ?? 0)}
  Monthly total:    ${fmt(analytics?.monthly_total ?? 0)}
  Daily average:    ${fmt(analytics?.daily_average ?? 0)} (computed avg: ${fmt(trueAvg)})
  Outstanding debt: ${fmt(analytics?.total_outstanding ?? 0)} across ${analytics?.unpaid_count ?? 0} credits
  Total ever paid:  ${fmt(analytics?.total_paid ?? 0)}
  Total credits:    ${analytics?.total_credits ?? 0}

BUDGET
  ${budgetLine}

VENDORS
${vendorLines || '  No vendor data'}

PAYMENT BEHAVIOUR
  ${paymentCount} payment batch${paymentCount !== 1 ? 'es' : ''} totalling ${fmt(totalPaid)}

DAY-OF-WEEK PATTERN
${Object.entries(dowMap).map(([d, a]) => `  ${d}: ${fmt(a)}`).join('\n')}
  Heaviest day: ${topDay ? `${topDay[0]} (${fmt(topDay[1])})` : 'N/A'}
`.trim();

  const systemPrompt = `You are a personal finance assistant for a Nigerian professional tracking food spending at local vendors.
Analyze their food credit data and respond in EXACTLY this format:

## Overview
Score: X/10. [One sentence on overall food spending health. Be direct about whether it's sustainable.]

## Patterns
- [emoji] [Specific spending pattern — cite exact amounts or days]
- [emoji] [Second pattern]
- [emoji] [Third pattern]

## Vendors
- [emoji] [Vendor insight — name the vendor, cite amount owed or spent]
- [emoji] [Second vendor insight]
- [emoji] [Third vendor insight, or general if fewer vendors]

## Budget
[2 sentences on budget situation. If no budget is set, strongly recommend setting one and suggest an amount based on the spending trend. If set, say whether they're on track.]

## Tips
1. [Specific, actionable tip tied to the numbers — name days, vendors, amounts]
2. [Second tip]
3. [Third tip]

Rules:
- Every figure must come from the provided data
- Nigerian context: ₦1,500–₦3,000 per meal is typical, ₦500/day is very frugal, ₦5,000+/day is high
- If outstanding debt is large (>₦10,000), flag it strongly
- If paying irregularly (few payment batches vs many credits), flag the habit
- No generic advice — always say WHICH vendor, WHICH day, or WHICH amount`;

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
      temperature: 0.55,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this food spending data:\n\n${dataContext}` },
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
      const reader  = groqRes.body!.getReader();
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
            const text   = parsed.choices?.[0]?.delta?.content;
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
