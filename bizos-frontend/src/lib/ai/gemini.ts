'use client';

// Gemini 2.0 Flash Lite — 30 RPM free tier (2× the standard Flash limit)
const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GEMINI_MODEL = 'gemini-2.0-flash-lite';

// Per-call timeout: if no final response within 30 s, abort and surface an error.
const CALL_TIMEOUT_MS = 30_000;

// Retry delays on 429 — kept short so the spinner doesn't appear frozen.
// gemini-2.0-flash-lite has a 30 RPM quota; brief waits usually clear it.
const RETRY_DELAYS = [5_000, 12_000, 22_000]; // max 3 retries ≈ 39 s total

export type GeminiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// Light semaphore: at most 2 concurrent calls so we don't blast the quota,
// but a stuck/retrying call doesn't freeze every other component.
let inflight = 0;
const MAX_CONCURRENT = 2;
const waiters: (() => void)[] = [];

function acquire(): Promise<void> {
  if (inflight < MAX_CONCURRENT) { inflight++; return Promise.resolve(); }
  return new Promise(resolve => waiters.push(() => { inflight++; resolve(); }));
}

function release() {
  inflight--;
  const next = waiters.shift();
  if (next) next();
}

async function _doStream(
  messages: GeminiMessage[],
  onChunk: (accumulated: string) => void,
  options: { maxTokens?: number; temperature?: number },
): Promise<void> {
  const key = (process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '').trim();
  if (!key) throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not configured.');

  // Hard timeout — aborts the entire call including retries
  const timeout = new AbortController();
  const timer   = setTimeout(() => timeout.abort(), CALL_TIMEOUT_MS);

  try {
    let attempt = 0;
    while (true) {
      if (timeout.signal.aborted) throw new Error('AI request timed out. Check your connection and try again.');

      let res: Response;
      try {
        res = await fetch(GEMINI_URL, {
          method: 'POST',
          signal: timeout.signal,
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: GEMINI_MODEL,
            stream: true,
            max_tokens: options.maxTokens ?? 900,
            temperature: options.temperature ?? 0.65,
            messages,
          }),
        });
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') throw new Error('AI request timed out. Check your connection and try again.');
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

/**
 * Stream a Gemini response.
 * Max 2 concurrent calls — subsequent callers queue briefly rather than
 * all hammering the API at once, without one stuck call blocking everyone.
 */
export async function streamGemini(
  messages: GeminiMessage[],
  onChunk: (accumulated: string) => void,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<void> {
  await acquire();
  try {
    await _doStream(messages, onChunk, options);
  } finally {
    release();
  }
}
