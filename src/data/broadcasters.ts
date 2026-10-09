export const LEAGUE_BROADCASTERS: Record<number, { de: string[], usa: string[], uk: string[] }> = {
  // 2: UEFA Champions League
  2: { 
    de: ["DAZN", "Prime Video"], 
    usa: ["Paramount+", "CBS"], 
    uk: ["TNT Sports", "Amazon Prime"] 
  },
  // 3: UEFA Europa League
  3: { 
    de: ["RTL", "RTL+"], 
    usa: ["Paramount+", "CBS"], 
    uk: ["TNT Sports"] 
  },
  // 39: Premier League
  39: {
    de: ["Sky"],
    usa: ["NBC", "Peacock", "USA Network"],
    uk: ["Sky Sports", "TNT Sports"]
  },
  // 78: Bundesliga (VfB Stuttgart & Co.)
  78: { 
    de: ["Sky", "DAZN"], 
    usa: ["ESPN+"], 
    uk: ["Sky Sports"] 
  },
  // 81: DFB-Pokal
  81: {
    de: ["Sky", "ARD", "ZDF"],
    usa: ["ESPN+"],
    uk: [] // In der UK meistens kein fester Broadcaster für DFB Pokal
  },
  // 140: La Liga (Spanien)
  140: {
    de: ["DAZN"],
    usa: ["ESPN+"],
    uk: ["Viaplay", "ITV"]
  },
  // 135: Serie A (Italien)
  135: {
    de: ["DAZN"],
    usa: ["Paramount+"],
    uk: ["TNT Sports"]
  },
  // 71: Campeonato Brasileiro Série A (Brasilien)
  71: {
    de: ["Sportdigital"],
    usa: ["Paramount+", "Premiere"],
    uk: ["Fanatiz"]
  }
};