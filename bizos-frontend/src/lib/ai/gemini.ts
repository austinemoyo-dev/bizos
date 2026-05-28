'use client';

// Direct client-side Gemini streaming — works in Capacitor (no server needed)
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// Exponential backoff delays for 429 responses (ms)
const RETRY_DELAYS = [10_000, 20_000, 40_000, 60_000, 60_000];

export type GeminiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// Global serial queue — ensures only one Gemini request runs at a time,
// preventing concurrent callers from stacking up and burning through RPM quota.
let queue = Promise.resolve();

async function _doStream(
  messages: GeminiMessage[],
  onChunk: (accumulated: string) => void,
  options: { maxTokens?: number; temperature?: number },
): Promise<void> {
  const key = (process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '').trim();
  if (!key) throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not configured.');

  let attempt = 0;
  while (true) {
    let res: Response;
    try {
      res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          stream: true,
          max_tokens: options.maxTokens ?? 900,
          temperature: options.temperature ?? 0.65,
          messages,
        }),
      });
    } catch {
      throw new Error('Network error — check your connection.');
    }

    if (res.status === 429) {
      if (attempt >= RETRY_DELAYS.length) throw new Error('AI rate limit reached. Please wait a minute and try again.');
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt++]));
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`AI error ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
    }

    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let acc = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim();
        if (d === '[DONE]') continue;
        try {
          const t = JSON.parse(d).choices?.[0]?.delta?.content;
          if (t) { acc += t; onChunk(acc); }
        } catch { /* skip malformed */ }
      }
    }
    return;
  }
}

/**
 * Stream a Gemini response directly from the browser.
 * Requests are serialized globally — concurrent callers queue up rather than
 * firing in parallel, which prevents hitting the Gemini RPM rate limit.
 */
export function streamGemini(
  messages: GeminiMessage[],
  onChunk: (accumulated: string) => void,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<void> {
  const myTurn = queue.then(() => _doStream(messages, onChunk, options));
  // Errors must not break the chain for subsequent callers
  queue = myTurn.catch(() => {});
  return myTurn;
}
