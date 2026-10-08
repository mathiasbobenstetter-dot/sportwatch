import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Wir fragen Google News nur nach den groben Schlagwörtern...
    const rssUrl = "https://news.google.com/rss/search?q=Sport+Reportage+OR+Sport+Hintergrund&hl=de&gl=DE&ceid=DE:de";
    const response = await fetch(rssUrl, { next: { revalidate: 3600 } });
    const xmlText = await response.text();

    const items = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    // Fix 1: TypeScript Typisierung hinzugefügt
    const reads: any[] = []; 

    for (const item of items) {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      
      if (titleMatch && linkMatch) {
        // Fix 2: Der kaputte Regex (\vert) ist behoben
        const rawTitle = titleMatch[1].replace(/<!\[CDATA\[\vert{}\]\]>/g, "");
        
        // Fix 3: Wir filtern ungewollte Themen jetzt sicher hier im Code aus!
        const titleLower = rawTitle.toLowerCase();
        const isBanned = titleLower.includes("true crime") || 
                         titleLower.includes("mord") || 
                         titleLower.includes("politik") || 
                         titleLower.includes("liveticker") || 
                         titleLower.includes("ticker");
                         
        if (!isBanned) {
          const parts = rawTitle.split(" - "); 
          
          reads.push({
            id: `read-${Math.random()}`,
            title: parts[0]?.trim(),
            source: parts[1]?.trim() || "Magazin",
            link: linkMatch[1]
          });
        }
      }
      
      // Sobald wir 3 saubere Sport-Artikel gefunden haben, stoppen wir
      if (reads.length >= 3) break;
    }

    return NextResponse.json({ reads });
  } catch (error) {
    return NextResponse.json({ reads: [] });
  }
}