export interface CyclingEvent {
  id: string;
  name: string;
  category: "Grand Tour" | "Monument" | "Klassiker" | "WorldTour";
  stageOrDetails: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  broadcasters: {
    de: string[];
    usa: string[];
    uk: string[];
  };
}

// Standard-Rechte für WorldTour-Rennen
const DEFAULT_CYCLING_BROADCASTERS = {
  de: ["Eurosport 1", "Discovery+"],
  usa: ["Peacock", "FloBikes"],
  uk: ["Eurosport", "Discovery+"],
};

// Beispiel-Eventliste (erweiterbar für die Saison)
export const CYCLING_CALENDAR: CyclingEvent[] = [
  {
    id: "tour-de-france-2026",
    name: "Tour de France",
    category: "Grand Tour",
    stageOrDetails: "Etappe / Tageswertung",
    startDate: "2026-07-04",
    endDate: "2026-07-26",
    broadcasters: {
      de: ["ARD / Sportschau", "Eurosport 1", "Discovery+"],
      usa: ["Peacock"],
      uk: ["Eurosport", "Discovery+", "ITV4"],
    },
  },
  {
    id: "giro-d-italia-2026",
    name: "Giro d'Italia",
    category: "Grand Tour",
    stageOrDetails: "Etappe / Tageswertung",
    startDate: "2026-05-09",
    endDate: "2026-05-31",
    broadcasters: DEFAULT_CYCLING_BROADCASTERS,
  },
  {
    id: "vuelta-a-espana-2026",
    name: "Vuelta a España",
    category: "Grand Tour",
    stageOrDetails: "Etappe / Tageswertung",
    startDate: "2026-08-22",
    endDate: "2026-09-13",
    broadcasters: DEFAULT_CYCLING_BROADCASTERS,
  },
  {
    id: "il-lombardia-2026",
    name: "Il Lombardia",
    category: "Monument",
    stageOrDetails: "Eintagesrennen (Herbstklassiker)",
    startDate: "2026-10-10",
    endDate: "2026-10-10",
    broadcasters: DEFAULT_CYCLING_BROADCASTERS,
  },
  {
    id: "paris-roubaix-2026",
    name: "Paris - Roubaix",
    category: "Monument",
    stageOrDetails: "Eintagesrennen",
    startDate: "2026-04-12",
    endDate: "2026-04-12",
    broadcasters: DEFAULT_CYCLING_BROADCASTERS,
  },
  {
    id: "ronde-van-vlaanderen-2026",
    name: "Flandern-Rundfahrt",
    category: "Monument",
    stageOrDetails: "Eintagesrennen",
    startDate: "2026-04-05",
    endDate: "2026-04-05",
    broadcasters: DEFAULT_CYCLING_BROADCASTERS,
  },
];