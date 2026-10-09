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
      `https://v1.american-football.api-sports.io/games?date=${targetDate}`,
      {
        headers: { "x-apisports-key": apiKey },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "API Fehler" }, { status: response.status });
    }

    const data = await response.json();

    const events = (data.response || []).map((game: any) => {
      let bonusScore = 0;
      const stage = (game.game?.stage || "").toLowerCase();
      const leagueName = (game.league?.name || "").toLowerCase();
      
      const isCollege = leagueName.includes("ncaa") || leagueName.includes("college");

      if (stage.includes("super bowl") || stage.includes("national championship")) bonusScore = 100;
      else if (stage.includes("playoff") || stage.includes("bowl")) bonusScore = 50;

      let timeStr = "";
      if (game.game?.date?.date) {
        const gameDate = new Date(game.game.date.date);
        timeStr = gameDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
        
        const hour = gameDate.getHours();
        if (hour >= 18 && hour <= 23) {
          bonusScore += 20; 
        }
      }

      return {
        id: `am-fb-${game.game?.id || Math.random()}`,
        time: timeStr,
        sport: isCollege ? "🏈 NCAA" : "🏈 NFL",
        competition: isCollege ? "NCAA Football" : "NFL",
        competitionLogo: game.league?.logo || (isCollege ? "https://media.api-sports.io/american-football/leagues/2.png" : "https://media.api-sports.io/american-football/leagues/1.png"),
        homeTeam: game.teams?.home?.name || "Unbekannt",
        homeLogo: game.teams?.home?.logo,
        awayTeam: game.teams?.away?.name || "Unbekannt",
        awayLogo: game.teams?.away?.logo,
        details: game.game?.stage || "",
        bonusScore,
        broadcasters: {
          de: isCollege ? ["ProSieben MAXX", "DAZN"] : ["RTL", "DAZN", "Prime Video"], 
          usa: isCollege ? ["ESPN", "ABC", "FOX", "CBS"] : ["CBS", "FOX", "NBC", "ESPN", "Prime Video"],
          uk: ["Sky Sports"],
        },
      };
    });

    return NextResponse.json({ date: targetDate, events });
  } catch (error: any) {
    return NextResponse.json({ error: "Server-Fehler", details: error.message }, { status: 500 });
  }
}