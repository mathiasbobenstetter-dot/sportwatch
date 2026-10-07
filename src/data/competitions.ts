export interface Competition {
  id: number;
  name: string;
  country: string;
}

export const FOOTBALL_COMPETITIONS: Competition[] = [
  { id: 78, name: "Bundesliga", country: "Germany" },
  { id: 79, name: "2. Bundesliga", country: "Germany" },
  { id: 80, name: "3. Liga", country: "Germany" },
  { id: 81, name: "DFB-Pokal", country: "Germany" },
  { id: 39, name: "Premier League", country: "England" },
  { id: 2, name: "UEFA Champions League", country: "World" },
  { id: 3, name: "UEFA Europa League", country: "World" },
  { id: 847, name: "UEFA Conference League", country: "World" },
  { id: 5, name: "UEFA Nations League", country: "World" },
  { id: 1, name: "World Cup", country: "World" },
  { id: 4, name: "Euro Championship", country: "World" },
  
];

// DIESE ZEILE WAR FEHLEND / ÜBERSCHRIEBEN:
export const ALLOWED_LEAGUE_IDS = new Set(FOOTBALL_COMPETITIONS.map((c) => c.id));