"use client";

import { useEffect, useState } from "react";

interface Broadcasters {
  de: string[];
  usa: string[];
  uk: string[];
}

interface SportEvent {
  id: number | string;
  time?: string;
  sport: string;
  competition: string;
  competitionLogo?: string;
  homeTeam?: string;
  homeLogo?: string;
  awayTeam?: string;
  awayLogo?: string;
  homeRank?: number | null;
  awayRank?: number | null;
  details?: string;
  category?: string;
  broadcasters: Broadcasters;
  bonusScore?: number;
}

// ==========================================
// 1. WETTBEWERBS-GEWICHTUNG
// ==========================================
const COMPETITION_WEIGHTS: Record<string, number> = {
  "UEFA Champions League": 80,
  "World Cup": 80,
  "Euro Championship": 80,
  "UEFA Nations League": 75,
  "Bundesliga": 90,
  "Premier League": 75,
  "DFB-Pokal": 80,
  "Grand Tour": 85,
  "Klassiker": 80,
  "Monument": 80,
  "NFL": 80,
  "NBA": 75,
  "Boxing World Championship": 75,
  "2. Bundesliga": 70,
  "NCAA Football": 69,
  "UEFA European Under-21 Championship": 65,
  "FIFA U-20 World Cup": 60,
  "UEFA European Under-19 Championship": 60,
  "FIFA U-17 World Cup": 55,
  "UEFA European Under-17 Championship": 55,
  "3. Liga": 50,
};

// ==========================================
// 2. HERZENSVEREIN
// ==========================================
function isVfBStuttgart(home = "", away = ""): boolean {
  const h = home.toLowerCase();
  const a = away.toLowerCase();
  return h.includes("stuttgart") || a.includes("stuttgart");
}

// ==========================================
// 3. CL SCHWERGEWICHTE
// ==========================================
const CL_HEAVYWEIGHTS = [
  "Real Madrid", "Bayern Munich", "Bayern München", "Manchester City",
  "Barcelona", "Liverpool", "Paris Saint-Germain", "PSG", "Arsenal",
  "Inter", "Juventus", "Bayer Leverkusen", "Borussia Dortmund", "Dortmund", "Atletico Madrid"
];

function isCLHeavyweightDuel(event: SportEvent): boolean {
  if (event.competition !== "UEFA Champions League") return false;
  const home = (event.homeTeam || "").toLowerCase();
  const away = (event.awayTeam || "").toLowerCase();
  return CL_HEAVYWEIGHTS.some(t => home.includes(t.toLowerCase())) &&
         CL_HEAVYWEIGHTS.some(t => away.includes(t.toLowerCase()));
}

// ==========================================
// 4. FOKUS-DERBYS
// ==========================================
const RELEVANT_DERBIES: [string, string][] = [
  ["Bayern", "Dortmund"], ["Dortmund", "Schalke"], ["Stuttgart", "Karlsruhe"],
  ["Arsenal", "Tottenham"], ["Liverpool", "Manchester United"], ["Manchester City", "Manchester United"],
  ["Ohio State", "Michigan"], ["Alabama", "Auburn"], ["Texas", "Oklahoma"],
  ["Army", "Navy"], ["Florida", "Georgia"], ["USC", "Notre Dame"], ["Florida State", "Miami"],
];

function isDerby(home = "", away = ""): boolean {
  const h = home.toLowerCase();
  const a = away.toLowerCase();
  return RELEVANT_DERBIES.some(([t1, t2]) => {
    const k1 = t1.toLowerCase(); const k2 = t2.toLowerCase();
    return (h.includes(k1) && a.includes(k2)) || (h.includes(k2) && a.includes(k1));
  });
}

// ==========================================
// 5. HELPER: LIVE CHECK
// ==========================================
function isEventLive(timeStr?: string): boolean {
  if (!timeStr) return false;
  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return false;
    const now = new Date();
    const eventTime = new Date();
    eventTime.setHours(hours, minutes, 0, 0);
    const diffMinutes = (now.getTime() - eventTime.getTime()) / (1000 * 60);
    return diffMinutes >= -15 && diffMinutes <= 200; 
  } catch (e) {
    return false;
  }
}

// ==========================================
// 6. SCORE-BERECHNUNG
// ==========================================
function getEventScore(event: SportEvent): number {
  let score = COMPETITION_WEIGHTS[event.competition] || 10;
  if (event.category && COMPETITION_WEIGHTS[event.category]) {
    score = Math.max(score, COMPETITION_WEIGHTS[event.category]);
  }
  if (event.bonusScore) score += event.bonusScore;
  if (isVfBStuttgart(event.homeTeam, event.awayTeam)) score += 1000;
  if (isCLHeavyweightDuel(event)) score += 40;
  if (isDerby(event.homeTeam, event.awayTeam)) score += 35; 
  if (event.homeRank && event.awayRank && event.homeRank <= 3 && event.awayRank <= 3) score += 25;
  return score;
}

export default function Home() {
  const [topEvents, setTopEvents] = useState<SportEvent[]>([]);
  const [otherEvents, setOtherEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllEvents() {
      const todayStr = new Date().toISOString().split("T")[0]; 
      const cacheKey = `tv-guide-cache-v6-${todayStr}`; // Neuer Key für die bereinigte Architektur

      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setTopEvents(parsed.topEvents);
        setOtherEvents(parsed.otherEvents);
        setLoading(false);
        return;
      }

      try {
        const endpoints = [
          "/api/football/today",
          "/api/cycling/today",
          "/api/nfl/today", 
          "/api/nba/today",
          "/api/boxing/today"
        ];

        let combinedEvents: SportEvent[] = [];

        // Extrem sauberes Fetching, da alle Backend-Routen nun { events: [...] } liefern
        const responses = await Promise.all(endpoints.map(ep => fetch(ep).catch(() => null)));
        
        for (const res of responses) {
          if (res && res.ok) {
            const data = await res.json();
            if (data.events) {
              combinedEvents = [...combinedEvents, ...data.events];
            }
          }
        }

        // Türsteher-Filter
        combinedEvents = combinedEvents.filter((event) => {
          if (!event.homeTeam || !event.awayTeam || event.homeTeam === "Unbekannt" || event.awayTeam === "Unbekannt") {
            return false;
          }
          if (event.competition === "Premier League") {
            const fakeTeams = ["Tabankulu", "Amawele", "Mamelodi", "Kaizer Chiefs", "Orlando Pirates"];
            if (fakeTeams.some((fake) => event.homeTeam?.includes(fake) || event.awayTeam?.includes(fake))) {
              return false;
            }
          }
          return true; 
        });

        // Sortierung & 80-Punkte Must-See Regel
        const sortedEvents = combinedEvents.sort((a, b) => getEventScore(b) - getEventScore(a));
        const MIN_MUST_SEE_SCORE = 80; 
        
        const finalTop: SportEvent[] = [];
        const finalOther: SportEvent[] = [];

        sortedEvents.forEach((event) => {
          if (finalTop.length < 4 && getEventScore(event) >= MIN_MUST_SEE_SCORE) {
            finalTop.push(event);
          } else {
            finalOther.push(event);
          }
        });

        setTopEvents(finalTop);
        setOtherEvents(finalOther);

        localStorage.clear();
        localStorage.setItem(cacheKey, JSON.stringify({ topEvents: finalTop, otherEvents: finalOther }));
      } catch (err: any) {
        setError("Fehler beim Laden der Tages-Highlights.");
      } finally {
        setLoading(false);
      }
    }

    fetchAllEvents();
  }, []);

  const hasEvents = topEvents.length > 0 || otherEvents.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-3xl mx-auto font-sans">
      <header className="flex flex-col items-center justify-center py-4">
        <h1 className="text-2xl font-bold tracking-tight">💣TV Guide💣</h1>
        <p className="text-sm font-normal text-muted-foreground mt-1">by itsdahias</p>
      </header>

      {loading && (
        <div className="p-4 bg-slate-900/80 rounded-xl text-slate-400 animate-pulse border border-slate-800">
          Lade heutige Highlights...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && !hasEvents && (
        <div className="p-8 mb-8 bg-slate-900/60 rounded-xl text-center text-slate-400 border border-slate-800/80">
          Heute stehen keine Events in deinen ausgewählten Ligen & Rennen an.
        </div>
      )}

      {!loading && !error && hasEvents && (
        <div className="space-y-8 mb-8">
          {topEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-amber-400 text-lg">🔥</span>
                <h2 className="text-xl font-bold text-slate-100">Must See</h2>
              </div>
              <div className="grid gap-3">
                {topEvents.map((event) => {
                  const vfbMatch = isVfBStuttgart(event.homeTeam, event.awayTeam);
                  const derbyMatch = isDerby(event.homeTeam, event.awayTeam);
                  const clHeavyMatch = isCLHeavyweightDuel(event);
                  const isLive = isEventLive(event.time); 

                  return (
                    <div key={event.id} className={`p-4 bg-slate-900 border-2 rounded-xl shadow-lg transition flex flex-col gap-3 ${isLive ? "border-red-500 shadow-red-950/50 animate-pulse" : vfbMatch ? "border-red-500/60 shadow-red-950/30" : "border-emerald-500/30 shadow-emerald-950/20 hover:border-emerald-500/60"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xl">{event.sport}</span>
                          <span className="text-xs px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-md font-semibold flex items-center gap-1.5">
                            {event.competitionLogo && <img src={event.competitionLogo} alt="" className="w-4 h-4 object-contain" />}
                            {event.competition}
                            {vfbMatch && <span className="text-red-400 font-bold ml-1">⚪🔴 VfB Match</span>}
                            {clHeavyMatch && !vfbMatch && <span className="text-amber-400 font-bold ml-1">👑 Top-Clash</span>}
                            {derbyMatch && !clHeavyMatch && !vfbMatch && <span className="text-amber-400 font-bold ml-1">⚔️ Derby</span>}
                          </span>
                          <div className="font-bold text-slate-100 text-base flex items-center gap-2">
                            {event.homeTeam ? (
                              <>
                                <div className="flex items-center gap-1.5">
                                  {event.homeLogo && <img src={event.homeLogo} alt="" className="w-5 h-5 object-contain" />}
                                  <span>{event.homeTeam}</span>
                                  {event.homeRank && <span className="text-xs text-emerald-400 font-mono">({event.homeRank}.)</span>}
                                </div>
                                <span className="text-slate-400 font-normal mx-1">vs</span>
                                <div className="flex items-center gap-1.5">
                                  {event.awayLogo && <img src={event.awayLogo} alt="" className="w-5 h-5 object-contain" />}
                                  <span>{event.awayTeam}</span>
                                  {event.awayRank && <span className="text-xs text-emerald-400 font-mono">({event.awayRank}.)</span>}
                                </div>
                              </>
                            ) : <span>{event.details}</span>}
                          </div>
                        </div>
                        {isLive ? (
                          <div className="text-xs font-mono font-bold text-white bg-red-600 px-3 py-1 rounded-lg shrink-0 flex items-center gap-1.5 shadow-md animate-bounce">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span> LIVE NOW
                          </div>
                        ) : event.time && (
                          <div className="text-sm font-mono font-semibold text-emerald-400 bg-emerald-950/80 px-3 py-1 border border-emerald-700/60 rounded-lg shrink-0">{event.time} Uhr</div>
                        )}
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 text-xs text-slate-300">
                        {event.broadcasters?.de?.length > 0 && <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-200">🇩🇪 {event.broadcasters.de.join(", ")}</span>}
                        {event.broadcasters?.usa?.length > 0 && <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-200">🇺🇸 {event.broadcasters.usa.join(", ")}</span>}
                        {event.broadcasters?.uk?.length > 0 && <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-200">🇬🇧 {event.broadcasters.uk.join(", ")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {otherEvents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-slate-400 border-b border-slate-800 pb-2">Weitere Events ({otherEvents.length})</h2>
              <div className="grid gap-2.5">
                {otherEvents.map((event) => {
                  const isLive = isEventLive(event.time);
                  return (
                    <div key={event.id} className={`p-3.5 bg-slate-900/60 border rounded-xl transition flex flex-col gap-2.5 ${isLive ? "border-red-500/80 bg-red-950/20" : "border-slate-800/80 hover:border-slate-700"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-base">{event.sport}</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-medium flex items-center gap-1">
                            {event.competitionLogo && <img src={event.competitionLogo} alt="" className="w-3.5 h-3.5 object-contain" />} {event.competition}
                          </span>
                          <div className="font-medium text-slate-200 text-sm flex items-center gap-2">
                            {event.homeTeam ? (
                              <>
                                <div className="flex items-center gap-1">
                                  {event.homeLogo && <img src={event.homeLogo} alt="" className="w-4 h-4 object-contain" />} <span>{event.homeTeam}</span>
                                  {event.homeRank && <span className="text-xs text-slate-400 font-mono">({event.homeRank}.)</span>}
                                </div>
                                <span className="text-slate-500 font-normal mx-1">vs</span>
                                <div className="flex items-center gap-1">
                                  {event.awayLogo && <img src={event.awayLogo} alt="" className="w-4 h-4 object-contain" />} <span>{event.awayTeam}</span>
                                  {event.awayRank && <span className="text-xs text-slate-400 font-mono">({event.awayRank}.)</span>}
                                </div>
                              </>
                            ) : <span>{event.details}</span>}
                          </div>
                        </div>
                        {isLive ? (
                          <div className="text-[11px] font-mono font-bold text-white bg-red-600 px-2.5 py-0.5 rounded shrink-0 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span> LIVE
                          </div>
                        ) : event.time && <div className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded shrink-0">{event.time} Uhr</div>}
                      </div>
                      <div className="pt-1.5 border-t border-slate-800/40 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                        {event.broadcasters?.de?.length > 0 && <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">🇩🇪 {event.broadcasters.de.join(", ")}</span>}
                        {event.broadcasters?.usa?.length > 0 && <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">🇺🇸 {event.broadcasters.usa.join(", ")}</span>}
                        {event.broadcasters?.uk?.length > 0 && <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">🇬🇧 {event.broadcasters.uk.join(", ")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}