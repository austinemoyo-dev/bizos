import { NextRequest, NextResponse } from 'next/server';

// Gemini 2.0 Flash (preferred — free, higher quality)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL     = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// Groq (fallback — free, fast)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 20)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!GEMINI_API_KEY && !GROQ_API_KEY)
    return NextResponse.json({ error: 'AI not configured — add GEMINI_API_KEY (recommended) or GROQ_API_KEY to .env.local' }, { status: 503 });

  const useGemini = !!GEMINI_API_KEY;
  const AI_URL    = useGemini ? GEMINI_URL : GROQ_URL;
  const AI_KEY    = useGemini ? GEMINI_API_KEY! : GROQ_API_KEY!;
  const AI_MODEL  = useGemini ? 'gemini-2.0-flash' : 'llama-3.3-70b-versatile';

  const {
    credits  = [],
    analytics,
    vendors  = [],
    trend    = [],
    budget   = 0,
    monthlySpent = 0,
  } = await req.json();

  const fmt = (n: number) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ── Meal-type breakdown ────────────────────────────────────────
  type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown';
  const typeMap: Record<MealType, { count: number; total: number }> = {
    breakfast: { count: 0, total: 0 },
    lunch:     { count: 0, total: 0 },
    dinner:    { count: 0, total: 0 },
    snack:     { count: 0, total: 0 },
    unknown:   { count: 0, total: 0 },
  };
  (credits as { meal_type?: string; amount: number }[]).forEach((c) => {
    const t = (c.meal_type ?? 'unknown') as MealType;
    const bucket = typeMap[t] ?? typeMap.unknown;
    bucket.count++;
    bucket.total += Number(c.amount);
  });
  const mealLines = Object.entries(typeMap)
    .filter(([, v]) => v.count > 0)
    .map(([k, v]) => `  • ${k}: ${v.count} meals, ${fmt(v.total)} total, avg ${fmt(v.total / v.count)}`)
    .join('\n');

  // ── Day-of-week breakdown ─────────────────────────────────────
  const dowMap: Record<string, number> = {};
  DAYS.forEach((d) => { dowMap[d] = 0; });
  (trend as { date: string; total: number }[]).forEach((t) => {
    const d = DAYS[new Date(t.date + 'T00:00:00').getDay()];
    dowMap[d] = (dowMap[d] ?? 0) + Number(t.total);
  });
  const topDay  = Object.entries(dowMap).sort((a, b) => b[1] - a[1])[0];
  const lightDay = Object.entries(dowMap).sort((a, b) => a[1] - b[1]).find(([, v]) => v > 0);

  // ── Breakfast skip detection ──────────────────────────────────
  const breakfastRate = credits.length
    ? Math.round((typeMap.breakfast.count / credits.length) * 100)
    : 0;

  // ── Top vendor ────────────────────────────────────────────────
  const topVendor = (vendors as { vendor_name: string; total_spent: number; total_meals: number }[])
    .sort((a, b) => b.total_spent - a.total_spent)[0];

  // ── Predictions based on today's day ─────────────────────────
  const todayName = DAYS[new Date().getDay()];
  const todaySpend = dowMap[todayName] ?? 0;
  const avgDailySpend = analytics?.daily_average ?? 0;

  const dataContext = `
PATIENT FOOD & MEAL PROFILE

TODAY: ${todayName}

MEAL TYPE BREAKDOWN (all recorded meals)
${mealLines || '  No meal type data recorded'}
  Breakfast skip rate: ${100 - breakfastRate}% of days have no breakfast

DAILY SPENDING BY DAY OF WEEK (last 30 days)
${Object.entries(dowMap).map(([d, a]) => `  ${d}: ${fmt(a)}`).join('\n')}
  Heaviest day: ${topDay ? `${topDay[0]} (${fmt(topDay[1])})` : 'N/A'}
  Lightest day: ${lightDay ? `${lightDay[0]} (${fmt(lightDay[1])})` : 'N/A'}

VENDOR HABITS
${(vendors as { vendor_name: string; total_spent: number; total_meals: number; unpaid_amount: number }[])
    .map(v => `  • ${v.vendor_name}: ${v.total_meals} meals, ${fmt(v.total_spent)} spent, ${fmt(v.unpaid_amount)} owed`)
    .join('\n') || '  No vendor data'}

SUMMARY STATS
  Weekly total:       ${fmt(analytics?.weekly_total ?? 0)}
  Monthly total:      ${fmt(analytics?.monthly_total ?? 0)}
  Daily average:      ${fmt(avgDailySpend)}
  Outstanding debt:   ${fmt(analytics?.total_outstanding ?? 0)} (${analytics?.unpaid_count ?? 0} unpaid credits)
  ${budget > 0 ? `Monthly budget: ${fmt(budget)} | Spent: ${fmt(monthlySpent)} | ${monthlySpent > budget ? `OVER by ${fmt(monthlySpent - budget)}` : `${fmt(budget - monthlySpent)} left`}` : 'No budget set'}

TODAY PREDICTION BASIS
  Typical ${todayName} spend: ${fmt(todaySpend / Math.ceil(trend.length / 7 || 1))}
  Your most frequent vendor: ${topVendor?.vendor_name ?? 'unknown'}
`.trim();

  const systemPrompt = `You are a personal food doctor and nutrition advisor for a Nigerian professional. You have access to their complete food spending and meal pattern data. Respond as a caring but direct doctor who knows this person's habits well.

Respond in EXACTLY this format:

## Health Score
Score: X/10. [One direct sentence on their overall food health based on meal balance and spending. Be honest — skipping breakfast is bad, heavy dinners are bad, irregular eating is bad.]

## Your Patterns (What I See)
- [emoji] [Specific pattern about meal types — cite actual numbers, e.g. "You skip breakfast 60% of the time"]
- [emoji] [Specific spending/timing pattern — cite a day or vendor by name]
- [emoji] [Third pattern — could be positive or concerning]

## Doctor's Diagnosis
[2–3 sentences. What do these patterns mean for your health and energy? Be specific about implications of skipping meals, eating heavy at certain times, or vendor dependency.]

## Prediction for Today (${todayName})
[2 sentences. Based on their ${todayName} pattern, predict: (1) which vendor they're likely to eat from, (2) approximately how much they'll spend, (3) which meal type they might skip.]

## Treatment Plan (This Week)
1. [Specific action tied to their data — name the vendor, meal type, or day]
2. [Second action]
3. [Third action — could be about paying debt or setting a budget]

Rules:
- Always reference actual numbers, days, or vendor names from the data
- Nigerian food context: typical daily healthy food budget is ₦2,000–₦4,000
- Skipping breakfast is a major health red flag — call it out directly if present
- Heavy dinner spending (>50% of daily food budget) may indicate poor meal balance
- If outstanding debt > ₦10,000, treat it as financial stress that affects eating habits
- The prediction section MUST be specific to today (${todayName})`;

  const aiRes = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       AI_MODEL,
      stream:      true,
      max_tokens:  900,
      temperature: 0.65,
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: `Analyze my food health data:\n\n${dataContext}` },
      ],
    }),
  });

  if (!aiRes.ok)
    return NextResponse.json({ error: await aiRes.text() }, { status: aiRes.status });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader  = aiRes.body!.getReader();
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
            const text = JSON.parse(data).choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch { /* skip */ }
        }
      }
      controller.close();
    },
  });

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
