export interface Broadcasters {
  de: string[];
  usa: string[];
  uk: string[];
}

export const LEAGUE_BROADCASTERS: Record<number, Broadcasters> = {
  // Bundesliga
  78: {
    de: ["Sky", "DAZN"],
    usa: ["ESPN+"],
    uk: ["Sky Sports"],
  },
  // 2. Bundesliga
  79: {
    de: ["Sky", "RTL"],
    usa: ["ESPN+"],
    uk: ["Sky Sports"],
  },
  // 3. Liga
  80: {
    de: ["MagentaSport", "Free TV (MDR/BR/etc.)"],
    usa: [],
    uk: [],
  },
  // DFB-Pokal
  81: {
    de: ["Sky", "ARD/ZDF"],
    usa: ["ESPN+"],
    uk: ["Premier Sports"],
  },
  // Premier League
  39: {
    de: ["Sky"],
    usa: ["NBC", "Peacock", "USA Network"],
    uk: ["Sky Sports", "TNT Sports", "Prime Video"],
  },
  // UEFA Champions League
  2: {
    de: ["DAZN", "Prime Video", "ZDF (Finale)"],
    usa: ["Paramount+", "CBS"],
    uk: ["TNT Sports", "Prime Video"],
  },
  // UEFA Europa League
  3: {
    de: ["RTL", "RTL+"],
    usa: ["Paramount+"],
    uk: ["TNT Sports"],
  },
  // UEFA Conference League
  847: {
    de: ["RTL+"],
    usa: ["Paramount+"],
    uk: ["TNT Sports"],
  },
  // UEFA Nations League
  5: {
    de: ["ARD/ZDF", "RTL", "DAZN"],
    usa: ["FOX Sports", "FuboTV"],
    uk: ["ITV", "Channel 4"],
  },
  // World Cup
  1: {
    de: ["ARD/ZDF", "MagentaTV"],
    usa: ["FOX Sports", "Telemundo"],
    uk: ["BBC", "ITV"],
  },
  // Euro Championship
  4: {
    de: ["ARD/ZDF", "RTL", "MagentaTV"],
    usa: ["FOX Sports"],
    uk: ["BBC", "ITV"],
  },
};