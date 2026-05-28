import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 20)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!GEMINI_API_KEY)
    return NextResponse.json({ error: 'AI not configured — add GEMINI_API_KEY to .env.local' }, { status: 503 });

  const { summary, trend = [], expenseBreakdown = [], incomeBreakdown = [], period } = await req.json();

  const fmt = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;

  const totalIncome   = Number(summary?.total_income   ?? 0);
  const totalExpenses = Number(summary?.total_expenses ?? 0);
  const net           = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0';

  // Day-of-week spending pattern
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dowSpend: Record<string, number> = {};
  DAYS.forEach(d => { dowSpend[d] = 0; });
  (trend as { date: string; expenses: number }[]).forEach(t => {
    const d = DAYS[new Date(t.date + 'T00:00:00').getDay()];
    dowSpend[d] = (dowSpend[d] ?? 0) + Number(t.expenses);
  });
  const heaviestDay = Object.entries(dowSpend).sort((a, b) => b[1] - a[1])[0];
  const lightestDay = Object.entries(dowSpend).sort((a, b) => a[1] - b[1]).find(([, v]) => v > 0);

  const expLines = (expenseBreakdown as { category: string; amount: number }[])
    .map(e => `  • ${e.category}: ${fmt(e.amount)} (${totalExpenses > 0 ? ((e.amount/totalExpenses)*100).toFixed(0) : 0}%)`)
    .join('\n');

  const incLines = (incomeBreakdown as { category: string; amount: number }[])
    .map(i => `  • ${i.category}: ${fmt(i.amount)}`)
    .join('\n');

  const dataCtx = `
PERSONAL FINANCE SNAPSHOT — ${period ?? 'This Month'}

SUMMARY
  Income:        ${fmt(totalIncome)}
  Expenses:      ${fmt(totalExpenses)}
  Net (surplus/deficit): ${fmt(Math.abs(net))} ${net >= 0 ? 'SURPLUS' : 'DEFICIT'}
  Savings rate:  ${savingsRate}%

EXPENSE CATEGORIES
${expLines || '  No expense data'}

INCOME SOURCES
${incLines || '  No income data'}

DAILY SPENDING PATTERN (this period)
${Object.entries(dowSpend).map(([d, v]) => `  ${d}: ${fmt(v)}`).join('\n')}
  Heaviest day: ${heaviestDay ? `${heaviestDay[0]} (${fmt(heaviestDay[1])})` : 'N/A'}
  Lightest day: ${lightestDay ? `${lightestDay[0]} (${fmt(lightestDay[1])})` : 'N/A'}
`.trim();

  const systemPrompt = `You are an expert personal finance analyst for a Nigerian professional.
Analyze their financial data and respond in EXACTLY this format:

## Financial Health Score
Score: X/10. [One sharp sentence: are they saving enough, spending wisely, or in financial danger?]

## What the Numbers Say
- [emoji] [Specific insight from the data — cite exact amounts or percentages]
- [emoji] [Second insight — could be positive or a red flag]
- [emoji] [Third insight — spending pattern or income observation]

## Biggest Opportunity
[2 sentences. What ONE thing could they do differently to improve their finances the most? Be very specific — name the category, the amount, the action.]

## Spending Intelligence
- [emoji] [Day-of-week pattern insight — name the heaviest day and amount]
- [emoji] [Top expense category analysis — is it proportionate?]
- [emoji] [Income concentration risk or diversification note]

## 30-Day Action Plan
1. [Specific, measurable action — e.g. "Cap food spending at ₦X per week"]
2. [Second action tied to the data]
3. [Third action — savings or income related]

## Forecast
[2 sentences. If current patterns continue, what will their financial situation look like in 3 months? Give a specific projection using the data.]

Rules:
- Every claim must be backed by a number from the data
- Nigerian context: typical monthly salary ₦100,000–₦500,000; savings rate >20% is excellent, <10% is poor
- If expenses > income (deficit), treat it as urgent and say so directly
- Savings rate > 30% = excellent, 20-30% = good, 10-20% = needs work, < 10% = danger zone
- No generic advice — every tip must reference a specific category or amount`;

  const groqRes = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.0-flash-lite',
      stream: true, max_tokens: 800, temperature: 0.55,
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: `Analyse my personal finances:\n\n${dataCtx}` },
      ],
    }),
  });

  if (!groqRes.ok)
    return NextResponse.json({ error: await groqRes.text() }, { status: groqRes.status });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const dec    = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6).trim();
          if (d === '[DONE]') continue;
          try {
            const text = JSON.parse(d).choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch { /* skip */ }
        }
      }
      controller.close();
    },
  });

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
