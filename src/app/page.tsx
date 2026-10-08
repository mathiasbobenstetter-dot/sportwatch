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
  homeTeam?: string;
  awayTeam?: string;
  homeRank?: number | null;
  awayRank?: number | null;
  details?: string;
  category?: string;
  broadcasters: Broadcasters;
  bonusScore?: number; // Neu: Für flexible Extra-Punkte (z.B. NFL Playoffs)
}

// ==========================================
// 1. WETTBEWERBS-GEWICHTUNG
// ==========================================
const COMPETITION_WEIGHTS: Record<string, number> = {
  // Fußball International & Top-Ligen
  "UEFA Champions League": 80,
  "World Cup": 80,
  "Euro Championship": 80,
  "UEFA Nations League": 75,
  "Bundesliga": 90,
  "Premier League": 75,
  "DFB-Pokal": 80,

  // Radsport
  "Grand Tour": 85,         // Tour de France, Giro, Vuelta
  "Klassiker": 80,          // Paris-Roubaix, Flandern etc.
  "Monument": 80,

  // US-Sports & Boxen
  "NFL": 80,                // American Football
  "NBA": 75,                // Basketball
  "Boxing World Championship": 75, // Titelkämpfe

  // Untere Ligen & Junioren
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
  // Deutschland
  ["Bayern", "Dortmund"],
  ["Dortmund", "Schalke"],
  ["Stuttgart", "Karlsruhe"],
  // England
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

  // Bonus: Dynamische Zusatzpunkte (z.B. NFL Playoffs)
  if (event.bonusScore) {
    score += event.bonusScore;
  }

  // Bonus 0: VfB Stuttgart Spiele (+1000 Punkte -> GARANTIERT Platz 1)
  if (isVfBStuttgart(event.homeTeam, event.awayTeam)) {
    score += 1000;
  }

  // Bonus 1: Champions League Duell von 2 Schwergewichten (+40 Pkt)
  if (isCLHeavyweightDuel(event)) {
    score += 40;
  }

  // Bonus 2: Relevantes Derby in DE/ENG (+30 Pkt)
  if (isDerby(event.homeTeam, event.awayTeam)) {
    score += 30;
  }

  // Bonus 3: Liga-Spitzenduell (+25 Pkt wenn beide Teams Top 3)
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
      try {
        const [footRes, cycRes, nflRes] = await Promise.all([
          fetch("/api/football/today"),
          fetch("/api/cycling/today"),
          fetch("/api/nfl/today"),
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
              awayTeam: game.teams?.away?.name || "Unbekannt",
              details: game.game?.stage || "",
              bonusScore,
              broadcasters: {
                de: ["RTL / DAZN"], // NFL Deutschland Sender
                usa: [],
                uk: [],
              },
            };
          });
          combinedEvents = [...combinedEvents, ...nflEvents];
        }

        // Sortierung nach dynamischem Score
        const sortedEvents = combinedEvents.sort(
          (a, b) => getEventScore(b) - getEventScore(a)
        );

        setTopEvents(sortedEvents.slice(0, 5));
        setOtherEvents(sortedEvents.slice(5));
      } catch (err: any) {
        setError("Fehler beim Laden der Tages-Highlights.");
      } finally {
        setLoading(false);
      }
    }

    fetchAllEvents();
  }, []);

  const todayFormatted = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

      {!loading && !error && !hasEvents && (
        <div className="p-8 bg-slate-900/60 rounded-xl text-center text-slate-400 border border-slate-800/80">
          Heute stehen keine Events in deinen ausgewählten Ligen & Rennen an.
        </div>
      )}

      {!loading && !error && hasEvents && (
        <div className="space-y-8">
          {/* SECTION 1: TOP HIGHLIGHTS */}
          {topEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-amber-400 text-lg">🔥</span>
                <h2 className="text-xl font-bold text-slate-100">
                  Top Highlights des Tages
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
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{event.sport}</span>
                          <span className="text-xs px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-md font-semibold flex items-center gap-1">
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
                          <div className="font-bold text-slate-100 text-base">
                            {event.homeTeam ? (
                              <>
                                {event.homeTeam}{" "}
                                {event.homeRank && (
                                  <span className="text-xs text-emerald-400 font-mono">
                                    ({event.homeRank}.)
                                  </span>
                                )}{" "}
                                <span className="text-slate-400 font-normal mx-1">
                                  vs
                                </span>{" "}
                                {event.awayTeam}{" "}
                                {event.awayRank && (
                                  <span className="text-xs text-emerald-400 font-mono">
                                    ({event.awayRank}.)
                                  </span>
                                )}
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
                Weitere Partien & Rennen ({otherEvents.length})
              </h2>

              <div className="grid gap-2.5">
                {otherEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{event.sport}</span>
                        <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-medium">
                          {event.competition}
                        </span>
                        <div className="font-medium text-slate-200 text-sm">
                          {event.homeTeam ? (
                            <>
                              {event.homeTeam}{" "}
                              {event.homeRank && (
                                <span className="text-xs text-slate-400 font-mono">
                                  ({event.homeRank}.)
                                </span>
                              )}{" "}
                              <span className="text-slate-500 font-normal mx-1">
                                vs
                              </span>{" "}
                              {event.awayTeam}{" "}
                              {event.awayRank && (
                                <span className="text-xs text-slate-400 font-mono">
                                  ({event.awayRank}.)
                                </span>
                              )}
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