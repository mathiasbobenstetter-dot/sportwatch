import { NextResponse } from "next/server";
import { CYCLING_CALENDAR } from "@/data/cycling";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryDate = searchParams.get("date");
  const targetDate = queryDate || new Date().toISOString().split("T")[0];

  // Prüft, ob heute ein Rennen aus dem Kalender aktiv ist
  const activeEvents = CYCLING_CALENDAR.filter(
    (event) => targetDate >= event.startDate && targetDate <= event.endDate
  ).map((event) => ({
    id: event.id,
    sport: "🚴",
    competition: event.name,
    category: event.category,
    details: event.stageOrDetails,
    broadcasters: event.broadcasters,
  }));

  return NextResponse.json({
    date: targetDate,
    events: activeEvents,
  });
}