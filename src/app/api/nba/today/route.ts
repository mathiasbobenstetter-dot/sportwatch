import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API Key nicht konfiguriert." }, { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().getMonth() + 1; // 1 = Januar, 3 = März

  try {
    // Liga 12 = NBA, Liga 116 = NCAA (College Basketball)
    const [nbaRes, ncaaRes] = await Promise.all([
      fetch(`https://v1.basketball.api-sports.io/games?date=${today}&league=12`, { 
        headers: { "x-apisports-key": apiKey }, next: { revalidate: 300 } 
      }),
      fetch(`https://v1.basketball.api-sports.io/games?date=${today}&league=116`, { 
        headers: { "x-apisports-key": apiKey }, next: { revalidate: 300 } 
      })
    ]);

    const nbaData = nbaRes.ok ? await nbaRes.json() : { response: [] };
    const ncaaData = ncaaRes.ok ? await ncaaRes.json() : { response: [] };

    let allGames = [...(nbaData.response || [])];

    // March Madness: Zieht College Basketball im März und April automatisch mit rein
    if (currentMonth === 3 || currentMonth === 4) {
      allGames = [...allGames, ...(ncaaData.response || [])];
    }

    return NextResponse.json({ response: allGames });
  } catch (error) {
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}