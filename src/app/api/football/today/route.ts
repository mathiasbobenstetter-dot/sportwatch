import { NextResponse } from "next/server";
import { ALLOWED_LEAGUE_IDS } from "@/data/competitions";
import { LEAGUE_BROADCASTERS } from "@/data/broadcasters";

// Cache für Tabellenstände (vermeidet unnötige API-Calls)
const standingsCache = new Map<number, Record<string, number>>();

async function getLeagueStandings(leagueId: number, apiKey: string): Promise<Record<string, number>> {
  if (standingsCache.has(leagueId)) {
    return standingsCache.get(leagueId)!;
  }

  const currentYear = new Date().getFullYear();
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${currentYear}`,
      {
        headers: { "x-apisports-key": apiKey },
        next: { revalidate: 86400 }, // 24-Stunden-Cache in Next.js
      }
    );

    if (!res.ok) return {};
    const data = await res.json();
    const standingsList = data.response?.[0]?.league?.standings?.[0] || [];

    const rankMap: Record<string, number> = {};
    standingsList.forEach((teamEntry: any) => {
      rankMap[teamEntry.team.name] = teamEntry.rank;
    });

    standingsCache.set(leagueId, rankMap);
    return rankMap;
  } catch (e) {
    return {};
  }
}

export async function GET(request: Request) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY wurde nicht gefunden." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const queryDate = searchParams.get("date");
  const targetDate = queryDate || new Date().toISOString().split("T")[0];

  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${targetDate}`,
      {
        headers: {
          "x-apisports-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "API-Football Anfrage fehlgeschlagen.", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    const filteredFixtures = (data.response || []).filter((item: any) =>
      ALLOWED_LEAGUE_IDS.has(item.league?.id)
    );

    // Tabellenstände für die heute aktiven Ligen laden
    const uniqueLeagueIds = Array.from(
      new Set(filteredFixtures.map((item: any) => item.league.id))
    ) as number[];

    const standingsByLeague: Record<number, Record<string, number>> = {};
    for (const lId of uniqueLeagueIds) {
      standingsByLeague[lId] = await getLeagueStandings(lId, apiKey);
    }

    const events = filteredFixtures.map((item: any) => {
      const leagueId = item.league?.id;
      const tvInfo = LEAGUE_BROADCASTERS[leagueId] || { de: [], usa: [], uk: [] };
      const standings = standingsByLeague[leagueId] || {};

      return {
        id: item.fixture.id,
        time: new Date(item.fixture.date).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Berlin",
        }),
        sport: "⚽",
        competition: item.league.name,
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeRank: standings[item.teams.home.name] || null,
        awayRank: standings[item.teams.away.name] || null,
        broadcasters: tvInfo,
      };
    });

    return NextResponse.json({
      date: targetDate,
      events,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Server-Fehler bei der Datenverarbeitung", details: error.message },
      { status: 500 }
    );
  }
}