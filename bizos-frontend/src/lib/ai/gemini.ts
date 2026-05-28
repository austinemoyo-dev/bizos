'use client';

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Hard timeout — aborts the entire call if no response within 30 s
const CALL_TIMEOUT_MS = 30_000;

// Short retries for 429s; Groq free tier clears quickly
const RETRY_DELAYS = [4_000, 10_000, 20_000];

export type GeminiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function streamGemini(
  messages: GeminiMessage[],
  onChunk: (accumulated: string) => void,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<void> {
  const key = (process.env.NEXT_PUBLIC_GROQ_API_KEY ?? '').trim();
  if (!key) throw new Error('NEXT_PUBLIC_GROQ_API_KEY is not configured.');

  const timeout = new AbortController();
  const timer   = setTimeout(() => timeout.abort(), CALL_TIMEOUT_MS);

  try {
    let attempt = 0;
    while (true) {
      if (timeout.signal.aborted) throw new Error('Request timed out. Check your connection and try again.');

      let res: Response;
      try {
        res = await fetch(GROQ_URL, {
          method: 'POST',
          signal: timeout.signal,
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: GROQ_MODEL,
            stream: true,
            max_tokens: options.maxTokens ?? 900,
            temperature: options.temperature ?? 0.65,
            messages,
          }),
        });
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') throw new Error('Request timed out. Check your connection and try again.');
        throw new Error('Network error — check your connection.');
      }

      if (res.status === 429) {
        if (attempt >= RETRY_DELAYS.length) throw new Error('Rate limit reached — please wait a moment and try again.');
        await new Promise<void>((r) => {
          const t = setTimeout(r, RETRY_DELAYS[attempt++]);
          timeout.signal.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true });
        });
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`AI error ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
      }

      const reader = res.body!.getReader();
      const dec    = new TextDecoder();
      let   acc    = '';
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
          } catch { /* skip malformed chunk */ }
        }
      }
      return;
    }
  } finally {
    clearTimeout(timer);
  }
}
