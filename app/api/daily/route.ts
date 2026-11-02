import { NextResponse } from "next/server";
import { ANSWERS } from "@/data/words/en";
import { dailyAnswer, dayNumber, isNearToday } from "@/lib/daily";
import { fetchNytSolution } from "@/lib/nyt";

/**
 * GET /api/daily?date=YYYY-MM-DD: the English daily word for the player's local date.
 * Danish has no shared daily word to follow, so the browser picks it from the list itself.
 */
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isNearToday(date, Date.now())) {
    return NextResponse.json({ error: "date must be today's date as YYYY-MM-DD" }, { status: 400 });
  }
  const day = dayNumber(date);
  const nyt = await fetchNytSolution(date);
  return NextResponse.json(
    { date, day, solution: nyt ?? dailyAnswer(ANSWERS, day), source: nyt ? "nyt" : "ordet" },
    // A fallback is cached briefly, so the real word takes over once the Times answers again
    { headers: { "Cache-Control": nyt ? "public, max-age=3600, s-maxage=86400" : "public, max-age=60, s-maxage=300" } },
  );
}
