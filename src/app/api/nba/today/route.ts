import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API Key fehlt" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const queryDate = searchParams.get("date");
  const targetDate = queryDate || new Date().toISOString().split("T")[0];

  try {
    const response = await fetch(
      `https://v1.basketball.api-sports.io/games?date=${targetDate}`,
      {
        headers: { "x-apisports-key": apiKey },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "API Fehler" }, { status: response.status });
    }

    const data = await response.json();

    // TÜRSTEHER: Nur NBA und NCAA durchlassen!
    const allowedGames = (data.response || []).filter((game: any) => {
      const leagueName = (game.league?.name || "").toLowerCase();
      return leagueName.includes("nba") || leagueName.includes("ncaa");
    });

    const events = allowedGames.map((game: any) => {
      let bonusScore = -10; 
      const stage = (game.stage || game.league?.type || "").toLowerCase();
      const leagueName = (game.league?.name || "").toLowerCase();
      
      const isPlayoff = stage.includes("playoff") || stage.includes("finals");
      const isMarchMadness = leagueName.includes("ncaa") || stage.includes("march madness");

      let timeStr = "";
      let isGoodTvTime = false;

      if (game.date) {
        const gameDate = new Date(game.date);
        timeStr = gameDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
        
        const hour = gameDate.getHours();
        isGoodTvTime = hour >= 18 && hour <= 23; 

        if (isMarchMadness) {
          bonusScore += 30; 
          if (isGoodTvTime) bonusScore += 40;
        } else if (isPlayoff) {
          bonusScore += 25; 
          if (isGoodTvTime) bonusScore += 50; 
        } else if (isGoodTvTime) {
          bonusScore += 15; 
        }
      }

      return {
        id: `bball-${game.id || Math.random()}`,
        time: timeStr,
        sport: isMarchMadness ? "🏀 NCAA" : "🏀 NBA",
        competition: isMarchMadness ? "March Madness" : "NBA",
        competitionLogo: game.league?.logo || (isMarchMadness ? "https://media.api-sports.io/basketball/leagues/116.png" : "https://media.api-sports.io/basketball/leagues/12.png"),
        homeTeam: game.teams?.home?.name || "Unbekannt",
        homeLogo: game.teams?.home?.logo,
        awayTeam: game.teams?.away?.name || "Unbekannt",
        awayLogo: game.teams?.away?.logo,
        details: game.stage || "",
        bonusScore,
        broadcasters: { 
          de: isMarchMadness ? ["ProSieben MAXX", "DAZN"] : ["DAZN", "ProSieben MAXX"], 
          usa: isMarchMadness ? ["CBS", "TBS", "TNT", "truTV"] : ["ESPN", "ABC", "TNT", "NBA TV"], 
          uk: isMarchMadness ? ["Sky Sports"] : ["TNT Sports"] 
        },
      };
    });

    return NextResponse.json({ date: targetDate, events });
  } catch (error: any) {
    return NextResponse.json({ error: "Server-Fehler", details: error.message }, { status: 500 });
  }
}