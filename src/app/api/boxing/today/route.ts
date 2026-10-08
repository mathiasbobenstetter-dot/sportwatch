import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Wir nutzen einen Google News RSS-Feed, der spezifisch nach Boxkämpfen für "heute" sucht
    const rssUrl = "https://news.google.com/rss/search?q=boxing+fight+tonight+heavyweight+OR+title+OR+championship&hl=en-US&gl=US&ceid=US:en";
    
    // Fetch mit leichtem Cache (1 Stunde), um Google nicht zu überlasten
    const response = await fetch(rssUrl, { next: { revalidate: 3600 } });
    const xmlText = await response.text();

    const events = [];
    const today = new Date();
    
    // RSS <item> Blöcke per Regex extrahieren
    const items = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];

    for (const item of items) {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && pubDateMatch) {
        let title = titleMatch[1].replace(/<!\[CDATA\[\vert{}\]\]>/g, "");
        const pubDate = new Date(pubDateMatch[1]);
        
        // 1. Prüfen, ob die Meldung von heute ist
        const isToday = pubDate.toDateString() === today.toDateString();
        
        // 2. Filtern: Schwergewicht oder Titelkampf
        const titleLower = title.toLowerCase();
        const isHeavyweight = titleLower.includes("heavyweight");
        const isTitleFight = titleLower.match(/title|championship|wbc|wba|wbo|ibf/);
        
        // 3. Prüfen, ob es ein Kampf-Matchup ist (z.B. "Usyk vs Fury")
        const isFightMatchup = titleLower.includes(" vs ") || titleLower.includes(" vs. ");

        if (isToday && (isHeavyweight || isTitleFight) && isFightMatchup) {
           // Versuchen, die Namen rudimentär zu trennen
           const parts = title.split(/ vs\.? /i);
           const home = parts[0]?.trim().split(" ").slice(-2).join(" "); // Letzte 2 Wörter
           const away = parts[1]?.trim().split(" ").slice(0, 2).join(" "); // Erste 2 Wörter

           events.push({
            id: `box-${Math.random()}`,
            time: "Nacht", // Genaue Uhrzeiten sind im Feed schwer zu greifen
            sport: "🥊 Boxen",
            competition: isHeavyweight ? "Heavyweight Clash" : "Title Fight",
            homeTeam: home || "Boxer A",
            awayTeam: away || "Boxer B",
            details: "Titel- oder Schwergewichtskampf",
            bonusScore: 80, // Weit oben einordnen
            broadcasters: { de: ["DAZN / PPV"], usa: [], uk: [] }
          });
        }
      }
    }

    // Wir geben maximal 1 Event zurück, um Spam durch ähnliche News-Artikel zu vermeiden
    return NextResponse.json({ events: events.slice(0, 1) }); 
  } catch (error) {
    return NextResponse.json({ events: [] });
  }