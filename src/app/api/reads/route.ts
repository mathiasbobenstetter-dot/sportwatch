import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Sucht ausschließlich nach tiefgründigen Sport-Reportagen.
    // Schließt True Crime, Mord, Politik, Liveticker und kurze News explizit aus.
    const rssUrl = "https://news.google.com/rss/search?q=Sport+(Reportage+OR+Hintergrund+OR+%22Long+Read%22)+-%22True+Crime%22+-Mord+-Politik+-Liveticker+-Ticker&hl=de&gl=DE&ceid=DE:de";
    const response = await fetch(rssUrl, { next: { revalidate: 3600 } });
    const xmlText = await response.text();

    const items = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const reads = [];

    // Die besten 3 Artikel extrahieren
    for (let i = 0; i < Math.min(items.length, 3); i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      
      if (titleMatch && linkMatch) {
        const fullTitle = titleMatch[1].replace(/<!\[CDATA\[\vert{}\]\]>/g, "");
        const parts = fullTitle.split(" - "); // Trennt Titel und Magazin-Namen
        
        reads.push({
          id: `read-${i}`,
          title: parts[0]?.trim(),
          source: parts[1]?.trim() || "Magazin",
          link: linkMatch[1]
        });
      }
    }

    return NextResponse.json({ reads });
  } catch (error) {
    return NextResponse.json({ reads: [] });
  }
}