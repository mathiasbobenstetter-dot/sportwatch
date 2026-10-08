import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rssUrl = "https://news.google.com/rss/search?q=boxing+fight+tonight+heavyweight+OR+title+OR+championship&hl=en-US&gl=US&ceid=US:en";
    
    const response = await fetch(rssUrl, { next: { revalidate: 3600 } });
    const xmlText = await response.text();

    // HIER IST DER FIX: : any[] sagt TypeScript, dass es eine Liste ist
    const events: any[] = []; 
    const today = new Date();
    
    const items = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const item of items) {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && pubDateMatch) {
        let title = titleMatch[1].replace(/<!\[CDATA\[\vert{}\]\]>/g, "");
        const pubDate = new Date(pubDateMatch[1]);
        
        const isToday = pubDate.toDateString() === today.toDateString();
        
        const titleLower = title.toLowerCase();
        const isHeavyweight = titleLower.includes("heavyweight");
        const isTitleFight = titleLower.match(/title|championship|wbc|wba|wbo|ibf/);
        
        const isFightMatchup = titleLower.includes(" vs ") || titleLower.includes(" vs. ");

        if (isToday && (isHeavyweight || isTitleFight) && isFightMatchup) {
           const parts = title.split(/ vs\.? /i);
           const home = parts[0]?.trim().split(" ").slice(-2).join(" ");
           const away = parts[1]?.trim().split(" ").slice(0, 2).join(" "); 

           events.push({
            id: `box-${Math.random()}`,
            time: "Nacht",
            sport: "🥊 Boxen",
            competition: isHeavyweight ? "Heavyweight Clash" : "Title Fight",
            homeTeam: home || "Boxer A",
            awayTeam: away || "Boxer B",
            details: "Titel- oder Schwergewichtskampf",
            bonusScore: 80, 
            broadcasters: { de: ["DAZN / PPV"], usa: [], uk: [] }
          });
        }
      }
    }

    return NextResponse.json({ events: events.slice(0, 1) }); 
  } catch (error) {
    return NextResponse.json({ events: [] });
  }
}