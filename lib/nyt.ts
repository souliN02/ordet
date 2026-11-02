/**
 * The English daily word is the same as that day's NYT Wordle. The Times has no
 * public API for it, only the JSON its own game loads, which can change or
 * disappear at any time. So every failure here is a null, and the caller falls
 * back to Ordet's own schedule. Server only: the browser can't call it (CORS).
 */

const ENDPOINT = "https://www.nytimes.com/svc/wordle/v2";

/** The solution from a response, if it looks like one */
export function parseNytSolution(data: unknown): string | null {
  const solution = typeof data === "object" && data !== null ? (data as { solution?: unknown }).solution : null;
  return typeof solution === "string" && /^[a-z]{5}$/i.test(solution) ? solution.toLowerCase() : null;
}

export async function fetchNytSolution(date: string): Promise<string | null> {
  try {
    // A date's answer never changes, so one request per date and day is plenty (Next's data cache)
    const res = await fetch(`${ENDPOINT}/${date}.json`, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(4_000) });
    return res.ok ? parseNytSolution(await res.json()) : null;
  } catch {
    return null;
  }
}
