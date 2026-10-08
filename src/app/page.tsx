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
  competitionLogo?: string; // Neu: Ligen-Wappen
  homeTeam?: string;
  homeLogo?: string;        // Neu: Heim-Wappen
  awayTeam?: string;
  awayLogo?: string;        // Neu: Auswärts-Wappen
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
  "UEFA European Under-21 Championship": 65,
  "FIFA U-20 World Cup": 60,
  "UEFA European Under-19 Championship": 60,
  "FIFA U-17 World Cup": 55,
  "UEFA European Under-17 Championship": 55,
  "3. Liga": 50,
};

// ==========================================
// 2. HERZENSVEREIN (VfB Stuttgart Priorität)
// ==========================================
function isVfBStuttgart(home = "", away = ""): boolean {
  const h = home.toLowerCase();
  const a = away.toLowerCase();
  return h.includes("stuttgart") || a.includes("stuttgart");
}

// ==========================================
// 3. CHAMPIONS LEAGUE SCHWERGEWICHTE
// ==========================================
const CL_HEAVYWEIGHTS = [
  "Real Madrid",
  "Bayern Munich",
  "Bayern München",
  "Manchester City",
  "Barcelona",
  "Liverpool",
  "Paris Saint-Germain",
  "PSG",
  "Arsenal",
  "Inter",
  "Juventus",
  "Bayer Leverkusen",
  "Borussia Dortmund",
  "Dortmund",
  "Atletico Madrid",
];

function isCLHeavyweightDuel(event: SportEvent): boolean {
  if (event.competition !== "UEFA Champions League") return false;

  const home = (event.homeTeam || "").toLowerCase();
  const away = (event.awayTeam || "").toLowerCase();

  const isHomeHeavy = CL_HEAVYWEIGHTS.some((team) =>
    home.includes(team.toLowerCase())
  );
  const isAwayHeavy = CL_HEAVYWEIGHTS.some((team) =>
    away.includes(team.toLowerCase())
  );

  return isHomeHeavy && isAwayHeavy;
}

// ==========================================
// 4. FOKUS-DERBYS (Nur DE & UK)
// ==========================================
const RELEVANT_DERBIES: [string, string][] = [
  ["Bayern", "Dortmund"],
  ["Dortmund", "Schalke"],
  ["Stuttgart", "Karlsruhe"],
  ["Arsenal", "Tottenham"],
  ["Liverpool", "Manchester United"],
  ["Manchester City", "Manchester United"],
];

function isDerby(home = "", away = ""): boolean {
  const h = home.toLowerCase();
  const a = away.toLowerCase();
  return RELEVANT_DERBIES.some(([t1, t2]) => {
    const k1 = t1.toLowerCase();
    const k2 = t2.toLowerCase();
    return (h.includes(k1) && a.includes(k2)) || (h.includes(k2) && a.includes(k1));
  });
}

// ==========================================
// 5. SCORE-BERECHNUNG
// ==========================================
function getEventScore(event: SportEvent): number {
  let score = COMPETITION_WEIGHTS[event.competition] || 10;

  if (event.category && COMPETITION_WEIGHTS[event.category]) {
    score = Math.max(score, COMPETITION_WEIGHTS[event.category]);
  }

  if (event.bonusScore) {
    score += event.bonusScore;
  }

  if (isVfBStuttgart(event.homeTeam, event.awayTeam)) {
    score += 1000;
  }

  if (isCLHeavyweightDuel(event)) {
    score += 40;
  }

  if (isDerby(event.homeTeam, event.awayTeam)) {
    score += 30;
  }

  if (
    event.homeRank &&
    event.awayRank &&
    event.homeRank <= 3 &&
    event.awayRank <= 3
  ) {
    score += 25;
  }

  return score;
}

export default function Home() {
  const [topEvents, setTopEvents] = useState<SportEvent[]>([]);
  const [otherEvents, setOtherEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllEvents() {
      const todayStr = new Date().toLocaleDateString("de-DE");
      const cacheKey = `tv-guide-cache-${todayStr}`;

      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setTopEvents(parsed.topEvents);
        setOtherEvents(parsed.otherEvents);
        setLoading(false);
        return;
      }

      try {
        const [footRes, cycRes, nflRes, nbaRes, boxRes] = await Promise.all([
          fetch("/api/football/today"),
          fetch("/api/cycling/today"),
          fetch("/api/nfl/today"),
          fetch("/api/nba/today"),
          fetch("/api/boxing/today"),
        ]);

        let combinedEvents: SportEvent[] = [];

        // 1. Fußball
        if (footRes.ok) {
          const footData = await footRes.json();
          combinedEvents = [...combinedEvents, ...(footData.events || [])];
        }

        // 2. Radsport
        if (cycRes.ok) {
          const cycData = await cycRes.json();
          combinedEvents = [...combinedEvents, ...(cycData.events || [])];
        }

        // 3. NFL
        if (nflRes.ok) {
          const nflData = await nflRes.json();
          const nflEvents: SportEvent[] = (nflData.response || []).map((game: any) => {
            let bonusScore = 0;
            const stage = (game.game?.stage || "").toLowerCase();
            if (stage.includes("super bowl")) bonusScore = 100;
            else if (stage.includes("playoff")) bonusScore = 50;

            let timeStr = "";
            try {
              if (game.game?.date?.date) {
                timeStr = new Date(game.game.date.date).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }
            } catch (e) {}

            return {
              id: `nfl-${game.game?.id || Math.random()}`,
              time: timeStr,
              sport: "🏈 NFL",
              competition: "NFL",
              homeTeam: game.teams?.home?.name || "Unbekannt",
              homeLogo: game.teams?.home?.logo, // NFL Logo falls vorhanden
              awayTeam: game.teams?.away?.name || "Unbekannt",
              awayLogo: game.teams?.away?.logo, // NFL Logo falls vorhanden
              details: game.game?.stage || "",
              bonusScore,
              broadcasters: {
                de: ["RTL / DAZN"], 
                usa: [],
                uk: [],
              },
            };
          });
          combinedEvents = [...combinedEvents, ...nflEvents];
        }

        // 4. Basketball (NBA & March Madness)
        if (nbaRes.ok) {
          const nbaData = await nbaRes.json();
          const nbaEvents: SportEvent[] = (nbaData.response || []).map((game: any) => {
            let bonusScore = -10; 
            const stage = (game.stage || game.league?.type || "").toLowerCase();
            const leagueName = (game.league?.name || "").toLowerCase();
            
            const isPlayoff = stage.includes("playoff") || stage.includes("finals");
            const isMarchMadness = leagueName.includes("ncaa") || stage.includes("march madness");

            let timeStr = "";
            let broadcaster = "DAZN / ProSieben MAXX";

            try {
              if (game.date) {
                const gameDate = new Date(game.date);
                timeStr = gameDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                
                const hour = gameDate.getHours();
                const isGoodTvTime = hour >= 18 && hour <= 23; 

                if (isMarchMadness) {
                  bonusScore += 30; 
                  broadcaster = "ProSieben MAXX / DAZN / ESPN";
                  if (isGoodTvTime) bonusScore += 40;
                } else if (isPlayoff) {
                  bonusScore += 25; 
                  if (isGoodTvTime) bonusScore += 50; 
                } else if (isGoodTvTime) {
                  bonusScore += 15; 
                }
              }
            } catch (e) {}

            return {
              id: `bball-${game.id || Math.random()}`,
              time: timeStr,
              sport: isMarchMadness ? "🏀 NCAA" : "🏀 NBA",
              competition: isMarchMadness ? "March Madness" : "NBA",
              competitionLogo: game.league?.logo,
              homeTeam: game.teams?.home?.name || "Unbekannt",
              homeLogo: game.teams?.home?.logo,
              awayTeam: game.teams?.away?.name || "Unbekannt",
              awayLogo: game.teams?.away?.logo,
              details: game.stage || "",
              bonusScore,
              broadcasters: { de: [broadcaster], usa: [], uk: [] },
            };
          });
          combinedEvents = [...combinedEvents, ...nbaEvents];
        }

        // 5. Boxen
        if (boxRes?.ok) {
          const boxData = await boxRes.json();
          combinedEvents = [...combinedEvents, ...(boxData.events || [])];
        }

        // Sortierung nach dynamischem Score
        const sortedEvents = combinedEvents.sort(
          (a, b) => getEventScore(b) - getEventScore(a)
        );

        const finalTop = sortedEvents.slice(0, 4);
        const finalOther = sortedEvents.slice(4);

        setTopEvents(finalTop);
        setOtherEvents(finalOther);

        localStorage.clear();
        localStorage.setItem(cacheKey, JSON.stringify({
          topEvents: finalTop,
          otherEvents: finalOther,
        }));

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
      {/* Header */}
      <header className="flex flex-col items-center justify-center py-4">
        <h1 className="text-2xl font-bold tracking-tight">
          💣TV Guide💣
        </h1>
        <p className="text-sm font-normal text-muted-foreground mt-1">
          by itsdahias
        </p>
      </header>

      {/* Loading & Error States */}
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

      {/* Hinweis wenn keine Live-Events da sind */}
      {!loading && !error && !hasEvents && (
        <div className="p-8 mb-8 bg-slate-900/60 rounded-xl text-center text-slate-400 border border-slate-800/80">
          Heute stehen keine Events in deinen ausgewählten Ligen & Rennen an.
        </div>
      )}

      {/* Live-Events werden nur gerendert, wenn welche da sind */}
      {!loading && !error && hasEvents && (
        <div className="space-y-8 mb-8">
          {/* SECTION 1: MUST SEE (Top 4) */}
          {topEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-amber-400 text-lg">🔥</span>
                <h2 className="text-xl font-bold text-slate-100">
                  Must See
                </h2>
              </div>

              <div className="grid gap-3">
                {topEvents.map((event) => {
                  const vfbMatch = isVfBStuttgart(event.homeTeam, event.awayTeam);
                  const derbyMatch = isDerby(event.homeTeam, event.awayTeam);
                  const clHeavyMatch = isCLHeavyweightDuel(event);

                  return (
                    <div
                      key={event.id}
                      className={`p-4 bg-slate-900 border-2 rounded-xl shadow-lg transition flex flex-col gap-3 ${
                        vfbMatch
                          ? "border-red-500/60 shadow-red-950/30"
                          : "border-emerald-500/30 shadow-emerald-950/20 hover:border-emerald-500/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xl">{event.sport}</span>
                          
                          {/* Ligen-Badge mit optionalem Logo */}
                          <span className="text-xs px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-md font-semibold flex items-center gap-1.5">
                            {event.competitionLogo && (
                              <img src={event.competitionLogo} alt="" className="w-4 h-4 object-contain" />
                            )}
                            {event.competition}
                            {vfbMatch && (
                              <span className="text-red-400 font-bold ml-1">
                                ⚪🔴 VfB Match
                              </span>
                            )}
                            {clHeavyMatch && !vfbMatch && (
                              <span className="text-amber-400 font-bold ml-1">
                                👑 Top-Clash
                              </span>
                            )}
                            {derbyMatch && !clHeavyMatch && !vfbMatch && (
                              <span className="text-amber-400 font-bold ml-1">
                                ⚔️ Derby
                              </span>
                            )}
                          </span>

                          {/* Teams & Logos */}
                          <div className="font-bold text-slate-100 text-base flex items-center gap-2">
                            {event.homeTeam ? (
                              <>
                                <div className="flex items-center gap-1.5">
                                  {event.homeLogo && <img src={event.homeLogo} alt="" className="w-5 h-5 object-contain" />}
                                  <span>{event.homeTeam}</span>
                                  {event.homeRank && (
                                    <span className="text-xs text-emerald-400 font-mono">
                                      ({event.homeRank}.)
                                    </span>
                                  )}
                                </div>

                                <span className="text-slate-400 font-normal mx-1">vs</span>

                                <div className="flex items-center gap-1.5">
                                  {event.awayLogo && <img src={event.awayLogo} alt="" className="w-5 h-5 object-contain" />}
                                  <span>{event.awayTeam}</span>
                                  {event.awayRank && (
                                    <span className="text-xs text-emerald-400 font-mono">
                                      ({event.awayRank}.)
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span>{event.details}</span>
                            )}
                          </div>
                        </div>

                        {event.time && (
                          <div className="text-sm font-mono font-semibold text-emerald-400 bg-emerald-950/80 px-3 py-1 border border-emerald-700/60 rounded-lg shrink-0">
                            {event.time} Uhr
                          </div>
                        )}
                      </div>

                      {/* Broadcaster Badges */}
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 text-xs text-slate-300">
                        {event.broadcasters?.de?.length > 0 && (
                          <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-200">
                            🇩🇪 {event.broadcasters.de.join(", ")}
                          </span>
                        )}
                        {event.broadcasters?.usa?.length > 0 && (
                          <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-200">
                            🇺🇸 {event.broadcasters.usa.join(", ")}
                          </span>
                        )}
                        {event.broadcasters?.uk?.length > 0 && (
                          <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-200">
                            🇬🇧 {event.broadcasters.uk.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION 2: WEITERE EVENTS */}
          {otherEvents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-slate-400 border-b border-slate-800 pb-2">
                Weitere Events ({otherEvents.length})
              </h2>

              <div className="grid gap-2.5">
                {otherEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-base">{event.sport}</span>
                        
                        <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-medium flex items-center gap-1">
                          {event.competitionLogo && <img src={event.competitionLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
                          {event.competition}
                        </span>

                        <div className="font-medium text-slate-200 text-sm flex items-center gap-2">
                          {event.homeTeam ? (
                            <>
                              <div className="flex items-center gap-1">
                                {event.homeLogo && <img src={event.homeLogo} alt="" className="w-4 h-4 object-contain" />}
                                <span>{event.homeTeam}</span>
                                {event.homeRank && (
                                  <span className="text-xs text-slate-400 font-mono">
                                    ({event.homeRank}.)
                                  </span>
                                )}
                              </div>

                              <span className="text-slate-500 font-normal mx-1">vs</span>

                              <div className="flex items-center gap-1">
                                {event.awayLogo && <img src={event.awayLogo} alt="" className="w-4 h-4 object-contain" />}
                                <span>{event.awayTeam}</span>
                                {event.awayRank && (
                                  <span className="text-xs text-slate-400 font-mono">
                                    ({event.awayRank}.)
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <span>{event.details}</span>
                          )}
                        </div>
                      </div>

                      {event.time && (
                        <div className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded shrink-0">
                          {event.time} Uhr
                        </div>
                      )}
                    </div>

                    {/* Broadcaster Badges */}
                    <div className="pt-1.5 border-t border-slate-800/40 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                      {event.broadcasters?.de?.length > 0 && (
                        <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                          🇩🇪 {event.broadcasters.de.join(", ")}
                        </span>
                      )}
                      {event.broadcasters?.usa?.length > 0 && (
                        <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                          🇺🇸 {event.broadcasters.usa.join(", ")}
                        </span>
                      )}
                      {event.broadcasters?.uk?.length > 0 && (
                        <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                          🇬🇧 {event.broadcasters.uk.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}